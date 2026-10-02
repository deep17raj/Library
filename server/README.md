# server

Express API + static hosting for the two apps. Entry: `src/main.js` (via the root
`app.js` on cPanel).

```
src/
  main.js        boot: config → migrations → pool → app → super-admin seed → listen
  app.js         Express app; the only place middleware order is decided
  services.js    builds every service once; cross-module wiring (billing → members, …) is here
  routes.js      mounts every module router; each router receives the whole `services`
  config/        env.js — reads .env once; nothing else touches process.env
  db/            pool, withTransaction/queryOne/queryAll/execute, buildPatch, migration runner
  migrations/    NNN_name.sql, applied once each in order (schema_migrations)
  http/          AppError, errorHandler (API error format), asyncHandler, validateBody
  middleware/    staffAuth, libraryContext (req.ctx + requirePermission), upload (multer),
                 failureThrottle (rate limits + throttled()), requestGuards (CSRF, headers),
                 librarySlug (/api/s/:slug → library), studentAuth (student session,
                 first-password gate)
  lib/           jwt, password, cookies, images (sharp re-encode), bindDeps, csv (export),
                 dailyCode (check-in code), vapid (push keys, push-service allowlist)
  jobs/          scheduler (job_runs, once per interval), jobs.js (the job list),
                 internal.routes.js (POST /api/internal/jobs/run, X-Cron-Secret)
  static/        apps/admin/dist at /admin; the student build at /student + /s/<slug>/
                 (per-library manifest, icons, head tags; /sw.js); storage/public at /files
  modules/       one folder per feature (see each README.md)
testing/         fakes for unit tests, MySQL helpers + integration tests
```

## Adding a module

1. `modules/<name>/` with `<name>.routes.js`, `.controller.js`, `.service.js`,
   `.repository.js`, `.validation.js`, `.test.js`, `README.md` (roles in CLAUDE.md).
2. Service: small module-level functions that take `deps` first, exported through
   `create<Name>Service(deps)` with `bindDeps` — tests pass fake repositories as deps.
3. Repository functions take `(db, tenantId, …)`; `db` is the pool or a transaction.
4. Build the service in `services.js` and mount the router in `routes.js` — library features go under `createAdminRouter`, which
   already applies `requireStaff` + `requireLibrary` (so `req.ctx.tenantId` is set); guard
   each route with `requirePermission(...)`. Add tables in a new `migrations/NNN_*.sql`.

## Tests

`npm test -w server` runs unit tests. Integration tests (HTTP + real MySQL) also run
when `TEST_DATABASE_URL` is set: each integration file gets its own database
`<name>_<suffix>` (dropped and recreated each run) via `testing/testApp.js`, which also
seeds a super admin and creates libraries with signed-in owners.
