<?php

namespace App\Policies;

use App\Models\ExcuseRequest;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ExcuseRequestPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     *
     * - student who filed the request
     * - instructor of the class it was filed under
     * - program head of that class's program
     * - administrator (college-wide)
     */
    public function view(User $user, ExcuseRequest $excuseRequest): bool
    {
        return match ($user->role) {
            'student'       => $excuseRequest->enrollment->student_id === $user->id,
            'instructor'    => $excuseRequest->enrollment->class->instructor_id === $user->id,
            'program_head'  => $user->headedProgram
                                && $excuseRequest->enrollment->class->program_id === $user->headedProgram->id,
            'administrator' => true,
            default         => false,
        };
    }

    /**
     * Determine whether the user can approve/note/invalidate the request.
     * Only the instructor of the class this request was filed under.
     */
    public function decide(User $user, ExcuseRequest $excuseRequest): bool
    {
        return $user->role === 'instructor'
            && $excuseRequest->enrollment->class->instructor_id === $user->id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ExcuseRequest $excuseRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ExcuseRequest $excuseRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ExcuseRequest $excuseRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ExcuseRequest $excuseRequest): bool
    {
        return false;
    }
}