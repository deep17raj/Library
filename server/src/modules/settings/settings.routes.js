import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { requireFile, singleImageUpload } from "../../middleware/upload.js";
import { createSettingsController } from "./settings.controller.js";
import { librarySettingsSchema, LOGO_FIELD, LOGO_MAX_BYTES } from "./settings.validation.js";

/** Mounted at /api/admin/settings (library context already resolved). */
export function createSettingsRouter({ settingsService }) {
  const controller = createSettingsController({ settingsService });
  const canManage = requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const router = Router();

  // Every staff member reads settings: the app needs the name, timezone and brand.
  router.get("/", asyncHandler(controller.getSettings));
  router.put(
    "/",
    canManage,
    validateBody(librarySettingsSchema),
    asyncHandler(controller.putSettings),
  );
  router.post(
    "/logo",
    canManage,
    singleImageUpload(LOGO_FIELD, { maxBytes: LOGO_MAX_BYTES }),
    requireFile(LOGO_FIELD),
    asyncHandler(controller.postLogo),
  );
  router.delete("/logo", canManage, asyncHandler(controller.deleteLogo));
  return router;
}
