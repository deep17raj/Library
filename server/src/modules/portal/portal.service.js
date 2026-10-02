import { attendanceStreak } from "@app/shared/attendance";
import { DEFAULT_BRAND_COLOR } from "@app/shared/theme";
import { DEFAULT_TIMEZONE, shiftMonth } from "@app/shared/time";
import { notFound } from "../../http/AppError.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { publicFileUrl } from "../../lib/images.js";
import { findMember } from "../members/members.repository.js";
import { presentMember } from "../members/members.service.js";
import { getSettings } from "../settings/settings.repository.js";
import { libraryToday } from "../settings/librarySettings.js";

/**
 * @typedef {object} PortalDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {{ findMember: typeof findMember }} members
 * @property {{ listMemberSubscriptions: (ctx: object, memberId: string) => Promise<any[]> }} seating
 * @property {{ getMemberAccount: Function, getReceipt: Function }} billing
 * @property {{ listForMember: Function, checkInByCode: Function }} attendance
 * @property {{ getSettings: typeof getSettings, today: typeof libraryToday }} settings
 */

/**
 * The student app's read side: everything is the signed-in student's own data
 * (ctx.actor.id), assembled from the modules that own it. Nothing here writes except
 * check-in, which the attendance module does.
 */
export function createPortalService({
  db,
  members = { findMember },
  seating,
  billing,
  attendance,
  settings = { getSettings, today: libraryToday },
}) {
  return bindDeps(
    { db, members, seating, billing, attendance, settings },
    { getBranding, getMe, getAccount, getReceipt, getAttendance, checkIn },
  );
}

/** Name, logo and colour for the sign-in screen and the app header. @param {PortalDeps} deps */
async function getBranding(deps, ctx, library) {
  const settings = await deps.settings.getSettings(deps.db, ctx.tenantId);
  return {
    slug: library.slug,
    name: settings?.displayName || library.name,
    logoUrl: publicFileUrl(settings?.logoPath ?? ""),
    brandColor: settings?.brandColor || DEFAULT_BRAND_COLOR,
    timezone: settings?.timezone || DEFAULT_TIMEZONE,
    address: settings?.address ?? "",
    contactPhone: settings?.contactPhone ?? "",
  };
}

/**
 * Home screen data in one call: who I am, where I sit, what I owe, today's check-ins.
 * `session` is the signed-in student (carries mustChangePassword).
 * @param {PortalDeps} deps
 */
async function getMe(deps, ctx, library, session) {
  const memberId = ctx.actor.id;
  const [member, subscriptions, account, today, branding] = await Promise.all([
    deps.members.findMember(deps.db, ctx.tenantId, memberId),
    deps.seating.listMemberSubscriptions(ctx, memberId),
    deps.billing.getMemberAccount(ctx, memberId),
    deps.settings.today(deps.db, ctx.tenantId),
    getBranding(deps, ctx, library),
  ]);
  if (!member) throw notFound("Member not found");
  const { attendance: monthRows } = await deps.attendance.listForMember(ctx, memberId, today);
  const { id, name, memberCode, phone, photoUrl, examTarget, joinedOn } = presentMember(member);
  return {
    student: {
      id,
      name,
      memberCode,
      phone,
      photoUrl,
      examTarget,
      joinedOn,
      mustChangePassword: session.mustChangePassword,
    },
    library: branding,
    today,
    bookings: subscriptions.filter((s) => s.status === "active").map(toBooking),
    dues: account.summary,
    creditPaise: account.creditPaise,
    checkIns: monthRows.filter((r) => r.localDate === today && !r.absent).map(toVisit),
  };
}

/** Fees screen: dues summary, invoices, payments (staff notes left out). */
async function getAccount(deps, ctx) {
  const account = await deps.billing.getMemberAccount(ctx, ctx.actor.id);
  return { ...account, payments: account.payments.map(withoutNote) };
}

/** One of my receipts; someone else's receipt is "not found", never "forbidden". */
async function getReceipt(deps, ctx, paymentId) {
  const receipt = await deps.billing.getReceipt(ctx, paymentId);
  if (receipt.payment.memberId !== ctx.actor.id) throw notFound("Receipt not found");
  return { ...receipt, payment: withoutNote(receipt.payment) };
}

/**
 * A month of my attendance plus my current streak. Days a staff member marked absent
 * don't count. The streak looks back over this month and last month (enough for a
 * "days in a row" badge).
 * @param {PortalDeps} deps
 */
async function getAttendance(deps, ctx, month) {
  const memberId = ctx.actor.id;
  const today = await deps.settings.today(deps.db, ctx.tenantId);
  const [viewed, current, previous] = await Promise.all([
    deps.attendance.listForMember(ctx, memberId, month || today),
    deps.attendance.listForMember(ctx, memberId, today),
    deps.attendance.listForMember(ctx, memberId, shiftMonth(today, -1)),
  ]);
  const presentRows = viewed.attendance.filter((r) => !r.absent);
  const recentDates = [...current.attendance, ...previous.attendance]
    .filter((r) => !r.absent)
    .map((r) => r.localDate);
  return {
    month: viewed.month,
    today,
    streak: attendanceStreak(recentDates, today),
    presentDays: new Set(presentRows.map((r) => r.localDate)).size,
    visits: viewed.attendance.map(toVisit),
  };
}

/** QR check-in: the code from the desk screen. @param {PortalDeps} deps */
async function checkIn(deps, ctx, { code }) {
  const member = { id: ctx.actor.id, name: ctx.actor.name };
  return deps.attendance.checkInByCode(ctx, member, { code });
}

function toBooking(s) {
  return {
    id: s.id,
    slotName: s.slot.name,
    startMin: s.slot.startMin,
    endMin: s.slot.endMin,
    hallName: s.hall.name,
    seatingMode: s.hall.seatingMode,
    seatLabel: s.seat?.label ?? null,
    planName: s.plan.name,
    startOn: s.startOn,
    endOn: s.endOn,
  };
}

function toVisit(r) {
  return {
    id: r.id,
    date: r.localDate,
    slotName: r.slotName,
    seatLabel: r.seatLabel,
    checkInAt: r.checkInAt,
    checkOutAt: r.checkOutAt,
    outsideSlot: r.outsideSlot,
    absent: Boolean(r.absent),
  };
}

// Payment notes are written by staff for staff; the student sees the receipt facts.
function withoutNote({ note: _note, ...payment }) {
  return payment;
}
