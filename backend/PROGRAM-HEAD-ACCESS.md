# Shared program head access

The primary head remains in `programs.program_head_id`. Additional heads are explicitly assigned in `program_head_assignments`. Teaching membership (`program_user`) and student affiliation (`users.program_id`) do not grant head access.

Deploy the backend changes and run migrations before serving the updated code. For the connected database, the new migration and the two BSIS assignments were applied on October 26, 2026. Mac Robert Savandal and Marwin Mandocdoc now both have `role = program_head`; the existing primary BSIS head was preserved.

To assign existing staff accounts on another environment:

```sh
php artisan migrate --force
php artisan alrm:assign-program-heads PROGRAM_UUID USER_UUID [USER_UUID ...]
```

This command validates every account before updating, runs transactionally, records console-origin audit entries, and can be repeated without duplicate assignments. It does not change other users, teaching memberships, or the primary head.

Program head dashboards, request monitoring, audit logs, and read policies recognize all explicitly headed programs. Shared flags remain routed to the primary head but are visible to co-heads through program monitoring.

The account lists are available at `GET /api/program-head/students` and `GET /api/program-head/instructors`, with `page` and `per_page` support. Students are selected by program affiliation; instructors by teaching membership or assigned classes. The dashboard includes `total_students` and `total_instructors`.

Validation: `ProgramHeadAssignmentsTest`, `AuditLogTest`, and `ApiSecurityTest` (37 tests, 337 assertions). These tests use an isolated in-memory database.
