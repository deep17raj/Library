import { Router } from "express";
import { asyncHandler } from "./http/asyncHandler.js";
import { createRequireStaff } from "./middleware/staffAuth.js";
import { createRequireLibrary } from "./middleware/libraryContext.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createPlatformService } from "./modules/platform/platform.service.js";
import { createPlatformRouter } from "./modules/platform/platform.routes.js";
import { findLibraryById } from "./modules/platform/platform.repository.js";
import { createSettingsService } from "./modules/settings/settings.service.js";
import { createSettingsRouter } from "./modules/settings/settings.routes.js";
import { createStaffService } from "./modules/staff/staff.service.js";
import { createStaffRouter } from "./modules/staff/staff.routes.js";
import { createLayoutService } from "./modules/layout/layout.service.js";
import { createLayoutRouter } from "./modules/layout/layout.routes.js";
import { createSlotsService } from "./modules/slots/slots.service.js";
import { createSlotsRouter } from "./modules/slots/slots.routes.js";
import { createSubscriptionsService } from "./modules/subscriptions/subscriptions.service.js";
import { createSubscriptionsRouter } from "./modules/subscriptions/subscriptions.routes.js";
import { createMembersService } from "./modules/members/members.service.js";
import { createMembersRouter } from "./modules/members/members.routes.js";
import { createWaitlistService } from "./modules/waitlist/waitlist.service.js";
import { createWaitlistRouter } from "./modules/waitlist/waitlist.routes.js";

/**
 * Builds every service once and mounts every module router under /api.
 * This is the only file that knows about all modules.
 * @param {{ db: import("mysql2/promise").Pool, config: import("./config/env.js").AppConfig }} deps
 */
export function createApiRouter({ db, config }) {
  const subscriptionsService = createSubscriptionsService({ db });
  const services = {
    subscriptionsService,
    // Changing a slot's times moves its students' seat cells — the subscriptions module's job.
    slotsService: createSlotsService({ db, rescheduleSlot: subscriptionsService.rescheduleSlot }),
    authService: createAuthService({ db, config }),
    platformService: createPlatformService({ db }),
    settingsService: createSettingsService({ db, storageDir: config.storageDir }),
    staffService: createStaffService({ db }),
    layoutService: createLayoutService({ db }),
    membersService: createMembersService({
      db,
      storageDir: config.storageDir,
      seating: subscriptionsService,
    }),
    waitlistService: createWaitlistService({ db }),
  };
  const requireStaff = createRequireStaff({ authService: services.authService, config });
  const requireLibrary = createRequireLibrary({ findLibraryById: (id) => findLibraryById(db, id) });

  const router = Router();
  router.get(
    "/health",
    asyncHandler(async (req, res) => {
      await db.query("SELECT 1");
      res.json({ ok: true });
    }),
  );
  router.use(
    "/auth",
    createAuthRouter({ authService: services.authService, config, requireStaff }),
  );
  router.use(
    "/platform",
    createPlatformRouter({ platformService: services.platformService, requireStaff }),
  );
  router.use("/admin", createAdminRouter({ services, requireStaff, requireLibrary }));
  return { router, services };
}

/** /api/admin/*: a signed-in staff member working inside one library (req.ctx). */
function createAdminRouter({ services, requireStaff, requireLibrary }) {
  const admin = Router();
  admin.use(requireStaff, requireLibrary);
  admin.use("/settings", createSettingsRouter({ settingsService: services.settingsService }));
  admin.use("/staff", createStaffRouter({ staffService: services.staffService }));
  admin.use(createLayoutRouter({ layoutService: services.layoutService }));
  admin.use(createSlotsRouter({ slotsService: services.slotsService }));
  admin.use("/members", createMembersRouter({ membersService: services.membersService }));
  admin.use("/waitlist", createWaitlistRouter({ waitlistService: services.waitlistService }));
  admin.use(createSubscriptionsRouter({ subscriptionsService: services.subscriptionsService }));
  return admin;
}
