<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExcuseRequest;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * College-wide export of excuse/late requests for records or
     * accreditation purposes (per Admin interview, Q27).
     *
     * GET /api/admin/reports/export
     * Optional filters: ?program_id=&status=&date_from=&date_to=
     */
    public function export(Request $request): StreamedResponse
    {
        $query = ExcuseRequest::with([
            'enrollment.student',
            'enrollment.class.program',
            'enrollment.class.instructor',
            'reviewer',
            'followupFlag',
        ]);

        if ($request->filled('program_id')) {
            $query->whereHas('enrollment.class', function ($q) use ($request) {
                $q->where('program_id', $request->query('program_id'));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('start_date_of_absence', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('start_date_of_absence', '<=', $request->query('date_to'));
        }

        $requests = $query->orderBy('start_date_of_absence')->get();

        $filename = 'alrm_requests_export_'.now()->format('Y-m-d_His').'.csv';

        $columns = [
            'Request ID', 'Student', 'Program', 'Subject', 'Instructor',
            'Type', 'Start Date', 'End Date', 'Reason', 'Status',
            'Reviewed By', 'Date Reviewed', 'Flagged (IR)',
        ];

        return response()->streamDownload(function () use ($requests, $columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);

            foreach ($requests as $r) {
                fputcsv($handle, [
                    $r->id,
                    $r->enrollment->student->name ?? '',
                    $r->enrollment->class->program->program_name ?? '',
                    $r->enrollment->class->subject_name ?? '',
                    $r->enrollment->class->instructor->name ?? '',
                    $r->type,
                    optional($r->start_date_of_absence)->toDateString(),
                    optional($r->end_date_of_absence)->toDateString(),
                    $r->reason,
                    $r->status,
                    $r->reviewer->name ?? '',
                    optional($r->date_reviewed)->toDateTimeString(),
                    $r->followupFlag ? 'Yes' : 'No',
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}