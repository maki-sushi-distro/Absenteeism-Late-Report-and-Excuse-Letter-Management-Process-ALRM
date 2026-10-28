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

    /** Percentage of total semester class hours, not of the 20% allowance. */
    public function absencePercentage(): float
    {
        $total = $this->enrollment->class->totalSemesterHours();

        return $total > 0 ? round($this->unitsUsed() / $total * 100, 2) : 0;
    }

    /**
     * Policy: 3 lates = 1 absence.
     * IR      → critical consultation at 15% of semester class hours.
     * warning → preventive notification at 10% of semester class hours.
     * Keep the existing IR status for API/database compatibility.
     * Tawagin tuwing nagbabago ang total_lates o total_absences.
     */
    public function recompute(): void
    {
        $this->converted_absences = $this->total_absences + (int) floor($this->total_lates / 3);

        $total      = $this->enrollment->class->totalSemesterHours();
        $used       = $this->unitsUsed();

        $this->status = match (true) {
            $total <= 0 => 'safe',
            $used >= round($total * config('alrm.critical_absence_rate'), 2) => 'IR',
            $used >= round($total * config('alrm.preventive_absence_rate'), 2) => 'warning',
            default => 'safe',
        };

        $this->save();
    }
}
