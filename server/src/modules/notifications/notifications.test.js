import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDb } from "../../../testing/fakes.js";
import { createNotificationsService } from "./notifications.service.js";

const TENANT = "lib-1";
const CTX = { tenantId: TENANT, actor: { kind: "staff", id: "staff-1" } };

function fakeRepo() {
  const notifications = [];
  const recipients = [];
  const dedupeKeys = new Set();
  return {
    notifications,
    recipients,
    dedupeKeys,
    memberIdsForAudience: async () => ["m-1", "m-2"],
    recipientCountForAudience: async () => 2,
    insertNotification: async (db, tenantId, data) => notifications.push({ tenantId, ...data }),
    insertRecipients: async (db, tenantId, notifId, memberIds) =>
      recipients.push(...memberIds.map((id) => ({ notifId, memberId: id }))),
    updatePushCounts: async () => {},
    dedupeKeyExists: async (db, tenantId, key) => dedupeKeys.has(key),
    listNotifications: async () => ({ items: [], total: 0, pageSize: 20 }),
    listInbox: async () => ({ items: [], total: 0, pageSize: 20 }),
    markRead: async () => {},
    unreadCount: async () => ({ count: 0 }),
    latestNoticeForMember: async () => null,
  };
}

function fakePush() {
  const calls = [];
  return {
    calls,
    sendToMembers: async (tenantId, memberIds, payload) => {
      calls.push({ tenantId, memberIds, payload });
      return { sent: memberIds.length, failed: 0 };
    },
  };
}

test("announce creates notification, inserts recipients and pushes", async () => {
  const repo = fakeRepo();
  const push = fakePush();
  const service = createNotificationsService({ db: fakeDb(), push, repo });
  const result = await service.announce(CTX, {
    title: "Library closed",
    body: "We are closed tomorrow",
    audience: { type: "all" },
  });
  assert.equal(result.recipientsCount, 2);
  assert.equal(result.pushSent, 2);
  assert.equal(repo.notifications.length, 1);
  assert.equal(repo.notifications[0].kind, "announcement");
  assert.equal(repo.recipients.length, 2);
  assert.equal(push.calls.length, 1);
  assert.equal(push.calls[0].payload.title, "Library closed");
});

test("sendSystemNotification skips if dedupe key already exists", async () => {
  const repo = fakeRepo();
  repo.dedupeKeys.add("fee_due:inv-1:d-3");
  const push = fakePush();
  const service = createNotificationsService({ db: fakeDb(), push, repo });
  const result = await service.sendSystemNotification(TENANT, {
    kind: "fee_due",
    title: "Fee due",
    body: "Your fee is due in 3 days",
    audience: { type: "all" },
    dedupeKey: "fee_due:inv-1:d-3",
  });
  assert.equal(result, null);
  assert.equal(repo.notifications.length, 0);
  assert.equal(push.calls.length, 0);
});

test("sendSystemNotification sends when dedupe key is new", async () => {
  const repo = fakeRepo();
  const push = fakePush();
  const service = createNotificationsService({ db: fakeDb(), push, repo });
  const result = await service.sendSystemNotification(TENANT, {
    kind: "seat_expiry",
    title: "Seat expiry",
    body: "Your seat expires in 2 days",
    audience: { type: "all" },
    dedupeKey: "seat_expiry:sub-1:d-2",
  });
  assert.equal(result.recipientsCount, 2);
  assert.equal(repo.notifications.length, 1);
  assert.equal(repo.notifications[0].kind, "seat_expiry");
});

test("sendSystemNotification skips when audience is empty", async () => {
  const repo = fakeRepo();
  repo.memberIdsForAudience = async () => [];
  const push = fakePush();
  const service = createNotificationsService({ db: fakeDb(), push, repo });
  const result = await service.sendSystemNotification(TENANT, {
    kind: "fee_due",
    title: "Fee due",
    body: "test",
    audience: { type: "all" },
    dedupeKey: "fee_due:inv-99:d-3",
  });
  assert.equal(result, null);
  assert.equal(repo.notifications.length, 0);
});

test("previewAudience returns count", async () => {
  const repo = fakeRepo();
  const service = createNotificationsService({ db: fakeDb(), push: fakePush(), repo });
  const result = await service.previewAudience(CTX, { type: "all" });
  assert.equal(result.count, 2);
});
