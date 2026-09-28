<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * List of programs for the complete-profile dropdown.
     * Shows program_name to the user; the id is what gets submitted.
     *
     * GET /api/complete-profile/programs
     */
    public function programs(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => Program::query()
                ->where('program_name', '!=', 'General Education')
                ->orderBy('program_name')
                ->get(['id', 'program_name']),
        ]);
    }

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
            'role'              => ['prohibited'],
        ]);

        if ($user->role === 'student') {
            $user->update([
                'program_id'        => $validated['program_id'],
                'school_student_id' => $validated['school_student_id'] ?? null,
                'year_level'        => $validated['year_level'] ?? null,
            ]);

            $this->autoEnrollStudent(
                $user,
                $validated['program_id'],
                $validated['year_level'],
            );
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

    /**
     * Auto-enroll a student to every class that matches their
     * program + year_level for the current semester/school_year.
     */
    protected function autoEnrollStudent(User $user, string $programId, string $yearLevel): void
    {
        $matchingClasses = ClassModel::query()
            ->where('program_id', $programId)
            ->where('year_level', $yearLevel)
            ->where('semester', config('academic.current_semester'))
            ->where('school_year', config('academic.current_school_year'))
            ->get();

        foreach ($matchingClasses as $class) {
            Enrollment::firstOrCreate(
                [
                    'student_id' => $user->id,
                    'class_id'   => $class->id,
                ],
                [
                    'year_level' => $yearLevel,
                ]
            );
        }
    }
}