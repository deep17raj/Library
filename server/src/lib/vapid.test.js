import assert from "node:assert/strict";
import { test } from "node:test";
import { generateVapidKeys, isAllowedPushEndpoint } from "./vapid.js";

test("VAPID keys are a 65-byte uncompressed point and a 32-byte scalar", () => {
  const { publicKey, privateKey } = generateVapidKeys();
  const point = Buffer.from(publicKey, "base64url");
  assert.equal(point.length, 65);
  assert.equal(point[0], 0x04);
  assert.equal(Buffer.from(privateKey, "base64url").length, 32);
  assert.notEqual(generateVapidKeys().publicKey, publicKey, "a fresh pair each time");
});

test("only https endpoints of real push services are accepted", () => {
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"), true);
  assert.equal(isAllowedPushEndpoint("https://wns2-pn1p.notify.windows.com/w/?token=x"), true);
  assert.equal(isAllowedPushEndpoint("https://web.push.apple.com/QGx"), true);
  assert.equal(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc"), false);
  assert.equal(isAllowedPushEndpoint("https://evil.example/fcm.googleapis.com"), false);
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.example/x"), false);
  assert.equal(isAllowedPushEndpoint("https://127.0.0.1/x"), false);
  assert.equal(isAllowedPushEndpoint("not a url"), false);
});
