<?php

namespace Tests\Feature;

use App\Mail\ProgramHeadAttendanceAlertMail;
use App\Models\AttendanceTracker;
use App\Models\ExcuseRequest;
use App\Models\Program;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\AttendanceThresholdNotifier;
use Illuminate\Mail\MailManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\SecurityTestCase;

class ProgramHeadAttendanceAlertsTest extends SecurityTestCase
{
    protected function user(string $role = 'student', array $attributes = []): User
    {
        $user = parent::user($role, ['google_id' => 'google-linked', ...$attributes]);
        $user->forceFill(['email_notifications_enabled' => true])->save();

        return $user;
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['mail.program_head_test_recipient' => null, 'mail.test_recipient' => null]);
    }

    public function test_program_head_alerts_only_email_the_configured_tester_without_changing_in_app_owners(): void
    {
        $request = $this->requestFor($this->user('student'));
        $programId = $request->enrollment->class->program_id;
        $first = $this->user('program_head', ['program_id' => $programId]);
        $second = $this->user('program_head', ['program_id' => $programId]);
        config([
            'mail.program_head_test_recipient' => 'marwin.mandocdoc@student.laverdad.edu.ph',
            'mail.test_recipient' => 'global-tester@example.com',
        ]);
        $tracker = AttendanceTracker::create([
            'enrollment_id' => $request->enrollment_id, 'total_absences' => 3,
            'total_lates' => 0, 'converted_absences' => 3, 'status' => 'warning',
        ]);
        app(AttendanceThresholdNotifier::class)->notify($tracker);
        $tracker->update(['status' => 'IR', 'total_absences' => 4, 'converted_absences' => 4]);
        app(AttendanceThresholdNotifier::class)->notify($tracker);

        Mail::assertQueued(ProgramHeadAttendanceAlertMail::class, 2);
        foreach (['warning', 'IR'] as $status) {
            Mail::assertQueued(ProgramHeadAttendanceAlertMail::class, fn ($mail) => $mail->alertStatus === $status && $mail->hasTo('marwin.mandocdoc@student.laverdad.edu.ph')
                && ! $mail->hasTo($first->email) && ! $mail->hasTo($second->email)
                && ! $mail->hasTo('global-tester@example.com')
            );
        }
        $this->assertSame(2, UserNotification::where('user_id', $first->id)->count());
        $this->assertSame(2, UserNotification::where('user_id', $second->id)->count());
    }

    public function test_decisions_send_preventive_and_critical_stages_to_heads_without_automation_duplicates(): void
    {
        $student = $this->user('student');
        $request = $this->requestFor($student);
        $class = $request->enrollment->class;
        $primary = $this->user('program_head');
        $program = $class->program;
        $program->update(['program_head_id' => $primary->id]);
        $primary->update(['program_id' => $program->id]);
        $primary->additionalHeadedPrograms()->attach($program); // Three matching paths, one recipient.
        $coHead = $this->user('instructor');
        $coHead->additionalHeadedPrograms()->attach($program);
        $automaticHead = $this->user('program_head', ['program_id' => $program->id]);
        $inactive = $this->user('program_head', ['program_id' => $program->id, 'status' => 'deactivated']);
        $outsider = $this->user('program_head', ['program_id' => Program::factory()->create()->id]);
        $tracker = AttendanceTracker::create([
            'enrollment_id' => $request->enrollment_id, 'total_absences' => 0,
            'total_lates' => 0, 'converted_absences' => 0, 'status' => 'safe',
        ]);

        $this->bearer($class->instructor)->patchJson('/api/instructor/requests/'.$request->id.'/decision', ['status' => 'invalid'])->assertOk();
        $this->assertNotNull($tracker->fresh()->warning_notified_at);
        $this->assertDatabaseCount('followup_flags', 0);
        $this->artisan('alrm:process-automation')->assertSuccessful();

        $irRequest = $request->replicate();
        $irRequest->fill(['status' => 'pending', 'reviewed_by' => null, 'date_reviewed' => null]);
        ExcuseRequest::withoutEvents(fn () => $irRequest->save());
        $this->bearer($class->instructor)->patchJson('/api/instructor/requests/'.$irRequest->id.'/decision', ['status' => 'invalid'])->assertOk();
        $this->assertNotNull($tracker->fresh()->critical_notified_at);
        $this->assertNull($tracker->fresh()->ir_notified_at);
        $this->assertDatabaseHas('followup_flags', ['request_id' => $irRequest->id, 'escalated_to' => $primary->id]);
        $this->artisan('alrm:process-automation')->assertSuccessful();

        foreach ([$primary, $coHead, $automaticHead] as $head) {
            $this->assertSame(2, UserNotification::where('user_id', $head->id)->count());
            $this->assertDatabaseHas('notifications', [
                'user_id' => $head->id, 'channel' => 'in_app', 'type' => 'threshold_warning',
                'message' => $student->name.' reached the preventive absence threshold in Security (6.25% of semester class hours; 3 of 10 allowable units; 14.58% of semester hours remaining before the IR limit).',
            ]);
            $this->assertDatabaseHas('notifications', [
                'user_id' => $head->id, 'channel' => 'in_app', 'type' => 'threshold_critical',
                'message' => $student->name.' reached the critical absence threshold in Security (12.5% of semester class hours; 6 of 10 allowable units; 8.33% of semester hours remaining before the IR limit). Consultation is required.',
            ]);
            Mail::assertQueued(ProgramHeadAttendanceAlertMail::class, fn ($mail) => $mail->hasTo($head->email) && $mail->alertStatus === 'warning');
            Mail::assertQueued(ProgramHeadAttendanceAlertMail::class, fn ($mail) => $mail->hasTo($head->email) && $mail->alertStatus === 'critical');
            $this->bearer($head)->getJson('/api/notifications')->assertOk()->assertJsonCount(2, 'data');
        }
        foreach ([$class->instructor, $inactive, $outsider] as $nonRecipient) {
            $this->assertSame(0, UserNotification::where('user_id', $nonRecipient->id)->count());
            Mail::assertNotQueued(ProgramHeadAttendanceAlertMail::class, fn ($mail) => $mail->hasTo($nonRecipient->email));
        }
        Mail::assertQueued(ProgramHeadAttendanceAlertMail::class, 6);
    }

    public function test_automation_delivers_the_same_english_alerts_once_per_stage(): void
    {
        $request = $this->requestFor($this->user('student'));
        $head = $this->user('program_head', ['program_id' => $request->enrollment->class->program_id]);
        $tracker = AttendanceTracker::create([
            'enrollment_id' => $request->enrollment_id, 'total_absences' => 1,
            'total_lates' => 0, 'converted_absences' => 1, 'status' => 'warning',
        ]);
        $this->artisan('alrm:process-automation')->assertSuccessful();
        $this->artisan('alrm:process-automation')->assertSuccessful();
        $tracker->update(['total_absences' => 2]);
        $tracker->recompute();
        $this->artisan('alrm:process-automation')->assertSuccessful();
        $this->artisan('alrm:process-automation')->assertSuccessful();
        $tracker->update(['total_absences' => 4]);
        $tracker->recompute();
        $this->artisan('alrm:process-automation')->assertSuccessful();
        $this->artisan('alrm:process-automation')->assertSuccessful();
        $this->assertSame(3, UserNotification::where('user_id', $head->id)->count());
        Mail::assertQueued(ProgramHeadAttendanceAlertMail::class, 3);
        $this->assertNotNull($tracker->fresh()->warning_notified_at);
        $this->assertNotNull($tracker->fresh()->critical_notified_at);
        $this->assertNotNull($tracker->fresh()->ir_notified_at);
    }

    public function test_missing_heads_do_not_prevent_decisions_and_can_receive_a_later_automation_alert(): void
    {
        $request = $this->requestFor($this->user('student'));
        $tracker = AttendanceTracker::create([
            'enrollment_id' => $request->enrollment_id, 'total_absences' => 3,
            'total_lates' => 0, 'converted_absences' => 3, 'status' => 'warning',
        ]);
        $this->bearer($request->enrollment->class->instructor)->patchJson('/api/instructor/requests/'.$request->id.'/decision', ['status' => 'invalid'])->assertOk();
        $this->assertNull($tracker->fresh()->ir_notified_at);
        Mail::assertNotQueued(ProgramHeadAttendanceAlertMail::class);
        $this->user('program_head', ['program_id' => $request->enrollment->class->program_id]);
        $this->artisan('alrm:process-automation')->assertSuccessful();
        Mail::assertQueued(ProgramHeadAttendanceAlertMail::class, 1);
    }

    public function test_alert_email_matches_the_existing_branding_and_escapes_student_content(): void
    {
        foreach (['warning', 'critical', 'IR'] as $status) {
            $mail = new ProgramHeadAttendanceAlertMail(
                'Program Head', '<script>alert(1)</script>', 'Applications Development', 'BSIS',
                $status, 'Student needs follow-up.', 12, 10,
            );
            $html = $mail->render();
            $this->assertStringContainsString('La Verdad Christian College, Inc.', $html);
            $this->assertStringContainsString('&lt;script&gt;', $html);
            $this->assertStringNotContainsString('<script>', $html);
            $this->assertStringContainsString('12 of 10 allowable units', $html);
            $this->assertStringContainsString(match ($status) {
                'IR' => 'IR — drop limit reached', 'critical' => 'Critical — consultation required', default => 'Preventive Warning',
            }, $html);
            $this->assertStringContainsString(match ($status) {
                'IR' => 'Attendance IR Drop Limit', 'critical' => 'Critical Attendance Consultation', default => 'Preventive Attendance Warning',
            }, $mail->envelope()->subject);
        }
    }

    public function test_email_jobs_are_dispatched_only_after_commit_and_discarded_on_rollback(): void
    {
        config(['queue.default' => 'database', 'mail.default' => 'array']);
        Mail::swap(new MailManager($this->app));
        $request = $this->requestFor($this->user('student'));
        $this->user('program_head', ['program_id' => $request->enrollment->class->program_id]);
        $tracker = AttendanceTracker::create([
            'enrollment_id' => $request->enrollment_id, 'total_absences' => 3,
            'total_lates' => 0, 'converted_absences' => 3, 'status' => 'warning',
        ]);

        DB::beginTransaction();
        app(AttendanceThresholdNotifier::class)->notify($tracker);
        $this->assertDatabaseCount('jobs', 0);
        DB::rollBack();
        $this->assertDatabaseCount('jobs', 0);
        $this->assertDatabaseCount('notifications', 0);
        $this->assertNull($tracker->fresh()->warning_notified_at);

        DB::beginTransaction();
        app(AttendanceThresholdNotifier::class)->notify($tracker);
        $this->assertDatabaseCount('jobs', 0);
        DB::commit();
        $this->assertDatabaseCount('jobs', 1);
        $this->assertDatabaseCount('notifications', 1);
        $this->assertNotNull($tracker->fresh()->warning_notified_at);
    }
}
