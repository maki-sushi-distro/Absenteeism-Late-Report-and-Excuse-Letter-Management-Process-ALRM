<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\ExcuseRequest;
use App\Models\RequestAttachment;                  
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;                 
use Illuminate\Validation\Rule;                    
use Illuminate\Validation\ValidationException;     

class RequestController extends Controller
{
    /**
     * TODO (Future Feature): Draft Requests
     *
     * Approach: Option B — Backend-persisted draft
     *
     * Kailangang gawin paglaon:
     * 1. Dagdagan ng 'draft' sa status enum ng requests table
     *    (kasabay o hiwalay na migration mula sa 'cancelled' na kasalukuyang ginawa)
     * 2. Bagong endpoint: POST /requests/draft — save nang walang strict validation
     * 3. Bagong endpoint: PATCH /requests/{request}/submit — i-finalize ang draft,
     *    dito na lang mag-a-apply ang buong/strict validation rules
     *    (kagaya ng nasa store() ngayon)
     * 4. I-relax ang validation kapag naka-draft (hindi required lahat ng fields)
     * 5. I-update din ang ExcuseRequestPolicy — sino ba pwedeng mag-edit/mag-view
     *    ng sariling drafts
     * 6. Route additions sa api.php (student group)
     */

    /**
     * Store a new excuse/late request.
     * Enrollment is resolved from the authenticated student + class_id —
     * never trust enrollment_id from the client (see ExcuseRequest model doc).
     */
    public function store(HttpRequest $httpRequest)
    {
        $validated = $httpRequest->validate([
            'class_id'        => ['required', 'string', 'uuid', 'exists:classes,id'],
            'type'            => ['required', 'in:absence,late'],
            'subjects_missed' => ['required', 'string', 'max:255'],
            'minutes_late'          => ['required_if:type,late', 'nullable', 'integer', 'min:1', 'max:999'],
            'start_date_of_absence' => ['required_if:type,absence', 'nullable', 'date'],
            'end_date_of_absence'   => ['nullable', 'date', 'after_or_equal:start_date_of_absence'],
            'reason'            => ['required', 'string', 'max:600'],
            'evidence_file_url' => [
                'nullable',
                'uuid',
                Rule::exists('request_attachments', 'id')
                    ->where('user_id', $httpRequest->user()->id)
                    ->whereNull('excuse_request_id'),
            ],
            'evidence_type'     => ['nullable', 'string', 'max:100'],
            'guardian_name'  => ['required', 'string', 'min:2', 'max:60', 'regex:/^[^\d]*$/'],
            'contact_number' => ['required', 'regex:/^(09\d{9}|\+639\d{9})$/'],
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

        $excuseRequest = DB::transaction(function () use ($httpRequest, $validated, $enrollment) {
            $excuseRequest = ExcuseRequest::create([
                'enrollment_id'         => $enrollment->id,
                'type'                  => $validated['type'],
                'subjects_missed'       => $validated['subjects_missed'],
                'minutes_late'          => $validated['minutes_late'] ?? null,
                'start_date_of_absence' => $validated['start_date_of_absence'] ?? null,
                'end_date_of_absence'   => $validated['end_date_of_absence'] ?? null,
                'reason'                => $validated['reason'],
                'evidence_file_url'     => $validated['evidence_file_url'] ?? null,
                'evidence_type'         => $validated['evidence_type'] ?? null,
                'status'                => 'pending',
                'date_submitted'        => now(),
            ]);

            if (! empty($validated['evidence_file_url'])) {
                $linked = RequestAttachment::where('id', $validated['evidence_file_url'])
                    ->where('user_id', $httpRequest->user()->id)
                    ->whereNull('excuse_request_id')
                    ->update(['excuse_request_id' => $excuseRequest->id]);

                if ($linked === 0) {
                    throw ValidationException::withMessages([
                        'evidence_file_url' => 'The attachment is no longer available. Please upload it again.',
                    ]);
                }
            }

            $httpRequest->user()->update([
                'guardian_name'  => $validated['guardian_name'],
                'contact_number' => $validated['contact_number'],
            ]);

            return $excuseRequest;
        });

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
     * Show a single request — must belong to the authenticated student
     * (or a scoped instructor/program head/admin — see ExcuseRequestPolicy).
     */
    public function show(ExcuseRequest $request)
    {
        $this->authorize('view', $request);

        return response()->json([
            'success' => true,
            'message' => null,
            'data'    => $request->load('enrollment.class', 'followupFlag'),
        ]);
    }

    /**
     * Update a request — only allowed while status is still 'pending'.
     */
    public function update(HttpRequest $httpRequest, ExcuseRequest $request)
    {
        $this->authorize('update', $request);

        if ($request->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'This request has already been reviewed and can no longer be edited.',
                'data'    => null,
            ], 422);
        }


        $validated = $httpRequest->validate([
            'type'                  => ['required', 'in:absence,late'],
            'subjects_missed'       => ['required', 'string'],
            'minutes_late'          => ['required_if:type,late', 'nullable', 'integer', 'min:1'],
            'start_date_of_absence' => ['required_if:type,absence', 'nullable', 'date'],
            'end_date_of_absence'   => ['nullable', 'date', 'after_or_equal:start_date_of_absence'],
            'reason'                => ['required', 'string', 'max:500'],
            'evidence_file_url'     => ['nullable', 'string'],
            'evidence_type'         => ['nullable', 'string'],
        ]);

        $request->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Request updated.',
            'data'    => $request->fresh(),
        ]);
    }


    public function destroy(ExcuseRequest $request)
    {
        $this->authorize('delete', $request);

        if ($request->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending requests can be cancelled.',
                'data'    => null,
            ], 422);
        }

        $request->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'message' => 'Request cancelled.',
            'data'    => $request->fresh(),
        ]);
    }

    /**
     * NEW: I-stream ang attachment ng request. Ang ExcuseRequestPolicy
     * ang nagpapasya kung sino ang pwedeng tumingin.
     */
    public function evidence(ExcuseRequest $request)
    {
        $this->authorize('view', $request);

        $attachment = RequestAttachment::where('excuse_request_id', $request->id)->first();

        if (! $attachment) {
            return response()->json([
                'success' => false,
                'message' => 'No attachment available for this request.',
                'data'    => null,
            ], 404);
        }

        $extension = $attachment->mime_type === 'application/pdf'
            ? 'pdf'
            : ($attachment->mime_type === 'image/png' ? 'png' : 'jpg');

        return response($attachment->data, 200, [
            'Content-Type'           => $attachment->mime_type,
            'Content-Disposition'    => 'inline; filename="attachment.' . $extension . '"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control'          => 'private, no-store',
        ]);
    }
}