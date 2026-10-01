import { execute } from "../../db/transaction.js";

/**
 * @typedef {Object} AuditEntry
 * @property {string | null} tenantId
 * @property {"user" | "member" | "system"} actorType
 * @property {string | null} actorId
 * @property {string} action   e.g. "library.suspend"
 * @property {string} entity   e.g. "library"
 * @property {string | null} entityId
 * @property {Record<string, unknown>} [data]
 */

/**
 * Append one audit row. Call it with the same `db` (transaction) as the change it
 * describes, so the change and its record commit together.
 * @param {import("../../db/transaction.js").Db} db
 * @param {AuditEntry} entry
 */
export async function recordAudit(db, entry) {
  await execute(
    db,
    `INSERT INTO audit_log (tenant_id, actor_type, actor_id, action, entity, entity_id, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.tenantId,
      entry.actorType,
      entry.actorId,
      entry.action,
      entry.entity,
      entry.entityId,
      entry.data ? JSON.stringify(entry.data) : null,
    ],
  );
}

/** Audit entry for something a signed-in staff/super-admin user did. */
export function byUser(actor, action, entity, entityId, data) {
  return {
    tenantId: actor.tenantId ?? null,
    actorType: "user",
    actorId: actor.id,
    action,
    entity,
    entityId,
    data,
  };
}
