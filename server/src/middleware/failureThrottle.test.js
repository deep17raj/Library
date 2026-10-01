import { test } from "node:test";
import assert from "node:assert/strict";
import { createFailureThrottle } from "./failureThrottle.js";

function setup() {
  let clock = 0;
  const throttle = createFailureThrottle({
    windowMs: 1000,
    maxFailures: 3,
    keyOf: (req) => req.key,
    message: "Slow down",
    now: () => clock,
  });
  const run = (req) => {
    let passedError = "unset";
    throttle.guard(req, { setHeader() {} }, (error) => (passedError = error));
    return passedError;
  };
  return { throttle, run, advance: (ms) => (clock += ms) };
}

test("blocks a key after the failure limit and only that key", () => {
  const { throttle, run } = setup();
  const req = { key: "ip|a" };
  for (let i = 0; i < 3; i += 1) {
    assert.equal(run(req), undefined);
    throttle.recordFailure(req);
  }
  assert.equal(run(req).status, 429);
  assert.equal(run({ key: "ip|b" }), undefined);
});

test("a success clears the count; the window expires on its own", () => {
  const { throttle, run, advance } = setup();
  const req = { key: "k" };
  throttle.recordFailure(req);
  throttle.recordFailure(req);
  throttle.clear(req);
  throttle.recordFailure(req);
  throttle.recordFailure(req);
  assert.equal(run(req), undefined, "cleared count restarted at zero");

  throttle.recordFailure(req);
  assert.equal(run(req).status, 429);
  advance(1001);
  assert.equal(run(req), undefined);
});
