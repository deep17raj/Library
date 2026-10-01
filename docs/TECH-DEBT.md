# Tech debt

Every shortcut, TODO or known limitation gets an entry here (see CLAUDE.md).
Format: **date — area — what — why it was accepted — how to pay it off.**

## Known by design (from ARCHITECTURE.md)

- **2026-10-01 — rate limiting** — counters are in process memory. Fine for one
  Passenger process; if the app ever runs on more than one process, move them to MySQL.
- **2026-10-01 — mock-test scoring** — multi-select questions are all-or-nothing; no
  partial marking (JEE-Advanced style). Add a `partial_marking` flag per question when needed.
- **2026-10-01 — seat reservations** — an allocation holds its seat from creation, so a
  future hand-over can't be booked in advance (decision D3, ARCHITECTURE §13).
- **2026-10-01 — floating halls** — capacity ("≤ N students per slot cell") is enforced
  only by the service under a hall row lock; MySQL can't express a count limit as a
  constraint. All writes must go through `subscriptions.service`.
