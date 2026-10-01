import path from "node:path";
import express from "express";

/**
 * Public uploads (logos, later member photos) at /files/<tenant>/<name>.webp.
 * File names contain a random UUID and are never overwritten, so they can be cached
 * forever. <storageDir>/private (ID proofs) is deliberately NOT served here; those
 * files go through an authenticated route.
 * @param {import("express").Express} app
 * @param {string} storageDir
 */
export function serveFiles(app, storageDir) {
  app.use(
    "/files",
    express.static(path.join(storageDir, "public"), {
      index: false,
      dotfiles: "deny",
      immutable: true,
      maxAge: "365d",
    }),
  );
}
