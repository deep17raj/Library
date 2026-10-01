import { test } from "node:test";
import assert from "node:assert/strict";
import { asJson, buildPatch } from "./patch.js";

test("buildPatch maps only present, known keys and keeps explicit nulls", () => {
  const result = buildPatch(
    { name: "Hall A", categoryId: null, sortOrder: undefined, hacker: "x", features: ["window"] },
    {
      name: "name",
      categoryId: "category_id",
      sortOrder: "sort_order",
      features: asJson("features"),
    },
  );
  assert.deepEqual(result, {
    assignments: "name = ?, category_id = ?, features = ?",
    params: ["Hall A", null, '["window"]'],
  });
});

test("buildPatch returns null when there is nothing to update", () => {
  assert.equal(buildPatch({}, { name: "name" }), null);
});
