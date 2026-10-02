# students

Student-app **accounts** — the login side of a member (ARCHITECTURE.md §4, decision D10).

- **Give / reset access** (`POST /api/admin/members/:memberId/app-access`, `members.manage`):
  a random 6-digit temporary password, returned once to staff and never logged. Sets
  `must_change_password` and bumps `token_version` (a reset signs the student out
  everywhere). `GET …/app-access` → `{ granted, mustChangePassword, lastLoginAt }`.
- **Sign in** (`POST /api/s/:slug/auth/login`, rate-limited per IP + library + phone):
  phone + password. A wrong password, an unknown number and a member without access
  all give the same error, after the same hash work.
- **Session**: cookie `sl_student`, path `/api/s/<slug>` (so two libraries on one phone
  don't clash), 60 days. Tokens are signed with a key derived from `JWT_SECRET` for
  students only, so staff and student tokens can't stand in for each other; the token's
  library must match the URL's. Every request re-reads the member (status, version).
- **First password**: until the student picks their own password, only `/me`, the
  password change and sign-out work (`requirePasswordChanged` → `PASSWORD_CHANGE_REQUIRED`).

Files: `students.repository.js` (the login columns of `members` only — the hash never
travels with a member profile), `students.service.js`, `students.routes.js`, tests in
`students.test.js` and `server/testing/student.integration.test.js`.
