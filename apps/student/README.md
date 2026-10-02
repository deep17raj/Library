# student app

The installable app (PWA) students use: their seat, check-in by QR, attendance, fees and
receipts. **One build serves every library**: Express serves its files at `/student/*`
and the app at `/s/<slug>/`, injecting that library's manifest, icons, colour and name
(`server/src/static/serveStudentApp.js`), so "Install app" puts *that library's* app on
the phone.

```
src/
  main.jsx, router.jsx   entry; routes with basename /s/<slug>
  app/                   cross-feature plumbing:
    library.js           which library (slug from the address bar)
    api.js               API client for /api/s/<slug> (+ platformApi for /api)
    session.js           useMe() — the signed-in student's home data, or null
    branding.js          library name/logo/colour (public), applied to the app
    Shell.jsx            header + bottom tabs; sends to sign-in / first password
    pwa.js               service worker registration, install prompt
    push.js              turn notifications on/off for this phone
    useLibraryClock.js   the library's local date and minute (not the phone's)
  features/
    auth/                sign-in, choose/change password
    home/                today, my seats, my fees, install card
    checkin/             scan the desk QR (BarcodeDetector), link with ?code=, typed code
    attendance/          month calendar + streak
    fees/                dues, bills, receipts (shared ReceiptView)
    me/                  membership card, notifications, install, sign out
public/sw.js             service worker (served at /sw.js, scope /s/<slug>/)
```

Rules: same as the admin app (README there) — server data via each feature's `api.js`,
shared schemas, shared UI and the shared icon dictionary, `docs/UI-GUIDE.md` §9 checklist.
Mobile-first: one column, ≥ 44 px touch targets, 16 px inputs.

**First sign-in [D10]:** staff click "Give app access" on the member page and read out a
6-digit code; the student signs in with phone + code and must choose a password.

Dev: `npm run dev` runs this on http://localhost:5174 — open
`http://localhost:5174/s/<slug>/` (e.g. `/s/demo/`). Install, notifications and the
in-app scanner need the production build over HTTPS (or `localhost`): `npm run build`,
then the Express server at :5060 serves it at `/s/<slug>/`.
