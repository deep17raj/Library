import { ERROR_CODES } from "@app/shared/constants";
import { AppError } from "../http/AppError.js";
import { readCookies } from "../lib/cookies.js";

/** Where a library's student session cookie lives (see lib/cookies.js). */
export const studentCookiePath = (slug) => `/api/s/${slug}`;

/**
 * Requires a signed-in student of the library in the URL (runs after the slug
 * resolver). Sets req.student and req.ctx.actor = { kind: "student", id, name }.
 * @param {{ studentsService: ReturnType<typeof import("../modules/students/students.service.js").createStudentsService>,
 *   config: import("../config/env.js").AppConfig }} deps
 */
export function createRequireStudent({ studentsService, config }) {
  return function requireStudent(req, res, next) {
    const token = readCookies(req)[config.auth.studentCookie] || "";
    studentsService
      .resolveSession(req.ctx.tenantId, token)
      .then((student) => {
        req.student = student;
        req.ctx = { ...req.ctx, actor: { kind: "student", id: student.id, name: student.name } };
        next();
      })
      .catch(next);
  };
}

/**
 * Until a student replaces the temporary password staff gave them, only their profile,
 * the password change and sign-out work [D10]. The app sends them to that screen.
 */
export function requirePasswordChanged(req, res, next) {
  if (req.student?.mustChangePassword) {
    return next(
      new AppError(
        403,
        ERROR_CODES.PASSWORD_CHANGE_REQUIRED,
        "Choose your own password to continue.",
      ),
    );
  }
  return next();
}
