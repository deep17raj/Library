# subscriptions

Seating students: a **subscription** is one member in one time slot on one plan,
sitting either on a numbered seat (fixed hall → a **seat allocation**) or anywhere in
a sit-anywhere hall. This module owns the seat rules (docs/ARCHITECTURE.md §7).

| Route                                             | Who              | Does                                                                                  |
| ------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `GET /api/admin/availability?slotId=`             | any staff        | free seat ids for the slot; per sit-anywhere hall: capacity, busiest use, free places |
| `GET /api/admin/seat-map?hallId=` | any staff | tables → seats with current occupants (all slots); sit-anywhere halls: occupants + capacity |
| `GET /api/admin/seats/:id/history` | any staff | who sat on the seat, current first |
| `GET /api/admin/members/:memberId/subscriptions`  | any staff        | a member's subscriptions (active first)                                               |
| `GET /api/admin/subscriptions/:id`                | any staff        | one subscription                                                                      |
| `POST /api/admin/members/:memberId/subscriptions` | `seats.allocate` | `{ slotId, planId, seatId \| hallId, startOn?, collection?, lockerFeePaise? }`        |
| `POST /api/admin/subscriptions/:id/move`          | `seats.allocate` | `{ seatId \| hallId }` — other seat/hall, same slot                                   |
| `POST /api/admin/subscriptions/:id/change-slot`   | `seats.allocate` | `{ slotId, planId, seatId \| hallId }`                                                |
| `POST /api/admin/subscriptions/swap`              | `seats.allocate` | `{ subscriptionA, subscriptionB }` — two numbered-seat students trade                 |
| `POST /api/admin/subscriptions/:id/end`           | `seats.allocate` | `{ reason: "left" \| "admin" }` — ends today, frees the seat                          |

## Rules

1. **One seat, no overlapping slots.** Morning + Evening on A-12 is fine; Morning +
   Full Day is not (`SEAT_SLOT_TAKEN`, naming who holds it). Checked in
   `placementRules.js`, then enforced by MySQL: each active allocation writes one
   `seat_allocation_cells` row per 30-minute cell, and `PRIMARY KEY (seat_id, cell)`
   refuses a second holder even if a code path skipped the check.
2. **A student can't hold two overlapping slots** (`MEMBER_SLOT_OVERLAP`).
3. **Sit-anywhere halls**: at every moment of the slot, students there < active seats
   (`HALL_SLOT_FULL`). Service-only rule under a hall row lock (see TECH-DEBT).
4. **Price** = plan price + seat/hall category surcharge (shared `subscriptionPrice`),
   copied onto the subscription.
5. **Mid-period changes** (decision D4): a slot change, or a move to a seat whose
   category price differs, **ends the subscription and starts a new one** today; the new
   one's `bills_from` is the old one's next period start (shared `nextPeriodStart`), so
   the new price applies from the next period with no proration. A move at the same
   price keeps the subscription. `previous_subscription_id` links the chain.
6. **Swaps** only between numbered seats; each side follows rule 5.
7. **Slot times changing** (`rescheduleSlot`, called by the slots module): everyone
   in the slot moves together — refused (`SLOT_CHANGE_CONFLICT`) if any seat, student
   or sit-anywhere hall would then break rules 1–3; otherwise their cells move.

## Locking (why it can't double-book or deadlock)

Every change runs in one transaction and locks in this order: **member** row →
**slot** (shared; changing a slot's times takes it exclusively) → **seat** or **hall**
row (two seats: lower id first). Two requests for one seat queue on the seat lock; the
second sees the first's allocation and is refused. An integration test races five
bookings for one seat: exactly one wins.

## Files

`subscriptions.service.js` (factory) · `create.js` (`seatMember` inside a caller's
transaction — the members module uses it — and `createSubscription`) · `changes.js`
(move, change slot, swap, end) · `lifecycle.js` (start/finish/replace) · `placement.js`
(lock + occupy places) · `placementRules.js` (pure rules + their errors) ·
`reschedule.js` · `availability.js` · `seatMap.js` · SQL in `subscriptions.repository.js`
and `allocations.repository.js`.

Not yet: ending on a future date (needs the scheduler, milestone 5) and invoices
(milestone 5 reads `bills_from`, price and period from here).
