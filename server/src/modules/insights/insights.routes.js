import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { requirePermission } from "../../middleware/libraryContext.js";

export function createInsightsRouter({ insightsService: service }) {
  const router = Router();
  const canView = requirePermission(PERMISSIONS.INSIGHTS_VIEW);

  router.get(
    "/insights/occupancy",
    canView,
    asyncHandler(async (req, res) => res.json(await service.getOccupancy(req.ctx))),
  );
  router.get(
    "/insights/revenue",
    canView,
    asyncHandler(async (req, res) => res.json(await service.getRevenue(req.ctx))),
  );
  router.get(
    "/insights/dues",
    canView,
    asyncHandler(async (req, res) => res.json(await service.getDuesAgeing(req.ctx))),
  );
  router.get(
    "/insights/churn",
    canView,
    asyncHandler(async (req, res) => res.json(await service.getChurn(req.ctx))),
  );
  router.get(
    "/insights/attendance",
    canView,
    asyncHandler(async (req, res) => {
      const month = req.query.month || new Date().toISOString().slice(0, 7);
      res.json(await service.getAttendance(req.ctx, { month }));
    }),
  );
  return router;
}
