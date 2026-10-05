<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\StudentDashboardResource;
use App\Models\AttendanceTracker;
use App\Models\ExcuseRequest;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentDashboardController extends Controller
{
    /**
     * Converted absences at which a student reaches IR.
     * Mirrors AttendanceTracker::recompute() (warning at 2, IR at 3).
     */
    private const IR_LIMIT = 3;

    /**
     * Student dashboard snapshot (matches the Figma home screen).
     *
     * GET /api/dashboard
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user();

        $trackers = AttendanceTracker::query()
            ->whereHas('enrollment', fn ($q) => $q->where('student_id', $student->id))
            ->get(['total_lates', 'total_absences', 'converted_absences', 'status']);

        $ownRequests = fn () => ExcuseRequest::query()
            ->whereHas('enrollment', fn ($q) => $q->where('student_id', $student->id));

        $pendingRequests = $ownRequests()->where('status', 'pending')->count();

        $excusedAbsences = $ownRequests()
            ->where('type', 'absence')
            ->whereIn('status', ['approved', 'noted'])
            ->count();

        $thresholdStatus = match (true) {
            $trackers->contains('status', 'IR')      => 'IR',
            $trackers->contains('status', 'warning') => 'warning',
            default                                  => 'safe',
        };

        $notifications = UserNotification::query()
            ->where('user_id', $student->id);

        return response()->json([
            'success' => true,
            'message' => null,
            'data'    => new StudentDashboardResource([
                'total_classes'        => $student->enrollments()->count(),
                'unexcused_absences'   => (int) $trackers->sum('total_absences'),
                'excused_absences'     => $excusedAbsences,
                'lates_recorded'       => (int) $trackers->sum('total_lates'),
                'pending_requests'     => $pendingRequests,
                'threshold'            => [
                    'used'   => (int) $trackers->max('converted_absences'),
                    'limit'  => self::IR_LIMIT,
                    'status' => $thresholdStatus,
                ],
                'unread_notifications' => (clone $notifications)->where('is_read', false)->count(),
                'recent_notifications' => (clone $notifications)->latest('date_sent')->limit(5)->get(),
            ]),
        ]);
    }
}