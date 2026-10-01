import crypto from "node:crypto";
import { ERROR_CODES, ROLES } from "@app/shared/constants";
import { AppError, unauthenticated } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "../../lib/password.js";
import { signToken, verifyToken } from "../../lib/jwt.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import * as usersRepository from "./users.repository.js";

/**
 * @typedef {Object} AuthDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {import("../../config/env.js").AppConfig} config
 * @property {typeof usersRepository} users
 * @property {{ recordAudit: typeof recordAudit }} audit
 */

/** Staff / owner / super-admin authentication. */
export function createAuthService({
  db,
  config,
  users = usersRepository,
  audit = { recordAudit },
}) {
  return bindDeps(
    { db, config, users, audit },
    { login, resolveSession, changePassword, ensureSuperAdmin },
  );
}

/** @param {AuthDeps} deps */
function issueToken({ config }, user) {
  return signToken(
    { sub: user.id, role: user.role, tid: user.tenantId, tv: user.tokenVersion },
    config.auth.jwtSecret,
    config.auth.staffTokenTtlSeconds,
  );
}

/** Same checks at login and on every request, so a disabled user or suspended library is out at once. */
function assertMayUseApp(user) {
  if (user.status !== "active") {
    throw new AppError(403, ERROR_CODES.ACCOUNT_DISABLED, "This account has been disabled");
  }
  if (user.role !== ROLES.SUPER_ADMIN && user.library?.status !== "active") {
    throw new AppError(
      403,
      ERROR_CODES.LIBRARY_SUSPENDED,
      "This library's account is suspended. Please contact support.",
    );
  }
}

/** @param {AuthDeps} deps */
async function login(deps, { email, password }) {
  const user = await deps.users.findUserByEmail(deps.db, email);
  // Unknown emails still pay for a hash check, so timing doesn't reveal who has an account.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !passwordOk) {
    throw new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, "Email or password is incorrect");
  }
  assertMayUseApp(user);
  await deps.users.touchLastLogin(deps.db, user.id);
  return { user: toPublicUser(user), token: issueToken(deps, user) };
}

/** @param {AuthDeps} deps */
async function resolveSession(deps, token) {
  const payload = token ? verifyToken(token, deps.config.auth.jwtSecret) : null;
  if (!payload?.sub) throw unauthenticated();
  const user = await deps.users.findUserById(deps.db, payload.sub);
  // A changed token_version means the password changed or the user was disabled.
  if (!user || user.tokenVersion !== payload.tv) {
    throw unauthenticated("Your session has ended. Please sign in again.");
  }
  assertMayUseApp(user);
  return toPublicUser(user);
}

/** @param {AuthDeps} deps */
async function changePassword(deps, actor, { currentPassword, newPassword }) {
  const user = await deps.users.findUserById(deps.db, actor.id);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, "Current password is incorrect", {
      currentPassword: "Current password is incorrect",
    });
  }
  const passwordHash = await hashPassword(newPassword);
  await withTransaction(deps.db, async (tx) => {
    await deps.users.updatePassword(tx, user.id, passwordHash);
    await deps.audit.recordAudit(tx, byUser(actor, "user.password_change", "user", user.id));
  });
  // Re-read so the new token carries the token_version the database now holds.
  return { token: issueToken(deps, await deps.users.findUserById(deps.db, user.id)) };
}

/**
 * First boot: create the super admin from .env when none exists yet. Later boots do
 * nothing, so editing SUPER_ADMIN_PASSWORD in .env never overwrites a password
 * changed in the app.
 * @param {AuthDeps} deps
 */
async function ensureSuperAdmin(deps, { email, password, name }) {
  if (!email || !password) return false;
  if ((await deps.users.countUsersWithRole(deps.db, ROLES.SUPER_ADMIN)) > 0) return false;
  await deps.users.insertUser(deps.db, {
    id: crypto.randomUUID(),
    tenantId: null,
    email,
    passwordHash: await hashPassword(password),
    name,
    role: ROLES.SUPER_ADMIN,
  });
  return true;
}

/** What the API and req.actor expose about a user: never the hash or token version. */
export function toPublicUser(user) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    library: user.library
      ? { id: user.library.id, slug: user.library.slug, name: user.library.name }
      : null,
  };
}
