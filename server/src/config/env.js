import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * @typedef {Object} AppConfig
 * @property {boolean} isProduction
 * @property {string} listenTarget  TCP port, or a Unix socket path from Passenger
 * @property {string} appBaseUrl
 * @property {boolean} trustProxy
 * @property {string} storageDir  uploads: <dir>/public is served at /files, <dir>/private never is
 * @property {{ uri?: string, host: string, port: number, user: string, password: string,
 *   database: string, connectionLimit: number }} db
 * @property {{ jwtSecret: string, staffCookie: string, cookieSecure: boolean,
 *   staffTokenTtlSeconds: number }} auth
 * @property {{ email: string, password: string, name: string }} superAdmin
 */

/** @type {AppConfig | null} */
let cached = null;

/** Read and check process.env once. Everything else uses the result, never process.env. */
export function getConfig() {
  if (cached) return cached;
  dotenv.config({ path: path.join(REPO_ROOT, ".env") });
  const env = process.env;
  const isProduction = env.NODE_ENV === "production";

  cached = Object.freeze({
    isProduction,
    listenTarget: env.PORT || "5060",
    appBaseUrl: (env.APP_BASE_URL || "").trim().replace(/\/+$/, ""),
    trustProxy: env.TRUST_PROXY !== "false",
    storageDir: path.resolve(env.STORAGE_DIR || path.join(REPO_ROOT, "server", "storage")),
    db: readDbConfig(env),
    auth: {
      jwtSecret: resolveJwtSecret(env.JWT_SECRET, isProduction),
      staffCookie: "sl_staff",
      cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : isProduction,
      staffTokenTtlSeconds: Number(env.STAFF_TOKEN_TTL || 60 * 60 * 12),
    },
    superAdmin: {
      email: (env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase(),
      password: env.SUPER_ADMIN_PASSWORD || "",
      name: (env.SUPER_ADMIN_NAME || "Platform Owner").trim(),
    },
  });
  return cached;
}

/** @param {NodeJS.ProcessEnv} env */
function readDbConfig(env) {
  return {
    uri: env.DATABASE_URL || undefined,
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || "study_library",
    connectionLimit: Number(env.DB_CONNECTION_LIMIT || 10),
  };
}

// Without a stable secret every restart logs everyone out, so production refuses
// to boot; development gets a throwaway secret and a warning.
function resolveJwtSecret(value, isProduction) {
  const secret = String(value || "").trim();
  if (secret.length >= 32) return secret;
  if (isProduction) throw new Error("JWT_SECRET must be set to at least 32 characters");
  console.warn("JWT_SECRET missing or short: using a temporary one (sessions end on restart).");
  return crypto.randomBytes(48).toString("hex");
}
