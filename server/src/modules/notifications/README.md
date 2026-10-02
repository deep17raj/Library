# Notifications module

Library announcements and automated system notifications sent to students.

## What it does

- **Announcements** — staff compose a notification (title + body), pick an audience
  (all active members, members with dues, a slot's members, or specific members),
  and send. Each recipient gets an inbox entry and a push notification.
- **Inbox** — students list their notifications, mark them read, and see their
  unread count (shown as a badge).
- **System notifications** — fee-due reminders, seat-expiry warnings, and
  waitlist-offer notices are created by background jobs via `sendSystemNotification`,
  which deduplicates by `dedupe_key` so reminders arrive exactly once.
- **Push** — every notification is pushed to the recipient's subscribed browsers
  (via the push module); 404/410 responses clean up stale subscriptions.

## Tables

- `notifications` — one row per notification (kind, title, body, audience, dedupe).
- `notification_recipients` — one row per recipient; `read_at` tracks reads.

## Rules

- `notifications.send` permission for admin announce routes.
- System notifications skip the permission check (called by jobs).
- Dedupe key format: `fee_due:<invoiceId>:d-<N>`, `seat_expiry:<subId>`,
  `waitlist_offer:<entryId>`.
