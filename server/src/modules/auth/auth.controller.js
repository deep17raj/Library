import { clearSessionCookie, setSessionCookie } from "../../lib/cookies.js";

/**
 * @param {{ authService: ReturnType<typeof import("./auth.service.js").createAuthService>,
 *   config: import("../../config/env.js").AppConfig,
 *   loginThrottle: ReturnType<typeof import("../../middleware/failureThrottle.js").createFailureThrottle> }} deps
 */
export function createAuthController({ authService, config, loginThrottle }) {
  const cookie = {
    name: config.auth.staffCookie,
    secure: config.auth.cookieSecure,
    maxAgeSeconds: config.auth.staffTokenTtlSeconds,
  };

  async function postLogin(req, res) {
    let result;
    try {
      result = await authService.login(req.body);
    } catch (error) {
      loginThrottle.recordFailure(req);
      throw error;
    }
    loginThrottle.clear(req);
    setSessionCookie(res, { ...cookie, value: result.token });
    res.json({ user: result.user });
  }

  function postLogout(req, res) {
    clearSessionCookie(res, cookie);
    res.status(204).end();
  }

  function getMe(req, res) {
    res.json({ user: req.actor });
  }

  async function postPassword(req, res) {
    const { token } = await authService.changePassword(req.actor, req.body);
    setSessionCookie(res, { ...cookie, value: token });
    res.status(204).end();
  }

  return { postLogin, postLogout, getMe, postPassword };
}
