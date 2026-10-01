import { ERROR_CODES } from "../constants/errorCodes.js";
import { toApiError } from "./ApiError.js";

/**
 * One fetch wrapper for both apps: sends cookies, marks requests as coming from
 * our app (the server's CSRF check requires X-Requested-With), and turns every
 * failure into an ApiError so screens handle errors one way.
 *
 * @param {{ baseUrl?: string, onUnauthenticated?: () => void, fetchImpl?: typeof fetch }} options
 */
export function createApiClient({ baseUrl = "/api", onUnauthenticated, fetchImpl } = {}) {
  const doFetch = fetchImpl || ((...args) => globalThis.fetch(...args));

  async function request(method, path, { body, headers } = {}) {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const init = {
      method,
      credentials: "same-origin",
      headers: { "X-Requested-With": "app", Accept: "application/json", ...headers },
    };
    if (body !== undefined) {
      init.body = isForm ? body : JSON.stringify(body);
      if (!isForm) init.headers["Content-Type"] = "application/json";
    }

    let response;
    try {
      response = await doFetch(`${baseUrl}${path}`, init);
    } catch {
      throw toApiError(0, null);
    }

    const payload = await readJson(response);
    if (response.ok) return payload;

    const error = toApiError(response.status, payload);
    if (error.code === ERROR_CODES.UNAUTHENTICATED && onUnauthenticated) onUnauthenticated();
    throw error;
  }

  return {
    get: (path, options) => request("GET", path, options),
    post: (path, body, options) => request("POST", path, { ...options, body }),
    put: (path, body, options) => request("PUT", path, { ...options, body }),
    patch: (path, body, options) => request("PATCH", path, { ...options, body }),
    delete: (path, options) => request("DELETE", path, options),
  };
}

async function readJson(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
