# Mikaelson School Club — Backend

Backend implementation for the Mikaelson School Club platform: public application/contact forms, chapter and event management, a blog/stories CMS, an admin dashboard, and all supporting infrastructure (auth, rate limiting, soft delete, audit logging, email, file uploads, monitoring).

This README is written for the next engineer picking up the project. Read it top to bottom before touching code — the architecture has deliberate layering and several non-obvious decisions that aren't visible from file names alone.

---

## Table of contents

1. [Stack](#stack)
2. [Architecture — three-layer pattern](#architecture)
3. [Folder structure](#folder-structure)
4. [Database schema](#database-schema)
5. [Setup — local development](#setup)
6. [Environment variables](#environment-variables)
7. [Authentication](#authentication)
8. [API routes](#api-routes)
9. [Rate limiting](#rate-limiting)
10. [Soft delete & restore](#soft-delete)
11. [Audit logging](#audit-logging)
12. [Email](#email)
13. [File uploads](#file-uploads)
14. [Cron jobs](#cron-jobs)
15. [Testing](#testing)
16. [CI/CD](#cicd)
17. [Deploying to Vercel](#deploying)
18. [Known gaps / next steps](#known-gaps)
19. [Frontend React Hooks](#frontend-hooks)

---

## 1. Stack <a name="stack"></a>

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | API routes + middleware in one deployable unit |
| Database | PostgreSQL (Neon) | Serverless Postgres, scales to zero, PgBouncer pooling built in |
| ORM | Prisma v5 | Type-safe queries; `$extends` used for soft-delete query interception |
| Auth | Auth.js v5 (NextAuth) | Session via HTTP-only JWT cookie; two providers (see [Authentication](#authentication)) |
| Validation | Zod | Every mutating endpoint validates with a schema in `src/lib/validators/` |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) | Sliding-window, edge-compatible, no server to manage |
| Email | Resend | Transactional email for applications, contact, password reset |
| File storage | Vercel Blob | Image uploads (blog covers, avatars, team photos) |
| Error monitoring | Sentry (`@sentry/nextjs`) | Server + Edge runtime configs, PII-scrubbed |
| Testing | Vitest | Unit tests at the service layer; repositories mocked |
| Hosting | Vercel | Edge middleware, serverless functions, cron jobs |

---

## 2. Architecture — three-layer pattern <a name="architecture"></a>

**This is the most important section to understand before changing anything.**

Routes do not contain business logic. Every mutating or non-trivial read goes through three strict layers, and dependencies only flow downward:

```
route.ts          HTTP only: parse request, call ONE service function, return Response.
                   No Prisma. No business rules. No email. No audit calls directly.

services/          Business logic. Orchestrates repository + mailer + audit log.
                   No Request/Response objects. No Prisma imports. Fully unit-testable
                   by mocking the repository layer (see src/__tests__/setup.ts).

repositories/       Data access only. Every Prisma query lives here and nowhere else.
                   No business rules, no email, no audit writes.
```

### 🛣️ Routing & Middleware Layer
Next.js Route Handlers (`src/app/api/`) act as HTTP-to-Domain adapters:
- **Responsibilities**: Parse request parameters/JSON bodies, perform syntactic validation via Zod schemas, resolve current session credentials, authorize user permissions, and construct standard JSON HTTP responses.
- **Context Injection**: Use `getRequestMeta(req)` from `src/lib/audit` to gather calling IP addresses and user agents. Session attributes (actor ID, email, role) are gathered from `getSession()` and forwarded to the service layer.
- **Role Guards**: Verify user access control using the `requireRole(allowedRoles)` helper (supporting `STUDENT`, `MENTOR`, `CHAMPION`, `ADMIN`, and `SUPERADMIN`).
- **Edge Middleware**: Runs on edge nodes to validate CORS headers, enforce `application/json` payloads on mutations, enforce authentication scopes, apply sliding-window rate limiting, and spawn non-blocking background fetch calls to `/api/internal/log-breach` when limits are breached.

### ⚙️ Services Layer (`src/services/`)
The Service Layer encapsulates all business rules, invariants, side-effects, and integrations:
- **Responsibilities**: Apply domain rules (e.g. check for duplicates, verify status boundaries), call repository helpers to query/mutate database states, write audit trail entries via `writeAuditLog`, and send email alerts (e.g., confirmations, resets).
- **Format**: Decoupled from the HTTP transport layer. Functions accept input DTOs and an actor context object containing caller metadata (ID, email, IP, agent). They return success/error result objects instead of throwing HTTP errors directly.
- **Testing**: Fully unit-testable without a database. By mocking the repository modules (as configured globally in `src/__tests__/setup.ts`), service functions can be tested quickly under Vitest.

### 🗄️ Repositories Layer (`src/repositories/`)
Repositories abstract all data access logic:
- **Responsibilities**: Query and mutate the database using the extended Prisma Client.
- **Rules**: Contain no business logic, no logging/auditing instructions, and no email notification triggers. Keeping raw Prisma queries confined to repositories ensures that schema changes or query optimizations do not leak into the business layer.
- **Methods**: Expose single-purpose query functions matching domain requirements (e.g. `getRoster(schoolId)`, `findRecentDuplicate(...)`, `softDelete(id)`).

### 🛠️ Lib Layer (`src/lib/`)
Shared utilities and database-extending adapters reside in the lib directory:
- **Extended Prisma (`src/lib/prisma.ts`)**: Initializes the Prisma Client singleton and dynamically extends it using `$extends` to automate soft-deletion logic. Intercepts `delete` / `deleteMany` calls to perform updates setting `isDeleted: true`, and automatically appends `isDeleted: false` to all queries on registered tables.
- **File Upload Storage (`src/lib/storage.ts`)**: Validates uploaded files against size (5MB limit) and type restrictions. Utilizes the `sharp` library to resize images exceeding a width of 1200px and compress/convert them into WebP format at 80% quality before uploading to Vercel Blob. Animated GIFs are safely bypassed to preserve animation frames.

---

## 3. Folder structure <a name="folder-structure"></a>

```
mikaelson-school-club/
├── middleware.ts                 Edge: CORS, auth guard, rate limiting, security headers, request ID
├── next.config.ts                Image domains, body limits, CSP headers
├── tsconfig.json                 Strict mode, @/* path alias
├── vercel.json                   Cron schedule definitions
├── package.json
├── vitest.config.ts
├── sentry.server.config.ts       Sentry init — Node.js runtime
├── sentry.edge.config.ts         Sentry init — Edge runtime (middleware)
│
├── .github/workflows/ci.yml      lint → typecheck → test, blocks merge on failure
│
├── prisma/
│   ├── schema.prisma             All models, enums, soft-delete fields, audit tables
│   ├── seed.ts                   Seeds 10 chapters, 11 team members, 3 posts, 6 events, 1 SUPERADMIN
│   └── migrations/               Auto-generated — never hand-edit
│
└── src/
    ├── lib/                      Shared infrastructure — no business logic
    │   ├── prisma.ts             Prisma client singleton + soft-delete query extension
    │   ├── auth.ts                Auth.js config (credentials + Firebase providers)
    │   ├── firebase-admin.ts      Server-side Firebase ID token verification
    │   ├── env.ts                 Zod-validated env vars — throws at boot if anything's missing
    │   ├── cors.ts                Origin allowlist + CORS header helpers
    │   ├── rate-limit.ts          Upstash Redis rate limiter instances (3 tiers)
    │   ├── audit.ts               writeAuditLog() — called from every service mutation
    │   ├── mailer.ts              All Resend email templates and sending logic
    │   ├── api-helpers.ts         ok/badRequest/notFound/... response builders + session helpers
    │   ├── restore.ts             handleRestore() — shared soft-delete restore logic
    │   ├── storage.ts             Vercel Blob upload/delete helpers
    │   ├── sentry.ts              captureError() wrapper with PII scrubbing
    │   └── validators/            One Zod schema file per domain model
    │       ├── application.ts     applySchema (role enum matches frontend dropdown exactly)
    │       ├── contact.ts
    │       ├── school.ts
    │       ├── event.ts
    │       ├── blog.ts
    │       ├── team.ts
    │       ├── user.ts            Includes password reset schemas
    │       ├── habit.ts           Habit and streak schemas
    │       ├── accountability.ts  Accountability partner/group schemas
    │       ├── lesson.ts          Lessons schemas
    │       └── project.ts         Project schemas
    │
    ├── repositories/             ONLY place Prisma queries are allowed (see Architecture)
    │   ├── application.repository.ts
    │   ├── contact.repository.ts
    │   ├── school.repository.ts
    │   ├── event.repository.ts
    │   ├── blog.repository.ts
    │   ├── team.repository.ts
    │   ├── user.repository.ts
    │   ├── metrics.repository.ts
    │   ├── audit.repository.ts
    │   ├── habit.repository.ts
    │   ├── accountability.repository.ts
    │   ├── lesson.repository.ts
    │   └── project.repository.ts
    │
    ├── services/                 Business logic — see Architecture section
    │   ├── application.service.ts
    │   ├── contact.service.ts
    │   ├── school.service.ts
    │   ├── event.service.ts
    │   ├── blog.service.ts
    │   ├── team.service.ts
    │   ├── user.service.ts
    │   ├── metrics.service.ts
    │   ├── audit.service.ts
    │   ├── habit.service.ts
    │   ├── accountability.service.ts
    │   ├── lesson.service.ts
    │   └── project.service.ts
    │
    ├── types/
    │   ├── next-auth.d.ts         Augments Session/JWT with id + role
    │   └── api.d.ts                Shared API response/pagination types
    │
    ├── __tests__/                 Vitest — services tested against mocked repositories
    │   ├── setup.ts                Global mocks: all repositories, mailer, audit, Sentry, auth
    │   ├── apply.test.ts            Full route-level integration test for /api/apply
    │   ├── application.service.test.ts
    │   ├── contact.service.test.ts
    │   ├── school.service.test.ts
    │   ├── event.service.test.ts
    │   ├── blog.service.test.ts
    │   ├── team.service.test.ts
    │   ├── user.service.test.ts
    │   ├── metrics.service.test.ts
    │   ├── audit.service.test.ts
    │   ├── validators.test.ts      Zod schema edge cases for every validator
    │   ├── soft-delete.test.ts     Prisma extension behaviour
    │   ├── rate-limit.test.ts
    │   ├── features.test.ts        Unit tests for new user/chapter/habit/accountability/event/project extensions
    │   └── integration/
    │       ├── auth.integration.test.ts
    │       ├── features.integration.test.ts  Integration tests for new user/chapter/habit/accountability/event/project extensions
    │       ├── setup.ts            Integration DB setup and seed
    │       ├── restore.integration.test.ts
    │       └── blog.service.integration.test.ts
    │
    └── app/api/
        ├── health/route.ts                    DB ping, no auth required
        ├── apply/route.ts                      POST — public, rate-limited 5/10min
        ├── contact/route.ts                    POST — public, rate-limited 5/10min
        ├── blog/route.ts                       GET — public, published only, search + category filter
        ├── blog/[slug]/route.ts                GET — public, increments view count
        ├── events/route.ts                     GET — public, { upcoming, past }, date-range filter
        ├── schools/route.ts                    GET — public, excludes INACTIVE
        ├── team/route.ts                       GET — public, sorted by sortOrder
        │
        ├── auth/[...nextauth]/route.ts          Auth.js handler
        ├── auth/firebase-signin/route.ts        Exchanges Firebase ID token for session
        ├── auth/reset-request/route.ts          Password reset — step 1 (email link)
        ├── auth/reset-confirm/route.ts          Password reset — step 2 (set new password)
        │
        └── admin/                              ALL routes below require ADMIN or SUPERADMIN role
            ├── applications/route.ts            GET (paginated, ?status filter)
            ├── applications/[id]/route.ts        PATCH (status + adminNotes), DELETE (soft)
            ├── applications/[id]/restore/route.ts
            ├── contacts/route.ts                 GET (?status ?type filter)
            ├── contacts/[id]/route.ts             PATCH (status, replyNote) — no restore, append-only
            ├── schools/route.ts                   GET, POST
            ├── schools/[id]/route.ts               PATCH, DELETE (soft)
            ├── schools/[id]/restore/route.ts
            ├── events/route.ts                    GET, POST
            ├── events/[id]/route.ts                PATCH, DELETE (soft)
            ├── events/[id]/restore/route.ts
            ├── blog/route.ts                      GET (?published filter), POST
            ├── blog/[id]/route.ts                  PATCH, DELETE (soft)
            ├── blog/[id]/restore/route.ts
            ├── team/route.ts                      GET, POST
            ├── team/[id]/route.ts                  PATCH, DELETE (soft)
            ├── team/[id]/restore/route.ts
            ├── users/route.ts                     GET, POST — SUPERADMIN only
            ├── users/[id]/route.ts                 PATCH, DELETE — SUPERADMIN only
            ├── users/[id]/restore/route.ts          SUPERADMIN only
            ├── audit/route.ts                     GET — paginated, filterable audit log
            ├── metrics/route.ts                   GET — dashboard aggregate counts
            ├── upload/route.ts                    POST — multipart image upload to Vercel Blob
            └── cron/
                ├── purge/route.ts                  Nightly hard-delete (Bearer CRON_SECRET auth)
                └── archive-audit/route.ts          Monthly audit log archival
```

---

## 4. Database schema <a name="database-schema"></a>

Full schema lives in `prisma/schema.prisma`. Models:

| Model | Purpose | Soft delete? |
|---|---|---|
| `User` | Admin, mentor, student, and champion accounts | Yes |
| `SchoolChapter` | Registered/active school club chapters | Yes |
| `Application` | Submissions from the public `/apply` form | Yes |
| `ContactMessage` | Submissions from `/contact` | No — append-only, use `status` instead |
| `Event` | Calendar events and chapter meetings | Yes |
| `BlogPost` | Stories/blog content | Yes |
| `TeamMember` | Core team shown on `/team` | Yes |
| `AuditLog` | Every admin mutation, append-only | Never — has its own archive cron |
| `AuditLogArchive` | Cold storage for audit entries >90 days | N/A |
| `PasswordResetToken` | Single-use, 1-hour-expiry tokens for credentials reset | N/A |
| `RateLimitBreach` | Optional logging table for rate-limit hits | N/A |
| `Habit` | Standard habits defined by students for tracking consistency | Yes |
| `HabitLog` | Daily logs of completed habits, daily unique constraints | No |
| `AccountabilityGroup` | Circles of students tracking habit streaks together | Yes |
| `AccountabilityMember` | Group roster association table for accountability | No |
| `MeetingAttendance` | Roster presence validation for events/meetings | No |
| `Lesson` | Skill Lab educational lessons | Yes |
| `Project` | Community action projects created by chapters | Yes |
| `ProjectMember` | Project rosters matching students/mentors to community projects | No |

**Soft delete fields**: every soft-deletable model has `isDeleted: Boolean @default(false)` and `deletedAt: DateTime?`. You never need to add `WHERE isDeleted = false` manually — see [Soft delete & restore](#soft-delete).

**Migrations**: run `npm run db:migrate:dev` locally to create a new migration after changing `schema.prisma`. Run `npm run db:migrate` (no `:dev`) in CI/production — this applies existing migrations without prompting or generating new ones.

---

## 5. Setup — local development <a name="setup"></a>

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env.local
# Fill in every variable — see Environment Variables section below

# 3. Run migrations against your local/dev database
npm run db:migrate:dev

# 4. Seed initial data (10 chapters, 11 team members, 3 posts, 6 events, 1 SUPERADMIN)
npm run db:seed

# 5. Start the dev server
npm run dev
```

The seed creates a SUPERADMIN at `admin@mikaelsoninitiative.org` with password from `SEED_ADMIN_PASSWORD` (defaults to `ChangeMe2024!` if unset — **change this immediately** in any real environment).

---

## 6. Environment variables <a name="environment-variables"></a>

All variables are validated at boot by `src/lib/env.ts` using Zod. **The app will refuse to start in production if any required variable is missing or malformed** — this is intentional, it catches misconfigured deploys immediately instead of failing on the first request.

See `.env.example` for the full annotated list. Summary by category:

| Category | Variables | Where to get them |
|---|---|---|
| Database | `DATABASE_URL`, `DIRECT_DATABASE_URL` | Neon console — pooled vs direct connection string |
| Auth | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Generate secret with `openssl rand -base64 32` |
| Firebase | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase console → Service accounts → Generate new private key |
| Rate limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash console → Redis database → REST API |
| Email | `RESEND_API_KEY` | Resend dashboard → API Keys |
| Cron auth | `CRON_SECRET` | Generate with `openssl rand -base64 32` |
| File uploads | `BLOB_READ_WRITE_TOKEN` (optional) | Vercel dashboard → Storage → Blob |
| Monitoring | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (optional) | Sentry project settings |
| CORS | `ALLOWED_ORIGINS` | Comma-separated list of your production domains |
| Seed | `SEED_ADMIN_PASSWORD` (optional, dev only) | Set your own, never use the default in production |

**Important**: `FIREBASE_PRIVATE_KEY` must have literal `\n` characters in the `.env` file, not real newlines — `firebase-admin.ts` converts them at runtime.

---

## 7. Authentication <a name="authentication"></a>

Two login methods feed into a single Auth.js session (HTTP-only, `SameSite=Strict` cookie, 8-hour expiry):

### Credentials (email + password)
Standard bcrypt-hashed password login. Configured in `src/lib/auth.ts` under the `"credentials"` provider ID.

### Firebase (Google Sign-In, etc.)
Frontend flow:
```javascript
// 1. Sign in with Firebase client SDK
const result = await signInWithPopup(auth, new GoogleAuthProvider());
const idToken = await result.user.getIdToken();

// 2. Exchange for an Auth.js session
await fetch("/api/auth/firebase-signin", {
  method: "POST",
  body: JSON.stringify({ idToken }),
});
```

**Critical detail**: Firebase users must already exist in the `User` table (created by a SUPERADMIN via `POST /api/admin/users`) before they can log in. The system does not auto-provision arbitrary Google accounts — it only *links* a Firebase UID to a pre-existing user record matched by email. This prevents anyone with a Google account from gaining admin access.

### Password reset
Two-step flow, both routes are public:
1. `POST /api/auth/reset-request` — takes an email, always returns the same generic success message (prevents email enumeration), emails a SHA-256-hashed token link valid for 1 hour.
2. `POST /api/auth/reset-confirm` — takes the raw token + new password, validates expiry/single-use, updates the bcrypt hash.

### Roles
Two roles: `ADMIN` and `SUPERADMIN`. Middleware allows either role into `/admin` and `/api/admin/*`. Certain operations require SUPERADMIN specifically — restoring soft-deleted records, and all of `/api/admin/users/*`. See `src/lib/api-helpers.ts` for `requireSuperAdmin()`.

---

## 8. API routes <a name="api-routes"></a>

Below is the complete list of API endpoints present in this project, categorized by permission level.

### 🌐 Public Endpoints (No Authentication Required)
* **`GET /api/health`** — DB ping, health check.
* **`POST /api/apply`** — Submit new application (rate-limited: 5 requests / 10 mins).
* **`POST /api/contact`** — Submit contact form (rate-limited: 5 requests / 10 mins).
* **`GET /api/blog`** — List public blog posts with `?search` and `?category` filters.
* **`GET /api/blog/[slug]`** — Fetch a single post by slug, increments view count.
* **`GET /api/events`** — Fetch events/meetings with `?upcoming=true|false`, `?from` and `?to` filters.
* **`GET /api/schools`** — List active/registered school chapters.
* **`GET /api/schools/featured`** — Retrieve the featured **Chapter of the Month**.
* **`GET /api/team`** — Fetch core team members sorted by `sortOrder`.

### 🔑 Authentication Endpoints
* **`POST /api/auth/[...nextauth]`** — NextAuth authentication endpoints handler.
* **`POST /api/auth/firebase-signin`** — Exchange a Firebase client ID token for a secure NextAuth session.
* **`POST /api/auth/reset-request`** — Request a password reset link (emailed to user).
* **`POST /api/auth/reset-confirm`** — Verify password reset token and update the password.
* **`GET /api/auth/verify`** — Verify email address using the signup token.
* **`POST /api/auth/logout`** — Terminate the active session and expire auth cookies.
* **`GET /api/auth/me`** — Retrieve the active session user's minimal profile.

### 🧑‍🎓 Student & Member Endpoints (Requires Authenticated Member Session)
* **`GET /api/members/me`** — Fetch active member's detailed profile (names, grade, chapter status).
* **`PATCH /api/members/me`** — Update active member profile.
* **`GET /api/members/me/meetings`** — Fetch upcoming and scheduled meetings/events for the student's chapter.
* **`GET /api/lessons`** — Retrieve all Skill Lab digital lessons.
* **`GET /api/schools/[id]/members`** — Get the list of active members in a given chapter roster.
* **`GET /api/schools/[id]/projects`** — Get the community action projects for a school chapter.
* **`POST /api/habits`** — Register a new daily habit.
* **`GET /api/habits/me`** — List habits and calculate active streaks for the user.
* **`POST /api/habits/[id]/log`** — Log habit completion for the day (enforces unique daily logs).
* **`GET /api/habits/[id]/history`** — Retrieve full logs history for a habit.
* **`POST /api/accountability/partner`** — Set a peer accountability partner using email lookup.
* **`GET /api/accountability/partner-progress`** — Fetch partner's logged habits and streaks.
* **`POST /api/accountability/nudge`** — Send a consistency nudge alert message to the accountability partner.
* **`POST /api/accountability/group`** — Create an accountability group circle.

### 🏫 Mentor Endpoints (Requires MENTOR Role)
* **`GET /api/mentor/pending-approvals`** — Fetch pending student self-signups within the mentor's school chapter.
* **`POST /api/mentor/approvals/[userId]/approve`** — Approve student self-signup, marking status as `ACTIVE`.
* **`POST /api/mentor/approvals/[userId]/reject`** — Reject student self-signup request (removes the user).

### 🛠️ Admin & Superadmin Endpoints (Requires ADMIN or SUPERADMIN Role)
* **`GET /api/admin/metrics`** — Fetch aggregate dashboard counts.
* **`POST /api/admin/upload`** — Upload media assets to Vercel Blob storage.
* **`GET /api/admin/applications`** — List applications with `?status` filter.
* **`PATCH /api/admin/applications/[id]`** — Update application status and administrator notes.
* **`DELETE /api/admin/applications/[id]`** — Soft-delete an application.
* **`POST /api/admin/applications/[id]/restore`** — Restore a soft-deleted application (SUPERADMIN only).
* **`GET /api/admin/contacts`** — Fetch contact messages with `?status` and `?type` filters.
* **`PATCH /api/admin/contacts/[id]`** — Update contact message status and reply notes.
* **`POST /api/admin/schools`** — Create a new school chapter.
* **`PATCH /api/admin/schools/[id]`** — Update chapter details.
* **`DELETE /api/admin/schools/[id]`** — Soft-delete a chapter.
* **`POST /api/admin/schools/[id]/restore`** — Restore a soft-deleted chapter (SUPERADMIN only).
* **`POST /api/admin/schools/[id]/feature`** — Set featured **Chapter of the Month** (SUPERADMIN only).
* **`POST /api/admin/events`** — Create a new chapter event or meeting.
* **`PATCH /api/admin/events/[id]`** — Update event details.
* **`DELETE /api/admin/events/[id]`** — Soft-delete an event.
* **`POST /api/admin/events/[id]/restore`** — Restore a soft-deleted event (SUPERADMIN only).
* **`POST /api/admin/events/[id]/attendance`** — Mark/update meeting attendance for student members.
* **`POST /api/admin/blog`** — Create a blog story.
* **`PATCH /api/admin/blog/[id]`** — Update blog story details.
* **`DELETE /api/admin/blog/[id]`** — Soft-delete a blog story.
* **`POST /api/admin/blog/[id]/restore`** — Restore a soft-deleted blog story (SUPERADMIN only).
* **`POST /api/admin/team`** — Add a new core team member.
* **`PATCH /api/admin/team/[id]`** — Update team member details.
* **`DELETE /api/admin/team/[id]`** — Soft-delete a team member.
* **`POST /api/admin/team/[id]/restore`** — Restore a soft-deleted team member (SUPERADMIN only).
* **`GET /api/admin/users`** — List users (SUPERADMIN only).
* **`POST /api/admin/users`** — Create user profiles (SUPERADMIN only).
* **`PATCH /api/admin/users/[id]`** — Update user details or role (SUPERADMIN only).
* **`DELETE /api/admin/users/[id]`** — Soft-delete a user (SUPERADMIN only).
* **`POST /api/admin/users/[id]/restore`** — Restore a soft-deleted user (SUPERADMIN only).
* **`GET /api/admin/audit`** — Fetch paginated, filterable audit logs.
* **`POST /api/admin/lessons`** — Create a new Skill Lab lesson.
* **`PATCH /api/admin/lessons/[id]`** — Update a Skill Lab lesson.
* **`DELETE /api/admin/lessons/[id]`** — Soft-delete a Skill Lab lesson.
* **`POST /api/admin/projects`** — Create a community action project.
* **`PATCH /api/admin/projects/[id]`** — Update community project details.
* **`DELETE /api/admin/projects/[id]`** — Soft-delete a community project.

### ⏱️ System & Cron Endpoints (Requires Bearer CRON_SECRET Token)
* **`GET /api/admin/cron/purge`** — Trigger nightly soft-delete records purger (older than 30 days).
* **`GET /api/admin/cron/archive-audit`** — Trigger monthly audit log entries archiver (older than 90 days).

---

### Response Conventions
* **Errors**: Every error response returns a unified JSON format: `{ "error": "human-readable message" }` with the corresponding HTTP status.
* **Pagination**: List endpoints support standardized pagination parameters (`?page=1&limit=10`) and return the metadata: `{ items, total, page, limit, hasNextPage }`.

---

## 9. Rate limiting <a name="rate-limiting"></a>

Three tiers, all using Upstash Redis sliding-window via `src/lib/rate-limit.ts`, enforced in `middleware.ts` before the request reaches any route handler:

| Tier | Limit | Applies to |
|---|---|---|
| Public write | 5 requests / 10 minutes / IP | `POST /api/apply`, `POST /api/contact` |
| Public read | 120 requests / minute / IP | `/api/blog`, `/api/events`, `/api/schools`, `/api/team` |
| Admin | 200 requests / minute / **user ID** (not IP) | All `/api/admin/*` routes |

Breaches return `429` with a `Retry-After` header (seconds) and a JSON body `{ "error": "...", "retryAfter": N }`.

---

## 10. Soft delete & restore <a name="soft-delete"></a>

Every model except `ContactMessage` (append-only) and `AuditLog` (immutable) supports soft delete via a Prisma `$extends` query extension in `src/lib/prisma.ts`. **This is automatic and invisible at the call site**:

```typescript
// This looks like a normal Prisma call...
await prisma.schoolChapter.findMany({});
// ...but the extension silently adds { isDeleted: false } to the where clause.

await prisma.schoolChapter.delete({ where: { id } });
// ...but the extension converts this into an UPDATE setting isDeleted=true, deletedAt=now().
```

You never write `isDeleted` filters by hand. If you ever need to query *including* deleted records (e.g. the restore flow needs to find a deleted record to verify it exists), use raw SQL — see `src/lib/restore.ts` for the pattern, which uses parameterised `$queryRaw`/`$executeRaw` tagged templates against a fixed allowlist of table names (never string-interpolated, to avoid SQL injection).

**Restore window**: 30 days from `deletedAt`. After that, the nightly purge cron (`src/app/api/admin/cron/purge/route.ts`) permanently deletes the row. Restoring requires SUPERADMIN role — see `POST /api/admin/{model}/[id]/restore`.

---

## 11. Audit logging <a name="audit-logging"></a>

`writeAuditLog()` in `src/lib/audit.ts` is called from every service-layer mutation (create, update, delete, restore, login, role change). It never throws — a failed audit write logs to console but does not fail the parent request.

Entries are queryable via `GET /api/admin/audit` with filters: `actorId`, `model`, `action`, `recordId`, `from`/`to` date range. Entries older than 90 days are moved to `AuditLogArchive` by the monthly cron (`src/app/api/admin/cron/archive-audit/route.ts`) to keep the hot table fast.

---

## 12. Email <a name="email"></a>

All templates live in `src/lib/mailer.ts`, sent via Resend. Six functions:

| Function | Trigger | Recipient |
|---|---|---|
| `sendApplicationConfirmation` | New application submitted | Applicant — says "3 working days" (matches frontend copy, do not change without checking the form) |
| `sendApplicationAlert` | New application submitted | `hello@mikaelsoninitiative.org` |
| `sendStatusUpdateEmail` | Admin changes application status | Applicant — only fires for REVIEWED/SCHEDULED/TRAINING/LAUNCHED/REJECTED |
| `sendContactAlert` | New contact message | Routed by type: PARTNERSHIP→partners@, MEDIA→media@, else→hello@ |
| `sendContactAutoReply` | New contact message | The person who submitted the form |

---

## 13. File uploads <a name="file-uploads"></a>

`POST /api/admin/upload` accepts `multipart/form-data` with a `file` field and a `category` field (`blog` | `avatar` | `team`). Validates type (JPEG/PNG/WebP/GIF/AVIF) and size (5MB max) before uploading to Vercel Blob via `src/lib/storage.ts`. Returns `{ url, pathname, size, contentType }` — the caller is responsible for saving the URL to the relevant model (`BlogPost.imageUrl`, `TeamMember.avatarUrl`, `User.avatarUrl`).

---

## 14. Cron jobs <a name="cron-jobs"></a>

Defined in `vercel.json`, both authenticate via `Authorization: Bearer ${CRON_SECRET}` (not session cookies, since Vercel cron doesn't carry browser cookies):

| Job | Schedule | What it does |
|---|---|---|
| `purge` | `0 2 * * *` (02:00 UTC daily) | Hard-deletes soft-deleted records older than 30 days across 6 models |
| `archive-audit` | `0 3 1 * *` (03:00 UTC, 1st of month) | Moves `AuditLog` entries older than 90 days to `AuditLogArchive` in 500-row batches |

---

## 15. Testing <a name="testing"></a>

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

**Testing philosophy**: services are tested in isolation by mocking the repository layer (see `src/__tests__/setup.ts` for the global `vi.mock()` setup of every repository, the mailer, Sentry, and audit). This means a service test never touches a real database — it asserts on what the service *did* (which repository methods it called, with what arguments) and what it *returned*.

`apply.test.ts` is the one route-level integration test, included as a reference pattern for testing a full route handler end-to-end with mocked dependencies.

`validators.test.ts` covers Zod schema edge cases for every validator — this is where to add a test first whenever you tighten or loosen a validation rule.

`soft-delete.test.ts` and `rate-limit.test.ts` test infrastructure-level behavior independent of any specific feature.

---

## 16. CI/CD <a name="cicd"></a>

`.github/workflows/ci.yml` runs on every push/PR to `main`: lint → `tsc --noEmit` → `vitest run --coverage`. All three gates must pass before merge. Env vars are stubbed inline in the workflow file — no secrets are needed for CI since everything is mocked.

---

## 17. Deploying to Vercel <a name="deploying"></a>

1. Push to GitHub, import the repo in the Vercel dashboard.
2. Add every variable from `.env.example` under Settings → Environment Variables.
3. `postinstall` in `package.json` runs `prisma generate` automatically on every deploy.
4. Run `npm run db:migrate` (not `:dev`) against production — either manually before first deploy or wire into a deploy hook.
5. Cron jobs in `vercel.json` activate automatically — no extra setup needed on Vercel Pro/Enterprise (cron requires a paid plan).
6. Confirm `NEXTAUTH_URL` and `ALLOWED_ORIGINS` match your actual production domain exactly — mismatches here are the most common post-deploy bug (broken sessions, blocked CORS).

---

## 18. Known gaps / next steps <a name="known-gaps"></a>

- **Firebase auto-provisioning is intentionally restrictive** — see [Authentication](#authentication). If product requirements change to allow self-service signup via Google, that logic needs to be added deliberately, not loosened by accident.

> [!NOTE]
> **Recently Addressed Gaps**:
> - **Rate limiting on `/api/admin/upload`**: Implemented using Upstash Redis sliding window (10 uploads per minute per user).
> - **Image resizing/optimization pipeline**: Uploads of images (excluding GIFs) are processed and optimized using `sharp` (downscaled to max 1200px width, compressed/converted to WebP at 80% quality) before uploading to Vercel Blob.
> - **`RateLimitBreach` logging**: When rate limits are hit across the app (public write, public read, admin, or admin upload), middleware background fetches a secure internal logger endpoint (`POST /api/internal/log-breach`) to write a `RateLimitBreach` record to the PostgreSQL database for future analysis.

---

## 19. Frontend React Hooks <a name="frontend-hooks"></a>

To make it easy to connect the API endpoints directly to a React frontend, we have implemented standardized custom React hooks under `src/hooks/`.

### Available Hooks
1. **`useAuth`** (`src/hooks/useAuth.ts`):
   - `useCurrentUser()`: Fetch current user profile state.
   - `useAuthActions()`: Authentication mutations (`loginWithFirebase`, `signup`, `logout`, `requestPasswordReset`, `confirmPasswordReset`, `updateProfile`).
2. **`useChapters`** (`src/hooks/useChapters.ts`):
   - `useChapters()`: Fetch active school chapters.
   - `useFeaturedChapter()`: Fetch featured Chapter of the Month.
   - `useChapterMembers(id)`: Fetch school chapter roster.
   - `useChapterMutation()`: Actions (`createChapter`, `updateChapter`, `deleteChapter`, `restoreChapter`, `featureChapter`).
3. **`useHabits`** (`src/hooks/useHabits.ts`):
   - `useHabits()`: Fetch daily habits list + streaks.
   - `useHabitHistory(id)`: Retrieve log history of a habit.
   - `useHabitMutation()`: Actions (`createHabit`, `logHabit`).
4. **`useAccountability`** (`src/hooks/useAccountability.ts`):
   - `usePartnerProgress()`: Fetch partner's daily progress and streaks.
   - `useAccountabilityMutation()`: Actions (`setPartner`, `createGroup`, `nudge`).
5. **`useLessons`** (`src/hooks/useLessons.ts`):
   - `useLessons()`: List Skill Lab digital lessons.
   - `useLessonMutation()`: Actions (`createLesson`, `updateLesson`, `deleteLesson`).
6. **`useProjects`** (`src/hooks/useProjects.ts`):
   - `useProjects(chapterId)`: Get action projects of a chapter.
   - `useProjectMutation()`: Actions (`createProject`, `updateProject`, `deleteProject`).

### Usage Example
Here is how you can use the habit logging and streaks hook in a React component:

```tsx
import { useHabits, useHabitMutation } from "@/hooks/useHabits";

export function HabitTracker() {
  const { habits, isLoading, refetch } = useHabits();
  const { logHabit, isMutating } = useHabitMutation();

  const handleLog = async (habitId: string) => {
    await logHabit(habitId);
    refetch(); // Reload list to update streak numbers
  };

  if (isLoading) return <div>Loading habits...</div>;

  return (
    <ul>
      {habits.map((habit) => (
        <li key={habit.id}>
          {habit.name} (Streak: {habit.currentStreak} days)
          <button disabled={isMutating} onClick={() => handleLog(habit.id)}>
            Complete Today
          </button>
        </li>
      ))}
    </ul>
  );
}
```