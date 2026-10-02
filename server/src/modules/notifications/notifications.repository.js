import { execute, queryAll, queryOne } from "../../db/transaction.js";

export async function insertNotification(db, tenantId, n) {
  await execute(
    db,
    `INSERT INTO notifications
       (id, tenant_id, kind, title, body, url, audience, dedupe_key, recipients_count, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      n.id,
      tenantId,
      n.kind,
      n.title,
      n.body,
      n.url || "",
      n.audience ? JSON.stringify(n.audience) : null,
      n.dedupeKey ?? null,
      n.recipientsCount ?? 0,
      n.createdBy ?? null,
    ],
  );
}

export async function insertRecipients(db, tenantId, notificationId, memberIds) {
  if (memberIds.length === 0) return;
  const rows = memberIds.map((mid) => [notificationId, mid, tenantId]);
  await execute(
    db,
    "INSERT INTO notification_recipients (notification_id, member_id, tenant_id) VALUES ?",
    [rows],
  );
}

export async function updatePushCounts(db, tenantId, notificationId, sent, failed) {
  await execute(
    db,
    `UPDATE notifications SET push_sent = ?, push_failed = ?
      WHERE tenant_id = ? AND id = ?`,
    [sent, failed, tenantId, notificationId],
  );
}

export async function listNotifications(db, tenantId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const rows = await queryAll(
    db,
    `SELECT id, kind, title, body, url, audience, dedupe_key, recipients_count,
            push_sent, push_failed, created_by, created_at
       FROM notifications WHERE tenant_id = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [tenantId, pageSize, offset],
  );
  const countRow = await queryOne(
    db,
    "SELECT COUNT(*) AS total FROM notifications WHERE tenant_id = ?",
    [tenantId],
  );
  return {
    items: rows.map(toNotification),
    total: Number(countRow?.total ?? 0),
    page,
    pageSize,
  };
}

export async function listInbox(db, tenantId, memberId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const rows = await queryAll(
    db,
    `SELECT n.id, n.kind, n.title, n.body, n.url, n.created_at, nr.read_at
       FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
      WHERE nr.tenant_id = ? AND nr.member_id = ?
      ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
    [tenantId, memberId, pageSize, offset],
  );
  const countRow = await queryOne(
    db,
    `SELECT COUNT(*) AS total FROM notification_recipients
      WHERE tenant_id = ? AND member_id = ?`,
    [tenantId, memberId],
  );
  const unreadRow = await queryOne(
    db,
    `SELECT COUNT(*) AS unread FROM notification_recipients
      WHERE tenant_id = ? AND member_id = ? AND read_at IS NULL`,
    [tenantId, memberId],
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      url: r.url,
      createdAt: r.created_at,
      readAt: r.read_at,
    })),
    total: Number(countRow?.total ?? 0),
    unread: Number(unreadRow?.unread ?? 0),
    page,
    pageSize,
  };
}

export async function markRead(db, tenantId, memberId, notificationId) {
  await execute(
    db,
    `UPDATE notification_recipients SET read_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ? AND member_id = ? AND notification_id = ? AND read_at IS NULL`,
    [tenantId, memberId, notificationId],
  );
}

export async function unreadCount(db, tenantId, memberId) {
  const row = await queryOne(
    db,
    `SELECT COUNT(*) AS unread FROM notification_recipients
      WHERE tenant_id = ? AND member_id = ? AND read_at IS NULL`,
    [tenantId, memberId],
  );
  return Number(row?.unread ?? 0);
}

export async function dedupeKeyExists(db, tenantId, key) {
  const row = await queryOne(
    db,
    "SELECT 1 AS found FROM notifications WHERE tenant_id = ? AND dedupe_key = ?",
    [tenantId, key],
  );
  return Boolean(row);
}

export async function recipientCountForAudience(db, tenantId, audience) {
  const { sql, params } = buildAudienceQuery(tenantId, audience);
  const row = await queryOne(db, `SELECT COUNT(*) AS total FROM (${sql}) AS t`, params);
  return Number(row?.total ?? 0);
}

export async function memberIdsForAudience(db, tenantId, audience) {
  const { sql, params } = buildAudienceQuery(tenantId, audience);
  const rows = await queryAll(db, sql, params);
  return rows.map((r) => r.id);
}

function buildAudienceQuery(tenantId, audience) {
  const type = audience?.type || "all";
  if (type === "all") {
    return {
      sql: "SELECT id FROM members WHERE tenant_id = ? AND status = 'active'",
      params: [tenantId],
    };
  }
  if (type === "dues") {
    return {
      sql: `SELECT DISTINCT m.id FROM members m
              JOIN invoices i ON i.member_id = m.id AND i.tenant_id = m.tenant_id
             WHERE m.tenant_id = ? AND m.status = 'active'
               AND i.status = 'open' AND i.due_on <= CURDATE()`,
      params: [tenantId],
    };
  }
  if (type === "slot" && audience.slotId) {
    return {
      sql: `SELECT DISTINCT m.id FROM members m
              JOIN subscriptions s ON s.member_id = m.id AND s.tenant_id = m.tenant_id
             WHERE m.tenant_id = ? AND m.status = 'active'
               AND s.status = 'active' AND s.slot_id = ?`,
      params: [tenantId, audience.slotId],
    };
  }
  if (type === "members" && Array.isArray(audience.memberIds) && audience.memberIds.length > 0) {
    return {
      sql: "SELECT id FROM members WHERE tenant_id = ? AND status = 'active' AND id IN (?)",
      params: [tenantId, audience.memberIds],
    };
  }
  return {
    sql: "SELECT id FROM members WHERE tenant_id = ? AND status = 'active'",
    params: [tenantId],
  };
}

export async function latestNoticeForMember(db, tenantId, memberId) {
  const row = await queryOne(
    db,
    `SELECT n.id, n.kind, n.title, n.body, n.url, n.created_at, nr.read_at
       FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
      WHERE nr.tenant_id = ? AND nr.member_id = ?
      ORDER BY n.created_at DESC LIMIT 1`,
    [tenantId, memberId],
  );
  return row
    ? {
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        url: row.url,
        createdAt: row.created_at,
        readAt: row.read_at,
      }
    : null;
}

function toNotification(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    url: row.url,
    audience: typeof row.audience === "string" ? JSON.parse(row.audience) : row.audience,
    dedupeKey: row.dedupe_key,
    recipientsCount: row.recipients_count,
    pushSent: row.push_sent,
    pushFailed: row.push_failed,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
