# Admin Teaching Assignment Actions Design

## Intent

Align the administrator assignment UI with the backend's versioned teaching-assignment contract while preserving the existing paginated table, reason capture, review step, and removal confirmation.

## Goals

- Expose `assign`, `change_instructor`, `change_subject`, `swap`, and `remove`.
- Let dialogs select eligible classes beyond the current 25-row table page.
- Send both source and target revisions where required.
- Merge the backend's returned classes into frontend state instead of issuing follow-up class reads.
- Keep the backend authoritative for concurrency, pending requests, instructor eligibility, and term validation.

## Non-goals

- No backend changes.
- No direct updates to `classes.instructor_id`.
- No assignment-history or pending-request browser in this change.
- No new dependency or generalized form framework.

## Approach

Keep the table paginated and fetch the complete class candidate collection only when an assignment dialog opens, using the existing bounded collection client. Use one assignment dialog with an explicit action selector for non-destructive actions and retain the dedicated remove confirmation. Pure helpers own action-specific candidate filtering, payload construction, and response merging; components own only loading, selection, review, and presentation state.

The global Assign button is no longer derived from the current page's unassigned rows. It is disabled only when no approved instructor exists. Empty or unavailable class candidates are represented inside the dialog. Mutation responses update the visible page and candidate cache using the returned class records and revisions.

## Constraints

- All writes are restricted to `frontend/`.
- Preserve existing uncommitted frontend changes.
- Keep the two-step Review/Confirm interaction.
- Never silently retry a stale assignment mutation.

