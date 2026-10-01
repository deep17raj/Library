import crypto from "node:crypto";
import { SEATING_MODES } from "@app/shared/constants";
import { nextSeatNumber, planTablesWithSeats } from "@app/shared/layout";
import {
  assertAssignableCategory,
  assertSeatLabelsFree,
  changeLayout,
  requireHall,
} from "./layoutRules.js";
import { getLayout } from "./layoutTree.js";
import { assertHallChangeAllowed } from "./occupancyGuards.js";

/** @typedef {import("./layoutRules.js").LayoutDeps} LayoutDeps */

/** @param {LayoutDeps} deps */
export async function createHall(deps, ctx, input) {
  await assertAssignableCategory(deps, ctx, input.categoryId);
  const halls = await deps.repo.listHalls(deps.db, ctx.tenantId);
  const hall = { id: crypto.randomUUID(), ...input, sortOrder: halls.length };
  await changeLayout(deps, ctx, ["hall.create", "hall", hall.id, input], (tx) =>
    deps.repo.insertHall(tx, ctx.tenantId, hall),
  );
  return getLayout(deps, ctx);
}

/**
 * Seating mode can't change, and the hall can't be disabled, while students sit in it.
 * @param {LayoutDeps} deps
 */
export async function updateHall(deps, ctx, id, patch) {
  const hall = await requireHall(deps, deps.db, ctx, id);
  await assertHallChangeAllowed(deps, ctx, hall, patch);
  await assertAssignableCategory(deps, ctx, patch.categoryId);
  await changeLayout(deps, ctx, ["hall.update", "hall", id, patch], (tx) =>
    deps.repo.updateHall(tx, ctx.tenantId, id, patch),
  );
  return getLayout(deps, ctx);
}

/** Deletes the hall with its tables and seats — refused (IN_USE) once any seat has history. */
export async function deleteHall(deps, ctx, id) {
  await requireHall(deps, deps.db, ctx, id);
  await changeLayout(deps, ctx, ["hall.delete", "hall", id], (tx) =>
    deps.repo.deleteHallWithContents(tx, ctx.tenantId, id),
  );
  return getLayout(deps, ctx);
}

/**
 * "Add N tables with M seats": tables are named on from the hall's highest
 * "Table n", seats numbered from startNumber. All rows or none.
 * @param {LayoutDeps} deps
 */
export async function addTables(deps, ctx, hallId, plan) {
  await changeLayout(
    deps,
    ctx,
    ["hall.add_tables", "hall", hallId, plan],
    async (tx) => {
      // Locked so two people adding tables at once get Table 5 and Table 6, not two Table 5s.
      const hall = await requireHall(deps, tx, ctx, hallId, { forUpdate: true });
      const existingTables = await deps.repo.listTablesOfHall(tx, ctx.tenantId, hallId);
      const planned = planTablesWithSeats({
        ...plan,
        existingTableCount:
          nextSeatNumber(
            existingTables.map((t) => t.label),
            "Table ",
          ) - 1,
      });
      const labels = planned.flatMap((table) => table.seatLabels);
      await assertSeatLabelsFree(deps, tx, ctx, labels, "seatPrefix");
      const { tables, seats } = toRows(planned, hall, existingTables.length);
      await deps.repo.insertTables(tx, ctx.tenantId, tables);
      await deps.repo.insertSeats(tx, ctx.tenantId, seats);
    },
    "seatPrefix",
  );
  return getLayout(deps, ctx);
}

/** Planned labels → table and seat rows. Fixed halls give new seats the hall's category. */
function toRows(planned, hall, existingTableCount) {
  const seatCategoryId = hall.seatingMode === SEATING_MODES.FIXED ? hall.categoryId : null;
  const tables = [];
  const seats = [];
  planned.forEach((table, tableIndex) => {
    const tableId = crypto.randomUUID();
    tables.push({
      id: tableId,
      hallId: hall.id,
      label: table.label,
      sortOrder: existingTableCount + tableIndex,
    });
    table.seatLabels.forEach((label, seatIndex) => {
      seats.push({
        id: crypto.randomUUID(),
        tableId,
        label,
        sortOrder: seatIndex,
        categoryId: seatCategoryId,
      });
    });
  });
  return { tables, seats };
}
