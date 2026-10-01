import { ERROR_CODES } from "@app/shared/constants";
import { AppError } from "../http/AppError.js";

/**
 * Counts FAILED attempts per key and blocks the key once it reaches the limit
 * within the window. A success clears the key, so a person who mistypes a few
 * times is never locked out, but guessing is capped. (Pattern from the gym app.)
 *
 * In-memory: correct for one Passenger process (see docs/TECH-DEBT.md).
 *
 * @param {{ windowMs: number, maxFailures: number, keyOf: (req: any) => string,
 *   message: string, now?: () => number }} options
 */
export function createFailureThrottle({ windowMs, maxFailures, keyOf, message, now = Date.now }) {
  /** @type {Map<string, { count: number, firstAt: number }>} */
  const failures = new Map();

  function prune(time) {
    for (const [key, entry] of failures) {
      if (time - entry.firstAt > windowMs) failures.delete(key);
    }
  }

  function guard(req, res, next) {
    const time = now();
    prune(time);
    const entry = failures.get(keyOf(req));
    if (entry && entry.count >= maxFailures) {
      const retryAfterSeconds = Math.ceil((windowMs - (time - entry.firstAt)) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return next(new AppError(429, ERROR_CODES.RATE_LIMITED, message));
    }
    return next();
  }

  function recordFailure(req) {
    const key = keyOf(req);
    const entry = failures.get(key);
    if (!entry || now() - entry.firstAt > windowMs) failures.set(key, { count: 1, firstAt: now() });
    else entry.count += 1;
  }

  function clear(req) {
    failures.delete(keyOf(req));
  }

  return { guard, recordFailure, clear };
}
