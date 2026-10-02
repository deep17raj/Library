/** @param {import("express").Request} req */
export function readCookies(req) {
  /** @type {Record<string, string>} */
  const cookies = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      // A malformed cookie from another app on the domain must not break the request.
    }
  }
  return cookies;
}

/**
 * HttpOnly so page scripts can't read the session; SameSite=Lax so other sites
 * can't send it on their forms (the X-Requested-With check covers the rest).
 * `path` scopes a cookie to part of the site: student sessions use /api/s/<slug>,
 * so signing in to a second library's app doesn't sign you out of the first.
 * @param {import("express").Response} res
 * @param {{ name: string, value: string, maxAgeSeconds: number, secure: boolean,
 *   path?: string }} cookie
 */
export function setSessionCookie(res, { name, value, maxAgeSeconds, secure, path = "/" }) {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path,
    maxAge: maxAgeSeconds * 1000,
  });
}

export function clearSessionCookie(res, { name, secure, path = "/" }) {
  res.clearCookie(name, { httpOnly: true, sameSite: "lax", secure, path });
}
