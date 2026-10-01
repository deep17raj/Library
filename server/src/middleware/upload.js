import multer from "multer";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError } from "../http/AppError.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Accept one image in `field`, kept in memory (it is re-encoded by lib/images.js
 * before anything touches disk). The MIME check gives a quick, friendly error;
 * re-encoding is the real check.
 * @param {string} field
 * @param {{ maxBytes: number }} options
 */
export function singleImageUpload(field, { maxBytes }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter(req, file, accept) {
      if (IMAGE_TYPES.has(file.mimetype)) return accept(null, true);
      const message = "Use a JPG, PNG or WebP image";
      return accept(
        new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { [field]: message }),
      );
    },
  }).single(field);
}

/** After singleImageUpload: fail clearly when no file was sent. */
export function requireFile(field) {
  return (req, res, next) => {
    if (req.file) return next();
    const message = "Choose a file to upload";
    return next(new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { [field]: message }));
  };
}
