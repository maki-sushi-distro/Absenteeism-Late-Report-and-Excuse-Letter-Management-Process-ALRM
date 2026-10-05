<?php

/**
 * Institutional Google Workspace email domains, mapped to the role a
 * user resolves to on first Google login. Single source of truth for
 * this mapping — AuthController::callback() (login/role resolution)
 * and UserApprovalController::store() (pre-registration validation)
 * both read from here, instead of each keeping their own copy.
 *
 * Both domains are inside the same "Internal" Google Workspace org
 * (Google itself already blocks anyone outside it from completing
 * OAuth), so this is app-level domain→role mapping, not the access
 * gate — that gate is Google's Internal app setting.
 */

return [
    'student_domain' => env('STUDENT_EMAIL_DOMAIN', 'student.laverdad.edu.ph'),
    'staff_domain'   => env('STAFF_EMAIL_DOMAIN', 'laverdad.edu.ph'),

    /**
     * Dev accounts: instructors on a student-domain email, used to see
     * the instructor dashboard. AdminUserSeeder never deactivates these
     * when they are missing from the staff Google Sheet. Comma-separated
     * in SEED_DEV_INSTRUCTOR_EMAILS; empty by default.
     */
    'dev_instructor_emails' => array_values(array_filter(array_map(
        fn (string $email) => strtolower(trim($email)),
        explode(',', (string) env('SEED_DEV_INSTRUCTOR_EMAILS', '')),
    ))),
];