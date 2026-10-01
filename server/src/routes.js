import { Router } from "express";
import { asyncHandler } from "./http/asyncHandler.js";
import { createRequireStaff } from "./middleware/staffAuth.js";
import { createRequireLibrary } from "./middleware/libraryContext.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createBillingRouter } from "./modules/billing/billing.routes.js";
import { createExpensesRouter } from "./modules/expenses/expenses.routes.js";
import { createLayoutRouter } from "./modules/layout/layout.routes.js";
import { createLedgerRouter } from "./modules/ledger/ledger.routes.js";
import { createMembersRouter } from "./modules/members/members.routes.js";
import { createPlatformRouter } from "./modules/platform/platform.routes.js";
import { findLibraryById } from "./modules/platform/platform.repository.js";
import { createSettingsRouter } from "./modules/settings/settings.routes.js";
import { createSlotsRouter } from "./modules/slots/slots.routes.js";
import { createStaffRouter } from "./modules/staff/staff.routes.js";
import { createSubscriptionsRouter } from "./modules/subscriptions/subscriptions.routes.js";
import { createWaitlistRouter } from "./modules/waitlist/waitlist.routes.js";

/**
 * Mounts every module router under /api. This is the only file that knows about all
 * routers (services are built in services.js).
 * @param {{ db: import("mysql2/promise").Pool, config: import("./config/env.js").AppConfig,
 *   services: ReturnType<typeof import("./services.js").buildServices> }} deps
 */
export function createApiRouter({ db, config, services }) {
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
  router.use("/admin", requireStaff, requireLibrary, createAdminRouter(services));
  return router;
}

/** /api/admin/*: a signed-in staff member working inside one library (req.ctx). */
function createAdminRouter(services) {
  const admin = Router();
  admin.use("/settings", createSettingsRouter(services));
  admin.use("/staff", createStaffRouter(services));
  admin.use("/members", createMembersRouter(services));
  admin.use("/waitlist", createWaitlistRouter(services));
  admin.use("/expenses", createExpensesRouter(services));
  admin.use(createLayoutRouter(services));
  admin.use(createSlotsRouter(services));
  admin.use(createSubscriptionsRouter(services));
  admin.use(createBillingRouter(services));
  admin.use(createLedgerRouter(services));
  return admin;
}
