import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError } from "../http/AppError.js";

/**
 * Re-encode an uploaded image to WebP and store it. Re-encoding (rather than
 * saving the bytes as sent) strips metadata such as GPS location and guarantees the
 * file really is an image — whatever its name or MIME type claimed.
 *
 * @param {Buffer} buffer
 * @param {{ storageDir: string, visibility: "public" | "private", tenantId: string,
 *   prefix: string, maxSide: number, field: string }} options
 * @returns {Promise<string>} path relative to the visibility root, e.g. "<tenant>/logo-….webp"
 */
export async function saveImage(
  buffer,
  { storageDir, visibility, tenantId, prefix, maxSide, field },
) {
  let webp;
  try {
    webp = await sharp(buffer)
      .rotate() // apply the phone camera's orientation before metadata is dropped
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    const message = "This file is not an image we can read. Use JPG, PNG or WebP.";
    throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { [field]: message });
  }
  const relativePath = `${tenantId}/${prefix}-${crypto.randomUUID()}.webp`;
  const fullPath = path.join(storageDir, visibility, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, webp);
  return relativePath;
}

/** Remove a replaced file; a file that is already gone is not an error. */
export async function deleteStoredFile(storageDir, visibility, relativePath) {
  if (!relativePath) return;
  await fs.rm(path.join(storageDir, visibility, relativePath), { force: true });
}

/** URL of a public file (served by static/serveFiles.js). */
export function publicFileUrl(relativePath) {
  return relativePath ? `/files/${relativePath}` : "";
}
