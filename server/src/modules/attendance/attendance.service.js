import { displayDateTime, localDateOf, monthRange } from "@app/shared/time";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError, notFound } from "../../http/AppError.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { toCsv } from "../../lib/csv.js";
import { dailyCode, verifyDailyCode } from "../../lib/dailyCode.js";
import { recordAudit } from "../audit/audit.repository.js";
import { findLibraryById } from "../platform/platform.repository.js";
import { findMember, findMemberByPhone } from "../members/members.repository.js";
import { listActiveSlotsOfMember } from "../subscriptions/subscriptions.repository.js";
import { attendanceSettings } from "../settings/librarySettings.js";
import * as attendanceRepository from "./attendance.repository.js";
import { runCheckin } from "./checkin.js";

/**
 * @typedef {object} AttendanceDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof attendanceRepository} repo
 * @property {{ listActiveSlotsOfMember: typeof listActiveSlotsOfMember }} subscriptions
 * @property {{ findMember: typeof findMember, findMemberByPhone: typeof findMemberByPhone }} members
 * @property {{ attendance: typeof attendanceSettings }} settings
 * @property {{ findLibraryById: typeof findLibraryById }} libraries
 * @property {{ memberOverduePaise: (ctx: object, memberId: string) => Promise<number> }} billing
 * @property {{ recordAudit: typeof recordAudit }} audit
 * @property {string} secret
 * @property {() => Date} now
 */

/**
 * Check-in and attendance (§9). The daily code is derived from the library + local date
 * (never stored). Slot and dues rules come from Settings → Check-in. A second check-in
 * the same day is a check-out.
 */
export function createAttendanceService({
  db,
  repo = attendanceRepository,
  subscriptions = { listActiveSlotsOfMember },
  members = { findMember, findMemberByPhone },
  settings = { attendance: attendanceSettings },
  libraries = { findLibraryById },
  billing,
  audit = { recordAudit },
  secret,
  now = () => new Date(),
}) {
  return bindDeps(
    { db, repo, subscriptions, members, settings, libraries, billing, audit, secret, now },
    {
      getDesk,
      checkInByPhone,
      checkInByCode,
      markManually,
      listForDay,
      listForMember,
      exportForDay,
    },
  );
}

/** The desk screen: today's code, the QR target and how many are in today. @param {AttendanceDeps} deps */
async function getDesk(deps, ctx) {
  const rules = await deps.settings.attendance(deps.db, ctx.tenantId);
  const library = await deps.libraries.findLibraryById(deps.db, ctx.tenantId);
  const today = localDateOf(deps.now(), rules.timezone);
  const code = dailyCode(deps.secret, ctx.tenantId, today);
  const presentCount = await deps.repo.countPresentOnDay(deps.db, ctx.tenantId, today);
  return {
    today,
    code,
    slug: library?.slug ?? "",
    checkinPath: library ? `/s/${library.slug}/checkin?code=${code}` : "",
    presentCount,
  };
}

/** Kiosk: a student types phone + the day's code. @param {AttendanceDeps} deps */
async function checkInByPhone(deps, ctx, { phone, code }) {
  const rules = await deps.settings.attendance(deps.db, ctx.tenantId);
  const today = localDateOf(deps.now(), rules.timezone);
  if (!verifyDailyCode(deps.secret, ctx.tenantId, today, code)) {
    throw new AppError(400, ERROR_CODES.INVALID_CODE, "That code is not today's code.");
  }
  const member = await deps.members.findMemberByPhone(deps.db, ctx.tenantId, phone);
  if (!member) {
    // Same message as a wrong code: the kiosk must not reveal who is a member.
    throw new AppError(400, ERROR_CODES.INVALID_CODE, "No booking found for that number and code.");
  }
  return runCheckin(deps, ctx, { member, method: "phone", rules, today, recordedBy: null });
}

/** Student app QR (milestone 7): the signed-in student sends the day's code. @param {AttendanceDeps} deps */
async function checkInByCode(deps, ctx, member, { code }) {
  const rules = await deps.settings.attendance(deps.db, ctx.tenantId);
  const today = localDateOf(deps.now(), rules.timezone);
  if (!verifyDailyCode(deps.secret, ctx.tenantId, today, code)) {
    throw new AppError(400, ERROR_CODES.INVALID_CODE, "That code is not today's code.");
  }
  return runCheckin(deps, ctx, { member, method: "qr", rules, today, recordedBy: null });
}

/** Staff marks a member present, overriding the slot and dues gates. @param {AttendanceDeps} deps */
async function markManually(deps, ctx, { memberId, subscriptionId }) {
  const member = await deps.members.findMember(deps.db, ctx.tenantId, memberId);
  if (!member) throw notFound("Member not found");
  const rules = await deps.settings.attendance(deps.db, ctx.tenantId);
  const today = localDateOf(deps.now(), rules.timezone);
  return runCheckin(deps, ctx, {
    member,
    method: "staff",
    rules,
    today,
    recordedBy: ctx.actor?.id ?? null,
    override: true,
    forceSubscriptionId: subscriptionId,
  });
}

/** @param {AttendanceDeps} deps */
async function listForDay(deps, ctx, { date, slotId }) {
  const rules = await deps.settings.attendance(deps.db, ctx.tenantId);
  const day = date || localDateOf(deps.now(), rules.timezone);
  const rows = await deps.repo.listForDay(deps.db, ctx.tenantId, day, slotId || null);
  return { date: day, present: rows, presentCount: new Set(rows.map((r) => r.memberId)).size };
}

/** A member's attendance for a month (defaults to the library's current month). @param {AttendanceDeps} deps */
async function listForMember(deps, ctx, memberId, month) {
  const rules = await deps.settings.attendance(deps.db, ctx.tenantId);
  const anchor = month || localDateOf(deps.now(), rules.timezone);
  const [from, to] = monthRange(anchor);
  const attendance = await deps.repo.listForMemberRange(deps.db, ctx.tenantId, memberId, from, to);
  return { month: from.slice(0, 7), attendance };
}

/** A day's attendance as CSV (for the accountant / register). @param {AttendanceDeps} deps */
async function exportForDay(deps, ctx, { date, slotId }) {
  const rules = await deps.settings.attendance(deps.db, ctx.tenantId);
  const day = date || localDateOf(deps.now(), rules.timezone);
  const rows = await deps.repo.listForDay(deps.db, ctx.tenantId, day, slotId || null);
  const time = (instant) => (instant ? displayDateTime(instant, rules.timezone) : "");
  return toCsv(
    [
      "Date",
      "Member ID",
      "Member",
      "Slot",
      "Seat",
      "Check-in",
      "Check-out",
      "Method",
      "Outside slot",
      "Had dues",
    ],
    rows.map((r) => [
      r.localDate,
      r.memberCode,
      r.memberName,
      r.slotName,
      r.seatLabel ?? "",
      time(r.checkInAt),
      time(r.checkOutAt),
      r.method,
      r.outsideSlot ? "yes" : "no",
      r.hadDues ? "yes" : "no",
    ]),
  );
}
