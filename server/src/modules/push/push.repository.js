import { execute, queryAll } from "../../db/transaction.js";

// SQL for `push_subscriptions`: one row per browser (endpoint), owned by one student.

/**
 * Save a browser's subscription. The same browser subscribing again (new keys, or a
 * different student signing in on a shared phone) updates its one row.
 */
export async function upsertSubscription(db, tenantId, s) {
  await execute(
    db,
    `INSERT INTO push_subscriptions
       (id, tenant_id, member_id, endpoint, endpoint_hash, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE tenant_id = VALUES(tenant_id), member_id = VALUES(member_id),
       endpoint = VALUES(endpoint), p256dh = VALUES(p256dh), auth = VALUES(auth),
       user_agent = VALUES(user_agent)`,
    [s.id, tenantId, s.memberId, s.endpoint, s.endpointHash, s.p256dh, s.auth, s.userAgent],
  );
}

export async function deleteSubscription(db, tenantId, memberId, endpointHash) {
  await execute(
    db,
    "DELETE FROM push_subscriptions WHERE tenant_id = ? AND member_id = ? AND endpoint_hash = ?",
    [tenantId, memberId, endpointHash],
  );
}

export async function listSubscriptionsForMembers(db, tenantId, memberIds) {
  if (memberIds.length === 0) return [];
  return queryAll(
    db,
    `SELECT id, member_id, endpoint, p256dh, auth FROM push_subscriptions
      WHERE tenant_id = ? AND member_id IN (?)`,
    [tenantId, memberIds],
  );
}

export async function deleteSubscriptionById(db, id) {
  await execute(db, "DELETE FROM push_subscriptions WHERE id = ?", [id]);
}

/** A student's devices with notifications on (no keys or endpoints leave the server). */
export async function listDevices(db, tenantId, memberId) {
  const rows = await queryAll(
    db,
    `SELECT id, endpoint_hash, user_agent, created_at, updated_at FROM push_subscriptions
      WHERE tenant_id = ? AND member_id = ? ORDER BY updated_at DESC`,
    [tenantId, memberId],
  );
  return rows.map((row) => ({
    id: row.id,
    endpointHash: row.endpoint_hash,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
