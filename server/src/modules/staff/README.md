# staff

Staff logins of one library. Every route needs `staff.manage` (owners have it).

| Route                                | Does                                                          |
| ------------------------------------ | ------------------------------------------------------------- |
| `GET /api/admin/staff`               | owners (read-only) and staff of this library                  |
| `POST /api/admin/staff`              | new staff login: name, email, temporary password, permissions |
| `PATCH /api/admin/staff/:id`         | name, permissions, `active` / `disabled`                      |
| `POST /api/admin/staff/:id/password` | set a new password (signs them out everywhere)                |

Rules

- Only `staff` accounts are changed here; owner logins are managed by the super admin.
- **You can only give or remove permissions you hold yourself** — a staff member with
  `staff.manage` cannot hand out the owner's other powers.
- Nobody changes their own permissions or status.
- Permissions are read on every request (see auth), so changes apply immediately;
  disabling or a password reset also ends open sessions (`token_version`).
- SQL lives in `auth/users.repository.js` (library-scoped functions filter on `tenant_id`).
