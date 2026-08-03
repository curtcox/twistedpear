// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  computeResourceTimeout,
  initialComputeResourceTimeoutState,
  resourceTimeoutFromActions,
  shouldUseResourceTimeout,
  stepComputeResourceTimeoutWithActions
} from "@twistedpear/protocol";
import { RESOURCE_SENDER_GRACE_TIME } from "../src/resource.js";

describe("resource watchdog adapter", () => {
  it("matches legacy timeout formula via use-timeout actions", () => {
    for (const [rtt, factor] of [
      [1, 6],
      [0.25, 4],
      [2, 6]
    ] as const) {
      const legacy = rtt * factor + RESOURCE_SENDER_GRACE_TIME;
      const stepped = stepComputeResourceTimeoutWithActions(
        initialComputeResourceTimeoutState(),
        {
          kind: "resource/timeout-gate",
          rtt,
          trafficTimeoutFactor: factor
        }
      );
      expect(shouldUseResourceTimeout(stepped.actions)).toBe(true);
      expect(resourceTimeoutFromActions(stepped.actions)).toBe(legacy);
      expect(resourceTimeoutFromActions(stepped.actions)).toBe(
        computeResourceTimeout(rtt, factor)
      );
    }
  });
});
