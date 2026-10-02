import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { changePasswordSchema, studentLoginSchema } from "@app/shared/validation";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { clearSessionCookie, setSessionCookie } from "../../lib/cookies.js";
import { createFailureThrottle, throttled } from "../../middleware/failureThrottle.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { studentCookiePath } from "../../middleware/studentAuth.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function sessionCookie(config, req) {
  return {
    name: config.auth.studentCookie,
    secure: config.auth.cookieSecure,
    maxAgeSeconds: config.auth.studentTokenTtlSeconds,
    path: studentCookiePath(req.library.slug),
  };
}

/** Inside /api/s/:slug, before the session check: sign in and sign out. */
export function createStudentAuthRouter({ studentsService, config }) {
  const router = Router({ mergeParams: true });
  // Per IP + library + phone: a shared library Wi-Fi IP doesn't lock out other students.
  const loginThrottle = createFailureThrottle({
    windowMs: FIFTEEN_MINUTES,
    maxFailures: 8,
    keyOf: (req) => `${req.ip}|${req.ctx.tenantId}|${String(req.body?.phone || "")}`,
    message: "Too many failed sign-in attempts. Please wait 15 minutes and try again.",
  });

  router.post(
    "/auth/login",
    loginThrottle.guard,
    validateBody(studentLoginSchema),
    throttled(loginThrottle, async (req, res) => {
      const { student, token } = await studentsService.login(req.ctx.tenantId, req.body);
      setSessionCookie(res, { ...sessionCookie(config, req), value: token });
      res.json({ student });
    }),
  );
  router.post("/auth/logout", (req, res) => {
    clearSessionCookie(res, sessionCookie(config, req));
    res.status(204).end();
  });
  return router;
}

/** Inside /api/s/:slug, after the session check (allowed before the first password change). */
export function createStudentPasswordRouter({ studentsService, config }) {
  const router = Router({ mergeParams: true });
  router.post(
    "/auth/password",
    validateBody(changePasswordSchema),
    asyncHandler(async (req, res) => {
      const { student, token } = await studentsService.changePassword(req.ctx, req.body);
      setSessionCookie(res, { ...sessionCookie(config, req), value: token });
      res.json({ student });
    }),
  );
  return router;
}

/** Mounted at /api/admin: staff give or reset a member's app access. */
export function createAppAccessRouter({ studentsService }) {
  const router = Router();
  const canManage = requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  router.get(
    "/members/:memberId/app-access",
    asyncHandler(async (req, res) =>
      res.json({ appAccess: await studentsService.getAppAccess(req.ctx, req.params.memberId) }),
    ),
  );
  router.post(
    "/members/:memberId/app-access",
    canManage,
    asyncHandler(async (req, res) =>
      res.json(await studentsService.grantAppAccess(req.ctx, req.params.memberId)),
    ),
  );
  return router;
}
