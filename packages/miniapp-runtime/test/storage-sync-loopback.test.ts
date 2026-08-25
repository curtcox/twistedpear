import { describe, expect, it } from "vitest";
import { TopicLogStore } from "../src/index.js";
import {
  LoopbackReplicaLink,
  type LoopbackFault,
} from "../src/services/storage-sync-loopback.js";

function pair(fault: LoopbackFault = "none"): LoopbackReplicaLink {
  return new LoopbackReplicaLink(
    new TopicLogStore({ authorId: "device-a" }),
    new TopicLogStore({ authorId: "device-b" }),
    "board",
    fault,
  );
}

describe("loopback storage:sync replication", () => {
  it("converges concurrent writes of distinct keys", () => {
    const link = pair();
    link.left.set("board", "slot/a", { holder: "a" });
    link.right.set("board", "slot/b", { holder: "b" });
    expect(link.converge()).toBeGreaterThan(0);
    expect(link.left.view("board").get("slot/a")?.payload).toEqual({
      holder: "a",
    });
    expect(link.right.view("board").get("slot/b")?.payload).toEqual({
      holder: "b",
    });
    expect(link.left.vector("board")).toEqual({ "device-a": 1, "device-b": 1 });
  });

  it("applies last-writer-wins across replicas for the same key", () => {
    const link = pair();
    link.left.set("board", "item/1", { claimed: false });
    link.converge();
    link.right.set("board", "item/1", { claimed: true });
    link.converge();
    expect(link.left.view("board").get("item/1")?.payload).toEqual({
      claimed: true,
    });
    expect(link.right.view("board").get("item/1")?.authorId).toBe("device-b");
  });

  it("retrieves dropped diffs on the next tick", () => {
    const link = pair("drop-first");
    link.left.set("board", "note", "hello");
    link.tick();
    expect(link.converged()).toBe(false);
    expect(link.converge()).toBeGreaterThan(0);
    expect(link.right.view("board").get("note")?.payload).toBe("hello");
  });

  it("delivers delayed diffs on a later tick", () => {
    const link = pair("delay");
    link.left.set("board", "note", "later");
    link.tick();
    expect(link.right.view("board").has("note")).toBe(false);
    expect(link.converge()).toBeGreaterThan(0);
    expect(link.right.view("board").get("note")?.payload).toBe("later");
  });

  it("converges when a batch is reordered", () => {
    const link = pair("reorder");
    link.left.set("board", "a", 1);
    link.left.set("board", "b", 2);
    link.left.set("board", "c", 3);
    expect(link.converge()).toBeGreaterThan(0);
    expect([...link.right.view("board").keys()].sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("treats duplicate delivery as idempotent", () => {
    const link = pair("duplicate");
    link.left.set("board", "note", "once");
    expect(link.converge()).toBeGreaterThan(0);
    expect(link.right.entries("board")).toHaveLength(1);
    expect(link.right.view("board").get("note")?.payload).toBe("once");
  });

  it("diverges under partition and converges after heal and retry", () => {
    const link = pair();
    link.partition();
    link.left.set("board", "left", 1);
    link.right.set("board", "right", 2);
    link.tick();
    expect(link.left.view("board").has("right")).toBe(false);
    expect(link.right.view("board").has("left")).toBe(false);
    link.heal();
    expect(link.converge()).toBeGreaterThan(0);
    expect(link.left.view("board").has("right")).toBe(true);
    expect(link.right.view("board").has("left")).toBe(true);
  });

  it("does not resurrect a tombstone after a healed partition", () => {
    const link = pair();
    link.left.set("board", "item/1", { claimed: false });
    link.converge();
    link.partition();
    link.left.tombstone("board", "item/1");
    link.heal();
    link.converge();
    expect(link.left.view("board").has("item/1")).toBe(false);
    expect(link.right.view("board").has("item/1")).toBe(false);
  });
});
