import { ERROR_CODES } from "@app/shared/constants";
import { AppError } from "../http/AppError.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard for cookie-authenticated APIs: a cross-site form or <img> can't set
 * custom headers, so requiring X-Requested-With on writes means the request came
 * from our own scripts. Webhooks and the cron endpoint are mounted before this.
 */
export function requireAppHeader(req, res, next) {
  if (SAFE_METHODS.has(req.method) || req.get("X-Requested-With") === "app") return next();
  return next(new AppError(403, ERROR_CODES.FORBIDDEN, "Request blocked (missing app header)"));
}

/** Baseline browser hardening for every response. */
export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
}

/** API responses carry personal data; never let a shared proxy cache them. */
export function noStore(req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  next();
}
