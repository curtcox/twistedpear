import type {
  MediaCodecConfiguration,
  MediaCodecDriver,
} from "@twistedpear/effects";
import {
  decodeDeviceStreamFrame,
  encodeDeviceStreamFrame,
  type AdmissionDecision,
  type StreamDemand,
  type StreamPlane,
} from "@twistedpear/protocol";
import type {
  PlaneMediaTransport,
  PlaneMediaTransportOpener,
  RealtimeBandwidthReservationProvider,
  StreamEgress,
  StreamEgressFactory,
} from "./media-stream-types.js";
import type { CasDerivedPlaneOpenerOptions } from "./media-stream-types.js";

/** Adds an admission-time, release-on-close realtime reservation to any plane factory. */
export class ReservedStreamEgressFactory implements StreamEgressFactory {
  constructor(
    private readonly downstream: StreamEgressFactory,
    private readonly reservations: RealtimeBandwidthReservationProvider,
  ) {}

  async create(input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: AdmissionDecision;
  }): Promise<StreamEgress> {
    const reservation = this.reservations.reserveRealtime(
      Math.ceil(input.admission.admittedDemandBps / 8),
    );
    if (reservation === null)
      throw new Error("Realtime bandwidth reservation is unavailable.");
    let egress: StreamEgress;
    try {
      egress = await this.downstream.create(input);
    } catch (error) {
      reservation.release();
      throw error;
    }
    let closed = false;
    return {
      plane: egress.plane,
      quality: () => egress.quality(),
      send: async (frame) => {
        await reservation.consume(frame.byteLength);
        return egress.send(frame);
      },
      close: async () => {
        if (closed) return;
        closed = true;
        try {
          await egress.close();
        } finally {
          reservation.release();
        }
      },
    };
  }
}

export type MediaCodecDriverOpener = (
  configuration: MediaCodecConfiguration,
) => Promise<MediaCodecDriver>;

/** Encodes timed raw TPD2 media before it reaches a network-plane egress. */
export class CodecStreamEgressFactory implements StreamEgressFactory {
  constructor(
    private readonly downstream: StreamEgressFactory,
    private readonly openCodec: MediaCodecDriverOpener,
  ) {}

  async create(input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: AdmissionDecision;
  }): Promise<StreamEgress> {
    const configuration = codecConfiguration(input.demand, input.admission);
    const egress = await this.downstream.create(input);
    if (configuration === null) {
      if (requiresCodec(input.demand)) {
        await egress.close();
        throw new Error(
          "Raw realtime media requires an explicitly negotiated host codec.",
        );
      }
      return egress;
    }
    let codec: MediaCodecDriver;
    try {
      codec = await this.openCodec(configuration);
      if (!codec.supports(configuration))
        throw new Error(
          "Host codec does not support the admitted configuration.",
        );
    } catch (error) {
      await egress.close();
      throw error;
    }
    let closed = false;
    return {
      plane: egress.plane,
      quality: () => egress.quality(),
      send: async (bytes) => {
        const frame = decodeDeviceStreamFrame(bytes);
        if (frame.version !== 2)
          throw new Error("Realtime codec input requires TPD2 timing.");
        const encoded = await codec.encode(configuration, {
          captureAtUs: frame.captureAtUs,
          bytes: frame.payload,
        });
        return egress.send(
          encodeDeviceStreamFrame({
            ...frame,
            payload: encoded.bytes,
          }),
        );
      },
      close: async () => {
        if (closed) return;
        closed = true;
        await Promise.allSettled([codec.close(), egress.close()]);
      },
    };
  }
}

function codecConfiguration(
  demand: StreamDemand,
  admission: AdmissionDecision,
): MediaCodecConfiguration | null {
  const named = admission.rung;
  const codec =
    demand.codec ??
    (named.includes("opus") || named.includes("narrowband")
      ? "opus"
      : named.includes("pcm")
        ? "pcm"
        : named.includes("jpeg") ||
            named.includes("thumbnail") ||
            named === "cas-snapshot"
          ? "jpeg"
          : ["vp8", "vp9", "h264"].includes(named)
            ? (named as "vp8" | "vp9" | "h264")
            : null);
  if (codec === null) return null;
  const sampleKind =
    demand.classId === "microphone" || demand.classId === "speaker"
      ? "audio"
      : "video";
  return {
    codec,
    sampleKind,
    bitrateBps: admission.admittedDemandBps,
    ...(sampleKind === "audio"
      ? {
          sampleRate: named.includes("48k")
            ? 48_000
            : named.includes("8k")
              ? 8_000
              : 16_000,
          channels: 1,
        }
      : {}),
    ...(sampleKind === "audio" ? { voiceDuplex: true } : {}),
  };
}

function requiresCodec(demand: StreamDemand): boolean {
  return (
    ((demand.classId === "microphone" || demand.classId === "speaker") &&
      demand.tierId === "pcm") ||
    ((demand.classId === "camera" || demand.classId === "screen-capture") &&
      demand.tierId === "frames")
  );
}

/**
 * Binds admission decisions to host-owned WebRTC, Pears, Reticulum, LXMF, or
 * CAS openers. Missing planes fail closed instead of silently falling back.
 */
export class PlaneStreamEgressFactory implements StreamEgressFactory {
  constructor(
    private readonly openers: Partial<
      Record<StreamPlane, PlaneMediaTransportOpener>
    >,
  ) {}

  async create(input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: AdmissionDecision;
  }): Promise<StreamEgress> {
    const plane = input.admission.plane;
    const opener = this.openers[plane];
    if (opener === undefined)
      throw new Error(`No host media transport is configured for ${plane}.`);
    const transport = await opener(input);
    return {
      plane,
      send: (frame) => transport.send(frame),
      quality: () => transport.quality(),
      close: () => transport.close(),
    };
  }
}

const LIVE_PEER_ROUTE_PLANES = ["webrtc", "pears-bulk", "reticulum"] as const;

export function createPeerRoutePlaneOpeners(
  factory: StreamEgressFactory,
): Partial<Record<StreamPlane, PlaneMediaTransportOpener>> {
  const openers: Partial<Record<StreamPlane, PlaneMediaTransportOpener>> = {};
  for (const plane of LIVE_PEER_ROUTE_PLANES) {
    openers[plane] = async (input) => {
      if (input.admission.plane !== plane) {
        throw new Error(
          `The admitted ${input.admission.plane} plane is not bound to the ${plane} opener.`,
        );
      }
      const egress = await factory.create(input);
      return {
        send: (frame) => egress.send(frame),
        quality: () => egress.quality(),
        close: () => egress.close(),
      };
    };
  }
  return openers;
}

/**
 * Terminal ladder plane: derived/snapshot media only. Live audio and video
 * must never ride CAS — there is no live path by definition.
 */
export function createCasDerivedPlaneOpener(
  options: CasDerivedPlaneOpenerOptions,
): PlaneMediaTransportOpener {
  return (input) => {
    if (input.admission.plane !== "cas") {
      return Promise.reject(
        new Error("CAS plane opener was asked for a different admitted plane."),
      );
    }
    if (
      input.demand.tierId !== "derived" &&
      input.admission.rung !== "cas-snapshot"
    ) {
      return Promise.reject(
        new Error("CAS plane admits derived-tier or cas-snapshot media only."),
      );
    }
    let closed = false;
    let lastKey: string | null = null;
    return Promise.resolve({
      async send(frame) {
        if (closed) throw new Error("CAS media transport is closed.");
        if (frame.byteLength < 1 || frame.byteLength > 256 * 1024) {
          throw new Error("CAS media frame exceeds snapshot bounds.");
        }
        lastKey = await options.put(frame);
        await options.announce?.({
          appId: input.appId,
          peer: input.peer,
          t256: lastKey,
        });
        return { queuedBytes: 0, droppedOldest: 0 };
      },
      quality: () => ({
        goodputBps: 0,
        rttMs: 0,
        jitterMs: 0,
        lossRatio: 0,
        mtu: 0,
        source: "declared",
        samples: lastKey === null ? 0 : 1,
        confidence: "low",
      }),
      close() {
        closed = true;
        return Promise.resolve();
      },
    });
  };
}
