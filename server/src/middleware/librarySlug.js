import { ERROR_CODES } from "@app/shared/constants";
import { AppError } from "../http/AppError.js";
import { asyncHandler } from "../http/asyncHandler.js";

/**
 * For the student-facing API (/api/s/:slug/*): the library comes from the URL slug —
 * there is no staff session to take it from. Sets req.library and req.ctx = { tenantId }.
 * A suspended library is closed to its students too.
 * @param {{ findLibraryBySlug: (slug: string) => Promise<{ id: string, slug: string,
 *   name: string, status: string } | null> }} deps
 */
export function createResolveLibraryBySlug({ findLibraryBySlug }) {
  return asyncHandler(async (req, res, next) => {
    const library = await findLibraryBySlug(String(req.params.slug || "").toLowerCase());
    if (!library) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Library not found");
    if (library.status !== "active") {
      throw new AppError(
        403,
        ERROR_CODES.LIBRARY_SUSPENDED,
        "This library's app is not available right now. Please ask at the desk.",
      );
    }
    req.library = library;
    req.ctx = { tenantId: library.id };
    next();
  });
}
