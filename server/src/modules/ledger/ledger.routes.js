import { Router } from "express";
import { z } from "zod";
import { PERMISSIONS } from "@app/shared/constants";
import { dateKeyField, dateRangeQuerySchema } from "@app/shared/validation";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateQuery } from "../../http/validate.js";
import { sendCsv } from "../../lib/csv.js";
import { requirePermission } from "../../middleware/libraryContext.js";

const dayQuerySchema = z.object({ date: dateKeyField.optional() });

/** Mounted at /api/admin. Read-only money views. */
export function createLedgerRouter({ ledgerService: service }) {
  const router = Router();
  const canCollect = requirePermission(PERMISSIONS.PAYMENTS_COLLECT);
  const csv = (name, permission, query, build) =>
    router.get(
      `/export/${name}.csv`,
      requirePermission(permission),
      ...(query ? [validateQuery(query)] : []),
      asyncHandler(async (req, res) => sendCsv(res, `${name}.csv`, await build(req))),
    );

  router.get(
    "/dashboard",
    asyncHandler(async (req, res) => res.json(await service.getDashboard(req.ctx))),
  );
  router.get(
    "/ledger",
    canCollect,
    validateQuery(dayQuerySchema),
    asyncHandler(async (req, res) =>
      res.json(await service.getDayLedger(req.ctx, req.validatedQuery)),
    ),
  );
  csv("payments", PERMISSIONS.PAYMENTS_COLLECT, dateRangeQuerySchema, (req) =>
    service.exportPayments(req.ctx, req.validatedQuery),
  );
  csv("expenses", PERMISSIONS.EXPENSES_MANAGE, dateRangeQuerySchema, (req) =>
    service.exportExpenses(req.ctx, req.validatedQuery),
  );
  csv("dues", PERMISSIONS.PAYMENTS_COLLECT, null, (req) => service.exportDues(req.ctx));
  csv("members", PERMISSIONS.MEMBERS_MANAGE, null, (req) => service.exportMembers(req.ctx));
  return router;
}
