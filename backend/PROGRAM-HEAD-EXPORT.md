# Program head CSV reports

`GET /api/program-head/reports/export` downloads UTF-8 CSV (with BOM). Use the normal Sanctum bearer token and read successful responses as a Blob/download. Check the HTTP status first: API errors remain JSON when requested with `Accept: application/json`.

Query parameters:

- `report_type`: `activity` (default: absenteeism and tardiness requests) or `risk` (escalated follow-up flags, including resolved flags).
- `program_id`: optional UUID, limited to the caller's headed programs. Without it, all headed programs are included.
- `date_from`, `date_to`: optional ISO `YYYY-MM-DD`, inclusive in the backend application's timezone. End defaults to today; start defaults to 365 days before the end. Maximum span: 730 days. Activity uses submission time, falling back to creation time; risk uses flag time.

CSV columns match the report table: Student, Class, Submitted, Type; or Student, Class, Flagged date, Status. These reports describe requests and escalated flags, not complete attendance totals. No reasons, evidence or contact details are exported. A program head can export only requests/flags belonging to currently headed programs, including primary, current-program and co-head assignments. Escalation alone does not grant export access to another program.

Authentication, active-account checks and program-head authorization apply. Rate limit: three exports per user per minute (shared with other export endpoints). More than 5000 matches returns 422 instead of a partial CSV. Empty results produce headings only. Responses use the existing private/no-store and nosniff headers. Every CSV field is quoted, embedded quotes are escaped, and formula-like prefixes and leading controls are prefixed with an apostrophe. CSV protection applies to the generated download; spreadsheet applications can change escaping when saving/reopening a file.

Example: `/api/program-head/reports/export?report_type=activity&date_from=2026-10-01&date_to=2026-10-26`.

Frontend integration is separate: the existing button generates CSV locally and must be connected to this endpoint to use the backend download. Frontend files are unchanged.
