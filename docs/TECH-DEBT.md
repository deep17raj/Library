# Tech debt

Every shortcut, TODO or known limitation gets an entry here (see CLAUDE.md).
Format: **date — area — what — why it was accepted — how to pay it off.**

## Known by design (from ARCHITECTURE.md)

- **2026-10-01 — student-app check-in** — the desk QR encodes `/s/:slug/checkin?code=…`
  and the `qr` method exists, but the student PWA that scans it (and the student
  attendance view) is milestone 7. Until then check-in works via the phone **kiosk**
  (`/api/s/:slug/kiosk/checkin`) and staff marking.
- **2026-10-01 — check-in after check-out** — a third scan the same day reports "already
  checked out" rather than re-opening the session (one in/out pair per booking per day).
  Revisit if libraries want multiple sessions a day.
- **2026-10-01 — rate limiting** — counters are in process memory. Fine for one
  Passenger process; if the app ever runs on more than one process, move them to MySQL.
- **2026-10-01 — mock-test scoring** — multi-select questions are all-or-nothing; no
  partial marking (JEE-Advanced style). Add a `partial_marking` flag per question when needed.
- **2026-10-01 — seat reservations** — an allocation holds its seat from creation, so a
  future hand-over can't be booked in advance (decision D3, ARCHITECTURE §13).
- **2026-10-01 — floating halls** — capacity ("≤ N students per slot cell") is enforced
  only by the service under a hall row lock; MySQL can't express a count limit as a
  constraint. All writes must go through `subscriptions.service`.
- **2026-10-01 — super admin inside a library** — the API accepts `X-Library-Id` from a
  super admin (`middleware/libraryContext.js`, tested), but the admin app has no
  "open as library" switch yet. Add a library picker on the Libraries page that sets
  the header in the API client.
- **2026-10-01 — ending on a future date** — `POST /subscriptions/:id/end` ends today.
  Planned end dates (`end_on` in the future, package expiry) need a job; the scheduler
  exists since milestone 5, the `endFinishedSubscriptions` job comes in milestone 8.

- **2026-10-01 — ID proofs are images only** — uploads are re-encoded with sharp, which
  can't read PDFs. Accept PDFs later by validating the PDF header and storing as-is in
  private storage.
- **2026-10-01 — auto-release of unpaid seats** — `library_settings.auto_release_unpaid`
  and `grace_days` are stored (grace days editable in Settings → Billing rules), but
  nothing releases seats yet; the toggle is hidden. The `releaseUnpaidSeats` job and
  its notifications come with milestone 8.
- **2026-10-01 — receipts print from the browser** — no PDF file is generated; the
  receipt page uses print CSS. Fine for counters with a printer or "Save as PDF";
  add server-side PDF only if libraries ask to send receipts on WhatsApp.
- **2026-10-01 — manual charges have no edit** — a wrong "other" charge is voided
  (unpaid) and re-added; editing amounts would complicate the audit trail.
