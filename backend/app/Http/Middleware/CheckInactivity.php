<?php
// app/Http/Middleware/CheckInactivity.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class CheckInactivity
{
    /**
     * Auto-logout after this many minutes of no API activity.
     * Adjust to 15 or 30 depending on final decision.
     */
    private const IDLE_LIMIT_MINUTES = 15;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $token = $user->currentAccessToken();

        // Personal access tokens have an id; skip check if somehow missing.
        if (! $token || ! $token->id) {
            return $next($request);
        }

        $cacheKey = "last_activity:token:{$token->id}";
        $lastActivity = Cache::get($cacheKey);

        if ($lastActivity && now()->diffInMinutes($lastActivity) >= self::IDLE_LIMIT_MINUTES) {
            // Idle too long — revoke the token so it can't be reused.
            $token->delete();
            Cache::forget($cacheKey);

            return response()->json([
                'success' => false,
                'message' => 'Session expired due to inactivity. Please log in again.',
                'data'    => null,
            ], 401);
        }

        // Still active — refresh the timestamp.
        Cache::put($cacheKey, now(), self::IDLE_LIMIT_MINUTES + 5);

        return $next($request);
    }
}