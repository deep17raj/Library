import { queryAll } from "../db/transaction.js";

// The library-wide background jobs. Each job loops over active libraries and works
// inside each one as the "system" actor. Later milestones add reminders, auto-release
// of unpaid seats, and attempt auto-submit here.

const SYSTEM_ACTOR = { id: null, role: "system", tenantId: null, name: "System" };

async function activeLibraryIds(db) {
  const rows = await queryAll(db, "SELECT id FROM libraries WHERE status = 'active'");
  return rows.map((row) => row.id);
}

/**
 * @param {{ db: import("mysql2/promise").Pool,
 *   billingService: ReturnType<typeof import("../modules/billing/billing.service.js").createBillingService> }} deps
 * @returns {import("./scheduler.js").Job[]}
 */
export function createJobs({ db, billingService }) {
  return [
    {
      name: "generate-invoices",
      everyMinutes: 60,
      async run() {
        let members = 0;
        for (const tenantId of await activeLibraryIds(db)) {
          members += await billingService.syncLibraryInvoices({ tenantId, actor: SYSTEM_ACTOR });
        }
        return `new invoices for ${members} member(s)`;
      },
    },
  ];
}
