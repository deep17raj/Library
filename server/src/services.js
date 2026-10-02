import { createAttendanceService } from "./modules/attendance/attendance.service.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createBillingService } from "./modules/billing/billing.service.js";
import { createExpensesService } from "./modules/expenses/expenses.service.js";
import { createLayoutService } from "./modules/layout/layout.service.js";
import { createLedgerService } from "./modules/ledger/ledger.service.js";
import { createMembersService } from "./modules/members/members.service.js";
import { createPlatformService } from "./modules/platform/platform.service.js";
import { createPortalService } from "./modules/portal/portal.service.js";
import { createPushService } from "./modules/push/push.service.js";
import { createSettingsService } from "./modules/settings/settings.service.js";
import { createSlotsService } from "./modules/slots/slots.service.js";
import { createStaffService } from "./modules/staff/staff.service.js";
import { createStudentsService } from "./modules/students/students.service.js";
import { createSubscriptionsService } from "./modules/subscriptions/subscriptions.service.js";
import { createWaitlistService } from "./modules/waitlist/waitlist.service.js";

/**
 * Builds every service once. Services that work inside another module's transaction
 * are passed in here explicitly, so the dependencies between modules are visible in
 * one place.
 * @param {{ db: import("mysql2/promise").Pool, config: import("./config/env.js").AppConfig }} deps
 */
export function buildServices({ db, config }) {
  const subscriptionsService = createSubscriptionsService({ db });
  const billingService = createBillingService({ db });
  const expensesService = createExpensesService({ db });
  // Check-in applies the slot and dues gates; the dues gate reads billing.
  const attendanceService = createAttendanceService({
    db,
    billing: billingService,
    secret: config.auth.jwtSecret,
  });
  return {
    authService: createAuthService({ db, config }),
    platformService: createPlatformService({ db }),
    settingsService: createSettingsService({ db, storageDir: config.storageDir }),
    staffService: createStaffService({ db }),
    layoutService: createLayoutService({ db }),
    subscriptionsService,
    // Changing a slot's times moves its students' seat cells (subscriptions module).
    slotsService: createSlotsService({ db, rescheduleSlot: subscriptionsService.rescheduleSlot }),
    // Adding a member seats them and creates their first invoices in one transaction.
    membersService: createMembersService({
      db,
      storageDir: config.storageDir,
      seating: subscriptionsService,
      billing: billingService,
    }),
    waitlistService: createWaitlistService({ db }),
    billingService,
    expensesService,
    ledgerService: createLedgerService({ db, billing: billingService, expenses: expensesService }),
    attendanceService,
    // Student app: accounts, their own data (read from the modules that own it), push.
    studentsService: createStudentsService({ db, config }),
    portalService: createPortalService({
      db,
      seating: subscriptionsService,
      billing: billingService,
      attendance: attendanceService,
    }),
    pushService: createPushService({ db }),
  };
}
