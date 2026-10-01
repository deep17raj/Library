import { notFound } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { deleteStoredFile, publicFileUrl, saveImage } from "../../lib/images.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import * as settingsRepository from "./settings.repository.js";

const LOGO_MAX_SIDE = 512;

/**
 * @typedef {Object} SettingsDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {string} storageDir
 * @property {typeof settingsRepository} repo
 * @property {{ recordAudit: typeof recordAudit }} audit
 * @property {{ saveImage: typeof saveImage, deleteStoredFile: typeof deleteStoredFile }} files
 */

/** Library profile, timezone, prefixes and branding. */
export function createSettingsService({
  db,
  storageDir,
  repo = settingsRepository,
  audit = { recordAudit },
  files = { saveImage, deleteStoredFile },
}) {
  return bindDeps(
    { db, storageDir, repo, audit, files },
    { getSettings, updateSettings, updateBilling, replaceLogo, removeLogo },
  );
}

/** @param {SettingsDeps} deps */
async function loadSettings(deps, tenantId) {
  const settings = await deps.repo.getSettings(deps.db, tenantId);
  if (!settings) throw notFound("Library settings not found");
  return settings;
}

/** What the API returns: the logo as a URL, never a storage path. */
function present({ logoPath, ...settings }) {
  return { ...settings, logoUrl: publicFileUrl(logoPath) };
}

/** @param {SettingsDeps} deps */
async function getSettings(deps, ctx) {
  return present(await loadSettings(deps, ctx.tenantId));
}

/** @param {SettingsDeps} deps */
async function updateSettings(deps, ctx, values) {
  await loadSettings(deps, ctx.tenantId);
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.updateProfile(tx, ctx.tenantId, values);
    await deps.audit.recordAudit(tx, byUser(ctx.actor, "settings.update", "library", ctx.tenantId));
  });
  return getSettings(deps, ctx);
}

/**
 * Billing rules. They apply to invoices created from now on; existing invoices keep
 * the amounts they were created with.
 * @param {SettingsDeps} deps
 */
async function updateBilling(deps, ctx, values) {
  await loadSettings(deps, ctx.tenantId);
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.updateBilling(tx, ctx.tenantId, values);
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "settings.billing", "library", ctx.tenantId, values),
    );
  });
  return getSettings(deps, ctx);
}

/** @param {SettingsDeps} deps @param {Buffer} imageBuffer */
async function replaceLogo(deps, ctx, imageBuffer) {
  const previous = await loadSettings(deps, ctx.tenantId);
  const logoPath = await deps.files.saveImage(imageBuffer, {
    storageDir: deps.storageDir,
    visibility: "public",
    tenantId: ctx.tenantId,
    prefix: "logo",
    maxSide: LOGO_MAX_SIDE,
    field: "logo",
  });
  await deps.repo.setLogoPath(deps.db, ctx.tenantId, logoPath);
  // The old logo is only branding, not history, so its file is removed.
  await deps.files.deleteStoredFile(deps.storageDir, "public", previous.logoPath);
  return getSettings(deps, ctx);
}

/** @param {SettingsDeps} deps */
async function removeLogo(deps, ctx) {
  const previous = await loadSettings(deps, ctx.tenantId);
  await deps.repo.setLogoPath(deps.db, ctx.tenantId, "");
  await deps.files.deleteStoredFile(deps.storageDir, "public", previous.logoPath);
  return getSettings(deps, ctx);
}
