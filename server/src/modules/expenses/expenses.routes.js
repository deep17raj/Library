import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { dateRangeQuerySchema, expenseSchema, voidSchema } from "@app/shared/validation";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";

/** Mounted at /api/admin/expenses. The whole router needs expenses.manage. */
export function createExpensesRouter({ expensesService: service }) {
  const router = Router();
  router.use(requirePermission(PERMISSIONS.EXPENSES_MANAGE));
  router.get(
    "/",
    validateQuery(dateRangeQuerySchema),
    asyncHandler(async (req, res) =>
      res.json(await service.listExpenses(req.ctx, req.validatedQuery)),
    ),
  );
  router.post(
    "/",
    validateBody(expenseSchema),
    asyncHandler(async (req, res) =>
      res.status(201).json({ expense: await service.createExpense(req.ctx, req.body) }),
    ),
  );
  router.post(
    "/:id/void",
    validateBody(voidSchema),
    asyncHandler(async (req, res) =>
      res.json({ expense: await service.voidExpense(req.ctx, req.params.id, req.body) }),
    ),
  );
  return router;
}
