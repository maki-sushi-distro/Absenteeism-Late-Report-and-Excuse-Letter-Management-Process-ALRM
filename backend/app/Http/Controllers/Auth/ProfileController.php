<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * Complete the authenticated user's profile after their first
     * Google OAuth login. Required before dashboard access when the
     * user's program/year_level (student) or program (instructor)
     * is still unset.
     *
     * POST /api/complete-profile
     */
    public function completeProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'program_id'        => ['required', 'string', 'uuid', 'exists:programs,id'],
            'school_student_id' => ['required_if:role,student', 'nullable', 'string', 'max:50'],
            'year_level'        => ['required_if:role,student', 'nullable', 'in:1st,2nd,3rd,4th'],
        ]);

        if ($user->role === 'student') {
            $user->update([
                'program_id'        => $validated['program_id'],
                'school_student_id' => $validated['school_student_id'] ?? null,
                'year_level'        => $validated['year_level'] ?? null,
            ]);
        } else {
            // instructor / program_head / administrator — many-to-many
            $user->programs()->syncWithoutDetaching([$validated['program_id']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile completed.',
            'data'    => $user->fresh('program', 'programs'),
        ]);
    }
}