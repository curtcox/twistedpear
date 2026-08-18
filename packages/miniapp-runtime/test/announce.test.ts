import { describe, expect, it } from "vitest";
import { AnnounceService } from "../src/index.js";

describe("announce service", () => {
  it("uses the calling app's default namespace for publish and subscribe", async () => {
    const service = new AnnounceService();
    const payload = new TextEncoder().encode("hello");

    await service.publish("app-a", payload);

    expect(await service.subscribe("app-a")).toEqual([
      expect.objectContaining({ destination: "app-a", appData: payload }),
    ]);
    expect(await service.subscribe("app-b")).toEqual([]);
  });

  it("returns snapshots rather than a live collection", async () => {
    const service = new AnnounceService();
    const first = new TextEncoder().encode("first");
    const second = new TextEncoder().encode("second");

    await service.publish("board", first);
    const snapshot = await service.subscribe("board");
    await service.publish("board", second);

    expect(snapshot.map((event) => event.appData)).toEqual([first]);
    expect(
      (await service.subscribe("board")).map((event) => event.appData),
    ).toEqual([first, second]);
  });

  it("does not exchange events between independent host services", async () => {
    const leftHostService = new AnnounceService();
    const rightHostService = new AnnounceService();

    await leftHostService.publish(
      "board",
      new TextEncoder().encode("local only"),
    );

    expect(await rightHostService.subscribe("board")).toEqual([]);
  });
});
