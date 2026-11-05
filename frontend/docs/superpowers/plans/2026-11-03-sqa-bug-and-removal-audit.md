# SQA Bug and Requested System Changes Implementation Plan

## Implementation status - November 3, 2026

Tasks 1-6 are implemented in the frontend. Task 7 targeted regression batch, scoped ESLint, production build, and whitespace checks passed. Existing instructor-assignment tests were included in the passing combined regression batch. The focused session refresh provider test also passed.

Rulings during execution:
- Kept the current checkout and all existing edits because writes are restricted to frontend; no worktree metadata or backend files were changed.
- Left changes uncommitted so the user can review them together with the existing working changes.
- Used a dedicated threshold presentation helper to keep React modules compatible with refresh lint rules.
- Added a visible-tab 60-second bell refresh and window-focus refresh so newly arriving notifications update a closed bell. A cached positive unread count stays visible during refresh errors.
- Kept current Instructor Accounts and Assigned Instructors meanings explicit rather than inventing a common count from different datasets.
- Did not run backend tests because they can write backend cache/log/database state. No backend files were modified.

Review: a separate reviewer found a background-refresh badge flicker; the badge now remains visible while cached unread count is positive. No other actionable regression was reported.

Verification limitations: authenticated live server flows were not exercised. Existing student progressive-loading tests retain outdated `/attendance/summary` expectations, and unrelated session-loading and activity-log test drift remains outside this change. Backend tracker repair and server-wide deletion prevention still require backend-owner action.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the frontend defects and requested removals from the SQA report while treating the current Laravel backend as a read-only contract.

**Architecture:** Keep Laravel response fields authoritative. Fix stale client state, unread-badge lifecycle, missing presentation of existing threshold fields, and admin-only UI behavior in React. Do not hide a backend contradiction as a valid safe state, and do not modify backend routes, controllers, models, migrations, tests, or documentation.

**Tech Stack:** React 19, React Router, Vite, Tailwind CSS, Base UI/native dialogs, Node test runner, Laravel API contract (read-only)

**Spec:** `C:\Users\Mac\Downloads\ALRM SYSTEM_Bugs & Needs to be removed.pdf`

## Global Constraints

- Create, edit, update, and delete files only under `frontend/`.
- Treat every file under `backend/` as read-only, including tests and documentation.
- Do not stage, commit, format, or run mutation-producing commands against backend files.
- Preserve existing uncommitted frontend work, especially `src/App.jsx`, `src/pages/auth/admin/AdminManage.jsx`, `src/pages/auth/admin/AdminUserManagement.jsx`, assignment components, and their tests.
- Do not add dependencies. Reuse the existing native dialog, Base UI, input, filter, and resource-cache patterns.
- Use backend response fields as the source of truth. Frontend guards may expose inconsistent data but must not invent attendance records or account counts.
- Keep class CRUD separate from the instructor-assignment workflow at `/manage`.
- Add a failing frontend regression test before each behavior change.

## Review Focus

- A saved email preference followed by a same-session refresh must show the confirmed server value, not a cached user object. Covered by Task 1.
- An unread notification that arrives before the bell opens must display a badge and remain unread until an explicit read action. Covered by Task 2.
- A `safe` attendance status paired with `used >= limit` must never render as safe; missing and unknown threshold values must remain explicit. Covered by Task 3.
- Pending roster entries must remain discoverable after approval-specific tabs disappear, without exposing approve/decline actions. Covered by Task 5.
- Class search must combine with program filtering, and edit-dialog cancellation or save failure must preserve the loaded class list. Covered by Task 6.

---

## Audit Findings and Disposition

| SQA item | Current source evidence | Disposition |
| --- | --- | --- |
| Email notification settings reset | `NotificationPreferences` persists through `PATCH /api/me/notification-preferences`, but `refreshUser()` calls cached `getSessionUser()` without invalidating `resolvedUsers`. The focused provider retry test currently fails because refresh does not issue a new session request. | Confirmed frontend root cause. Fix in Task 1. |
| Bell red indicator is inconsistent | `NotificationBell` passes `enabled: open`, so no initial preview is fetched. `loadNotificationPreview()` then marks every returned unread item read during loading. | Confirmed frontend root cause. Fix in Task 2. |
| Student threshold still says safe after exceeding limit | Current frontend renders backend `threshold.status`; current backend computes `warning`, `critical`, and `IR`. A contradictory `safe` payload is therefore stale or inconsistent backend data, not a missing frontend calculation. | Add a frontend contradiction guard and regression coverage in Task 3. Any tracker repair remains backend-owned and out of scope. |
| Program Head threshold warning is absent | Backend dashboard already returns `warning_count`, `critical_count`, and `ir_count`, but `ProgramHeadOverview` does not render them. | Confirmed frontend omission. Fix in Task 3. |
| Program Head total students counts request submitters only | Current backend uses `User::where('role', 'student')->whereIn('program_id', ...)->count()` and the frontend renders `dashboard.total_students`. | Already corrected in current source. Add regression coverage only in Task 3. |
| Admin total instructors is incorrect | Current backend returns all users whose role is `instructor`. Program Overview derives unique assigned instructors from classes, so the two values have different meanings. | Clarify account count versus assigned count in Task 4. A new unified backend count is outside scope. |
| Remove admin approval dashboard UI | Dashboard still renders a `Pending for Approval` metric and `Pending Account Approvals` panel. | Confirmed requested frontend removal. Task 4. |
| Replace approval-separated user views with Users | User Management still has `Approved Users` and `Waiting for Approval` tabs and approval actions. Backend still uses `pending` for pre-registered users until first Google sign-in. | Use one Users view and neutral status language while preserving discoverability. Task 5. |
| Remove program and class deletion | Frontend still imports delete adapters and renders destructive buttons. Backend delete endpoints remain available. | Remove only frontend controls and unused frontend adapters. Task 6. |
| Add class search/filter and edit modal | The dormant class-management view has neither search nor filtering, and `ClassForm` renders inline. An uncommitted `App.jsx` change currently removes `/classes`. | Restore a dedicated class route deliberately, add client-side filters, and wrap only editing in a modal. Task 6. |

### Baseline verification note

The read-only audit ran this frontend batch:

```powershell
node --test tests/staff-notifications.test.js tests/student-overview.test.js tests/program-head-data.test.js tests/admin-dashboard.test.js tests/admin-user-management.test.js tests/admin-manage.test.js tests/figma-pages.test.js tests/session-loading.test.js
```

Result: 89 passed and 37 failed. Relevant evidence includes the failing forced-refresh provider test and stale tests that still require approval UI. Many other failures are unrelated existing worktree drift, including session-loading presentation expectations and the removed `attendanceStanding` export. Do not use that combined batch as the acceptance gate for this plan.

---

### Task 1: Force Fresh Session Data After Preference Saves

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx:17-34,88-90`
- Test: `frontend/tests/session-loading.test.js`
- Test: `frontend/tests/staff-notifications.test.js`

**Interfaces:**
- Consumes: existing `clearSessionUserCache()` and `getSessionUser()` functions.
- Produces: `refreshUser(options?: { silent?: boolean }): Promise<User|null>` that always invalidates the resolved session-user cache before fetching.
- Preserves: startup `loadUser()` deduplication and current-session version checks.

- [ ] **Step 1: Write the failing forced-refresh test**

Add or update the provider test named `provider preserves a verified user during outage and supports retry` so it asserts that calling `refreshUser()` after a resolved session starts a second `/api/session` request and publishes the newer `email_notifications_enabled` value.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
node --test --test-name-pattern="provider preserves a verified user during outage and supports retry" tests/session-loading.test.js
```

Expected: FAIL because `refreshUser()` returns the cached user without another request.

- [ ] **Step 3: Separate cached startup loading from explicit refresh**

In `AuthContext.jsx`, keep `loadUser({ silent })` for startup and session-change flows. Add a stable `refreshUser` callback that calls `clearSessionUserCache()` once, then delegates to `loadUser(options)`. Provide that callback through context.

- [ ] **Step 4: Pin email-preference refresh behavior**

In `staff-notifications.test.js`, assert that the preference component keeps the server-confirmed switch value while `onEmailSaved` requests a fresh user. Do not add a second preference store.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
node --test --test-name-pattern="provider preserves a verified user during outage and supports retry|email preference" tests/session-loading.test.js tests/staff-notifications.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the frontend slice**

```powershell
git add frontend/src/context/AuthContext.jsx frontend/tests/session-loading.test.js frontend/tests/staff-notifications.test.js
git commit -m "fix(frontend): refresh saved notification preference"
```

### Task 2: Make the Bell Badge Eager and Read Actions Explicit

**Files:**
- Modify: `frontend/src/components/notifications/NotificationBell.jsx:11-28`
- Modify: `frontend/src/components/notifications/notificationFeed.js:88-99`
- Modify: `frontend/src/components/notifications/useServerNotifications.js:11-18`
- Test: `frontend/tests/staff-notifications.test.js`

**Interfaces:**
- Consumes: `GET /api/notifications/preview` returning `{ notifications, unread_count }`.
- Produces: `loadNotificationPreview(userId)` with no write side effect.
- Preserves: `markFeedRead(userId, items, all)` as the only path that calls notification read endpoints.

- [ ] **Step 1: Replace the auto-read preview expectation with unread preservation**

Update the preview test to assert one GET to `/api/notifications/preview`, zero PATCH calls, unchanged `is_read: false`, and the server `unread_count` retained in cache.

- [ ] **Step 2: Add a bell lifecycle regression test**

Test that the account bell enables preview loading while closed and renders a badge for a positive unread count. Keep the cross-role preview test unchanged.

- [ ] **Step 3: Run tests to verify both fail**

Run:

```powershell
node --test --test-name-pattern="preview loading|notification resource options|bell" tests/staff-notifications.test.js
```

Expected: FAIL because preview is lazy and loading performs a PATCH.

- [ ] **Step 4: Remove read mutations from preview loading**

Make `loadNotificationPreview(userId)` validate and cache the GET result only. Delete its `markFeedRead` call and read-error branch. Keep explicit single-item and mark-all behavior unchanged.

- [ ] **Step 5: Load the preview when the authenticated bell mounts**

Stop tying the preview resource's `enabled` flag to popover open state. The popover may remain lazy-rendered, but unread count loading must start for the closed bell.

- [ ] **Step 6: Run focused notification tests**

Run:

```powershell
node --test tests/staff-notifications.test.js tests/instructor-notification-fallback.test.js tests/admin-notification-activity.test.js
```

Expected: PASS. Opening the bell does not clear the badge; clicking a notification or Mark all does.

- [ ] **Step 7: Commit the frontend slice**

```powershell
git add frontend/src/components/notifications/NotificationBell.jsx frontend/src/components/notifications/notificationFeed.js frontend/src/components/notifications/useServerNotifications.js frontend/tests/staff-notifications.test.js
git commit -m "fix(frontend): show unread notification badge"
```

### Task 3: Expose Attendance Thresholds Without Inventing Backend State

**Files:**
- Modify: `frontend/src/pages/auth/student/dashboard/AttendanceThreshold.jsx`
- Modify: `frontend/src/pages/auth/programHead/ProgramHeadOverview.jsx`
- Modify: `frontend/src/pages/auth/programHead/programHeadData.js`
- Create: `frontend/tests/attendance-threshold.test.js`
- Test: `frontend/tests/program-head-data.test.js`

**Interfaces:**
- Consumes: student `threshold.{used,limit,status,remaining_semester_percentage}` and Program Head `{warning_count,critical_count,ir_count,total_students}`.
- Produces: `resolveThresholdPresentation(threshold)` and `programThresholdSummary(dashboard)` pure helpers.
- Does not produce: tracker status, absence totals, or notification records.

- [ ] **Step 1: Write student contradiction tests**

Test `resolveThresholdPresentation` for known `safe`, `warning`, `critical`, and `IR` values. Add the decisive case `{ status: "safe", used: 4, limit: 4 }`, which must return a `Review required`/unavailable presentation rather than `Safe`.

- [ ] **Step 2: Write Program Head summary tests**

Test `programThresholdSummary({ warning_count: 2, critical_count: 1, ir_count: 1 })` returns a total of 4 and preserves each category. Test absent fields as unavailable, not zero, unless the backend explicitly sends zero.

- [ ] **Step 3: Run tests to verify helpers are missing**

Run:

```powershell
node --test tests/attendance-threshold.test.js tests/program-head-data.test.js
```

Expected: FAIL with missing exports.

- [ ] **Step 4: Add the student contradiction guard**

Render canonical backend statuses normally. If finite `limit > 0`, finite `used >= limit`, and backend status is `safe`, render `Review required` with alert styling and text that attendance status needs refresh. Do not derive warning or critical stages from request counts.

- [ ] **Step 5: Render Program Head threshold counts**

Add a dashboard card or compact status strip using the three existing backend counts. Link it to `/program-head/flagged`. Keep `dashboard.total_students` as the Total students value and add a regression assertion that request/flag list length never supplies that metric.

- [ ] **Step 6: Run focused attendance tests**

Run:

```powershell
node --test tests/attendance-threshold.test.js tests/program-head-data.test.js tests/student-progressive-loading.test.js
```

Expected: PASS.

- [ ] **Step 7: Document the backend-only blocker in the implementation handoff**

If live data still returns `status: safe` while `used >= limit`, report the exact payload and backend owner files (`AttendanceTracker::recompute`, request-decision flow, automation). Do not edit them.

- [ ] **Step 8: Commit the frontend slice**

```powershell
git add frontend/src/pages/auth/student/dashboard/AttendanceThreshold.jsx frontend/src/pages/auth/programHead/ProgramHeadOverview.jsx frontend/src/pages/auth/programHead/programHeadData.js frontend/tests/attendance-threshold.test.js frontend/tests/program-head-data.test.js
git commit -m "fix(frontend): expose attendance threshold warnings"
```

### Task 4: Remove Approval Widgets and Clarify Dashboard Counts

**Files:**
- Modify: `frontend/src/pages/auth/admin/AdminDashboard.jsx:1-25,65-110`
- Modify: `frontend/src/pages/auth/admin/dashboard/AdminOverview.jsx`
- Modify: `frontend/src/pages/auth/admin/AdminProgramOverview.jsx`
- Modify: `frontend/src/api/adminUserManagement.js`
- Test: `frontend/tests/admin-dashboard.test.js`
- Test: `frontend/tests/figma-pages.test.js`

**Interfaces:**
- Consumes: `GET /api/admin/dashboard` fields `total_students`, `total_instructors`, `total_programs`, and `programs_summary`.
- Produces: three summary metrics with no pending-approval resource.
- Clarifies: dashboard instructor count means instructor accounts; Program Overview count means unique assigned instructors.

- [ ] **Step 1: Update dashboard tests to the requested UI**

Assert that Total Students and instructor-account values come directly from the dashboard fixture. Assert that `Pending for Approval`, `Pending Account Approvals`, waiting links, and approval placeholders are absent.

- [ ] **Step 2: Add count-semantics assertions**

Use `Instructor Accounts` on the dashboard and `Assigned Instructors` in Program Overview. Assert no frontend recomputation from pending users, request lists, or program row sums.

- [ ] **Step 3: Run tests to verify old approval UI fails the new expectations**

Run:

```powershell
node --test tests/admin-dashboard.test.js tests/figma-pages.test.js
```

Expected: FAIL on approval text and old instructor labels.

- [ ] **Step 4: Remove pending-preview loading from the dashboard**

Delete `pendingUsers` from dashboard resource defaults, endpoint maps, and view requirements. Remove `getPendingUserPreview` if no caller remains.

- [ ] **Step 5: Simplify Admin Overview**

Render only Students, Instructor Accounts, and Programs. Remove the approval panel and its imports. Let the department chart use the available width without a dead second column.

- [ ] **Step 6: Run focused admin dashboard tests**

Run:

```powershell
node --test tests/admin-dashboard.test.js tests/admin-department-chart.test.js tests/figma-pages.test.js
```

Expected: PASS for dashboard and program-overview cases.

- [ ] **Step 7: Commit the frontend slice**

```powershell
git add frontend/src/pages/auth/admin/AdminDashboard.jsx frontend/src/pages/auth/admin/dashboard/AdminOverview.jsx frontend/src/pages/auth/admin/AdminProgramOverview.jsx frontend/src/api/adminUserManagement.js frontend/tests/admin-dashboard.test.js frontend/tests/figma-pages.test.js
git commit -m "fix(frontend): remove admin approval dashboard"
```

### Task 5: Replace Approval Tabs With One Users View

**Files:**
- Modify: `frontend/src/pages/auth/admin/AdminUserManagement.jsx`
- Modify: `frontend/src/pages/auth/admin/UserManagementFilters.jsx`
- Modify: `frontend/src/pages/auth/admin/userManagementData.js`
- Modify: `frontend/src/pages/auth/admin/ManagedAccountDialog.jsx`
- Modify: `frontend/src/pages/auth/admin/AdminUserForm.jsx`
- Modify: `frontend/src/api/adminUserManagement.js`
- Test: `frontend/tests/admin-user-management.test.js`
- Test: `frontend/tests/user-management-filters.test.js`
- Test: `frontend/tests/managed-account-dialog.test.js`
- Test: `frontend/tests/add-user-dialog.test.js`

**Interfaces:**
- Consumes: complete admin user collection containing `pending`, `approved`, and `deactivated` records.
- Produces: one `Users` view with optional status filter values `""`, `pending`, `approved`, and `deactivated`.
- Produces: pending display label `Awaiting first sign-in`; no approve or decline action.

- [ ] **Step 1: Rewrite filter tests around one list**

Change `filterUsers(users, filters, programs)` so an empty status includes all records. Test each explicit status, combined role/program/year/search filters, and alphabetical pagination.

- [ ] **Step 2: Rewrite dialog tests for pending roster entries**

Assert pending entries remain viewable and show `Awaiting first sign-in`, but render no Approve Account or Decline buttons. Approved and deactivated users retain deactivate/reactivate actions.

- [ ] **Step 3: Run tests to verify approval-specific behavior still exists**

Run:

```powershell
node --test tests/admin-user-management.test.js tests/user-management-filters.test.js tests/managed-account-dialog.test.js tests/add-user-dialog.test.js
```

Expected: FAIL on waiting-tab and approval-action expectations.

- [ ] **Step 4: Remove tab state and waiting deep-link behavior**

Delete `tab` from initial filters, URL initialization, filter changes, empty-state copy, and navigation. Render a single Users heading/list. Ignore legacy `?tab=waiting` while retaining supported search/filter query behavior.

- [ ] **Step 5: Replace approval status controls with neutral roster status**

Allow status changes only for approved/deactivated accounts in `userPermissions` and `changeManagedUser`. Pending entries are read-only until backend auto-activation on first Google sign-in. Keep them visible through the status filter.

- [ ] **Step 6: Update Add User copy**

Replace `Pending account created` and approval-oriented success text with `User added` or `Roster entry added`. Do not claim password creation; Google sign-in remains the activation mechanism.

- [ ] **Step 7: Run focused user-management tests**

Run:

```powershell
node --test tests/admin-user-management.test.js tests/user-management-filters.test.js tests/managed-account-dialog.test.js tests/add-user-dialog.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit the frontend slice**

```powershell
git add frontend/src/pages/auth/admin/AdminUserManagement.jsx frontend/src/pages/auth/admin/UserManagementFilters.jsx frontend/src/pages/auth/admin/userManagementData.js frontend/src/pages/auth/admin/ManagedAccountDialog.jsx frontend/src/pages/auth/admin/AdminUserForm.jsx frontend/src/api/adminUserManagement.js frontend/tests/admin-user-management.test.js frontend/tests/user-management-filters.test.js frontend/tests/managed-account-dialog.test.js frontend/tests/add-user-dialog.test.js
git commit -m "fix(frontend): consolidate admin user management"
```

### Task 6: Remove Destructive Catalog Actions and Repair Class Management

**Files:**
- Modify with conflict awareness: `frontend/src/App.jsx:80-92`
- Modify: `frontend/src/api/admin.js:69-100`
- Modify: `frontend/src/pages/auth/admin/AdminDashboard.jsx:221-246`
- Modify: `frontend/src/pages/auth/admin/AdminProgramOverview.jsx:19-28`
- Modify: `frontend/src/pages/auth/admin/classes/ClassForm.jsx`
- Create: `frontend/src/pages/auth/admin/classes/ClassFormDialog.jsx`
- Create: `frontend/src/pages/auth/admin/classes/classFilters.js`
- Create: `frontend/tests/admin-class-management.test.js`
- Test: `frontend/tests/api-contracts.test.js`

**Interfaces:**
- Consumes: complete `getClasses()` result plus loaded programs.
- Produces: `filterAdminClasses(classes, { search, programId }) -> Class[]`.
- Produces: `ClassFormDialog({ item, programs, saving, onCancel, onSave })` for edit only.
- Preserves: inline Create Class form and the separate instructor-assignment workflow at `/manage`.

- [ ] **Step 1: Record and resolve the route overlap before editing**

`frontend/src/App.jsx` currently has an uncommitted deletion of the `/classes` route. Preserve all other user changes. Reintroduce only the dedicated protected `/classes` route because the SQA requirements target class CRUD, and do not move CRUD into `AdminManage`.

- [ ] **Step 2: Write deletion-removal tests**

Assert Manage Programs and Existing Classes render no Delete action. Assert no frontend code calls `DELETE /admin/programs/:id` or `DELETE /admin/classes/:id` through `api/admin.js`.

- [ ] **Step 3: Write class filtering tests**

Test trimmed, case-insensitive matching across subject, section, instructor name/email, and program name. Test program filter composition and unchanged input ordering.

- [ ] **Step 4: Write edit-dialog tests**

Assert Edit opens a modal labeled `Edit Class`, Cancel closes it without changing list data, validation errors remain in the dialog, and successful save closes it after the existing reload path completes. Assert Create Class remains inline.

- [ ] **Step 5: Run the new test to verify current failures**

Run:

```powershell
node --test tests/admin-class-management.test.js tests/api-contracts.test.js
```

Expected: FAIL because delete controls remain, filters are missing, and editing is inline.

- [ ] **Step 6: Remove frontend delete paths**

Delete destructive buttons, `deleteProgram`/`deleteClass` imports, their click handlers, and unused frontend API exports. Do not change backend DELETE routes.

- [ ] **Step 7: Add class search and program filter controls**

Use existing `Input` and native select styling. Apply `filterAdminClasses` to the loaded class collection. Show `No classes match the current search and filters` when filters remove all rows.

- [ ] **Step 8: Add the edit-only dialog**

Wrap the existing `ClassForm` in a native modal for `classEditor.item`. Keep create state rendering the existing inline form. Reuse the `showModal`, cancel, backdrop, focus, and busy-lock pattern from existing admin dialogs.

- [ ] **Step 9: Restore discoverability without touching assignment UI**

Restore `/classes` and add a Manage classes link beside the Program Overview management actions. Do not re-add the recently removed Manage classes link inside `AdminManage` unless separately approved.

- [ ] **Step 10: Run focused class-management tests**

Run:

```powershell
node --test tests/admin-class-management.test.js tests/api-contracts.test.js tests/figma-pages.test.js
```

Expected: PASS.

- [ ] **Step 11: Commit the frontend slice**

```powershell
git add frontend/src/App.jsx frontend/src/api/admin.js frontend/src/pages/auth/admin/AdminDashboard.jsx frontend/src/pages/auth/admin/AdminProgramOverview.jsx frontend/src/pages/auth/admin/classes/ClassForm.jsx frontend/src/pages/auth/admin/classes/ClassFormDialog.jsx frontend/src/pages/auth/admin/classes/classFilters.js frontend/tests/admin-class-management.test.js frontend/tests/api-contracts.test.js frontend/tests/figma-pages.test.js
git commit -m "fix(frontend): align admin class management"
```

### Task 7: Final Frontend-Only Verification

**Files:**
- Verify only; no planned product-file creation.

**Interfaces:**
- Consumes: all completed frontend slices.
- Produces: verification evidence and a backend-unchanged statement.

- [ ] **Step 1: Run the complete targeted SQA regression set**

```powershell
node --test tests/staff-notifications.test.js tests/instructor-notification-fallback.test.js tests/admin-notification-activity.test.js tests/attendance-threshold.test.js tests/program-head-data.test.js tests/admin-dashboard.test.js tests/admin-department-chart.test.js tests/admin-user-management.test.js tests/user-management-filters.test.js tests/managed-account-dialog.test.js tests/add-user-dialog.test.js tests/admin-class-management.test.js tests/api-contracts.test.js tests/figma-pages.test.js
```

Expected: PASS.

- [ ] **Step 2: Run scoped ESLint**

```powershell
npm exec eslint -- src/context/AuthContext.jsx src/components/notifications/NotificationBell.jsx src/components/notifications/notificationFeed.js src/components/notifications/useServerNotifications.js src/pages/auth/student/dashboard/AttendanceThreshold.jsx src/pages/auth/programHead/ProgramHeadOverview.jsx src/pages/auth/programHead/programHeadData.js src/pages/auth/admin/AdminDashboard.jsx src/pages/auth/admin/dashboard/AdminOverview.jsx src/pages/auth/admin/AdminProgramOverview.jsx src/pages/auth/admin/AdminUserManagement.jsx src/pages/auth/admin/UserManagementFilters.jsx src/pages/auth/admin/userManagementData.js src/pages/auth/admin/ManagedAccountDialog.jsx src/pages/auth/admin/AdminUserForm.jsx src/pages/auth/admin/classes/ClassForm.jsx src/pages/auth/admin/classes/ClassFormDialog.jsx src/pages/auth/admin/classes/classFilters.js
```

Expected: zero errors.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```

Expected: Vite production build exits 0.

- [ ] **Step 4: Check diff integrity**

From repository root, run:

```powershell
git diff --check -- frontend
git status --short backend
```

Expected: no frontend whitespace errors. Backend status must match the pre-execution baseline exactly; this plan must add no backend changes.

- [ ] **Step 5: Report unresolved backend-owned evidence**

Report live payloads that still produce contradictory attendance status or count semantics. Do not describe those as frontend-fixed. Name the frontend guard and the backend owner that requires separate authorization.

---

## Self-Review Result

- Spec coverage: all 12 SQA rows are mapped to a task, regression-only check, or explicit backend-owned blocker.
- Type consistency: notification preview uses `unreadCount` internally and `unread_count` only at the API boundary; attendance helper inputs match current snake_case payload fields.
- Scope: every planned write is under `frontend/`; backend files appear only as read-only evidence.
- Proportion: tasks reuse current components and API fields. No new dependency, state store, polling service, or backend shim is planned.
- Conflict check: `App.jsx` and `AdminUserManagement.jsx` overlap existing uncommitted frontend work and require surgical edits that preserve unrelated changes.

