import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { createStaffController } from "./staff.controller.js";
import {
  createStaffSchema,
  resetStaffPasswordSchema,
  updateStaffSchema,
} from "./staff.validation.js";

/** Mounted at /api/admin/staff. Whole router needs staff.manage. */
export function createStaffRouter({ staffService }) {
  const controller = createStaffController({ staffService });
  const router = Router();
  router.use(requirePermission(PERMISSIONS.STAFF_MANAGE));

  router.get("/", asyncHandler(controller.listStaff));
  router.post("/", validateBody(createStaffSchema), asyncHandler(controller.postStaff));
  router.patch("/:id", validateBody(updateStaffSchema), asyncHandler(controller.patchStaff));
  router.post(
    "/:id/password",
    validateBody(resetStaffPasswordSchema),
    asyncHandler(controller.postPassword),
  );
  return router;
}
