import { describe, expect, it, vi } from "vitest";
import { decodeDeviceStreamFrame } from "@twistedpear/protocol";
import {
  DeviceManager,
  InboundMediaRouter,
  createSimulatedRawMicrophoneDriver,
  type InboundMediaBackend,
  type StreamOffer,
} from "../src/index.js";

describe("two-host realtime media loopback", () => {
  it("routes timed PCM from an authorized sender to a receiver-owned speaker sink", async () => {
    let now = 1_000;
    const frames: Uint8Array[] = [];
    const closeEgress = vi.fn(async () => {});
    const sender = new DeviceManager({
      drivers: [createSimulatedRawMicrophoneDriver()],
      now: () => now,
      linkSupply: async () => [
        { plane: "webrtc", effectiveBps: 1_000_000, headroomBps: 1_000_000 },
      ],
      streamEgressFactory: {
        async create({ admission }) {
          return {
            plane: admission.plane,
            async send(frame: Uint8Array) {
              frames.push(frame.slice());
              return { queuedBytes: 0, droppedOldest: 0 };
            },
            quality: () => ({
              goodputBps: 1_000_000,
              rttMs: 20,
              jitterMs: 2,
              lossRatio: 0,
              mtu: 1_200,
              source: "observed" as const,
              samples: 8,
              confidence: "high" as const,
            }),
            close: closeEgress,
          };
        },
      },
      confirmShareOfferRevoke: async () => true,
    });
    const offer: StreamOffer = {
      id: "incoming-1",
      peer: { id: "peer-sender" },
      displayLabel: "Sender",
      classId: "microphone",
      tierId: "pcm",
      encoding: "16k-opus",
      plane: "webrtc",
      expiresAt: 60_000,
    };
    const accept = vi.fn(async (_appId, accepted, sink) => ({
      handle: "in-1",
      offerId: accepted.id,
      sink,
    }));
    const backend: InboundMediaBackend = {
      pollOffers: async () => ({ cursor: "1", offers: [offer] }),
      accept,
      decline: async () => {},
      close: async () => {},
    };
    const receiver = new InboundMediaRouter(backend, () => now);
    await receiver.pollOffers("receiver-app");
    await receiver.accept("receiver-app", offer.id, { kind: "speaker" });

    const session = await sender.open(
      "sender-app",
      "publisher",
      ["device:microphone:pcm"],
      ["device:microphone:pcm"],
      {
        class: "microphone",
        tier: "pcm",
        purpose: "loopback",
        options: { voiceDuplex: true },
      },
    );
    const share = sender.grantShareOffer({
      appId: "sender-app",
      targetKind: "peer",
      targetId: "peer-receiver",
      displayLabel: "Receiver",
      classId: "microphone",
      tierId: "pcm",
      maxRung: "16k-opus",
      ttlMs: 30_000,
    });
    await sender.stream(
      "sender-app",
      ["device:microphone:pcm", "device:stream"],
      ["device:microphone:pcm", "device:stream"],
      session.handle,
      "peer-receiver",
    );
    await sender.read("sender-app", session.handle);
    await vi.waitFor(() => expect(frames.length).toBeGreaterThan(0));
    const frame = decodeDeviceStreamFrame(frames[0]!);
    expect(frame).toMatchObject({
      version: 2,
      sampleKind: 2,
      captureAtUs: 1_000_000,
    });
    expect(accept).toHaveBeenCalledWith("receiver-app", offer, {
      kind: "speaker",
    });

    expect(await sender.requestShareOfferRevoke("sender-app", share.id)).toBe(
      true,
    );
    await vi.waitFor(() => expect(closeEgress).toHaveBeenCalledOnce());
    expect(sender.activeStreams()).toEqual([]);
  });
});
