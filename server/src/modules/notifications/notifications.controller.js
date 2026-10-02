export function createNotificationsController({ notificationsService: service }) {
  return {
    async postAnnounce(req, res) {
      const result = await service.announce(req.ctx, req.body);
      res.status(201).json(result);
    },
    async getPreview(req, res) {
      res.json(await service.previewAudience(req.ctx, req.validatedQuery));
    },
    async listNotifications(req, res) {
      res.json(await service.listNotifications(req.ctx, req.validatedQuery));
    },
    async listInbox(req, res) {
      res.json(await service.listInbox(req.ctx, req.validatedQuery));
    },
    async postMarkRead(req, res) {
      await service.markRead(req.ctx, req.params.id);
      res.json({ ok: true });
    },
    async getUnreadCount(req, res) {
      res.json({ unread: await service.unreadCount(req.ctx) });
    },
  };
}
