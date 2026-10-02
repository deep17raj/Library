import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDb } from "../../../testing/fakes.js";
import { createPushService, deviceLabel } from "./push.service.js";

const CTX = { tenantId: "lib-1", actor: { kind: "student", id: "m-1" } };
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

function fakePlatform() {
  const settings = new Map();
  return {
    settings,
    getPlatformSetting: async (db, key, fallback) =>
      settings.has(key) ? settings.get(key) : fallback,
    insertPlatformSettingIfAbsent: async (db, key, value) => {
      if (!settings.has(key)) settings.set(key, value);
    },
  };
}

function fakePushRepo() {
  const rows = new Map(); // endpointHash -> row
  return {
    rows,
    upsertSubscription: async (db, tenantId, s) => rows.set(s.endpointHash, { ...s, tenantId }),
    deleteSubscription: async (db, tenantId, memberId, hash) => {
      if (rows.get(hash)?.memberId === memberId) rows.delete(hash);
    },
    listDevices: async (db, tenantId, memberId) =>
      [...rows.values()].filter((r) => r.memberId === memberId),
  };
}

test("the VAPID key pair is made once and reused (also by a restarted server)", async () => {
  const platform = fakePlatform();
  const first = createPushService({ db: fakeDb(), platform, repo: fakePushRepo() });
  const key = await first.getPublicKey();
  assert.equal(await first.getPublicKey(), key);
  const restarted = createPushService({ db: fakeDb(), platform, repo: fakePushRepo() });
  assert.equal(await restarted.getPublicKey(), key);
});

test("subscribing stores one row per browser and labels it; others are refused", async () => {
  const repo = fakePushRepo();
  const service = createPushService({ db: fakeDb(), platform: fakePlatform(), repo });
  const sub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { p256dh: "k", auth: "a" },
  };
  await service.subscribe(CTX, sub, CHROME_ANDROID);
  const devices = await service.subscribe(CTX, sub, CHROME_ANDROID);
  assert.equal(devices.length, 1);
  assert.equal(devices[0].label, "Chrome on Android");
  assert.equal("endpoint" in devices[0], false, "endpoints never go back to the client");

  await assert.rejects(
    service.subscribe(CTX, { ...sub, endpoint: "https://evil.example/x" }, ""),
    /push service isn't supported/,
  );
  assert.equal((await service.unsubscribe(CTX, { endpoint: sub.endpoint })).length, 0);
});

test("device labels read like people say them", () => {
  assert.equal(deviceLabel(CHROME_ANDROID), "Chrome on Android");
  assert.equal(
    deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604.1"),
    "Safari on iPhone",
  );
  assert.equal(deviceLabel(""), "Browser");
});
