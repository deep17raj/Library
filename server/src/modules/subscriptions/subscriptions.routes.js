import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { createSubscriptionsController } from "./subscriptions.controller.js";
import {
  availabilityQuerySchema,
  changeSlotSchema,
  createSubscriptionSchema,
  endSubscriptionSchema,
  moveSubscriptionSchema,
  swapSeatsSchema,
} from "./subscriptions.validation.js";

/** Mounted at /api/admin (library context already resolved). */
export function createSubscriptionsRouter({ subscriptionsService }) {
  const c = createSubscriptionsController({ subscriptionsService });
  const canAllocate = requirePermission(PERMISSIONS.SEATS_ALLOCATE);
  const router = Router();
  const write = (path, schema, handler) =>
    router.post(path, canAllocate, validateBody(schema), asyncHandler(handler));

  router.get(
    "/availability",
    validateQuery(availabilityQuerySchema),
    asyncHandler(c.getAvailability),
  );
  router.get("/members/:memberId/subscriptions", asyncHandler(c.listForMember));
  router.get("/subscriptions/:id", asyncHandler(c.getOne));

  write("/members/:memberId/subscriptions", createSubscriptionSchema, c.postForMember);
  // "/swap" is registered before "/:id/…" routes so it is never read as an id.
  write("/subscriptions/swap", swapSeatsSchema, c.postSwap);
  write("/subscriptions/:id/move", moveSubscriptionSchema, c.postMove);
  write("/subscriptions/:id/change-slot", changeSlotSchema, c.postChangeSlot);
  write("/subscriptions/:id/end", endSubscriptionSchema, c.postEnd);
  return router;
}
