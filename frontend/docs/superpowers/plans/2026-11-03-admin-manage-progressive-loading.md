# Admin Manage Progressive Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the Admin Manage class table without waiting for program and instructor lookups while preserving every assignment action.

**Architecture:** Split the combined assignment loader into focused class and lookup requests. `AdminManage` owns independent class and lookup states, uses the existing resource cache for stable lookups, and keeps full assignment candidates dialog-triggered.

**Tech Stack:** React 19, Vite, existing API client/resource cache, Node test runner, ESLint

**Spec:** `frontend/docs/superpowers/specs/2026-11-03-admin-manage-progressive-loading-design.md`

## Global Constraints

- Modify only files under `frontend/`; never modify the backend.
- Preserve all current assignment endpoints, payloads, actions, and conflict handling.
- Add no dependencies and no fabricated fallback records.
- Do not create a Git commit unless separately requested.

## Review Focus

- Lookup failure after classes succeed: table remains visible and assignment controls stay safe.
- Stale response after search/page changes: only the current request updates the screen.
- No approved instructors: Assign remains disabled.
- Dialog candidate failure: existing retry remains available.
- Assignment save: visible rows update without changing pagination membership.

---

### Task 1: Focused assignment data loaders

**Files:**
- Modify: `frontend/src/api/adminAssignments.js`
- Test: `frontend/tests/admin-manage.test.js`

**Interfaces:**
- Produces: `getAdminClassesPage(options)`, `getAdminPrograms(options)`, and `getApprovedInstructors(options)`.
- Preserves: `getAdminAssignments(options)` as a compatibility wrapper.

- [ ] Add failing API tests proving the class request can resolve independently from both lookups and instructors are eligibility-filtered.
- [ ] Run `node --test tests/admin-manage.test.js` from `frontend/` and confirm the new tests fail.
- [ ] Implement the three focused loaders and rebuild the compatibility wrapper from them.
- [ ] Rerun the focused test and confirm it passes.

### Task 2: Progressive Admin Manage state

**Files:**
- Modify: `frontend/src/pages/auth/admin/AdminManage.jsx`
- Test: `frontend/tests/admin-manage.test.js`

**Interfaces:**
- Consumes: Task 1 focused loaders and existing resource-cache functions.
- Produces: independently rendered class state and cached lookup state without changing dialog props or assignment payloads.

- [ ] Add failing component/source tests for independent class loading, non-blocking lookup errors, safe button gating, and class-only refresh.
- [ ] Run the focused test and confirm the new assertions fail.
- [ ] Replace the combined request with a class-page request plus cached program/instructor requests and separate errors/loading state.
- [ ] Keep candidate loading, save merging, conflict refresh, pagination, search, and program filtering behavior unchanged.
- [ ] Rerun the focused test and confirm it passes.

### Task 3: Regression and performance verification

**Files:**
- Modify only if a verified regression requires a frontend fix.

- [ ] Run `node --test tests/admin-manage.test.js` from `frontend/` and require all tests to pass.
- [ ] Run scoped ESLint on the changed source and test files and require zero errors.
- [ ] Run `npm run build` from `frontend/` and require a successful production build.
- [ ] Measure three authenticated Manage reloads using “class table visible” as table-ready; report average, median, range, and comparison with the 2.04-second baseline and 0.9-second target.
