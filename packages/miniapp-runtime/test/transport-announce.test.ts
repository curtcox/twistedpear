import { describe, expect, it } from "vitest";
import {
  MemoryAnnounceTransport,
  TransportBackedAnnounceService,
} from "../src/index.js";

describe("transport-backed announce service", () => {
  it("carries bytes between distinct host services while isolating namespaces", async () => {
    const transport = new MemoryAnnounceTransport();
    const left = new TransportBackedAnnounceService(
      "left-destination",
      transport,
    );
    const right = new TransportBackedAnnounceService(
      "right-destination",
      transport,
    );
    await left.publish("board", new TextEncoder().encode("hello"), "board");
    const heard = await right.subscribe("board", "board");
    expect(heard).toHaveLength(1);
    expect(heard[0]?.destination).toBe("left-destination");
    expect(new TextDecoder().decode(heard[0]?.appData)).toBe("hello");
    expect(await right.subscribe("shelf", "shelf")).toEqual([]);
  });
});
