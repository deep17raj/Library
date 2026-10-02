import fs from "node:fs";
import path from "node:path";
import express from "express";
import { REPO_ROOT } from "../config/env.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { findLibraryBySlug } from "../modules/platform/platform.repository.js";
import { getSettings } from "../modules/settings/settings.repository.js";
import { renderAppIcon } from "./appIcons.js";
import { buildManifest, injectHead, isValidSlug } from "./studentShell.js";

const STUDENT_DIST = path.join(REPO_ROOT, "apps", "student", "dist");
const ICONS = {
  192: { size: 192, maskable: false },
  512: { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
};

/**
 * The student PWA. One build serves every library: assets live at /student/*, and each
 * library's app runs at /s/<slug>/ with its own manifest, icons and name injected, so
 * "Install app" puts that library's app on the phone. The service worker is served at
 * /sw.js so it can control /s/<slug>/ (it registers with that scope).
 * @param {import("express").Express} app
 * @param {{ db: import("mysql2/promise").Pool, storageDir: string }} deps
 */
export function serveStudentApp(app, { db, storageDir }) {
  serveBuildFiles(app);
  const loadLibrary = (slug) => (isValidSlug(slug) ? studentAppLibrary(db, slug) : null);
  serveInstallFiles(app, loadLibrary, storageDir);
  serveLibraryPages(app, loadLibrary);
}

/** The build's hashed assets (cached for a year) and the service worker (never cached). */
function serveBuildFiles(app) {
  app.use(
    "/student",
    express.static(STUDENT_DIST, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  app.get("/sw.js", (req, res) => {
    const file = path.join(STUDENT_DIST, "sw.js");
    if (!fs.existsSync(file)) return res.status(404).type("text").send("Not found");
    res.setHeader("Cache-Control", "no-cache"); // a new deploy's worker is picked up at once
    return res.type("application/javascript").sendFile(file);
  });
}

/** What "Install app" needs: the library's manifest and home-screen icons. */
function serveInstallFiles(app, loadLibrary, storageDir) {
  app.get(
    "/s/:slug/manifest.webmanifest",
    asyncHandler(async (req, res) => {
      const library = await loadLibrary(req.params.slug);
      if (!library) return res.status(404).type("text").send("Not found");
      res.setHeader("Cache-Control", "no-cache");
      return res.type("application/manifest+json").send(JSON.stringify(buildManifest(library)));
    }),
  );
  app.get(
    "/s/:slug/icon-:variant.png",
    asyncHandler(async (req, res) => {
      const variant = ICONS[req.params.variant];
      const library = variant && (await loadLibrary(req.params.slug));
      if (!library) return res.status(404).type("text").send("Not found");
      const logoFile = library.logoPath ? path.join(storageDir, "public", library.logoPath) : null;
      const png = await renderAppIcon({ ...variant, brandColor: library.brandColor, logoFile });
      res.setHeader("Cache-Control", "public, max-age=86400"); // URL carries ?v= on change
      return res.type("png").send(png);
    }),
  );
}

/** Every page of a library's app: the one shell, with that library's head tags. */
function serveLibraryPages(app, loadLibrary) {
  // /s/<slug> → /s/<slug>/ so the app's URLs sit inside the service worker's scope.
  // (Express routing isn't strict, so "/s/:slug" also matches "/s/x/" — pass that on.)
  app.get("/s/:slug", (req, res, next) => {
    if (req.path.endsWith("/")) return next();
    const query = req.originalUrl.slice(req.path.length);
    return res.redirect(301, `/s/${encodeURIComponent(req.params.slug)}/${query}`);
  });
  app.get(
    "/s/:slug/*",
    asyncHandler(async (req, res) => {
      const shell = path.join(STUDENT_DIST, "index.html");
      if (!fs.existsSync(shell)) {
        return res
          .status(503)
          .type("text")
          .send("App not built yet. Run: npm run build -w apps/student");
      }
      const html = injectHead(fs.readFileSync(shell, "utf8"), await loadLibrary(req.params.slug));
      res.setHeader("Cache-Control", "no-cache");
      return res.type("html").send(html);
    }),
  );
}

/** What the shell, manifest and icons need about an active library. */
async function studentAppLibrary(db, slug) {
  const library = await findLibraryBySlug(db, slug);
  if (!library || library.status !== "active") return null;
  const settings = await getSettings(db, library.id);
  return {
    slug: library.slug,
    name: settings?.displayName || library.name,
    brandColor: settings?.brandColor ?? "",
    logoPath: settings?.logoPath ?? "",
  };
}
