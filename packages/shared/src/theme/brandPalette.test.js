import { test } from "node:test";
import assert from "node:assert/strict";
import { brandPalette, isHexColor } from "./brandPalette.js";

test("brandPalette derives dark and light shades as RGB triplets", () => {
  assert.deepEqual(brandPalette("#ff0000"), {
    brand: "255 0 0",
    brandDark: "204 0 0",
    brandLight: "255 217 217",
  });
});

test("an invalid colour falls back to the default brand", () => {
  assert.equal(brandPalette("red").brand, "79 70 229");
  assert.equal(isHexColor("#12abEF"), true);
  assert.equal(isHexColor("#123"), false);
});
