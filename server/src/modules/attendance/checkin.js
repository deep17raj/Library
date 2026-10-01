import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { evaluateCheckin } from "@app/shared/attendance";
import { displaySlotTimes } from "@app/shared/slots";
import { localMinutesOf } from "@app/shared/time";
import { AppError } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { byUser } from "../audit/audit.repository.js";

/**
 * The check-in flow used by the kiosk, the student app and staff marking: pick the
 * booking, apply the slot and dues gates (unless a staff override), then record a
 * check-in — or a check-out if the student already checked in today.
 * @param {import("./attendance.service.js").AttendanceDeps} deps
 */
export async function runCheckin(deps, ctx, context) {
  const gated = await applyGates(deps, ctx, context);
  return writeAttendance(deps, ctx, { ...context, ...gated });
}

/**
 * Pick the booking and apply the gates (unless `override`). Throws on a refusal;
 * otherwise returns the chosen booking and the flags to store.
 * @param {import("./attendance.service.js").AttendanceDeps} deps
 */
async function applyGates(deps, ctx, { member, rules, override, forceSubscriptionId }) {
  const nowMin = localMinutesOf(deps.now(), rules.timezone);
  const bookings = await deps.subscriptions.listActiveSlotsOfMember(
    deps.db,
    ctx.tenantId,
    member.id,
  );
  const evaluated = evaluateCheckin({
    nowMin,
    bookings,
    mode: rules.slotCheckMode,
    earlyMinutes: rules.slotEarlyMinutes,
  });
  if (evaluated.decision === "none") {
    throw new AppError(422, ERROR_CODES.NO_ACTIVE_BOOKING, `${member.name} has no active booking.`);
  }
  const booking = pickBooking(bookings, evaluated.booking, forceSubscriptionId);
  if (!override && evaluated.decision === "block") {
    throw new AppError(
      422,
      ERROR_CODES.OUTSIDE_SLOT,
      `Outside booked time. ${booking.slotName} is ${displaySlotTimes(booking)}.`,
    );
  }
  const overduePaise = await deps.billing.memberOverduePaise(ctx, member.id);
  const hadDues = overduePaise > 0;
  if (!override && hadDues && !rules.allowOverdueCheckin) {
    throw new AppError(
      422,
      ERROR_CODES.DUES_OVERDUE,
      `${member.name} has dues to clear before checking in.`,
      {
        overduePaise,
      },
    );
  }
  return { booking, outsideSlot: evaluated.outsideSlot, hadDues };
}

/**
 * Write the attendance: a check-in, or a check-out if already in today (the unique key
 * per booking per day is the DB guard).
 * @param {import("./attendance.service.js").AttendanceDeps} deps
 */
async function writeAttendance(
  deps,
  ctx,
  { member, method, today, recordedBy, booking, outsideSlot, hadDues },
) {
  return withTransaction(deps.db, async (tx) => {
    const existing = await deps.repo.findForDay(tx, ctx.tenantId, booking.subscriptionId, today);
    if (existing && !existing.checkOutAt) {
      await deps.repo.markCheckOut(tx, ctx.tenantId, existing.id);
      return {
        action: "checked_out",
        member,
        attendance: await deps.repo.findById(tx, ctx.tenantId, existing.id),
      };
    }
    if (existing) return { action: "already_done", member, attendance: existing };

    const id = crypto.randomUUID();
    await deps.repo.insertAttendance(tx, ctx.tenantId, {
      id,
      memberId: member.id,
      subscriptionId: booking.subscriptionId,
      localDate: today,
      method,
      outsideSlot,
      hadDues,
      recordedBy,
    });
    if (method === "staff") {
      await deps.audit.recordAudit(
        tx,
        byUser(ctx.actor, "attendance.mark", "attendance", id, { memberId: member.id }),
      );
    }
    return {
      action: "checked_in",
      member,
      outsideSlot,
      hadDues,
      attendance: await deps.repo.findById(tx, ctx.tenantId, id),
    };
  });
}

/** Honour a staff-chosen booking; otherwise the one the slot check landed on. */
function pickBooking(bookings, evaluatedBooking, forceSubscriptionId) {
  if (!forceSubscriptionId) return evaluatedBooking;
  return bookings.find((b) => b.subscriptionId === forceSubscriptionId) || evaluatedBooking;
}
