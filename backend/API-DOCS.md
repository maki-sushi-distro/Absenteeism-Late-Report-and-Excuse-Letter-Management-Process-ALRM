# ALRM API Documentation

Source branch: `backend` · Source commit: `8bff496` · Reviewed: 29 October 2026

This guide describes the REST API implemented in `routes/api.php`, its controllers, middleware, policies, resources, and models at the commit above. Examples use illustrative data and are not captured production responses. No deployment or live Google/email integration was tested to prepare this document.

The [ALRM Backend Security Change Report](https://docs.google.com/document/d/1Ay8og3rio5Nl5p-FWs-ibPO4RgfGC8zf/edit) provides background. Current code takes precedence where that older report differs, including external-account approval, audit-log routes, exports, and attendance policy.

## Contents

- [Connection and conventions](#connection-and-conventions)
- [Authentication and account access](#authentication-and-account-access)
- [Endpoint inventory](#endpoint-inventory)
- [Profile and notifications](#profile-and-notifications)
- [Student requests and evidence](#student-requests-and-evidence)
- [Instructor decisions and follow-ups](#instructor-decisions-and-follow-ups)
- [Dashboards and program monitoring](#dashboards-and-program-monitoring)
- [Administrator management](#administrator-management)
- [Reports and downloads](#reports-and-downloads)
- [Audit logs](#audit-logs)
- [Response fields](#response-fields)
- [Errors and rate limits](#errors-and-rate-limits)
- [Integration examples](#integration-examples)
- [Source map and maintenance](#source-map-and-maintenance)

## Connection and conventions

| Setting | Value |
|---|---|
| Local base URL | `http://localhost:8000/api` when using `php artisan serve` with its default port |
| Browser base URL | `/api` through the configured frontend proxy |
| Authentication | Laravel Sanctum bearer token |
| JSON headers | `Accept: application/json`, `Content-Type: application/json` |
| Upload content type | `multipart/form-data`; let the client set its boundary |
| Identifiers | UUID strings for users, programs, classes, requests, flags, attachments, and notifications |
| Date inputs | Prefer `YYYY-MM-DD`; some endpoints enforce this exact format |
| Success status | `200` unless marked `201` or a redirect below |

Every path in the inventory is relative to the base URL. For example, `/requests` means `/api/requests`. There is no `/v1` prefix. GET routes also support Laravel's normal HEAD handling.

Most JSON responses use:

```json
{
  "success": true,
  "message": null,
  "data": []
}
```

This is not a universal envelope. Notification-preference success omits `message`; framework validation/authentication/authorization errors can have different shapes. Evidence and report success responses contain binary file data. Google OAuth endpoints redirect the browser.

### Pagination

Endpoints marked **Paged** use `BoundedCollection`:

| Query | Validation | Default |
|---|---|---|
| `page` | Integer, 1–100000 | 1 when pagination is requested |
| `per_page` | Integer, 1–100 | 50 when pagination is requested |

Supplying either parameter enables pagination. `data` remains an array. The response adds `meta: {"page":1,"per_page":50,"total":120,"last_page":3}`. With neither parameter, `meta` is `null` and at most 500 records may be returned; a larger result produces `422` instead of silent truncation. Follow `meta.last_page` to retrieve all pages. Pagination parameters do not paginate dashboard snapshots, student classes, attendance summaries, or exports.

## Authentication and account access

### Browser login sequence

1. Navigate to `/api/auth/google/redirect?origin=<frontend-origin>`. The optional origin is matched against configured frontend origins; an unrecognized/missing origin falls back to the first configured origin. `origin` is a string of at most 2048 characters.
2. The server sets the HttpOnly `alrm_oauth` cookie and redirects to Google. OAuth state is browser-bound, single-use, and expires after 10 minutes. Start redirect and callback through the same frontend origin/proxy so the cookie returns.
3. Google redirects to `/api/auth/google/callback` with its `code` and encrypted `state`. This endpoint is provider-driven; do not manufacture those values. The callback validates verified email and stable Google identity.
4. An untrusted device is redirected to `<frontend>/auth/otp?user_id=<uuid>&pending=<40-character-token>&checked=1`. The pending login session lasts 10 minutes. An OTP is emailed and lasts 5 minutes.
5. Submit `/auth/otp/verify`. Its success response contains `data.exchange_code` and sets an HttpOnly `alrm_device` cookie lasting 60 days. Successful OTP verification revokes the user's existing bearer tokens.
6. Submit `/auth/exchange` with that code within 60 seconds. It is single-use and returns `data.token` plus `data.user`.
7. Send `Authorization: Bearer <token>` on protected calls.

A trusted device can bypass OTP: the callback redirects to `<frontend>/auth/otp?exchange_code=<code>`. `/auth/otp/check-trusted` is a fallback for a pending login when a trusted cookie was unavailable at callback time. Use credentials/cookies with browser requests; the device cookie is not a bearer-token replacement.

OAuth errors redirect to `/login?error=oauth_failed` or `/login?error=account_disabled`. Missing frontend configuration can result in a server error.

### Public authentication payloads

| Endpoint | JSON body | Result and endpoint-specific failures |
|---|---|---|
| `POST /auth/otp/check-trusted` | `pending`: required string, exactly 40 characters | `data.trusted`; if true, also `exchange_code`. Expired session: `410`; blocked account: `403` |
| `POST /auth/otp/verify` | `user_id`: existing user UUID; `pending`: 40-character string; `code`: six digits, preferably a string preserving leading zeros | `data.exchange_code`; `410` expired pending session, `404` no pending OTP, `422` invalid/expired OTP, `429` attempt budget exhausted, `403` blocked account |
| `POST /auth/otp/resend` | `user_id`: existing user UUID; `pending`: 40-character string | Success message with `data: null`; minimum 30 seconds between sends. Cooldown/attempt lockout: `429`; expired session: `410` |
| `POST /auth/exchange` | `code`: required string, exactly 40 characters | `data: {token, user}`; invalid/expired/consumed code: `401`; blocked account: `403` |

An OTP permits five failed guesses. Resending a still-valid code carries over its attempt count. These limits apply alongside HTTP throttles.

### Account and role rules

| Account | Current behavior |
|---|---|
| Verified `@student.laverdad.edu.ph` | New account defaults to approved `student` |
| Verified `@laverdad.edu.ph` | New account defaults to approved `instructor` |
| Existing pending institutional account | Auto-approved on Google sign-in; pre-registered role is preserved |
| Verified external Google account | New account defaults to pending `student`; administrator must review it |
| Pending account | May finish authentication and use shared protected endpoints; all role-group endpoints require approval |
| Deactivated, null, or unknown status | Login/session access denied; active middleware revokes existing tokens |

External login also depends on Google's OAuth audience configuration. Domain values are configurable in `config/institution.php`.

Tokens have an 8-hour absolute lifetime and a 15-minute API-request idle timeout. Polling counts as activity. `/logout` revokes the current token; it does not clear the trusted-device cookie.

Role access is not hierarchical: administrators do not automatically pass instructor or student route groups. A user assigned to head a program can pass the program-head middleware via `headedProgramIds()` while retaining their primary role. Controllers may impose further checks: audit logs explicitly require primary role `administrator` or `program_head` and therefore reject an instructor who only has the program-head override.

## Endpoint inventory

**Access:** Public = no bearer token; Shared = Sanctum + active-account middleware; Student/Instructor/Head/Admin additionally require approved status and the appropriate role group. **Paged** refers to the pagination contract above. UUID route parameters use Laravel model binding where applicable.

### Public and shared endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/auth/google/redirect` | Public | Start Google OAuth; browser redirect |
| GET | `/auth/google/callback` | Public | Handle Google's callback; browser redirect |
| POST | `/auth/exchange` | Public | Exchange one-time code for bearer token |
| POST | `/auth/otp/check-trusted` | Public | Check pending login's trusted device |
| POST | `/auth/otp/verify` | Public | Verify OTP and issue exchange code |
| POST | `/auth/otp/resend` | Public | Resend OTP |
| POST | `/logout` | Shared | Revoke current token |
| GET | `/me` | Shared | Current user and program relations |
| PATCH | `/me/notification-preferences` | Shared | Change email notification preference |
| GET | `/complete-profile/programs` | Shared | Program choices excluding General Education |
| POST | `/complete-profile` | Shared | Complete student profile or link staff program |
| GET | `/notifications` | Shared | Own in-app notifications; **Paged** |
| GET | `/notifications/unread-count` | Shared | Own unread in-app count |
| PATCH | `/notifications/read-all` | Shared | Mark own in-app notifications read |
| PATCH | `/notifications/{notification}/read` | Shared | Mark owned notification read |
| GET | `/requests/{request}/evidence` | Shared + ownership/scope policy | Stream protected attachment |

### Student endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard` | Student dashboard snapshot |
| GET | `/classes` | Enrolled classes with an existing instructor |
| POST | `/requests/evidence` | Upload evidence; `201` |
| POST | `/requests` | Submit request; `201` |
| GET | `/requests` | Own requests; **Paged** |
| GET | `/requests/{request}` | Own request with class and follow-up relation |
| PATCH | `/requests/{request}` | Edit own pending request |
| DELETE | `/requests/{request}` | Cancel own pending request; preserves record |
| POST | `/requests/{request}/follow-up` | Follow up own pending request; `201` |
| GET | `/attendance/summary` | Own enrollments and nullable attendance trackers |

### Instructor endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/instructor/requests/export` | Download scoped XLSX |
| GET | `/instructor/requests` | Requests for taught classes; **Paged** |
| PATCH | `/instructor/requests/{request}/decision` | Approve, note, or invalidate own class's request |
| GET | `/instructor/dashboard` | Class and attendance snapshot |
| GET | `/instructor/followups` | Open flags escalated to current instructor; **Paged** |
| PATCH | `/instructor/followups/{followupFlag}/resolve` | Resolve an authorized flag |

### Program-head endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/program-head/reports/export` | Download program-scoped activity/risk CSV |
| GET | `/program-head/audit-logs` | Scoped student/instructor activity; **Paged**; primary-role restriction applies |
| GET | `/program-head/dashboard` | Summary of headed programs |
| GET | `/program-head/students` | Students in headed programs; **Paged** |
| GET | `/program-head/instructors` | Instructors linked to or teaching in headed programs; **Paged** |
| GET | `/program-head/students/flagged` | Flags escalated to user OR belonging to headed programs; **Paged** |
| GET | `/program-head/requests` | Requests in headed programs; **Paged** |

### Administrator endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/audit-logs` | College-wide student/instructor request activity; **Paged** |
| GET | `/admin/dashboard` | College-wide dashboard |
| GET | `/admin/users` | User list and filters; **Paged** |
| POST | `/admin/users` | Pre-register institutional roster entry; `201` |
| DELETE | `/admin/users/{user}` | Delete pending/deactivated account |
| PATCH | `/admin/users/{user}/role` | Reassign eligible role |
| PATCH | `/admin/users/{user}/status` | Approve, deactivate, or reactivate |
| GET | `/admin/programs` | Program list; **Paged** |
| POST | `/admin/programs` | Create program; `201` |
| GET | `/admin/programs/{program}` | Program details and relations |
| PUT/PATCH | `/admin/programs/{program}` | Update program |
| DELETE | `/admin/programs/{program}` | Delete program with no classes/users |
| GET | `/admin/classes` | Class list; **Paged** |
| POST | `/admin/classes` | Create class and enroll matching students; `201` |
| GET | `/admin/classes/{class}` | Class, instructor, program, and enrolled students |
| PUT/PATCH | `/admin/classes/{class}` | Update class and enroll matching students |
| DELETE | `/admin/classes/{class}` | Delete class with no enrollments |
| GET | `/admin/reports/export` | Download college-wide XLSX |
| GET | `/admin/reports/preview` | Preview export row count and date window |

`PUT/PATCH` denotes both registered resource update methods. There are no resource create/edit HTML routes. `/up` is a separate Laravel health route outside `/api`; `/` serves the welcome view.

## Profile and notifications

### Complete profile

`POST /complete-profile` uses the server-side role; clients cannot set `role` or `status` here.

| Field | Rules |
|---|---|
| `program_id` | Required existing program UUID for every role |
| `school_id_number` | Required for students; otherwise nullable; string ≤50; unique except current user |
| `year_level` | Required for students; otherwise nullable; `1st`, `2nd`, `3rd`, `4th` |
| `role`, `status` | Prohibited |

Students receive profile fields and automatic enrollment into matching program/year classes for the current semester and school year. A student with both `program_id` and `school_id_number` already set receives `409` on resubmission. Staff save `school_id_number` when supplied and link the supplied program through the many-to-many relation without detaching existing programs. Omitting the staff ID preserves its existing value. Success returns a user resource.

`school_id_number` is the shared institutional ID for students, instructors, program heads, and administrators. Keep it as a string to preserve leading zeros and hyphens; it is unique across all users. The internal UUID `id` remains the relationship key. Staff IDs remain optional while staff onboarding is being built; student IDs remain required.

Staff pre-dashboard forms can submit to the same endpoint:

```json
{
  "program_id": "<program UUID>",
  "school_id_number": "EMP-00123"
}
```

Use `data.school_id_number` in the completion response and `/me` response. `year_level` is required only for students. Run `php artisan migrate` when deploying this change: the new migration renames the existing ID column in place and preserves data and uniqueness. API clients must use the new field name.

`GET /complete-profile/programs` returns `data: [{id, program_name}]`, ordered by name, excluding `General Education`.

### Email preference

`PATCH /me/notification-preferences` requires `email_notifications_enabled` as a boolean. Response: `{"success":true,"data":{"email_notifications_enabled":false}}`. This controls optional email notifications; consult [MAILING.md](MAILING.md) for delivery behavior. It does not disable in-app notifications or authentication OTP.

### Notification operations

`GET /notifications?unread=1&page=1&per_page=50` lists the caller's in-app notifications newest by `date_sent`. The boolean `unread` filter is optional. Count success is `data: {"unread_count":3}`.

Both read endpoints take no body. Marking an already-read notification read succeeds. A single-record operation checks ownership; read-all is scoped to the caller's unread in-app records and returns `data: null` with a count in `message`.

## Student requests and evidence

### Upload first, then submit

`POST /requests/evidence` accepts one multipart field named `file`. Allowed extensions/MIME types: PDF (`application/pdf`), JPG/JPEG (`image/jpeg`), PNG (`image/png`). Contents and extension must agree. Maximum upload is 2048 KiB (2 MiB); empty/unreadable files are rejected. A student may have at most 10 unlinked uploads.

Images must be no larger than 8192 pixels on either side and 8,000,000 total pixels. They are re-encoded as JPEG, resized to a maximum 1600-pixel longest edge, with a white background. PDFs are checked for a `%PDF-` header.

Illustrative `201` response:

```json
{
  "success": true,
  "message": "File uploaded.",
  "data": {
    "path": "019a2d00-0000-7000-8000-000000000001",
    "name": "medical-certificate.jpg",
    "type": "image/jpeg"
  }
}
```

Despite its name, `data.path` is an attachment UUID. Submit it as `evidence_file_url`; do not send a public URL or filesystem path. The attachment must belong to the caller and still be unlinked. Linking is atomic; an attachment already claimed by another request is rejected.

### Create request

`POST /requests` accepts:

| Field | Required | Rules |
|---|---|---|
| `class_id` | Yes | Existing class UUID; caller must be enrolled; instructor must exist |
| `type` | Yes | `absence` or `late` |
| `subjects_missed` | Yes | String ≤255 |
| `minutes_late` | When `type=late` | Nullable integer, 1–999 when present |
| `start_date_of_absence` | Yes, for both types | Occurrence date, including late requests |
| `end_date_of_absence` | No | Nullable date on/after start |
| `reason` | Yes | String ≤600 on create |
| `evidence_file_url` | No | Nullable owned, unlinked attachment UUID |
| `evidence_type` | No | Nullable string ≤100 |
| `proof_types` | No | Nullable list, maximum 6 distinct allowed strings |
| `guardian_name` | Yes | String 2–60 characters, no digits |
| `contact_number` | Yes | Philippine number matching `09` + 9 digits or `+639` + 9 digits |

Allowed `proof_types` values, with exact spelling:

- `Medical Certificate`
- `Prescription / Medical Record`
- `Death Certificate / Funeral Notice`
- `School Activity Endorsement`
- `Letter from Parent/Guardian`
- `Others`

The backend derives enrollment and instructor from the caller and class. It sets status `pending` and submission time; it also updates the user's guardian/contact details. An equivalent submission within five minutes returns `409`; equivalence compares enrollment, type, reason, subjects, minutes late, start date, and end date.

### Read, edit, cancel, follow up

`GET /requests` is scoped to the student and loads `enrollment.class`. `GET /requests/{request}` also loads `followupFlag`. The detail route is in the student group even though the shared evidence policy supports staff access.

`PATCH /requests/{request}` requires the full editable set: `type`, `subjects_missed`, `start_date_of_absence`, `reason`, and `minutes_late` when late. Optional fields are `end_date_of_absence`, `evidence_file_url`, `evidence_type`, and `proof_types`, with create rules except **reason is limited to 500 characters on update**. Class, enrollment, guardian, contact, and review fields are not editable here. Omit `evidence_file_url` or send its current value; changing/removing it is rejected with `422`.

Only the owner of a pending request may edit or cancel it. The policy generally rejects reviewed requests with `403`; update also contains a `422` reviewed-state check and a transactional `409` conflict check. Do not assume every state conflict has the same status.

`DELETE /requests/{request}` changes status to `cancelled`, returns the updated object, and preserves history. It does not hard-delete the row.

`POST /requests/{request}/follow-up` takes no body. It requires ownership, pending status, and an active instructor with an email address. A follow-up within 24 hours of the latest flag is rejected with `429`. Success creates an open flag, records activity, creates an in-app notification, and queues instructor mail through the delivery service. `201` confirms the recorded follow-up, not delivery to an email inbox.

### Read protected evidence

`GET /requests/{request}/evidence` streams the attachment as an inline PDF or image, with `Content-Type`, `Content-Disposition`, and `Cache-Control: private, no-store`. It is available to the owning student, class instructor, head of the class's program, or administrator according to the policy. Missing attachment: `404`. Fetch with a bearer header and consume the body as a blob; an ordinary image URL cannot supply that header.

## Instructor decisions and follow-ups

`GET /instructor/requests` lists only requests for the caller's taught classes with `enrollment.student` and `enrollment.class`. It supports pagination; export-only filters are not applied to this list.

`PATCH /instructor/requests/{request}/decision` requires `{"status":"approved"}`, `noted`, or `invalid`. Only the actual instructor may decide; administrators/program heads cannot decide through their own monitoring access. Request and enrollment locking protects against duplicate processing. The pending-state policy may return `403` before the controller's `409` conflict check.

Success stores `reviewed_by` and `date_reviewed`, records activity, and creates a student in-app decision notification. `approved`/`noted` excuse the request; `invalid` increments the attendance tracker. There is no remarks field in this endpoint's validation.

`PATCH /instructor/followups/{followupFlag}/resolve` takes no body, requires flag-update authorization, and returns the updated flag. Already resolved: `409`. Resolving a flag does not itself decide the associated request.

## Dashboards and program monitoring

| Endpoint | Main `data` fields and scope |
|---|---|
| `/dashboard` | `total_classes` for current term; `unexcused_absences`, `excused_absences`, `lates_recorded`, `pending_requests`, `threshold`, `unread_notifications`, up to 5 `recent_notifications` |
| `/classes` | Array: `enrollment_id`, `class_id`, `subject_name`, `section`, `schedule`, `semester`, `school_year`, enrollment `year_level`, `instructor: {id,name}`, program name; excludes classes with no existing instructor |
| `/attendance/summary` | Array: `class_id`, `subject_name`, nullable `tracker` for each own enrollment |
| `/instructor/dashboard` | `total_classes`, `total_students` (enrollment count across classes), full `pending_requests` and `flagged_students` arrays |
| `/program-head/dashboard` | Combined `program_name`, `total_students`, `total_instructors`, `total_classes`, `pending_requests`, `warning_count`, `critical_count`, `ir_count`, up to 5 `recent_flags` |
| `/admin/dashboard` | `total_programs`, `total_classes`, `total_students`, `total_instructors`, `total_program_heads`, `pending_staff_approvals`, `pending_requests`, `warning_count`, `critical_count`, `ir_count`, `open_followup_flags`, `programs_summary`, up to 10 `recent_flags` |

`pending_staff_approvals` currently counts all pending users despite its field name. Most dashboard aggregate queries are not restricted to the current academic term; only the student `total_classes` calculation explicitly is.

Student `threshold` contains `used`, `limit`, `status`, and `remaining_semester_percentage`. The closest class is selected by usage ratio; overall status is the highest severity among trackers. These values need not describe the same tracker.

Attendance status values are `safe`, `warning`, `critical`, and uppercase `IR`. The current policy uses class meeting hours: `used = total_absences × unitsPerMeeting + floor(total_lates / 3)`. Warning and critical correspond to one and two weeks of class hours; IR is the allowable absence-hours limit, based on 20% of semester hours with class-specific rounding. `converted_absences` separately equals `total_absences + floor(total_lates / 3)`. Do not implement a fixed 2/3-absence threshold from the older README/report; see `AttendanceTracker` and `ClassModel`.

Program-head students, instructors, requests, dashboard, and report export require headed programs. Requests optionally filter `status` by `pending`, `approved`, `noted`, or `invalid`; unfiltered lists may also contain cancelled requests. Flagged-student lists optionally filter `status=open|resolved` and include flags escalated directly to the caller OR belonging to their headed programs. This flag-list scope is broader than report-export scope, which always uses headed programs.

## Administrator management

### Users

| Operation | Inputs and behavior |
|---|---|
| List | Optional `role=student|instructor|program_head|administrator`, `status=pending|approved|deactivated|inactive`, plus pagination. `inactive` maps to `deactivated`. Users with null roles are excluded; results ordered by name |
| Pre-register | Required `name` string ≤255; unique email ≤255; `role` from the list above. Only institutional addresses accepted: student domain requires student role; staff domain requires a staff role. Creates pending roster entry; no password input |
| Change role | Required `role=instructor|program_head|administrator`. Existing student may only be promoted to `program_head`; null-role targets are rejected. Pending external accounts may instead receive any of the four roles, including student. Cannot change own role; unchanged role gives `409`. This operation does not approve pending users |
| Change status | Required `status=approved|deactivated|inactive`; inactive is stored as deactivated. Cannot change own status. Pending user without a Google identity cannot be changed here (`409`); pending self-registered user may only be approved. Repeating current status gives `409` |
| Delete | Only pending or deactivated account; active account gives `409`. Returns `data: null` |

Status deactivation deletes bearer tokens and trusted-device records. A program-head role by itself does not assign a program; configure `program_head_id` on the program separately.

### Programs

Create requires unique `program_name` string ≤255. Optional nullable `program_head_id` must be an existing UUID for a user with primary role `instructor` or `program_head`. Update accepts either field optionally (`sometimes`). `null` can clear the head assignment. Lists load `programHead` plus class/user counts; details load `programHead`, `classes`, and `users`.

Delete returns `409` when classes or users remain; success returns `data: null`.

### Classes

All fields below are required on create and optional on PUT/PATCH update:

| Field | Validation |
|---|---|
| `subject_name` | String ≤255 |
| `section` | String ≤50 |
| `instructor_id` | Existing user UUID with primary role `instructor` |
| `schedule` | String ≤4096 |
| `program_id` | Existing program UUID |
| `year_level` | `1st`, `2nd`, `3rd`, `4th` |
| `semester` | `1st`, `2nd` |
| `school_year` | String matching `YYYY-YYYY` |

Create/update auto-enroll matching students only when the class belongs to the current semester and school year. It creates missing enrollments; it does not detach existing ones. Lists load instructor/program and enrollment count. Delete with any enrollments returns `409`; success returns `data: null`.

## Reports and downloads

All exports are capped at 5,000 rows and throttled to 3/minute per user. A successful file download is not a JSON envelope. No PDF report-export endpoint is currently registered.

| Endpoint | Format | Optional query filters | Date meaning |
|---|---|---|---|
| `/instructor/requests/export` | XLSX | `class_id` owned by instructor; `type=absence|late`; `status=pending|approved|noted|invalid|cancelled`; `search` student name ≤50 characters | No date filter/window implemented |
| `/program-head/reports/export` | UTF-8 CSV with BOM | `report_type=activity|risk` (default activity); `program_id` among headed programs; exact `date_from`, `date_to` in `YYYY-MM-DD` | Activity: submission time, falling back to created time. Risk: flag date |
| `/admin/reports/export` | XLSX | Existing `program_id`; `status=pending|approved|noted|invalid`; `date_from`, `date_to` valid dates | Occurrence date (`start_date_of_absence`) |
| `/admin/reports/preview` | JSON | Same filters as admin export | Same occurrence date window |

Head/admin date windows permit at most 730 days and include the end date. With no dates, they default to the preceding 365 days through today. With only `date_to`, start defaults to 365 days before it; with only `date_from`, end defaults to today. Instructor export has no 730-day date constraint. Narrow filters when exports exceed the row cap (`422`).

Head activity CSV columns: `Student`, `Class`, `Submitted`, `Type`. Risk CSV columns: `Student`, `Class`, `Flagged date`, `Status`. Risk export is restricted to headed programs even for flags escalated to the user from elsewhere.

Admin preview returns `data.row_count`, `exceeds_limit`, `max_export_rows`, `date_from`, `date_to`, and `used_default_range`. Preview can report a count above 5,000; export rejects that count. Preview is useful before requesting a download but is not a server-enforced prerequisite.

## Audit logs

`GET /admin/audit-logs` and `GET /program-head/audit-logs` share the controller and pagination. They expose supported student/instructor request and follow-up activity, not every row in the audit table or administrator management history.

| Query | Rules |
|---|---|
| `role` | `student` or `instructor` |
| `action` | One of the supported actions below |
| `user_id` | Actor UUID |
| `request_id` | Related request UUID |
| `from`, `to` | Exact `YYYY-MM-DD`; `to` on/after `from`; inclusive end day |
| `page`, `per_page` | Shared pagination rules |

Supported actions: `submitted_request`, `updated_request`, `cancelled_request`, `followed_up_request`, `decided_request_approved`, `decided_request_noted`, `decided_request_invalid`, `resolved_followup_flag`.

Primary-role administrators see eligible activity college-wide. Primary-role program heads see activity in their headed programs and need at least one assignment. Instructor primary-role accounts are rejected by this controller even when program-head middleware permits entry.

Items contain `id`, `action`, human-readable `description`, ISO-8601 `timestamp`, `actor: {id,name,role}`, `table_affected`, `record_id`, and a related `request` summary with `id`, `type`, `current_status`, `student: {id,name}`, and `class: {id,subject_name,program_id,instructor_id}`. `current_status` is the request's present state, not a historical snapshot at the event time. Results sort newest timestamp, then descending ID. See [AUDIT-LOG.md](AUDIT-LOG.md).

## Response fields

| Object | Fields and notes |
|---|---|
| User resource | `id`, `name`, `email`, `role`, `program_id`, `school_id_number`, `status`, `year_level`, `heads_program`, `headed_program_exists`; `program`/`programs` only when loaded |
| Private user fields | `guardian_name`, `contact_number` in self, authenticated-exchange, or explicit admin resource context; `email_notifications_enabled` only for self/exchange. Resource rules do not imply that every nested user model has the same shape |
| Request model | UUID `id`, `enrollment_id`, `type`, `subjects_missed`, `minutes_late`, occurrence dates, `reason`, nullable evidence fields, `proof_types`, status, submission/review timestamps, `reviewed_by`, normal model timestamps; relations depend on endpoint |
| Follow-up flag | `id`, `request_id`, `flagged_date`, `escalated_to`, `status`; related request/student/class when loaded |
| Notification | `id`, `user_id`, nullable `request_id`, `type`, `message`, `channel`, `date_sent`, `is_read`; dashboard recent-notification summaries expose fewer fields |
| Tracker | `id`, `enrollment_id`, `total_lates`, `total_absences`, `converted_absences`, `status`, notification timestamps and normal model timestamps |

IDs in example requests must be replaced with records accessible to the authenticated caller. Do not rely on internal Google identity fields being present. Nullable dates/relations must be handled by clients.

## Errors and rate limits

| HTTP status | Typical meaning |
|---|---|
| `400` / `405` | Invalid request or unsupported method, as applicable |
| `401` | Missing/invalid/expired bearer token or invalid exchange code |
| `403` | Wrong role, unapproved account, ownership/scope denial, or blocked account |
| `404` | Missing bound record, missing evidence, or no pending OTP |
| `409` | Duplicate submission, immutable/completed profile, conflicting management action, already-resolved flag, or transaction state conflict |
| `410` | Expired pending login session |
| `413` | Request body exceeds infrastructure/PHP limits; may occur before Laravel |
| `422` | Validation error, unavailable business prerequisite, legacy list >500, export/date cap |
| `429` | HTTP throttle, OTP budget/resend cooldown, or follow-up cooldown |
| `500` | Unexpected server failure; custom handler returns a generic message |

Typical Laravel validation error:

```json
{
  "message": "The reason field is required.",
  "errors": {
    "reason": ["The reason field is required."]
  }
}
```

Business failures commonly return `{"success":false,"message":"…","data":null}`. The current wrong-role middleware response spells its flag **`succcss`**, so clients should use HTTP status rather than assume all errors contain `success`. Authentication/authorization/model-binding exceptions may use Laravel's default JSON shape. Read `errors` for field-level messages, and handle download errors as JSON before attempting to save a file.

| Budget | Limit |
|---|---|
| API-wide | 300/minute per IP plus 120/minute per authenticated user (IP fallback for guests) |
| All `/auth/*` routes | Additional 20/minute per IP |
| OTP/check-trusted | Additional 10/minute per IP and 10/minute per pending-token key |
| Student request creation | Additional 5/minute and 50/day per user |
| Evidence uploads | Additional route throttle 20/minute |
| Student follow-up | Additional route throttle 5/minute plus 24-hour business cooldown per request |
| Export routes | Additional 3/minute per user |

Limits are cumulative. Honor throttle `Retry-After` when supplied. OTP resend cooldown also returns `data.retry_after`; follow-up cooldown is reported through its message. Cache and proxy configuration affect production enforcement; these figures describe configured code, not measured live behavior.

## Integration examples

### Submit an absence request

After browser OAuth/OTP/exchange, a client can send:

```http
POST /api/requests HTTP/1.1
Authorization: Bearer <token-from-auth-exchange>
Accept: application/json
Content-Type: application/json

{
  "class_id": "019a2d00-0000-7000-8000-000000000002",
  "type": "absence",
  "subjects_missed": "Software Engineering",
  "start_date_of_absence": "2026-10-29",
  "reason": "Medical appointment",
  "proof_types": ["Medical Certificate"],
  "guardian_name": "Maria Santos",
  "contact_number": "09171234567"
}
```

For a late request, set `type` to `late` and include `minutes_late`; retain the required occurrence date. Evidence is optional; if uploaded first, include its attachment UUID as `evidence_file_url`.

### Paginated authenticated request

```javascript
const response = await fetch('/api/requests?page=1&per_page=50', {
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  },
  credentials: 'include',
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.message ?? `HTTP ${response.status}`);
const requests = payload.data;
const lastPage = payload.meta.last_page;
```

### Multipart evidence upload

```javascript
const body = new FormData();
body.append('file', selectedFile);
const response = await fetch('/api/requests/evidence', {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  },
  credentials: 'include',
  body,
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.message ?? 'Upload failed');
const evidenceAttachmentId = payload.data.path;
```

### Instructor decision

```http
PATCH /api/instructor/requests/019a2d00-0000-7000-8000-000000000003/decision HTTP/1.1
Authorization: Bearer <instructor-token>
Accept: application/json
Content-Type: application/json

{"status":"noted"}
```

### Download a report

```javascript
const response = await fetch('/api/admin/reports/export?date_from=2026-10-01&date_to=2026-10-29', {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
});
if (!response.ok) {
  const payload = await response.json();
  throw new Error(payload.message ?? 'Export failed');
}
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'alrm-requests.xlsx';
document.body.append(link);
link.click();
link.remove();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

## Source map and maintenance

| Contract | Source relative to backend |
|---|---|
| Registered API methods, paths, and groups | `routes/api.php` |
| Health path and JSON exception handling | `bootstrap/app.php` |
| Token idle timeout and named rate limits | `app/Providers/AppServiceProvider.php` |
| Absolute token expiry | `config/sanctum.php`, authentication controllers |
| Login, OTP, profile | `app/Http/Controllers/Auth/`, `app/Support/TrustedDeviceManager.php` |
| Approved-role and active-status gates | `app/Http/Middleware/RoleMiddleware.php`, `EnsureUserIsActive.php`, `app/Enums/UserStatus.php` |
| Pagination | `app/Support/BoundedCollection.php` |
| Student contracts and evidence | `app/Http/Controllers/Student/`, `app/Support/EvidenceImageProcessor.php` |
| Decisions and flag resolution | `app/Http/Controllers/Instructor/`, `app/Policies/ExcuseRequestPolicy.php`, `FollowupFlagPolicy.php` |
| Administration and exports | `app/Http/Controllers/Admin/`, `app/Http/Controllers/ProgramHead/` |
| Audit contracts | `app/Http/Controllers/AuditLogController.php`, `app/Http/Resources/AuditLogResource.php` |
| User response privacy | `app/Http/Resources/UserResource.php`, `app/Models/User.php` |
| Attendance formulas | `app/Models/AttendanceTracker.php`, `app/Models/ClassModel.php` |

Existing focused guides: [BACKEND.md](BACKEND.md), [AUDIT-LOG.md](AUDIT-LOG.md), [INSTRUCTOR-EXPORT.md](INSTRUCTOR-EXPORT.md), [PROGRAM-HEAD-ACCESS.md](PROGRAM-HEAD-ACCESS.md), [PROGRAM-HEAD-EXPORT.md](PROGRAM-HEAD-EXPORT.md), [MAILING.md](MAILING.md).

When routes, validation, response resources, or policies change, update this guide with them. Controllers not registered in `routes/api.php` are not public endpoints. Draft save/submit endpoints mentioned in TODO comments are not implemented routes. On a compatible configured PHP runtime, `php artisan route:list --path=api` can be used to compare the runtime route list with this inventory; it is not an integration test.
