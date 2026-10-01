import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { createSlotsController } from "./slots.controller.js";
import { planSchema, planUpdateSchema, slotSchema, slotUpdateSchema } from "./slots.validation.js";

/** Mounted at /api/admin (library context already resolved). */
export function createSlotsRouter({ slotsService }) {
  const c = createSlotsController({ slotsService });
  const canEdit = requirePermission(PERMISSIONS.SLOTS_MANAGE);
  const router = Router();

  // Any staff member reads slots (seat pickers, check-in desk).
  router.get("/slots", asyncHandler(c.listSlots));
  router.post("/slots", canEdit, validateBody(slotSchema), asyncHandler(c.postSlot));
  router.patch("/slots/:id", canEdit, validateBody(slotUpdateSchema), asyncHandler(c.patchSlot));
  router.post("/slots/:id/plans", canEdit, validateBody(planSchema), asyncHandler(c.postPlan));
  router.patch("/plans/:id", canEdit, validateBody(planUpdateSchema), asyncHandler(c.patchPlan));
  return router;
}
