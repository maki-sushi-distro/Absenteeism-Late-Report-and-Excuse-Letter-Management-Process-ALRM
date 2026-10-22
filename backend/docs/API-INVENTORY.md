# API route inventory

Generated from `php artisan route:list --path=api --json`. Update this file when routes or middleware change.

The backend is deployed on Render and the browser frontend proxies API requests from Vercel. Keep the actual deployed origins and retired deployments in the hosting inventory.

The `api` rate limiter applies to every route below through the API middleware group. The last column lists additional endpoint limits.

| Method | Path | Authentication / role | Additional rate limits |
| --- | --- | --- | --- |
| GET / HEAD | `/api/admin/classes` | Sanctum + active account + administrator |  |
| POST | `/api/admin/classes` | Sanctum + active account + administrator |  |
| GET / HEAD | `/api/admin/classes/{class}` | Sanctum + active account + administrator |  |
| PUT / PATCH | `/api/admin/classes/{class}` | Sanctum + active account + administrator |  |
| DELETE | `/api/admin/classes/{class}` | Sanctum + active account + administrator |  |
| GET / HEAD | `/api/admin/dashboard` | Sanctum + active account + administrator |  |
| GET / HEAD | `/api/admin/programs` | Sanctum + active account + administrator |  |
| POST | `/api/admin/programs` | Sanctum + active account + administrator |  |
| GET / HEAD | `/api/admin/programs/{program}` | Sanctum + active account + administrator |  |
| PUT / PATCH | `/api/admin/programs/{program}` | Sanctum + active account + administrator |  |
| DELETE | `/api/admin/programs/{program}` | Sanctum + active account + administrator |  |
| GET / HEAD | `/api/admin/reports/export` | Sanctum + active account + administrator | exports |
| GET / HEAD | `/api/admin/reports/preview` | Sanctum + active account + administrator |  |
| GET / HEAD | `/api/admin/users` | Sanctum + active account + administrator |  |
| POST | `/api/admin/users` | Sanctum + active account + administrator |  |
| DELETE | `/api/admin/users/{user}` | Sanctum + active account + administrator |  |
| PATCH | `/api/admin/users/{user}/role` | Sanctum + active account + administrator |  |
| PATCH | `/api/admin/users/{user}/status` | Sanctum + active account + administrator |  |
| GET / HEAD | `/api/attendance/summary` | Sanctum + active account + student |  |
| POST | `/api/auth/exchange` | Public login flow | login |
| GET / HEAD | `/api/auth/google/callback` | Public login flow | login |
| GET / HEAD | `/api/auth/google/redirect` | Public login flow | login |
| POST | `/api/auth/otp/check-trusted` | Public login flow | login, otp |
| POST | `/api/auth/otp/resend` | Public login flow | login, otp |
| POST | `/api/auth/otp/verify` | Public login flow | login, otp |
| GET / HEAD | `/api/classes` | Sanctum + active account + student |  |
| POST | `/api/complete-profile` | Sanctum + active account |  |
| GET / HEAD | `/api/complete-profile/programs` | Sanctum + active account |  |
| GET / HEAD | `/api/dashboard` | Sanctum + active account + student |  |
| GET / HEAD | `/api/instructor/dashboard` | Sanctum + active account + instructor |  |
| GET / HEAD | `/api/instructor/followups` | Sanctum + active account + instructor |  |
| PATCH | `/api/instructor/followups/{followupFlag}/resolve` | Sanctum + active account + instructor |  |
| GET / HEAD | `/api/instructor/requests` | Sanctum + active account + instructor |  |
| PATCH | `/api/instructor/requests/{request}/decision` | Sanctum + active account + instructor |  |
| POST | `/api/logout` | Sanctum + active account |  |
| GET / HEAD | `/api/me` | Sanctum + active account |  |
| GET / HEAD | `/api/notifications` | Sanctum + active account |  |
| PATCH | `/api/notifications/read-all` | Sanctum + active account |  |
| GET / HEAD | `/api/notifications/unread-count` | Sanctum + active account |  |
| PATCH | `/api/notifications/{notification}/read` | Sanctum + active account |  |
| GET / HEAD | `/api/program-head/dashboard` | Sanctum + active account + program_head |  |
| GET / HEAD | `/api/program-head/requests` | Sanctum + active account + program_head |  |
| GET / HEAD | `/api/program-head/students/flagged` | Sanctum + active account + program_head |  |
| POST | `/api/requests` | Sanctum + active account + student | submissions |
| GET / HEAD | `/api/requests` | Sanctum + active account + student |  |
| POST | `/api/requests/evidence` | Sanctum + active account + student | 20,1 |
| GET / HEAD | `/api/requests/{request}` | Sanctum + active account + student |  |
| PATCH | `/api/requests/{request}` | Sanctum + active account + student |  |
| DELETE | `/api/requests/{request}` | Sanctum + active account + student |  |
| GET / HEAD | `/api/requests/{request}/evidence` | Sanctum + active account |  |
| POST | `/api/requests/{request}/follow-up` | Sanctum + active account + student | 5,1 |

Program-head access also includes the server-side headed-program relationship defined in RoleMiddleware. Per-object policies further scope requests, evidence, notifications, decisions, and follow-ups.

Public utility routes outside `/api`: `GET /` (welcome page) and `GET /up` (framework health check). No database-test API is registered.
