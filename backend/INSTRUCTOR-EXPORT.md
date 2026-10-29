# Instructor request export

`GET /api/instructor/requests/export` returns an `.xlsx` attachment, not a JSON success envelope. Send the normal Sanctum bearer token and read a successful response as a Blob/binary download. Validation, authorization and rate-limit failures remain normal API errors; check the status before downloading the response.

Optional query parameters: `class_id` (UUID of a class taught by the caller), `type` (`absence` or `late`), `status` (`pending`, `approved`, `noted`, `invalid`, `cancelled`), and `search` (student name, maximum 50 characters). Filters combine with AND. Search treats SQL wildcard characters literally. All matching records are exported, independent of list pagination. More than 5000 matches returns HTTP 422; narrow the filters rather than accepting a partial export.

The endpoint requires an authenticated, active instructor and always scopes records to that instructor's classes. A class belonging to another instructor fails validation. The existing `exports` rate limiter allows three attempts per minute per user. Only table fields are exported: subject, year, section, student name, occurrence date, type, submitted date, due date and request status. Reasons, evidence, contacts and other profile fields are excluded. XLSX cells use the explicit string value binder to prevent formula evaluation. Existing API middleware applies private/no-store and nosniff headers.

Dates use ISO `YYYY-MM-DD` in the backend application's timezone. Due date uses `alrm.followup_response_window_hours` (default 48 hours) after submission, falling back to creation time only for a missing submission timestamp. An unknown occurrence date remains blank; submission time is not substituted for occurrence time. Empty results produce a headings-only workbook.

The existing frontend in the cached `origin/main` creates its own CSV in the browser. Adding this endpoint does not change that button; frontend integration must explicitly call this URL and download the binary response. `/api/instructor/requests` remains the JSON list endpoint.
