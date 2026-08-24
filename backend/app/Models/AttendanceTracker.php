<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['enrollment_id', 'total_lates', 'total_absences', 'converted_absences', 'status'])]
class AttendanceTracker extends Model
{
    /** @use HasFactory<\Database\Factories\AttendanceTrackerFactory> */
    use HasFactory;

    /*
    |--------------------------------------------------------------------------
    | Casts
    |--------------------------------------------------------------------------
    */

    protected function casts(): array
    {
        return [
            'total_lates'        => 'integer',
            'total_absences'     => 'integer',
            'converted_absences' => 'integer',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * The enrollment this tracker belongs to.
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Business Logic
    |--------------------------------------------------------------------------
    */

    /**
     * Recompute converted_absences and update status.
     * Call this every time total_lates or total_absences changes.
     *
     * Policy: 3 lates = 1 absence
     * Triggers: 2 converted absences = warning, 3 = IR
     */
    public function recompute(): void
    {
        $this->converted_absences = $this->total_absences + (int) floor($this->total_lates / 3);

        $this->status = match (true) {
            $this->converted_absences >= 3 => 'IR',
            $this->converted_absences >= 2 => 'warning',
            default                         => 'safe',
        };

        $this->save();
    }
}