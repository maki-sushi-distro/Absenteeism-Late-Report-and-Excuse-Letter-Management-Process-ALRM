<?php

namespace App\Models;

use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Visible;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'google_id',
    'name',
    'email',
    'password',
    'role',
    'program_id',
    'school_student_id',
    'status',
    'deactivated_at',
    'year_level',
    'guardian_name',
    'contact_number',
])]
#[Hidden(['password', 'remember_token'])]
#[Visible(['id', 'name', 'email', 'role', 'program_id', 'school_student_id',
    'status', 'year_level', 'program', 'programs', 'heads_program', 'headed_program_exists'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'deactivated_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * The program this user (student) belongs to — direct FK.
     * One student, one program.
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * The programs this user (instructor/program head) belongs to —
     * many-to-many via pivot. An instructor can teach across programs.
     */
    public function programs(): BelongsToMany
    {
        return $this->belongsToMany(Program::class, 'program_user')
            ->using(ProgramUser::class)
            ->withTimestamps();
    }

    /**
     * The program this user heads (if they are a program_head).
     */
    public function headedProgram(): HasOne
    {
        return $this->hasOne(Program::class, 'program_head_id');
    }

    /**
     * Classes this user teaches (if they are an instructor).
     */
    public function classesTaught(): HasMany
    {
        return $this->hasMany(ClassModel::class, 'instructor_id');
    }

    /**
     * Enrollments belonging to this user (if they are a student).
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'student_id');
    }

    /**
     * Requests this user has reviewed (as instructor/program_head).
     */
    public function reviewedRequests(): HasMany
    {
        return $this->hasMany(ExcuseRequest::class, 'reviewed_by');
    }

    /**
     * Followup flags escalated to this user (program_head).
     */
    public function followupFlags(): HasMany
    {
        return $this->hasMany(FollowupFlag::class, 'escalated_to');
    }

    /**
     * Notifications sent to this user.
     */
    public function userNotifications(): HasMany
    {
        return $this->hasMany(UserNotification::class);
    }

    /**
     * Audit log entries recorded for this user's actions.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Allowlist check via UserStatus. NULL/unknown status fails closed.
     * Intentionally no enum cast on `status`: RoleMiddleware compares
     * $user->status !== 'approved' as a plain string.
     */
    public function canLogin(): bool
    {
        return UserStatus::allowsLogin($this->status);
    }
}
