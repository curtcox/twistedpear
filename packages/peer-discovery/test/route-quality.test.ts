import { describe, expect, it } from "vitest";
import { meterHostPeerRoute, type HostPeerRoute } from "../src/index.js";

function fakeRoute(): {
  route: HostPeerRoute;
  emit: (payload: Uint8Array) => void;
  sent: Uint8Array[];
} {
  const listeners = new Set<(payload: Uint8Array) => void>();
  const sent: Uint8Array[] = [];
  return {
    sent,
    emit: (payload) => {
      for (const listener of listeners) listener(payload);
    },
    route: {
      send(payload) {
        sent.push(payload);
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      quality: () => ({
        goodputBps: 2_000_000,
        rttMs: 40,
        mtu: 1_200,
        queueDepthBytes: 7,
      }),
    },
  };
}

describe("meterHostPeerRoute", () => {
  it("passes the transport's own declared claim through until something is measured", () => {
    const { route } = fakeRoute();
    const metered = meterHostPeerRoute(route, {
      now: () => 0,
      declaredBps: 64_000,
      declaredMtu: 500,
    });
    const quality = metered.quality?.();
    expect(quality).toMatchObject({ goodputBps: 2_000_000 });
    expect(quality?.source).toBeUndefined();
  });

  it("reports observed goodput once enough real bytes have moved", async () => {
    const { route, emit, sent } = fakeRoute();
    let now = 0;
    const metered = meterHostPeerRoute(route, {
      now: () => now,
      declaredBps: 64_000,
      declaredMtu: 500,
    });
    metered.subscribe?.(() => {});
    now = 100;
    await metered.send(new Uint8Array(1_024));
    now = 500;
    emit(new Uint8Array(1_024));
    const quality = metered.quality?.();
    expect(sent).toHaveLength(1);
    // 2048 bytes over the 500 ms span, not the interface nameplate.
    expect(quality).toMatchObject({
      goodputBps: 32_768,
      source: "observed",
      samples: 1,
      rttMs: 40,
    });
    expect(quality?.queueDepthBytes).toBe(7);
  });

  it("keeps the measured estimate through a long idle period", async () => {
    const { route } = fakeRoute();
    let now = 0;
    const metered = meterHostPeerRoute(route, {
      now: () => now,
      declaredBps: 64_000,
      declaredMtu: 500,
    });
    now = 1_000;
    await metered.send(new Uint8Array(4_096));
    const measured = metered.quality?.();
    now = 600_000;
    await metered.send(new Uint8Array(4));
    expect(metered.quality?.()).toEqual(measured);
  });

  it("does not count bytes a failing transport never accepted", async () => {
    const failing: HostPeerRoute = {
      send() {
        throw new Error("route is down");
      },
      quality: () => ({ goodputBps: 64_000, rttMs: 0, mtu: 500 }),
    };
    let now = 0;
    const metered = meterHostPeerRoute(failing, {
      now: () => now,
      declaredBps: 64_000,
      declaredMtu: 500,
    });
    for (let index = 0; index < 8; index += 1) {
      now += 100;
      await expect(metered.send(new Uint8Array(4_096))).rejects.toThrow(
        "route is down",
      );
    }
    expect(metered.quality?.().source).toBeUndefined();
  });

  it("leaves a route without a subscribe hook without one", () => {
    const metered = meterHostPeerRoute(
      { send() {} },
      { now: () => 0, declaredBps: 64_000, declaredMtu: 500 },
    );
    expect(metered.subscribe).toBeUndefined();
  });
});
