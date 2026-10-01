import path from "node:path";
import { notFound } from "../../http/AppError.js";
import { byUser } from "../audit/audit.repository.js";

// A member's photo (public: shown on the seat map and ID card) and ID proof
// (private: stored outside the public folder, only served through an
// authenticated route to staff with members.manage).

const PHOTO_MAX_SIDE = 400;
const ID_PROOF_MAX_SIDE = 1600; // readable when zoomed, still small

/** @typedef {import("./members.service.js").MembersDeps} Deps */

async function loadMember(deps, ctx, id) {
  const member = await deps.repo.findMember(deps.db, ctx.tenantId, id);
  if (!member) throw notFound("Member not found");
  return member;
}

async function replaceFile(deps, ctx, id, buffer, { visibility, prefix, maxSide, field, column }) {
  const member = await loadMember(deps, ctx, id);
  const storedPath = await deps.files.saveImage(buffer, {
    storageDir: deps.storageDir,
    visibility,
    tenantId: ctx.tenantId,
    prefix,
    maxSide,
    field,
  });
  await deps.repo.updateMember(deps.db, ctx.tenantId, id, { [column]: storedPath });
  await deps.audit.recordAudit(deps.db, byUser(ctx.actor, `member.${prefix}`, "member", id));
  await deps.files.deleteStoredFile(deps.storageDir, visibility, member[column]);
}

/** @param {Deps} deps */
export async function replacePhoto(deps, ctx, id, buffer) {
  await replaceFile(deps, ctx, id, buffer, {
    visibility: "public",
    prefix: "photo",
    maxSide: PHOTO_MAX_SIDE,
    field: "photo",
    column: "photoPath",
  });
}

/** @param {Deps} deps */
export async function removePhoto(deps, ctx, id) {
  const member = await loadMember(deps, ctx, id);
  await deps.repo.updateMember(deps.db, ctx.tenantId, id, { photoPath: "" });
  await deps.files.deleteStoredFile(deps.storageDir, "public", member.photoPath);
}

/** @param {Deps} deps */
export async function replaceIdProof(deps, ctx, id, buffer) {
  await replaceFile(deps, ctx, id, buffer, {
    visibility: "private",
    prefix: "id-proof",
    maxSide: ID_PROOF_MAX_SIDE,
    field: "idProof",
    column: "idProofPath",
  });
}

/**
 * Absolute path of the member's ID proof, for an authenticated download.
 * The path comes from our own database row, never from the request.
 * @param {Deps} deps
 */
export async function idProofFile(deps, ctx, id) {
  const member = await loadMember(deps, ctx, id);
  if (!member.idProofPath) throw notFound("No ID proof uploaded");
  return path.join(deps.storageDir, "private", member.idProofPath);
}
