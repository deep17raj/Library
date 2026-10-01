import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleHalls } from "./layoutTree.js";

test("assembleHalls nests tables and seats in their given order", () => {
  const halls = [{ id: "h1" }, { id: "h2" }];
  const tables = [
    { id: "t2", hallId: "h1" },
    { id: "t1", hallId: "h1" },
  ];
  const seats = [
    { id: "s1", tableId: "t1" },
    { id: "s2", tableId: "t2" },
    { id: "s3", tableId: "t1" },
  ];
  const tree = assembleHalls(halls, tables, seats);
  assert.deepEqual(
    tree[0].tables.map((t) => [t.id, t.seats.map((s) => s.id)]),
    [
      ["t2", ["s2"]],
      ["t1", ["s1", "s3"]],
    ],
  );
  assert.deepEqual(tree[1].tables, [], "empty hall still listed");
});
