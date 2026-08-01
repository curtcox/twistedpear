import { describe, expect, it, vi } from "vitest";
import { SimulatedMediaCodecDriver } from "@twistedpear/effects";
import { decodeDeviceStreamFrame, encodeDeviceStreamFrame } from "@twistedpear/protocol";
import {
  CodecStreamEgressFactory,
  InboundMediaRouter,
  PeerRouteStreamEgressFactory,
  PeerRouteMediaBridge,
  PlaneStreamEgressFactory,
  ReservedStreamEgressFactory,
  createCasDerivedPlaneOpener,
  createHostPlaneOpeners,
  createPearsBulkAppendPlaneOpener,
  createPeerRoutePlaneOpeners,
  type InboundMediaBackend,
  type StreamOffer
} from "../src/media-stream.js";

const offer: StreamOffer = {
  id: "offer-1",
  peer: "peer-ana",
  displayLabel: "Ana",
  classId: "camera",
  tierId: "frames",
  encoding: "480p15",
  plane: "webrtc",
  expiresAt: 2_000
};

describe("InboundMediaRouter", () => {
  it("keeps offers app-scoped and binds accepted media only to host sinks", async () => {
    const accept = vi.fn(async (_appId, accepted, sink) => ({
      handle: "inbound-1",
      offerId: accepted.id,
      sink
    }));
    const close = vi.fn(async () => {});
    const backend: InboundMediaBackend = {
      pollOffers: async () => ({ cursor: "next", offers: [offer] }),
      accept,
      decline: vi.fn(async () => {}),
      close
    };
    const router = new InboundMediaRouter(backend, () => 1_000);

    await router.pollOffers("app-a");
    await expect(router.accept("app-b", offer.id, { kind: "speaker" })).rejects.toThrow(
      "Unknown stream offer"
    );
    await expect(router.accept("app-a", offer.id, { kind: "remote-video", widgetId: "" })).rejects.toThrow(
      "widget id"
    );
    await expect(router.accept("app-a", offer.id, { kind: "remote-video", widgetId: "video-1" })).resolves.toMatchObject({
      handle: "inbound-1"
    });
    expect(accept).toHaveBeenCalledOnce();
    await router.closeApp("app-a");
    expect(close).toHaveBeenCalledOnce();
  });

  it("filters expired offers before exposing them", async () => {
    const backend: InboundMediaBackend = {
      pollOffers: async () => ({ cursor: "next", offers: [{ ...offer, expiresAt: 999 }] }),
      accept: vi.fn(),
      decline: vi.fn(),
      close: vi.fn()
    };
    const router = new InboundMediaRouter(backend, () => 1_000);
    await expect(router.pollOffers("app-a")).resolves.toEqual({ cursor: "next", offers: [] });
  });
});

describe("PlaneStreamEgressFactory", () => {
  it("carries an offer and timed frame between two authenticated host routes", async () => {
    const leftListeners = new Set<(payload: Uint8Array) => void>();
    const rightListeners = new Set<(payload: Uint8Array) => void>();
    const directory = (_own: string, remote: string, outbound: Set<(payload: Uint8Array) => void>, inbound: Set<(payload: Uint8Array) => void>) => ({
      list: (appId: string) => appId === "line-check" ? [{ handle: { id: remote }, displayLabel: remote }] : [],
      route: (appId: string, handle: { id: string }) => appId === "line-check" && handle.id === remote ? {
        dataPlane: "reticulum" as const,
        transport: {
          send: async (payload: Uint8Array) => { for (const listener of outbound) listener(payload.slice()); },
          subscribe: (listener: (payload: Uint8Array) => void) => { inbound.add(listener); return () => inbound.delete(listener); }
        }
      } : undefined
    });
    const received: Uint8Array[] = [];
    const left = new PeerRouteMediaBridge(directory("left", "right", rightListeners, leftListeners), { now: () => 1_000 });
    const right = new PeerRouteMediaBridge(directory("right", "left", leftListeners, rightListeners), { now: () => 1_000, onFrame: async (_appId, _stream, frame) => { received.push(frame); } });
    await right.pollOffers("line-check");
    const egress = await left.create({ appId: "line-check", peer: "right", demand: { classId: "microphone", tierId: "derived", encoding: "vad-transcript" }, admission: { kind: "accept", plane: "reticulum", rung: "vad-transcript", rungIndex: 3, demandBps: 1_024, admittedDemandBps: 1_024, supplyBps: 64_000, reason: "test" } });
    const offers = await right.pollOffers("line-check");
    expect(offers.offers).toHaveLength(1);
    await right.accept("line-check", offers.offers[0]!, { kind: "speaker" });
    const frame = encodeDeviceStreamFrame({ version: 2, sampleKind: 5, sessionToken: 7, sequence: 1, captureAtUs: 123, clockId: 4, payload: new TextEncoder().encode('{"voiceActive":true}') });
    await egress.send(frame);
    expect(received).toEqual([frame]);
    const large = encodeDeviceStreamFrame({ version: 2, sampleKind: 5, sessionToken: 7, sequence: 2, captureAtUs: 124, clockId: 4, payload: new Uint8Array(120_000) });
    await egress.send(large);
    expect(received[1]).toEqual(large);
    await egress.close();
  });

  it("sends only through an app-owned authenticated route matching the admitted plane", async () => {
    const send = vi.fn(async () => {});
    const factory = new PeerRouteStreamEgressFactory({
      route(appId, handle) {
        return appId === "app-a" && handle.id === "peer-ana"
          ? { dataPlane: "reticulum", transport: { send } }
          : undefined;
      }
    });
    const input = {
      appId: "app-a",
      peer: "peer-ana",
      demand: { classId: "microphone", tierId: "derived" },
      admission: { kind: "accept" as const, plane: "reticulum" as const, rung: "vad-transcript", rungIndex: 3, demandBps: 1_024, admittedDemandBps: 1_024, supplyBps: 64_000, reason: "test" }
    };
    const egress = await factory.create(input);
    await egress.send(new Uint8Array([1, 2]));
    expect(send).toHaveBeenCalledWith(new Uint8Array([1, 2]));
    await expect(factory.create({ ...input, appId: "other-app" })).rejects.toThrow("no media transport");
  });

  it("selects only the admitted host plane and forwards quality/backpressure", async () => {
    const send = vi.fn(async () => ({ queuedBytes: 4, droppedOldest: 1 }));
    const close = vi.fn(async () => {});
    const factory = new PlaneStreamEgressFactory({
      webrtc: async () => ({
        send,
        close,
        quality: () => ({
          goodputBps: 512_000,
          rttMs: 80,
          jitterMs: 5,
          lossRatio: 0.02,
          mtu: 1_200,
          source: "observed",
          samples: 4,
          confidence: "medium"
        })
      })
    });
    const egress = await factory.create({
      appId: "app-a",
      peer: "peer-ana",
      demand: { classId: "camera", tierId: "frames" },
      admission: {
        kind: "accept",
        plane: "webrtc",
        rung: "720p30",
        rungIndex: 0,
        demandBps: 2_000_000,
        admittedDemandBps: 2_000_000,
        supplyBps: 3_000_000,
        reason: "test"
      }
    });
    await expect(egress.send(new Uint8Array([1]))).resolves.toEqual({ queuedBytes: 4, droppedOldest: 1 });
    expect(egress.quality().goodputBps).toBe(512_000);
    await egress.close();
    expect(send).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("reserves realtime capacity at admission and releases it exactly once", async () => {
    const consume = vi.fn(async () => {});
    const release = vi.fn();
    const close = vi.fn(async () => {});
    const downstream = new PlaneStreamEgressFactory({
      reticulum: async () => ({
        send: async () => ({ queuedBytes: 0, droppedOldest: 0 }),
        close,
        quality: () => ({ goodputBps: 64_000, rttMs: 20, jitterMs: 2, lossRatio: 0, mtu: 500, source: "observed", samples: 3, confidence: "medium" })
      })
    });
    const factory = new ReservedStreamEgressFactory(downstream, {
      reserveRealtime: (bytesPerSecond) => {
        expect(bytesPerSecond).toBe(8_000);
        return { consume, release };
      }
    });
    const egress = await factory.create({
      appId: "app-a",
      peer: "peer-ana",
      demand: { classId: "microphone", tierId: "pcm" },
      admission: {
        kind: "accept",
        plane: "reticulum",
        rung: "16k-opus",
        rungIndex: 0,
        demandBps: 64_000,
        admittedDemandBps: 64_000,
        supplyBps: 80_000,
        reason: "test"
      }
    });
    await egress.send(new Uint8Array(32));
    await egress.close();
    await egress.close();
    expect(consume).toHaveBeenCalledWith(32);
    expect(close).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it("encodes TPD2 media at the admitted codec boundary before egress", async () => {
    const sent: Uint8Array[] = [];
    const downstream = new PlaneStreamEgressFactory({
      webrtc: async () => ({
        send: async (frame) => { sent.push(frame); return { queuedBytes: 0, droppedOldest: 0 }; },
        close: async () => {},
        quality: () => ({ goodputBps: 1_000_000, rttMs: 20, jitterMs: 2, lossRatio: 0, mtu: 1_200, source: "observed", samples: 4, confidence: "medium" })
      })
    });
    const factory = new CodecStreamEgressFactory(downstream, async () => new SimulatedMediaCodecDriver());
    const egress = await factory.create({
      appId: "app-a",
      peer: "peer-ana",
      demand: { classId: "microphone", tierId: "pcm", encoding: "16k-opus" },
      admission: { kind: "degrade", plane: "webrtc", rung: "16k-opus", rungIndex: 1, demandBps: 768_000, admittedDemandBps: 24_000, supplyBps: 1_000_000, reason: "test" }
    });
    await egress.send(encodeDeviceStreamFrame({ version: 2, sampleKind: 2, sessionToken: 1, sequence: 0, captureAtUs: 123, clockId: 7, payload: new Uint8Array([9]) }));
    expect(decodeDeviceStreamFrame(sent[0]!)).toMatchObject({ version: 2, captureAtUs: 123, clockId: 7, payload: new Uint8Array([9]) });
  });

  it("configures the codec from the adapted rung rather than the original encoding ceiling", async () => {
    const configurations: Array<{ codec: string; sampleRate?: number }> = [];
    const downstream = new PlaneStreamEgressFactory({ reticulum: async () => ({ send: async () => ({ queuedBytes: 0, droppedOldest: 0 }), close: async () => {}, quality: () => ({ goodputBps: 12_000, rttMs: 100, jitterMs: 2, lossRatio: 0, mtu: 500, source: "observed", samples: 2, confidence: "medium" }) }) });
    const factory = new CodecStreamEgressFactory(downstream, async (configuration) => { configurations.push(configuration); return new SimulatedMediaCodecDriver(); });
    const egress = await factory.create({ appId: "app", peer: "peer", demand: { classId: "microphone", tierId: "pcm", encoding: "48k-pcm" }, admission: { kind: "degrade", plane: "reticulum", rung: "8k-narrowband", rungIndex: 2, demandBps: 768_000, admittedDemandBps: 12_000, supplyBps: 12_000, reason: "collapse" } });
    expect(configurations).toEqual([expect.objectContaining({ codec: "opus", sampleRate: 8_000 })]);
    await egress.close();
  });
});

describe("host plane openers", () => {
  const admission = {
    kind: "accept" as const,
    plane: "webrtc" as const,
    rung: "720p30",
    rungIndex: 0,
    demandBps: 2_000_000,
    admittedDemandBps: 2_000_000,
    supplyBps: 3_000_000,
    reason: "test"
  };

  it("binds webrtc, pears-bulk, and reticulum through an authenticated peer-route factory", async () => {
    const send = vi.fn(async () => ({ queuedBytes: 0, droppedOldest: 0 }));
    const peerFactory = {
      create: vi.fn(async (input: { admission: { plane: string } }) => ({
        plane: input.admission.plane as "webrtc",
        send,
        quality: () => ({
          goodputBps: 512_000,
          rttMs: 40,
          jitterMs: 2,
          lossRatio: 0,
          mtu: 1_200,
          source: "observed" as const,
          samples: 2,
          confidence: "medium" as const
        }),
        close: async () => {}
      }))
    };
    const openers = createPeerRoutePlaneOpeners(peerFactory);
    const factory = new PlaneStreamEgressFactory(openers);
    const egress = await factory.create({
      appId: "line-check",
      peer: "peer-ana",
      demand: { classId: "camera", tierId: "frames" },
      admission
    });
    await egress.send(new Uint8Array([1, 2, 3]));
    expect(peerFactory.create).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(openers["pears-bulk"]).toBeTypeOf("function");
    expect(openers.reticulum).toBeTypeOf("function");
    await expect(
      factory.create({
        appId: "line-check",
        peer: "peer-ana",
        demand: { classId: "microphone", tierId: "derived" },
        admission: { ...admission, plane: "lxmf", rung: "vad-transcript", rungIndex: 3, demandBps: 1_024, admittedDemandBps: 1_024, supplyBps: 1_024 }
      })
    ).rejects.toThrow("No host media transport is configured for lxmf");
  });

  it("stores derived CAS snapshots and refuses live media", async () => {
    const put = vi.fn(async () => "t256-snapshot");
    const announce = vi.fn(async () => {});
    const factory = new PlaneStreamEgressFactory({
      cas: createCasDerivedPlaneOpener({ put, announce })
    });
    await expect(
      factory.create({
        appId: "line-check",
        peer: "peer-ana",
        demand: { classId: "camera", tierId: "frames" },
        admission: { ...admission, plane: "cas", rung: "720p30" }
      })
    ).rejects.toThrow("derived-tier or cas-snapshot");

    const egress = await factory.create({
      appId: "line-check",
      peer: "peer-ana",
      demand: { classId: "camera", tierId: "derived" },
      admission: { ...admission, plane: "cas", rung: "cas-snapshot", rungIndex: 4, demandBps: 1_024, admittedDemandBps: 1_024, supplyBps: 0 }
    });
    await egress.send(new Uint8Array([9, 9]));
    expect(put).toHaveBeenCalledWith(new Uint8Array([9, 9]));
    expect(announce).toHaveBeenCalledWith({ appId: "line-check", peer: "peer-ana", t256: "t256-snapshot" });
    expect(egress.quality().source).toBe("declared");
  });

  it("composes peer-route and CAS openers for the host plane table", () => {
    const openers = createHostPlaneOpeners({
      peerRouteFactory: {
        create: async () => ({
          plane: "reticulum",
          send: async () => ({ queuedBytes: 0, droppedOldest: 0 }),
          quality: () => ({
            goodputBps: 1,
            rttMs: 1,
            jitterMs: 0,
            lossRatio: 0,
            mtu: 1,
            source: "declared",
            samples: 0,
            confidence: "low"
          }),
          close: async () => {}
        })
      },
      cas: { put: async () => "t256" }
    });
    expect(Object.keys(openers).sort()).toEqual(["cas", "pears-bulk", "reticulum", "webrtc"]);
  });

  it("appends latency-tolerant frames on the pears-bulk Hyperdrive plane", async () => {
    const append = vi.fn(async ({ sequence }: { sequence: number }) => ({ path: `/media/${sequence}.tpd2` }));
    const factory = new PlaneStreamEgressFactory({
      "pears-bulk": createPearsBulkAppendPlaneOpener({ append })
    });
    await expect(
      factory.create({
        appId: "line-check",
        peer: "peer-ana",
        demand: { classId: "microphone", tierId: "pcm" },
        admission: {
          kind: "accept",
          plane: "pears-bulk",
          rung: "16k-opus",
          rungIndex: 1,
          demandBps: 24_000,
          admittedDemandBps: 24_000,
          supplyBps: 64_000,
          reason: "test"
        }
      })
    ).rejects.toThrow("derived or snapshot");

    const egress = await factory.create({
      appId: "line-check",
      peer: "peer-ana",
      demand: { classId: "camera", tierId: "derived" },
      admission: {
        kind: "degrade",
        plane: "pears-bulk",
        rung: "derived-events",
        rungIndex: 4,
        demandBps: 1_024,
        admittedDemandBps: 1_024,
        supplyBps: 64_000,
        reason: "test"
      }
    });
    await egress.send(new Uint8Array([1, 2]));
    expect(append).toHaveBeenCalledWith({
      appId: "line-check",
      peer: "peer-ana",
      frame: new Uint8Array([1, 2]),
      sequence: 0
    });
  });

  it("falls back from a peer-route pears-bulk miss to Hyperdrive append", async () => {
    const append = vi.fn(async () => ({ path: "/media/0.tpd2" }));
    const openers = createHostPlaneOpeners({
      peerRouteFactory: {
        create: async () => {
          throw new Error("no gateway route");
        }
      },
      pearsBulk: { append }
    });
    const factory = new PlaneStreamEgressFactory(openers);
    const egress = await factory.create({
      appId: "line-check",
      peer: "peer-ana",
      demand: { classId: "camera", tierId: "derived" },
      admission: {
        kind: "degrade",
        plane: "pears-bulk",
        rung: "derived-events",
        rungIndex: 4,
        demandBps: 1_024,
        admittedDemandBps: 1_024,
        supplyBps: 64_000,
        reason: "test"
      }
    });
    await egress.send(new Uint8Array([7]));
    expect(append).toHaveBeenCalledOnce();
  });
});
