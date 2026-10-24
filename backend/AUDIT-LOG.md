# Student and instructor activity log

Uses the existing `AuditLog` model, `audit_log` table, and `AuditLoggerService`. No new model, table, or migration is required.

## Read endpoints

- `GET /api/admin/audit-logs`: administrator; activity across all programs.
- `GET /api/program-head/audit-logs`: program head; activity linked to requests in the program they head. Returns 403 when no program is assigned.

Both require a valid Sanctum token and an active account. Students and instructors cannot read these endpoints. No create, update, or delete audit-log endpoints are exposed.

Program access is determined by the request's class, including follow-up activity. An instructor teaching several programs does not expose their other programs' activity to a program head.

## Query parameters

| Parameter | Accepted value |
| --- | --- |
| `page` | Integer from 1 to 100000 |
| `per_page` | Integer from 1 to 100; defaults to 50 when paginating |
| `role` | `student` or `instructor` |
| `action` | One action code below |
| `user_id` | Actor UUID |
| `request_id` | Request UUID; includes activity on its follow-up flags |
| `from`, `to` | Inclusive calendar dates, `YYYY-MM-DD`, in the application timezone |

Use `?page=1&per_page=50` for the activity screen. Results are newest first. The response follows the existing collection contract: `success`, `message`, `data`, and `meta` (`page`, `per_page`, `total`, `last_page`). Without pagination, the existing 500-record limit applies.

Each entry contains `id`, `action`, `description`, `timestamp`, `actor` (`id`, `name`, `role`), `table_affected`, `record_id`, and `request`. Request context contains the request ID, type, `current_status`, student ID/name, and class ID/subject/program/instructor. Private reason text, evidence, and guardian contact information are not included.

`action` describes what happened at the recorded time. `request.current_status` is the request's present status; for example, an earlier submission remains `submitted_request` after approval.

## Recorded actions

| Action | Actor |
| --- | --- |
| `submitted_request` | Student |
| `updated_request` | Student; only when the edit changes the request |
| `cancelled_request` | Student |
| `followed_up_request` | Student |
| `decided_request_approved` | Instructor |
| `decided_request_noted` | Instructor |
| `decided_request_invalid` | Instructor |
| `resolved_followup_flag` | Instructor |

Submission, edit, and cancellation entries are written in the same transaction as their request changes. Existing follow-up and decision logging is reused. Failed submissions and unauthorized actions do not create activity entries.

Existing matching entries are readable immediately. Previously unlogged submissions/edits/cancellations cannot be reconstructed; those actions are recorded going forward. The existing schema links actors and requests rather than storing immutable snapshots: displayed names, roles, and program ownership reflect current records, and deletion/cascade behavior remains unchanged.

## Verification

Run `php vendor/bin/phpunit tests/Feature/AuditLogTest.php` from `backend/`. The tests use an isolated in-memory SQLite database through `SecurityTestCase`.
