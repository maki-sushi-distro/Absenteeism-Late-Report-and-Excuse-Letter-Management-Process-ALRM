<?php

namespace App\Observers;

use App\Mail\InstructorExcuseRequestMail;
use App\Models\ExcuseRequest;
use App\Models\UserNotification;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ExcuseRequestObserver implements ShouldHandleEventsAfterCommit
{
    public function created(ExcuseRequest $excuseRequest): void
    {
        $excuseRequest->loadMissing('enrollment.student', 'enrollment.class.instructor');

        $enrollment = $excuseRequest->enrollment;
        $student    = $enrollment?->student;
        $class      = $enrollment?->class;
        $instructor = $class?->instructor;

        if (! $student || ! $class) {
            Log::warning('Excuse request email skipped: missing student or class.', [
                'request_id' => $excuseRequest->id,
            ]);
            return;
        }

        if (! $instructor) {
            Log::warning('Excuse request email skipped: class has no instructor.', [
                'request_id' => $excuseRequest->id,
                'class_id'   => $class->id,
            ]);
            return;
        }

        if (blank($instructor->email) || ! $instructor->canLogin()) {
            Log::warning('Excuse request email skipped: instructor has no email or is not active.', [
                'request_id'    => $excuseRequest->id,
                'instructor_id' => $instructor->id,
            ]);
            return;
        }

        $allowlist = array_map('strtolower', config('mail.instructor_notify_allowlist', []));

        if ($allowlist !== [] && ! in_array(strtolower($instructor->email), $allowlist, true)) {
            Log::info('Excuse request email skipped: instructor is not in the allowlist.', [
                'request_id'    => $excuseRequest->id,
                'instructor_id' => $instructor->id,
            ]);
            return;
        }

        try {
            $testRecipient = trim((string) config('mail.instructor_test_recipient', ''));

            Mail::to(
                $testRecipient !== '' ? $testRecipient : $instructor->email,
                $testRecipient !== '' ? null : $instructor->name,
            )
                ->send(new InstructorExcuseRequestMail($excuseRequest, $student, $instructor, $class));

            UserNotification::create([
                'user_id'    => $instructor->id,
                'request_id' => $excuseRequest->id,
                'type'       => 'new_request',
                'message'    => "{$student->name} submitted a new {$excuseRequest->type} request for {$class->subject_name}.",
                'channel'    => 'email',
                'date_sent'  => now(),
                'is_read'    => false,
            ]);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
