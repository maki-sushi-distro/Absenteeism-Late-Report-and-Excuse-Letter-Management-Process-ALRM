<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['subject_name', 'instructor_id', 'schedule', 'program_id', 'year_level', 'section', 'semester', 'school_year'])]
class ClassModel extends Model
{
    /** @use HasFactory<\Database\Factories\ClassModelFactory> */
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    // 'class' is a reserved word in PHP — table name must be explicit
    protected $table = 'classes';

    protected $casts = [
        'schedule' => 'array',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * The instructor who teaches this class.
     */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /**
     * The program this class belongs to.
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * All enrollments in this class.
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'class_id');
    }

    /** Units (hours) ng 1 absence = oras ng isang meeting. */
    public function unitsPerMeeting(): float
    {
        return $this->weekly_hours / max(1, $this->meetings_per_week);
    }

    /** 20% ng total hours: 3 hrs → 9.6, 5 hrs → 16 */
    public function allowedAbsenceUnits(): float
    {
        return round(
            $this->weekly_hours
                * config('alrm.semester_weeks')
                * config('alrm.absence_limit_rate'),
            2
        );
    }
}
