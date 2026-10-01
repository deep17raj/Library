import { Router } from "express";
import { ERROR_CODES, PERMISSIONS } from "@app/shared/constants";
import {
  attendanceMonthQuerySchema,
  attendanceQuerySchema,
  kioskCheckinSchema,
  manualAttendanceSchema,
} from "@app/shared/validation";
import { asyncHandler } from "../../http/asyncHandler.js";
import { AppError } from "../../http/AppError.js";
import { sendCsv } from "../../lib/csv.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { createFailureThrottle } from "../../middleware/failureThrottle.js";
import { findLibraryBySlug } from "../platform/platform.repository.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** Mounted at /api/admin. Desk view + attendance list + manual marking. */
export function createAttendanceRouter({ attendanceService: service }) {
  const router = Router();
  const canMark = requirePermission(PERMISSIONS.ATTENDANCE_MANAGE);

  // Any staff can show the check-in desk (the daily code + QR), mark needs the permission.
  router.get(
    "/checkin/desk",
    asyncHandler(async (req, res) => res.json(await service.getDesk(req.ctx))),
  );
  router.get(
    "/attendance",
    canMark,
    validateQuery(attendanceQuerySchema),
    asyncHandler(async (req, res) =>
      res.json(await service.listForDay(req.ctx, req.validatedQuery)),
    ),
  );
  router.post(
    "/attendance",
    canMark,
    validateBody(manualAttendanceSchema),
    asyncHandler(async (req, res) =>
      res.status(201).json(await service.markManually(req.ctx, req.body)),
    ),
  );
  router.get(
    "/members/:memberId/attendance",
    validateQuery(attendanceMonthQuerySchema),
    asyncHandler(async (req, res) =>
      res.json(
        await service.listForMember(req.ctx, req.params.memberId, req.validatedQuery.month || null),
      ),
    ),
  );
  router.get(
    "/export/attendance.csv",
    canMark,
    validateQuery(attendanceQuerySchema),
    asyncHandler(async (req, res) =>
      sendCsv(res, "attendance.csv", await service.exportForDay(req.ctx, req.validatedQuery)),
    ),
  );
  return router;
}

/**
 * Mounted at /api/s/:slug. Public kiosk check-in: phone + the day's code, rate-limited
 * per IP + phone. The library must be active. Student-authenticated routes come in M7.
 */
export function createPublicCheckinRouter({ attendanceService: service, db }) {
  const router = Router({ mergeParams: true });
  const throttle = createFailureThrottle({
    windowMs: FIFTEEN_MINUTES,
    maxFailures: 10,
    keyOf: (req) => `${req.ip}|${String(req.body?.phone || "")}`,
    message: "Too many check-in attempts. Please wait a few minutes and try again.",
  });

  router.post(
    "/kiosk/checkin",
    resolveLibrary(db),
    throttle.guard,
    validateBody(kioskCheckinSchema),
    asyncHandler(async (req, res, next) => {
      try {
        const result = await service.checkInByPhone(req.ctx, req.body);
        throttle.clear(req);
        res.json(result);
      } catch (error) {
        if (error instanceof AppError && error.status < 500) throttle.recordFailure(req);
        next(error);
      }
    }),
  );
  return router;
}

/** Resolve :slug → an active library, then req.ctx = { tenantId }. */
function resolveLibrary(db) {
  return asyncHandler(async (req, res, next) => {
    const library = await findLibraryBySlug(db, req.params.slug);
    if (!library) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Library not found");
    if (library.status !== "active") {
      throw new AppError(403, ERROR_CODES.LIBRARY_SUSPENDED, "This library is not active.");
    }
    req.ctx = { tenantId: library.id };
    next();
  });
}
