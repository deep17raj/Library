import crypto from "node:crypto";
import { bindDeps } from "../../lib/bindDeps.js";
import * as notifRepo from "./notifications.repository.js";

/**
 * @typedef {object} NotificationsDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof notifRepo} repo
 * @property {{ sendToMembers: (tenantId: string, memberIds: string[], payload: object) => Promise<{sent:number,failed:number}> }} push
 */

export function createNotificationsService({ db, push, repo = notifRepo }) {
  return bindDeps(
    { db, repo, push },
    {
      announce,
      previewAudience,
      listNotifications: list,
      listInbox,
      markRead,
      unreadCount,
      latestNotice,
      sendSystemNotification,
    },
  );
}

async function announce(deps, ctx, input) {
  const { title, body, url, audience } = input;
  const memberIds = await deps.repo.memberIdsForAudience(deps.db, ctx.tenantId, audience);
  const id = crypto.randomUUID();
  await deps.repo.insertNotification(deps.db, ctx.tenantId, {
    id,
    kind: "announcement",
    title,
    body,
    url: url || "",
    audience,
    recipientsCount: memberIds.length,
    createdBy: ctx.actor.id,
  });
  if (memberIds.length > 0) {
    await deps.repo.insertRecipients(deps.db, ctx.tenantId, id, memberIds);
  }
  const { sent, failed } = await deps.push.sendToMembers(
    ctx.tenantId,
    memberIds,
    pushPayload({ kind: "announcement", title, body, url }),
  );
  await deps.repo.updatePushCounts(deps.db, ctx.tenantId, id, sent, failed);
  return { id, recipientsCount: memberIds.length, pushSent: sent, pushFailed: failed };
}

async function previewAudience(deps, ctx, audience) {
  const count = await deps.repo.recipientCountForAudience(deps.db, ctx.tenantId, audience);
  return { count };
}

async function list(deps, ctx, query) {
  return deps.repo.listNotifications(deps.db, ctx.tenantId, query);
}

async function listInbox(deps, ctx, query) {
  return deps.repo.listInbox(deps.db, ctx.tenantId, ctx.actor.id, query);
}

async function markRead(deps, ctx, notificationId) {
  await deps.repo.markRead(deps.db, ctx.tenantId, ctx.actor.id, notificationId);
}

async function unreadCount(deps, ctx) {
  return deps.repo.unreadCount(deps.db, ctx.tenantId, ctx.actor.id);
}

async function latestNotice(deps, ctx) {
  return deps.repo.latestNoticeForMember(deps.db, ctx.tenantId, ctx.actor.id);
}

async function sendSystemNotification(deps, tenantId, input) {
  const { kind, title, body, url, audience, dedupeKey, memberIds: explicitIds } = input;
  if (dedupeKey) {
    const exists = await deps.repo.dedupeKeyExists(deps.db, tenantId, dedupeKey);
    if (exists) return null;
  }
  const memberIds =
    explicitIds || (await deps.repo.memberIdsForAudience(deps.db, tenantId, audience));
  if (memberIds.length === 0) return null;
  const id = crypto.randomUUID();
  await deps.repo.insertNotification(deps.db, tenantId, {
    id,
    kind,
    title,
    body,
    url: url || "",
    audience,
    dedupeKey,
    recipientsCount: memberIds.length,
  });
  await deps.repo.insertRecipients(deps.db, tenantId, id, memberIds);
  const { sent, failed } = await deps.push.sendToMembers(
    tenantId,
    memberIds,
    pushPayload({ kind, title, body, url }),
  );
  await deps.repo.updatePushCounts(deps.db, tenantId, id, sent, failed);
  return { id, recipientsCount: memberIds.length, pushSent: sent, pushFailed: failed };
}

/** Money and seat matters are urgent (stay on screen, stronger buzz); notices are not. */
const URGENT_KINDS = new Set(["fee_due", "seat_expiry"]);

/**
 * The payload the service worker renders. `tag` collapses repeat reminders of the same
 * kind into one on the phone; `important` turns on `requireInteraction` + a stronger buzz.
 */
function pushPayload({ kind, title, body, url }) {
  return { title, body, url: url || "", tag: kind, important: URGENT_KINDS.has(kind) };
}
