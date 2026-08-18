import { describe, expect, it } from "vitest";
import { appRiskTier } from "../src/index.js";

describe("app risk tier", () => {
  it("is benign for a zero-capability app, not a sum of benign grants", () => {
    expect(appRiskTier([]).tier).toBe("benign");
    expect(
      appRiskTier([
        "storage:kv",
        "storage:hyperbee",
        "workspace",
        "presence",
        "link:observe",
        "relay:read",
        "device:share-policy:read",
      ]).tier,
    ).toBe("benign");
  });

  it("takes the maximum class, not a count", () => {
    expect(appRiskTier(["identity", "storage:kv"]).tier).toBe("elevated");
    expect(appRiskTier(["identity", "lxmf:send"]).maxClass).toBe("sensitive");
    expect(appRiskTier(["relay:configure"]).tier).toBe("critical");
  });

  it("promotes one step when a read authority and an egress authority co-occur", () => {
    const recorder = appRiskTier(["device:microphone:pcm"]);
    expect(recorder.tier).toBe("sensitive");
    expect(recorder.promoted).toBe(false);

    const messenger = appRiskTier(["lxmf:send"]);
    expect(messenger.tier).toBe("sensitive");
    expect(messenger.promoted).toBe(false);

    const wiretap = appRiskTier(["device:microphone:pcm", "lxmf:send"]);
    expect(wiretap.maxClass).toBe("sensitive");
    expect(wiretap.promoted).toBe(true);
    expect(wiretap.tier).toBe("critical");
    expect(wiretap.hasReadAuthority).toBe(true);
    expect(wiretap.hasEgressAuthority).toBe(true);
  });

  it("lowers an offer-bound destination grant before taking the max", () => {
    const unscoped = appRiskTier(["lxmf:send"]);
    expect(unscoped.tier).toBe("sensitive");

    const scoped = appRiskTier(["lxmf:send"], { offerBound: ["lxmf:send"] });
    expect(scoped.maxClass).toBe("elevated");
    expect(scoped.promoted).toBe(false);
    expect(scoped.tier).toBe("elevated");
  });

  it("still promotes a scoped messenger that also reads a sensor", () => {
    const result = appRiskTier(["device:microphone:pcm", "lxmf:send"], {
      offerBound: ["lxmf:send"],
    });
    expect(result.maxClass).toBe("sensitive");
    expect(result.promoted).toBe(true);
    expect(result.tier).toBe("critical");
  });
});
