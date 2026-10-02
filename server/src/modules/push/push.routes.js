import { Router } from "express";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "@app/shared/validation";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { requirePasswordChanged } from "../../middleware/studentAuth.js";

/** Mounted at /api/push (public): the key browsers need to subscribe. */
export function createPushPublicRouter({ pushService }) {
  const router = Router();
  router.get(
    "/public-key",
    asyncHandler(async (req, res) => res.json({ publicKey: await pushService.getPublicKey() })),
  );
  return router;
}

/** Inside /api/s/:slug, after the session check: a student's notification devices. */
export function createPushRouter({ pushService }) {
  const router = Router({ mergeParams: true });
  router.use("/push", requirePasswordChanged);
  router.post(
    "/push/subscribe",
    validateBody(pushSubscriptionSchema),
    asyncHandler(async (req, res) =>
      res.json({
        devices: await pushService.subscribe(req.ctx, req.body, req.get("User-Agent") || ""),
      }),
    ),
  );
  router.post(
    "/push/unsubscribe",
    validateBody(pushUnsubscribeSchema),
    asyncHandler(async (req, res) =>
      res.json({ devices: await pushService.unsubscribe(req.ctx, req.body) }),
    ),
  );
  router.get(
    "/push/devices",
    asyncHandler(async (req, res) => res.json({ devices: await pushService.listDevices(req.ctx) })),
  );
  return router;
}
