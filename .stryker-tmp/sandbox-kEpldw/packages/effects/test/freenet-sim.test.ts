// @ts-nocheck
import { describe, expect, it } from "vitest";
import { SimClock } from "../src/adapters/sim/clock.js";
import {
  SimFreenetClient,
  SimFreenetContractHub,
  SIM_FREENET_DEFAULT_NOTIFY_LATENCY_MS,
  simFreenetDeriveKey,
  simFreenetTransportClass
} from "../src/adapters/sim/freenet.js";
import { transportClass } from "../src/adapters/sim/transport-classes.js";
import { SimTransport } from "../src/adapters/sim/transport.js";

describe("SimFreenetContractHub", () => {
  it("replicates put/update/subscribe across clients on one hub", async () => {
    const hub = new SimFreenetContractHub();
    const left = new SimFreenetClient({ hub });
    const right = new SimFreenetClient({ hub });
    const source = {
      wasm: new Uint8Array([0, 97, 115, 109]),
      parameters: new Uint8Array([1])
    };

    const key = await left.put(source, new Uint8Array([9]));
    const notifications: number[] = [];
    await right.subscribe(key, (state) => notifications.push(state[0]!));

    await left.update(key, new Uint8Array(32), new Uint8Array([10]));
    expect(notifications).toEqual([10]);

    const got = await right.get(key);
    expect(got.state).toEqual(new Uint8Array([10]));
    await left.close();
    await right.close();
  });

  it("delays subscriber notify on a virtual clock", async () => {
    const clock = new SimClock(0);
    const hub = new SimFreenetContractHub({
      clock,
      notify: { latencyMs: SIM_FREENET_DEFAULT_NOTIFY_LATENCY_MS }
    });
    const client = new SimFreenetClient({ hub });
    const source = {
      wasm: new Uint8Array([0, 97, 115, 109]),
      parameters: new Uint8Array([2])
    };
    const key = await client.put(source, new Uint8Array([1]));
    const seen: number[] = [];
    await client.subscribe(key, (state) => seen.push(state[0]!));

    await client.update(key, new Uint8Array(32), new Uint8Array([2]));
    expect(seen).toEqual([]);
    expect(hub.nextNotifyAt()).toBe(SIM_FREENET_DEFAULT_NOTIFY_LATENCY_MS);

    clock.set(SIM_FREENET_DEFAULT_NOTIFY_LATENCY_MS);
    expect(hub.deliverDue(clock.now())).toBe(1);
    expect(seen).toEqual([2]);
    await client.close();
  });

  it("derives stable simulated contract keys", () => {
    const source = {
      wasm: new Uint8Array([0, 97, 115, 109]),
      parameters: new Uint8Array([3])
    };
    expect(simFreenetDeriveKey(source)).toEqual(SimFreenetClient.deriveKey(source));
  });
});

describe("freenet transport class", () => {
  it("uses S2-derived latency and F2 policy bitrate", () => {
    const preset = transportClass("freenet");
    expect(preset.bandwidthBps).toBe(90_000);
    expect(preset.latency).toEqual({ kind: "uniform", minMs: 63, maxMs: 89 });
    expect(simFreenetTransportClass()).toEqual(preset);
  });

  it("schedules contract-sized payloads slower than LAN", () => {
    const clock = new SimClock(0);
    const lan = new SimTransport({
      links: [{ source: "a", destination: "b", class: "lan", params: { lossRate: 0 } }]
    }, () => 0);
    const freenet = new SimTransport({
      links: [{
        source: "a",
        destination: "b",
        class: "freenet",
        params: {
          lossRate: 0,
          burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 }
        }
      }]
    }, () => 0);
    const payload = new Uint8Array(1024);
    lan.applySend({ kind: "transport/send", send: { channel: "x", destination: "b", payload } }, "a", 0);
    freenet.applySend({ kind: "transport/send", send: { channel: "x", destination: "b", payload } }, "a", 0);
    expect(freenet.nextDeliverAt() ?? 0).toBeGreaterThan(lan.nextDeliverAt() ?? 0);
    expect(clock.now()).toBe(0);
  });
});
