/**
 * Express 4 does not catch rejected promises; this forwards them to the error handler.
 * @param {(req: import("express").Request, res: import("express").Response,
 *   next: import("express").NextFunction) => Promise<unknown>} handler
 */
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
