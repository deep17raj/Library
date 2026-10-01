# Study Library — Architecture

Multi-tenant SaaS for **paid self-study libraries / reading rooms**: students rent a
seat for a time slot. Sold to many library owners. Also sells **mock tests** to students.

Status: **approved 2026-10-01**. Business decisions are recorded in §13 (**[Dn]**).

Contents
1. Principles · 2. Monorepo layout · 3. Runtime & deploy shape · 4. Tenancy, auth, roles
5. Domain model · 6. MySQL schema · 7. Seat + slot conflict prevention · 8. Billing
9. Attendance & check-in · 10. Mock tests & payment gateway · 11. API routes
12. Screens · 13. Open questions · 14. Build order (milestones)

---

## 1. Principles

- **Feature folders.** Everything about "seats" lives in `server/src/modules/seats/`
  and `apps/admin/src/features/seats/`.
- **One home per rule.** Pure business rules (slot overlap, billing periods, dues,
  mock-test scoring, money/time formatting, validation schemas) live in
  `packages/shared` and are imported by the server and both apps.
- **The server decides.** Clients may preview a rule (e.g. which seats look free) but
  every rule is enforced again on the server, and the critical ones also in the DB.
- **Integer paise** for money. **UTC `DATETIME`** for instants. **`DATE` in the
  library's timezone** for business days (billing periods, attendance day) — a
  calendar day is not an instant, so it is stored as the library-local date the
  shared helpers compute from UTC + `library_settings.timezone`.
  **Minutes after local midnight** for slot clock times.
- **Never hard-delete money or history.** Payments are voided, allocations ended,
  subscriptions closed.
- **Small files.** ≤ 250 lines per file, ≤ 50 lines per function (see CLAUDE.md).

## 2. Monorepo layout

npm workspaces (`apps/*`, `packages/*`, `server`). All code is **ES modules**; the root
`app.js` is a tiny CommonJS shim that `import()`s the server (Passenger loads `app.js`
with `require`).

```
/
├─ app.js                      Passenger entry (CJS) → import('./server/src/main.js')
├─ package.json                workspaces + root scripts: dev, build, test, lint, verify
├─ eslint.config.mjs  .prettierrc  .env.example  CLAUDE.md
├─ docs/
│  ├─ ARCHITECTURE.md  UI-GUIDE.md  GYM-REFERENCE-NOTES.md  TECH-DEBT.md
│  └─ DEPLOY-SHARED-HOSTING.md            (milestone 11)
├─ packages/shared/                       "@app/shared" — no Node- or DOM-only APIs
│  └─ src/
│     ├─ constants/     roles.js permissions.js paymentModes.js seatFeatures.js errorCodes.js
│     ├─ money/         paise.js            toPaise, formatRupees, sumPaise
│     ├─ time/          zonedDate.js        localDateOf(utc, tz), nowParts(tz)
│     │                 clockMinutes.js     "06:30" ⇄ 390
│     ├─ slots/         slotCells.js        cellsForSlot, slotsOverlap, isWithinSlot
│     ├─ billing/       periods.js          nextPeriod, periodsBetween
│     │                 dues.js             summariseDues(invoices) → next due card
│     ├─ mocktests/     scoring.js          scoreAttempt(paper, answers)
│     ├─ validation/    one file per form: member.schema.js, slot.schema.js, …
│     ├─ api/           client.js           fetch wrapper, ApiError, error normalising
│     └─ ui/            React primitives: Button, Field, Dialog, Table, Money, EmptyState
│                       (pure Tailwind classes; apps add packages/shared to Tailwind content)
├─ server/
│  └─ src/
│     ├─ main.js        load env → run migrations → seed super admin → start jobs → listen
│     ├─ app.js         build the Express app (middleware order lives here only)
│     ├─ services.js    builds every service once (cross-module wiring is visible here)
│     ├─ routes.js      mounts every module router under /api
│     ├─ config/        env.js (reads + validates process.env once)
│     ├─ db/            pool.js, transaction.js (withTransaction), migrate.js
│     ├─ migrations/    001_tenancy.sql, 002_layout.sql, … (run once each, in order)
│     ├─ http/          AppError.js, errorHandler.js, asyncHandler.js, validateBody.js
│     ├─ middleware/    staffAuth.js, studentAuth.js, tenantContext.js,
│     │                 requirePermission.js, rateLimit.js, upload.js
│     ├─ lib/           jwt.js, password.js, dailyCode.js, images.js, csv.js, clock.js
│     ├─ jobs/          scheduler.js, jobs.js (job list), internal.routes.js (cron, §8.5)
│     ├─ static/        serveApps.js (admin + student builds, per-library manifest)
│     └─ modules/       one folder per feature (list below)
│        └─ seats/      seats.routes.js  seats.controller.js  seats.service.js
│                       seats.repository.js  seats.validation.js  seats.test.js  README.md
├─ apps/admin/          React + Vite + Tailwind, served at /admin
│  └─ src/
│     ├─ main.jsx  App.jsx  router.jsx
│     ├─ app/           providers (QueryClient, Session), Shell (sidebar/topbar), guards
│     └─ features/      seat-map/ layout/ slots/ members/ … (one folder per feature)
│        └─ seat-map/   SeatMapPage.jsx  components/  hooks/  api.js
└─ apps/student/        React + Vite + Tailwind PWA, served at /s/:slug
   └─ src/  main.jsx App.jsx router.jsx app/ features/ public/sw.js
```

**Server modules** (`server/src/modules/`): `auth`, `platform` (super admin: libraries,
usage, platform settings), `staff`, `settings`, `layout` (halls, tables, seats),
`slots` (slots + plans), `allocations` (seat allocation rules, swaps, releases),
`members`, `subscriptions`, `waitlist`, `invoices`, `payments` (+ receipts,
deposits), `expenses`, `ledger`, `attendance` (+ check-in), `notifications`, `push`,
`insights`, `uploads`, `public` (branding for the student app), `mocktest-content`,
`mocktest-store` (catalog, orders, entitlements), `payment-gateway` (provider
interface + Razorpay + webhook), `attempts` (attempt engine, results, leaderboard).

**Per-module file roles** (strict):
- `*.routes.js` — URL + middleware → controller function. Nothing else.
- `*.controller.js` — read `req`, call service, send response. No SQL, no rules.
- `*.service.js` — business rules, transactions, calls repositories.
- `*.repository.js` — SQL only. Every function takes `(db, tenantId, …)`; `db` is the
  pool or a transaction connection.
- `*.validation.js` — re-exports/adapts the shared schema for the route.
- `*.test.js` — tests for the service rules (`node:test`).
- `README.md` — what the module does, its rules, its tables, in plain words.

**Service pattern.** Service logic is small module-level functions that take their
dependencies first — `createLibrary(deps, actor, input)` — and `create<Name>Service(deps)`
binds them with `lib/bindDeps.js`. Unit tests pass in-memory fake repositories as `deps`
(`server/testing/fakes.js`); integration tests in `server/testing/` run the real HTTP
stack against MySQL when `TEST_DATABASE_URL` is set. A table is owned by one module's
repository (e.g. `users` → `auth/users.repository.js`); other modules call its functions
rather than writing SQL for it.

**Libraries chosen** (all pure JS — nothing to compile on cPanel except `sharp`,
which ships prebuilt and already runs on the gym host): `express`, `mysql2`, `zod`
(shared validation), `multer` (uploads), `sharp`, `web-push`, `qrcode`, `dotenv`.
Frontends: `react`, `react-router-dom`, `@tanstack/react-query`, `tailwindcss`,
`react-hook-form` + zod resolver, SheetJS (admin only, to parse CSV/XLSX in the
browser). Razorpay is called with Node's built-in `fetch` (no SDK). Tests: `node:test`.

## 3. Runtime & deploy shape

- One Node process (cPanel Passenger) serves: `/api/*`, `/admin/*` (admin build),
  `/s/:slug/*` (student build, manifest injected per library), `/files/*` (public
  images), `/sw.js`, `/.well-known/assetlinks.json`.
- MySQL 5.7+ / MariaDB 10.4+ (what cPanel hosts ship). We do **not** rely on `CHECK`
  constraints (ignored on MySQL 5.7); uniqueness, FKs and generated columns are used instead.
- Pool session `time_zone = '+00:00'` so `CURRENT_TIMESTAMP` is UTC.
- `REQUIRE_DB` is implicit: no DB → process exits with a clear log line.
- Files: `server/storage/public/` (logos, member photos, test images) and
  `server/storage/private/` (ID proofs — served only through an authenticated route).
- Rate limiting is in-memory (single process on shared hosting — documented in TECH-DEBT
  for when we scale out).

## 4. Tenancy, auth, roles

**Tenant = library** (`libraries` table). Every tenant-owned row has `tenant_id`.
Parent tables also have `UNIQUE (tenant_id, id)` so children reference them with a
**composite FK** `(tenant_id, parent_id)` — the database rejects a row that points at
another library's seat/member/slot even if a service has a bug.

| Actor | Login | Cookie | Scope |
|---|---|---|---|
| `super_admin` | email + password (`users`, seeded from `.env` on first boot) | `sl_staff` | Platform area; may act inside a library by sending `X-Library-Id` (audited) |
| `admin` (owner) | email + password | `sl_staff` | Everything in own library |
| `staff` | email + password | `sl_staff` | Own library, limited by `permissions` |
| student (member) | library slug + phone + password | `sl_student` (key derived from `JWT_SECRET`) | Own data in own library |

- JWT payload: `{ sub, role, tenantId, tv }` (`tv` = `token_version`). Each request
  re-reads the user's `status` + `token_version` and the library's `status` (cached
  60 s in memory) — disabling a user or suspending a library ends sessions at once.
- `tenantContext` middleware builds `req.ctx = { tenantId, actor, permissions }`.
  Services take `ctx.tenantId`; nothing reads the tenant from the body.
- **Staff permissions** (fixed keys in `shared/constants/permissions.js`):
  `members.manage`, `seats.allocate`, `payments.collect`, `payments.void`,
  `expenses.manage`, `attendance.manage`, `layout.manage`, `slots.manage`,
  `notifications.send`, `insights.view`, `mocktests.view`, `settings.manage`,
  `staff.manage`. `admin` implicitly has all. Default staff set: members, seats,
  payments.collect, attendance.
- CSRF: cookies are `HttpOnly; SameSite=Lax; Secure` (prod) and every mutating
  request must be `application/json` or `multipart` with header `X-Requested-With: app`
  (set by the shared API client).
- Rate limits: staff login, student login, kiosk/phone check-in, order creation,
  webhook (generous), notification sends.

## 5. Domain model

```
Library ─┬─ Settings, Staff(users)
         ├─ Hall ── HallTable ── Seat (label "A-12", features: ac/window/locker/accessible)
         ├─ Slot (Morning 06:00–12:00) ── Plan (Monthly ₹800, Quarterly ₹2,200)
         ├─ Member (student) ─┬─ Subscription (slot + plan + start/end + price snapshot)
         │                    │      └─ SeatAllocation (seat for that slot, from → to)
         │                    │             └─ SeatAllocationCell (DB conflict guard)
         │                    ├─ Invoice (seat fee period / admission / deposit / locker)
         │                    ├─ Payment ── PaymentAllocation → Invoice
         │                    ├─ Attendance (per subscription per day)
         │                    └─ Entitlement, MockOrder, TestAttempt
         ├─ WaitlistEntry (slot, waiting → converted)
         ├─ Expense, Notification, PushSubscription, AuditLog
Platform ─ TestSeries ── Test ── Section ── Question ── Option   (owner_tenant_id NULL = global)
```

- A **member** may hold several **subscriptions** (e.g. Morning on A-12 and Night on B-3).
  Each subscription has exactly one **active seat allocation**; a seat change ends
  the allocation and opens a new one, so seat history is kept.
- **Plans are the only source of price.** Creating a slot with a "monthly fee"
  creates its default *Monthly* plan; packages (3/6 months) are extra plans.
  Subscriptions snapshot price and period so later plan edits don't rewrite history.
- Only members created by the library can log in to the student app; there is no
  public sign-up **[D2]**.
- **Seating mode is per hall [D8]:** a `fixed` hall gives each subscription its own
  seat (allocation + conflict guard, §7); a `floating` hall sells "sit anywhere" places,
  limited by the hall's capacity (active seats) per slot (§7.1). One library can have
  both kinds of halls.
- **Seat categories [D6]:** a library defines categories (e.g. Standard, AC, Premium)
  with a monthly surcharge. A seat has a category; a floating hall has one category for
  all its places. Subscription price = plan price + category surcharge for the period.

## 6. MySQL schema

Conventions: `id CHAR(36)` UUID made in the app; `*_paise INT` (signed only where a
value can be negative); `*_at DATETIME` UTC; `*_on`/`*_date DATE` library-local;
`*_min SMALLINT` minutes after local midnight. Engine InnoDB, `utf8mb4`. All FKs to a
tenant parent are composite. Migrations live in `server/src/migrations/`; this is the
target schema after all milestones.

```sql
-- ── Platform & tenancy ───────────────────────────────────────────────
CREATE TABLE schema_migrations (
  name VARCHAR(120) PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE libraries (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  -- Library's cut of global mock-test sales, basis points. NULL = platform default.
  mocktest_share_bps SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  suspended_at DATETIME NULL,
  UNIQUE KEY uq_libraries_slug (slug)
);

CREATE TABLE platform_settings (
  setting_key VARCHAR(60) PRIMARY KEY,           -- e.g. 'mocktest_default_share_bps'
  setting_value JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NULL,                       -- NULL only for super_admin
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(160) NOT NULL,
  role ENUM('super_admin','admin','staff') NOT NULL,
  permissions JSON NULL,                         -- staff only; keys from shared constants
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_tenant (tenant_id),
  CONSTRAINT fk_users_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE library_settings (
  tenant_id CHAR(36) PRIMARY KEY,
  display_name VARCHAR(160) NOT NULL,
  logo_path VARCHAR(255) NOT NULL DEFAULT '',
  address VARCHAR(400) NOT NULL DEFAULT '',
  contact_phone VARCHAR(20) NOT NULL DEFAULT '',
  timezone VARCHAR(40) NOT NULL DEFAULT 'Asia/Kolkata',
  billing_anchor ENUM('join_date','month_start') NOT NULL DEFAULT 'join_date',
  -- month_start only: what a member joining mid-month pays for that first month [D5].
  first_period_billing ENUM('full','prorated') NOT NULL DEFAULT 'full',
  default_collection ENUM('advance','arrears') NOT NULL DEFAULT 'advance',
  grace_days SMALLINT UNSIGNED NOT NULL DEFAULT 7,
  auto_release_unpaid TINYINT(1) NOT NULL DEFAULT 0,
  slot_check_mode ENUM('off','warn','block') NOT NULL DEFAULT 'warn',
  slot_early_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15,   -- may enter this early
  allow_overdue_checkin TINYINT(1) NOT NULL DEFAULT 1,
  fee_reminder_days_before SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  weekly_holidays JSON NULL,
  holiday_dates JSON NULL,
  theme JSON NULL,
  receipt_prefix VARCHAR(10) NOT NULL DEFAULT 'R',
  member_code_prefix VARCHAR(10) NOT NULL DEFAULT 'S',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

-- Per-library sequences (receipt numbers, member codes). Incremented with
-- SELECT … FOR UPDATE inside the same transaction that uses the number.
CREATE TABLE counters (
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(40) NOT NULL,
  next_value INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, name),
  CONSTRAINT fk_counters_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id CHAR(36) NULL,
  actor_type ENUM('user','member','system') NOT NULL,
  actor_id CHAR(36) NULL,
  action VARCHAR(60) NOT NULL,                   -- 'payment.void', 'seat.swap', …
  entity VARCHAR(40) NOT NULL,
  entity_id CHAR(36) NULL,
  data JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_audit_tenant_time (tenant_id, created_at),
  KEY ix_audit_entity (entity, entity_id)
);

CREATE TABLE job_runs (
  name VARCHAR(60) PRIMARY KEY,
  last_started_at DATETIME NULL,
  last_finished_at DATETIME NULL,
  last_status ENUM('ok','error') NULL,
  last_error VARCHAR(500) NULL
);

-- ── Layout ───────────────────────────────────────────────────────────
-- Price tiers for seats [D6]. surcharge is per MONTH; day plans pay it pro rata (/30).
CREATE TABLE seat_categories (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,                     -- 'Standard', 'AC', 'Premium cabin'
  monthly_surcharge_paise INT UNSIGNED NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_categories_tenant_id (tenant_id, id),
  UNIQUE KEY uq_categories_name (tenant_id, name),
  CONSTRAINT fk_categories_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE halls (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  -- fixed: every subscription gets its own seat. floating: "sit anywhere",
  -- capacity = active seats in the hall, checked per slot [D8].
  seating_mode ENUM('fixed','floating') NOT NULL DEFAULT 'fixed',
  -- Category for all places in a floating hall; default for new seats in a fixed hall.
  category_id CHAR(36) NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_halls_tenant_id (tenant_id, id),
  UNIQUE KEY uq_halls_name (tenant_id, name),
  CONSTRAINT fk_halls_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE,
  CONSTRAINT fk_halls_category FOREIGN KEY (tenant_id, category_id) REFERENCES seat_categories(tenant_id, id)
);

CREATE TABLE hall_tables (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  hall_id CHAR(36) NOT NULL,
  label VARCHAR(40) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_tables_tenant_id (tenant_id, id),
  UNIQUE KEY uq_tables_label (hall_id, label),
  CONSTRAINT fk_tables_hall FOREIGN KEY (tenant_id, hall_id) REFERENCES halls(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE seats (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  table_id CHAR(36) NOT NULL,
  label VARCHAR(20) NOT NULL,                    -- 'A-12', unique in the library
  sort_order SMALLINT NOT NULL DEFAULT 0,
  category_id CHAR(36) NULL,                     -- NULL = no surcharge
  features JSON NULL,                            -- ["ac","window","locker","accessible"]
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_seats_tenant_id (tenant_id, id),
  UNIQUE KEY uq_seats_label (tenant_id, label),
  KEY ix_seats_table (table_id, sort_order),
  CONSTRAINT fk_seats_table FOREIGN KEY (tenant_id, table_id) REFERENCES hall_tables(tenant_id, id),
  CONSTRAINT fk_seats_category FOREIGN KEY (tenant_id, category_id) REFERENCES seat_categories(tenant_id, id)
);

-- ── Slots & pricing ──────────────────────────────────────────────────
CREATE TABLE slots (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,
  start_min SMALLINT UNSIGNED NOT NULL,          -- 0..1410, multiple of 30
  end_min SMALLINT UNSIGNED NOT NULL,            -- may be < start_min (overnight)
  color VARCHAR(9) NOT NULL DEFAULT '',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_slots_tenant_id (tenant_id, id),
  UNIQUE KEY uq_slots_name (tenant_id, name),
  CONSTRAINT fk_slots_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE plans (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  slot_id CHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,                     -- 'Monthly', 'Quarterly'
  period_unit ENUM('month','day') NOT NULL DEFAULT 'month',
  period_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  price_paise INT UNSIGNED NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_plans_tenant_id (tenant_id, id),
  KEY ix_plans_slot (slot_id),
  CONSTRAINT fk_plans_slot FOREIGN KEY (tenant_id, slot_id) REFERENCES slots(tenant_id, id)
);

-- ── Members, subscriptions, seats ────────────────────────────────────
CREATE TABLE members (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_code VARCHAR(20) NOT NULL,              -- printed on ID card, e.g. S1042
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(15) NOT NULL,                    -- normalised, digits only
  address VARCHAR(400) NOT NULL DEFAULT '',
  photo_path VARCHAR(255) NOT NULL DEFAULT '',
  id_proof_path VARCHAR(255) NOT NULL DEFAULT '', -- private storage
  exam_target VARCHAR(80) NOT NULL DEFAULT '',
  joined_on DATE NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  password_hash VARCHAR(255) NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_members_tenant_id (tenant_id, id),
  UNIQUE KEY uq_members_phone (tenant_id, phone),
  UNIQUE KEY uq_members_code (tenant_id, member_code),
  KEY ix_members_name (tenant_id, name),
  CONSTRAINT fk_members_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE subscriptions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  slot_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  -- Fixed hall: the hall of the allocated seat. Floating hall: the place is
  -- counted against this hall's capacity (§7.1).
  hall_id CHAR(36) NOT NULL,
  price_paise INT UNSIGNED NOT NULL,             -- snapshot: plan price + surcharge
  surcharge_paise INT UNSIGNED NOT NULL DEFAULT 0, -- snapshot: category part of price_paise
  period_unit ENUM('month','day') NOT NULL,      -- snapshot
  period_count SMALLINT UNSIGNED NOT NULL,       -- snapshot
  locker_fee_paise INT UNSIGNED NOT NULL DEFAULT 0,
  collection ENUM('advance','arrears') NOT NULL,
  start_on DATE NOT NULL,                        -- seat/place held from here
  bills_from DATE NOT NULL,                      -- = start_on, or the replaced subscription's next period (D4)
  end_on DATE NULL,                              -- planned end (package / leaving)
  status ENUM('active','ended','lapsed') NOT NULL DEFAULT 'active',
  end_reason ENUM('left','unpaid','slot_change','seat_change','admin') NULL,
  ended_at DATETIME NULL,
  previous_subscription_id CHAR(36) NULL,        -- the subscription this one replaced
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_subs_tenant_id (tenant_id, id),
  KEY ix_subs_member (member_id),
  KEY ix_subs_tenant_status (tenant_id, status),
  KEY ix_subs_hall_status (tenant_id, hall_id, status),
  CONSTRAINT fk_subs_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id),
  CONSTRAINT fk_subs_hall FOREIGN KEY (tenant_id, hall_id) REFERENCES halls(tenant_id, id),
  CONSTRAINT fk_subs_slot FOREIGN KEY (tenant_id, slot_id) REFERENCES slots(tenant_id, id),
  CONSTRAINT fk_subs_plan FOREIGN KEY (tenant_id, plan_id) REFERENCES plans(tenant_id, id)
);

CREATE TABLE seat_allocations (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  seat_id CHAR(36) NOT NULL,
  slot_id CHAR(36) NOT NULL,
  start_on DATE NOT NULL,
  end_on DATE NULL,
  status ENUM('active','ended') NOT NULL DEFAULT 'active',
  end_reason ENUM('seat_change','swap','slot_change','released','unpaid','left') NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  -- At most one ACTIVE allocation per subscription (NULLs don't collide in a unique key).
  active_subscription_id CHAR(36)
    AS (IF(status = 'active', subscription_id, NULL)) STORED,
  UNIQUE KEY uq_alloc_tenant_id (tenant_id, id),
  UNIQUE KEY uq_alloc_one_active (active_subscription_id),
  KEY ix_alloc_seat_status (tenant_id, seat_id, status),
  KEY ix_alloc_member (member_id),
  CONSTRAINT fk_alloc_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id),
  CONSTRAINT fk_alloc_seat FOREIGN KEY (tenant_id, seat_id) REFERENCES seats(tenant_id, id),
  CONSTRAINT fk_alloc_slot FOREIGN KEY (tenant_id, slot_id) REFERENCES slots(tenant_id, id)
);

-- The DB-level conflict guard (§7): one row per 30-minute cell an ACTIVE
-- allocation holds on a seat. Two overlapping allocations on the same seat
-- would need the same (seat_id, cell) → duplicate key → rejected.
CREATE TABLE seat_allocation_cells (
  seat_id CHAR(36) NOT NULL,
  cell TINYINT UNSIGNED NOT NULL,                -- 0..47 (00:00, 00:30, …)
  tenant_id CHAR(36) NOT NULL,
  allocation_id CHAR(36) NOT NULL,
  PRIMARY KEY (seat_id, cell),
  KEY ix_cells_alloc (allocation_id),
  CONSTRAINT fk_cells_alloc FOREIGN KEY (tenant_id, allocation_id)
    REFERENCES seat_allocations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_cells_seat FOREIGN KEY (tenant_id, seat_id) REFERENCES seats(tenant_id, id)
);

CREATE TABLE waitlist_entries (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  slot_id CHAR(36) NOT NULL,
  member_id CHAR(36) NULL,                       -- NULL = walk-in enquiry, not yet a member
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  preferred_features JSON NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  status ENUM('waiting','offered','converted','cancelled') NOT NULL DEFAULT 'waiting',
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  queue_no BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,  -- arrival order (created_at is only to the second)
  UNIQUE KEY uq_wait_queue_no (queue_no),
  KEY ix_wait_queue (tenant_id, slot_id, status, created_at),
  CONSTRAINT fk_wait_slot FOREIGN KEY (tenant_id, slot_id) REFERENCES slots(tenant_id, id),
  CONSTRAINT fk_wait_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id)
);

-- ── Money ────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NULL,
  kind ENUM('seat_fee','locker','admission','deposit','other') NOT NULL,
  description VARCHAR(160) NOT NULL,
  period_start DATE NULL,
  period_end DATE NULL,                          -- exclusive
  due_on DATE NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,
  discount_paise INT UNSIGNED NOT NULL DEFAULT 0,
  discount_reason VARCHAR(200) NOT NULL DEFAULT '',
  paid_paise INT UNSIGNED NOT NULL DEFAULT 0,    -- kept in step with payment_allocations
  status ENUM('open','paid','void') NOT NULL DEFAULT 'open',
  void_reason VARCHAR(200) NULL,
  -- Makes generation idempotent: 'sub:<id>:<period_start>', 'admission:<member>'.
  dedupe_key VARCHAR(100) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inv_tenant_id (tenant_id, id),
  UNIQUE KEY uq_inv_dedupe (tenant_id, dedupe_key),
  KEY ix_inv_member (member_id, status),
  KEY ix_inv_due (tenant_id, status, due_on),
  CONSTRAINT fk_inv_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id),
  CONSTRAINT fk_inv_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id)
);

CREATE TABLE payments (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  receipt_no INT UNSIGNED NOT NULL,              -- per-library sequence (counters)
  amount_paise INT UNSIGNED NOT NULL,
  mode ENUM('cash','upi','card','bank','cheque','online','other') NULL,
  reference VARCHAR(80) NOT NULL DEFAULT '',
  received_at DATETIME NOT NULL,
  received_on DATE NOT NULL,                     -- library-local day, for the ledger
  note VARCHAR(300) NOT NULL DEFAULT '',
  collected_by CHAR(36) NULL,
  status ENUM('valid','void') NOT NULL DEFAULT 'valid',
  voided_at DATETIME NULL,
  voided_by CHAR(36) NULL,
  void_reason VARCHAR(200) NULL,
  UNIQUE KEY uq_pay_tenant_id (tenant_id, id),
  UNIQUE KEY uq_pay_receipt (tenant_id, receipt_no),
  KEY ix_pay_day (tenant_id, received_on),
  KEY ix_pay_member (member_id),
  CONSTRAINT fk_pay_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id)
);

-- Which invoices a payment settled. Sum per payment ≤ amount; the remainder is
-- member credit, applied automatically to the next invoice generated.
CREATE TABLE payment_allocations (
  payment_id CHAR(36) NOT NULL,
  invoice_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id, invoice_id),
  KEY ix_palloc_invoice (invoice_id),
  CONSTRAINT fk_palloc_pay FOREIGN KEY (tenant_id, payment_id) REFERENCES payments(tenant_id, id),
  CONSTRAINT fk_palloc_inv FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id)
);

CREATE TABLE deposit_refunds (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  invoice_id CHAR(36) NOT NULL,                  -- the 'deposit' invoice refunded
  amount_paise INT UNSIGNED NOT NULL,
  mode ENUM('cash','upi','card','bank','cheque','online','other') NULL,
  refunded_on DATE NOT NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_refund_tenant_day (tenant_id, refunded_on),
  CONSTRAINT fk_refund_inv FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id),
  CONSTRAINT fk_refund_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id)
);

CREATE TABLE expenses (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'other',
  title VARCHAR(160) NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,
  spent_on DATE NOT NULL,
  mode ENUM('cash','upi','card','bank','cheque','online','other') NULL,
  status ENUM('valid','void') NOT NULL DEFAULT 'valid',   -- money is voided, never deleted
  void_reason VARCHAR(200) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_exp_day (tenant_id, spent_on),
  CONSTRAINT fk_exp_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

-- ── Attendance ───────────────────────────────────────────────────────
CREATE TABLE attendance (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NOT NULL,
  local_date DATE NOT NULL,
  check_in_at DATETIME NOT NULL,
  check_out_at DATETIME NULL,
  method ENUM('qr','phone','staff') NOT NULL,
  outside_slot TINYINT(1) NOT NULL DEFAULT 0,    -- allowed under 'warn' mode
  had_dues TINYINT(1) NOT NULL DEFAULT 0,
  recorded_by CHAR(36) NULL,
  UNIQUE KEY uq_att_sub_day (subscription_id, local_date),
  KEY ix_att_tenant_day (tenant_id, local_date),
  KEY ix_att_member (member_id, local_date),
  CONSTRAINT fk_att_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id),
  CONSTRAINT fk_att_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id)
);

-- ── Notifications ────────────────────────────────────────────────────
CREATE TABLE notifications (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  kind ENUM('announcement','fee_due','seat_expiry','waitlist','mocktest','system') NOT NULL,
  title VARCHAR(80) NOT NULL,
  body VARCHAR(300) NOT NULL,
  url VARCHAR(255) NOT NULL DEFAULT '',          -- same-origin deep link only
  audience JSON NULL,                            -- {"type":"all"|"dues"|"slot"|"members", …}
  dedupe_key VARCHAR(120) NULL,                  -- 'fee_due:<invoice>:d-3' (automated sends)
  recipients_count INT UNSIGNED NOT NULL DEFAULT 0,
  push_sent INT UNSIGNED NOT NULL DEFAULT 0,
  push_failed INT UNSIGNED NOT NULL DEFAULT 0,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif_tenant_id (tenant_id, id),
  UNIQUE KEY uq_notif_dedupe (tenant_id, dedupe_key),
  KEY ix_notif_tenant_time (tenant_id, created_at),
  CONSTRAINT fk_notif_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE notification_recipients (
  notification_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  read_at DATETIME NULL,
  PRIMARY KEY (notification_id, member_id),
  KEY ix_inbox (member_id, notification_id),
  CONSTRAINT fk_nr_notif FOREIGN KEY (tenant_id, notification_id) REFERENCES notifications(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_nr_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE push_subscriptions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,               -- SHA-256; one browser = one row, globally
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_endpoint (endpoint_hash),
  KEY ix_push_member (member_id),
  CONSTRAINT fk_push_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id) ON DELETE CASCADE
);

-- ── Mock tests: content (owner_tenant_id NULL = global/platform) ─────
CREATE TABLE test_series (
  id CHAR(36) PRIMARY KEY,
  owner_tenant_id CHAR(36) NULL,
  title VARCHAR(160) NOT NULL,
  exam_tag VARCHAR(60) NOT NULL DEFAULT '',      -- 'SSC CGL', 'UPSC Prelims'
  description TEXT NULL,
  cover_path VARCHAR(255) NOT NULL DEFAULT '',
  price_paise INT UNSIGNED NOT NULL DEFAULT 0,   -- 0 = free
  member_price_paise INT UNSIGNED NULL,          -- price for seat members [§10.2]
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_series_owner (owner_tenant_id, status),
  CONSTRAINT fk_series_owner FOREIGN KEY (owner_tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE tests (
  id CHAR(36) PRIMARY KEY,
  owner_tenant_id CHAR(36) NULL,
  series_id CHAR(36) NULL,
  title VARCHAR(160) NOT NULL,
  instructions TEXT NULL,
  duration_sec INT UNSIGNED NOT NULL,
  sellable_alone TINYINT(1) NOT NULL DEFAULT 0,
  price_paise INT UNSIGNED NOT NULL DEFAULT 0,
  member_price_paise INT UNSIGNED NULL,
  is_free TINYINT(1) NOT NULL DEFAULT 0,         -- free sample inside a paid series
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 1,
  shuffle_options TINYINT(1) NOT NULL DEFAULT 0,
  solutions_visible ENUM('after_submit','after_close') NOT NULL DEFAULT 'after_submit',
  opens_at DATETIME NULL,
  closes_at DATETIME NULL,
  total_marks DECIMAL(8,2) NOT NULL DEFAULT 0,   -- cached at publish
  question_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_tests_series (series_id, sort_order),
  KEY ix_tests_owner (owner_tenant_id, status),
  CONSTRAINT fk_tests_series FOREIGN KEY (series_id) REFERENCES test_series(id)
);

CREATE TABLE test_sections (
  id CHAR(36) PRIMARY KEY,
  test_id CHAR(36) NOT NULL,
  title VARCHAR(120) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  KEY ix_sections_test (test_id, sort_order),
  CONSTRAINT fk_sections_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

CREATE TABLE questions (
  id CHAR(36) PRIMARY KEY,
  test_id CHAR(36) NOT NULL,
  section_id CHAR(36) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  type ENUM('single','multi') NOT NULL DEFAULT 'single',
  body TEXT NOT NULL,                            -- light Markdown + uploaded images
  explanation TEXT NULL,
  marks DECIMAL(6,2) NOT NULL DEFAULT 1,
  negative_marks DECIMAL(6,2) NOT NULL DEFAULT 0,
  KEY ix_questions_section (section_id, sort_order),
  KEY ix_questions_test (test_id),
  CONSTRAINT fk_questions_section FOREIGN KEY (section_id) REFERENCES test_sections(id) ON DELETE CASCADE
);

CREATE TABLE question_options (
  id CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  KEY ix_options_question (question_id, sort_order),
  CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ── Mock tests: commerce ─────────────────────────────────────────────
CREATE TABLE mock_orders (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,                   -- buyer's library
  member_id CHAR(36) NOT NULL,
  item_type ENUM('series','test') NOT NULL,
  item_id CHAR(36) NOT NULL,
  list_price_paise INT UNSIGNED NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,            -- what was charged
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('created','paid','failed','refunded') NOT NULL DEFAULT 'created',
  provider VARCHAR(20) NOT NULL,                 -- 'razorpay'
  provider_order_id VARCHAR(64) NOT NULL,
  provider_payment_id VARCHAR(64) NULL,
  library_share_bps SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- snapshot at purchase
  library_share_paise INT UNSIGNED NOT NULL DEFAULT 0,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orders_provider (provider, provider_order_id),
  KEY ix_orders_tenant (tenant_id, status, paid_at),
  KEY ix_orders_member (member_id),
  CONSTRAINT fk_orders_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id)
);

-- Every webhook delivery, stored before processing. The unique key makes
-- re-deliveries a no-op.
CREATE TABLE gateway_events (
  id CHAR(36) PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  event_id VARCHAR(80) NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  payload JSON NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  result VARCHAR(200) NULL,
  UNIQUE KEY uq_events (provider, event_id)
);

CREATE TABLE entitlements (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  item_type ENUM('series','test') NOT NULL,
  item_id CHAR(36) NOT NULL,
  source ENUM('purchase','free','grant') NOT NULL,
  order_id CHAR(36) NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  UNIQUE KEY uq_entitlement (member_id, item_type, item_id),
  CONSTRAINT fk_ent_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id)
);

CREATE TABLE test_attempts (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  test_id CHAR(36) NOT NULL,
  attempt_no TINYINT UNSIGNED NOT NULL,
  status ENUM('in_progress','submitted') NOT NULL DEFAULT 'in_progress',
  submit_reason ENUM('user','timeout') NULL,
  option_seed INT UNSIGNED NOT NULL,             -- deterministic shuffle per attempt
  started_at DATETIME NOT NULL,
  deadline_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  score DECIMAL(8,2) NULL,
  correct_count SMALLINT UNSIGNED NULL,
  wrong_count SMALLINT UNSIGNED NULL,
  skipped_count SMALLINT UNSIGNED NULL,
  time_taken_sec INT UNSIGNED NULL,
  section_scores JSON NULL,
  -- At most one in-progress attempt per member per test.
  in_progress_key VARCHAR(73)
    AS (IF(status = 'in_progress', CONCAT(member_id, ':', test_id), NULL)) STORED,
  UNIQUE KEY uq_attempt_no (member_id, test_id, attempt_no),
  UNIQUE KEY uq_attempt_in_progress (in_progress_key),
  KEY ix_leaderboard (test_id, attempt_no, status, score),
  KEY ix_attempt_deadline (status, deadline_at),
  CONSTRAINT fk_attempt_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id),
  CONSTRAINT fk_attempt_test FOREIGN KEY (test_id) REFERENCES tests(id)
);

CREATE TABLE attempt_answers (
  attempt_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  selected_option_ids JSON NOT NULL,             -- [] = visited, not answered
  marked_for_review TINYINT(1) NOT NULL DEFAULT 0,
  time_spent_sec INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (attempt_id, question_id),
  CONSTRAINT fk_answers_attempt FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE
);
```

Notes
- Mock-test content tables are **not** tenant-scoped by `tenant_id`; access is
  decided by `owner_tenant_id` (NULL = global, visible to every library) plus
  `status = 'published'`. Repository functions for content always take the caller's
  tenant and filter `owner_tenant_id IS NULL OR owner_tenant_id = ?`.
- `invoices.paid_paise` is a cache maintained in the same transaction as
  `payment_allocations`; a nightly check recomputes and logs mismatches.

## 7. Seat + slot conflict prevention

**Rule.** On one seat, two **active** allocations may not have overlapping slot times.
Morning (06–12) + Evening (12–18) on A-12 is valid; Morning + Full Day is not.
A member also may not hold two overlapping subscriptions (can't sit in two places at once).

**Time model.** The day is split into 48 **cells** of 30 minutes. A slot covers the
cells from `start_min` up to (not including) `end_min`; if `end_min < start_min` it
wraps past midnight (e.g. 22:00–06:00 for 24-hour libraries). Slot times must be
multiples of 30 (validated by the shared slot schema). `shared/slots/slotCells.js`:

```js
cellsForSlot({ startMin, endMin })   // → [12, 13, …, 23] for 06:00–12:00
slotsOverlap(a, b)                   // → true if the cell sets intersect
```

**Layer 1 — service check (friendly errors).** `subscriptions` module
(`lifecycle.startSubscription` → `placement.occupyPlace`):

```
withTransaction(tx):
  1. SELECT member … FOR UPDATE         -- one change per student at a time
  2. SELECT slot … LOCK IN SHARE MODE   -- its times can't change meanwhile
  3. SELECT seat … FOR UPDATE           -- serialises every write on this seat
     (must belong to ctx.tenantId, be active, in an active fixed hall)
  4. member's other ACTIVE subscriptions → overlap → MEMBER_SLOT_OVERLAP
  5. ACTIVE allocations on the seat → slotsOverlap → SEAT_SLOT_TAKEN (names who)
  6. INSERT subscriptions, seat_allocations
  7. INSERT seat_allocation_cells (one row per cell)
```
Lock order is always member → slot → seat/hall (two seats: lower id first), so
concurrent changes queue instead of deadlocking. An integration test races five
bookings for one seat: exactly one wins.

**Layer 2 — database guard.** `seat_allocation_cells` has `PRIMARY KEY (seat_id, cell)`.
If any code path (a bug, a race, a future feature) tries to give an overlapping slot
on the same seat, step 5 hits a duplicate key and the transaction rolls back; the
repository maps `ER_DUP_ENTRY` on that table to the same `SEAT_SLOT_TAKEN` error.
Ending an allocation deletes its cells in the same transaction.

**Why cells instead of only `FOR UPDATE`.** Row locks are correct only if every
writer remembers to take them. MySQL has no exclusion constraints, so the cell table
is how we make the database itself refuse overlap. It also makes "free seats for slot
X" a single indexed query:

```sql
SELECT s.* FROM seats s
WHERE s.tenant_id = ? AND s.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM seat_allocation_cells c
                  WHERE c.seat_id = s.id AND c.cell IN (?))   -- cells of slot X
```

**Operations** (all in one transaction, all through the service):
- **Move (seat or hall change):** same category price → end the allocation
  (`seat_change`) and allocate the new place for the same subscription. Different
  price → handled like a slot change (below), so the new price starts next period
  (extension of D4, to confirm with the owner).
- **Swap A↔B:** lock both members, then both seats **in id order**, end both
  allocations, then seat each student on the other's seat with the normal checks
  (each side follows the move rule above).
- **Slot change:** end the subscription (`slot_change`) and its allocation, start a new
  subscription + allocation today (target place must be free for the new slot). Its
  `bills_from` is the old subscription's next period start, so the new price applies
  from the **next billing period** with no proration [D4]; the seat is held for the new
  slot from the moment of the change. `previous_subscription_id` links them.
- **Release:** end allocation + delete cells; subscription → `ended`/`lapsed`;
  notify the waitlist (§8.5).
- **Editing a slot's times:** recompute cells for every active allocation of that
  slot in one transaction; on conflict, reject with the list of clashing seats.
- **Disabling a seat** with an active allocation is rejected.

**Date dimension.** An allocation holds its seat-cells from the moment it is created
until it is ended, even if `start_on` is in the future. Booking a seat in advance for
when its current holder leaves is **not** supported [D3].

**Tests** (`allocations.test.js` + `shared/slots/slotCells.test.js`): adjacent slots,
nested slots, overnight wrap, identical slots, swap where one side fails, two concurrent
allocations (integration test against a real DB — only one succeeds).

### 7.1 Floating halls ("sit anywhere") [D8]
A subscription in a floating hall has **no seat allocation**. The rule is capacity:
for every 30-minute cell, the number of active subscriptions in that hall whose slot
covers the cell must stay ≤ the hall's active seat count.

```
withTransaction(tx):
  1. SELECT hall … FOR UPDATE           -- serialises every write on this hall
  2. capacity = count of active seats in the hall
  3. per cell of the target slot: count active floating subscriptions covering it
     (shared helper peakOccupancy(slots) does the counting) → if any count + 1 > capacity:
     throw AppError(409, HALL_SLOT_FULL, { slotId, capacity })  → offer the waitlist
  4. INSERT subscription
```
Disabling seats in a floating hall is rejected if it would drop capacity below the
current peak. There is no DB-level backstop here (MySQL can't express "count ≤ N");
the hall row lock is the guard — recorded in TECH-DEBT. Check-in in a floating hall
records attendance only (no seat). The seat map shows `used / capacity` per slot for
floating halls instead of names on seats.

## 8. Billing, payments, money

### 8.1 Invoices are generated, not derived
- Each subscription produces one **seat_fee** invoice per period
  (`period_unit × period_count`, anchored on `start_on` or the 1st of the month per
  `billing_anchor`). `collection = advance` → `due_on = period_start`;
  `arrears` → `due_on = period_end`. Locker fee (if any) is its own invoice per period.
- **Price** = plan price + seat-category surcharge (monthly surcharge × months, or
  pro rata ÷ 30 per day for day plans) — computed by `shared/billing/pricing.js` and
  snapshotted on the subscription [D6].
- **First period with `billing_anchor = month_start`** [D5], per library setting
  `first_period_billing`: `full` charges the whole first month; `prorated` charges
  `price × remaining days ÷ days in month` (rounded to the rupee) for the joining month.
  With `join_date` anchoring there is no partial period.
- No GST on receipts or sales for now [D9].
- **Admission fee** and **security deposit**: one invoice each at joining (`dedupe_key`
  makes them unique).
- Generation is **idempotent** (`dedupe_key`, `INSERT … ON DUPLICATE KEY UPDATE id = id`).
  It runs when a member's account is opened, before a payment, from the dues list and in
  the hourly job, and only creates periods that have started (an ended booking still owes
  the period it was used in). `shared/billing/invoicePlan.js` plans the invoices (tested);
  the billing module is the only writer.

### 8.2 Payments
- A payment has an amount and mode; shared `planAllocation` pays the invoices the staff
  picked first, then **oldest due first**; on the same due day the order is admission,
  seat fee, locker, other, and the refundable **deposit last**. Partial payment = an
  invoice with `0 < paid < amount`. Over-payment is **credit** (payment money not yet
  allocated) and is applied automatically when new invoices appear.
- Receipt number from `counters` in the same transaction → printed `R-000123`.
- **Void**, never delete: reverses allocations (listed in the `audit_log` row), keeps the
  payment marked void, re-applies any remaining credit. Needs `payments.void`. A payment
  whose deposit was already refunded can't be voided.
- **Discounts** (with a reason, at most the unpaid part) and **voiding unpaid charges**
  need `payments.void`; manual "other" charges need `payments.collect`.
- **Deposits** are money held, not revenue: the ledger and insights show them separately;
  refunds are recorded in `deposit_refunds`.

### 8.3 Dues
`shared/billing/dues.js` turns a member's invoices into
`{ outstandingPaise, upcomingPaise, overdueSince, daysOverdue, nextDueOn, nextDueAmountPaise }` —
the same object drives the admin member card and (M7) the student "next due" card. The
dues list groups members into ageing buckets (0–7, 8–30, 30+ days overdue).

### 8.4 Ledger & insights
- **Day ledger:** for a local date — collected, spent and refunded by mode, deposits in,
  earned (collected − deposits), net, and **cash in hand** (cash in − cash out).
- **CSV export** for payments, expenses, dues, members and attendance: UTF-8 BOM so
  Excel reads ₹ and Hindi names, formula-injection safe (`server/src/lib/csv.js`).
- **Dashboard** (`GET /admin/dashboard`): collected today, owed now, longest overdue,
  active students and bookings, waiting list, bookings per slot.
- **Insights:** occupancy % per slot (`seat-slot pairs taken ÷ active seats`), revenue
  per month (excluding deposits), dues ageing (0–7 / 8–30 / 30+ days), new vs. churned
  subscriptions per month, attendance rate per slot, mock-test sales.

### 8.5 Background jobs
`server/src/jobs/scheduler.js` runs each job at most once per interval, recording
`job_runs`; it ticks every minute while the process is awake and once at boot.
Passenger may sleep an idle process, so `POST /api/internal/jobs/run` with
`X-Cron-Secret` (= `CRON_SECRET`) lets a cPanel cron wake it. The job list is in
`jobs/jobs.js`; jobs act as the "system" actor for every active library.

| Job | Every | Built | Does |
|---|---|---|---|
| `generate-invoices` | 1 h | **M5** | create due period invoices (idempotent), apply credit |
| `releaseUnpaidSeats` | 1 h | M8 | if `auto_release_unpaid`: release seats whose oldest overdue invoice is past `grace_days`; notify member + waitlist |
| `endFinishedSubscriptions` | 1 h | M8 | end subscriptions whose `end_on` passed; release seats |
| `sendFeeReminders` | 1 h (9:00–20:00 local) | M8 | `fee_due` notifications N days before / on due day (deduped) |
| `sendSeatExpiryReminders` | 1 h | M8 | before `end_on` / before auto-release |
| `autoSubmitAttempts` | 1 min | M10 | submit attempts past `deadline_at` |
| `reconcileOrders` | 10 min | M10 | ask the gateway about `created` orders older than 15 min |

## 9. Attendance & check-in

The slot and dues rules below come from **Settings → Check-in** (`slot_check_mode`,
`slot_early_minutes`, `allow_overdue_checkin`); shared logic is `evaluateCheckin`.

- **Daily code:** a 6-character code (no 0/O/1/I) = `HMAC(jwtSecret, tenant + local date)`
  (`lib/dailyCode.js`), never stored, rotating each library-local day.
- **QR:** the desk screen (admin app, "Check-in desk") shows a QR of
  `/s/<slug>/checkin?code=<daily code>`, generated in the browser. The student-app scan
  of it (method `qr`) lands in milestone 7; the code route exists now.
- **Phone:** kiosk on the desk — phone + the code shown on screen (public
  `/api/s/:slug/kiosk/checkin`, rate-limited per IP+phone, a wrong code and an unknown
  phone give the same message).
- **Staff:** mark a walk-in present (`attendance.manage`) — overrides the slot and dues
  gates but still stores the flags.
- **Slot check** (`isWithinSlot`, library timezone): the active booking whose slot
  contains *now* (allowing `slot_early_minutes`). Outside every slot it picks the nearest
  and, per `slot_check_mode`: `off`/`warn` record it (`outside_slot = 1` under `warn`),
  `block` refuse with `OUTSIDE_SLOT` (message names the slot times). No active booking →
  `NO_ACTIVE_BOOKING`.
- **Dues check:** if money is already due and `allow_overdue_checkin = 0` → refuse with
  `DUES_OVERDUE` (a fast read; check-in never generates invoices).
- Second check-in the same day → check-out (`check_out_at`); the unique key
  `(subscription_id, local_date)` is the DB guard.

## 10. Mock tests

### 10.1 Who creates content — recommendation: **global first, per-library later**
Content is created by the **super admin** (platform) and sold to students of **all**
libraries; each library earns a revenue share on sales to its students.
The schema also supports library-owned content (`owner_tenant_id`), switched on later
per library.

Why:
- Good tests need thousands of correct questions with explanations — one content team
  can do that well; most library owners can't and won't.
- One catalog serves every tenant: build once, sell N times; rankings across all
  libraries are more meaningful than within one room of 60 students.
- **One Razorpay account (the platform's)** receives payments, so library owners need
  no gateway KYC; their share is reported and paid out monthly.
- The revenue share gives owners a reason to promote the store.
- Keeping `owner_tenant_id` in the schema means per-library tests are a feature flag +
  admin screens later, not a migration.

### 10.2 Pricing
- Free test (`is_free` / price 0), paid single test (`sellable_alone`), paid series
  (unlocks all its tests).
- `member_price_paise`: discounted price for students who have an **active
  subscription** today; former members (whose subscriptions have ended but who can
  still log in) pay the list price. Only library members can buy — no public sign-up [D2].
- Library revenue share defaults to **20 %** (`platform_settings.mocktest_default_share_bps
  = 2000`), overridable per library [D1].
- Access rule (`mocktest-store.service.canAccessTest`): test is free **or** member has
  an entitlement for the test **or** for its series.

### 10.3 Content admin & CSV/Excel import
Platform admin: series → tests → sections → questions editor; preview as student;
publish (computes `total_marks`, `question_count`; requires ≥1 question per section and
exactly one correct option for `single`).
Import: the admin app parses CSV/XLSX **in the browser** (SheetJS), shows a preview with
row errors, then posts JSON rows; the server validates again with the same shared schema
and inserts in one transaction. Template columns:

```
section, type(single|multi), question, option_a … option_f, correct (e.g. "B" or "A,C"),
marks, negative_marks, explanation
```

Editing a published test's answers triggers "re-score attempts" (admin action, audited).

### 10.4 Payment flow (Razorpay behind `PaymentProvider`)

```js
/** @typedef {Object} PaymentProvider
 *  @property {string} name
 *  @property {(o:{amountPaise:number, receipt:string, notes:object}) => Promise<{providerOrderId:string}>} createOrder
 *  @property {(p:{providerOrderId:string, providerPaymentId:string, signature:string}) => boolean} verifyCheckoutSignature
 *  @property {(rawBody:Buffer, signatureHeader:string) => boolean} verifyWebhook
 *  @property {(body:object) => {eventId:string, type:'paid'|'failed'|'refunded'|'ignored', providerOrderId:string, providerPaymentId?:string, amountPaise?:number}} parseWebhook
 *  @property {(providerOrderId:string) => Promise<{status:'paid'|'pending'|'failed', providerPaymentId?:string, amountPaise?:number}>} fetchOrderStatus
 */
```
Implementations: `razorpay.provider.js` (HTTP via `fetch`), `fake.provider.js` (tests, dev).

1. **Create order** — `POST /api/s/:slug/store/orders {itemType, itemId}`. Server checks
   item is published and not already owned, computes the price **server-side**, creates
   `mock_orders(created)` and a gateway order, returns checkout params. Price 0 → entitlement
   granted immediately, no gateway.
2. **Checkout** — Razorpay Checkout in the student app.
3. **Confirm (fast path)** — client posts `{paymentId, signature}` to
   `/orders/:id/confirm`. Server verifies the HMAC signature **and** fetches the order
   status from Razorpay; only then `markOrderPaid`. The client's word is never enough.
4. **Webhook (source of truth)** — `POST /api/webhooks/razorpay`, raw body,
   `X-Razorpay-Signature` checked with the webhook secret → insert `gateway_events`
   (duplicate event id → 200, nothing else) → match order by `provider_order_id`, check
   amount + currency → `markOrderPaid`.
5. **`markOrderPaid`** (one transaction, idempotent):
   `UPDATE mock_orders SET status='paid' … WHERE id=? AND status IN ('created','failed')`;
   if 1 row changed → snapshot `library_share_*`, `INSERT … ON DUPLICATE KEY` entitlement,
   audit, notify. Called by both paths; whichever comes second is a no-op.
6. **Failures/refunds** — `payment.failed` → `failed` (if not paid); `refund.processed`
   → `refunded`, entitlement `revoked_at`.
7. **Reconcile job** — settles orders whose webhook never arrived.

Tests: signature verify (good/bad/tampered body), duplicate webhook, amount mismatch,
confirm-then-webhook and webhook-then-confirm both grant exactly once, refund revokes.

### 10.5 Attempt engine
- **Start** `POST /attempts {testId}` → access check → return the existing in-progress
  attempt if any (resume) else create (`attempt_no` ≤ `max_attempts`,
  `deadline_at = now + duration`). Response: paper **without** correct answers or
  explanations (options shuffled by `option_seed` if enabled), saved answers, `serverNow`.
- **Timer** runs from `deadline_at − (serverNow − clientNow)` so a wrong phone clock
  doesn't matter.
- **Autosave** `PUT /attempts/:id/answers` (batch, debounced 2 s, and on
  `visibilitychange`); answers are also mirrored in `localStorage` per attempt so a
  network blip or refresh loses nothing; on resume the server copy wins unless the local
  one is newer and unsynced.
- **Submit** at user request, when the client timer hits 0, by the `autoSubmitAttempts`
  job, or lazily on any read of an expired attempt. Saves after `deadline_at + 10 s` are
  refused. Submit is idempotent.
- **Scoring** — `shared/mocktests/scoring.js` (pure, tested): single = correct option →
  `+marks`, wrong → `−negative_marks`; multi = exact set → `+marks`, any other non-empty
  answer → `−negative_marks` (partial marking is tech debt); empty = skipped. Marks are
  computed in hundredths (integers) to avoid float drift. Produces score, correct/wrong/
  skipped, accuracy = correct ÷ attempted, per-section breakdown, time taken.
- **Result** screen: score, accuracy, rank, percentile, section table, then
  **solutions** (your answer, correct answer, explanation) per `solutions_visible`.
- **Leaderboard:** first attempts only (`attempt_no = 1`, submitted), ordered by score
  desc, time asc, submitted_at asc. Scope: all libraries (default) or "my library".
  Shows first name + last initial + library name.
- **Reports:** platform sales by test/series/library/month and library share owed;
  each library sees its own students' purchases and its share.

## 11. API routes

All JSON under `/api`. Errors: `{ "error": { "code": "SEAT_SLOT_TAKEN", "message": "…", "fields": { "seatId": "…" } } }`.
Lists support `?page=&pageSize=&q=`. Legend: **P** = public, **SA** = super_admin,
**A** = admin, **S:perm** = staff with that permission (admin always passes),
**ST** = signed-in student, ⏱ = rate-limited.

**Auth & public**
| Method | Path | Who |
|---|---|---|
| GET | /health (DB reachable — for deploy checks) | P |
| POST | /auth/login ⏱ · /auth/logout | P |
| GET | /auth/me | A, S, SA |
| POST | /auth/password | A, S, SA |
| GET | /public/libraries/:slug | P (name, logo, theme, slots for display) |
| GET | /push/public-key | P |
| POST | /internal/jobs/run | `X-Cron-Secret` |
| POST | /webhooks/razorpay ⏱ | P (signature-verified) |

**Platform** (`/platform/*`, SA only)
| Method | Path |
|---|---|
| GET, POST | /platform/libraries |
| GET, PATCH | /platform/libraries/:id (GET includes usage + logins; PATCH name, share bps) |
| PATCH | /platform/libraries/:id/status (activate / suspend) |
| POST | /platform/libraries/:id/owners · PATCH /platform/users/:id/status |
| GET, PUT | /platform/settings |
| GET, POST, PATCH, DELETE | /platform/series, /platform/series/:id |
| GET, POST, PATCH, DELETE | /platform/tests, /platform/tests/:id (+ /publish, /unpublish, /rescore) |
| GET, POST, PATCH, DELETE | /platform/tests/:id/sections, /platform/sections/:id |
| GET, POST, PATCH, DELETE | /platform/sections/:id/questions, /platform/questions/:id |
| POST | /platform/tests/:id/import (validated rows) |
| GET | /platform/sales (filters: month, library, item) · /platform/sales/export.csv |

**Library admin** (`/admin/*`; tenant from session, or `X-Library-Id` for SA)
| Method | Path | Who |
|---|---|---|
| GET | /admin/settings (name, timezone, brand, prefixes, logo URL) | any staff |
| PUT | /admin/settings | S:settings.manage |
| POST, DELETE | /admin/settings/logo (multipart field `logo`, ≤ 2 MB) | S:settings.manage |
| GET, POST | /admin/staff · PATCH /admin/staff/:id · POST /admin/staff/:id/password | S:staff.manage |
| GET | /admin/layout (categories + halls → tables → seats; every layout write returns it) | any staff |
| POST | /admin/seat-categories · PATCH /admin/seat-categories/:id (archive) | S:layout.manage |
| POST | /admin/halls · PATCH, DELETE /admin/halls/:id (incl. seating mode) | S:layout.manage |
| POST | /admin/halls/:id/tables `{tableCount, seatsPerTable, seatPrefix, startNumber}` | S:layout.manage |
| PATCH, DELETE | /admin/tables/:id · POST /admin/tables/:id/seats | S:layout.manage |
| PATCH, DELETE | /admin/seats/:id (label, category, features, disable) | S:layout.manage |
| GET | /admin/seat-map?hallId= (tables → seats with current occupants of every slot; sit-anywhere halls: occupants + capacity — the app filters by slot) | any staff |
| GET | /admin/availability?slotId= (free seat ids; sit-anywhere halls: capacity/used/free) | any staff |
| GET | /admin/seats/:id/history (who sat there, current first) | any staff |
| GET | /admin/slots (with plans and monthlyFeePaise) | any staff |
| POST | /admin/slots (creates the default Monthly plan) · PATCH /admin/slots/:id (times, archive) | S:slots.manage |
| POST | /admin/slots/:id/plans · PATCH /admin/plans/:id | S:slots.manage |
| GET | /admin/members?q=&status=&slotId=&page=&pageSize= (with current placements) | any staff |
| POST | /admin/members (member + bookings + waitlist conversion, one tx; admission/deposit invoices + first fee invoices in the same tx) | S:members.manage |
| GET | /admin/members/:id (member, subscriptions, seat history) | any staff |
| PATCH | /admin/members/:id · POST, DELETE /admin/members/:id/photo · POST /admin/members/:id/id-proof (multipart) | S:members.manage |
| POST | /admin/members/:id/reset-password (student app login, M7) | S:members.manage |
| GET | /admin/members/:id/id-proof (private file) | S:members.manage |
| GET | /admin/members/:id/attendance?month= · invoices and payments come from /admin/members/:memberId/account | any staff |
| GET | /admin/subscriptions/:id | any staff |
| POST | /admin/members/:id/subscriptions `{slotId, planId, seatId\|hallId, startOn?, collection?, lockerFeePaise?}` | S:seats.allocate |
| POST | /admin/subscriptions/:id/move `{seatId\|hallId}` | S:seats.allocate |
| POST | /admin/subscriptions/:id/change-slot `{slotId, planId, seatId\|hallId}` | S:seats.allocate |
| POST | /admin/subscriptions/:id/end `{reason: left\|admin}` (today; future end dates: M8 job) | S:seats.allocate |
| POST | /admin/subscriptions/swap `{subscriptionA, subscriptionB}` | S:seats.allocate |
| GET | /admin/waitlist?slotId=&view=open\|all (with queue position) | any staff |
| POST | /admin/waitlist · PATCH /admin/waitlist/:id (offered / waiting / cancelled); conversion happens in POST /admin/members via `waitlistEntryId` | S:members.manage |
| GET | /admin/members/:memberId/account (summary, invoices, payments, refunds, credit) · /admin/dues (ageing) | any staff |
| POST | /admin/invoices (manual "other" charge) | S:payments.collect |
| PATCH | /admin/invoices/:id/discount `{discountPaise, reason}` | S:payments.void |
| POST | /admin/invoices/:id/void `{reason}` (unpaid only) · /admin/invoices/:id/refund (deposit) | S:payments.void |
| POST | /admin/payments `{memberId, amountPaise, mode, reference?, invoiceIds?, receivedOn?}` | S:payments.collect |
| GET | /admin/payments?from=&to=&mode= · /admin/payments/:id (receipt data) | S:payments.collect |
| POST | /admin/payments/:id/void `{reason}` | S:payments.void |
| GET, POST | /admin/expenses?from=&to= · POST /admin/expenses/:id/void | S:expenses.manage |
| GET | /admin/ledger?date= | S:payments.collect |
| GET | /admin/dashboard | any staff |
| PUT | /admin/settings/billing (anchor, first period, collection, grace days) · /admin/settings/checkin (slot mode, early minutes, dues gate) | S:settings.manage |
| GET | /admin/attendance?date=&slotId= · POST /admin/attendance `{memberId, subscriptionId?}` (manual) · GET /admin/export/attendance.csv | S:attendance.manage |
| GET | /admin/checkin/desk (today's code, QR target, present count) | any staff |
| GET | /admin/insights/{occupancy,revenue,dues,churn,attendance,mocktests} | S:insights.view |
| GET | /admin/export/payments.csv, dues.csv (S:payments.collect) · expenses.csv (S:expenses.manage) · members.csv (S:members.manage) · attendance.csv (S:attendance.manage) | as listed |
| GET | /admin/notifications · POST /admin/notifications (announce) ⏱ | S:notifications.send |
| GET | /admin/notifications/preview?audience= (recipient count) | S:notifications.send |
| GET | /admin/mocktests/sales (own students, share owed) | S:mocktests.view |

**Student** (`/s/:slug/*`)
| Method | Path | Who |
|---|---|---|
| POST | /s/:slug/auth/login ⏱ · /logout · /password | P / ST |
| GET | /s/:slug/me (profile, subscriptions + seats + slots, dues card) | ST |
| POST | /s/:slug/kiosk/checkin ⏱ `{phone, code}` — **built (M6)**, public, no session | P |
| POST | /s/:slug/checkin ⏱ `{code}` (student-app QR, M7) | ST |
| GET | /s/:slug/attendance?month= | ST |
| GET | /s/:slug/invoices · /s/:slug/payments · /s/:slug/payments/:id/receipt | ST |
| GET | /s/:slug/notifications · POST /s/:slug/notifications/:id/read | ST |
| POST | /s/:slug/push/subscribe · /push/unsubscribe · GET /push/devices | ST |
| GET | /s/:slug/store (catalog with price for this student) · /store/series/:id · /store/tests/:id | ST |
| POST | /s/:slug/store/orders ⏱ · /store/orders/:id/confirm ⏱ | ST |
| GET | /s/:slug/my-tests (entitled + free) | ST |
| POST | /s/:slug/attempts `{testId}` (start/resume) | ST |
| GET | /s/:slug/attempts/:id · PUT /attempts/:id/answers · POST /attempts/:id/submit | ST |
| GET | /s/:slug/attempts/:id/result · /attempts/:id/solutions | ST |
| GET | /s/:slug/tests/:id/leaderboard?scope=all\|library | ST |

**Static (not /api):** `/admin/*`, `/s/:slug/*` (shell with injected manifest),
`/s/:slug/manifest.webmanifest`, `/sw.js`, `/files/*` (public uploads from `storage/public`, served with a 1-year cache; `storage/private` is never served statically),
`/.well-known/assetlinks.json`.

## 12. Screens

How every screen looks and behaves — tokens, icons, components, patterns, copy rules and
per-screen notes for built and future screens — is in **`docs/UI-GUIDE.md`**. Read it
before building or changing any screen.

**Admin app** (`/admin`) — sidebar items hidden when the user lacks the permission.
1. Login · Change password
2. **Dashboard** — today's check-ins, occupancy per slot, dues total, today's
   collection, expiring seats, waitlist count, quick actions
3. **Seat map** — hall tabs, slot filter chips; seat tiles coloured free / taken /
   partly taken (other slots); click → side panel: occupants per slot, dues, history,
   actions (allocate, change, swap, release). Floating halls show `used / capacity`
   per slot and the list of members instead.
4. **Layout editor** — seat categories with surcharge; halls list with seating mode
   (fixed / floating) and category; "add N tables × M seats" with label pattern
   (A-1…); rename/reorder tables; seat chips with category, feature toggles and disable
5. **Slots & plans** — slot list with times, monthly fee, plans; slot timeline preview
6. **Members** — list with filters (slot, dues, status, exam), search
7. **Add / edit member** — profile, photo, ID proof, exam, start date, then one or
   more *slot + plan + hall + seat* rows (seat picker shows only seats free for that
   slot, filter by category/features; floating halls show remaining places instead),
   live price preview (plan + surcharge, prorated first month if set),
   admission/deposit/locker, first payment
8. **Member detail** — tabs: overview, subscriptions & seat history, invoices &
   payments, attendance calendar, notifications; actions: collect, change seat/slot,
   swap, end, reset password, print ID card
9. **Waitlist** — per slot queue; convert to member when a seat frees
10. **Dues** — who owes, ageing buckets, send reminder
11. **Collect payment** dialog + **Receipt** print view
12. **Payments** — list by date range, mode filter, void
13. **Expenses** · **Day ledger** (by date) · CSV exports
14. **Attendance** — by date and slot; manual mark; outside-slot flags
15. **Check-in desk** — full-screen QR with daily code + phone kiosk mode
16. **Insights** — occupancy %, revenue, dues ageing, churn, attendance, mock-test sales
17. **Notifications** — compose (audience: all / slot / dues / selected), history,
    automatic reminder settings
18. **Mock tests** (library) — sales to own students, share earned
19. **Settings** — profile & branding/theme, timezone, billing rules, grace & auto-release,
    attendance rules, holidays, receipt/ID prefixes, student app link + QR, install app
20. **Staff** — accounts and permission checkboxes
21. **Platform** (super admin only) — libraries (create, suspend, usage), "open as
    library", platform settings, **content**: series → tests → sections → questions
    editor, CSV/XLSX import with preview, publish; **sales & revenue share** report

**Student app** (`/s/:slug`, installable PWA, branded per library)
1. Login (phone + password) · first-login password change
2. **Home** — my seat(s) & slot(s), next-due card, today's check-in status, latest notice
3. **Check-in** — scan desk QR (camera), result screen (warns outside slot / dues)
4. **Attendance** — month calendar + streak
5. **Fees** — dues, invoices, receipts (view / print / share)
6. **Notifications** — inbox, enable push, devices
7. **Profile** — details, ID card, change password, install app
8. **Store** — catalog by exam, series detail, test detail, checkout
9. **My tests** — owned + free tests, attempts
10. **Test instructions** → **Attempt** (timer, question palette, mark for review,
    section tabs, autosave state) → **Submit confirm**
11. **Result** — score, accuracy, rank, section analysis → **Solutions**
12. **Leaderboard** — all libraries / my library

## 13. Business decisions (confirmed 2026-10-01)

| # | Question | Decision |
|---|---|---|
| D1 | Who creates mock tests; library share | Global (platform-made) first, per-library later. Default library share **20 %**, paid out manually. |
| D2 | Can non-members buy tests? | **No.** Only members created by a library can log in and buy. No public sign-up. |
| D3 | Book a seat in advance for a future hand-over | **No** (v1 holds the seat from booking). |
| D4 | Slot change mid-period | New slot/price from the **next billing period**; immediate change allowed without proration. |
| D5 | First month with month-start billing | **Library setting:** `full` or `prorated` (`first_period_billing`). |
| D6 | Do some seats cost more? | **Yes, several tiers:** seat categories with a monthly surcharge each. |
| D7 | Student login | Phone + password issued by the library (no OTP for now). |
| D8 | Fixed seat vs "sit anywhere" | **Both**, chosen per hall (`seating_mode` fixed / floating), so a library can use either or mix. |
| D9 | GST | Not needed now. |

## 14. Build order (milestones)

Each milestone: plan → code → tests → refactor pass → docs → `npm run verify` → commit →
summary + manual test list.

| # | Milestone | Done when |
|---|---|---|
| 1 | **Skeleton & platform:** workspaces, ESLint/Prettier, `node:test`, shared package (money, time, errors, API client, UI primitives), Express app, error format, migrations runner, auth (staff), super admin seed, platform libraries CRUD/suspend/usage, admin app shell + login + Platform › Libraries. **Deploy smoke test on cPanel** (proves workspaces + ESM + Passenger early). | Super admin creates a library and its admin; admin logs in; suspended library is locked out. |
| 2 | **Settings & layout:** library settings + branding, staff + permissions, seat categories, halls (fixed/floating), tables, seats, bulk generator, layout editor. | Owner builds "Hall A: 10 tables × 6 seats", renames/disables seats; staff without `layout.manage` can't. |
| 3 | **Slots & allocation rules:** slots + plans, `slotCells`, pricing (plan + surcharge), allocation service with cell guard, floating-hall capacity, swap/change/release service + tests (incl. concurrent DB test). | All overlap/capacity tests pass; API rejects Morning + Full Day on one seat. |
| 4 | **Members & seat map:** add/edit member (multi slot + seat picker), uploads, member detail, seat map, seat panel actions, waitlist. | Two students share A-12 Morning/Evening; seat map shows it; swap works. |
| 5 | **Money:** invoice generation, payments with allocation, partial/credit, receipts, void, deposits & refunds, dues screen, expenses, day ledger, CSV, jobs scheduler. | Billing tests pass; partial payment leaves correct dues; ledger matches. |
| 6 ✅ | **Check-in & attendance:** daily code, desk QR/kiosk, slot-time check (off/warn/block), dues gate, check-out, attendance screens. | Check-in outside slot warns/blocks per setting. |
| 7 | **Student app:** login + password change, home, my seat, check-in scan, attendance, fees & receipts, PWA install with per-library manifest, push subscribe. | Student installs app on Android, checks in by QR. |
| 8 | **Notifications & insights:** announcements, inbox, fee-due / seat-expiry / waitlist automations, auto-release job, dashboard + insights. | Reminder arrives once (deduped); occupancy % correct. |
| 9 | **Mock-test content:** platform editor, sections/questions, CSV/XLSX import with preview, publish rules, student preview. | Import 100-question CSV; errors shown per row. |
| 10 | **Mock-test store & attempts:** catalog, pricing, PaymentProvider + Razorpay + webhook + reconcile, entitlements, attempt engine, scoring, results, solutions, leaderboard, sales reports. | Test-mode purchase via webhook only; refresh mid-test resumes; timeout auto-submits. |
| 11 | **Deploy guide & hardening:** `DEPLOY-SHARED-HOSTING.md`, `.env.example`, cron setup, backup notes, security review pass. | Fresh cPanel install following only the guide works. |
