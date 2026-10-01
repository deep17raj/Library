import { ERROR_CODES } from "@app/shared/constants";
import { AppError, conflict, notFound } from "../../http/AppError.js";
import { isDuplicateKey, withTransaction } from "../../db/transaction.js";
import { byUser } from "../audit/audit.repository.js";

/**
 * @typedef {Object} LayoutDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof import("./layout.repository.js")} repo
 * @property {typeof import("./seatCategories.repository.js")} categories
 * @property {{ recordAudit: typeof import("../audit/audit.repository.js").recordAudit }} audit
 */

/** @param {LayoutDeps} deps */
export async function requireHall(deps, db, ctx, id, options) {
  const hall = await deps.repo.findHall(db, ctx.tenantId, id, options);
  if (!hall) throw notFound("Hall not found");
  return hall;
}

/** @param {LayoutDeps} deps */
export async function requireTable(deps, ctx, id) {
  const table = await deps.repo.findTable(deps.db, ctx.tenantId, id);
  if (!table) throw notFound("Table not found");
  return table;
}

/** @param {LayoutDeps} deps */
export async function requireSeat(deps, ctx, id) {
  const seat = await deps.repo.findSeat(deps.db, ctx.tenantId, id);
  if (!seat) throw notFound("Seat not found");
  return seat;
}

/** A category may be given to a hall or seat only if it belongs here and is not archived. */
export async function assertAssignableCategory(deps, ctx, categoryId) {
  if (!categoryId) return;
  const category = await deps.categories.findCategory(deps.db, ctx.tenantId, categoryId);
  if (!category || category.status !== "active") {
    const message = "Choose an active seat category";
    throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { categoryId: message });
  }
}

/** @param {string[]} labels the clashing labels, or [] when only the unique key knows */
export function labelsTaken(labels, field) {
  const shown = labels.slice(0, 5).join(", ") + (labels.length > 5 ? "…" : "");
  const message = shown
    ? `Seat numbers already used: ${shown}`
    : "Some of these seat numbers are already used";
  return conflict(ERROR_CODES.LABEL_TAKEN, message, { [field]: message });
}

/** Friendly check first; the unique key (uq_seats_label) still decides races. */
export async function assertSeatLabelsFree(deps, db, ctx, labels, field) {
  const existing = new Set(
    (await deps.repo.findExistingSeatLabels(db, ctx.tenantId, labels)).map((l) => l.toLowerCase()),
  );
  // Report clashes in the order they were asked for (A-1, A-2…), not the database's order.
  const clashes = labels.filter((label) => existing.has(label.toLowerCase()));
  if (clashes.length > 0) throw labelsTaken(clashes, field);
}

/**
 * Run a layout change and its audit row in one transaction, translating label
 * races into the same LABEL_TAKEN error the friendly checks give.
 * @param {LayoutDeps} deps
 * @param {[string, string, string | null, object?]} auditArgs action, entity, id, data
 * @param {(tx: any) => Promise<void>} work
 */
export async function changeLayout(deps, ctx, auditArgs, work, labelField = "label") {
  try {
    await withTransaction(deps.db, async (tx) => {
      await work(tx);
      await deps.audit.recordAudit(tx, byUser(ctx.actor, ...auditArgs));
    });
  } catch (error) {
    if (isDuplicateKey(error, "uq_seats_label")) throw labelsTaken([], labelField);
    if (isDuplicateKey(error, "uq_tables_label")) {
      throw conflict(ERROR_CODES.LABEL_TAKEN, "A table with this name already exists in the hall", {
        label: "Already used in this hall",
      });
    }
    if (isDuplicateKey(error, "uq_halls_name") || isDuplicateKey(error, "uq_categories_name")) {
      throw conflict(ERROR_CODES.NAME_TAKEN, "This name is already used", { name: "Already used" });
    }
    throw error;
  }
}
