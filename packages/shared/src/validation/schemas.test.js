import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bpsToPercentInput,
  changePasswordSchema,
  createLibrarySchema,
  issuesToFields,
  libraryEditFormSchema,
  suggestSlug,
  updateLibrarySchema,
} from "./index.js";

const validLibrary = {
  name: "Sardar Patel Library",
  slug: "sardar-patel",
  ownerName: "Ravi Kumar",
  ownerEmail: "RAVI@Example.com ",
  ownerPassword: "long-enough",
};

test("createLibrarySchema normalises email and slug", () => {
  const parsed = createLibrarySchema.parse({ ...validLibrary, slug: "Sardar-Patel" });
  assert.equal(parsed.ownerEmail, "ravi@example.com");
  assert.equal(parsed.slug, "sardar-patel");
});

test("createLibrarySchema reports every bad field by name", () => {
  const result = createLibrarySchema.safeParse({
    ...validLibrary,
    slug: "bad slug!",
    ownerPassword: "short",
  });
  assert.equal(result.success, false);
  const fields = issuesToFields(result.error);
  assert.ok(fields.slug);
  assert.ok(fields.ownerPassword);
  assert.equal(fields.name, undefined);
});

test("updateLibrarySchema accepts null share (platform default) and rejects > 100%", () => {
  assert.equal(updateLibrarySchema.parse({ mocktestShareBps: null }).mocktestShareBps, null);
  assert.equal(updateLibrarySchema.safeParse({ mocktestShareBps: 10001 }).success, false);
});

test("changePasswordSchema rejects reusing the current password", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "same-password",
    newPassword: "same-password",
  });
  assert.equal(result.success, false);
  assert.ok(issuesToFields(result.error).newPassword);
});

test("suggestSlug", () => {
  assert.equal(suggestSlug("  Sardar Patel Library!! "), "sardar-patel-library");
});

test("libraryEditFormSchema turns a percentage into basis points", () => {
  assert.deepEqual(libraryEditFormSchema.parse({ name: "Lib One", sharePercent: "12.5" }), {
    name: "Lib One",
    mocktestShareBps: 1250,
  });
  assert.equal(
    libraryEditFormSchema.parse({ name: "Lib One", sharePercent: "" }).mocktestShareBps,
    null,
  );
  assert.equal(
    libraryEditFormSchema.safeParse({ name: "Lib One", sharePercent: "101" }).success,
    false,
  );
  assert.equal(bpsToPercentInput(2000), "20");
  assert.equal(bpsToPercentInput(null), "");
});
