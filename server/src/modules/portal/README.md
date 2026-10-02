# portal

The student app's **read side** (`/api/s/:slug/*`): everything is the signed-in
student's own data, assembled from the modules that own it — nothing is stored here.

| Route | What |
|---|---|
| `GET /branding` (public) | name, logo, colour, timezone, contact — the sign-in screen |
| `GET /me` | profile, active bookings (seat/slot), dues summary, today's check-ins |
| `GET /account` | dues summary, invoices, payments (staff notes removed), refunds |
| `GET /payments/:id/receipt` | one of my receipts; someone else's is 404, not 403 |
| `GET /attendance?month=` | a month of visits, days present, streak (absent marks don't count) |
| `POST /checkin {code}` | QR/typed desk code → attendance module (rate-limited per student) |

All but `/branding` and `/me` wait until the temporary password is replaced.
