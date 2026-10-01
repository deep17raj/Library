/** @param {{ settingsService: ReturnType<typeof import("./settings.service.js").createSettingsService> }} deps */
export function createSettingsController({ settingsService }) {
  return {
    async getSettings(req, res) {
      res.json({ settings: await settingsService.getSettings(req.ctx) });
    },
    async putSettings(req, res) {
      res.json({ settings: await settingsService.updateSettings(req.ctx, req.body) });
    },
    async postLogo(req, res) {
      res.json({ settings: await settingsService.replaceLogo(req.ctx, req.file.buffer) });
    },
    async deleteLogo(req, res) {
      res.json({ settings: await settingsService.removeLogo(req.ctx) });
    },
  };
}
