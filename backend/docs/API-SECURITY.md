# Backend API security

This change addresses code-level gaps found against the
[OWASP API Security Top 10 (2023)](https://api-security.owasp.org/editions/2023/en/0x11-t10/).
It is not a security certification or a penetration test of Render/TiDB.
The PHP engine patch remains documented separately in `../SECURITY-PHP.md`.

## Controls and scope

| Risk | Controls in this backend | Operational verification / limits |
| --- | --- | --- |
| API1 Object authorization | Ownership policies, student/instructor/program queries, negative cross-user tests, evidence ownership on creation and immutable evidence identifier during edits | Review new endpoints against the same ownership rules. |
| API2 Authentication | Browser-bound OAuth nonce, authenticated encrypted state, 10-minute state validity, locked single-use state/exchange consumption, verified Google email and stable Google subject, serialized OTP verification/resend, 15-minute idle and 8-hour absolute bearer-token expiry | Browser redirect and callback must use the same frontend proxy origin. Revocation and expiry apply to existing tokens too. |
| API3 Property authorization | Validated write fields, explicit user response fields, guardian/contact data limited to self and explicit admin responses, no Google ID/password in JSON | Confirm frontend screens do not rely on removed internal fields. |
| API4 Resource consumption | Shared-cache API limits, submission/email/export limits, legacy list cap, bounded optional pagination, PHP/Apache upload caps, image dimensions, export row/date caps, outbound timeouts | Aggregate dashboards and nested relationship queries still require load testing with realistic enrollment sizes. |
| API5 Function authorization | Role middleware and policy checks, wrong-role tests | Re-test any future role or program-head override changes. |
| API6 Sensitive flows | User-row lock for OTP attempts; request/enrollment locks for decisions; request lock for follow-up cooldown; serialized duplicate submission check | SQLite tests cover outcomes and replay rejection. Concurrent row-lock behavior must also be tested against a separate MySQL/TiDB staging database. |
| API7 SSRF | No arbitrary URL-fetch endpoint identified; evidence reads local uploaded files; fixed Google/Brevo endpoints; redirects disabled for configured outbound clients | Re-review any new import/webhook/URL-preview feature. |
| API8 Configuration | Patched PHP Docker image, TLS certificate verification, restricted CORS methods, private/no-store API responses, nosniff/no-referrer headers, generic API server errors, query strings excluded from API exception context | Run production readiness check below. Inspect proxy/access logs separately: OAuth query parameters must not be retained unnecessarily. |
| API9 Inventory | `API-INVENTORY.md`, tests for registered controller methods, removed unused DB-test controller; DELETE on a pending own request now cancels it without deleting history | Keep inventory current; retire old Render deployments/domains explicitly. |
| API10 External APIs | TLS and explicit connection/total timeouts for Google, bounded Sheets roster range and field validation, stable Google identity checks, bounded Brevo/SMTP waits | Restrict Google Sheet editing: roster data can assign staff roles. Schema validation cannot make a compromised authorized roster trustworthy. |

## Rate limits

Limits use the configured shared cache. All API calls have a 300/minute IP
ceiling and a 120/minute authenticated-user ceiling (IP for guests).
Authentication endpoints additionally share a 20/minute IP limit. OTP endpoints
share 10/minute by IP and pending-login token. OTP attempts remain limited to 5
per valid code and are carried across resends. Evidence remains 20/minute and
follow-up remains 5/minute, plus the 24-hour per-request follow-up cooldown.
Submissions are 5/minute and 50/day per user; report exports are 3/minute per user.
Rejected/invalid requests count towards these budgets. Excess requests receive
HTTP 429. Verify real client IP forwarding through Vercel and Render; users on a
shared school network also share the IP budget, which may need tuning.

## List compatibility and cancellation

The requests, instructor requests/follow-ups, program-head requests/flags,
notifications, and admin users/classes/programs list endpoints keep `data` as an
array. Without pagination parameters they return the complete list up to 500
records. Above that they return HTTP 422, never a silently truncated result.
Use `?page=1&per_page=50` to request a page; `per_page` is capped at 100. Pagination
adds `meta: {page, per_page, total, last_page}`. Large legacy screens must use
those parameters and pagination metadata before their datasets exceed the cap.

`DELETE /api/requests/{request}` now marks an owned pending request `cancelled`.
It preserves the request, attachment and audit relationships. Reviewed requests
cannot be cancelled or edited. General PATCH cannot replace the evidence ID.

## Render and TiDB deployment

1. Preserve the existing production secrets. Set `APP_ENV=production`,
   `APP_DEBUG=false`, and `CACHE_STORE=database` (or a correctly shared Redis
   store). Never use `array` or per-container `file` cache for production login
   state or rate limiting. Keep the cache and cache-lock tables available.
2. Set both frontend URL variables to the intended HTTPS frontend origin(s).
   Start Google login at that origin's `/api/auth/google/redirect`, and route
   `/api/auth/google/callback` through the same origin's backend proxy. Register
   the exact callback URL in Google. Starting at Render but returning to Vercel
   will lose the browser-bound state cookie and is intentionally rejected.
3. Keep `DB_CONNECTION=mysql` and the working TiDB credentials. Set
   `MYSQL_ATTR_SSL_CA` to the trusted CA bundle supplied/recommended for the
   TiDB cluster; on the Debian container the system bundle is normally
   `/etc/ssl/certs/ca-certificates.crt`. Certificate verification is enabled;
   do not disable it to work around an incorrect host or CA.
4. Build and deploy the backend Docker image. No new production database
   migration is required by this API security change. The existing startup
   script still runs any other pending migrations.
5. In the deployed container run `php artisan security:check`. This prints
   check labels only, does not expose credential values, and does not query the
   database. A successful configuration check does not prove connectivity or
   that every replica uses the same cache. Verify live TiDB TLS and cache sharing
   separately, and confirm every replica runs the intended commit/PHP version.
6. Browser smoke-test Google + OTP, trusted-device login, token expiry, evidence
   upload, and each role's screens. Verify HTTP 403 for unauthorized actions and
   HTTP 429 for expected throttling. Test parallel decisions/follow-ups on
   staging, not against students' production records.

The new backend rejects invalid state, replayed codes, changed Google subjects,
and expired tokens rather than falling back to a permissive login path. Users
with expired tokens must sign in again. Frontend polling counts as token
activity; this is a server-request idle limit, not a keyboard/mouse idle timer.

## Validation

Run from `backend/`:

```sh
php vendor/bin/phpunit
php vendor/bin/pint --dirty --test
php artisan route:list --path=api
```

The security tests use an isolated SQLite in-memory schema and fake mail/Google
responses. The MySQL-specific enum/blob alterations have portable test-schema
equivalents. These tests never exercise production TiDB, Google, or email APIs.
They do not replace container build checks, browser testing, or MySQL/TiDB
concurrency testing on staging.
