import { describe, expect, it } from "vitest";
import {
  RESOURCE_MAX_ADV_RETRIES,
  RESOURCE_MAX_RETRIES,
  RESOURCE_PART_TIMEOUT_FACTOR,
  RESOURCE_WINDOW,
  RESOURCE_WINDOW_MAX,
  RESOURCE_WINDOW_MIN,
  ResourceStatus,
} from "../src/resource-watchdog.js";

describe("resource session constants", () => {
  it("exposes status and window/retry constants", () => {
    expect(ResourceStatus.TRANSFERRING).toBe(0x03);
    expect(ResourceStatus.COMPLETE).toBe(0x06);
    expect(ResourceStatus.REJECTED).toBe(ResourceStatus.NONE);
    expect(RESOURCE_WINDOW).toBe(4);
    expect(RESOURCE_WINDOW_MIN).toBe(2);
    expect(RESOURCE_WINDOW_MAX).toBe(75);
    expect(RESOURCE_MAX_RETRIES).toBe(16);
    expect(RESOURCE_MAX_ADV_RETRIES).toBe(4);
    expect(RESOURCE_PART_TIMEOUT_FACTOR).toBe(4);
  });
});
