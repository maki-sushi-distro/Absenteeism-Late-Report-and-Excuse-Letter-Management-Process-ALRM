<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Mail\InstructorFollowUpMail;
use App\Models\ExcuseRequest;
use App\Models\FollowupFlag;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class FollowUpController extends Controller
{
    private const COOLDOWN_HOURS = 24;

    public function __construct(protected AuditLoggerService $auditLogger) {}

    /**
     * POST /api/requests/{request}/follow-up
     */
    public function store(ExcuseRequest $request): JsonResponse
    {
        $request->load('enrollment.student', 'enrollment.class.instructor');

        $enrollment = $request->enrollment;
        $class      = $enrollment->class;
        $instructor = $class->instructor;

        if ($enrollment->student_id !== Auth::id()) {
            return $this->fail('Unauthorized.', 403);
        }

        if ($request->status !== 'pending') {
            return $this->fail('Only pending requests can be followed up.', 422);
        }

        if (! $instructor?->email) {
            return $this->fail('No instructor found for this class.', 422);
        }

        $last = FollowupFlag::where('request_id', $request->id)->latest('flagged_date')->first();

        if ($last && $last->flagged_date->gt(now()->subHours(self::COOLDOWN_HOURS))) {
            return $this->fail(
                'You already followed up. You can follow up again ' .
                $last->flagged_date->copy()->addHours(self::COOLDOWN_HOURS)->diffForHumans() . '.',
                429
            );
        }

        $flag = FollowupFlag::create([
            'request_id'   => $request->id,
            'flagged_date' => now(),
            'escalated_to' => $instructor->id,
            'status'       => 'open',
        ]);

        $this->auditLogger->log('followed_up_request', 'followup_flags', $flag->id);

        $count = FollowupFlag::where('request_id', $request->id)->count();

        try {
            Mail::to($instructor->email)->send(new InstructorFollowUpMail(
                instructor: $instructor,
                student: $enrollment->student,
                class: $class,
                excuseRequest: $request,
                reviewUrl: rtrim(config('app.frontend_url'), '/') . '/instructor/requests',
                followupCount: $count,
            ));
        } catch (\Throwable $e) {
            Log::error('Follow-up email failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Follow-up sent to your instructor.',
            'data'    => $flag,
        ], 201);
    }

    private function fail(string $message, int $code): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message, 'data' => null], $code);
    }
}