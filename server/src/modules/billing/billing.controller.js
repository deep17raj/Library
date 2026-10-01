/** @param {{ billingService: ReturnType<typeof import("./billing.service.js").createBillingService> }} deps */
export function createBillingController({ billingService: service }) {
  const account = (work) => async (req, res) => res.json({ account: await work(req) });
  const receipt = (status, work) => async (req, res) =>
    res.status(status).json({ receipt: await work(req) });

  return {
    getAccount: account((req) => service.getMemberAccount(req.ctx, req.params.memberId)),
    postCharge: account((req) => service.addCharge(req.ctx, req.body)),
    patchDiscount: account((req) => service.setDiscount(req.ctx, req.params.id, req.body)),
    postVoidInvoice: account((req) => service.voidInvoice(req.ctx, req.params.id, req.body)),
    postRefund: account((req) => service.refundDeposit(req.ctx, req.params.id, req.body)),
    postPayment: receipt(201, (req) => service.collectPayment(req.ctx, req.body)),
    getPayment: receipt(200, (req) => service.getReceipt(req.ctx, req.params.id)),
    postVoidPayment: receipt(200, (req) => service.voidPayment(req.ctx, req.params.id, req.body)),
    async listPayments(req, res) {
      res.json(await service.listPayments(req.ctx, req.validatedQuery));
    },
    async listDues(req, res) {
      res.json(await service.listDues(req.ctx));
    },
  };
}
