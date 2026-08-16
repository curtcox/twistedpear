import {
  deviceClassById,
  type AdmissionDecision,
  type CameraDerivedInput,
  type DeviceCommand,
  type DeviceConsentClass,
  type DeviceSessionState,
  type LinkSupply,
  type MicrophoneDerivedInput,
  type PreciseLocationFix,
  type RawCameraFrameInput,
  type RawMotionInput,
  type RawMotionSample,
  type RawPcmInput,
  type ShareOffer,
  type StreamPlane,
} from "@twistedpear/protocol";
import { assertCapabilityAllowed } from "../capabilities.js";
import {
  type ConfirmationEffects,
  type HostConfirmationChannel,
} from "../confirm.js";
import {
  DeviceStreamSidecar,
  type DeviceSidecarDelivery,
} from "../device-sidecar.js";
import type { StreamEgressFactory } from "../media-stream.js";
import {
  createHostBridgedDrivers,
  type DeviceHostBridge,
} from "../drivers/host-bridge.js";
export type DeviceAvailability =
  | "available"
  | "permission-required"
  | "unsupported"
  | "busy"
  | "policy-disabled"
  | "offline";

export type DeviceSessionHandle = string;

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
  readonly handle: DeviceSessionHandle;
  readonly class: string;
  readonly tier: string;
  readonly expiresAt: number | null;
}

export type DevicePeerHandle = string;
export type DeviceStreamHandle = string;

export interface DeviceStreamConstraints {
  /** App-authored upper bounds. They can reduce, never increase, host supply. */
  readonly candidates?: ReadonlyArray<LinkSupply>;
  readonly preferredPlane?: StreamPlane;
  /** Requested codec/profile; the host egress must support it and admission prices it. */
  readonly encoding?: string;
  readonly codec?: "vp8" | "vp9" | "h264" | "opus" | "pcm" | "jpeg";
}

export interface DeviceStreamOptions {
  readonly appId: string;
  readonly declared: ReadonlyArray<string>;
  readonly granted: ReadonlyArray<string>;
  readonly sessionHandle: DeviceSessionHandle;
  readonly peer: DevicePeerHandle;
  readonly constraints?: DeviceStreamConstraints | undefined;
}

export interface DeviceStreamSession {
  readonly handle: DeviceStreamHandle;
  readonly session: DeviceSessionHandle;
  readonly peer: DevicePeerHandle;
  readonly admission: AdmissionDecision;
}

export interface RemoteOpenRequest {
  readonly peerId: string;
  readonly class: string;
  readonly tier?: string;
  readonly purpose: string;
  readonly rateHz?: number;
  readonly maxDurationMs?: number;
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
    }
  | {
      readonly kind: "camera";
      readonly tier: "frames";
      readonly at: number;
      readonly width: number;
      readonly height: number;
      readonly format: "rgba8" | "yuv420" | "jpeg";
      readonly byteLength: number;
      readonly sidecar?: DeviceSidecarDelivery;
    }
  | {
      readonly kind: "microphone";
      readonly tier: "pcm";
      readonly at: number;
      readonly sampleRate: number;
      readonly channels: 1 | 2;
      readonly sampleCount: number;
      readonly sidecar?: DeviceSidecarDelivery;
    }
  | {
      readonly kind: "motion";
      readonly tier: "samples";
      readonly at: number;
      readonly accel: readonly [number, number, number];
      readonly gyro: readonly [number, number, number];
      readonly mag?: readonly [number, number, number];
      readonly sidecar?: DeviceSidecarDelivery;
    }
  | {
      readonly kind: "screen-capture";
      readonly tier: "frames";
      readonly at: number;
      readonly width: number;
      readonly height: number;
      readonly format: "rgba8" | "yuv420" | "jpeg";
      readonly byteLength: number;
      readonly sidecar?: DeviceSidecarDelivery;
    }
  | {
      readonly kind: "biometric";
      readonly tier: "assertion";
      readonly at: number;
      readonly passed: boolean;
    }
  | {
      readonly kind: "proximity";
      readonly tier: "near-far";
      readonly at: number;
      readonly near: boolean;
    }
  | {
      readonly kind: "barometer";
      readonly tier: "pressure";
      readonly at: number;
      readonly hPa: number;
    }
  | {
      readonly kind: "thermometer";
      readonly tier: "celsius";
      readonly at: number;
      readonly celsius: number;
    }
  | {
      readonly kind: "hygrometer";
      readonly tier: "humidity";
      readonly at: number;
      readonly relativeHumidity: number;
    }
  | {
      readonly kind: "thermal" | "battery";
      readonly tier: "coarse";
      readonly at: number;
      readonly bucket:
        "cold" | "nominal" | "warm" | "hot" | "critical" | "unknown";
    }
  | {
      readonly kind: "stt";
      readonly tier: "transcript";
      readonly at: number;
      readonly text: string;
      readonly isFinal: boolean;
      readonly confidence?: number;
    };

export interface DeviceActiveIndicator {
  readonly handle: DeviceSessionHandle;
  readonly appId: string;
  readonly class: string;
  readonly tier: string;
  readonly consentClass: DeviceConsentClass;
  readonly purpose: string;
  readonly destination: "local" | string;
}

export interface DeviceDriver {
  readonly classId: string;
  availability(): Promise<DeviceAvailability> | DeviceAvailability;
  /** Precise/raw reading before host-side derived processing. */
  sense?(options?: Readonly<Record<string, unknown>>): Promise<unknown>;
  /** Actuator write after safety validation. */
  actuate?(command: DeviceCommand): Promise<void>;
  /** Stop any ongoing actuator output (session end / suspend). */
  stop?(): Promise<void>;
}

export type { DeviceCommand };

export class DeviceError extends Error {
  constructor(
    readonly code:
      | "DEVICE_UNSUPPORTED"
      | "DEVICE_BUSY"
      | "DEVICE_DENIED"
      | "DEVICE_RATE_EXCEEDED"
      | "DEVICE_TIER_REQUIRED"
      | "DEVICE_BANDWIDTH_INSUFFICIENT"
      | "DEVICE_SESSION_EXPIRED"
      | "DEVICE_BAD_REQUEST"
      | "DEVICE_UNCONFIGURED",
    message: string,
  ) {
    super(message);
    this.name = "DeviceError";
  }
}

export interface DeviceManagerOptions {
  readonly drivers?: ReadonlyArray<DeviceDriver>;
  readonly confirmationChannel?: HostConfirmationChannel;
  readonly confirmationEffects?: ConfirmationEffects;
  readonly now?: () => number;
  readonly randomBytes?: (length: number) => Uint8Array;
  /** When set, named holders (e.g. relay interfaces) occupy the arbitration lock. */
  readonly externalHolders?: () => ReadonlyMap<string, string>;
  readonly policyDisabled?: ReadonlySet<string>;
  readonly sidecar?: DeviceStreamSidecar;
  /** Host-owned link measurements used for admission. */
  readonly linkSupply?: (
    appId: string,
    peer: DevicePeerHandle,
  ) => Promise<ReadonlyArray<LinkSupply>>;
  /** Host-owned binding for WebRTC, Pears, Reticulum, LXMF, or CAS egress. */
  readonly streamEgressFactory?: StreamEgressFactory;
  /** Max concurrent remote sessions host-wide (serving side). */
  readonly maxRemoteSessions?: number;
  /** Host chrome: notified when sessions/indicators/policy change. */
  readonly onChromeChange?: () => void;
  /** Host chrome authors every field except the app's untrusted purpose text. */
  readonly requestShareOffer?: (input: {
    readonly appId: string;
    readonly purpose: string;
  }) => Promise<null | {
    readonly targetKind: "peer" | "group";
    readonly targetId: string;
    readonly displayLabel: string;
    readonly classId: "camera" | "microphone" | "screen-capture";
    readonly tierId: string;
    readonly maxRung: string;
    readonly ttlMs: number;
  }>;
  readonly confirmShareOfferRevoke?: (offer: ShareOffer) => Promise<boolean>;
  /** Host-owned group membership resolver; apps never enumerate group members. */
  readonly shareOfferTargetsPeer?: (
    offer: ShareOffer,
    peer: DevicePeerHandle,
  ) => boolean;
}

/** Host-chrome view of a live device session (includes opaque handle for kill). */
export interface DeviceChromeSession {
  readonly handle: DeviceSessionHandle;
  readonly phase: DeviceSessionState["phase"];
  readonly classId: string;
  readonly tierId: string;
  readonly appId: string;
  readonly purpose: string;
  readonly consentClass: DeviceConsentClass;
  readonly openedAt: number;
  readonly expiresAt: number | null;
  readonly destination: "local" | string;
  readonly remotePeerId: string | null;
}

export interface LiveSession {
  readonly handle: DeviceSessionHandle;
  readonly state: DeviceSessionState;
  readonly rateHz: number;
  readonly purpose: string;
  readonly consentClass: DeviceConsentClass;
  readonly sidecarToken: number | null;
  /** Set when a remote peer acquired this session on the serving host. */
  readonly remotePeerId: string | null;
  readonly options: Readonly<Record<string, unknown>>;
  lastReadAt: number | null;
}

export const MAX_PURPOSE_LENGTH = 160;
export const SENSITIVE_DEFAULT_TTL_MS = 15 * 60_000;

const STREAM_CODECS: Readonly<Record<string, ReadonlyArray<string>>> = {
  "microphone:pcm": ["opus", "pcm"],
  "speaker:pcm": ["opus", "pcm"],
  "camera:frames": ["vp8", "vp9", "h264", "jpeg"],
  "screen-capture:frames": ["vp8", "vp9", "h264", "jpeg"],
};

export function applyAdvisoryCandidateCeilings(
  hostCandidates: ReadonlyArray<LinkSupply>,
  advisory: ReadonlyArray<LinkSupply> | undefined,
): ReadonlyArray<LinkSupply> {
  if (advisory === undefined) return hostCandidates;
  const capped: LinkSupply[] = [];
  for (const host of hostCandidates) {
    const ceiling = advisory.find(
      (candidate) => candidate.plane === host.plane,
    );
    if (ceiling === undefined) continue;
    const hostMeasured = host.measuredGoodputBps ?? host.effectiveBps;
    const advisoryMeasured = ceiling.measuredGoodputBps ?? ceiling.effectiveBps;
    capped.push({
      ...host,
      effectiveBps: Math.min(host.effectiveBps, ceiling.effectiveBps),
      headroomBps: Math.min(host.headroomBps, ceiling.headroomBps),
      measuredGoodputBps: Math.min(hostMeasured, advisoryMeasured),
      queueDepthBytes: Math.max(
        host.queueDepthBytes ?? 0,
        ceiling.queueDepthBytes ?? 0,
      ),
      metered: host.metered === true || ceiling.metered === true,
      lowBattery: host.lowBattery === true || ceiling.lowBattery === true,
    });
  }
  return capped;
}

export function codecMatchesTier(
  classId: string,
  tierId: string,
  codec: string,
): boolean {
  return STREAM_CODECS[`${classId}:${tierId}`]?.includes(codec) ?? false;
}

/** Elevated tier grants imply the default-tier capability for the same class. */
export function assertDeviceCapabilityAllowed(options: {
  readonly capability: string;
  readonly declared: ReadonlyArray<string>;
  readonly granted: ReadonlyArray<string>;
}): void {
  assertCapabilityAllowed({
    capability: options.capability,
    declared: expandDeviceCapabilities(options.declared),
    granted: expandDeviceCapabilities(options.granted),
  });
}

function expandDeviceCapabilities(
  capabilities: ReadonlyArray<string>,
): string[] {
  const expanded = new Set<string>(capabilities);
  for (const capability of capabilities) {
    if (!capability.startsWith("device:")) continue;
    const parts = capability.split(":");
    // device:<class>:<tier> also satisfies device:<class>
    if (parts.length === 3 && deviceClassById(parts[1] ?? "") !== undefined) {
      expanded.add(`device:${parts[1]}`);
    }
  }
  return [...expanded];
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function floatSamplesToBytes(
  samples: ReadonlyArray<number>,
): Uint8Array {
  const bytes = new Uint8Array(samples.length * 4);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i += 1) {
    view.setFloat32(i * 4, samples[i] ?? 0, true);
  }
  return bytes;
}

export function encodeDerivedEvent(sample: DeviceSample): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(sample));
}

/** Simulated drivers for Phase 1–2 end-to-end coverage without hardware. */
export function createSimulatedLocationDriver(
  fix: PreciseLocationFix = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracyM: 5,
  },
): DeviceDriver {
  return {
    classId: "location",
    availability: () => "available",
    sense: () => Promise.resolve(fix),
  };
}

export function createSimulatedAmbientLightDriver(lux = 320): DeviceDriver {
  return {
    classId: "ambient-light",
    availability: () => "available",
    sense: () => Promise.resolve(lux),
  };
}

export function createSimulatedCameraDriver(
  input: CameraDerivedInput = {
    barcodes: [{ format: "qr", value: "TPI1:example" }],
    motionDetected: false,
    faceCount: 0,
    objectCount: 1,
  },
): DeviceDriver {
  return {
    classId: "camera",
    availability: () => "available",
    sense: () => Promise.resolve(input),
  };
}

export function createSimulatedMicrophoneDriver(
  input: MicrophoneDerivedInput = { level: 0.2, tones: [] },
): DeviceDriver {
  return {
    classId: "microphone",
    availability: () => "available",
    sense: () => Promise.resolve(input),
  };
}

export function createSimulatedMotionDriver(
  sample: RawMotionSample = { accel: [0.1, 0.2, 1.0], gyro: [0, 0, 0] },
): DeviceDriver {
  return {
    classId: "motion",
    availability: () => "available",
    sense: () => Promise.resolve(sample),
  };
}

export interface SimulatedActuatorLog {
  commands: DeviceCommand[];
  stopped: number;
}

function createActuatorDriver(
  classId: string,
  log: SimulatedActuatorLog,
): DeviceDriver {
  return {
    classId,
    availability: () => "available",
    actuate: (command) => {
      log.commands.push(command);
      return Promise.resolve();
    },
    stop: () => {
      log.stopped += 1;
      return Promise.resolve();
    },
  };
}

export function createSimulatedTorchDriver(
  log: SimulatedActuatorLog = { commands: [], stopped: 0 },
): DeviceDriver {
  return createActuatorDriver("torch", log);
}

export function createSimulatedSpeakerDriver(
  log: SimulatedActuatorLog = { commands: [], stopped: 0 },
): DeviceDriver {
  return createActuatorDriver("speaker", log);
}

export function createSimulatedTtsDriver(
  log: SimulatedActuatorLog = { commands: [], stopped: 0 },
): DeviceDriver {
  return createActuatorDriver("tts", log);
}

export function createSimulatedHapticsDriver(
  log: SimulatedActuatorLog = { commands: [], stopped: 0 },
): DeviceDriver {
  return createActuatorDriver("haptics", log);
}

export function createSimulatedNfcDriver(
  log: SimulatedActuatorLog = { commands: [], stopped: 0 },
): DeviceDriver {
  return createActuatorDriver("nfc", log);
}

export function createSimulatedRawCameraDriver(
  input: RawCameraFrameInput = {
    width: 16,
    height: 16,
    format: "rgba8",
    bytes: new Uint8Array(16 * 16 * 4),
    deviceModel: "secret-phone",
    sensorCalibration: { fx: 1 },
  },
): DeviceDriver {
  return {
    classId: "camera",
    availability: () => "available",
    sense: () => Promise.resolve(input),
  };
}

export function createSimulatedRawMicrophoneDriver(
  input: RawPcmInput = {
    sampleRate: 16_000,
    channels: 1,
    samples: [0.1, -0.1, 0.2],
    deviceId: "mic-fingerprint",
  },
): DeviceDriver {
  return {
    classId: "microphone",
    availability: () => "available",
    sense: () => Promise.resolve(input),
  };
}

export function createSimulatedRawMotionDriver(
  input: RawMotionInput = {
    accel: [0.1234, 0.5678, 0.9012],
    gyro: [0.01, -0.02, 0.03],
    calibrationBias: { ax: 0.001 },
    deviceSerial: "imu-serial",
  },
): DeviceDriver {
  return {
    classId: "motion",
    availability: () => "available",
    sense: () => Promise.resolve(input),
  };
}

export function createSimulatedScreenCaptureDriver(
  input: RawCameraFrameInput = {
    width: 8,
    height: 8,
    format: "rgba8",
    bytes: new Uint8Array(8 * 8 * 4),
  },
): DeviceDriver {
  return {
    classId: "screen-capture",
    availability: () => "available",
    sense: () => Promise.resolve(input),
  };
}

export function createSimulatedBiometricDriver(passed = true): DeviceDriver {
  return {
    classId: "biometric",
    availability: () => "available",
    sense: () => Promise.resolve({ passed }),
  };
}

export function createSimulatedSttDriver(
  transcript: { text?: string; isFinal?: boolean; confidence?: number } = {
    text: "hello twistedpear",
    isFinal: true,
    confidence: 0.9,
  },
): DeviceDriver {
  return {
    classId: "stt",
    availability: () => "available",
    sense: () => Promise.resolve(transcript),
  };
}

export function createSimulatedScalarDriver(
  classId:
    | "proximity"
    | "barometer"
    | "thermometer"
    | "hygrometer"
    | "thermal"
    | "battery",
  reading: unknown,
): DeviceDriver {
  return {
    classId,
    availability: () => "available",
    sense: () => Promise.resolve(reading),
  };
}

/**
 * Full simulated driver set for host injection / CI. Real OS drivers replace these
 * per class when available; shipping hosts may pass this into `DeviceManager` so
 * the broker path is configured (inventory + capability-gated open/read/write).
 */
export function createSimulatedDeviceDrivers(): DeviceDriver[] {
  return [
    createSimulatedLocationDriver(),
    createSimulatedAmbientLightDriver(),
    createSimulatedCameraDriver(),
    createSimulatedMicrophoneDriver(),
    createSimulatedMotionDriver(),
    createSimulatedTorchDriver(),
    createSimulatedSpeakerDriver(),
    createSimulatedTtsDriver(),
    createSimulatedHapticsDriver(),
    createSimulatedNfcDriver(),
    createSimulatedScreenCaptureDriver(),
    createSimulatedBiometricDriver(),
    createSimulatedSttDriver(),
    createSimulatedScalarDriver("proximity", { near: false }),
    createSimulatedScalarDriver("barometer", { hPa: 1013.25 }),
    createSimulatedScalarDriver("thermometer", { celsius: 22 }),
    createSimulatedScalarDriver("hygrometer", { relativeHumidity: 45 }),
    createSimulatedScalarDriver("thermal", { bucket: "nominal" }),
    createSimulatedScalarDriver("battery", { bucket: "nominal" }),
  ];
}

/**
 * Simulated drivers for every class, with selected classes replaced by host-bridged
 * OS/browser drivers. Used by shipping hosts that can answer sense/actuate on chrome.
 */
export function createHybridDeviceDrivers(
  bridgedClassIds: ReadonlyArray<string>,
  bridge: DeviceHostBridge,
): ReadonlyArray<DeviceDriver> {
  const bridged = new Set(bridgedClassIds);
  return [
    ...createSimulatedDeviceDrivers().filter(
      (driver) => !bridged.has(driver.classId),
    ),
    ...createHostBridgedDrivers(bridgedClassIds, bridge),
  ];
}
