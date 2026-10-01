import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { createBillingController } from "./billing.controller.js";
import {
  chargeSchema,
  collectPaymentSchema,
  depositRefundSchema,
  discountSchema,
  paymentListQuerySchema,
  voidSchema,
} from "./billing.validation.js";

/** Mounted at /api/admin (library context already resolved). */
export function createBillingRouter({ billingService }) {
  const c = createBillingController({ billingService });
  const canCollect = requirePermission(PERMISSIONS.PAYMENTS_COLLECT);
  const canVoid = requirePermission(PERMISSIONS.PAYMENTS_VOID);
  const router = Router();
  const body = (schema) => validateBody(schema);

  // Any staff member can see what a student owes (to tell them at the desk).
  router.get("/members/:memberId/account", asyncHandler(c.getAccount));
  router.get("/dues", asyncHandler(c.listDues));

  router.post("/payments", canCollect, body(collectPaymentSchema), asyncHandler(c.postPayment));
  router.get(
    "/payments",
    canCollect,
    validateQuery(paymentListQuerySchema),
    asyncHandler(c.listPayments),
  );
  router.get("/payments/:id", canCollect, asyncHandler(c.getPayment));
  router.post("/invoices", canCollect, body(chargeSchema), asyncHandler(c.postCharge));

  // Undoing or reducing money needs the stronger permission.
  router.post("/payments/:id/void", canVoid, body(voidSchema), asyncHandler(c.postVoidPayment));
  router.patch(
    "/invoices/:id/discount",
    canVoid,
    body(discountSchema),
    asyncHandler(c.patchDiscount),
  );
  router.post("/invoices/:id/void", canVoid, body(voidSchema), asyncHandler(c.postVoidInvoice));
  router.post(
    "/invoices/:id/refund",
    canVoid,
    body(depositRefundSchema),
    asyncHandler(c.postRefund),
  );
  return router;
}
