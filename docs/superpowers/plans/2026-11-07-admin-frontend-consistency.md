# Admin Frontend Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Manage search, notification state, curriculum selection, and class schedules consistent without backend changes.

**Architecture:** Keep server pagination authoritative and layer immediate local search over the last loaded page. Use stable resource-cache keys for shared notification state. Keep curriculum and schedule decisions in small pure helpers with component integration.

**Tech Stack:** React 19, JavaScript modules, Node test runner, Vite SSR test harness.

**Spec:** `docs/superpowers/specs/2026-11-07-admin-frontend-consistency-design.md`

## Global Constraints

- Frontend production files only; backend source is read-only.
- No Git mutation.
- No new dependency.
- Preserve unrelated files.
- Tests fail first, then minimal production code makes them pass.

## Review Focus

- Rapid normalized search must issue one settled class query and ignore stale results.
- Grouped and partially failed notification reads must not leave false dots or counts.
- Cached notification rows must remain visible during background refresh failures.
- Multiple curricula without an existing-subject match must never auto-select the first result.
- Empty, incomplete, overlapping, or overlong-room schedules must fail beside the relevant row.

---

### Task 1: Manage search

**Files:**
- Create: `frontend/src/lib/boyerMoore.js`
- Modify: `frontend/src/api/adminAssignments.js`
- Modify: `frontend/src/pages/auth/admin/AdminManage.jsx`
- Test: `frontend/tests/admin-manage-search.test.js`
- Test: `frontend/tests/admin-manage.test.js`

**Interfaces:**
- Produces: `compileBoyerMoore(query)`, `prepareAssignmentSearchText(record)`, `getAdminAssignmentReferences()`, and `getAdminAssignmentPage()`.
- Consumes: existing admin class search query and resource cache.

- [ ] Write correctness, normalization, request-split, debounce, Enter, and stale-response tests.
- [ ] Run tests and verify expected failures.
- [ ] Add minimal Boyer-Moore utility and split API loaders.
- [ ] Integrate memoized local matching, 200 ms server debounce, Enter submission, scoped loading, cancellation, and sequence guards.
- [ ] Run focused Manage tests.

### Task 2: Notification consistency and freshness

**Files:**
- Modify: `frontend/src/api/resourceCache.js`
- Modify: `frontend/src/hooks/useApiResource.js`
- Modify: `frontend/src/components/notifications/notificationFeed.js`
- Modify: `frontend/src/components/notifications/useServerNotifications.js`
- Modify: `frontend/src/pages/auth/student/notifications/NotificationPanel.jsx`
- Test: `frontend/tests/staff-notifications.test.js`
- Test: `frontend/tests/student-notifications.test.js`

**Interfaces:**
- Produces: stable preview/feed cache keys and confirmed-read cache synchronization.
- Consumes: existing grouped `notificationIds` and notification update event.

- [ ] Write bell-close, grouped read, partial failure, cached refresh, focus, visibility, interval, and cleanup tests.
- [ ] Run tests and verify expected failures.
- [ ] Synchronize confirmed server IDs across preview, feed, and unread caches.
- [ ] Revalidate bell and full page while preserving cached content and discoverable failures.
- [ ] Run focused notification tests.

### Task 3: Curriculum and schedule form

**Files:**
- Modify: `frontend/src/api/adminCurricula.js`
- Modify: `frontend/src/lib/formInputs.js`
- Modify: `frontend/src/pages/auth/admin/classes/ClassForm.jsx`
- Modify: `frontend/src/pages/auth/admin/AdminClassManagement.jsx`
- Test: `frontend/tests/admin-class-form.test.js`

**Interfaces:**
- Produces: unambiguous curriculum resolution, `scheduleTotals(schedule)`, row-specific validation, and rejected save propagation.
- Consumes: existing curriculum list/detail endpoints and backend field-error shape.

- [ ] Write curriculum ambiguity, existing-subject preservation, schedule totals, overlap, required row, room length, and parent error tests.
- [ ] Run tests and verify expected failures.
- [ ] Remove curriculum/manual-hour controls and resolve only an unambiguous curriculum.
- [ ] Add one meeting for new classes, read-only totals, row errors, and structured schedule payload.
- [ ] Rethrow save failures from Class Management.
- [ ] Run focused class tests.

### Task 4: Acceptance proof

**Files:**
- Create: `docs/performance/2026-11-07-admin-manage-search.md`

**Interfaces:**
- Consumes: Tasks 1-3 and existing department chart implementation.
- Produces: request-count and latency evidence plus focused regression results.

- [ ] Measure old versus new request count and local input-to-result latency using controlled fixtures.
- [ ] Run focused Manage, department, notification, and class-form tests.
- [ ] Run frontend lint and build.
- [ ] Run full frontend test suite and report unrelated failures separately.
