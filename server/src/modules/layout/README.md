# layout

The physical library: **seat categories** (price tiers, decision D6), **halls**,
**tables** and **seats**. Reading needs any staff login; every change needs
`layout.manage`. Every route answers `{ layout }` — the whole tree
(`layoutTree.js`) — so the editor and seat map redraw from one consistent picture.

| Route                                            | Does                                                           |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `GET /api/admin/layout`                          | `{ categories, halls: [{ …, tables: [{ …, seats }] }] }`       |
| `POST`, `PATCH /api/admin/seat-categories[/:id]` | name, monthly surcharge (paise), archive                       |
| `POST`, `PATCH`, `DELETE /api/admin/halls[/:id]` | name, seating mode (`fixed`/`floating`, D8), category, disable |
| `POST /api/admin/halls/:id/tables`               | add N tables × M seats (`bulkTablesSchema`, ≤ 500 seats)       |
| `PATCH`, `DELETE /api/admin/tables/:id`          | rename / reorder, delete with its seats                        |
| `POST /api/admin/tables/:id/seats`               | add seats to one table                                         |
| `PATCH`, `DELETE /api/admin/seats/:id`           | label, category, features, disable, delete                     |

Rules

- Seat labels ("A-12") are unique in the **library**, case-insensitive. Checked first
  for a message listing the clashes; the unique key `uq_seats_label` decides races.
- Bulk add names tables on from the hall's highest "Table n" (hall row locked) and
  numbers seats from `startNumber` (shared `planTablesWithSeats`, also used for the
  editor's preview).
- New seats in a **fixed** hall get the hall's category; a **floating** hall's
  category applies to all its places, so its seats keep none.
- Only **active** categories of this library can be assigned. Categories are archived,
  never deleted (subscriptions will snapshot their price).
- Deleting a hall/table/seat deletes what it contains; once a seat has history
  (allocations, milestone 3) the foreign key refuses and the API answers `IN_USE`
  ("disable it instead").
- Coming in milestone 3: no seating-mode change while a hall has active subscriptions;
  no disabling a seat that is allocated.

Files: `layout.service.js` (factory) binds `seatCategories.service.js`,
`halls.service.js`, `tablesAndSeats.service.js`; shared checks in `layoutRules.js`;
SQL in `layout.repository.js` and `seatCategories.repository.js`.
