# platform

What the **super admin** (platform owner) manages. Every route needs role `super_admin`.

| Route | Does |
|---|---|
| `GET /api/platform/libraries` | All libraries with owner count and last staff sign-in |
| `POST /api/platform/libraries` | Create a library **and** its first owner login (one transaction) |
| `GET /api/platform/libraries/:id` | Library, usage numbers, owner/staff accounts |
| `PATCH /api/platform/libraries/:id` | Rename; set its mock-test revenue share (`null` = platform default) |
| `PATCH /api/platform/libraries/:id/status` | `active` / `suspended` — suspended libraries' staff are signed out at once |
| `POST /api/platform/libraries/:id/owners` | Add another owner login |
| `PATCH /api/platform/users/:id/status` | Enable / disable an owner or staff login |
| `GET`, `PUT /api/platform/settings` | Platform defaults (mock-test share, 20 % — decision D1) |

Rules
- Library slug (the student-app link `/s/<slug>`) and login emails are unique; the
  service checks first for a friendly message and the DB unique keys decide races.
- Creating a library also creates its `library_settings` row with schema defaults.
- Every change writes an `audit_log` row in the same transaction.
- `usage` currently counts accounts and last sign-in; members, seats and storage are
  added by later milestones.
