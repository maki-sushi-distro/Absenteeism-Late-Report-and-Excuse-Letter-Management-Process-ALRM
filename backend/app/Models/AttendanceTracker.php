<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'enrollment_id',
    'total_lates',
    'total_absences',
    'converted_absences',
    'status',
    'warning_notified_at',
    'ir_notified_at',
])]
class AttendanceTracker extends Model
{
    /** @use HasFactory<\Database\Factories\AttendanceTrackerFactory> */
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $table = 'attendance_tracker';

    protected function casts(): array
    {
        return [
            'total_lates'         => 'integer',
            'total_absences'      => 'integer',
            'converted_absences'  => 'integer',
            'warning_notified_at' => 'datetime',
            'ir_notified_at'      => 'datetime',
        ];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    /** Units (hours) na nagamit na, batay sa converted absences. */
    public function unitsUsed(): float
    {
        return round(
            $this->converted_absences * $this->enrollment->class->unitsPerMeeting(),
            2
        );
    }

    /** Allowable absence units ng class (20% ng total hours). */
    public function allowedUnits(): float
    {
        return $this->enrollment->class->allowedAbsenceUnits();
    }

    /** Ginagamit para hanapin ang subject na pinakamalapit sa limit. */
    public function usageRatio(): float
    {
        $allowed = $this->allowedUnits();

        return $allowed > 0 ? $this->unitsUsed() / $allowed : 0;
    }

    /**
     * Policy: 3 lates = 1 absence.
     * IR      → lumampas na sa 20% allowable units.
     * warning → isa pang absence ay lalampas na sa limit.
     * Tawagin tuwing nagbabago ang total_lates o total_absences.
     */
    public function recompute(): void
    {
        $this->converted_absences = $this->total_absences + (int) floor($this->total_lates / 3);

        $perMeeting = $this->enrollment->class->unitsPerMeeting();
        $used       = $this->unitsUsed();
        $allowed    = $this->allowedUnits();

        $this->status = match (true) {
            $used > $allowed               => 'IR',
            $used + $perMeeting > $allowed => 'warning',
            default                        => 'safe',
        };

        $this->save();
    }
}