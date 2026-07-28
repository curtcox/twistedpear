import { describe, expect, it, vi } from "vitest";
import {
  FreenetClient,
  FreenetContractPacketLogBackend,
  encodePacketLogState,
  mergePacketLogStates
} from "../src/index.js";

describe("FreenetContractPacketLogBackend", () => {
  it("appends local frames and delivers peer-direction payloads in order", async () => {
    const states = new Map<string, Uint8Array>();
    const listeners = new Map<string, Set<(state: Uint8Array) => void>>();

    const client = {
      async put(source: { wasm: Uint8Array; parameters: Uint8Array }, state: Uint8Array) {
        const { key } = FreenetClient.deriveKey(source);
        const keyHex = Buffer.from(key).toString("hex");
        states.set(keyHex, Uint8Array.from(state));
        return key;
      },
      async get(key: Uint8Array) {
        const keyHex = Buffer.from(key).toString("hex");
        const state = states.get(keyHex);
        if (state === undefined) throw new Error("missing");
        return { key, codeHash: new Uint8Array(32), state };
      },
      async update(key: Uint8Array, _codeHash: Uint8Array, state: Uint8Array) {
        const keyHex = Buffer.from(key).toString("hex");
        const previous = states.get(keyHex) ?? encodePacketLogState([]);
        const merged = mergePacketLogStates(8, previous, state);
        states.set(keyHex, merged);
        for (const listener of listeners.get(keyHex) ?? []) {
          listener(merged);
        }
      },
      async subscribe(key: Uint8Array, listener: (state: Uint8Array) => void) {
        const keyHex = Buffer.from(key).toString("hex");
        const set = listeners.get(keyHex) ?? new Set();
        set.add(listener);
        listeners.set(keyHex, set);
        return () => set.delete(listener);
      },
      close: vi.fn()
    } as unknown as FreenetClient;

    const wasm = new Uint8Array([0, 97, 115, 109]);
    const rendezvous = new Uint8Array(32).fill(0x42);
    const left = new FreenetContractPacketLogBackend({
      client,
      wasm,
      rendezvous,
      localDirection: 0,
      retentionPerDirection: 8
    });
    const right = new FreenetContractPacketLogBackend({
      client,
      wasm,
      rendezvous,
      localDirection: 1,
      retentionPerDirection: 8
    });

    const received: number[] = [];
    right.setReceiver((frame) => received.push(frame[0]!));

    await left.start();
    await right.start();
    await left.publishFrame(new Uint8Array([9]));
    await left.publishFrame(new Uint8Array([10]));

    expect(received).toEqual([9, 10]);
    await left.stop();
    await right.stop();
  });
});
