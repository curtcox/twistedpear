import { describe, expect, it } from "vitest";
import {
  computeKeepalive,
  initialComputeKeepaliveState,
  linkKeepaliveFromActions,
  shouldUseLinkKeepalive,
  stepComputeKeepaliveWithActions,
} from "@twistedpear/protocol";
import {
  LINK_KEEPALIVE,
  LINK_KEEPALIVE_MAX_RTT,
  LINK_KEEPALIVE_MIN,
  LINK_STALE_FACTOR,
} from "../src/link.js";

describe("link watchdog adapter", () => {
  it("matches legacy keepalive formula via use-keepalive actions", () => {
    for (const rtt of [0.01, 0.1, 0.5, 1.0, 1.75, 2.0, 10.0]) {
      const legacy = Math.max(
        Math.min(
          rtt * (LINK_KEEPALIVE / LINK_KEEPALIVE_MAX_RTT),
          LINK_KEEPALIVE,
        ),
        LINK_KEEPALIVE_MIN,
      );
      const stepped = stepComputeKeepaliveWithActions(
        initialComputeKeepaliveState(),
        {
          kind: "link/keepalive-gate",
          rtt,
        },
      );
      expect(shouldUseLinkKeepalive(stepped.actions)).toBe(true);
      expect(linkKeepaliveFromActions(stepped.actions)).toBe(legacy);
      expect(linkKeepaliveFromActions(stepped.actions)).toBe(
        computeKeepalive(rtt),
      );
      expect(
        linkKeepaliveFromActions(stepped.actions)! * LINK_STALE_FACTOR,
      ).toBe(legacy * LINK_STALE_FACTOR);
    }
  });
});
