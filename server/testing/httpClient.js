/**
 * Tiny cookie-keeping client for integration tests: behaves like one browser.
 * @param {string} baseUrl
 */
export function createTestBrowser(baseUrl) {
  let cookie = "";

  async function call(method, path, body, { appHeader = true } = {}) {
    const headers = { Accept: "application/json" };
    if (appHeader) headers["X-Requested-With"] = "app";
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  return {
    get: (path) => call("GET", path),
    post: (path, body, options) => call("POST", path, body, options),
    patch: (path, body) => call("PATCH", path, body),
  };
}
