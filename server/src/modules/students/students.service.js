import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError, notFound, unauthenticated } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "../../lib/password.js";
import { signToken, verifyToken } from "../../lib/jwt.js";
import { byMember, byUser, recordAudit } from "../audit/audit.repository.js";
import * as studentsRepository from "./students.repository.js";

/**
 * @typedef {Object} StudentsDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {import("../../config/env.js").AppConfig} config
 * @property {typeof studentsRepository} repo
 * @property {{ recordAudit: typeof recordAudit }} audit
 * @property {() => string} newTemporaryPassword
 */

/**
 * Student-app accounts [D10]: staff give access (a random 6-digit temporary password,
 * shown once); the student signs in with phone + password and must choose their own
 * password first. A reset by staff works the same way and signs them out everywhere.
 */
export function createStudentsService({
  db,
  config,
  repo = studentsRepository,
  audit = { recordAudit },
  newTemporaryPassword = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0"),
}) {
  return bindDeps(
    { db, config, repo, audit, newTemporaryPassword },
    { login, resolveSession, changePassword, grantAppAccess, getAppAccess },
  );
}

// Student sessions are signed with their own key, so a staff token can never pass as
// a student session (or the other way round), even though both come from JWT_SECRET.
function studentKey(config) {
  return crypto.createHmac("sha256", config.auth.jwtSecret).update("student-session").digest("hex");
}

/** @param {StudentsDeps} deps */
function issueToken({ config }, account) {
  return signToken(
    { sub: account.id, tid: account.tenantId, tv: account.tokenVersion },
    studentKey(config),
    config.auth.studentTokenTtlSeconds,
  );
}

function assertActive(account) {
  if (account.status !== "active") {
    throw new AppError(
      403,
      ERROR_CODES.ACCOUNT_DISABLED,
      "Your membership is not active. Please ask at the library desk.",
    );
  }
}

/** @param {StudentsDeps} deps */
async function login(deps, tenantId, { phone, password }) {
  const account = await deps.repo.findAccountByPhone(deps.db, tenantId, phone);
  // Unknown numbers and members without app access still pay for a hash check, so
  // timing doesn't reveal who is a member.
  const passwordOk = await verifyPassword(password, account?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!account?.passwordHash || !passwordOk) {
    throw new AppError(
      401,
      ERROR_CODES.INVALID_CREDENTIALS,
      "Mobile number or password is incorrect",
    );
  }
  assertActive(account);
  await deps.repo.touchAppLogin(deps.db, tenantId, account.id);
  return { student: toPublicStudent(account), token: issueToken(deps, account) };
}

/**
 * The signed-in student for this library, re-read on every request so a reset
 * password or an inactive membership ends the session at once.
 * @param {StudentsDeps} deps
 */
async function resolveSession(deps, tenantId, token) {
  const payload = token ? verifyToken(token, studentKey(deps.config)) : null;
  // A session from another library's app is not a session here.
  if (!payload?.sub || payload.tid !== tenantId) throw unauthenticated();
  const account = await deps.repo.findAccountById(deps.db, tenantId, payload.sub);
  if (!account?.passwordHash || account.tokenVersion !== payload.tv) {
    throw unauthenticated("Your session has ended. Please sign in again.");
  }
  assertActive(account);
  return toPublicStudent(account);
}

/** @param {StudentsDeps} deps */
async function changePassword(deps, ctx, { currentPassword, newPassword }) {
  const account = await deps.repo.findAccountById(deps.db, ctx.tenantId, ctx.actor.id);
  if (!account?.passwordHash || !(await verifyPassword(currentPassword, account.passwordHash))) {
    throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, "Current password is incorrect", {
      currentPassword: "Current password is incorrect",
    });
  }
  const passwordHash = await hashPassword(newPassword);
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.setPassword(tx, ctx.tenantId, account.id, {
      passwordHash,
      mustChangePassword: false,
    });
    await deps.audit.recordAudit(
      tx,
      byMember(ctx.tenantId, account.id, "member.password_change", "member", account.id),
    );
  });
  // Re-read so the new token carries the token_version the database now holds.
  const updated = await deps.repo.findAccountById(deps.db, ctx.tenantId, account.id);
  return { student: toPublicStudent(updated), token: issueToken(deps, updated) };
}

/**
 * Staff give (or reset) app access: a new random 6-digit temporary password, returned
 * once and never stored in plain text or logged.
 * @param {StudentsDeps} deps
 */
async function grantAppAccess(deps, ctx, memberId) {
  const account = await deps.repo.findAccountById(deps.db, ctx.tenantId, memberId);
  if (!account) throw notFound("Member not found");
  if (account.status !== "active") {
    throw new AppError(
      422,
      ERROR_CODES.VALIDATION_FAILED,
      "This member is inactive. Make them active before giving app access.",
    );
  }
  const temporaryPassword = deps.newTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const action = account.passwordHash ? "member.app_password_reset" : "member.app_access_give";
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.setPassword(tx, ctx.tenantId, memberId, {
      passwordHash,
      mustChangePassword: true,
    });
    await deps.audit.recordAudit(tx, byUser(ctx.actor, action, "member", memberId));
  });
  return { temporaryPassword, appAccess: await getAppAccess(deps, ctx, memberId) };
}

/** Whether a member can use the app (for the member page). @param {StudentsDeps} deps */
async function getAppAccess(deps, ctx, memberId) {
  const account = await deps.repo.findAccountById(deps.db, ctx.tenantId, memberId);
  if (!account) throw notFound("Member not found");
  return {
    granted: Boolean(account.passwordHash),
    mustChangePassword: account.mustChangePassword,
    lastLoginAt: account.lastLoginAt ?? null,
  };
}

/** What the API exposes about the signed-in student: never the hash or token version. */
export function toPublicStudent(account) {
  return {
    id: account.id,
    name: account.name,
    phone: account.phone,
    memberCode: account.memberCode,
    mustChangePassword: account.mustChangePassword,
  };
}
