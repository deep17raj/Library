import crypto from "node:crypto";

// Minimal HS256 JWT (ported from the gym app): no dependency, constant-time verify.

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signature(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string} secret
 * @param {number} ttlSeconds
 * @param {number} [nowSeconds]
 */
export function signToken(payload, secret, ttlSeconds, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(
    JSON.stringify({ ...payload, iat: nowSeconds, exp: nowSeconds + ttlSeconds }),
  );
  return `${header}.${body}.${signature(`${header}.${body}`, secret)}`;
}

/**
 * @returns {Record<string, any> | null} the payload, or null if forged, malformed or expired
 */
export function verifyToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [header, body, given] = parts;
  const expected = Buffer.from(signature(`${header}.${body}`, secret));
  const actual = Buffer.from(given);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || nowSeconds >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
