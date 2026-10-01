import { Router } from "express";
import { ROLES } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { requireRole } from "../../middleware/staffAuth.js";
import { createPlatformController } from "./platform.controller.js";
import {
  addOwnerSchema,
  createLibrarySchema,
  libraryStatusSchema,
  platformSettingsSchema,
  updateLibrarySchema,
  userStatusSchema,
} from "./platform.validation.js";

/** Mounted at /api/platform. Super admin only. */
export function createPlatformRouter({ platformService, requireStaff }) {
  const controller = createPlatformController({ platformService });
  const router = Router();
  router.use(requireStaff, requireRole(ROLES.SUPER_ADMIN));

  router.get("/libraries", asyncHandler(controller.listLibraries));
  router.post(
    "/libraries",
    validateBody(createLibrarySchema),
    asyncHandler(controller.postLibrary),
  );
  router.get("/libraries/:id", asyncHandler(controller.getLibrary));
  router.patch(
    "/libraries/:id",
    validateBody(updateLibrarySchema),
    asyncHandler(controller.patchLibrary),
  );
  router.patch(
    "/libraries/:id/status",
    validateBody(libraryStatusSchema),
    asyncHandler(controller.patchLibraryStatus),
  );
  router.post(
    "/libraries/:id/owners",
    validateBody(addOwnerSchema),
    asyncHandler(controller.postOwner),
  );
  router.patch(
    "/users/:id/status",
    validateBody(userStatusSchema),
    asyncHandler(controller.patchUserStatus),
  );
  router.get("/settings", asyncHandler(controller.getSettings));
  router.put(
    "/settings",
    validateBody(platformSettingsSchema),
    asyncHandler(controller.putSettings),
  );

  return router;
}
