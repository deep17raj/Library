import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import {
  attendanceMonthQuerySchema,
  attendanceQuerySchema,
  kioskCheckinSchema,
  manualAttendanceSchema,
  markAbsentSchema,
} from "@app/shared/validation";
import { asyncHandler } from "../../http/asyncHandler.js";
import { sendCsv } from "../../lib/csv.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { createFailureThrottle, throttled } from "../../middleware/failureThrottle.js";

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
  registerMarkingRoutes(router, service, canMark);
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

/** The day list, the roster (everyone booked, present/absent/unmarked) and marking. */
function registerMarkingRoutes(router, service, canMark) {
  router.get(
    "/attendance",
    canMark,
    validateQuery(attendanceQuerySchema),
    asyncHandler(async (req, res) =>
      res.json(await service.listForDay(req.ctx, req.validatedQuery)),
    ),
  );
  router.get(
    "/attendance/roster",
    canMark,
    validateQuery(attendanceQuerySchema),
    asyncHandler(async (req, res) =>
      res.json(await service.listRoster(req.ctx, req.validatedQuery)),
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
  router.post(
    "/attendance/absent",
    canMark,
    validateBody(markAbsentSchema),
    asyncHandler(async (req, res) =>
      res.status(201).json(await service.markAbsent(req.ctx, req.body)),
    ),
  );
}

/**
 * Mounted inside the student API router (/api/s/:slug), which has already resolved the
 * library (req.ctx). Public kiosk check-in: phone + the day's code, rate-limited per
 * IP + phone; no session.
 */
export function createPublicCheckinRouter({ attendanceService: service }) {
  const router = Router({ mergeParams: true });
  const throttle = createFailureThrottle({
    windowMs: FIFTEEN_MINUTES,
    maxFailures: 10,
    keyOf: (req) => `${req.ip}|${req.ctx.tenantId}|${String(req.body?.phone || "")}`,
    message: "Too many check-in attempts. Please wait a few minutes and try again.",
  });

  router.post(
    "/kiosk/checkin",
    throttle.guard,
    validateBody(kioskCheckinSchema),
    throttled(throttle, async (req, res) => {
      res.json(await service.checkInByPhone(req.ctx, req.body));
    }),
  );
  return router;
}
