import fs from "node:fs";
import path from "node:path";
import express from "express";
import { REPO_ROOT } from "../config/env.js";

const ADMIN_DIST = path.join(REPO_ROOT, "apps", "admin", "dist");

/**
 * Serves the built React apps from the same Node process as the API (one cPanel app).
 * Hashed assets are cached for a year; index.html never, so a deploy shows up at once.
 * @param {import("express").Express} app
 */
export function serveApps(app) {
  app.get("/", (req, res) => res.redirect("/admin/"));
  serveSinglePageApp(app, "/admin", ADMIN_DIST, "npm run build -w apps/admin");
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
