# push

Web Push for the student app. Milestone 7 lets students **turn notifications on**;
sending (fee reminders, notices) arrives with milestone 8.

- **VAPID keys**: generated on first use (`lib/vapid.js`), stored once in
  `platform_settings.vapid_keys` (insert-if-absent, so two first requests can't make two
  pairs). Nothing to configure on cPanel. `GET /api/push/public-key` (public).
- **Subscriptions** (`/api/s/:slug/push/subscribe | unsubscribe | devices`): one row per
  browser (`endpoint_hash` unique); only real push services' https endpoints are
  accepted (we will POST to them — no arbitrary hosts). Endpoints and keys never go
  back to the client; devices are labelled from the user agent ("Chrome on Android").
