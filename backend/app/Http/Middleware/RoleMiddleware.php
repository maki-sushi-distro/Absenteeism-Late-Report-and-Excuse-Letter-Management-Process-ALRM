<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Usage: ->middleware('role:instructor') or ->middleware('role:instructor,program_head')
     *
     * Guards on two things per README §5 (users table):
     * 1. user.status === 'approved' — staff accounts sit as 'pending' until
     *    Admin assigns their specific role; students are auto-approved.
     * 2. user.role is one of the allowed roles passed to the middleware.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
                'data'    => null,
            ], 401);
        }

        if ($user->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Your account is still pending approval.',
                'data'    => null,
            ], 403);
        }

        if (! $user->role || ! in_array($user->role, $roles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to access this resource.',
                'data'    => null,
            ], 403);
        }

        return $next($request);
    }
}