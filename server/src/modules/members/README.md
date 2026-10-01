# members

Students of a library (`members` table, created in migration 003).

So far this module only has `members.repository.js` with `findMember` and
`lockMember` — the subscriptions module locks a member first in every seating change,
so two changes for one student can't race. Creating, editing, listing members,
photos and ID proofs arrive in milestone 4; until then integration tests insert
members with `server/testing/seed.js`.
