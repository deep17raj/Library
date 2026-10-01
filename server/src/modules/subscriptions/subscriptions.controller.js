/** @param {{ subscriptionsService: ReturnType<typeof import("./subscriptions.service.js").createSubscriptionsService> }} deps */
export function createSubscriptionsController({ subscriptionsService: service }) {
  const one = (status, work) => async (req, res) =>
    res.status(status).json({ subscription: await work(req) });

  return {
    async listForMember(req, res) {
      res.json({
        subscriptions: await service.listMemberSubscriptions(req.ctx, req.params.memberId),
      });
    },
    getOne: one(200, (req) => service.getSubscription(req.ctx, req.params.id)),
    postForMember: one(201, (req) =>
      service.createSubscription(req.ctx, req.params.memberId, req.body),
    ),
    postMove: one(200, (req) => service.moveSubscription(req.ctx, req.params.id, req.body)),
    postChangeSlot: one(200, (req) => service.changeSlot(req.ctx, req.params.id, req.body)),
    postSwap: one(200, (req) => service.swapSeats(req.ctx, req.body)),
    postEnd: one(200, (req) => service.endSubscription(req.ctx, req.params.id, req.body)),
    async getAvailability(req, res) {
      res.json({ availability: await service.getAvailability(req.ctx, req.validatedQuery.slotId) });
    },
  };
}
