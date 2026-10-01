import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRupees, paiseToInput, sumPaise, toPaise } from "./paise.js";

test("toPaise parses typed rupee amounts", () => {
  assert.equal(toPaise("800"), 80000);
  assert.equal(toPaise("1,250.5"), 125050);
  assert.equal(toPaise("₹ 99.05"), 9905);
  assert.equal(toPaise(12), 1200);
  assert.equal(toPaise("0"), 0);
});

test("toPaise rejects anything that is not a clean amount", () => {
  for (const bad of ["", "-5", "1.234", "abc", "1e3", null, undefined]) {
    assert.equal(toPaise(bad), null, `expected null for ${bad}`);
  }
});

test("formatRupees uses Indian grouping and hides zero paise", () => {
  assert.equal(formatRupees(12500000), "₹1,25,000");
  assert.equal(formatRupees(125050), "₹1,250.50");
  assert.equal(formatRupees(0), "₹0");
  assert.equal(formatRupees(-5000), "-₹50");
});

test("paiseToInput and sumPaise", () => {
  assert.equal(paiseToInput(125050), "1250.5");
  assert.equal(sumPaise([100, 250, 1]), 351);
});
