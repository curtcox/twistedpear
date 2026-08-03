// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import {
  FreenetClient,
  FreenetPropagationStore,
  encodePropagationSetState,
  mergePropagationSetStates
} from "../src/index.js";

function transientId(suffix: number): Uint8Array {
  const out = new Uint8Array(32);
  out[31] = suffix;
  return out;
}

function lxmfForDestination(destByte: number, payload: string): Uint8Array {
  const out = new Uint8Array(16 + payload.length);
  out.fill(destByte, 0, 16);
  out.set(new TextEncoder().encode(payload), 16);
  return out;
}

describe("FreenetPropagationStore", () => {
  it("puts a new destination contract and merges on later publish", async () => {
    const puts: Uint8Array[] = [];
    const updates: Uint8Array[] = [];
    const states = new Map<string, Uint8Array>();
    const client = {
      async put(_source: unknown, state: Uint8Array) {
        puts.push(Uint8Array.from(state));
        const key = FreenetClient.deriveKey(_source as {
          wasm: Uint8Array;
          parameters: Uint8Array;
        }).key;
        states.set(Buffer.from(key).toString("hex"), Uint8Array.from(state));
        return key;
      },
      async get(key: Uint8Array) {
        const state = states.get(Buffer.from(key).toString("hex"));
        if (state === undefined) throw new Error("missing");
        return { key, codeHash: new Uint8Array(32), state };
      },
      async update(
        _key: Uint8Array,
        _codeHash: Uint8Array,
        state: Uint8Array
      ) {
        updates.push(Uint8Array.from(state));
        states.set(Buffer.from(_key).toString("hex"), Uint8Array.from(state));
      }
    } as unknown as FreenetClient;

    const store = new FreenetPropagationStore({
      client,
      wasm: new Uint8Array([0, 97, 115, 109])
    });

    await store.publish([
      {
        transientId: transientId(1),
        storedAt: 100,
        lxmfData: lxmfForDestination(0x11, "a")
      }
    ]);
    expect(puts).toHaveLength(1);

    await store.publish([
      {
        transientId: transientId(2),
        storedAt: 200,
        lxmfData: lxmfForDestination(0x11, "b")
      }
    ]);
    expect(updates).toHaveLength(1);

    const pulled = await store.pull();
    expect(pulled.map((entry) => entry.transientId[31])).toEqual([1, 2]);
  });

  it("skips no-op merges", async () => {
    const update = vi.fn();
    const first = encodePropagationSetState([
      {
        transientId: transientId(1),
        storedAt: 100n,
        lxmfData: lxmfForDestination(0x22, "same")
      }
    ]);
    const client = {
      async put() {
        return new Uint8Array(32);
      },
      async get() {
        return {
          key: new Uint8Array(32),
          codeHash: new Uint8Array(32),
          state: first
        };
      },
      update
    } as unknown as FreenetClient;

    const store = new FreenetPropagationStore({
      client,
      wasm: new Uint8Array([0, 97, 115, 109]),
      watchDestinationHashes: [new Uint8Array(16).fill(0x22)]
    });

    await store.publish([
      {
        transientId: transientId(1),
        storedAt: 100,
        lxmfData: lxmfForDestination(0x22, "same")
      }
    ]);
    expect(update).not.toHaveBeenCalled();
    expect(
      Buffer.from(
        mergePropagationSetStates(first, first)
      ).toString("hex")
    ).toBe(Buffer.from(first).toString("hex"));
  });
});
