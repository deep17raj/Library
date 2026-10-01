/**
 * Every handler answers `{ slots }`: all slots with their plans.
 * @param {{ slotsService: ReturnType<typeof import("./slots.service.js").createSlotsService> }} deps
 */
export function createSlotsController({ slotsService }) {
  const respond = (status, work) => async (req, res) =>
    res.status(status).json({ slots: await work(req) });
  return {
    listSlots: respond(200, (req) => slotsService.listSlots(req.ctx)),
    postSlot: respond(201, (req) => slotsService.createSlot(req.ctx, req.body)),
    patchSlot: respond(200, (req) => slotsService.updateSlot(req.ctx, req.params.id, req.body)),
    postPlan: respond(201, (req) => slotsService.createPlan(req.ctx, req.params.id, req.body)),
    patchPlan: respond(200, (req) => slotsService.updatePlan(req.ctx, req.params.id, req.body)),
  };
}
