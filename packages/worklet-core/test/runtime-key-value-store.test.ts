import { describe, expect, it } from "vitest";
import { createRuntimeKeyValueStore } from "../src/worklet-entry-shared-helpers.mjs";

function runtime(backing: Map<string, unknown>) {
  return {
    store: {
      get: async (key: string) => backing.get(key),
      set: async (key: string, value: unknown) => {
        backing.set(key, value);
      },
      delete: async (key: string) => {
        backing.delete(key);
      },
    },
  };
}

function open(backing: Map<string, unknown>) {
  return createRuntimeKeyValueStore(runtime(backing), new Set<string>());
}

describe("durable runtime key enumeration", () => {
  it("lists keys written before a host restart", async () => {
    const backing = new Map<string, unknown>();
    const first = open(backing);
    await first.set("miniapp-kv:chat:theme", new Uint8Array([1]));
    await first.set("miniapp-kv:chat:draft", new Uint8Array([2]));
    await first.set("other", new Uint8Array([3]));

    const restarted = open(backing);
    await expect(restarted.list("miniapp-kv:chat:")).resolves.toEqual([
      "miniapp-kv:chat:draft",
      "miniapp-kv:chat:theme",
    ]);
    await expect(restarted.list()).resolves.toEqual([
      "miniapp-kv:chat:draft",
      "miniapp-kv:chat:theme",
      "other",
    ]);
  });

  it("keeps deletions durable across a restart", async () => {
    const backing = new Map<string, unknown>();
    const first = open(backing);
    await first.set("keep", new Uint8Array([1]));
    await first.set("remove", new Uint8Array([2]));
    await first.delete("remove");

    const restarted = open(backing);
    await expect(restarted.list()).resolves.toEqual(["keep"]);
    await expect(restarted.get("remove")).resolves.toBeNull();
  });

  it("serializes index writes made through sibling adapters", async () => {
    const backing = new Map<string, unknown>();
    const sharedKeys = new Set<string>();
    const first = createRuntimeKeyValueStore(runtime(backing), sharedKeys);
    const second = createRuntimeKeyValueStore(runtime(backing), sharedKeys);

    await Promise.all([
      first.set("a", new Uint8Array([1])),
      second.set("b", new Uint8Array([2])),
    ]);

    await expect(open(backing).list()).resolves.toEqual(["a", "b"]);
  });

  it("rejects a corrupt durable index instead of returning an empty backup", async () => {
    const backing = new Map<string, unknown>();
    const first = open(backing);
    await first.set("a", new Uint8Array([1]));
    const indexKey = [...backing.keys()].find((key) => key !== "a");
    expect(indexKey).toBeDefined();
    backing.set(indexKey as string, new Uint8Array([0xff]));

    await expect(open(backing).list()).rejects.toThrow(
      "Invalid durable runtime store key index",
    );
  });
});
