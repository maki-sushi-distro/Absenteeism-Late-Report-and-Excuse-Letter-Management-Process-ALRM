<?php

namespace Tests\Feature;

use App\Models\AttendanceTracker;
use App\Models\FollowupFlag;
use App\Models\UserNotification;
use Tests\SecurityTestCase;

class AttendanceThresholdPolicyTest extends SecurityTestCase
{
    public function test_exact_thresholds_use_semester_hours_and_preserve_the_twenty_percent_allowance(): void
    {
        $request = $this->requestFor($this->user());
        // 80 semester hours, one hour per meeting: exact 10% and 15% boundaries.
        $request->enrollment->class->forceFill(['weekly_hours' => 5, 'meetings_per_week' => 5])->save();
        $tracker = AttendanceTracker::create([
            'enrollment_id' => $request->enrollment_id, 'total_lates' => 0,
            'total_absences' => 0, 'converted_absences' => 0, 'status' => 'safe',
        ]);

        foreach ([7 => 'safe', 8 => 'warning', 11 => 'warning', 12 => 'IR', 16 => 'IR', 17 => 'IR'] as $absences => $status) {
            $tracker->total_absences = $absences;
            $tracker->recompute();
            $this->assertSame($status, $tracker->fresh()->status, "Absences: {$absences}");
        }
        $this->assertSame(16.0, $tracker->allowedUnits());
        $tracker->total_absences = 12;
        $tracker->recompute();
        $this->assertSame(15.0, $tracker->absencePercentage());

        $tracker->total_absences = 7;
        $tracker->total_lates = 2;
        $tracker->recompute();
        $this->assertSame('safe', $tracker->status);
        $tracker->total_lates = 3;
        $tracker->recompute();
        $this->assertSame(8, $tracker->converted_absences);
        $this->assertSame('warning', $tracker->status);
    }

    public function test_automation_creates_a_critical_consultation_flag_once_even_when_warning_was_skipped(): void
    {
        $request = $this->requestFor($this->user());
        $request->update(['status' => 'invalid', 'date_reviewed' => now()]);
        $head = $this->user('program_head', ['program_id' => $request->enrollment->class->program_id]);
        $tracker = AttendanceTracker::create([
            'enrollment_id' => $request->enrollment_id, 'total_absences' => 3,
            'total_lates' => 0, 'converted_absences' => 0, 'status' => 'safe',
        ]);
        $tracker->recompute();
        $this->assertSame('IR', $tracker->status);
        $this->assertLessThan($tracker->allowedUnits(), $tracker->unitsUsed());

        $this->artisan('alrm:process-automation')->assertSuccessful();
        $this->artisan('alrm:process-automation')->assertSuccessful();

        $this->assertSame(1, FollowupFlag::where('request_id', $request->id)->count());
        $this->assertDatabaseHas('followup_flags', [
            'request_id' => $request->id, 'escalated_to' => $head->id, 'status' => 'open',
        ]);
        $this->assertSame(1, UserNotification::where('user_id', $head->id)->where('type', 'ir_escalation')->count());
        $this->assertNotNull($tracker->fresh()->ir_notified_at);
    }
}
