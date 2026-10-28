# Shared program head access

Changing an account's role to `program_head` automatically grants head access to its current `users.program_id`. This works for admin role changes and direct database role edits used in SQA testing. Ordinary student/instructor affiliation and teaching memberships (`program_user`) do not grant head access. When there is no current program or explicit head assignment, the admin response warns that a program still needs to be assigned; teaching memberships are not guessed.

The primary head remains in `programs.program_head_id`. Additional explicit assignments in `program_head_assignments` are also supported. Automatic access follows the current program and role on subsequent requests, without creating a permanent assignment. Changing the role away from `program_head` removes this automatic access; existing explicit head assignments remain independent.

Deploy the backend changes and run migrations before serving the updated code. For the connected database, the new migration and the two BSIS assignments were applied on October 26, 2026. Mac Robert Savandal and Marwin Mandocdoc now both have `role = program_head`; the existing primary BSIS head was preserved.

To assign existing staff accounts on another environment:

```sh
php artisan migrate --force
php artisan alrm:assign-program-heads PROGRAM_UUID USER_UUID [USER_UUID ...]
```

This command validates every account before updating, runs transactionally, records console-origin audit entries, and can be repeated without duplicate assignments. It does not change other users, teaching memberships, or the primary head.

Program head dashboards, request monitoring, audit logs, and read policies recognize all explicitly headed programs. Shared flags remain routed to the primary head but are visible to co-heads through program monitoring.

The account lists are available at `GET /api/program-head/students` and `GET /api/program-head/instructors`, with `page` and `per_page` support. Students are selected by program affiliation; instructors by teaching membership or assigned classes. The dashboard includes `total_students` and `total_instructors`.

Preventive warnings at **10% or more** and critical consultation alerts at **15% or more** of total semester class hours go to the class program's active heads: the primary head, explicit co-heads, and accounts with `role = program_head` and that current `program_id`. Each recipient gets one in-app alert plus a queued English email using `mail/program-head-attendance-alert.blade.php`, styled like the existing instructor emails. These two alert types are routed to heads rather than ordinary instructors.

The denominator is `weekly_hours × semester_weeks` (16 weeks by default). Counted absence hours remain `(total_absences + floor(total_lates / 3)) × hours_per_meeting`; only invalid requests add to these counts. Thresholds are configured in `config/alrm.php`. The existing 20% allowable absence limit remains separate from the alert thresholds. For 48 total hours with 3-hour meetings, 2 absences (12.5%) trigger the preventive warning and 3 absences (18.75%) trigger consultation.

For API/database compatibility, `warning` / `threshold_warning` identify the preventive stage and `IR` / `ir_escalation` identify the critical consultation stage. Critical alerts create an open `followup_flags` record linked to the triggering request, or the latest invalid request for automation; a tracker without a matching request can still notify heads but cannot create a request-linked flag. A jump directly to 15% or above sends the critical alert. Existing stage timestamps prevent repeat alerts.

After deployment, refresh cached configuration and recompute existing tracker statuses with `php artisan config:cache` and `php artisan alrm:recompute-trackers`, then run `php artisan alrm:process-automation` for outstanding stages. Do not use `--reset-notified` unless replaying historical alerts is intentional. These commands are deployment steps; editing this code does not execute them against the live database.

Request decisions and scheduled automation share `AttendanceThresholdNotifier` and lock the tracker while checking `warning_notified_at` / `ir_notified_at`. This prevents duplicate delivery by the two paths. Email jobs dispatch after commit and retry up to three times through the existing queue worker. No-recipient stages remain available for the next automation run. Previously notified stages and historical duplicates are not replayed or deleted. Existing overdue-request follow-up behavior is unchanged.

Validation: `ProgramHeadAssignmentsTest`, `AuditLogTest`, and `ApiSecurityTest`. These tests use an isolated in-memory database.
