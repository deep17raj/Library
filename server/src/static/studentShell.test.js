import assert from "node:assert/strict";
import { test } from "node:test";
import { buildManifest, injectHead, isValidSlug, safeColor } from "./studentShell.js";

const library = {
  slug: "gyan",
  name: "Gyan Library & Study Point",
  brandColor: "#0f766e",
  logoPath: "",
};

test("slugs follow the library slug rule", () => {
  assert.equal(isValidSlug("gyan-2"), true);
  assert.equal(isValidSlug("Gyan"), false);
  assert.equal(isValidSlug("../etc"), false);
  assert.equal(isValidSlug("-x"), false);
});

test("the manifest installs the app scoped to the library", () => {
  const m = buildManifest(library);
  assert.equal(m.start_url, "/s/gyan/");
  assert.equal(m.scope, "/s/gyan/");
  assert.equal(m.id, "/s/gyan/");
  assert.equal(m.display, "standalone");
  assert.equal(m.theme_color, "#0f766e");
  assert.equal(m.short_name, "Gyan");
  assert.deepEqual(
    m.icons.map((i) => [i.sizes, i.purpose]),
    [
      ["192x192", "any"],
      ["512x512", "any"],
      ["512x512", "maskable"],
    ],
  );
  assert.match(m.icons[0].src, /^\/s\/gyan\/icon-192\.png\?v=[0-9a-f]{8}$/);
});

test("a bad colour falls back to the default brand colour", () => {
  assert.equal(safeColor("red"), "#4f46e5");
  assert.equal(buildManifest({ ...library, brandColor: "javascript:" }).theme_color, "#4f46e5");
});

test("the head gets the manifest, colour and an escaped name", () => {
  const html =
    '<html><head><meta name="theme-color" content="#4f46e5" /><title>Study Library</title></head><body></body></html>';
  const out = injectHead(html, { ...library, name: "A <b>&</b> B" });
  assert.match(out, /<link rel="manifest" href="\/s\/gyan\/manifest.webmanifest" \/>/);
  assert.match(out, /<meta name="theme-color" content="#0f766e" \/>/);
  assert.match(out, /<title>A &lt;b&gt;&amp;&lt;\/b&gt; B<\/title>/);
  assert.equal(out.includes("<b>"), false);
  assert.equal(injectHead(html, null), html, "unknown library: shell unchanged");
});
