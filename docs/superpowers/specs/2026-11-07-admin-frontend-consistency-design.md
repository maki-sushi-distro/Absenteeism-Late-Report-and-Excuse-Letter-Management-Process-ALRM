# Admin Frontend Consistency Design

## Intent

Fix Manage search request churn and stale responses, synchronize notification read/freshness state, remove manual curriculum/contact-hour choices, and preserve the already-correct department chart behavior.

## Constraints

- Frontend production files only. Backend source remains read-only.
- Server-filtered class pages remain authoritative; local Boyer-Moore matching is only immediate feedback.
- Reference data must not reload for each class query.
- Curriculum auto-selection must never guess. One curriculum is unambiguous; an existing subject may identify its curriculum; multiple unmatched curricula produce an explicit unavailable state.
- Class schedules are required in this form. Backend remains authoritative for saved totals.
- Preserve unrelated worktree files. Perform no Git mutation.

## Approach

1. Split Manage reference and class-page loading. Debounce only class searches, cancel superseded work, guard state with query sequence, and reuse a compiled Boyer-Moore matcher over memoized record text.
2. Give notification resources stable cache keys. Apply confirmed reads to preview, full-feed, and unread-count caches; revalidate on open, focus, visibility, and interval; preserve cached rows during refresh failures.
3. Remove the curriculum selector. Resolve only unambiguous curricula, preserve an existing assigned subject, and expose loading, unavailable, and error states.
4. Require structured meetings, compute read-only totals, validate rows and overlaps locally, and rethrow parent save failures so field errors reach the form.
5. Keep department chart code unchanged and rerun its focused proof.

## Non-goals

- No backend algorithm, schema, route, deployment, or live-data mutation.
- No guessed active curriculum when backend returns multiple candidates.
- No change from occurrence-date reporting to submission-date reporting.

