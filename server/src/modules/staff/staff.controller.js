/** @param {{ staffService: ReturnType<typeof import("./staff.service.js").createStaffService> }} deps */
export function createStaffController({ staffService }) {
  return {
    async listStaff(req, res) {
      res.json({ staff: await staffService.listStaff(req.ctx) });
    },
    async postStaff(req, res) {
      res.status(201).json({ member: await staffService.createStaff(req.ctx, req.body) });
    },
    async patchStaff(req, res) {
      res.json({ member: await staffService.updateStaff(req.ctx, req.params.id, req.body) });
    },
    async postPassword(req, res) {
      await staffService.resetPassword(req.ctx, req.params.id, req.body);
      res.status(204).end();
    },
  };
}
