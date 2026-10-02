import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { announceSchema, audiencePreviewSchema, paginationSchema } from "@app/shared/validation";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { requirePasswordChanged } from "../../middleware/studentAuth.js";
import { createFailureThrottle } from "../../middleware/failureThrottle.js";
import { createNotificationsController } from "./notifications.controller.js";

const FIVE_MINUTES = 5 * 60 * 1000;

export function createNotificationsAdminRouter({ notificationsService }) {
  const c = createNotificationsController({ notificationsService });
  const canSend = requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const throttle = createFailureThrottle({
    windowMs: FIVE_MINUTES,
    maxFailures: 10,
    keyOf: (req) => `notif:${req.ctx.tenantId}:${req.ctx.actor.id}`,
    message: "Too many notifications sent. Please wait a few minutes.",
  });
  const router = Router();
  router.get(
    "/notifications",
    canSend,
    validateQuery(paginationSchema),
    asyncHandler(c.listNotifications),
  );
  router.get(
    "/notifications/preview",
    canSend,
    validateQuery(audiencePreviewSchema),
    asyncHandler(c.getPreview),
  );
  router.post(
    "/notifications",
    canSend,
    throttle.guard,
    validateBody(announceSchema),
    asyncHandler(c.postAnnounce),
  );
  return router;
}

export function createNotificationsStudentRouter({ notificationsService }) {
  const c = createNotificationsController({ notificationsService });
  const router = Router({ mergeParams: true });
  router.use("/notifications", requirePasswordChanged);
  router.get("/notifications", validateQuery(paginationSchema), asyncHandler(c.listInbox));
  router.get("/notifications/unread", asyncHandler(c.getUnreadCount));
  router.post("/notifications/:id/read", asyncHandler(c.postMarkRead));
  return router;
}
