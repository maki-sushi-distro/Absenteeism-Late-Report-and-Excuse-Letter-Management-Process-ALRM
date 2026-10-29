# Program head CSV reports

`GET /api/program-head/reports/export` downloads UTF-8 CSV (with BOM). Use the normal Sanctum bearer token and read successful responses as a Blob/download. Check the HTTP status first: API errors remain JSON when requested with `Accept: application/json`.

Query parameters:

- `report_type`: `activity` (default: absenteeism and tardiness requests) or `risk` (escalated follow-up flags, including resolved flags).
- `program_id`: optional UUID, limited to the caller's headed programs. Without it, all headed programs are included.
- `date_from`, `date_to`: optional ISO `YYYY-MM-DD`, inclusive in the backend application's timezone. End defaults to today; start defaults to 365 days before the end. Maximum span: 730 days. Activity uses submission time, falling back to creation time; risk uses flag time.

CSV columns: Student, Class, Submitted, Type; or Student, Class, Flagged date, Threshold, Percentage. Risk rows use the current enrollment attendance tracker: Threshold is `safe`, `warning`, `critical`, or `IR`; Percentage is the numeric absence percentage of total semester class hours (for example, `14.58` means 14.58%), using the existing backend calculation including late conversion. These values are current at export time, not a historical snapshot at the flagged date. Missing trackers produce blank threshold and percentage cells; zero semester hours produce a blank percentage. No reasons, evidence or contact details are exported. A program head can export only requests/flags belonging to currently headed programs, including primary, current-program and co-head assignments. Escalation alone does not grant export access to another program.

Authentication, active-account checks and program-head authorization apply. Rate limit: three exports per user per minute (shared with other export endpoints). More than 5000 matches returns 422 instead of a partial CSV. Empty results produce headings only. Responses use the existing private/no-store and nosniff headers. Every CSV field is quoted, embedded quotes are escaped, and formula-like prefixes and leading controls are prefixed with an apostrophe. CSV protection applies to the generated download; spreadsheet applications can change escaping when saving/reopening a file.

Example: `/api/program-head/reports/export?report_type=activity&date_from=2026-10-01&date_to=2026-10-26`.

## Students at Risk integration

`GET /api/program-head/students/flagged` preserves the existing flag fields and relations and adds `threshold` and `percentage` to every row. It also loads `request.enrollment.attendance_tracker`. The same attendance calculation is used for this API and the risk CSV. Missing trackers return null for both fields; zero semester hours return null for percentage. Display null as unavailable, not 0%. Existing `status=open|resolved` filtering and `page`/`per_page` pagination still apply.

Use `threshold` for the attendance-stage column and `percentage` for the percentage column. Keep the flag's `status` to control the Resolve button; resolving a follow-up does not reset attendance totals or its threshold.

`PATCH /api/program-head/followup-flags/{id}/resolve` accepts an empty body. Use the row's flag `id`, not its request or student ID. Active program heads (including assigned co-heads) can resolve flags allowed by the existing policy: flags escalated to them or belonging to their headed programs. Success returns the updated flag with `status: resolved` and records an audit event. Repeated resolution returns 409; unauthorized access returns 403; unknown IDs return 404. Refresh the list after success, especially when filtering to open flags.

The local frontend currently contains only the login screen. The Students at Risk screen and report button must consume these endpoints in the frontend project that implements them.
