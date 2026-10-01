import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError, conflict, notFound } from "../../http/AppError.js";
import { isDuplicateKey, withTransaction } from "../../db/transaction.js";
import { takeNextNumber } from "../../db/counters.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { deleteStoredFile, publicFileUrl, saveImage } from "../../lib/images.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import { libraryToday, memberCodePrefix } from "../settings/librarySettings.js";
import * as allocationsRepository from "../subscriptions/allocations.repository.js";
import * as subscriptionsRepository from "../subscriptions/subscriptions.repository.js";
import { waitlistConverter } from "../waitlist/waitlist.service.js";
import * as membersRepository from "./members.repository.js";
import { removePhoto, replaceIdProof, replacePhoto, idProofFile } from "./memberFiles.js";

/**
 * @typedef {Object} MembersDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {string} storageDir
 * @property {typeof import("./members.repository.js")} repo
 * @property {{ seatMember: Function, listMemberSubscriptions: Function }} seating  subscriptions service
 * @property {{ listActivePlacementsOfMembers: Function, countActiveSubscriptionsOfMember: Function,
 *   listMemberSeatHistory: Function }} occupancy  subscriptions repositories
 * @property {{ markConverted: Function }} waitlist
 * @property {{ today: Function, memberCodePrefix: Function }} library
 * @property {{ recordAudit: Function }} audit
 * @property {{ saveImage: Function, deleteStoredFile: Function }} files
 */

/**
 * Students: add (with seat bookings), edit, list, detail, photo, ID proof.
 * `seating` is the subscriptions service (seatMember runs inside our transaction).
 */
export function createMembersService({
  db,
  storageDir,
  seating,
  billing,
  repo = membersRepository,
  occupancy = {
    listActivePlacementsOfMembers: subscriptionsRepository.listActivePlacementsOfMembers,
    countActiveSubscriptionsOfMember: subscriptionsRepository.countActiveSubscriptionsOfMember,
    listMemberSeatHistory: allocationsRepository.listMemberSeatHistory,
  },
  waitlist = waitlistConverter(),
  library = { today: (tx, tenantId) => libraryToday(tx, tenantId), memberCodePrefix },
  audit = { recordAudit },
  files = { saveImage, deleteStoredFile },
}) {
  const deps = {
    db,
    storageDir,
    seating,
    billing,
    repo,
    occupancy,
    waitlist,
    library,
    audit,
    files,
  };
  return bindDeps(deps, {
    listMembers,
    getMember,
    createMember,
    updateMember,
    replacePhoto,
    removePhoto,
    replaceIdProof,
    idProofFile,
  });
}

/** What the API shows: URLs instead of storage paths; ID proofs only as "has one". */
export function presentMember({ photoPath, idProofPath, ...member }) {
  return { ...member, photoUrl: publicFileUrl(photoPath), hasIdProof: Boolean(idProofPath) };
}

const phoneTaken = (holder) =>
  conflict(ERROR_CODES.PHONE_TAKEN, `This mobile number belongs to ${holder}`, {
    phone: `Already registered to ${holder}`,
  });

/** @param {MembersDeps} deps */
export async function requireMember(deps, ctx, id) {
  const member = await deps.repo.findMember(deps.db, ctx.tenantId, id);
  if (!member) throw notFound("Member not found");
  return member;
}

/** @param {MembersDeps} deps */
async function listMembers(deps, ctx, query) {
  const { members, total } = await deps.repo.listMembers(deps.db, ctx.tenantId, query);
  const ids = members.map((member) => member.id);
  const placements = await deps.occupancy.listActivePlacementsOfMembers(deps.db, ctx.tenantId, ids);
  return {
    members: members.map((member) => ({
      ...presentMember(member),
      placements: placements.filter((placement) => placement.memberId === member.id),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/** @param {MembersDeps} deps */
async function getMember(deps, ctx, id) {
  const member = await requireMember(deps, ctx, id);
  const [subscriptions, seatHistory] = await Promise.all([
    deps.seating.listMemberSubscriptions(ctx, id),
    deps.occupancy.listMemberSeatHistory(deps.db, ctx.tenantId, id),
  ]);
  return { member: presentMember(member), subscriptions, seatHistory };
}

/**
 * Member + all their seat bookings in one transaction: if any seat is taken, nothing
 * is saved and the error points at that booking ("bookings.1.seatId").
 * @param {MembersDeps} deps
 */
async function createMember(
  deps,
  ctx,
  { bookings, waitlistEntryId, admissionFeePaise, depositPaise, ...profile },
) {
  const existing = await deps.repo.findMemberByPhone(deps.db, ctx.tenantId, profile.phone);
  if (existing) throw phoneTaken(`${existing.name} (${existing.memberCode})`);
  const id = crypto.randomUUID();
  try {
    await withTransaction(deps.db, async (tx) => {
      const joinedOn = profile.joinedOn ?? (await deps.library.today(tx, ctx.tenantId));
      const prefix = await deps.library.memberCodePrefix(tx, ctx.tenantId);
      const memberCode = `${prefix}${await takeNextNumber(tx, ctx.tenantId, "member_code", 1001)}`;
      await deps.repo.insertMember(tx, ctx.tenantId, { ...profile, id, memberCode, joinedOn });
      await seatBookings(deps, tx, ctx, id, bookings, joinedOn);
      // Joining charges and the first fees exist as soon as the member does.
      await deps.billing.createJoiningInvoices(tx, ctx, id, {
        admissionFeePaise,
        depositPaise,
        joinedOn,
      });
      await deps.billing.syncMemberInvoices(tx, ctx, id);
      if (waitlistEntryId) await deps.waitlist.markConverted(tx, ctx.tenantId, waitlistEntryId, id);
      await deps.audit.recordAudit(
        tx,
        byUser(ctx.actor, "member.create", "member", id, { memberCode }),
      );
    });
  } catch (error) {
    if (isDuplicateKey(error, "uq_members_phone")) throw phoneTaken("another member");
    throw error;
  }
  return getMember(deps, ctx, id);
}

async function seatBookings(deps, tx, ctx, memberId, bookings, startOn) {
  for (const [index, booking] of bookings.entries()) {
    try {
      await deps.seating.seatMember(tx, ctx, memberId, { ...booking, startOn });
    } catch (error) {
      if (!(error instanceof AppError) || !error.fields) throw error;
      // Point the message at the row of the form it belongs to.
      const fields = Object.fromEntries(
        Object.entries(error.fields).map(([key, message]) => [`bookings.${index}.${key}`, message]),
      );
      throw new AppError(
        error.status,
        error.code,
        `Booking ${index + 1}: ${error.message}`,
        fields,
      );
    }
  }
}

/** @param {MembersDeps} deps */
async function updateMember(deps, ctx, id, patch) {
  const member = await requireMember(deps, ctx, id);
  if (patch.phone && patch.phone !== member.phone) {
    const holder = await deps.repo.findMemberByPhone(deps.db, ctx.tenantId, patch.phone);
    if (holder) throw phoneTaken(`${holder.name} (${holder.memberCode})`);
  }
  if (patch.status === "inactive" && member.status === "active") {
    const active = await deps.occupancy.countActiveSubscriptionsOfMember(deps.db, ctx.tenantId, id);
    if (active > 0) {
      const message = "End this student's seat bookings before marking them inactive";
      throw new AppError(409, ERROR_CODES.IN_USE, message, { status: message });
    }
  }
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.updateMember(tx, ctx.tenantId, id, patch);
    await deps.audit.recordAudit(tx, byUser(ctx.actor, "member.update", "member", id, patch));
  });
  return getMember(deps, ctx, id);
}
