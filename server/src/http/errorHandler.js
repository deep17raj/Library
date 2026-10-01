import multer from "multer";
import { ZodError } from "zod";
import { ERROR_CODES } from "@app/shared/constants";
import { issuesToFields } from "@app/shared/validation";
import { AppError } from "./AppError.js";

/** Unknown /api paths answer in the API error format, not with an HTML page. */
export function apiNotFound(req, res) {
  sendError(res, 404, ERROR_CODES.NOT_FOUND, "No such API endpoint");
}

/**
 * Last middleware: every error leaves the API as `{ error: { code, message, fields } }`.
 * Unexpected errors are logged and hidden behind a generic message.
 */
// Express recognises an error handler by its 4 parameters, so _next must stay.
export function errorHandler(error, req, res, _next) {
  if (error instanceof AppError) {
    return sendError(res, error.status, error.code, error.message, error.fields);
  }
  if (error instanceof ZodError) {
    return sendError(
      res,
      422,
      ERROR_CODES.VALIDATION_FAILED,
      "Please check the highlighted fields",
      issuesToFields(error),
    );
  }
  if (error?.type === "entity.parse.failed") {
    return sendError(res, 400, ERROR_CODES.BAD_REQUEST, "Request body is not valid JSON");
  }
  if (error?.type === "entity.too.large") {
    return sendError(res, 413, ERROR_CODES.BAD_REQUEST, "Request is too large");
  }
  if (error?.code === "ER_DUP_ENTRY") {
    // A service should have caught this with a friendlier message; the unique key
    // is the backstop that still keeps the data right.
    return sendError(res, 409, ERROR_CODES.CONFLICT, "This conflicts with an existing record");
  }
  if (error?.code === "ER_ROW_IS_REFERENCED_2") {
    // A foreign key still points at the row: it has history (e.g. a seat that was
    // allocated). History is never deleted, so the answer is to disable it.
    return sendError(
      res,
      409,
      ERROR_CODES.IN_USE,
      "This is in use, so it can't be deleted. Disable it instead.",
    );
  }
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "The file is too large" : "Upload failed";
    return sendError(res, 413, ERROR_CODES.BAD_REQUEST, message, {
      [error.field || "file"]: message,
    });
  }
  console.error(`[${req.method} ${req.originalUrl}]`, error);
  return sendError(res, 500, ERROR_CODES.INTERNAL, "Something went wrong on our side");
}

function sendError(res, status, code, message, fields) {
  if (res.headersSent) return;
  res.status(status).json({ error: { code, message, fields: fields || {} } });
}
