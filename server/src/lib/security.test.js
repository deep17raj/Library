import { test } from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";

const SECRET = "a-secret-that-is-long-enough-for-tests";

test("verifyToken accepts its own tokens and rejects tampering, wrong secret and expiry", () => {
  const token = signToken({ sub: "u1", role: "admin" }, SECRET, 60, 1000);
  assert.equal(verifyToken(token, SECRET, 1010).sub, "u1");
  assert.equal(verifyToken(token, "another-secret", 1010), null);
  assert.equal(verifyToken(token, SECRET, 1060), null, "expired exactly at exp");

  const [header, , signature] = token.split(".");
  const forgedBody = Buffer.from(
    JSON.stringify({ sub: "u1", role: "super_admin", exp: 9e9 }),
  ).toString("base64url");
  assert.equal(verifyToken(`${header}.${forgedBody}.${signature}`, SECRET, 1010), null);
  assert.equal(verifyToken("garbage", SECRET), null);
});

test("passwords hash with a random salt and verify", async () => {
  const first = await hashPassword("correct horse");
  const second = await hashPassword("correct horse");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse", first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
});
