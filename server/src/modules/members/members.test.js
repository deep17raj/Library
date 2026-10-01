import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeAudit, fakeDb } from "../../../testing/fakes.js";
import { createMembersService, presentMember } from "./members.service.js";

const ctx = { tenantId: "lib", actor: { id: "owner" } };
const ASHA = {
  id: "asha",
  memberCode: "S1002",
  name: "Asha Rao",
  phone: "9876500002",
  status: "active",
  photoPath: "lib/photo-1.webp",
  idProofPath: "lib/id-proof-1.webp",
};

function setup({ activeBookings = 0 } = {}) {
  const members = new Map([[ASHA.id, { ...ASHA }]]);
  const repo = {
    findMember: async (db, tenantId, id) => members.get(id) || null,
    findMemberByPhone: async (db, tenantId, phone) =>
      [...members.values()].find((m) => m.phone === phone) || null,
    updateMember: async (db, tenantId, id, patch) => Object.assign(members.get(id), patch),
  };
  const service = createMembersService({
    db: fakeDb(),
    storageDir: "",
    seating: { listMemberSubscriptions: async () => [] },
    repo,
    occupancy: {
      countActiveSubscriptionsOfMember: async () => activeBookings,
      listMemberSeatHistory: async () => [],
    },
    audit: fakeAudit(),
  });
  return { service, members };
}

test("the API shows URLs, never storage paths", () => {
  const shown = presentMember(ASHA);
  assert.equal(shown.photoUrl, "/files/lib/photo-1.webp");
  assert.equal(shown.hasIdProof, true);
  assert.equal("idProofPath" in shown, false);
  assert.equal("photoPath" in shown, false);
});

test("a phone number already used by someone else is refused, naming them", async () => {
  const { service } = setup();
  await assert.rejects(
    service.createMember(ctx, { name: "X", phone: ASHA.phone, bookings: [] }),
    (error) => {
      assert.equal(error.code, "PHONE_TAKEN");
      assert.match(error.fields.phone, /Asha Rao \(S1002\)/);
      return true;
    },
  );
});

test("a member with active bookings can't be made inactive", async () => {
  const { service } = setup({ activeBookings: 1 });
  await assert.rejects(service.updateMember(ctx, "asha", { status: "inactive" }), {
    code: "IN_USE",
  });
  const free = setup({ activeBookings: 0 });
  const { member } = await free.service.updateMember(ctx, "asha", { status: "inactive" });
  assert.equal(member.status, "inactive");
});
