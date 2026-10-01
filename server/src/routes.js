import { Router } from "express";
import { asyncHandler } from "./http/asyncHandler.js";
import { createRequireStaff } from "./middleware/staffAuth.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createPlatformService } from "./modules/platform/platform.service.js";
import { createPlatformRouter } from "./modules/platform/platform.routes.js";

/**
 * Builds every service once and mounts every module router under /api.
 * This is the only file that knows about all modules.
 * @param {{ db: import("mysql2/promise").Pool, config: import("./config/env.js").AppConfig }} deps
 */
export function createApiRouter({ db, config }) {
  const authService = createAuthService({ db, config });
  const platformService = createPlatformService({ db });
  const requireStaff = createRequireStaff({ authService, config });

  const router = Router();
  router.get(
    "/health",
    asyncHandler(async (req, res) => {
      await db.query("SELECT 1");
      res.json({ ok: true });
    }),
  );
  router.use("/auth", createAuthRouter({ authService, config, requireStaff }));
  router.use("/platform", createPlatformRouter({ platformService, requireStaff }));
  return { router, services: { authService, platformService } };
}
