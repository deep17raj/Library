# auth

Sign-in for **staff, owners and super admins** (students sign in separately, milestone 7).

- `POST /api/auth/login` — email + password → HttpOnly cookie `sl_staff` (JWT, 12 h).
  Rate-limited: 8 failures per IP + email per 15 minutes; a success clears the count.
- `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/password`.

Rules

- Every request re-reads the user: a **disabled user**, a **changed password**
  (`token_version` bump) or a **suspended library** ends the session immediately.
- Unknown email and wrong password give the same error and take the same time.
- Passwords: scrypt (`lib/password.js`). Tokens: HS256 (`lib/jwt.js`).
- The super admin is created from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` on the
  first boot only (`ensureSuperAdmin`); after that, the password is changed in the app.

Files: `users.repository.js` owns all SQL for the `users` table and is reused by the
platform module. `middleware/staffAuth.js` (`requireStaff`, `requireRole`) uses
`resolveSession` from this service.
