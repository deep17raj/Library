# settings

A library's profile and branding (`library_settings`, one row per library, created
with the library).

| Route | Who | Does |
|---|---|---|
| `GET /api/admin/settings` | any staff | name, address, phone, timezone, brand colour, prefixes, logo URL |
| `PUT /api/admin/settings` | `settings.manage` | save the above (shared `librarySettingsSchema`) |
| `POST /api/admin/settings/logo` | `settings.manage` | multipart field `logo`, JPG/PNG/WebP ≤ 2 MB |
| `DELETE /api/admin/settings/logo` | `settings.manage` | remove the logo |

Rules
- The logo is re-encoded to WebP (max 512 px) with sharp, which also proves it is an
  image and strips metadata. It is stored under `storage/public/<tenant>/` and served
  at `/files/…`. Replacing it deletes the old file (branding, not history).
- The brand colour lives in the `theme` JSON column; both apps derive their shades from
  it with `@app/shared/theme`.
- Billing and attendance rules (also in `library_settings`) get their own sections in
  milestones 5 and 6.
