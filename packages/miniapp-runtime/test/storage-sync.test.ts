import { describe, expect, it } from "vitest";
import { ReplicaCapError, TopicLogStore } from "../src/index.js";

describe("local topic log store", () => {
  it("appends, derives LWW, and tombstones without resurrection", () => {
    const store = new TopicLogStore({ authorId: "self" });
    store.open("board");
    store.set("board", "item/1", { claimed: false });
    store.set("board", "item/1", { claimed: true });
    expect(store.view("board").get("item/1")?.payload).toEqual({
      claimed: true,
    });
    store.tombstone("board", "item/1");
    expect(store.view("board").has("item/1")).toBe(false);
    store.ingest("board", [
      {
        authorId: "peer",
        seq: 1,
        at: 0,
        key: "item/1",
        payload: { claimed: false },
      },
    ]);
    expect(store.view("board").has("item/1")).toBe(false);
    expect(store.vector("board")).toEqual({ self: 3, peer: 1 });
  });

  it("refuses an append that would exceed the per-author cap", () => {
    const store = new TopicLogStore({ authorId: "self", authorCap: 1 });
    store.open("board");
    store.append("board", "one");
    expect(() => store.append("board", "two")).toThrow(ReplicaCapError);
  });
});
