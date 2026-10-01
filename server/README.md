# server

Express API + static hosting for the two apps. Entry: `src/main.js` (via the root
`app.js` on cPanel).

```
src/
  main.js        boot: config → migrations → pool → app → super-admin seed → listen
  app.js         Express app; the only place middleware order is decided
  routes.js      builds every service once and mounts every module router
  config/        env.js — reads .env once; nothing else touches process.env
  db/            pool, withTransaction/queryOne/queryAll/execute, migration runner
  migrations/    NNN_name.sql, applied once each in order (schema_migrations)
  http/          AppError, errorHandler (API error format), asyncHandler, validateBody
  middleware/    staffAuth, failureThrottle (rate limits), requestGuards (CSRF, headers)
  lib/           jwt, password, cookies, bindDeps
  static/        serves apps/admin/dist at /admin
  modules/       one folder per feature (see each README.md)
testing/         fakes for unit tests, MySQL helpers + integration tests
```

## Adding a module

1. `modules/<name>/` with `<name>.routes.js`, `.controller.js`, `.service.js`,
   `.repository.js`, `.validation.js`, `.test.js`, `README.md` (roles in CLAUDE.md).
2. Service: small module-level functions that take `deps` first, exported through
   `create<Name>Service(deps)` with `bindDeps` — tests pass fake repositories as deps.
3. Repository functions take `(db, tenantId, …)`; `db` is the pool or a transaction.
4. Mount the router in `routes.js`; add tables in a new `migrations/NNN_*.sql`.

## Tests

`npm test -w server` runs unit tests. Integration tests (HTTP + real MySQL) also run
when `TEST_DATABASE_URL` is set; the database it names must end in `_test` and is
dropped and recreated on each run.
