import { describe, expect, it, vi } from "vitest";
import {
  FreenetClient,
  FreenetContractPacketLogBackend,
  encodePacketLogParameters,
  encodePacketLogState,
  mergePacketLogStates,
  type PacketLogEntry
} from "../src/index.js";

function makeFakeClient(options?: { readonly notifyWith?: "payload" | "empty" }) {
  const states = new Map<string, Uint8Array>();
  const listeners = new Map<string, Set<(state: Uint8Array) => void>>();
  const getCalls: string[] = [];
  const notifyWith = options?.notifyWith ?? "payload";

  const client = {
    getCalls,
    async put(source: { wasm: Uint8Array; parameters: Uint8Array }, state: Uint8Array) {
      const { key } = FreenetClient.deriveKey(source);
      const keyHex = Buffer.from(key).toString("hex");
      states.set(keyHex, Uint8Array.from(state));
      return key;
    },
    async get(key: Uint8Array) {
      const keyHex = Buffer.from(key).toString("hex");
      getCalls.push(keyHex);
      const state = states.get(keyHex);
      if (state === undefined) throw new Error("missing");
      return { key, codeHash: new Uint8Array(32), state: Uint8Array.from(state) };
    },
    async update(key: Uint8Array, _codeHash: Uint8Array, state: Uint8Array) {
      const keyHex = Buffer.from(key).toString("hex");
      const previous = states.get(keyHex) ?? encodePacketLogState([]);
      const merged = mergePacketLogStates(8, previous, state);
      states.set(keyHex, merged);
      for (const listener of listeners.get(keyHex) ?? []) {
        listener(
          notifyWith === "empty" ? encodePacketLogState([]) : Uint8Array.from(merged)
        );
      }
    },
    async subscribe(key: Uint8Array, listener: (state: Uint8Array) => void) {
      const keyHex = Buffer.from(key).toString("hex");
      const set = listeners.get(keyHex) ?? new Set();
      set.add(listener);
      listeners.set(keyHex, set);
      return () => set.delete(listener);
    },
    notify(key: Uint8Array, state: Uint8Array) {
      const keyHex = Buffer.from(key).toString("hex");
      for (const listener of listeners.get(keyHex) ?? []) {
        listener(state);
      }
    },
    setState(key: Uint8Array, state: Uint8Array) {
      states.set(Buffer.from(key).toString("hex"), Uint8Array.from(state));
    },
    close: vi.fn()
  };

  return client as typeof client & FreenetClient;
}

function entry(direction: 0 | 1, index: bigint, byte: number): PacketLogEntry {
  return { direction, index, payload: new Uint8Array([byte]) };
}

function contractKey(wasm: Uint8Array, rendezvous: Uint8Array): Uint8Array {
  const parameters = encodePacketLogParameters({
    retentionPerDirection: 8,
    rendezvous
  });
  return FreenetClient.deriveKey({ wasm, parameters }).key;
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("FreenetContractPacketLogBackend", () => {
  it("appends local frames and delivers peer-direction payloads in order", async () => {
    const client = makeFakeClient();
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
    await settle();

    expect(received).toEqual([9, 10]);
    await left.stop();
    await right.stop();
  });

  it("treats notifications as hints and refetches authoritative state", async () => {
    const client = makeFakeClient({ notifyWith: "empty" });
    const wasm = new Uint8Array([0, 97, 115, 109]);
    const rendezvous = new Uint8Array(32).fill(0x43);
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
    const getsBefore = client.getCalls.length;
    await left.publishFrame(new Uint8Array([11]));
    await settle();

    expect(client.getCalls.length).toBeGreaterThan(getsBefore);
    expect(received).toEqual([11]);
    await left.stop();
    await right.stop();
  });

  it("buffers reordered peer indices until the stream is contiguous", async () => {
    const client = makeFakeClient();
    const wasm = new Uint8Array([0, 97, 115, 109]);
    const rendezvous = new Uint8Array(32).fill(0x44);
    const right = new FreenetContractPacketLogBackend({
      client,
      wasm,
      rendezvous,
      localDirection: 1,
      retentionPerDirection: 8
    });
    const received: number[] = [];
    right.setReceiver((frame) => received.push(frame[0]!));
    await right.start();

    const key = contractKey(wasm, rendezvous);

    // Authoritative store only has index 2 — gap at 0/1 must block delivery.
    client.setState(key, encodePacketLogState([entry(0, 2n, 3)]));
    client.notify(key, encodePacketLogState([entry(0, 2n, 3)]));
    await settle();
    expect(received).toEqual([]);

    client.setState(key, encodePacketLogState([entry(0, 0n, 1), entry(0, 2n, 3)]));
    client.notify(key, encodePacketLogState([]));
    await settle();
    expect(received).toEqual([1]);

    const full = encodePacketLogState([
      entry(0, 0n, 1),
      entry(0, 1n, 2),
      entry(0, 2n, 3)
    ]);
    client.setState(key, full);
    client.notify(key, encodePacketLogState([]));
    await settle();
    expect(received).toEqual([1, 2, 3]);

    await right.stop();
  });

  it("deduplicates repeated peer entries", async () => {
    const client = makeFakeClient();
    const wasm = new Uint8Array([0, 97, 115, 109]);
    const rendezvous = new Uint8Array(32).fill(0x45);
    const right = new FreenetContractPacketLogBackend({
      client,
      wasm,
      rendezvous,
      localDirection: 1,
      retentionPerDirection: 8
    });
    const received: number[] = [];
    right.setReceiver((frame) => received.push(frame[0]!));
    await right.start();

    const key = contractKey(wasm, rendezvous);
    const state = encodePacketLogState([entry(0, 0n, 7)]);
    client.setState(key, state);
    client.notify(key, state);
    client.notify(key, state);
    client.notify(key, state);
    await settle();
    expect(received).toEqual([7]);
    await right.stop();
  });

  it("recovers a missing intermediate index after a delayed authoritative get", async () => {
    const client = makeFakeClient();
    const wasm = new Uint8Array([0, 97, 115, 109]);
    const rendezvous = new Uint8Array(32).fill(0x46);
    const right = new FreenetContractPacketLogBackend({
      client,
      wasm,
      rendezvous,
      localDirection: 1,
      retentionPerDirection: 8
    });
    const received: number[] = [];
    right.setReceiver((frame) => received.push(frame[0]!));
    await right.start();

    const key = contractKey(wasm, rendezvous);
    client.setState(key, encodePacketLogState([entry(0, 1n, 20)]));
    client.notify(key, encodePacketLogState([entry(0, 1n, 20)]));
    await settle();
    expect(received).toEqual([]);

    client.setState(
      key,
      encodePacketLogState([entry(0, 0n, 10), entry(0, 1n, 20)])
    );
    client.notify(key, encodePacketLogState([]));
    await settle();
    expect(received).toEqual([10, 20]);
    await right.stop();
  });
});
