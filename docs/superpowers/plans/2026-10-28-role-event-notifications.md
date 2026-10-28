# Frontend Role-Event Notifications Implementation Plan

**Goal:** Route role-event notification records to the correct existing frontend experience without changing the backend.

**Spec:** `docs/superpowers/specs/2026-10-28-role-event-notifications-design.md`

## Constraints

- Modify only `frontend/` plus these design/plan records.
- Preserve existing uncommitted work.
- Use the existing notification feed and JavaScript.
- Add no dependency or new abstraction.

## Task 1: Role filtering and destinations

**Files:**
- Modify: `frontend/tests/staff-notifications.test.js`
- Modify: `frontend/src/components/notifications/notificationData.js`

1. Add failing tests for role visibility and existing-route destinations.
2. Run `node --test tests/staff-notifications.test.js` and verify the new cases fail.
3. Extend the existing recipient map and destination function only.
4. Run `node --test tests/staff-notifications.test.js tests/student-notifications.test.js` and verify all tests pass.

## Task 2: Verification

1. Run targeted ESLint on the changed source and test.
2. Run the complete frontend test suite.
3. Run the production build.
4. Confirm the final diff contains no backend edits introduced by this work.
