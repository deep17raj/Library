import express from "express";
import { apiNotFound, errorHandler } from "./http/errorHandler.js";
import { createJobs } from "./jobs/jobs.js";
import { createInternalRouter } from "./jobs/internal.routes.js";
import { createScheduler } from "./jobs/scheduler.js";
import { noStore, requireAppHeader, securityHeaders } from "./middleware/requestGuards.js";
import { createApiRouter } from "./routes.js";
import { buildServices } from "./services.js";
import { serveApps } from "./static/serveApps.js";
import { serveFiles } from "./static/serveFiles.js";

/**
 * Builds the Express app. Middleware order is decided here and nowhere else.
 * The scheduler is created here (the cron endpoint needs it) and started by main.js.
 * @param {{ db: import("mysql2/promise").Pool, config: import("./config/env.js").AppConfig }} deps
 */
export function createApp({ db, config }) {
  const app = express();
  app.disable("x-powered-by");
  // cPanel puts Apache in front of Passenger; trust it so req.ip is the visitor's IP
  // (rate limits are keyed on it) and secure cookies work behind HTTPS.
  if (config.trustProxy) app.set("trust proxy", 1);

  const services = buildServices({ db, config });
  const scheduler = createScheduler(db, createJobs({ db, ...services }));

  app.use(securityHeaders);
  // The cron endpoint is called by curl, not our app, so it sits before the CSRF header check.
  app.use(
    "/api/internal",
    noStore,
    createInternalRouter({ scheduler, cronSecret: config.cronSecret }),
  );
  app.use(
    "/api",
    noStore,
    express.json({ limit: "1mb" }),
    requireAppHeader,
    createApiRouter({ db, config, services }),
    apiNotFound,
  );
  serveFiles(app, config.storageDir);
  serveApps(app, { db, storageDir: config.storageDir });
  app.use(errorHandler);
  return { app, services, scheduler };
}
