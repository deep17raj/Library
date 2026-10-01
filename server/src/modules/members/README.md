# members

Students of a library (`members` table). Reading needs any staff login; changes and
the ID proof need `members.manage`. Seat bookings are created through this module but
belong to the subscriptions module (`seatMember`, inside this module's transaction).

| Route                                                       | Does                                                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/members?q=&status=&slotId=&page=&pageSize=` | page of members (name/phone/code search), each with where they sit now (`placements`)                     |
| `POST /api/admin/members`                                   | profile + `bookings: [{ slotId, planId, seatId \| hallId, lockerFeePaise }]` + optional `waitlistEntryId` |
| `GET /api/admin/members/:id`                                | `{ member, subscriptions, seatHistory }`                                                                  |
| `PATCH /api/admin/members/:id`                              | profile fields, `active` / `inactive`                                                                     |
| `POST`, `DELETE /api/admin/members/:id/photo`               | multipart `photo` (≤ 5 MB) → 400 px WebP, public                                                          |
| `POST /api/admin/members/:id/id-proof`                      | multipart `idProof` (≤ 8 MB) → 1600 px WebP, **private**                                                  |
| `GET /api/admin/members/:id/id-proof`                       | the ID proof, only through this route, `no-store`                                                         |

Rules

- **All or nothing:** the member, every booking and the waitlist conversion are one
  transaction. A taken seat in booking 2 saves nothing and the error's fields point at
  that row (`bookings.1.seatId`).
- **Member code** = library prefix (Settings, default `S`) + a per-library sequence
  starting at 1001 (`db/counters.js`, row-locked, so no two members share a number).
- **Mobile number** is unique within a library (`PHONE_TAKEN`, naming who has it); the
  unique key decides races.
- A member with active bookings can't be marked inactive — end the bookings first.
- The API never returns storage paths: `photoUrl` (public `/files/…`) and `hasIdProof`.
  ID proofs live in `storage/private`, which no static route serves.
- Not yet: PDF ID proofs (images only, see TECH-DEBT); student login password (M7).

Files: `members.service.js` (list, detail, create, update), `memberFiles.js` (photo,
ID proof), SQL in `members.repository.js`.
