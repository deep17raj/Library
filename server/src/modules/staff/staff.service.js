import crypto from "node:crypto";
import { ALL_PERMISSIONS, ERROR_CODES, hasPermission, ROLES } from "@app/shared/constants";
import { conflict, forbidden, notFound } from "../../http/AppError.js";
import { isDuplicateKey, withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { hashPassword } from "../../lib/password.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import * as usersRepository from "../auth/users.repository.js";
import { toPublicUser } from "../auth/auth.service.js";

/**
 * @typedef {Object} StaffDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof usersRepository} users
 * @property {{ recordAudit: typeof recordAudit }} audit
 */

/** Staff logins of one library, managed by its owner (or staff with staff.manage). */
export function createStaffService({ db, users = usersRepository, audit = { recordAudit } }) {
  return bindDeps({ db, users, audit }, { listStaff, createStaff, updateStaff, resetPassword });
}

const emailTaken = () =>
  conflict(ERROR_CODES.EMAIL_TAKEN, "This email already has an account", {
    email: "Already has an account",
  });

function present(user) {
  return { ...toPublicUser(user), status: user.status, lastLoginAt: user.lastLoginAt };
}

/**
 * A manager may only change permissions they hold themselves; anything else must stay
 * as it was. Stops a staff member with staff.manage from granting everyone (or a
 * colleague acting for them) the owner's powers.
 */
function assertMayGrant(actor, before, after) {
  const outOfReach = ALL_PERMISSIONS.filter((permission) => !hasPermission(actor, permission));
  const changed = outOfReach.filter(
    (permission) => before.includes(permission) !== after.includes(permission),
  );
  if (changed.length > 0) {
    throw forbidden("You can only give or remove permissions that you have yourself");
  }
}

/** Only staff logins are managed here; owners are managed by the platform. @param {StaffDeps} deps */
async function requireStaffMember(deps, ctx, id) {
  const user = await deps.users.findLibraryUser(deps.db, ctx.tenantId, id);
  if (!user || user.role !== ROLES.STAFF) throw notFound("Staff member not found");
  return user;
}

/** Owners first, then staff; owners are listed but read-only. @param {StaffDeps} deps */
async function listStaff(deps, ctx) {
  const accounts = await deps.users.listUsersOfLibrary(deps.db, ctx.tenantId);
  const ownersFirst = (a, b) => Number(b.role === ROLES.ADMIN) - Number(a.role === ROLES.ADMIN);
  return [...accounts].sort(ownersFirst).map(present);
}

/** @param {StaffDeps} deps */
async function createStaff(deps, ctx, input) {
  assertMayGrant(ctx.actor, [], input.permissions);
  if (await deps.users.findUserByEmail(deps.db, input.email)) throw emailTaken();
  const user = {
    id: crypto.randomUUID(),
    tenantId: ctx.tenantId,
    email: input.email,
    name: input.name,
    role: ROLES.STAFF,
    permissions: input.permissions,
    passwordHash: await hashPassword(input.password),
  };
  try {
    await withTransaction(deps.db, async (tx) => {
      await deps.users.insertUser(tx, user);
      await deps.audit.recordAudit(
        tx,
        byUser(ctx.actor, "staff.create", "user", user.id, { permissions: user.permissions }),
      );
    });
  } catch (error) {
    if (isDuplicateKey(error, "uq_users_email")) throw emailTaken();
    throw error;
  }
  return present(await deps.users.findLibraryUser(deps.db, ctx.tenantId, user.id));
}

/** @param {StaffDeps} deps */
async function updateStaff(deps, ctx, id, patch) {
  const user = await requireStaffMember(deps, ctx, id);
  if (user.id === ctx.actor.id && (patch.permissions || patch.status)) {
    throw forbidden("You can't change your own permissions or status");
  }
  if (patch.permissions) assertMayGrant(ctx.actor, user.permissions, patch.permissions);
  await withTransaction(deps.db, async (tx) => {
    await deps.users.updateLibraryUserProfile(tx, ctx.tenantId, id, patch);
    if (patch.status && patch.status !== user.status) {
      await deps.users.setLibraryUserStatus(tx, ctx.tenantId, id, patch.status);
    }
    await deps.audit.recordAudit(tx, byUser(ctx.actor, "staff.update", "user", id, patch));
  });
  return present(await deps.users.findLibraryUser(deps.db, ctx.tenantId, id));
}

/** Sets a new password and signs the staff member out everywhere. @param {StaffDeps} deps */
async function resetPassword(deps, ctx, id, { password }) {
  await requireStaffMember(deps, ctx, id);
  const passwordHash = await hashPassword(password);
  await withTransaction(deps.db, async (tx) => {
    await deps.users.setLibraryUserPassword(tx, ctx.tenantId, id, passwordHash);
    await deps.audit.recordAudit(tx, byUser(ctx.actor, "staff.password_reset", "user", id));
  });
}
