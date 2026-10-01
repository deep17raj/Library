# Gym app — reference notes

What I learned from `C:\Users\Deep\Documents\gym` (studied 2026-10-01), and what
the Study Library product keeps, changes, or drops. Each point says **why**.

## 1. What the gym app is

- One Node/Express process (`app.js` → `backend/server.js`) serves the JSON API under
  `/api`, the React admin build at `/admin`, the React member app at `/checkin/:slug`,
  and a vanilla-JS super-admin page at `/superadmin`.
- MySQL via `mysql2/promise`; `schema.sql` (all `CREATE TABLE IF NOT EXISTS`) runs on
  every boot, followed by a hand-written `migrationService.js` that inspects
  `information_schema` and patches columns/indexes.
- Layers: `routes/` → `controllers/` → `services/` → `models/`, organised **by file type**.
- About 29k lines, of which ~8k are dead `legacy/` code (a 3,660-line `script.js`,
  a 2,610-line `style.css`) that still ships in the repo.

## 2. Ideas worth reusing (proven in production)

| Idea | Where in gym | Why keep it |
|---|---|---|
| `tenant_id` on tenant rows + `resolveTenant` middleware; admins locked to their tenant, super-admin picks one via a header | `middleware/auth.js` | Simple, works on one MySQL DB on shared hosting. |
| Self-contained HS256 JWT + scrypt password hashing | `utils/jwt.js`, `utils/password.js` | No native dependencies to compile on cPanel; constant-time compares. |
| JWT in **httpOnly cookie**, separate cookie per audience; member tokens signed with a key **derived** from `JWT_SECRET` | `config/env.js`, `memberAuth.js` | A member token can never pass the staff check and vice versa. |
| Daily check-in code = `HMAC(secret, tenant + date)` folded to 4 digits; never stored | `utils/dailyCode.js` | Stateless, rolls over at midnight, nothing to clean up. |
| Throttle that counts **failures** per IP+tenant and clears on success | `checkinThrottle.js` | Students on the same Wi-Fi share an IP; honest fumbles must not lock everyone out. |
| `app.js` Passenger entry; `PORT` may be a **Unix socket path** | `server.js` | Required for cPanel "Setup Node.js App". |
| `REQUIRE_DB=true` → refuse to boot without MySQL | `bootstrapService.js` | Fail loudly instead of losing data. |
| Per-tenant PWA manifest **injected into the HTML shell** server-side | `frontendRoutes.js` | Android reads the manifest before JS runs; this is what makes "Add to Home screen" open the right library. Also `/.well-known/assetlinks.json` for a TWA wrapper. |
| Web Push: VAPID optional (endpoints answer 503 when missing), `endpoint_hash` unique, batches of 20, clamp title/body, prune 404/410 endpoints | `pushService.js`, `push_subscriptions` | All learned the hard way; port as-is. |
| `sharp` resize to 256px WebP on upload | `imageService.js` | Keeps disk small on shared hosting; prebuilt binaries worked on cPanel. |
| `payment_mode` NULL = "not recorded" (not cash) | `payments` | Honest data for the day ledger. |
| Admission fee as its own payment kind, never marks a period paid | `utils/billing.js` | Same need here (admission, deposit, locker). |
| Collection timing "at join" (advance) vs "fixed day" (arrears); billing cycle modes; package plans | `utils/billing.js` | The business rules are right; the implementation changes (see §3). |
| Server-computed "next due" card for the member app | `memberBillingSummary` | The client should display, not compute, money state. |
| Expenses with categories + payment mode; day ledger; CSV export; theme/branding | admin views | Owners rely on these daily. |
| Deploy guide shape (DB → subdomain → upload → `.env` → Node app → verify) | `DEPLOY-SHARED-HOSTING.md` | Owner can follow it without help. |

## 3. What to do differently, and why

### Structure and size
- **Organise by feature, not by file type.** In gym, one change (e.g. "payments")
  touches `routes/apiRoutes.js`, `controllers/memberController.js`,
  `services/memberService.js`, `models/paymentModel.js`, `utils/billing.js`,
  `admin-frontend/src/lib/billing.js`, `dialogs/FeeDialog.jsx`… scattered across 7
  folders. New code keeps a module's routes/controller/service/repository/tests in one folder.
- **No global store.** `AppProvider.jsx` (600 lines) holds every list, every dialog,
  and every action for the whole admin app. New apps use TanStack Query per feature
  (server state) + local component state (UI state).
- **Delete dead code.** `legacy/` folders and `style.css` were left behind after the
  React rewrite. Rule: when code is replaced, the old code is deleted in the same milestone.

### Duplicated logic
- Billing-period math exists **three times** (backend `utils/billing.js`, admin
  `lib/billing.js`, legacy `script.js`) with comments saying "keep these in sync".
  New: one implementation in `packages/shared`, imported by server and both apps.
- Validation is written separately in `admin-frontend/src/lib/validation.js` and in
  services. New: one shared schema per form, run on both sides.

### Data model
- **Money as `DECIMAL` rupees** → new code uses **integer paise** everywhere.
- **Dues are derived** from "which period keys have a payment". This cannot express
  partial payments, price changes mid-way, discounts or waivers, and it is
  recomputed in every request. New: explicit `invoices` + `payments` +
  `payment_allocations` (see ARCHITECTURE §5).
- **Dates use the server clock** (`new Date()` → `todayKey()`), so on a host in UTC
  or the US "today" is wrong for Indian libraries for part of the day. New: instants
  stored in UTC; library timezone in settings; shared helpers derive the local date.
- **Child tables lack `tenant_id`** (`payments`, `attendance`); isolation depends on
  joining through `members`. New: every tenant-owned table has `tenant_id`, and
  child→parent foreign keys are composite `(tenant_id, parent_id)` so the DB itself
  refuses a cross-tenant reference.
- `members.gym_id` is the member's card code, **not** the tenant — a naming trap
  documented in a comment. New: `member_code` vs `tenant_id`, no ambiguity.
- `attendance` and `checkins` store the same fact twice, kept consistent by code plus
  an `attendance_revision` counter. New: one `attendance` table.
- `created_at VARCHAR(32)` on members. New: `DATETIME` (UTC) everywhere.
- Payments are deleted outright. New: payments are **voided** with a reason (audit trail).

### Platform behaviour
- **JSON fallback store** (`fallbackModel.js`, `memoryStore.js`) duplicates every
  repository so the app can run without MySQL. It doubles the code for one dev
  convenience. New: MySQL is required (local MySQL/MariaDB for dev).
- **Ad-hoc migrations** via `information_schema` checks, "best effort", errors
  swallowed. New: numbered SQL migration files + `schema_migrations` table, run once
  each on boot, failing loudly. (Still "auto-run on boot", just ordered and tracked.)
- **Trainers live only in `localStorage`.** New rule: all business data lives on the server.
- **Super admin** credentials only in `.env`, separate vanilla page. New: super admins
  are rows in `users` (seeded from `.env` on first boot) and use a "Platform" area of
  the admin app — one less app to maintain.
- **Member login = member code + phone number.** A phone number is not a secret.
  New: phone + password (initial password issued by the library, forced change on first login).
- **Errors are `{ error: "text" }`.** New: `{ error: { code, message, fields } }` so
  forms can highlight fields and the UI can branch on `code`.
- **Images posted as base64 JSON** with a 20 MB JSON body limit. New: `multipart/form-data`
  with per-type size/MIME checks; ID proofs stored **privately** (not under public `/uploads`).
- **Session revocation:** disabling a user does not kill an existing 12h token.
  New: `token_version` in the JWT, checked per request.
- **No tests, no lint, no build check** in CI. New: `node:test` for business rules,
  ESLint + Prettier, `npm run verify` before every milestone commit.
- **Background work** only happens when someone triggers it. New: a tiny in-process
  scheduler plus a protected endpoint a cPanel cron can call (Passenger may sleep the process).

## 4. Things to port almost verbatim

`utils/jwt.js`, `utils/password.js` (`hashPassword`, `verifyPassword`, `safeEqual`),
`utils/dailyCode.js`, the failure-counting throttle, `pushService.js` batching and
pruning, the manifest-injection + `assetlinks.json` handling, `useInstallPrompt.js`,
`usePushNotifications.js`, `useQrScanner.js`, and the image resize step. Each will be
re-homed into the new module layout and given tests where it has rules.
