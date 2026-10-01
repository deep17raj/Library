/**
 * Every handler answers `{ layout }`: the whole, fresh layout tree.
 * @param {{ layoutService: ReturnType<typeof import("./layout.service.js").createLayoutService> }} deps
 */
export function createLayoutController({ layoutService }) {
  const respond = (work) => async (req, res) => {
    const layout = await work(req);
    res.status(req.method === "POST" ? 201 : 200).json({ layout });
  };

  return {
    getLayout: async (req, res) => res.json({ layout: await layoutService.getLayout(req.ctx) }),
    postCategory: respond((req) => layoutService.createCategory(req.ctx, req.body)),
    patchCategory: respond((req) => layoutService.updateCategory(req.ctx, req.params.id, req.body)),
    postHall: respond((req) => layoutService.createHall(req.ctx, req.body)),
    patchHall: respond((req) => layoutService.updateHall(req.ctx, req.params.id, req.body)),
    deleteHall: respond((req) => layoutService.deleteHall(req.ctx, req.params.id)),
    postTables: respond((req) => layoutService.addTables(req.ctx, req.params.id, req.body)),
    patchTable: respond((req) => layoutService.updateTable(req.ctx, req.params.id, req.body)),
    deleteTable: respond((req) => layoutService.deleteTable(req.ctx, req.params.id)),
    postSeats: respond((req) => layoutService.addSeats(req.ctx, req.params.id, req.body)),
    patchSeat: respond((req) => layoutService.updateSeat(req.ctx, req.params.id, req.body)),
    deleteSeat: respond((req) => layoutService.deleteSeat(req.ctx, req.params.id)),
  };
}
