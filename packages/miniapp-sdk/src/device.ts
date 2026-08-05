import { callHost, MiniappHostError } from "./rpc.js";
import type {
  InboundStream,
  ShareOffer,
  StreamOffer,
  StreamOfferBatch,
  StreamSink,
} from "@twistedpear/miniapp-runtime";

export type DeviceAvailability =
  | "available"
  | "permission-required"
  | "unsupported"
  | "busy"
  | "policy-disabled"
  | "offline";

export interface DeviceDescriptor {
  readonly class: string;
  readonly tiers: ReadonlyArray<string>;
  readonly availability: DeviceAvailability;
  readonly maxRateHz: number;
  readonly streamable: boolean;
  readonly remoteEligible: boolean;
}

export interface DeviceDiagnostic {
  readonly class: string;
  readonly availability: DeviceAvailability;
  readonly reason?: string;
  readonly holder?: string;
}

export interface DeviceOpenRequest {
  readonly class: string;
  readonly tier?: string;
  readonly purpose: string;
  readonly rateHz?: number;
  readonly options?: Readonly<Record<string, unknown>> & {
    readonly voiceDuplex?: boolean;
  };
  readonly maxDurationMs?: number;
}

export interface DeviceSession {
  readonly handle: string;
  readonly class: string;
  readonly tier: string;
  readonly expiresAt: number | null;
}

export type DeviceSample =
  | {
      readonly kind: "location";
      readonly tier: "coarse" | "precise";
      readonly at: number;
      readonly latitude: number;
      readonly longitude: number;
      readonly accuracyM: number;
      readonly altitudeM?: number;
      readonly speedMps?: number;
      readonly headingDeg?: number;
    }
  | {
      readonly kind: "ambient-light";
      readonly tier: "quantized";
      readonly at: number;
      readonly luxBucket: "dark" | "dim" | "indoor" | "bright" | "sunlit";
    }
  | {
      readonly kind: "camera";
      readonly tier: "derived";
      readonly at: number;
      readonly barcodes: ReadonlyArray<{
        readonly format: string;
        readonly value: string;
      }>;
      readonly motionDetected: boolean;
      readonly faceCount: number;
      readonly objectCount: number;
    }
  | {
      readonly kind: "microphone";
      readonly tier: "derived";
      readonly at: number;
      readonly level: number;
      readonly voiceActive: boolean;
      readonly tones: ReadonlyArray<string>;
    }
  | {
      readonly kind: "motion";
      readonly tier: "derived";
      readonly at: number;
      readonly orientation: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
        readonly w: number;
      };
      readonly events: ReadonlyArray<"step" | "shake" | "tilt">;
    };

export class DeviceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DeviceError";
  }
}

async function deviceCall<T>(
  method: string,
  payload?: unknown,
  capability?: string,
): Promise<T> {
  try {
    return (await callHost("device", method, payload, capability)) as T;
  } catch (error) {
    if (error instanceof MiniappHostError) {
      throw new DeviceError(error.code, error.message);
    }
    throw error;
  }
}

/** Discovery — no capability required; returns only what this host has. */
export async function inventory(): Promise<ReadonlyArray<DeviceDescriptor>> {
  return deviceCall("inventory");
}

export async function diagnostics(): Promise<ReadonlyArray<DeviceDiagnostic>> {
  return deviceCall("diagnostics");
}

/** Session lifecycle — capability + consent gates are enforced by the host. */
export async function open(request: DeviceOpenRequest): Promise<DeviceSession> {
  return deviceCall("open", request);
}

export async function close(session: DeviceSession | string): Promise<void> {
  const handle = typeof session === "string" ? session : session.handle;
  await deviceCall("close", { handle });
}

export async function read(
  session: DeviceSession | string,
): Promise<DeviceSample> {
  const handle = typeof session === "string" ? session : session.handle;
  return deviceCall("read", { handle });
}

export type DeviceCommand =
  | {
      readonly kind: "torch";
      readonly on: boolean;
      readonly strobeIntervalMs?: number;
    }
  | {
      readonly kind: "speaker";
      readonly assetId?: string;
      readonly volume?: number;
      readonly frequencyHz?: number;
    }
  | { readonly kind: "tts"; readonly text: string; readonly rate?: number }
  | {
      readonly kind: "haptics";
      readonly patternMs: ReadonlyArray<number>;
      readonly intensity?: number;
    }
  | { readonly kind: "nfc"; readonly action: "write"; readonly ndef: string }
  | {
      readonly kind: "nfc";
      readonly action: "apdu";
      readonly aid: string;
      readonly apdu: string;
    };

export async function write(
  session: DeviceSession | string,
  command: DeviceCommand,
): Promise<void> {
  const handle = typeof session === "string" ? session : session.handle;
  await deviceCall("write", { handle, command });
}

export interface DeviceStreamConstraints {
  /** Advisory ceilings only; the host's measured supply is authoritative. */
  readonly candidates?: ReadonlyArray<{
    readonly plane: "webrtc" | "pears-bulk" | "reticulum" | "lxmf" | "cas";
    readonly effectiveBps: number;
    readonly headroomBps: number;
    readonly measuredGoodputBps?: number;
    readonly queueDepthBytes?: number;
    readonly metered?: boolean;
    readonly lowBattery?: boolean;
  }>;
  readonly preferredPlane?:
    "webrtc" | "pears-bulk" | "reticulum" | "lxmf" | "cas";
  readonly encoding?: string;
  readonly codec?: "vp8" | "vp9" | "h264" | "opus" | "pcm" | "jpeg";
}

export interface DeviceStreamSession {
  readonly handle: string;
  readonly session: string;
  readonly peer: string;
  readonly admission: {
    readonly kind: "accept" | "degrade" | "defer" | "reject";
    readonly plane: string;
    readonly rung: string;
    readonly rungIndex: number;
    readonly demandBps: number;
    readonly admittedDemandBps: number;
    readonly supplyBps: number;
    readonly reason: string;
  };
}

export async function stream(
  session: DeviceSession | string,
  peer: string,
  constraints?: DeviceStreamConstraints,
): Promise<DeviceStreamSession> {
  const handle = typeof session === "string" ? session : session.handle;
  return deviceCall("stream", { handle, peer, constraints });
}

export async function closeStream(
  streamHandle: string | DeviceStreamSession,
): Promise<void> {
  const handle =
    typeof streamHandle === "string" ? streamHandle : streamHandle.handle;
  await deviceCall("closeStream", { handle });
}

/** Current app-owned streams, including live host adaptation rung changes. */
export async function streams(): Promise<ReadonlyArray<DeviceStreamSession>> {
  return deviceCall("streams", {}, "device:stream");
}

export async function shareOffers(): Promise<ReadonlyArray<ShareOffer>> {
  return deviceCall("shareOffers", {}, "device:share-policy:read");
}

/** Opens trusted host chrome; the app supplies only untrusted purpose text. */
export async function requestShareOffer(
  purpose: string,
): Promise<ShareOffer | null> {
  return deviceCall("requestShareOffer", { purpose }, "device:stream");
}

/** Requests revocation in host chrome; apps cannot mutate the store directly. */
export async function revokeShareOffer(id: string): Promise<boolean> {
  const result = await deviceCall<{ revoked: boolean }>(
    "revokeShareOffer",
    { id },
    "device:stream",
  );
  return result.revoked;
}

export type { ShareOffer };

export async function* incoming(): AsyncIterable<StreamOffer> {
  let cursor: string | undefined;
  while (true) {
    const batch = await deviceCall<StreamOfferBatch>(
      "incoming",
      { cursor },
      "device:stream",
    );
    cursor = batch.cursor;
    for (const offer of batch.offers) yield offer;
  }
}

export function accept(
  offer: StreamOffer | string,
  sink: StreamSink,
): Promise<InboundStream> {
  return deviceCall(
    "accept",
    { offerId: typeof offer === "string" ? offer : offer.id, sink },
    "device:stream",
  );
}

export async function decline(
  offer: StreamOffer | string,
  reason?: string,
): Promise<void> {
  await deviceCall(
    "decline",
    { offerId: typeof offer === "string" ? offer : offer.id, reason },
    "device:stream",
  );
}

export type { InboundStream, StreamOffer, StreamSink };
