<?php

namespace App\Console\Commands;

use App\Models\AttendanceTracker;
use App\Models\ExcuseRequest;
use App\Models\FollowupFlag;
use App\Models\UserNotification;
use Illuminate\Console\Command;

class RunAttendanceAutomation extends Command
{
    protected $signature = 'alrm:process-automation';

    protected $description = 'Flag overdue pending requests and fire attendance threshold notifications.';

    public function handle(): int
    {
        $flagged  = $this->flagOverdueRequests();
        $notified = $this->fireThresholdNotifications();

        $this->info("Flagged {$flagged} overdue request(s). Sent {$notified} threshold notification(s).");

        return self::SUCCESS;
    }

    /**
     * FOLLOWUP_FLAGS: a request sitting 'pending' past the response window
     * gets escalated to the student's Program Head. Not tied to IR crossing
     * anymore — see §9.1.
     */
    private function flagOverdueRequests(): int
    {
        $windowHours = (int) env('FOLLOWUP_RESPONSE_WINDOW_HOURS', 48);

        $overdue = ExcuseRequest::where('status', 'pending')
            ->where('date_submitted', '<=', now()->subHours($windowHours))
            ->whereDoesntHave('followupFlag')
            ->with('enrollment.student.program.programHead')
            ->get();

        foreach ($overdue as $request) {
            $programHead = $request->enrollment->student->program?->programHead;

            FollowupFlag::create([
                'request_id'   => $request->id,
                'flagged_date' => now(),
                'escalated_to' => $programHead?->id,
                'status'       => 'open',
            ]);

            if ($programHead) {
                UserNotification::create([
                    'user_id'    => $programHead->id,
                    'request_id' => $request->id,
                    'type'       => 'followup_flag',
                    'message'    => "A {$request->type} request has gone unanswered past the response window.",
                    'channel'    => 'in_app',
                    'date_sent'  => now(),
                    'is_read'    => false,
                ]);
            }
        }

        return $overdue->count();
    }

    /**
     * NOTIFICATIONS: warning at 2 converted absences, IR at 3. Fires exactly
     * once per threshold via warning_notified_at / ir_notified_at, regardless
     * of whether/when an instructor ever decides a request.
     */
    private function fireThresholdNotifications(): int
    {
        $count = 0;

        AttendanceTracker::where('status', 'warning')
            ->whereNull('warning_notified_at')
            ->with('enrollment.student.program.programHead', 'enrollment.class.instructor')
            ->each(function (AttendanceTracker $tracker) use (&$count) {
                $this->notifyThreshold($tracker, 'threshold_warning',
                    "{$tracker->enrollment->student->name} has reached 2 converted absences (warning).");
                $tracker->update(['warning_notified_at' => now()]);
                $count++;
            });

        AttendanceTracker::where('status', 'IR')
            ->whereNull('ir_notified_at')
            ->with('enrollment.student.program.programHead', 'enrollment.class.instructor')
            ->each(function (AttendanceTracker $tracker) use (&$count) {
                $this->notifyThreshold($tracker, 'ir_escalation',
                    "{$tracker->enrollment->student->name} has reached IR status (3 converted absences) and needs follow-up.");
                $tracker->update(['ir_notified_at' => now()]);
                $count++;
            });

        return $count;
    }

    private function notifyThreshold(AttendanceTracker $tracker, string $type, string $message): void
    {
        $instructor  = $tracker->enrollment->class->instructor;
        $programHead = $tracker->enrollment->student->program?->programHead;

        foreach (array_filter([$instructor, $programHead]) as $recipient) {
            UserNotification::create([
                'user_id'    => $recipient->id,
                'request_id' => null,
                'type'       => $type,
                'message'    => $message,
                'channel'    => 'in_app',
                'date_sent'  => now(),
                'is_read'    => false,
            ]);
        }
    }
}