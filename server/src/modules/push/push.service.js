import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError } from "../../http/AppError.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { generateVapidKeys, isAllowedPushEndpoint } from "../../lib/vapid.js";
import {
  getPlatformSetting,
  insertPlatformSettingIfAbsent,
} from "../platform/platform.repository.js";
import * as pushRepository from "./push.repository.js";

const VAPID_SETTING = "vapid_keys";

/**
 * @typedef {object} PushDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof pushRepository} repo
 * @property {{ getPlatformSetting: typeof getPlatformSetting,
 *   insertPlatformSettingIfAbsent: typeof insertPlatformSettingIfAbsent }} platform
 * @property {{ keys?: { publicKey: string, privateKey: string } }} cache
 */

/**
 * Web Push: the server's key pair and students' browser subscriptions. Sending
 * notifications arrives in milestone 8; this milestone lets students turn them on.
 */
export function createPushService({
  db,
  repo = pushRepository,
  platform = { getPlatformSetting, insertPlatformSettingIfAbsent },
}) {
  return bindDeps(
    { db, repo, platform, cache: {} },
    { getVapidKeys, getPublicKey, subscribe, unsubscribe, listDevices },
  );
}

/**
 * The VAPID key pair, created on first use and stored once (first writer wins, so two
 * simultaneous first requests still end up with one pair).
 * @param {PushDeps} deps
 */
async function getVapidKeys(deps) {
  if (deps.cache.keys) return deps.cache.keys;
  let keys = await deps.platform.getPlatformSetting(deps.db, VAPID_SETTING, null);
  if (!keys) {
    await deps.platform.insertPlatformSettingIfAbsent(deps.db, VAPID_SETTING, generateVapidKeys());
    keys = await deps.platform.getPlatformSetting(deps.db, VAPID_SETTING, null);
  }
  deps.cache.keys = keys;
  return keys;
}

/** @param {PushDeps} deps */
async function getPublicKey(deps) {
  return (await getVapidKeys(deps)).publicKey;
}

const hashEndpoint = (endpoint) => crypto.createHash("sha256").update(endpoint).digest("hex");

/** @param {PushDeps} deps */
async function subscribe(deps, ctx, { endpoint, keys }, userAgent = "") {
  if (!isAllowedPushEndpoint(endpoint)) {
    throw new AppError(
      422,
      ERROR_CODES.VALIDATION_FAILED,
      "This browser's push service isn't supported",
      {
        endpoint: "Unsupported push service",
      },
    );
  }
  await deps.repo.upsertSubscription(deps.db, ctx.tenantId, {
    id: crypto.randomUUID(),
    memberId: ctx.actor.id,
    endpoint,
    endpointHash: hashEndpoint(endpoint),
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: String(userAgent).slice(0, 255),
  });
  return listDevices(deps, ctx);
}

/** @param {PushDeps} deps */
async function unsubscribe(deps, ctx, { endpoint }) {
  await deps.repo.deleteSubscription(deps.db, ctx.tenantId, ctx.actor.id, hashEndpoint(endpoint));
  return listDevices(deps, ctx);
}

/**
 * The student's devices, labelled for people ("Chrome on Android"). `endpointHash`
 * lets the app tell which row is the phone in their hand.
 * @param {PushDeps} deps
 */
async function listDevices(deps, ctx) {
  const devices = await deps.repo.listDevices(deps.db, ctx.tenantId, ctx.actor.id);
  // Picked field by field: endpoints and keys never go back to the client.
  return devices.map(({ id, endpointHash, userAgent, createdAt, updatedAt }) => ({
    id,
    endpointHash,
    label: deviceLabel(userAgent),
    createdAt,
    updatedAt,
  }));
}

/** A readable name for a browser from its user agent; good enough to tell phones apart. */
export function deviceLabel(userAgent = "") {
  const ua = String(userAgent);
  const browser =
    (/SamsungBrowser/.test(ua) && "Samsung Internet") ||
    (/Edg\//.test(ua) && "Edge") ||
    (/Firefox\//.test(ua) && "Firefox") ||
    (/Chrome\//.test(ua) && "Chrome") ||
    (/Safari\//.test(ua) && "Safari") ||
    "Browser";
  const system =
    (/Android/.test(ua) && "Android") ||
    (/iPhone|iPad/.test(ua) && "iPhone") ||
    (/Windows/.test(ua) && "Windows") ||
    (/Mac OS X/.test(ua) && "Mac") ||
    (/Linux/.test(ua) && "Linux") ||
    "";
  return system ? `${browser} on ${system}` : browser;
}
