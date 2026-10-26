import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_ICONS, ADMIN_ICON_VERSION, buildAdminManifest } from "./adminShell.js";

test("the admin manifest installs a standalone app scoped to /admin/", () => {
  const m = buildAdminManifest();
  assert.equal(m.start_url, "/admin/");
  assert.equal(m.scope, "/admin/");
  assert.equal(m.id, "/admin/");
  assert.equal(m.display, "standalone");
  assert.equal(m.theme_color, "#4f46e5");
  assert.ok(m.short_name.length <= 12, "short_name fits under a home-screen icon");
});

test("the manifest offers an icon for every served variant, versioned for cache-busting", () => {
  const m = buildAdminManifest();
  const srcs = m.icons.map((i) => i.src);
  for (const variant of Object.keys(ADMIN_ICONS)) {
    assert.ok(
      srcs.some((src) => src === `/admin/icon-${variant}.png?v=${ADMIN_ICON_VERSION}`),
      `icon-${variant}.png is in the manifest`,
    );
  }
  assert.ok(m.icons.some((i) => i.purpose === "maskable"));
});
