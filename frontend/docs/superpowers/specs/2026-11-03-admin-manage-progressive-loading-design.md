# Admin Manage Progressive Loading Design

## Intent

Make the Manage table usable sooner while preserving every existing teaching-assignment action and backend API contract.

## Constraints

- Change only files under `frontend/`; the backend remains read-only.
- Keep create, change-instructor, change-subject, swap, and remove behavior unchanged.
- Do not add dependencies or fabricate fallback records.
- Treat 0.9 seconds as the table-ready target, then verify it in the browser; it is not guaranteed when the classes endpoint alone exceeds the budget.

## Approaches

- **Selected: progressive loading.** Fetch the paginated class table independently, then load programs and approved instructors without blocking the table. Fetch all class candidates only when an assignment dialog opens.
- **Rejected: cache-only.** It helps repeat visits but leaves the first visit blocked by all three collections.
- **Deferred: slim backend endpoint.** It could reduce actual query time but is outside the frontend-only scope.

## Design

`adminAssignments.js` will expose focused class, program, and instructor loaders while retaining `getAdminAssignments()` as a compatibility wrapper. `AdminManage.jsx` will maintain separate class and lookup states. A successful class response renders the table immediately; program and instructor failures remain local, retryable lookup errors and do not erase the class page.

Programs and instructors use the existing resource cache to deduplicate requests. Assignment candidates remain dialog-triggered. Assignment saves continue merging returned classes into the visible page and candidate cache, while refreshes reload the visible class page without needlessly invalidating stable lookups.

The Assign controls remain disabled until approved instructors are available. Program labels fall back to the program embedded in each class. No assignment request payload or endpoint changes.

## Verification

- Focused tests prove the class page can resolve before lookups, lookup failures do not hide loaded classes, assignment controls wait for instructors, and existing actions still use the same contracts.
- Run the focused Admin Manage tests, scoped ESLint, and production build.
- Repeat three authenticated browser measurements using the same table-ready definition and compare median/average against the existing 2.04-second baseline and 0.9-second target.
