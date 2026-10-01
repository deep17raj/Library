/** @param {{ waitlistService: ReturnType<typeof import("./waitlist.service.js").createWaitlistService> }} deps */
export function createWaitlistController({ waitlistService }) {
  return {
    async list(req, res) {
      res.json({ entries: await waitlistService.listEntries(req.ctx, req.validatedQuery) });
    },
    async create(req, res) {
      res.status(201).json({ entry: await waitlistService.createEntry(req.ctx, req.body) });
    },
    async update(req, res) {
      res.json({ entry: await waitlistService.updateEntry(req.ctx, req.params.id, req.body) });
    },
  };
}
