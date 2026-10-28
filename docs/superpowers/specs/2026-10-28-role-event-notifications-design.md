# Frontend Role-Event Notifications Design

## Intent

Make the shared notification inbox display only events appropriate to the signed-in role and link each event to the existing page that handles that interaction.

## Scope

Only `frontend/` may be changed. The backend is read-only and remains the source of notification records. This frontend recognizes current and planned event types but does not create missing backend events, send email, or remove backend duplicates.

## Role-event mapping

| Event | Visible role | Destination |
| --- | --- | --- |
| Request decision/update | Student | Specific student record |
| New request or student follow-up | Instructor | Specific instructor request |
| Follow-up escalation | Program head | Program requests |
| Warning or IR threshold | Instructor and program head | Role-specific request page |
| Pending staff approval | Administrator | User management |
| Class assignment | Instructor | Class records |
| Program-head assignment | Program head or dual-role instructor | Program instructors |
| Account role/status change | Affected role | Settings |

Unknown generic notices remain visible to their server-selected recipient. User-ID scoping and preview-role isolation remain unchanged.

## Approach

Extend the existing `notificationData.js` recipient and destination maps. Do not add a component, state store, dependency, or alternate notification pipeline.

## Acceptance criteria

- Known role-specific events do not appear for unrelated roles.
- Each known event opens an existing relevant route.
- Request IDs remain URL-encoded.
- Existing student, staff, read-state, and preference behavior remains green.
- No backend file is changed.
