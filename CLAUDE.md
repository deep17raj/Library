# CLAUDE.md — Study Library

Multi-tenant SaaS for paid self-study libraries (students rent a seat for a time slot)
plus a mock-test store. **Read `docs/ARCHITECTURE.md` before changing anything.**
`docs/GYM-REFERENCE-NOTES.md` explains what was learned from the earlier gym app.

Stack: Node 18+, Express, MySQL (mysql2), plain JavaScript (ES modules) with JSDoc
types · React + Vite + Tailwind PWAs · deployed on cPanel shared hosting (one Node
process serves the API and both apps).

## Workflow

- Build milestone by milestone, in the order in `docs/ARCHITECTURE.md` §14.
- For each milestone: short plan → code → tests → **refactor pass** → update docs →
  `npm run verify` (lint + tests + build) → commit → short summary with a list of
  things to test by hand.
- **Ask the user when a business decision is unclear** instead of guessing. Open
  questions are tracked in ARCHITECTURE.md §13.
- Never say a milestone is done until lint, tests and build all pass.
- Commit after each milestone with a clear message.

## Structure

```
apps/admin/      React admin app (owner, staff, super admin "Platform" area)
apps/student/    React student PWA
packages/shared/ code used by both apps AND the server: constants, validation
                 schemas, money/time/billing/slot/scoring helpers, API client, UI primitives
server/          Express API
docs/            architecture + module docs
```

**Organise by feature, not by file type.**

Backend module, e.g. `server/src/modules/seats/`:
| File | Contains |
|---|---|
| `seats.routes.js` | URL + middleware → controller. Nothing else. |
| `seats.controller.js` | Read request, call service, send response. No SQL, no business rules. |
| `seats.service.js` | Business rules (overlap checks, allocation), transactions. |
| `seats.repository.js` | SQL only. Every function takes `(db, tenantId, …)`. |
| `seats.validation.js` | Input validation (uses the shared schema). |
| `seats.test.js` | Tests for the service rules. |
| `README.md` | What this module does, in plain words. |

Frontend feature, e.g. `apps/admin/src/features/seats/`:
`SeatMapPage.jsx`, `components/`, `hooks/`, `api.js`.
Server state via TanStack Query hooks inside the feature; no app-wide data store.

## Readability

- One responsibility per file. **Soft limit 250 lines per file, 50 lines per function**;
  if exceeded, split.
- Clear names over short names (`allocateSeatForSlot`, not `alloc`).
- **No duplicated logic.** If two places need it, move it to `packages/shared` or a service.
- Comments explain **why**, not what. Every module has a short `README.md`.
- **Money:** integer paise everywhere (`*_paise` columns, `amountPaise` in JS). Format
  only with the shared money helpers.
- **Time:** instants stored in UTC (`DATETIME`); business dates (`DATE`) are
  library-local, computed from UTC + `library_settings.timezone` with the shared time
  helpers. Never call `new Date()` to decide "today" outside those helpers.
  Slot clock times are minutes after local midnight.
- **Validation runs on client and server using the same shared schema.**
- **API error format, always:** `{ error: { code, message, fields } }`. Throw `AppError`
  with a code from `packages/shared/src/constants/errorCodes.js`.
- All business data lives on the server (no business data in `localStorage`).
- Never hard-delete money or history: void payments, end allocations/subscriptions.

## Refactoring — ALWAYS

- After finishing each milestone, do a refactor pass before starting the next:
  remove duplication, split large files, rename unclear things, delete dead code,
  update module READMEs and `docs/ARCHITECTURE.md` if anything changed.
- Before adding a feature to an existing file, check whether that file should be split first.
- When code is replaced, delete the old code in the same change (no `legacy/` folders).
- Never leave a TODO/hack without an entry in `docs/TECH-DEBT.md`.

## Quality

- Write tests for business rules — seat/slot overlap, billing/dues, mock-test scoring,
  payment webhook — and run them after every change (`npm test`).
- Run `npm run verify` (lint + tests + build) before saying a milestone is done.
- Tests use `node:test`. Pure rules are tested in `packages/shared`; service rules with
  fake repositories; DB guarantees (unique keys, concurrency) with integration tests that
  run when `TEST_DATABASE_URL` is set.

## Security

- **`tenant_id` is checked on every query.** Repositories take `tenantId` explicitly;
  never read it from the request body. Child tables use composite FKs `(tenant_id, parent_id)`.
- **Role/permission checks on every admin route** (`requirePermission('…')`).
- **Rate-limit** login, check-in and payment endpoints.
- **Validate uploads:** type, size, re-encode images with sharp; ID proofs go to private storage.
- Never trust the client for "paid": only a verified gateway signature/webhook marks an order paid.
- Secrets only in `.env`; never log tokens, passwords, or full payment payloads.

## Commands (once milestone 1 exists)

```
npm install            install all workspaces
npm run dev            server + both apps in watch mode
npm test               all node:test suites
npm run lint           ESLint + Prettier check
npm run build          build admin + student apps
npm run verify         lint + test + build — must pass before a commit
```
