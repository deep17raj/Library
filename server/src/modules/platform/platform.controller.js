/** @param {{ platformService: ReturnType<typeof import("./platform.service.js").createPlatformService> }} deps */
export function createPlatformController({ platformService }) {
  return {
    async listLibraries(req, res) {
      res.json({ libraries: await platformService.listLibraries() });
    },
    async getLibrary(req, res) {
      res.json({ library: await platformService.getLibrary(req.params.id) });
    },
    async postLibrary(req, res) {
      res.status(201).json({ library: await platformService.createLibrary(req.actor, req.body) });
    },
    async patchLibrary(req, res) {
      res.json({
        library: await platformService.updateLibrary(req.actor, req.params.id, req.body),
      });
    },
    async patchLibraryStatus(req, res) {
      const library = await platformService.setLibraryStatus(
        req.actor,
        req.params.id,
        req.body.status,
      );
      res.json({ library });
    },
    async postOwner(req, res) {
      res
        .status(201)
        .json({ library: await platformService.addOwner(req.actor, req.params.id, req.body) });
    },
    async patchUserStatus(req, res) {
      const library = await platformService.setUserStatus(
        req.actor,
        req.params.id,
        req.body.status,
      );
      res.json({ library });
    },
    async getSettings(req, res) {
      res.json({ settings: await platformService.getSettings() });
    },
    async putSettings(req, res) {
      res.json({ settings: await platformService.updateSettings(req.actor, req.body) });
    },
  };
}
