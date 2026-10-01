# slots

Time slots (Morning 06:00–12:00, Night 22:00–06:00…) and their **plans** — the only
place prices live. Reading needs any staff login; changes need `slots.manage`.
Every route answers `{ slots: [{ …slot, monthlyFeePaise, plans }] }`.

| Route                             | Does                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/slots`            | slots with plans                                                                                            |
| `POST /api/admin/slots`           | name, `startMin`/`endMin` (minutes after midnight), `monthlyFeePaise` → slot + its default **Monthly** plan |
| `PATCH /api/admin/slots/:id`      | rename, recolour, archive, or change times                                                                  |
| `POST /api/admin/slots/:id/plans` | extra plans: "Quarterly, 3 months, ₹2,200", "15 days, ₹500"                                                 |
| `PATCH /api/admin/plans/:id`      | rename, reprice, archive                                                                                    |

Rules

- Slot times sit on the 30-minute grid and may run past midnight (`end < start`);
  shared `slots/slotCells.js` does the maths.
- **Changing a slot's times** is checked against everyone holding it: no new clash on
  any seat, no student now overlapping their own other slot, no sit-anywhere hall over
  capacity. If it fits, their seat cells move in the same transaction; if not, the API
  answers `SLOT_CHANGE_CONFLICT` naming who clashes. (`rescheduleSlot` comes from the
  subscriptions module, which owns the cells.)
- A plan's length and unit can't change after creation; its price can, and applies
  to new subscriptions only — each subscription keeps a copy of what it agreed.
- The default (Monthly) plan can't be archived; archive the slot instead.
  Archived slots/plans can't be chosen for new subscriptions; existing ones continue.
