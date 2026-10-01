/** @param {{ membersService: ReturnType<typeof import("./members.service.js").createMembersService> }} deps */
export function createMembersController({ membersService: service }) {
  /** File changes answer with the fresh member detail, like every other member write. */
  const thenDetail = (work) => async (req, res) => {
    await work(req);
    res.json(await service.getMember(req.ctx, req.params.id));
  };

  return {
    async list(req, res) {
      res.json(await service.listMembers(req.ctx, req.validatedQuery));
    },
    async create(req, res) {
      res.status(201).json(await service.createMember(req.ctx, req.body));
    },
    async detail(req, res) {
      res.json(await service.getMember(req.ctx, req.params.id));
    },
    async update(req, res) {
      res.json(await service.updateMember(req.ctx, req.params.id, req.body));
    },
    postPhoto: thenDetail((req) => service.replacePhoto(req.ctx, req.params.id, req.file.buffer)),
    deletePhoto: thenDetail((req) => service.removePhoto(req.ctx, req.params.id)),
    postIdProof: thenDetail((req) =>
      service.replaceIdProof(req.ctx, req.params.id, req.file.buffer),
    ),
    /** Private file: only through this permission-checked route, never cached. */
    async getIdProof(req, res) {
      const filePath = await service.idProofFile(req.ctx, req.params.id);
      res.setHeader("Cache-Control", "private, no-store");
      res.sendFile(filePath);
    },
  };
}
