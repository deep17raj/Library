import crypto from "node:crypto";
import { SEATING_MODES } from "@app/shared/constants";
import { planTablesWithSeats } from "@app/shared/layout";
import {
  assertAssignableCategory,
  assertSeatLabelsFree,
  changeLayout,
  requireHall,
  requireSeat,
  requireTable,
} from "./layoutRules.js";
import { getLayout } from "./layoutTree.js";

/** @typedef {import("./layoutRules.js").LayoutDeps} LayoutDeps */

/** @param {LayoutDeps} deps */
export async function updateTable(deps, ctx, id, patch) {
  await requireTable(deps, ctx, id);
  await changeLayout(deps, ctx, ["table.update", "table", id, patch], (tx) =>
    deps.repo.updateTable(tx, ctx.tenantId, id, patch),
  );
  return getLayout(deps, ctx);
}

/** @param {LayoutDeps} deps */
export async function deleteTable(deps, ctx, id) {
  await requireTable(deps, ctx, id);
  await changeLayout(deps, ctx, ["table.delete", "table", id], (tx) =>
    deps.repo.deleteTableWithSeats(tx, ctx.tenantId, id),
  );
  return getLayout(deps, ctx);
}

/** Add `count` seats to the end of one table. @param {LayoutDeps} deps */
export async function addSeats(deps, ctx, tableId, { count, seatPrefix, startNumber }) {
  const table = await requireTable(deps, ctx, tableId);
  const hall = await requireHall(deps, deps.db, ctx, table.hallId);
  const [{ seatLabels }] = planTablesWithSeats({
    existingTableCount: 0,
    tableCount: 1,
    seatsPerTable: count,
    seatPrefix,
    startNumber,
  });
  await changeLayout(
    deps,
    ctx,
    ["table.add_seats", "table", tableId, { count, seatPrefix, startNumber }],
    async (tx) => {
      await assertSeatLabelsFree(deps, tx, ctx, seatLabels, "seatPrefix");
      const existing = await deps.repo.listSeatsOfTable(tx, ctx.tenantId, tableId);
      const categoryId = hall.seatingMode === SEATING_MODES.FIXED ? hall.categoryId : null;
      const seats = seatLabels.map((label, index) => ({
        id: crypto.randomUUID(),
        tableId,
        label,
        sortOrder: existing.length + index,
        categoryId,
      }));
      await deps.repo.insertSeats(tx, ctx.tenantId, seats);
    },
    "seatPrefix",
  );
  return getLayout(deps, ctx);
}

/**
 * Rename, re-categorise, tag or disable one seat. Milestone 3 adds: a seat with an
 * active allocation can't be disabled.
 * @param {LayoutDeps} deps
 */
export async function updateSeat(deps, ctx, id, patch) {
  const seat = await requireSeat(deps, ctx, id);
  await assertAssignableCategory(deps, ctx, patch.categoryId);
  if (patch.label && patch.label.toLowerCase() !== seat.label.toLowerCase()) {
    await assertSeatLabelsFree(deps, deps.db, ctx, [patch.label], "label");
  }
  await changeLayout(deps, ctx, ["seat.update", "seat", id, patch], (tx) =>
    deps.repo.updateSeat(tx, ctx.tenantId, id, patch),
  );
  return getLayout(deps, ctx);
}

/** @param {LayoutDeps} deps */
export async function deleteSeat(deps, ctx, id) {
  await requireSeat(deps, ctx, id);
  await changeLayout(deps, ctx, ["seat.delete", "seat", id], (tx) =>
    deps.repo.deleteSeat(tx, ctx.tenantId, id),
  );
  return getLayout(deps, ctx);
}
