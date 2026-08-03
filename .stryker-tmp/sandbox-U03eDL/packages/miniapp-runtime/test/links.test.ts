// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITY_DEFINITIONS,
  DEFAULT_LINK_PROBE_BUDGET_BYTES,
  LinkQualityService,
  LinkServiceError,
  PeerRouteLinkObservatory,
  type LinkObservatoryBackend,
  type LinkQuality
} from "../src/index.js";

const quality: LinkQuality = {
  goodputBps: 20_000,
  rttMs: 80,
  jitterMs: 5,
  lossRatio: 0,
  mtu: 500,
  source: "probed",
  samples: 1,
  confidence: "medium"
};

function backend(policy: "allowed" | "confirm" | "denied" = "allowed"): LinkObservatoryBackend {
  return {
    async peers() { return []; },
    async probePolicy() { return policy; },
    async probe(_appId, _peer, request) {
      expect(request).toMatchObject({ reservationClass: "control", abortOnQueueGrowth: true });
      expect(request.budgetBytes).toBeLessThanOrEqual(DEFAULT_LINK_PROBE_BUDGET_BYTES);
      return quality;
    }
  };
}

describe("link capabilities and service", () => {
  it("publishes the observe and probe capabilities", () => {
    const ids = CAPABILITY_DEFINITIONS.map((entry) => entry.id);
    expect(ids).toContain("link:observe");
    expect(ids).toContain("link:probe");
    expect(ids).toContain("device:share-policy:read");
    expect(ids).toContain("device:stream:raw-inbound");
  });

  it("rate limits probes per app and opaque peer", async () => {
    let now = 1_000;
    const service = new LinkQualityService(backend(), { now: () => now });
    await expect(service.probe("app", { id: "peer-1" })).resolves.toEqual(quality);
    await expect(service.probe("app", { id: "peer-1" })).rejects.toMatchObject<Partial<LinkServiceError>>({
      code: "LINK_PROBE_RATE_LIMITED"
    });
    now += 60_000;
    await expect(service.probe("app", { id: "peer-1" }, { budgetBytes: 512 })).resolves.toEqual(quality);
  });

  it("requires host confirmation on costly links", async () => {
    const confirm = vi.fn(async () => true);
    const service = new LinkQualityService(backend("confirm"), {
      now: () => 1,
      confirmCostlyProbe: confirm
    });
    await service.probe("app", { id: "peer" });
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("rejects oversized budgets before calling the backend", async () => {
    const service = new LinkQualityService(backend(), { now: () => 1 });
    await expect(
      service.probe("app", { id: "peer" }, { budgetBytes: DEFAULT_LINK_PROBE_BUDGET_BYTES + 1 })
    ).rejects.toMatchObject<Partial<LinkServiceError>>({ code: "LINK_BAD_REQUEST" });
  });

  it("adapts only app-owned authenticated routes into a low-confidence roster", async () => {
    const observatory = new PeerRouteLinkObservatory({
      list(appId) {
        return appId === "line-check"
          ? [{ handle: { id: "opaque-1" }, displayLabel: "Ana", dataPlane: "webrtc", connectedAt: 900 }]
          : [];
      }
    }, { now: () => 1_000 });
    await expect(observatory.peers("other-app")).resolves.toEqual([]);
    await expect(observatory.peers("line-check")).resolves.toEqual([
      expect.objectContaining({
        peer: { id: "opaque-1" },
        displayLabel: "Ana",
        plane: "webrtc",
        quality: expect.objectContaining({ source: "declared", confidence: "low" }),
        readiness: null
      })
    ]);
    await expect(observatory.probePolicy("other-app", { id: "opaque-1" })).resolves.toBe("denied");
  });

  it("exchanges coarse readiness and a bounded probe over paired host routes", async () => {
    const aListeners = new Set<(payload: Uint8Array) => void>(); const bListeners = new Set<(payload: Uint8Array) => void>(); let now = 1_000;
    const directory = (remote: string, outbound: Set<(payload: Uint8Array) => void>, inbound: Set<(payload: Uint8Array) => void>) => ({
      list: () => [{ handle: { id: remote }, displayLabel: remote, dataPlane: "webrtc" as const, connectedAt: 900 }],
      route: (_appId: string, handle: { id: string }) => handle.id === remote ? { transport: { send: async (payload: Uint8Array) => { now += 5; for (const listener of outbound) listener(payload.slice()); }, subscribe: (listener: (payload: Uint8Array) => void) => { inbound.add(listener); return () => inbound.delete(listener); }, quality: () => ({ goodputBps: 900_000, rttMs: 12, mtu: 900, source: "observed" as const, samples: 4, confidence: "medium" as const }) } } : undefined
    });
    const readiness = () => ({ hostApi: "0.12.0", accepts: [{ classId: "microphone" as const, maxRung: "16k-opus", encodings: ["16k-opus"] }], offers: [], downlinkBucket: "audio" as const, constrained: ["foreground-only" as const], consentPosture: "ask" as const, expiresAt: 10_000 });
    const a = new PeerRouteLinkObservatory(directory("b", bListeners, aListeners), { now: () => now, localReadiness: readiness });
    const b = new PeerRouteLinkObservatory(directory("a", aListeners, bListeners), { now: () => now, localReadiness: readiness });
    await b.peers("line-check"); await a.peers("line-check");
    expect((await b.peers("line-check"))[0]).toMatchObject({ readiness: { downlinkBucket: "audio" }, quality: { source: "observed", goodputBps: 900_000, rttMs: 12, mtu: 900 } });
    await expect(a.probe("line-check", { id: "b" }, { budgetBytes: 512, reservationClass: "control", abortOnQueueGrowth: true })).resolves.toMatchObject({ source: "probed", confidence: "medium", samples: 1, mtu: 900 });
  });

  it("aborts a probe when the authenticated route queue grows", async () => {
    let listener: ((payload: Uint8Array) => void) | undefined;
    let queueDepthBytes = 0;
    const observatory = new PeerRouteLinkObservatory({
      list: () => [{ handle: { id: "peer" }, displayLabel: "Peer", dataPlane: "webrtc" as const, connectedAt: 1 }],
      route: () => ({ transport: {
        async send(payload: Uint8Array) { if (payload[4] === 2) { const echo = payload.slice(); echo[4] = 3; queueDepthBytes = 1; listener?.(echo); } },
        subscribe(next: (payload: Uint8Array) => void) { listener = next; return () => { listener = undefined; }; },
        quality: () => ({ goodputBps: 1_000_000, rttMs: 5, mtu: 1_200, queueDepthBytes })
      } })
    }, { now: () => 10 });
    await observatory.peers("app");
    await expect(observatory.probe("app", { id: "peer" }, { budgetBytes: 512, reservationClass: "control", abortOnQueueGrowth: true })).rejects.toMatchObject({ code: "LINK_PROBE_DENIED" });
  });
});
