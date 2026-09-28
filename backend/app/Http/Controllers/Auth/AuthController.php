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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class AuthController extends Controller
{
    /**
     * Default role for a brand-new staff-domain account, only when
     * nobody pre-registered them (UserApprovalController::store()).
     */
    private const DEFAULT_STAFF_ROLE = 'instructor';

    /**
     * Step 1 — Send the user's browser to Google's consent screen.
     *
     * Accepts an `origin` query param (the frontend's own
     * window.location.origin) so we know where to send the user back
     * to in callback() — this lets both localhost and the deployed
     * Vercel frontend use the same backend without hardcoding one URL.
     * The chosen origin is base64-encoded and passed through Google's
     * `state` param, which Google returns to us untouched.
     *
     * GET /api/auth/google/redirect
     */
    public function redirect(Request $request): RedirectResponse
    {
        $origin = $request->query('origin')
            ?? $request->headers->get('referer');

        $allowedOrigins = array_filter([
            rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/'),
            rtrim((string) env('FRONTEND_URL_PROD'), '/'),
        ]);

        $frontendUrl = collect($allowedOrigins)
            ->first(fn($url) => $origin && str_starts_with($origin, $url));

        $frontendUrl ??= end($allowedOrigins) ?: reset($allowedOrigins);

        return Socialite::driver('google')
            ->stateless()
            ->with(['state' => base64_encode($frontendUrl)])
            ->redirect();
    }

    /**
     * Step 2 — Google redirects here with an auth code. We exchange it
     * for the profile, validate the domain, find-or-create the local
     * user, issue a Sanctum token, then redirect back to the SPA with
     * ?token=... (can't return JSON — this is a browser redirect).
     *
     * The `state` param carries the frontend origin we encoded in
     * redirect(), so we always bounce the user back to whichever
     * frontend (localhost or Vercel) they started from.
     *
     * New users land as status='pending' (self-registration + approval
     * requirement) — a token is still issued so the frontend can call
     * GET /api/me and show "awaiting approval". RoleMiddleware is what
     * actually blocks pending users from role-gated routes.
     *
     * GET /api/auth/google/callback
     */
    public function callback(): RedirectResponse
    {
        Log::debug('Raw code received', [
            'code' => request()->query('code'),
            'length' => strlen((string) request()->query('code')),
        ]);

        $state = request()->query('state');
        $frontendUrl = $state
            ? rtrim((string) base64_decode($state), '/')
            : rtrim((string) env('FRONTEND_URL_PROD', env('FRONTEND_URL')), '/');

        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();
        } catch (InvalidStateException | \Throwable $e) {
            Log::warning('Google OAuth callback failed', ['error' => $e->getMessage()]);

            return redirect()->away(
                $frontendUrl . '/login?error=oauth_failed'
            );
        }

        $email = strtolower((string) $googleUser->getEmail());
        $domain = substr(strrchr($email, '@') ?: '', 1);

        $studentDomain = config('institution.student_domain');
        $staffDomain = config('institution.staff_domain');

        if (! in_array($domain, [$studentDomain, $staffDomain], true)) {
            return redirect()->away(
                $frontendUrl . '/login?error=invalid_domain'
            );
        }

        $isStudent = $domain === $studentDomain;

        $user = User::query()->firstOrNew(['email' => $email]);

        $isNewUser = ! $user->exists;
        $isFirstLogin = $isNewUser || is_null($user->google_id);

        $user->google_id = $googleUser->getId();

        if ($isNewUser) {
            $user->name = $googleUser->getName() ?: $user->name;
            $user->role = $isStudent ? 'student' : self::DEFAULT_STAFF_ROLE;
            $user->status = 'pending';
            $user->password = null;
        } elseif ($isFirstLogin) {
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
     * Step 3 — SPA exchanges the one-time code for the real Sanctum
     * token. Single-use, expires in 60s, so a token never sits exposed
     * in the URL/history.
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

    /**
     * Revoke the token used to authenticate the current request.
     *
     * POST /api/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out.',
            'data'    => null,
        ]);
    }

    /**
     * Authenticated user's profile. Frontend checks `status` here —
     * 'pending' means show "awaiting approval" instead of the dashboard.
     *
     * GET /api/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $request->user(),
        ]);
    }
}
