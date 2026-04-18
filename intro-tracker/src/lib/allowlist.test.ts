import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isEmailAllowed, parseAllowlist } from "./allowlist";

describe("isEmailAllowed", () => {
  it("denies when allowlist is empty (fail closed)", () => {
    assert.equal(isEmailAllowed("user@example.com", []), false);
  });

  it("denies when email not in allowlist", () => {
    assert.equal(isEmailAllowed("nope@example.com", ["yes@example.com"]), false);
  });

  it("allows case-insensitive match on email", () => {
    assert.equal(isEmailAllowed("User@Example.COM", ["user@example.com"]), true);
  });

  it("allows case-insensitive match on allowlist entries", () => {
    assert.equal(isEmailAllowed("user@example.com", ["USER@EXAMPLE.COM"]), true);
  });

  it("trims whitespace on email", () => {
    assert.equal(isEmailAllowed("  user@example.com  ", ["user@example.com"]), true);
  });

  it("trims whitespace on allowlist entries", () => {
    assert.equal(isEmailAllowed("user@example.com", ["  user@example.com  "]), true);
  });

  it("denies empty string email", () => {
    assert.equal(isEmailAllowed("", ["user@example.com"]), false);
  });
});

describe("parseAllowlist", () => {
  it("returns empty array for undefined/empty", () => {
    assert.deepEqual(parseAllowlist(undefined), []);
    assert.deepEqual(parseAllowlist(""), []);
    assert.deepEqual(parseAllowlist("   "), []);
  });

  it("splits on commas, lowercases, trims, drops blanks", () => {
    assert.deepEqual(
      parseAllowlist(" A@B.com, ,  c@d.COM ,"),
      ["a@b.com", "c@d.com"]
    );
  });
});
