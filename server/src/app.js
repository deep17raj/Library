import express from "express";
import { apiNotFound, errorHandler } from "./http/errorHandler.js";
import { noStore, requireAppHeader, securityHeaders } from "./middleware/requestGuards.js";
import { createApiRouter } from "./routes.js";
import { serveApps } from "./static/serveApps.js";

/**
 * Builds the Express app. Middleware order is decided here and nowhere else.
 * @param {{ db: import("mysql2/promise").Pool, config: import("./config/env.js").AppConfig }} deps
 */
export function createApp({ db, config }) {
  const app = express();
  app.disable("x-powered-by");
  // cPanel puts Apache in front of Passenger; trust it so req.ip is the visitor's IP
  // (rate limits are keyed on it) and secure cookies work behind HTTPS.
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(securityHeaders);
  const { router, services } = createApiRouter({ db, config });
  app.use("/api", noStore, express.json({ limit: "1mb" }), requireAppHeader, router, apiNotFound);
  serveApps(app);
  app.use(errorHandler);
  return { app, services };
}
