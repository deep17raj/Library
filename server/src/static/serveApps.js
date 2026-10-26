import fs from "node:fs";
import path from "node:path";
import express from "express";
import { REPO_ROOT } from "../config/env.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { renderAppIcon } from "./appIcons.js";
import {
  ADMIN_BRAND_COLOR,
  ADMIN_ICONS,
  ADMIN_ICON_VERSION,
  buildAdminManifest,
} from "./adminShell.js";
import { serveStudentApp } from "./serveStudentApp.js";

const ADMIN_DIST = path.join(REPO_ROOT, "apps", "admin", "dist");

/**
 * Serves the built React apps from the same Node process as the API (one cPanel app).
 * Hashed assets are cached for a year; index.html never, so a deploy shows up at once.
 * @param {import("express").Express} app
 * @param {{ db: import("mysql2/promise").Pool, storageDir: string }} deps
 */
export function serveApps(app, deps) {
  app.get("/", (req, res) => res.redirect("/admin/"));
  serveAdminInstallFiles(app); // before the static mount so these aren't shadowed
  serveSinglePageApp(app, "/admin", ADMIN_DIST, "npm run build -w apps/admin");
  serveStudentApp(app, deps);
}

/** What makes the admin app installable: its service worker, manifest and icons. */
function serveAdminInstallFiles(app) {
  app.get("/admin/sw.js", (req, res) => {
    const file = path.join(ADMIN_DIST, "sw.js");
    if (!fs.existsSync(file)) return res.status(404).type("text").send("Not found");
    res.setHeader("Cache-Control", "no-cache"); // a new deploy's worker is picked up at once
    return res.type("application/javascript").sendFile(file);
  });
  app.get("/admin/manifest.webmanifest", (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    return res.type("application/manifest+json").send(JSON.stringify(buildAdminManifest()));
  });
  app.get(
    "/admin/icon-:variant.png",
    asyncHandler(async (req, res) => {
      const variant = ADMIN_ICONS[req.params.variant];
      if (!variant) return res.status(404).type("text").send("Not found");
      const png = await renderAppIcon({
        ...variant,
        brandColor: ADMIN_BRAND_COLOR,
        logoFile: null,
      });
      res.setHeader("Cache-Control", `public, max-age=86400`); // URL carries ?v= on change
      res.setHeader("ETag", `"admin-icon-${req.params.variant}-${ADMIN_ICON_VERSION}"`);
      return res.type("png").send(png);
    }),
  );
}

function serveSinglePageApp(app, mountPath, distDir, buildCommand) {
  app.use(
    mountPath,
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  // Client-side routes (/admin/platform/libraries/…) all get the app shell.
  app.get([mountPath, `${mountPath}/*`], (req, res) => {
    const shell = path.join(distDir, "index.html");
    if (!fs.existsSync(shell)) {
      return res.status(503).type("text").send(`App not built yet. Run: ${buildCommand}`);
    }
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(shell);
  });
}
