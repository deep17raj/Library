import crypto from "node:crypto";
import { Router } from "express";
import { asyncHandler } from "../http/asyncHandler.js";
import { forbidden } from "../http/AppError.js";

/**
 * POST /api/internal/jobs/run — for a cPanel cron job:
 *   curl -X POST -H "X-Cron-Secret: <CRON_SECRET>" https://<site>/api/internal/jobs/run
 * Disabled unless CRON_SECRET is set. The secret is compared in constant time.
 */
export function createInternalRouter({ scheduler, cronSecret }) {
  const router = Router();
  router.post(
    "/jobs/run",
    asyncHandler(async (req, res) => {
      const given = Buffer.from(String(req.get("X-Cron-Secret") || ""));
      const expected = Buffer.from(cronSecret || "");
      const ok =
        expected.length > 0 &&
        given.length === expected.length &&
        crypto.timingSafeEqual(given, expected);
      if (!ok) throw forbidden("Not allowed");
      res.json({ ran: await scheduler.runDue() });
    }),
  );
  return router;
}
