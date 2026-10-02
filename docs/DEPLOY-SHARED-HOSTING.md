# Deploying to cPanel shared hosting

> **Draft (milestone 1).** This is the early smoke test: it proves the hosting runs
> this repo's layout (npm workspaces + ES modules + Passenger). Milestone 11 turns it
> into the full guide (cron, backups, push keys, Razorpay).

Requirements: cPanel with **Setup Node.js App** (Node 18 or newer) and MySQL/MariaDB.

## 1. Build on your computer

```
npm install
npm run verify        # lint + tests + build; must pass
```
This creates `apps/admin/dist/` and `apps/student/dist/`. Building on shared hosting is slow and often runs out
of memory, so the built files are uploaded instead.

## 2. Database (cPanel → MySQL Databases)

Create a database and a user, add the user to the database with **All Privileges**.
Note the prefixed names (e.g. `cpuser_library`). No SQL import: tables are created on
first start by `server/src/migrations/`.

## 3. Upload

Zip and upload **everything except** `node_modules/`, `.env`, `.git/` and
`server/storage/` (uploaded logos/photos live there — never overwrite it on a redeploy;
or set `STORAGE_DIR` to a folder outside the app). Make sure the
zip **includes** `apps/admin/dist/` and `apps/student/dist/`. Extract it into the app folder, e.g.
`/home/CPUSER/library.example.com`.

## 4. `.env` in the app folder

Copy `.env.example` to `.env` and set at least:
```
NODE_ENV=production
APP_BASE_URL=https://library.example.com
DB_HOST=localhost
DB_USER=cpuser_libuser
DB_PASSWORD=...
DB_NAME=cpuser_library
JWT_SECRET=<48+ random characters>
SUPER_ADMIN_EMAIL=you@example.com
SUPER_ADMIN_PASSWORD=<strong password, change it in the app after first login>
CRON_SECRET=<32+ random characters>
```
Do **not** set `PORT` (Passenger provides it).

## 4b. Cron (cPanel → Cron Jobs)

Passenger puts an idle app to sleep, so the background jobs (monthly fee invoices
since milestone 5) need a nudge. Add a cron job **every 15 minutes**:
```
curl -fsS -X POST -H "X-Cron-Secret: <CRON_SECRET>" https://library.example.com/api/internal/jobs/run > /dev/null
```
Each job still runs at most once per its interval (recorded in `job_runs`), so calling
more often is harmless. Without `CRON_SECRET` the endpoint refuses every call.

## 5. Setup Node.js App

Create application → Node.js 18+ → mode **Production** → application root = the app
folder → startup file **`app.js`** → Create → **Run NPM Install** → **Restart**.

## 6. Smoke test — report each result

1. `https://library.example.com/api/health` → `{"ok":true}`
2. `https://library.example.com/` → redirects to `/admin/`, login page shows.
3. Sign in with the super-admin email/password → Libraries page.
4. Create a library, sign out, sign in as its owner → Dashboard.
5. As super admin, suspend that library → the owner is signed out on next click.
6. Student app (milestone 7): reactivate it, then open `https://library.example.com/s/<slug>/`
   on an Android phone in Chrome → the library's name and colour show; staff give a
   member app access → sign in with that phone + code → "Install app" appears.

The student app needs **HTTPS** (cPanel AutoSSL / Let's Encrypt) for installing, the
camera scanner and notifications. The push key pair is created by the app on first
use (stored in the database) — nothing to set up.

If something fails, open the app's log (*Setup Node.js App* → the app → log, or
`stderr.log` in the app folder). Things to watch for in this first test:
- **"Cannot find package '@app/shared'"** → *Run NPM Install* did not link the
  workspace packages. Tell me; the fallback is a small change to how the server
  imports the shared code.
- **"Startup failed: … Access denied"** → database name/user/password in `.env`.
- **"JWT_SECRET must be set"** → add a long `JWT_SECRET`.
