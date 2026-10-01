import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "./client.js";
import { ApiError } from "./ApiError.js";

function fakeFetch(status, body, capture = {}) {
  return async (url, init) => {
    capture.url = url;
    capture.init = init;
    return new Response(body === undefined ? "" : JSON.stringify(body), { status });
  };
}

test("sends JSON with the app header and returns the parsed body", async () => {
  const seen = {};
  const api = createApiClient({ fetchImpl: fakeFetch(200, { ok: true }, seen) });
  const result = await api.post("/things", { a: 1 });
  assert.deepEqual(result, { ok: true });
  assert.equal(seen.url, "/api/things");
  assert.equal(seen.init.headers["X-Requested-With"], "app");
  assert.equal(seen.init.body, '{"a":1}');
});

test("turns the API error format into ApiError with fields", async () => {
  const api = createApiClient({
    fetchImpl: fakeFetch(422, {
      error: { code: "VALIDATION_FAILED", message: "Check the form", fields: { slug: "Taken" } },
    }),
  });
  await assert.rejects(api.get("/x"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "VALIDATION_FAILED");
    assert.equal(error.fields.slug, "Taken");
    return true;
  });
});

test("calls onUnauthenticated on a 401 and maps non-JSON failures", async () => {
  let signedOut = false;
  const api = createApiClient({
    onUnauthenticated: () => (signedOut = true),
    fetchImpl: fakeFetch(401, { error: { code: "UNAUTHENTICATED", message: "Sign in" } }),
  });
  await assert.rejects(api.get("/me"));
  assert.equal(signedOut, true);

  const broken = createApiClient({
    fetchImpl: async () => new Response("<html>", { status: 502 }),
  });
  await assert.rejects(broken.get("/x"), (error) => error.code === "INTERNAL");

  const offline = createApiClient({
    fetchImpl: async () => {
      throw new TypeError("network");
    },
  });
  await assert.rejects(offline.get("/x"), (error) => error.code === "NETWORK");
});
