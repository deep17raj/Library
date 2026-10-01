import { readCookies } from "../lib/cookies.js";
import { forbidden } from "../http/AppError.js";

/**
 * Requires a signed-in staff/owner/super-admin. Sets req.actor (see toPublicUser).
 * The user row is re-read on every request so disabling a user, changing their
 * password or suspending their library takes effect immediately.
 */
export function createRequireStaff({ authService, config }) {
  return function requireStaff(req, res, next) {
    const token = readCookies(req)[config.auth.staffCookie] || "";
    authService
      .resolveSession(token)
      .then((actor) => {
        req.actor = actor;
        next();
      })
      .catch(next);
  };
}

/** @param {...string} roles */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.actor || !roles.includes(req.actor.role)) return next(forbidden());
    return next();
  };
}
