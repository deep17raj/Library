import { getConfig } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { createPool } from "./db/pool.js";
import { createApp } from "./app.js";

/**
 * Boot order: config → migrations → pool → app → first-boot seed → listen.
 * Any failure exits with a clear log line (cPanel shows it in stderr.log): the app
 * never serves requests against a missing or half-migrated database.
 */
async function start() {
  const config = getConfig();
  await runMigrations(config.db);
  const db = createPool(config.db);
  const { app, services, scheduler } = createApp({ db, config });

  if (await services.authService.ensureSuperAdmin(config.superAdmin)) {
    console.log(`Created super admin ${config.superAdmin.email}`);
  }

  // Jobs (invoice generation…) run while the process is awake; see jobs/scheduler.js.
  scheduler.start();
  scheduler.runDue().catch((error) => console.error("Initial job run failed:", error.message));

  // Passenger hands us a Unix socket path in PORT; locally it's a TCP port.
  const target = config.listenTarget;
  const server = /^\d+$/.test(target) ? app.listen(Number(target)) : app.listen(target);
  server.on("listening", () => {
    const where = /^\d+$/.test(target) ? `http://localhost:${target}/admin/` : target;
    console.log(`Study Library running at ${where}`);
  });
}

start().catch((error) => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});
