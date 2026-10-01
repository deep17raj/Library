# attendance

Check-in and the attendance register (ARCHITECTURE.md §9).

## How a check-in works

1. **Who** — the kiosk resolves the student by phone + the day's code; staff pick the
   member by name. (The student app's QR scan, method `qr`, arrives in milestone 7.)
2. **Which booking & when** — `evaluateCheckin` (shared) finds the active booking whose
   slot contains *now* (library timezone, allowing `slot_early_minutes`). Outside every
   slot it picks the nearest and, per `slot_check_mode`: `off`/`warn` record it (with
   `outside_slot = 1` under `warn`), `block` refuses with `OUTSIDE_SLOT`.
3. **Dues gate** — if the member owes money already due and `allow_overdue_checkin = 0`,
   refuse with `DUES_OVERDUE`. The overdue figure is a fast read from billing
   (`memberOverduePaise`), so check-in never generates invoices.
4. **Record** — insert one row per booking per library-local day. A second check-in the
   same day is a **check-out** (`check_out_at`); the unique key `(subscription_id,
   local_date)` is the DB guard. Staff marking (`markManually`) overrides the slot and
   dues gates but still stores the `outside_slot` / `had_dues` flags.

## The daily code

`lib/dailyCode.js` derives a 6-character code from `HMAC(jwtSecret, tenant + local date)`.
It is never stored and rotates each library-local day, so a photographed QR stops working
the next day. The slot and dues checks do the real gatekeeping.

## Routes

- Admin (`/api/admin`): `GET /checkin/desk` (code + QR target + present count, any staff),
  `GET/POST /attendance` and `GET /export/attendance.csv` (`attendance.manage`),
  `GET /members/:memberId/attendance?month=`.
- Public (`/api/s/:slug`): `POST /kiosk/checkin {phone, code}` — rate-limited per IP+phone,
  library must be active, no staff session.

## Files

- `attendance.service.js` — desk code, kiosk/manual entry points, day/member lists, CSV.
- `checkin.js` — the shared check-in flow (gates → record or check-out).
- `attendance.repository.js` — SQL. `attendance.routes.js` — admin + public kiosk routers.

Pure slot logic and tests live in `packages/shared/src/attendance`; the daily code and its
test in `server/src/lib/dailyCode.js`.
