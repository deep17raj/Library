import { Router } from "express";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { createFailureThrottle } from "../../middleware/failureThrottle.js";
import { createAuthController } from "./auth.controller.js";
import { changePasswordSchema, staffLoginSchema } from "./auth.validation.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** Mounted at /api/auth. */
export function createAuthRouter({ authService, config, requireStaff }) {
  // Per IP + email: a shared library Wi-Fi IP doesn't lock out other accounts.
  const loginThrottle = createFailureThrottle({
    windowMs: FIFTEEN_MINUTES,
    maxFailures: 8,
    keyOf: (req) => `${req.ip}|${String(req.body?.email || "").toLowerCase()}`,
    message: "Too many failed sign-in attempts. Please wait 15 minutes and try again.",
  });
  const controller = createAuthController({ authService, config, loginThrottle });
  const router = Router();

  router.post(
    "/login",
    loginThrottle.guard,
    validateBody(staffLoginSchema),
    asyncHandler(controller.postLogin),
  );
  router.post("/logout", controller.postLogout);
  router.get("/me", requireStaff, controller.getMe);
  router.post(
    "/password",
    requireStaff,
    validateBody(changePasswordSchema),
    asyncHandler(controller.postPassword),
  );

  return router;
}
