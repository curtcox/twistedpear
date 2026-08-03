// @ts-nocheck
import type { Event, Intent } from "../src/types.js";
import { doubleRunHashes, SimKernel } from "../src/adapters/sim/kernel.js";
import { SimTransport } from "../src/adapters/sim/transport.js";
import { describe, expect, it } from "vitest";

interface State { readonly received: number }

function sender(state: State, event: Event): { state: State; intents: Intent[] } {
  if (event.kind !== "start") return { state, intents: [] };
  return {
    state,
    intents: Array.from({ length: 4 }, () => ({
      kind: "transport/send" as const,
      send: { channel: "test", destination: "b", payload: new Uint8Array(100) }
    }))
  };
}

function receiver(state: State, event: Event): { state: State; intents: Intent[] } {
  return event.kind === "transport/recv"
    ? { state: { received: state.received + 1 }, intents: [] }
    : { state, intents: [] };
}

function config(linkClass: "lan" | "lora") {
  return {
    seed: 44,
    nodes: [
      { id: "a", initial: { received: 0 }, step: sender },
      { id: "b", initial: { received: 0 }, step: receiver }
    ],
    links: [{
      source: "a",
      destination: "b",
      class: linkClass,
      params: {
        lossRate: 0,
        burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 }
      }
    }]
  };
}

describe("executable transport classes", () => {
  it("makes LoRa scarcity visible and remains deterministic", () => {
    const lan = new SimKernel(config("lan"));
    lan.start();
    lan.runUntilIdle(10_000_000);

    const loraConfig = config("lora");
    const lora = new SimKernel(loraConfig);
    lora.start();
    expect(lora.transport.getStats().dutyCycleDelayed).toBeGreaterThan(0);
    expect(lora.transport.nextDeliverAt()).toBeGreaterThan(lan.transport.nextDeliverAt() ?? 0);

    const hashes = doubleRunHashes(loraConfig);
    expect(hashes.a).toBe(hashes.b);
  });

  it("severs a link during configured partitions", () => {
    const partitioned = config("lan");
    const kernel = new SimKernel({
      ...partitioned,
      links: [{
        ...partitioned.links[0]!,
        params: { lossRate: 0, partitions: [{ fromMs: 0, toMs: 100 }] }
      }]
    });
    kernel.start();
    expect(kernel.transport.getStats().partitioned).toBe(4);
    expect(kernel.transport.inFlight).toBe(0);
  });

  it("drops in-flight traffic when its delivery crosses a partition", () => {
    const base = config("lan");
    const kernel = new SimKernel({
      ...base,
      links: [{
        ...base.links[0]!,
        params: {
          lossRate: 0,
          latency: { kind: "fixed", ms: 6 },
          burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 },
          partitions: [{ fromMs: 5, toMs: 10 }]
        }
      }]
    });
    kernel.start();
    kernel.runUntilIdle(100);
    expect(kernel.getNodeState("b").received).toBe(0);
    expect(kernel.transport.getStats().partitioned).toBe(4);
  });

  it("reorders actual delivery slots and reports affected messages", () => {
    const transport = new SimTransport({ links: [{ source: "a", destination: "b", class: "lan",
      adversary: "z", powers: ["reorder"], params: { lossRate: 0,
        latency: { kind: "fixed", ms: 1 },
        burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 } } }] });
    for (const channel of ["first", "second", "third"]) transport.applySend({
      kind: "transport/send", send: { channel, destination: "b", payload: new Uint8Array([1]) }
    }, "a", 0);
    transport.applyAdversary({ power: "reorder", source: "a", destination: "b" }, "z", 0);
    expect(transport.deliverDue(Number.MAX_SAFE_INTEGER).map((message) => message.channel))
      .toEqual(["third", "second", "first"]);
    expect(transport.getStats().adversaryReordered).toBe(3);
  });
});
