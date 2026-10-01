import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeAudit, fakeDb } from "../../../testing/fakes.js";
import { createWaitlistService, waitlistConverter } from "./waitlist.service.js";

const ctx = { tenantId: "lib", actor: { id: "owner" } };
const entry = (id, slotId, status = "waiting") => ({ id, slotId, status, name: id });

function serviceWith(entries) {
  const repo = {
    listEntries: async () => entries,
    findEntry: async (db, tenantId, id) => entries.find((e) => e.id === id) || null,
    updateEntry: async () => {},
  };
  return createWaitlistService({ db: fakeDb(), repo, slots: {}, audit: fakeAudit() });
}

test("each slot has its own queue; closed entries have no position", async () => {
  const service = serviceWith([
    entry("a", "morning"),
    entry("b", "evening"),
    entry("c", "morning", "converted"),
    entry("d", "morning", "offered"),
  ]);
  const listed = await service.listEntries(ctx, { open: false });
  assert.deepEqual(
    listed.map((e) => [e.id, e.position]),
    [
      ["a", 1],
      ["b", 1],
      ["c", null],
      ["d", 2],
    ],
  );
});

test("converted and cancelled entries are final", async () => {
  const service = serviceWith([entry("c", "morning", "converted")]);
  await assert.rejects(service.updateEntry(ctx, "c", { status: "waiting" }), { status: 409 });
});

test("converting an entry that is no longer open fails the whole member save", async () => {
  const converter = waitlistConverter({ markConverted: async () => false });
  await assert.rejects(converter.markConverted(null, "lib", "x", "member"), (error) => {
    assert.equal(error.status, 409);
    assert.ok(error.fields.waitlistEntryId);
    return true;
  });
});
