# waitlist

People waiting for a seat in a slot that is full (`waitlist_entries`). Reading needs
any staff login; changes need `members.manage`.

| Route                                            | Does                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `GET /api/admin/waitlist?slotId=&view=open\|all` | entries in arrival order, each with its `position` in its slot's queue |
| `POST /api/admin/waitlist`                       | `{ slotId, name, phone, preferredFeatures, note }`                     |
| `PATCH /api/admin/waitlist/:id`                  | `waiting` / `offered` / `cancelled`, or the note                       |

Rules

- The queue is per slot in arrival order (`queue_no`, an auto-increment — `created_at` is only to the second); `offered` keeps its place (the person was
  called but hasn't decided).
- **Converting**: the "add member" form sends `waitlistEntryId`; the members module
  marks the entry `converted` and links the member **in the same transaction** as the
  member is created (`waitlistConverter`). Converted and cancelled entries are final.
- Automatic "a seat is free" notifications arrive with milestone 8.
