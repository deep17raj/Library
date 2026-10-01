import crypto from "node:crypto";
import { ERROR_CODES, ROLES } from "@app/shared/constants";
import { conflict, forbidden, notFound } from "../../http/AppError.js";
import { isDuplicateKey, withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { hashPassword } from "../../lib/password.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import * as usersRepository from "../auth/users.repository.js";
import { toPublicUser } from "../auth/auth.service.js";
import * as platformRepository from "./platform.repository.js";

const DEFAULT_SHARE_KEY = "mocktest_default_share_bps";
const DEFAULT_SHARE_BPS = 2000; // decision D1: 20 %

/**
 * @typedef {Object} PlatformDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof platformRepository} repo
 * @property {typeof usersRepository} users
 * @property {{ recordAudit: typeof recordAudit }} audit
 */

/** Super-admin operations: libraries (tenants), their owner logins, platform settings. */
export function createPlatformService({
  db,
  repo = platformRepository,
  users = usersRepository,
  audit = { recordAudit },
}) {
  return bindDeps(
    { db, repo, users, audit },
    {
      listLibraries: (deps) => deps.repo.listLibraries(deps.db),
      getLibrary,
      createLibrary,
      updateLibrary,
      setLibraryStatus,
      addOwner,
      setUserStatus,
      getSettings,
      updateSettings,
    },
  );
}

const slugTaken = () =>
  conflict(ERROR_CODES.SLUG_TAKEN, "This short link name is already used", {
    slug: "Already used by another library",
  });
const emailTaken = (field) =>
  conflict(ERROR_CODES.EMAIL_TAKEN, "This email already has an account", {
    [field]: "Already has an account",
  });

/** @param {PlatformDeps} deps */
async function requireLibrary(deps, id) {
  const library = await deps.repo.findLibraryById(deps.db, id);
  if (!library) throw notFound("Library not found");
  return library;
}

/** Run a change and its audit row in one transaction. */
function changeWithAudit(deps, actor, audit, change) {
  return withTransaction(deps.db, async (tx) => {
    await change(tx);
    await deps.audit.recordAudit(tx, byUser(actor, ...audit));
  });
}

async function newOwnerRecord(tenantId, { name, email, password }) {
  const passwordHash = await hashPassword(password);
  return { id: crypto.randomUUID(), tenantId, email, name, role: ROLES.ADMIN, passwordHash };
}

/** Library + settings row + first owner login, all or nothing. @param {PlatformDeps} deps */
async function createLibrary(deps, actor, input) {
  if (await deps.repo.findLibraryBySlug(deps.db, input.slug)) throw slugTaken();
  if (await deps.users.findUserByEmail(deps.db, input.ownerEmail)) throw emailTaken("ownerEmail");

  const libraryId = crypto.randomUUID();
  const owner = await newOwnerRecord(libraryId, {
    name: input.ownerName,
    email: input.ownerEmail,
    password: input.ownerPassword,
  });
  const audit = ["library.create", "library", libraryId, { slug: input.slug }];
  try {
    await changeWithAudit(deps, actor, audit, async (tx) => {
      await deps.repo.insertLibrary(tx, { id: libraryId, slug: input.slug, name: input.name });
      await deps.users.insertUser(tx, owner);
    });
  } catch (error) {
    // Two super admins submitting at once: the unique keys decide, we explain.
    if (isDuplicateKey(error, "uq_libraries_slug")) throw slugTaken();
    if (isDuplicateKey(error, "uq_users_email")) throw emailTaken("ownerEmail");
    throw error;
  }
  return getLibrary(deps, libraryId);
}

/** @param {PlatformDeps} deps */
async function getLibrary(deps, id) {
  const library = await requireLibrary(deps, id);
  const [usage, accounts] = await Promise.all([
    deps.repo.getLibraryUsage(deps.db, id),
    deps.users.listUsersOfLibrary(deps.db, id),
  ]);
  const withStatus = (user) => ({
    ...toPublicUser(user),
    status: user.status,
    lastLoginAt: user.lastLoginAt,
  });
  return { ...library, usage, users: accounts.map(withStatus) };
}

/** @param {PlatformDeps} deps */
async function updateLibrary(deps, actor, id, patch) {
  await requireLibrary(deps, id);
  await changeWithAudit(deps, actor, ["library.update", "library", id, patch], (tx) =>
    deps.repo.updateLibrary(tx, id, patch),
  );
  return getLibrary(deps, id);
}

/** @param {PlatformDeps} deps */
async function setLibraryStatus(deps, actor, id, status) {
  const library = await requireLibrary(deps, id);
  if (library.status !== status) {
    const action = status === "suspended" ? "library.suspend" : "library.activate";
    await changeWithAudit(deps, actor, [action, "library", id], (tx) =>
      deps.repo.updateLibraryStatus(tx, id, status),
    );
  }
  return getLibrary(deps, id);
}

/** @param {PlatformDeps} deps */
async function addOwner(deps, actor, libraryId, input) {
  await requireLibrary(deps, libraryId);
  if (await deps.users.findUserByEmail(deps.db, input.email)) throw emailTaken("email");
  const owner = await newOwnerRecord(libraryId, input);
  await changeWithAudit(
    deps,
    actor,
    ["user.create", "user", owner.id, { role: owner.role }],
    (tx) => deps.users.insertUser(tx, owner),
  );
  return getLibrary(deps, libraryId);
}

/** Enable/disable an owner or staff login. Super admins are not managed here. @param {PlatformDeps} deps */
async function setUserStatus(deps, actor, userId, status) {
  const user = await deps.users.findUserById(deps.db, userId);
  if (!user) throw notFound("User not found");
  if (user.role === ROLES.SUPER_ADMIN)
    throw forbidden("Super admin accounts can't be changed here");
  const action = status === "active" ? "user.enable" : "user.disable";
  await changeWithAudit(deps, actor, [action, "user", userId], (tx) =>
    deps.users.updateUserStatus(tx, userId, status),
  );
  return getLibrary(deps, user.tenantId);
}

/** @param {PlatformDeps} deps */
async function getSettings(deps) {
  const share = await deps.repo.getPlatformSetting(deps.db, DEFAULT_SHARE_KEY, DEFAULT_SHARE_BPS);
  return { mocktestDefaultShareBps: Number(share) };
}

/** @param {PlatformDeps} deps */
async function updateSettings(deps, actor, { mocktestDefaultShareBps }) {
  const audit = ["platform.settings", "platform", null, { mocktestDefaultShareBps }];
  await changeWithAudit(deps, actor, audit, (tx) =>
    deps.repo.setPlatformSetting(tx, DEFAULT_SHARE_KEY, mocktestDefaultShareBps),
  );
  return getSettings(deps);
}
