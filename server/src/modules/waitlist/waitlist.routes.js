import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { createWaitlistController } from "./waitlist.controller.js";
import {
  waitlistEntrySchema,
  waitlistQuerySchema,
  waitlistUpdateSchema,
} from "./waitlist.validation.js";

/** Mounted at /api/admin/waitlist. */
export function createWaitlistRouter({ waitlistService }) {
  const c = createWaitlistController({ waitlistService });
  const canManage = requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const router = Router();
  router.get("/", validateQuery(waitlistQuerySchema), asyncHandler(c.list));
  router.post("/", canManage, validateBody(waitlistEntrySchema), asyncHandler(c.create));
  router.patch("/:id", canManage, validateBody(waitlistUpdateSchema), asyncHandler(c.update));
  return router;
}
