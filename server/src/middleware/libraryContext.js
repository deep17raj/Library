import { ERROR_CODES, hasPermission, ROLES } from "@app/shared/constants";
import { AppError, forbidden, notFound } from "../http/AppError.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Decides which library (tenant) a /api/admin request works on and puts it in
 * req.ctx = { tenantId, actor }. Owners and staff are locked to their own library;
 * the tenant never comes from the body or the URL. A super admin may work inside a
 * library by naming it in the X-Library-Id header (for support).
 * Runs after requireStaff.
 * @param {{ findLibraryById: (id: string) => Promise<{ id: string } | null> }} deps
 */
export function createRequireLibrary({ findLibraryById }) {
  return function requireLibrary(req, res, next) {
    resolveTenantId(req, findLibraryById)
      .then((tenantId) => {
        req.ctx = { tenantId, actor: req.actor };
        next();
      })
      .catch(next);
  };
}

async function resolveTenantId(req, findLibraryById) {
  if (req.actor.role !== ROLES.SUPER_ADMIN) return req.actor.tenantId;
  const requested = String(req.get("X-Library-Id") || "");
  if (!UUID.test(requested)) {
    throw new AppError(400, ERROR_CODES.LIBRARY_REQUIRED, "Choose a library first");
  }
  if (!(await findLibraryById(requested))) throw notFound("Library not found");
  return requested;
}

/**
 * Route guard for one staff permission. Owners (admin) and super admins pass.
 * @param {string} permission one of PERMISSIONS
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.actor, permission)) {
      return next(forbidden("You don't have permission to do this. Ask the library owner."));
    }
    return next();
  };
}
