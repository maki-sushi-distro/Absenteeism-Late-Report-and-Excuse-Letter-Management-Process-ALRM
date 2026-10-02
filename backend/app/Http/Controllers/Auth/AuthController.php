<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Auth\OtpController;
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

        // Signed + timestamped payload — tampering or replay beyond TTL fails to decrypt/expire.
        $state = Crypt::encryptString(json_encode([
            'origin' => $frontendUrl,
            'nonce'  => Str::random(32),
            'exp'    => now()->addMinutes(10)->timestamp,
        ]));

        return Socialite::driver('google')
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    /**
     * Step 2 — Google redirects here with an auth code.
     *
     * GET /api/auth/google/callback
     */
    public function callback(): RedirectResponse
    {
        $defaultFrontend = $this->allowedOrigins()[0] ?? null;

        $frontendUrl = $this->decodeState(request()->query('state')) ?? $defaultFrontend;

        if (! $frontendUrl) {
            abort(500, 'No valid frontend URL configured.');
        }

        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
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

        // Block disabled/rejected accounts outright, even on first Google login.
        if (! $isNewUser && $user->status === 'deactivated') {
            return redirect()->away(
                $frontendUrl . '/login?error=account_disabled'
            );
        }

        $user->google_id = $googleUser->getId();

        if ($isNewUser) {
            $user->name = $googleUser->getName() ?: $user->name;
            $user->role = $isStudent ? 'student' : self::DEFAULT_STAFF_ROLE;
            $user->status = 'pending';
            $user->password = null;
        } elseif ($isFirstLogin && $user->status === 'pending') {
            // Only auto-approve pre-registered accounts that were waiting
            // specifically for their first Google login, not any arbitrary status.
            $user->name = $googleUser->getName() ?: $user->name;
            $user->status = 'approved';
            $user->password = null;
        }
        $user->save();

        if (TrustedDeviceManager::isTrusted(request(), $user)) {
            $token = $user->createToken('alrm-spa')->plainTextToken;
            $code = Str::random(40);
            Cache::put("auth_exchange:{$code}", $token, now()->addSeconds(60));

            return redirect()->away(
                $frontendUrl . '/auth/callback?code=' . urlencode($code)
            );
        }

        OtpController::issue($user);

        return redirect()->away(
            $frontendUrl . '/auth/otp?user_id=' . urlencode($user->id)
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

        // Re-validate against the CURRENT allowlist — config may have changed
        // since redirect(), and this guarantees we never trust a raw value.
        foreach ($this->allowedOrigins() as $allowed) {
            if (rtrim($allowed, '/') === rtrim($payload['origin'], '/')) {
                return rtrim($payload['origin'], '/');
            }
        }

        return null;
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

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => ['token' => $token],
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
            'data'    => $request->user(),
        ]);
    }
}
