import crypto from "node:crypto";

/**
 * Insert a member straight into the database, for tests that only need members to
 * exist (the members API is tested in members.integration.test.js). Keep the
 * columns in step with the members table.
 */
export async function insertMember(pool, tenantId, name) {
  const id = crypto.randomUUID();
  const digits = String(Math.floor(6_000_000_000 + Math.random() * 3_999_999_999));
  await pool.query(
    `INSERT INTO members (id, tenant_id, member_code, name, phone, joined_on)
     VALUES (?, ?, ?, ?, ?, '2026-10-01')`,
    [id, tenantId, `T${id.slice(0, 6)}`, name, digits],
  );
  return id;
}

/** Find a seat id by its label in a layout response. */
export function seatIdByLabel(layout, label) {
  for (const hall of layout.halls) {
    for (const table of hall.tables) {
      const seat = table.seats.find((s) => s.label === label);
      if (seat) return seat.id;
    }
  }
  throw new Error(`No seat ${label}`);
}
