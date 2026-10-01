import { ERROR_CODES } from "@app/shared/constants";

/**
 * The one error type services throw. The error handler turns it into
 * `{ error: { code, message, fields } }` with this status.
 */
export class AppError extends Error {
  /**
   * @param {number} status
   * @param {string} code     one of ERROR_CODES
   * @param {string} message  shown to people as-is
   * @param {Record<string, string>} [fields]
   */
  constructor(status, code, message, fields) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const unauthenticated = (message = "Please sign in") =>
  new AppError(401, ERROR_CODES.UNAUTHENTICATED, message);
export const forbidden = (message = "You don't have access to this") =>
  new AppError(403, ERROR_CODES.FORBIDDEN, message);
export const notFound = (message = "Not found") =>
  new AppError(404, ERROR_CODES.NOT_FOUND, message);
export const conflict = (code, message, fields) => new AppError(409, code, message, fields);
