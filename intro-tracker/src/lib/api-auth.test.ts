import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { guardApiRequest } from "./api-auth";
import { resetRateLimit } from "./rate-limit";

const ALLOWLIST = ["ok@example.com"];

describe("guardApiRequest", () => {
  beforeEach(() => resetRateLimit());

  it("denies when there is no session", () => {
    const r = guardApiRequest({
      session: null,
      allowlist: ALLOWLIST,
      rateLimitKey: "ip:1",
    });
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.status, 401);
  });

  it("denies when session email is missing", () => {
    const r = guardApiRequest({
      session: { user: {} },
      allowlist: ALLOWLIST,
      rateLimitKey: "ip:1",
    });
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.status, 401);
  });

  it("denies when session email is not on the allowlist (stale token)", () => {
    const r = guardApiRequest({
      session: { user: { email: "removed@example.com" } },
      allowlist: ALLOWLIST,
      rateLimitKey: "ip:1",
    });
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.status, 403);
  });

  it("denies with 429 once rate limit is exceeded", () => {
    const opts = {
      session: { user: { email: "ok@example.com" } },
      allowlist: ALLOWLIST,
      rateLimitKey: "ip:burst",
      rateLimit: { max: 2 },
    };
    assert.equal(guardApiRequest(opts).ok, true);
    assert.equal(guardApiRequest(opts).ok, true);
    const r = guardApiRequest(opts);
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.status, 429);
  });

  it("allows an allowlisted session under the rate limit", () => {
    const r = guardApiRequest({
      session: { user: { email: "OK@Example.com" } },
      allowlist: ALLOWLIST,
      rateLimitKey: "ip:ok",
    });
    assert.equal(r.ok, true);
    assert.equal(r.ok === true && r.email, "ok@example.com");
  });
});
