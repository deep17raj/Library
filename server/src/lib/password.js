import crypto from "node:crypto";
import { promisify } from "node:util";

// scrypt is built into Node: nothing native to compile on shared hosting.
// Stored as "scrypt$<salt hex>$<hash hex>". Async so a login never blocks the event loop.
const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const derived = await scrypt(String(password), salt, KEY_LENGTH);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

// Verified against when the email is unknown, so "no such user" takes as long as
// "wrong password" and response time doesn't reveal which emails exist.
export const DUMMY_PASSWORD_HASH =
  "scrypt$00000000000000000000000000000000$" + "0".repeat(KEY_LENGTH * 2);
