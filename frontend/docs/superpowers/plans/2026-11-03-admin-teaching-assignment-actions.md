# Admin Teaching Assignment Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose every versioned backend teaching-assignment action in the administrator frontend without coupling dialog options to the current table page.

**Architecture:** Keep the table's 25-row server pagination. Load the complete class candidate set on demand through the existing collection helper, derive action-specific options with pure helpers, and merge mutation-returned classes into table/candidate state. Retain a separate destructive removal dialog.

**Tech Stack:** React 19, Vite, JavaScript, Node test runner, existing API/resource-cache utilities.

**Spec:** `frontend/docs/superpowers/specs/2026-11-03-admin-teaching-assignment-actions-design.md`

## Global Constraints

- Modify only files under `frontend/`.
- Do not add dependencies.
- Preserve the existing reason and review-confirm flow.
- Treat backend validation and revision checks as authoritative.

## Review Focus

- An unassigned class on a later page must be selectable from the global Assign dialog.
- Change Subject must offer only unassigned same-term destinations.
- Swap must offer only assigned same-term classes with a different instructor.
- Change Instructor must reject the currently assigned instructor in the UI and send the current revision.
- A stale `409` must close review mode, refresh candidates, and require a new review.

---

### Task 1: Assignment API and pure contract helpers

**Files:**
- Modify: `frontend/src/api/adminAssignments.js`
- Modify: `frontend/src/pages/auth/admin/manage/assignments.js`
- Test: `frontend/tests/admin-manage.test.js`
- Test: `frontend/tests/teaching-assignment-contract.test.js`

**Interfaces:**
- Produces: `getAdminAssignmentCandidates({ signal }) -> Promise<Class[]>`
- Produces: `assignmentCandidates(classes, source, action) -> Class[]`
- Produces: `buildAssignmentPayload(action, source, selection, reason) -> object`
- Produces: `mergeAssignmentClasses(classes, changed) -> Class[]`

- [ ] Add failing tests for paginated candidate loading, each action payload, same-term candidate rules, and response merging.
- [ ] Run the two focused test files and confirm the new cases fail.
- [ ] Implement the API loader and pure helpers by reusing `getCollection()` and the existing active-assignment helpers.
- [ ] Run the focused tests and confirm Task 1 passes.

### Task 2: Full-action assignment dialog

**Files:**
- Modify: `frontend/src/pages/auth/admin/manage/AssignmentDialog.jsx`
- Test: `frontend/tests/admin-manage.test.js`
- Test: `frontend/tests/teaching-assignment-contract.test.js`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `AssignmentDialog({ row, data, onClose, onSaved, onConflict })` supporting assign/change-instructor/change-subject/swap.

- [ ] Add failing rendering and payload tests for the action selector and action-specific controls.
- [ ] Run focused tests and confirm failure.
- [ ] Implement action selection, candidate controls, previews, payload submission, and backend-error display while preserving review-confirm.
- [ ] Run focused tests and confirm Task 2 passes.

### Task 3: On-demand candidates and authoritative response merging

**Files:**
- Modify: `frontend/src/pages/auth/admin/AdminManage.jsx`
- Modify: `frontend/src/pages/auth/admin/manage/RemoveAssignmentDialog.jsx`
- Test: `frontend/tests/admin-manage.test.js`
- Test: `frontend/tests/remove-assignment-dialog.test.js`

**Interfaces:**
- Consumes: `getAdminAssignmentCandidates` and `mergeAssignmentClasses`.
- Produces: dialog loading/error/empty states and mutation-response cache updates.

- [ ] Add failing tests for later-page availability, no-instructor disabling, response merging, removal response handling, and stale-conflict refresh behavior.
- [ ] Run focused tests and confirm failure.
- [ ] Replace current-page availability logic with on-demand candidate state and merge returned classes into visible/candidate resources.
- [ ] Remove the redundant per-class follow-up GET path.
- [ ] Run all assignment-focused tests and confirm Task 3 passes.

### Task 4: Frontend verification

**Files:**
- Verify only files under `frontend/`.

- [ ] Run assignment-focused Node tests.
- [ ] Run ESLint only on changed frontend source/test files.
- [ ] Run `npm run build` from `frontend/`.
- [ ] Inspect `git diff -- frontend` and confirm no backend or unrelated frontend changes were introduced.

