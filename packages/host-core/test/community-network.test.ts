import { describe, expect, it } from "vitest";
import { RETICULUM_COMMUNITY_NETWORK } from "../src/community-network.js";

describe("community network profile", () => {
  it("ships multiple valid, opt-in TCP bootstrap endpoints", () => {
    expect(RETICULUM_COMMUNITY_NETWORK.endpoints.length).toBeGreaterThanOrEqual(2);
    expect(RETICULUM_COMMUNITY_NETWORK.privacyNotice).toMatch(/IP address/);
    for (const endpoint of RETICULUM_COMMUNITY_NETWORK.endpoints) {
      expect(endpoint.host).toMatch(/^[a-z0-9.-]+$/);
      expect(endpoint.port).toBeGreaterThan(0);
      expect(endpoint.port).toBeLessThanOrEqual(65_535);
    }
  });
});
