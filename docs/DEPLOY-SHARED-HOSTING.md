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
This creates `apps/admin/dist/`. Building on shared hosting is slow and often runs out
of memory, so the built files are uploaded instead.

## 2. Database (cPanel → MySQL Databases)

Create a database and a user, add the user to the database with **All Privileges**.
Note the prefixed names (e.g. `cpuser_library`). No SQL import: tables are created on
first start by `server/src/migrations/`.

## 3. Upload

Zip and upload **everything except** `node_modules/`, `.env`, `.git/` and
`server/storage/` (uploaded logos/photos live there — never overwrite it on a redeploy;
or set `STORAGE_DIR` to a folder outside the app). Make sure the
zip **includes** `apps/admin/dist/`. Extract it into the app folder, e.g.
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
```
Do **not** set `PORT` (Passenger provides it).

## 5. Setup Node.js App

Create application → Node.js 18+ → mode **Production** → application root = the app
folder → startup file **`app.js`** → Create → **Run NPM Install** → **Restart**.

## 6. Smoke test — report each result

1. `https://library.example.com/api/health` → `{"ok":true}`
2. `https://library.example.com/` → redirects to `/admin/`, login page shows.
3. Sign in with the super-admin email/password → Libraries page.
4. Create a library, sign out, sign in as its owner → Dashboard.
5. As super admin, suspend that library → the owner is signed out on next click.

If something fails, open the app's log (*Setup Node.js App* → the app → log, or
`stderr.log` in the app folder). Things to watch for in this first test:
- **"Cannot find package '@app/shared'"** → *Run NPM Install* did not link the
  workspace packages. Tell me; the fallback is a small change to how the server
  imports the shared code.
- **"Startup failed: … Access denied"** → database name/user/password in `.env`.
- **"JWT_SECRET must be set"** → add a long `JWT_SECRET`.
