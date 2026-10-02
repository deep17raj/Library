import { Router } from "express";
import { attendanceMonthQuerySchema, codeCheckinSchema } from "@app/shared/validation";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { createFailureThrottle, throttled } from "../../middleware/failureThrottle.js";
import { requirePasswordChanged } from "../../middleware/studentAuth.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** Inside /api/s/:slug, no session needed: the library's name/logo/colour for sign-in. */
export function createPortalPublicRouter({ portalService }) {
  const router = Router({ mergeParams: true });
  router.get(
    "/branding",
    asyncHandler(async (req, res) =>
      res.json({ library: await portalService.getBranding(req.ctx, req.library) }),
    ),
  );
  return router;
}

/**
 * Inside /api/s/:slug, after the session check. /me works before the first password
 * change (the app needs it to know where to send the student); everything else waits.
 */
export function createPortalRouter({ portalService }) {
  const router = Router({ mergeParams: true });
  const checkinThrottle = createFailureThrottle({
    windowMs: FIFTEEN_MINUTES,
    maxFailures: 10,
    keyOf: (req) => `${req.ctx.tenantId}|${req.ctx.actor.id}`,
    message: "Too many wrong codes. Please wait a few minutes or ask at the desk.",
  });

  router.get(
    "/me",
    asyncHandler(async (req, res) =>
      res.json(await portalService.getMe(req.ctx, req.library, req.student)),
    ),
  );
  router.get(
    "/account",
    requirePasswordChanged,
    asyncHandler(async (req, res) =>
      res.json({ account: await portalService.getAccount(req.ctx) }),
    ),
  );
  router.get(
    "/payments/:id/receipt",
    requirePasswordChanged,
    asyncHandler(async (req, res) =>
      res.json({ receipt: await portalService.getReceipt(req.ctx, req.params.id) }),
    ),
  );
  router.get(
    "/attendance",
    requirePasswordChanged,
    validateQuery(attendanceMonthQuerySchema),
    asyncHandler(async (req, res) =>
      res.json(await portalService.getAttendance(req.ctx, req.validatedQuery.month || null)),
    ),
  );
  router.post(
    "/checkin",
    requirePasswordChanged,
    checkinThrottle.guard,
    validateBody(codeCheckinSchema),
    throttled(checkinThrottle, async (req, res) => {
      res.json(await portalService.checkIn(req.ctx, req.body));
    }),
  );
  return router;
}
