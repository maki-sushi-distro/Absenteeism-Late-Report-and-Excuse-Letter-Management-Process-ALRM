# Test instructor schedules

The four accounts in `DevInstructorClassSeeder::DEV_INSTRUCTOR_EMAILS` have 21 classes each in the checked database. Their 84 blank schedules were filled with explicit sample data for testing.

The student-domain instructor allowlist is defined in `User::STUDENT_INSTRUCTOR_EMAILS` and shared with the class seeder. Eloquent rejects instructor assignments for other student-domain accounts. This does not change staff-domain instructors or program-head roles. Direct SQL bypasses model validation. Audit existing records with `php artisan alrm:repair-student-instructors`; use `--apply` to restore unexpected student-domain instructors to student, revoke their tokens/trusted devices, and log the repairs. The repair refuses accounts with teaching memberships, classes, or head assignments so those dependencies can be reviewed first. Eight unexpected accounts were repaired; only the four designated accounts remain student-domain instructors.

Run `php artisan db:seed --class=DevInstructorScheduleSeeder --force` only when sample data is wanted. This seeder is intentionally separate from `DatabaseSeeder` and the official roster sync. It fills only empty schedules for these accounts and leaves populated schedules unchanged.

Sample meetings last three hours, once per week, Monday through Saturday, using 24 slots between 07:00 and 19:00. Rooms `TEST-1` through `TEST-4` identify sample data. The deterministic allocation gives each instructor a different slot for each section and each section a different slot for each test instructor (up to 24 sections). Collision checks cover the generated test timetable; it is not coordinated with official class timetables. These times are not institutional assignments.

`DevInstructorClassSeeder` now preserves an existing same-subject schedule when no matching source schedule exists. A nonempty matching official source schedule still takes precedence. When a legacy class is renamed to a different subject, its former subject's schedule is not carried over.

The schedule test checks 84 assignments, instructor and section slot uniqueness, three weekly hours, one meeting per week, rerun stability, survival of the class sync, and preservation of original classes. All tests use an isolated in-memory database.
