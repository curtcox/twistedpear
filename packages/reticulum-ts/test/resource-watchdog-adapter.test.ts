import { describe, expect, it } from "vitest";
import { computeResourceTimeout } from "@twistedpear/protocol";
import { RESOURCE_SENDER_GRACE_TIME } from "../src/resource.js";

describe("resource watchdog adapter", () => {
  it("matches legacy timeout formula via computeResourceTimeout", () => {
    for (const [rtt, factor] of [
      [1, 6],
      [0.25, 4],
      [2, 6]
    ] as const) {
      const legacy = rtt * factor + RESOURCE_SENDER_GRACE_TIME;
      expect(computeResourceTimeout(rtt, factor)).toBe(legacy);
    }
  });
});
