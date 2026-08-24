<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\ExcuseRequest;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Auth;

class RequestController extends Controller
{
    /**
     * Store a new excuse/late request.
     * Enrollment is resolved from the authenticated student + class_id —
     * never trust enrollment_id from the client (see ExcuseRequest model doc).
     */
    public function store(HttpRequest $httpRequest)
    {
        $validated = $httpRequest->validate([
            'class_id'          => ['required', 'integer', 'exists:classes,id'],
            'type'              => ['required', 'in:absence,late'],
            'date_of_absence'   => ['required', 'date'],
            'reason'            => ['required', 'string'],
            'evidence_file_url' => ['nullable', 'string'],
        ]);

        $enrollment = Enrollment::where('student_id', Auth::id())
            ->where('class_id', $validated['class_id'])
            ->first();

        if (! $enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'You are not enrolled in this class.',
                'data'    => null,
            ], 403);
        }

        $excuseRequest = ExcuseRequest::create([
            'enrollment_id'     => $enrollment->id,
            'type'              => $validated['type'],
            'date_of_absence'   => $validated['date_of_absence'],
            'reason'            => $validated['reason'],
            'evidence_file_url' => $validated['evidence_file_url'] ?? null,
            'status'            => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Request submitted.',
            'data'    => $excuseRequest,
        ], 201);
    }

    /**
     * List all requests filed by the authenticated student.
     */
    public function index()
    {
        $requests = ExcuseRequest::whereHas('enrollment', function ($q) {
            $q->where('student_id', Auth::id());
        })->with('enrollment.class')->latest()->get();

        return response()->json([
            'success' => true,
            'message' => null,
            'data'    => $requests,
        ]);
    }

    /**
     * Show a single request — must belong to the authenticated student.
     */
    public function show(ExcuseRequest $request)
    {
        if ($request->enrollment->student_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Not authorized to view this request.',
                'data'    => null,
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => null,
            'data'    => $request->load('enrollment.class', 'followupFlag'),
        ]);
    }
}