/**
 * Tiny cookie-keeping client for integration tests: behaves like one browser.
 * @param {string} baseUrl
 * @param {Record<string, string>} [extraHeaders] sent on every request (e.g. X-Library-Id)
 */
export function createTestBrowser(baseUrl, extraHeaders = {}) {
  let cookie = "";

  async function call(method, path, { json, form, appHeader = true } = {}) {
    const headers = { Accept: "application/json", ...extraHeaders };
    if (appHeader) headers["X-Requested-With"] = "app";
    if (cookie) headers.Cookie = cookie;
    if (json !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  return {
    get: (path) => call("GET", path),
    post: (path, json, options) => call("POST", path, { ...options, json }),
    put: (path, json) => call("PUT", path, { json }),
    patch: (path, json) => call("PATCH", path, { json }),
    delete: (path) => call("DELETE", path),
    /** multipart upload of one file */
    upload: (path, field, buffer, { filename = "file.png", type = "image/png" } = {}) => {
      const form = new FormData();
      form.append(field, new Blob([buffer], { type }), filename);
      return call("POST", path, { form });
    },
    /** Same session, different extra headers (e.g. a super admin choosing a library). */
    withHeaders: (headers) => {
      const other = createTestBrowser(baseUrl, headers);
      other.useCookie(cookie);
      return other;
    },
    useCookie: (value) => {
      cookie = value;
    },
  };
}
