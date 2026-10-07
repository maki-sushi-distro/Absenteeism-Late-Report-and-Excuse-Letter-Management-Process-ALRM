<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Laravel\Sanctum\PersonalAccessToken;
use App\Support\TrustedDeviceManager;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Contracts\Encryption\DecryptException;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    private const DEFAULT_STAFF_ROLE = 'instructor';

    /**
     * Allowed frontend origins (exact scheme+host match, not prefix match).
     */
    private function allowedOrigins(): array
    {
        return array_filter([
            rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/'),
            rtrim((string) config('app.frontend_url_prod'), '/'),
        ]);
    }

    /**
     * Exact-match origin check (scheme + host + port), not str_starts_with.
     */
    private function resolveOrigin(?string $origin): ?string
    {
        if (! $origin) {
            return null;
        }

        $parsed = parse_url($origin);
        if (! $parsed || empty($parsed['host'])) {
            return null;
        }

        $normalized = ($parsed['scheme'] ?? 'https') . '://' . $parsed['host']
            . (isset($parsed['port']) ? ':' . $parsed['port'] : '');

        foreach ($this->allowedOrigins() as $allowed) {
            if (rtrim($allowed, '/') === $normalized) {
                return $normalized;
            }
        }

        return null;
    }

    /**
     * Google callback URL on the given (already allowlisted) frontend origin.
     * The /api rewrite/proxy forwards it to this backend.
     */
    private function callbackUrlFor(string $frontendUrl): string
    {
        return rtrim($frontendUrl, '/') . '/api/auth/google/callback';
    }

    /**
     * Mint a Sanctum token and wrap it in a one-time exchange code (60s).
     */
    private function makeExchangeCode(User $user): string
    {
        $token = $user->createToken('alrm-spa')->plainTextToken;
        $code  = Str::random(40);
        Cache::put("auth_exchange:{$code}", $token, now()->addSeconds(60));

        return $code;
    }

    /**
     * Step 1 — Send the user's browser to Google's consent screen.
     *
     * GET /api/auth/google/redirect
     */
    public function redirect(Request $request): RedirectResponse
    {
        $origin = $request->query('origin')
            ?? $request->headers->get('referer');

        $frontendUrl = $this->resolveOrigin($origin)
            ?? ($this->allowedOrigins()[0] ?? null);

        if (! $frontendUrl) {
            abort(500, 'No valid frontend URL configured.');
        }

        $state = Crypt::encryptString(json_encode([
            'origin' => $frontendUrl,
            'nonce'  => Str::random(32),
            'exp'    => now()->addMinutes(10)->timestamp,
        ]));

        return Socialite::driver('google')
            ->stateless()
            ->redirectUrl($this->callbackUrlFor($frontendUrl))
            ->with(['state' => $state])
            ->redirect();
    }

    /**
     * Step 2 — Google redirects here with an auth code.
     *
     * GET /api/auth/google/callback
     *
     * When GOOGLE_REDIRECT_URI points at the frontend domain (via the /api
     * proxy), the browser sends the alrm_device cookie here, so we can decide
     * "trusted or OTP" right now and skip the extra check-trusted round trip.
     */
    public function callback(Request $request): RedirectResponse
    {
        $defaultFrontend = $this->allowedOrigins()[0] ?? null;

        $frontendUrl = $this->decodeState($request->query('state')) ?? $defaultFrontend;

        if (! $frontendUrl) {
            abort(500, 'No valid frontend URL configured.');
        }

        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->redirectUrl($this->callbackUrlFor($frontendUrl))
                ->user();
        } catch (\Throwable $e) {
            Log::warning('Google OAuth callback failed', ['error' => $e->getMessage()]);

            return redirect()->away(
                $frontendUrl . '/login?error=oauth_failed'
            );
        }

        $email = strtolower((string) $googleUser->getEmail());
        $domain = substr(strrchr($email, '@') ?: '', 1);

        $studentDomain = strtolower((string) config('institution.student_domain'));
        $staffDomain = strtolower((string) config('institution.staff_domain'));

        if (! in_array($domain, [$studentDomain, $staffDomain], true)) {
            return redirect()->away(
                $frontendUrl . '/login?error=invalid_domain'
            );
        }

        $isStudent = $domain === $studentDomain;

        $user = User::query()->firstOrNew(['email' => $email]);

        $isNewUser = ! $user->exists;
        $isFirstLogin = $isNewUser || is_null($user->google_id);

        if (! $isNewUser && ! $user->canLogin()) {
            return redirect()->away(
                $frontendUrl . '/login?error=account_disabled'
            );
        }

        $user->google_id = $googleUser->getId();

        if ($isNewUser) {
            $user->name = $googleUser->getName() ?: $user->name;
            $user->role = $isStudent ? 'student' : self::DEFAULT_STAFF_ROLE;
            $user->status = $isStudent ? 'approved' : 'pending';
            $user->password = null;
        } elseif ($isFirstLogin && $user->status === 'pending') {
            $user->name = $googleUser->getName() ?: $user->name;
            $user->status = 'approved';
            $user->password = null;
        }
        $user->save();

        if ($user->canLogin() && TrustedDeviceManager::isTrusted($request, $user)) {
            $code = $this->makeExchangeCode($user);

            return redirect()->away(
                $frontendUrl . '/auth/otp?exchange_code=' . urlencode($code)
            );
        }

        $pending = Str::random(40);
        Cache::put("auth_pending:{$pending}", $user->id, now()->addMinutes(10));

        if (Cache::add("auth_pending_sent:{$pending}", true, now()->addMinutes(10))) {
            OtpController::issue($user);
        }

        return redirect()->away(
            $frontendUrl . '/auth/otp?user_id=' . urlencode($user->id)
                . '&pending=' . urlencode($pending)
                . '&checked=1'
        );
    }

    /**
     * Decrypt + validate the signed state. Returns null on any failure
     * (tampered, expired, or origin no longer in allowlist) so callers
     * fall back to the default frontend instead of trusting attacker input.
     */
    private function decodeState(?string $state): ?string
    {
        if (! $state) {
            return null;
        }

        try {
            $payload = json_decode(Crypt::decryptString($state), true);
        } catch (DecryptException) {
            Log::warning('OAuth state failed decryption — possible tampering.');
            return null;
        }

        if (! is_array($payload) || empty($payload['origin']) || empty($payload['exp'])) {
            return null;
        }

        if (now()->timestamp > $payload['exp']) {
            Log::warning('OAuth state expired.');
            return null;
        }


        foreach ($this->allowedOrigins() as $allowed) {
            if (rtrim($allowed, '/') === rtrim($payload['origin'], '/')) {
                return rtrim($payload['origin'], '/');
            }
        }

        return null;
    }

    /**
     * POST /api/auth/otp/check-trusted
     *
     * Fallback for when the callback was reached without the alrm_device
     * cookie (e.g. GOOGLE_REDIRECT_URI still pointing at onrender.com).
     * The "pending" token proves the user just finished Google sign-in.
     */
    public function checkTrusted(Request $request): JsonResponse
    {
        $request->validate(['pending' => 'required|string']);

        $pending = (string) $request->input('pending');
        $userId  = Cache::get("auth_pending:{$pending}");
        $user    = $userId ? User::find($userId) : null;

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Your login session expired. Please sign in again.',
                'data'    => null,
            ], 410);
        }

        if (! $user->canLogin()) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is not active. Please contact an administrator.',
                'data'    => null,
            ], 403);
        }

        if (TrustedDeviceManager::isTrusted($request, $user)) {
            Cache::forget("auth_pending:{$pending}");

            return response()->json([
                'success' => true,
                'message' => 'Trusted device.',
                'data'    => [
                    'trusted'       => true,
                    'exchange_code' => $this->makeExchangeCode($user),
                ],
            ]);
        }

        if (Cache::add("auth_pending_sent:{$pending}", true, now()->addMinutes(10))) {
            OtpController::issue($user);
        }

        return response()->json([
            'success' => true,
            'message' => 'OTP required.',
            'data'    => ['trusted' => false],
        ]);
    }

    /**
     * Step 3 — SPA exchanges the one-time code for the real Sanctum token.
     *
     * POST /api/auth/exchange
     */
    public function exchange(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $token = Cache::pull("auth_exchange:{$request->string('code')}");

        if (! $token) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired code.',
                'data'    => null,
            ], 401);
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;

        if (! $user || ! $user->canLogin()) {
            $accessToken?->delete();

            return response()->json([
                'success' => false,
                'message' => 'Your account is not active. Please contact an administrator.',
                'data'    => null,
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'token' => $token,
                'user'  => $user->load('program', 'programs'),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out.',
            'data'    => null,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $request->user()->load('program', 'programs'),
        ]);
    }
}