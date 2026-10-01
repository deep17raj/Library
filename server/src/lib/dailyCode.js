import crypto from "node:crypto";

// The check-in code shown on the desk screen. It is derived, never stored: a short
// HMAC of the library and the library-local date, so it rotates every day and can't be
// reused tomorrow. A new code each day is enough to stop a photo of the QR working
// later; the slot and dues checks do the real gatekeeping. See docs/ARCHITECTURE.md §9.

const CODE_LENGTH = 6;
// No 0/O/1/I so staff reading it aloud and students typing it don't trip up.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * @param {string} secret  a stable server secret (config.jwtSecret)
 * @param {string} tenantId
 * @param {string} dateKey  library-local YYYY-MM-DD
 * @returns {string} e.g. "7KQ9MT"
 */
export function dailyCode(secret, tenantId, dateKey) {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`checkin:${tenantId}:${dateKey}`)
    .digest();
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) code += ALPHABET[digest[i] % ALPHABET.length];
  return code;
}

/**
 * Constant-time comparison of a typed code against today's code.
 * @returns {boolean}
 */
export function verifyDailyCode(secret, tenantId, dateKey, candidate) {
  const expected = Buffer.from(dailyCode(secret, tenantId, dateKey));
  const actual = Buffer.from(String(candidate || "").toUpperCase());
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
