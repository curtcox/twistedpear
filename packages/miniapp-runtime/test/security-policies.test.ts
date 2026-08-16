import { describe, expect, it } from "vitest";
import {
  BearerReplayPolicy,
  FederationPolicy,
  KeySharePolicy,
} from "../src/security-policies.js";

describe("security policies", () => {
  it("accepts a token once and rejects its replay", () => {
    const policy = new BearerReplayPolicy();
    expect(policy.use("token")).toBe("accepted");
    expect(policy.use("token")).toBe("replay-rejected");
  });

  it("admits only trusted devices", () => {
    const policy = new KeySharePolicy(new Set(["trusted"]));
    expect(policy.authorize("trusted")).toBe("accepted");
    expect(policy.authorize("stranger")).toBe("untrusted-device-rejected");
  });

  it("contains peers outside the ACL", () => {
    const policy = new FederationPolicy(new Set(["friend"]));
    expect(policy.authorize("friend")).toBe("accepted");
    expect(policy.authorize("attacker")).toBe("malicious-acl-contained");
  });
});
