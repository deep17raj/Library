import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError, notFound } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import * as slotsRepository from "../slots/slots.repository.js";
import * as waitlistRepository from "./waitlist.repository.js";

/**
 * @typedef {Object} WaitlistDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof waitlistRepository} repo
 * @property {typeof slotsRepository} slots
 * @property {{ recordAudit: typeof recordAudit }} audit
 */

/** People waiting for a seat in a full slot, in arrival order. */
export function createWaitlistService({
  db,
  repo = waitlistRepository,
  slots = slotsRepository,
  audit = { recordAudit },
}) {
  return bindDeps({ db, repo, slots, audit }, { listEntries, createEntry, updateEntry });
}

/**
 * Entries with their place in their slot's queue (1 = next). Closed entries
 * (converted/cancelled) have no position.
 * @param {WaitlistDeps} deps
 */
async function listEntries(deps, ctx, { slotId, open = true }) {
  const entries = await deps.repo.listEntries(deps.db, ctx.tenantId, { slotId, open });
  const nextPosition = new Map();
  return entries.map((entry) => {
    if (!["waiting", "offered"].includes(entry.status)) return { ...entry, position: null };
    const position = (nextPosition.get(entry.slotId) ?? 0) + 1;
    nextPosition.set(entry.slotId, position);
    return { ...entry, position };
  });
}

/** @param {WaitlistDeps} deps */
async function createEntry(deps, ctx, input) {
  const slot = await deps.slots.findSlot(deps.db, ctx.tenantId, input.slotId);
  if (!slot) throw notFound("Slot not found");
  const entry = { id: crypto.randomUUID(), ...input, createdBy: ctx.actor.id };
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.insertEntry(tx, ctx.tenantId, entry);
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "waitlist.create", "waitlist", entry.id, { slotId: slot.id }),
    );
  });
  return deps.repo.findEntry(deps.db, ctx.tenantId, entry.id);
}

/** Mark offered / back to waiting / cancelled, or edit the note. Converted entries are final. */
async function updateEntry(deps, ctx, id, patch) {
  const entry = await deps.repo.findEntry(deps.db, ctx.tenantId, id);
  if (!entry) throw notFound("Waitlist entry not found");
  if (entry.status === "converted" || entry.status === "cancelled") {
    const message = `This entry is already ${entry.status}`;
    throw new AppError(409, ERROR_CODES.CONFLICT, message, { status: message });
  }
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.updateEntry(tx, ctx.tenantId, id, patch);
    await deps.audit.recordAudit(tx, byUser(ctx.actor, "waitlist.update", "waitlist", id, patch));
  });
  return deps.repo.findEntry(deps.db, ctx.tenantId, id);
}

/**
 * Used by the members module inside its "add member" transaction.
 * @param {typeof waitlistRepository} repo
 */
export function waitlistConverter(repo = waitlistRepository) {
  return {
    async markConverted(tx, tenantId, entryId, memberId) {
      if (!(await repo.markConverted(tx, tenantId, entryId, memberId))) {
        const message = "This waitlist entry is no longer waiting";
        throw new AppError(409, ERROR_CODES.CONFLICT, message, { waitlistEntryId: message });
      }
    },
  };
}
