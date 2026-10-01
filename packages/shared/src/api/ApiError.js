import { ERROR_CODES } from "../constants/errorCodes.js";

/** The client-side shape of the API error format `{ error: { code, message, fields } }`. */
export class ApiError extends Error {
  /**
   * @param {{ status: number, code: string, message: string, fields?: Record<string, string> }} details
   */
  constructor({ status, code, message, fields }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields || {};
  }
}

/**
 * Build an ApiError from any response body — including HTML error pages from a
 * proxy, which happen on shared hosting when the Node app is restarting.
 * @param {number} status
 * @param {unknown} body
 */
export function toApiError(status, body) {
  const error = body && typeof body === "object" ? /** @type {any} */ (body).error : null;
  if (error && typeof error.code === "string") {
    return new ApiError({
      status,
      code: error.code,
      message: error.message || "Something went wrong",
      fields: error.fields,
    });
  }
  return new ApiError({
    status,
    code: status === 0 ? "NETWORK" : ERROR_CODES.INTERNAL,
    message:
      status === 0
        ? "Can't reach the server. Check your internet connection."
        : "The server had a problem. Please try again.",
  });
}
