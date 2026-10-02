# Handoff: next task is Milestone 8

Milestones 1–7 are done and committed (last: `5202166` student app). `npm run verify`
passes. Read `CLAUDE.md`, `docs/ARCHITECTURE.md` (§8.5 jobs, §10–11 routes, §14),
`docs/UI-GUIDE.md` (§9 checklist, §11 notes) and `docs/TECH-DEBT.md` first.

## Milestone 8 — Notifications & insights

Done when: a reminder arrives once (deduped); occupancy % is correct.

Build:
1. **Notifications**: `notifications` + `notification_recipients` tables (schema in
   ARCHITECTURE §6), announcements from admin (audience: all / dues / slot / members,
   live recipient count, `notifications.send`), student **inbox** + mark read (add a
   student tab or Me entry; routes `/s/:slug/notifications`).
2. **Sending push**: add `web-push`, use VAPID keys from `platform_settings.vapid_keys`
   (`server/src/modules/push`). Delete subscriptions on 404/410. Rows in
   `push_subscriptions` already exist (M7 is subscribe-only).
3. **Automations** in `server/src/jobs/jobs.js` (scheduler exists, only
   `generate-invoices` built): `sendFeeReminders` (`fee_reminder_days_before`, dedupe),
   `sendSeatExpiryReminders`, `endFinishedSubscriptions`, `releaseUnpaidSeats`
   (`grace_days`; the `auto_release_unpaid` toggle is hidden in Settings → Billing rules,
   enable it), waitlist-offer notice. Cron hits `POST /api/internal/jobs/run`.
4. **Insights** (`insights.view`): occupancy % per slot, revenue per month (exclude
   deposits), dues ageing, new vs churned, attendance rate per slot (§8.4). One question
   per chart, titled, with units (UI-GUIDE §11).
5. Add a `[D?]` decision only if a business rule is unclear — **ask the user** (e.g.
   quiet hours, reminder wording).

## Rules that bit before
- Every milestone: plan → code → tests → refactor pass → docs → `npm run verify` → commit.
- Integration tests need `TEST_DATABASE_URL` (see `.env`); run `npm run verify` with it set.
- ≤250 lines/file, ≤50 lines/function (ESLint warns). Update module READMEs, ARCHITECTURE,
  UI-GUIDE §10/§11, TECH-DEBT (remove items you resolve: "notifications are subscribe-only").
- Dates via shared time helpers, never `new Date()` for business days; money in paise.
- Heredocs can drop backslashes in regexes — use the Write tool for files with regexes.
- Commit message ends with the attribution line given in the session reminder.
