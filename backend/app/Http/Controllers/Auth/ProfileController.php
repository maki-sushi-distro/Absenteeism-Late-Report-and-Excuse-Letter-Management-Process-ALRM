<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
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
     * POST /api/complete-profile
     *
     * Rules depend on the SERVER-side role ($user->role). The old
     * required_if:role,student looked at the request input, which is
     * always empty because `role` is prohibited, so student fields were
     * never actually required.
     *
     * A student whose profile is already complete cannot re-submit it:
     * enrollments hang off program/year_level, so changing them is an
     * admin-side action, not a self-service one.
     */
    public function completeProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $isStudent = $user->role === 'student';

        if ($isStudent && $user->program_id !== null && $user->school_student_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Your profile is already complete. Please contact an administrator to change your program or year level.',
                'data'    => null,
            ], 409);
        }

        $validated = $request->validate([
            'program_id'        => ['required', 'string', 'uuid', 'exists:programs,id'],
            'school_student_id' => [
                Rule::requiredIf($isStudent),
                'nullable',
                'string',
                'max:50',
                Rule::unique('users', 'school_student_id')->ignore($user->id),
            ],
            'year_level'        => [
                Rule::requiredIf($isStudent),
                'nullable',
                Rule::in(['1st', '2nd', '3rd', '4th']),
            ],
            'role'              => ['prohibited'],
            'status'            => ['prohibited'],
        ]);

        if ($isStudent) {
            DB::transaction(function () use ($user, $validated) {
                // forceFill so this keeps working after program_id is
                // removed from User's #[Fillable] (mass-assignment fix).
                $user->forceFill([
                    'program_id'        => $validated['program_id'],
                    'school_student_id' => $validated['school_student_id'],
                    'year_level'        => $validated['year_level'],
                ])->save();

                $this->autoEnrollStudent(
                    $user,
                    $validated['program_id'],
                    $validated['year_level'],
                );
            });
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