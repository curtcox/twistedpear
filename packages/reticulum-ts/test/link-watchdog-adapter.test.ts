import { describe, expect, it } from "vitest";
import { computeKeepalive } from "@twistedpear/protocol";
import {
  LINK_KEEPALIVE,
  LINK_KEEPALIVE_MAX_RTT,
  LINK_KEEPALIVE_MIN,
  LINK_STALE_FACTOR
} from "../src/link.js";

describe("link watchdog adapter", () => {
  it("matches legacy keepalive formula via computeKeepalive", () => {
    for (const rtt of [0.01, 0.1, 0.5, 1.0, 1.75, 2.0, 10.0]) {
      const legacy = Math.max(
        Math.min(rtt * (LINK_KEEPALIVE / LINK_KEEPALIVE_MAX_RTT), LINK_KEEPALIVE),
        LINK_KEEPALIVE_MIN
      );
      expect(computeKeepalive(rtt)).toBe(legacy);
      expect(computeKeepalive(rtt) * LINK_STALE_FACTOR).toBe(legacy * LINK_STALE_FACTOR);
    }
  });
});
