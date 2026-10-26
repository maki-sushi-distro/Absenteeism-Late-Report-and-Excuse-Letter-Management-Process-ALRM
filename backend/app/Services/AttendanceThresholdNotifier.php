<?php

namespace App\Services;

use App\Mail\ProgramHeadAttendanceAlertMail;
use App\Models\AttendanceTracker;
use App\Models\ExcuseRequest;
use App\Models\UserNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class AttendanceThresholdNotifier
{
    /** Shared by request decisions and automation so each stage is delivered once. */
    public function notify(AttendanceTracker $tracker, ?ExcuseRequest $request = null): bool
    {
        return DB::transaction(function () use ($tracker, $request) {
            $tracker = AttendanceTracker::whereKey($tracker->id)->lockForUpdate()->firstOrFail();
            $column = match ($tracker->status) {
                'warning' => 'warning_notified_at',
                'IR' => 'ir_notified_at',
                default => null,
            };
            if ($column === null || $tracker->{$column} !== null) {
                return false;
            }

            $enrollment = $tracker->enrollment;
            $student = $enrollment?->student;
            $class = $enrollment?->class;
            $program = $class?->program;
            if (! $student || ! $class || ! $program) {
                return false;
            }

            $recipients = $program->notificationHeads();
            if ($recipients->isEmpty()) {
                return false; // Leave the stage available for a later run after assignment.
            }

            $used = $tracker->unitsUsed();
            $limit = $tracker->allowedUnits();
            $message = $tracker->status === 'warning'
                ? "{$student->name} is near the absence limit in {$class->subject_name} ({$used} of {$limit} units). One more absence will trigger an IR."
                : "{$student->name} exceeded the allowable absences in {$class->subject_name} ({$used} of {$limit} units) and needs follow-up.";

            $testRecipient = trim((string) config('mail.program_head_test_recipient', ''));
            if ($testRecipient === '') {
                $testRecipient = trim((string) config('mail.test_recipient', ''));
            }
            $emailTargets = [];

            foreach ($recipients as $recipient) {
                UserNotification::create([
                    'user_id' => $recipient->id,
                    'request_id' => $request?->id,
                    'type' => $tracker->status === 'warning' ? 'threshold_warning' : 'ir_escalation',
                    'message' => $message,
                    'channel' => 'in_app',
                    'date_sent' => now(),
                    'is_read' => false,
                ]);

                $email = $testRecipient !== '' ? $testRecipient : $recipient->email;
                if (filled($email) && ! isset($emailTargets[strtolower($email)])) {
                    $emailTargets[strtolower($email)] = true;
                    Mail::to($email, $testRecipient !== '' ? null : $recipient->name)->queue(
                        (new ProgramHeadAttendanceAlertMail(
                            $testRecipient !== '' ? 'Program Head' : $recipient->name,
                            $student->name, $class->subject_name,
                            $program->program_name, $tracker->status, $message, $used, $limit,
                        ))->afterCommit(),
                    );
                }
            }

            $tracker->forceFill([$column => now()])->save();

            return true;
        });
    }
}
