import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./csv.js";

test("toCsv quotes commas and quotes, keeps numbers, adds a BOM", () => {
  const csv = toCsv(
    ["Name", "Amount"],
    [
      ["Rao, Asha", 800],
      ['Say "hi"', 0],
    ],
  );
  assert.equal(csv, '\uFEFFName,Amount\r\n"Rao, Asha",800\r\n"Say ""hi""",0\r\n');
});

test("toCsv neutralises spreadsheet formulas in text", () => {
  const csv = toCsv(["Name"], [['=HYPERLINK("x")'], ["-5 cash"], ["@sum"]]);
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /'-5 cash/);
  assert.match(csv, /'@sum/);
});
