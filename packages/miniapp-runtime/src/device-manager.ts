import {
  DEVICE_CLASS_REGISTRY,
  DEVICE_STREAM_KIND,
  ActuatorSafetyError,
  assertAidAllowed,
  adaptStreamAdmission,
  decideStreamAdmission,
  degradationLadderFor,
  defaultTierForClass,
  deriveCameraSample,
  deriveMicrophoneSample,
  deriveMotionSample,
  deviceCapabilityId,
  deviceClassById,
  initialDeviceSessionState,
  initialRemoteGrantStore,
  initialShareOfferStore,
  isDeviceSessionLive,
  isRemoteGrantLive,
  isShareOfferLive,
  quantizeAmbientLux,
  quantizeLocationCoarse,
  remoteGrantKey,
  sanitizeCameraFrame,
  sanitizeMotionSamples,
  sanitizePcmSample,
  stepDeviceSession,
  stepRemoteGrantStore,
  stepShareOfferStore,
  validateActuatorCommand,
  type AdmissionDecision,
  type CameraDerivedInput,
  type DeviceClassEntry,
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
  type RemoteDeviceGrant,
  type ShareOffer,
  type StreamDemand,
  type StreamPlane
} from "@twistedpear/protocol";
import { assertCapabilityAllowed, CapabilityError } from "./capabilities.js";
import {
  requestHostConfirmation,
  type ConfirmationEffects,
  type HostConfirmationChannel
} from "./confirm.js";
import { DeviceStreamSidecar, type DeviceSidecarDelivery } from "./device-sidecar.js";
import type { StreamEgress, StreamEgressFactory } from "./media-stream.js";
import {
  createHostBridgedDrivers,
  type DeviceHostBridge
} from "./drivers/host-bridge.js";

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
  readonly options?: Readonly<Record<string, unknown>> & { readonly voiceDuplex?: boolean };
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
      readonly barcodes: ReadonlyArray<{ readonly format: string; readonly value: string }>;
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
      readonly bucket: "cold" | "nominal" | "warm" | "hot" | "critical" | "unknown";
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
    message: string
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
  readonly linkSupply?: (appId: string, peer: DevicePeerHandle) => Promise<ReadonlyArray<LinkSupply>>;
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
  readonly shareOfferTargetsPeer?: (offer: ShareOffer, peer: DevicePeerHandle) => boolean;
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

interface LiveSession {
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

const MAX_PURPOSE_LENGTH = 160;
const SENSITIVE_DEFAULT_TTL_MS = 15 * 60_000;

export class DeviceManager {
  private readonly drivers = new Map<string, DeviceDriver>();
  private readonly sessions = new Map<DeviceSessionHandle, LiveSession>();
  private readonly streams = new Map<DeviceStreamHandle, DeviceStreamSession>();
  private readonly egresses = new Map<DeviceStreamHandle, StreamEgress>();
  private readonly streamShareOfferIds = new Map<DeviceStreamHandle, string>();
  private readonly streamAdaptation = new Map<DeviceStreamHandle, { appId: string; peer: string; demand: StreamDemand; deficitStreak: number; surplusStreak: number }>();
  private readonly locks = new Map<string, string>();
  private readonly sidecar: DeviceStreamSidecar;
  private readonly policyDisabled: Set<string>;
  private remoteEnabled = false;
  private remoteGrants = initialRemoteGrantStore();
  private shareOffers = initialShareOfferStore();
  private nextHandle = 0;
  private nextStreamHandle = 0;
  private readonly now: () => number;
  private readonly randomBytes: (length: number) => Uint8Array;
  private readonly maxRemoteSessions: number;

  constructor(private readonly options: DeviceManagerOptions = {}) {
    for (const driver of options.drivers ?? []) {
      this.drivers.set(driver.classId, driver);
    }
    this.sidecar = options.sidecar ?? new DeviceStreamSidecar();
    this.policyDisabled = new Set(options.policyDisabled ?? []);
    this.maxRemoteSessions = options.maxRemoteSessions ?? 2;
    this.now = options.now ?? (() => 0);
    this.randomBytes =
      options.randomBytes ??
      ((length) => {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i += 1) bytes[i] = (i * 17 + 3) & 0xff;
        return bytes;
      });
  }

  registerDriver(driver: DeviceDriver): void {
    this.drivers.set(driver.classId, driver);
  }

  inventory(): Promise<ReadonlyArray<DeviceDescriptor>> {
    return Promise.all(
      DEVICE_CLASS_REGISTRY.map(async (entry) => {
        const availability = await this.availabilityFor(entry.id);
        return {
          class: entry.id,
          tiers: entry.tiers.map((tier) => tier.id),
          availability,
          maxRateHz: entry.defaults.maxRateHz,
          streamable: entry.streamable,
          remoteEligible: entry.remoteEligible
        } satisfies DeviceDescriptor;
      })
    );
  }

  async diagnostics(): Promise<ReadonlyArray<DeviceDiagnostic>> {
    return Promise.all(
      DEVICE_CLASS_REGISTRY.map(async (entry) => {
        const availability = await this.availabilityFor(entry.id);
        const holder = this.locks.get(entry.id);
        return {
          class: entry.id,
          availability,
          ...(holder !== undefined ? { holder, reason: `held by ${holder}` } : {}),
          ...(availability === "unsupported" ? { reason: "no driver on this host" } : {}),
          ...(availability === "policy-disabled" ? { reason: "disabled by host policy" } : {})
        } satisfies DeviceDiagnostic;
      })
    );
  }

  async open(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    request: DeviceOpenRequest
  ): Promise<DeviceSession> {
    this.validatePurpose(request.purpose);
    const entry = deviceClassById(request.class);
    if (entry === undefined) {
      throw new DeviceError("DEVICE_UNSUPPORTED", `Unknown device class "${request.class}".`);
    }

    const tier = this.resolveTier(entry, request.tier);
    if (request.options?.voiceDuplex !== undefined && typeof request.options.voiceDuplex !== "boolean") {
      throw new DeviceError("DEVICE_BAD_REQUEST", "voiceDuplex must be a boolean.");
    }
    if (request.options?.voiceDuplex === true && entry.id !== "microphone" && entry.id !== "speaker") {
      throw new DeviceError("DEVICE_BAD_REQUEST", "voiceDuplex is only valid for microphone or speaker sessions.");
    }
    const capability = deviceCapabilityId(entry.id, tier.id);
    try {
      assertDeviceCapabilityAllowed({ capability, declared, granted });
    } catch (error) {
      if (error instanceof CapabilityError) {
        throw new DeviceError("DEVICE_DENIED", error.message);
      }
      throw error;
    }

    const availability = await this.availabilityFor(entry.id);
    if (availability === "unsupported") {
      throw new DeviceError("DEVICE_UNSUPPORTED", `Device class "${entry.id}" is unsupported on this host.`);
    }
    if (availability === "policy-disabled") {
      throw new DeviceError("DEVICE_DENIED", `Device class "${entry.id}" is disabled by host policy.`);
    }
    if (availability === "permission-required") {
      throw new DeviceError("DEVICE_DENIED", `Device class "${entry.id}" requires host permission.`);
    }
    if (availability === "offline") {
      throw new DeviceError("DEVICE_UNSUPPORTED", `Device class "${entry.id}" is offline.`);
    }
    if (availability === "busy") {
      const holder = this.locks.get(entry.id) ?? this.options.externalHolders?.().get(entry.id) ?? "unknown";
      throw new DeviceError("DEVICE_BUSY", `Device class "${entry.id}" is busy (held by ${holder}).`);
    }

    const rateHz = request.rateHz ?? Math.min(1, entry.defaults.maxRateHz);
    if (!Number.isFinite(rateHz) || rateHz <= 0 || rateHz > entry.defaults.maxRateHz) {
      throw new DeviceError(
        "DEVICE_RATE_EXCEEDED",
        `Requested rate ${rateHz} Hz exceeds max ${entry.defaults.maxRateHz} Hz for ${entry.id}.`
      );
    }

    const consentClass = tier.consentClass;
    await this.maybeConfirmSession({
      appId,
      publisherPublicKey,
      entry,
      tierId: tier.id,
      consentClass,
      purpose: request.purpose
    });

    const at = this.now();
    const ttlMs = Math.min(
      request.maxDurationMs ?? entry.defaults.maxSessionMs,
      entry.defaults.maxSessionMs,
      consentClass === "sensitive" ? SENSITIVE_DEFAULT_TTL_MS : entry.defaults.maxSessionMs
    );
    const holder = `app:${appId}`;
    this.locks.set(entry.id, holder);

    let state = initialDeviceSessionState({
      classId: entry.id,
      tierId: tier.id,
      appId,
      holder,
      openedAt: at
    });
    state = stepDeviceSession(state, { kind: "device/open", at, ttlMs }).state;
    const handle = `dev-${this.nextHandle++}-${bytesToHex(this.randomBytes(4))}`;
    const needsSidecar = ["camera", "microphone", "motion", "screen-capture"].includes(entry.id);
    const sidecarToken = needsSidecar ? this.sidecar.open(handle) : null;
    this.sessions.set(handle, {
      handle,
      state,
      rateHz,
      purpose: request.purpose,
      consentClass,
      sidecarToken,
      remotePeerId: null,
      options: { ...(request.options ?? {}), tier: tier.id },
      lastReadAt: null
    });
    this.notifyChrome();

    return {
      handle,
      class: entry.id,
      tier: tier.id,
      expiresAt: state.expiresAt
    };
  }

  async close(appId: string, handle: DeviceSessionHandle): Promise<void> {
    const session = this.requireLiveSession(appId, handle);
    await this.stopDriver(session.state.classId);
    this.sidecar.close(handle);
    const at = this.now();
    const next = stepDeviceSession(session.state, { kind: "device/close", at }).state;
    this.sessions.set(handle, { ...session, state: next });
    if (this.locks.get(session.state.classId) === session.state.holder) {
      this.locks.delete(session.state.classId);
    }
    for (const [streamHandle, stream] of this.streams) {
      if (stream.session !== handle) continue;
      this.streams.delete(streamHandle);
      this.streamShareOfferIds.delete(streamHandle);
      this.streamAdaptation.delete(streamHandle);
      const egress = this.egresses.get(streamHandle);
      this.egresses.delete(streamHandle);
      await egress?.close();
    }
    this.notifyChrome();
  }

  closeApp(appId: string): void {
    let changed = false;
    for (const [handle, stream] of this.streams) {
      const session = this.sessions.get(stream.session);
      if (session?.state.appId === appId) {
        this.streams.delete(handle);
        this.streamShareOfferIds.delete(handle);
        this.streamAdaptation.delete(handle);
        const egress = this.egresses.get(handle);
        this.egresses.delete(handle);
        void egress?.close();
        changed = true;
      }
    }
    for (const [handle, session] of this.sessions) {
      if (session.state.appId !== appId || !isDeviceSessionLive(session.state.phase)) continue;
      void this.stopDriver(session.state.classId);
      this.sidecar.close(handle);
      const at = this.now();
      const next = stepDeviceSession(session.state, { kind: "device/close", at }).state;
      this.sessions.set(handle, { ...session, state: next });
      if (this.locks.get(session.state.classId) === session.state.holder) {
        this.locks.delete(session.state.classId);
      }
      changed = true;
    }
    if (changed) this.notifyChrome();
  }

  async read(appId: string, handle: DeviceSessionHandle): Promise<DeviceSample> {
    const session = this.requireLiveSession(appId, handle);
    this.enforceTtl(session);
    const live = this.sessions.get(handle);
    if (live === undefined || !isDeviceSessionLive(live.state.phase)) {
      throw new DeviceError("DEVICE_SESSION_EXPIRED", "Device session is no longer active.");
    }

    const minIntervalMs = 1000 / live.rateHz;
    const at = this.now();
    if (live.lastReadAt !== null && at - live.lastReadAt < minIntervalMs - 1) {
      throw new DeviceError("DEVICE_RATE_EXCEEDED", `Device read rate exceeded (${live.rateHz} Hz).`);
    }

    const driver = this.drivers.get(live.state.classId);
    if (driver?.sense === undefined) {
      throw new DeviceError("DEVICE_UNSUPPORTED", `No sense driver for ${live.state.classId}.`);
    }

    const raw = await driver.sense(live.options);
    const sample = this.materializeSample(live, at, raw);
    live.lastReadAt = at;
    return sample;
  }

  async write(
    appId: string,
    publisherPublicKey: string,
    handle: DeviceSessionHandle,
    command: DeviceCommand
  ): Promise<void> {
    const session = this.requireLiveSession(appId, handle);
    this.enforceTtl(session);
    const live = this.sessions.get(handle);
    if (live === undefined || !isDeviceSessionLive(live.state.phase)) {
      throw new DeviceError("DEVICE_SESSION_EXPIRED", "Device session is no longer active.");
    }

    this.assertCommandMatchesSession(live.state.classId, command);

    let normalized: DeviceCommand;
    try {
      normalized = validateActuatorCommand(command).normalized;
    } catch (error) {
      if (error instanceof ActuatorSafetyError) {
        throw new DeviceError("DEVICE_BAD_REQUEST", error.message);
      }
      throw error;
    }

    if (normalized.kind === "nfc" && normalized.action === "write") {
      await this.confirmNfcWrite({
        appId,
        publisherPublicKey,
        purpose: live.purpose,
        ndef: normalized.ndef
      });
    }
    if (normalized.kind === "nfc" && normalized.action === "apdu") {
      if (live.state.tierId !== "apdu") {
        throw new DeviceError("DEVICE_TIER_REQUIRED", "APDU exchange requires an nfc:apdu session.");
      }
      await this.confirmNfcWrite({
        appId,
        publisherPublicKey,
        purpose: live.purpose,
        ndef: `APDU aid=${normalized.aid}`
      });
    }

    const minIntervalMs = 1000 / live.rateHz;
    const at = this.now();
    if (live.lastReadAt !== null && at - live.lastReadAt < minIntervalMs - 1) {
      throw new DeviceError("DEVICE_RATE_EXCEEDED", `Device write rate exceeded (${live.rateHz} Hz).`);
    }

    const driver = this.drivers.get(live.state.classId);
    if (driver?.actuate === undefined) {
      throw new DeviceError("DEVICE_UNSUPPORTED", `No actuate driver for ${live.state.classId}.`);
    }
    await driver.actuate(normalized);
    live.lastReadAt = at;
  }

  async stream(
    appId: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    sessionHandle: DeviceSessionHandle,
    peer: DevicePeerHandle,
    constraints: DeviceStreamConstraints = {}
  ): Promise<DeviceStreamSession> {
    try {
      assertDeviceCapabilityAllowed({
        capability: "device:stream",
        declared,
        granted
      });
    } catch (error) {
      if (error instanceof CapabilityError) {
        throw new DeviceError("DEVICE_DENIED", error.message);
      }
      throw error;
    }

    if (typeof peer !== "string" || peer.length < 1 || peer.length > 128) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "A peer handle is required to stream.");
    }

    const live = this.requireLiveSession(appId, sessionHandle);
    if (live.remotePeerId !== null && live.remotePeerId !== peer) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Remote-acquired devices cannot be re-served to a third peer."
      );
    }
    const entry = deviceClassById(live.state.classId);
    if (entry === undefined || !entry.streamable) {
      throw new DeviceError("DEVICE_UNSUPPORTED", `Device class "${live.state.classId}" is not streamable.`);
    }
    const shareOffer = [...this.shareOffers.values()].find((offer) =>
      offer.appId === appId &&
      ((offer.targetKind === "peer" && offer.targetId === peer) ||
        (offer.targetKind === "group" && this.options.shareOfferTargetsPeer?.(offer, peer) === true)) &&
      offer.classId === live.state.classId &&
      offer.tierId === live.state.tierId &&
      isShareOfferLive(offer, this.now())
    );
    if (shareOffer === undefined) {
      throw new DeviceError("DEVICE_DENIED", "Host share policy does not permit this stream.");
    }

    if (this.options.linkSupply === undefined) {
      throw new DeviceError("DEVICE_UNCONFIGURED", "No host-owned link measurement is configured for streaming.");
    }
    const hostCandidates = await this.options.linkSupply(appId, peer);
    const preferred = constraints.preferredPlane === undefined
      ? hostCandidates
      : hostCandidates.filter((candidate) => candidate.plane === constraints.preferredPlane);
    const candidates = applyAdvisoryCandidateCeilings(preferred, constraints.candidates);

    const bandwidthProfile = entry.bandwidth[live.state.tierId];
    if (constraints.encoding !== undefined && bandwidthProfile?.encodings?.[constraints.encoding] === undefined) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "Requested media encoding profile is unsupported.");
    }
    if (constraints.codec !== undefined && !codecMatchesTier(live.state.classId, live.state.tierId, constraints.codec)) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "Requested media codec is unsupported for this device tier.");
    }

    const demand = {
      classId: live.state.classId,
      tierId: live.state.tierId,
      rateHz: live.rateHz,
      ...(constraints.encoding === undefined ? {} : { encoding: constraints.encoding }),
      ...(constraints.codec === undefined ? {} : { codec: constraints.codec })
    };
    let admission = decideStreamAdmission(demand, candidates);

    if (admission.kind === "reject") {
      throw new DeviceError("DEVICE_BANDWIDTH_INSUFFICIENT", admission.reason);
    }
    const ladder = degradationLadderFor(live.state.classId);
    const maximumRungIndex = ladder.indexOf(shareOffer.maxRung);
    if (maximumRungIndex < 0) {
      throw new DeviceError("DEVICE_DENIED", "Host share policy contains an invalid quality ceiling.");
    }
    if (admission.rungIndex < maximumRungIndex) {
      const rungDelta = maximumRungIndex - admission.rungIndex;
      admission = {
        ...admission,
        kind: "degrade",
        rung: ladder[maximumRungIndex] ?? shareOffer.maxRung,
        rungIndex: maximumRungIndex,
        admittedDemandBps: admission.admittedDemandBps / 2 ** rungDelta,
        reason: `limited by host share policy to ${shareOffer.maxRung}`
      };
    }
    if (this.options.streamEgressFactory === undefined) {
      throw new DeviceError("DEVICE_UNCONFIGURED", "No host media egress is configured for this plane.");
    }

    const handle = `stream-${this.nextStreamHandle++}-${bytesToHex(this.randomBytes(3))}`;
    const stream: DeviceStreamSession = {
      handle,
      session: sessionHandle,
      peer,
      admission
    };
    let egress: StreamEgress;
    try {
      egress = await this.options.streamEgressFactory.create({
        appId,
        peer,
        demand,
        admission
      });
    } catch (error) {
      throw new DeviceError(
        "DEVICE_UNCONFIGURED",
        error instanceof Error ? error.message : "Host media egress could not be opened."
      );
    }
    if (egress.plane !== admission.plane) {
      await egress.close();
      throw new DeviceError("DEVICE_UNCONFIGURED", "Host media egress returned the wrong plane.");
    }
    this.streams.set(handle, stream);
    this.egresses.set(handle, egress);
    this.streamShareOfferIds.set(handle, shareOffer.id);
    this.streamAdaptation.set(handle, { appId, peer, demand, deficitStreak: 0, surplusStreak: 0 });
    return stream;
  }

  async closeStream(appId: string, streamHandle: DeviceStreamHandle): Promise<void> {
    const stream = this.streams.get(streamHandle);
    if (stream === undefined) {
      throw new DeviceError("DEVICE_SESSION_EXPIRED", `Unknown stream "${streamHandle}".`);
    }
    const session = this.sessions.get(stream.session);
    if (session !== undefined && session.state.appId !== appId) {
      throw new DeviceError("DEVICE_DENIED", "Stream is not scoped to this app.");
    }
    this.streams.delete(streamHandle);
    this.streamShareOfferIds.delete(streamHandle);
    this.streamAdaptation.delete(streamHandle);
    const egress = this.egresses.get(streamHandle);
    this.egresses.delete(streamHandle);
    await egress?.close();
  }

  activeStreams(): ReadonlyArray<DeviceStreamSession> {
    return [...this.streams.values()];
  }

  activeStreamsForApp(appId: string): ReadonlyArray<DeviceStreamSession> {
    return [...this.streams.values()].filter((stream) => this.sessions.get(stream.session)?.state.appId === appId);
  }

  /** Host chrome: remote acquisition is off until the user enables it. */
  setRemoteAcquisitionEnabled(enabled: boolean): void {
    this.remoteEnabled = enabled;
    if (!enabled) {
      this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
        kind: "remote/clear-all",
        at: this.now()
      });
      for (const [handle, session] of this.sessions) {
        if (session.remotePeerId === null || !isDeviceSessionLive(session.state.phase)) continue;
        void this.stopDriver(session.state.classId);
        this.sidecar.close(handle);
        const at = this.now();
        const next = stepDeviceSession(session.state, { kind: "device/revoke", at }).state;
        this.sessions.set(handle, { ...session, state: next });
        if (this.locks.get(session.state.classId) === session.state.holder) {
          this.locks.delete(session.state.classId);
        }
      }
    }
    this.notifyChrome();
  }

  isRemoteAcquisitionEnabled(): boolean {
    return this.remoteEnabled;
  }

  /** Host chrome: per-peer, per-class, per-tier grant. Does not survive restart. */
  grantRemotePeer(options: {
    readonly peerId: string;
    readonly classId: string;
    readonly tierId: string;
    readonly ttlMs: number;
    readonly maxConcurrent?: number;
    readonly maxSessionMs?: number;
  }): RemoteDeviceGrant {
    if (!this.remoteEnabled) {
      throw new DeviceError("DEVICE_DENIED", "Remote device acquisition is disabled on this host.");
    }
    const entry = deviceClassById(options.classId);
    if (entry === undefined || !entry.remoteEligible) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${options.classId}" is not remote-eligible.`
      );
    }
    if (entry.tiers.every((tier) => tier.id !== options.tierId)) {
      throw new DeviceError("DEVICE_TIER_REQUIRED", `Unknown tier "${options.tierId}".`);
    }
    this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
      kind: "remote/grant",
      at: this.now(),
      peerId: options.peerId,
      classId: options.classId,
      tierId: options.tierId,
      ttlMs: options.ttlMs,
      ...(options.maxConcurrent !== undefined ? { maxConcurrent: options.maxConcurrent } : {}),
      ...(options.maxSessionMs !== undefined ? { maxSessionMs: options.maxSessionMs } : {})
    });
    const grant = this.remoteGrants.get(
      remoteGrantKey(options.peerId, options.classId, options.tierId)
    );
    if (grant === undefined) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "Failed to record remote grant.");
    }
    return grant;
  }

  revokeRemotePeer(peerId: string, classId: string, tierId: string): void {
    this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
      kind: "remote/revoke",
      at: this.now(),
      peerId,
      classId,
      tierId
    });
    for (const [handle, session] of this.sessions) {
      if (
        session.remotePeerId !== peerId ||
        session.state.classId !== classId ||
        session.state.tierId !== tierId ||
        !isDeviceSessionLive(session.state.phase)
      ) {
        continue;
      }
      void this.stopDriver(session.state.classId);
      this.sidecar.close(handle);
      const at = this.now();
      const next = stepDeviceSession(session.state, { kind: "device/revoke", at }).state;
      this.sessions.set(handle, { ...session, state: next });
      if (this.locks.get(session.state.classId) === session.state.holder) {
        this.locks.delete(session.state.classId);
      }
    }
  }

  /** Simulate host restart — remote grants never survive. */
  clearRemoteGrantsForRestart(): void {
    this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
      kind: "remote/clear-all",
      at: this.now()
    });
  }

  listRemoteGrants(): ReadonlyArray<RemoteDeviceGrant> {
    const at = this.now();
    return [...this.remoteGrants.values()].filter((grant) => isRemoteGrantLive(grant, at));
  }

  /** Host chrome only: author an outbound share offer. */
  grantShareOffer(options: {
    readonly appId: string;
    readonly targetKind: "peer" | "group";
    readonly targetId: string;
    readonly displayLabel: string;
    readonly classId: "camera" | "microphone" | "screen-capture";
    readonly tierId: string;
    readonly maxRung: string;
    readonly ttlMs: number;
  }): ShareOffer {
    if (options.ttlMs <= 0 || options.ttlMs > 24 * 60 * 60_000) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "Share offer TTL must be between 1 ms and 24 hours.");
    }
    const entry = deviceClassById(options.classId);
    if (entry === undefined || !entry.tiers.some((tier) => tier.id === options.tierId)) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "Share offer class/tier is invalid.");
    }
    if (!entry.degradationLadder.includes(options.maxRung)) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "Share offer quality ceiling is invalid.");
    }
    const grantedAt = this.now();
    const id = `share-${this.nextStreamHandle++}-${bytesToHex(this.randomBytes(3))}`;
    const { ttlMs, ...authored } = options;
    this.shareOffers = stepShareOfferStore(this.shareOffers, {
      kind: "share/grant",
      offer: { id, grantedAt, ...authored },
      ttlMs
    });
    const offer = this.shareOffers.get(id);
    if (offer === undefined) throw new DeviceError("DEVICE_BAD_REQUEST", "Share offer was not created.");
    this.notifyChrome();
    return offer;
  }

  async requestShareOfferFromChrome(appId: string, purpose: string): Promise<ShareOffer | null> {
    this.validatePurpose(purpose);
    const authored = await this.options.requestShareOffer?.({ appId, purpose }) ?? null;
    return authored === null ? null : this.grantShareOffer({ appId, ...authored });
  }

  /** Expire due offers, then return every live share (host chrome indicator). */
  listLiveShareOffers(): ReadonlyArray<ShareOffer> {
    const at = this.now();
    for (const offer of this.shareOffers.values()) {
      if (offer.phase === "active" && at >= offer.expiresAt) {
        this.shareOffers = stepShareOfferStore(this.shareOffers, { kind: "share/ttl", id: offer.id, at });
        this.closeStreamsForShareOffer(offer.id);
      }
    }
    return [...this.shareOffers.values()].filter((offer) => isShareOfferLive(offer, at));
  }

  listShareOffers(appId: string): ReadonlyArray<ShareOffer> {
    return this.listLiveShareOffers().filter((offer) => offer.appId === appId);
  }

  async requestShareOfferRevoke(appId: string, id: string): Promise<boolean> {
    const offer = this.shareOffers.get(id);
    if (offer === undefined || offer.appId !== appId || !isShareOfferLive(offer, this.now())) return false;
    const approved = await this.options.confirmShareOfferRevoke?.(offer) ?? false;
    if (!approved) return false;
    this.shareOffers = stepShareOfferStore(this.shareOffers, { kind: "share/revoke", id, at: this.now() });
    this.closeStreamsForShareOffer(id);
    this.notifyChrome();
    return true;
  }

  /** Trusted host chrome kill switch; the click itself is the authorization. */
  revokeShareOfferFromChrome(appId: string, id: string): boolean {
    const offer = this.shareOffers.get(id);
    if (offer === undefined || offer.appId !== appId || !isShareOfferLive(offer, this.now())) return false;
    this.shareOffers = stepShareOfferStore(this.shareOffers, { kind: "share/revoke", id, at: this.now() });
    this.closeStreamsForShareOffer(id);
    this.notifyChrome();
    return true;
  }

  clearShareOffersForRestart(): void {
    for (const id of this.streamShareOfferIds.values()) this.closeStreamsForShareOffer(id);
    this.shareOffers = stepShareOfferStore(this.shareOffers, { kind: "share/clear-sensitive", at: this.now() });
    this.notifyChrome();
  }

  /**
   * Serving host: open a device for a remote peer under a host-owned grant.
   * Requesting-side `device:remote` is checked separately by the requester's host.
   */
  async openForRemotePeer(
    request: RemoteOpenRequest,
    publisherPublicKey = "remote-host"
  ): Promise<DeviceSession> {
    if (!this.remoteEnabled) {
      throw new DeviceError("DEVICE_DENIED", "Remote device acquisition is disabled on this host.");
    }
    this.validatePurpose(request.purpose);
    if (typeof request.peerId !== "string" || request.peerId.length < 1) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "Remote peer id is required.");
    }

    const entry = deviceClassById(request.class);
    if (entry === undefined || !entry.remoteEligible) {
      throw new DeviceError("DEVICE_UNSUPPORTED", `Device class "${request.class}" is not remote-eligible.`);
    }
    const tier = this.resolveTier(entry, request.tier);
    const at = this.now();
    this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
      kind: "remote/ttl",
      at,
      peerId: request.peerId,
      classId: entry.id,
      tierId: tier.id
    });
    const grant = this.remoteGrants.get(remoteGrantKey(request.peerId, entry.id, tier.id));
    if (!isRemoteGrantLive(grant, at)) {
      throw new DeviceError("DEVICE_DENIED", "No live remote grant for this peer/class/tier.");
    }

    const remoteLive = [...this.sessions.values()].filter(
      (session) =>
        session.remotePeerId !== null && isDeviceSessionLive(session.state.phase)
    );
    if (remoteLive.length >= this.maxRemoteSessions) {
      throw new DeviceError("DEVICE_DENIED", "Host remote session concurrency cap reached.");
    }
    const peerConcurrent = remoteLive.filter(
      (session) =>
        session.remotePeerId === request.peerId &&
        session.state.classId === entry.id &&
        session.state.tierId === tier.id
    ).length;
    if (peerConcurrent >= (grant?.maxConcurrent ?? 1)) {
      throw new DeviceError("DEVICE_DENIED", "Per-peer remote concurrency cap reached.");
    }

    await this.maybeConfirmSession({
      appId: `remote:${request.peerId}`,
      publisherPublicKey,
      entry,
      tierId: tier.id,
      consentClass: tier.consentClass === "low" ? "elevated" : tier.consentClass,
      purpose: request.purpose,
      kind: "device-remote-grant",
      peerId: request.peerId
    });

    const appId = `remote:${request.peerId}`;
    const rateHz = request.rateHz ?? Math.min(1, entry.defaults.maxRateHz);
    if (!Number.isFinite(rateHz) || rateHz <= 0 || rateHz > entry.defaults.maxRateHz) {
      throw new DeviceError(
        "DEVICE_RATE_EXCEEDED",
        `Requested rate ${rateHz} Hz exceeds max ${entry.defaults.maxRateHz} Hz for ${entry.id}.`
      );
    }

    const availability = await this.availabilityFor(entry.id);
    if (availability !== "available") {
      throw new DeviceError(
        availability === "busy" ? "DEVICE_BUSY" : "DEVICE_UNSUPPORTED",
        `Device class "${entry.id}" is ${availability}.`
      );
    }

    const ttlMs = Math.min(
      request.maxDurationMs ?? grant!.maxSessionMs,
      grant!.maxSessionMs,
      entry.defaults.maxSessionMs,
      SENSITIVE_DEFAULT_TTL_MS
    );
    const holder = `remote:${request.peerId}`;
    this.locks.set(entry.id, holder);
    let state = initialDeviceSessionState({
      classId: entry.id,
      tierId: tier.id,
      appId,
      holder,
      openedAt: at
    });
    state = stepDeviceSession(state, { kind: "device/open", at, ttlMs }).state;
    const handle = `dev-${this.nextHandle++}-${bytesToHex(this.randomBytes(4))}`;
    const needsSidecar = ["camera", "microphone", "motion", "screen-capture"].includes(entry.id);
    const sidecarToken = needsSidecar ? this.sidecar.open(handle) : null;
    this.sessions.set(handle, {
      handle,
      state,
      rateHz,
      purpose: request.purpose,
      consentClass: tier.consentClass,
      sidecarToken,
      remotePeerId: request.peerId,
      options: {},
      lastReadAt: null
    });
    this.notifyChrome();
    return {
      handle,
      class: entry.id,
      tier: tier.id,
      expiresAt: state.expiresAt
    };
  }

  /**
   * Requesting host: assert `device:remote`, then ask a serving manager to open.
   * Models the two-host path without wire protocol.
   */
  async requestRemoteDevice(
    appId: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    serving: DeviceManager,
    request: RemoteOpenRequest
  ): Promise<DeviceSession> {
    try {
      assertDeviceCapabilityAllowed({
        capability: "device:remote",
        declared,
        granted
      });
    } catch (error) {
      if (error instanceof CapabilityError) {
        throw new DeviceError("DEVICE_DENIED", error.message);
      }
      throw error;
    }
    return serving.openForRemotePeer(request);
  }

  activeSessions(): ReadonlyArray<DeviceSessionState> {
    return [...this.sessions.values()]
      .filter((session) => isDeviceSessionLive(session.state.phase))
      .map((session) => session.state);
  }

  /** Host-chrome session list with opaque handles for kill switches. */
  chromeSessions(): ReadonlyArray<DeviceChromeSession> {
    return [...this.sessions.values()]
      .filter((session) => isDeviceSessionLive(session.state.phase))
      .map((session) => {
        const stream = [...this.streams.values()].find((entry) => entry.session === session.handle);
        return {
          handle: session.handle,
          phase: session.state.phase,
          classId: session.state.classId,
          tierId: session.state.tierId,
          appId: session.state.appId,
          purpose: session.purpose,
          consentClass: session.consentClass,
          openedAt: session.state.openedAt,
          expiresAt: session.state.expiresAt,
          destination:
            session.remotePeerId !== null
              ? `remote:${session.remotePeerId}`
              : stream?.peer ?? ("local" as const),
          remotePeerId: session.remotePeerId
        };
      });
  }

  /** Host-chrome active-use indicators for elevated/sensitive sessions. */
  activeIndicators(): ReadonlyArray<DeviceActiveIndicator> {
    return [...this.sessions.values()]
      .filter(
        (session) =>
          isDeviceSessionLive(session.state.phase) &&
          (session.consentClass === "elevated" || session.consentClass === "sensitive")
      )
      .map((session) => {
        const stream = [...this.streams.values()].find((entry) => entry.session === session.handle);
        return {
          handle: session.handle,
          appId: session.state.appId,
          class: session.state.classId,
          tier: session.state.tierId,
          consentClass: session.consentClass,
          purpose: session.purpose,
          destination:
            session.remotePeerId !== null
              ? `remote:${session.remotePeerId}`
              : stream?.peer ?? ("local" as const)
        };
      });
  }

  /** Host chrome: disable/enable a device class. Disabling kills live sessions of that class. */
  setClassDisabled(classId: string, disabled: boolean): void {
    if (deviceClassById(classId) === undefined) {
      throw new DeviceError("DEVICE_UNSUPPORTED", `Unknown device class "${classId}".`);
    }
    const wasDisabled = this.policyDisabled.has(classId);
    if (disabled) {
      this.policyDisabled.add(classId);
      for (const [handle, session] of this.sessions) {
        if (session.state.classId !== classId || !isDeviceSessionLive(session.state.phase)) continue;
        void this.stopDriver(session.state.classId);
        this.sidecar.close(handle);
        const at = this.now();
        const next = stepDeviceSession(session.state, { kind: "device/revoke", at }).state;
        this.sessions.set(handle, { ...session, state: next });
        if (this.locks.get(session.state.classId) === session.state.holder) {
          this.locks.delete(session.state.classId);
        }
      }
    } else {
      this.policyDisabled.delete(classId);
    }
    if (wasDisabled !== disabled) this.notifyChrome();
  }

  disabledClasses(): ReadonlyArray<string> {
    return [...this.policyDisabled].sort();
  }

  isClassDisabled(classId: string): boolean {
    return this.policyDisabled.has(classId);
  }

  /**
   * Host chrome kill switch — closes by opaque handle without an app-scoped check.
   * Mini-apps must continue to use {@link close}.
   */
  async forceClose(handle: DeviceSessionHandle): Promise<void> {
    const session = this.sessions.get(handle);
    if (session === undefined || !isDeviceSessionLive(session.state.phase)) {
      throw new DeviceError("DEVICE_SESSION_EXPIRED", `Unknown or inactive device session "${handle}".`);
    }
    await this.stopDriver(session.state.classId);
    this.sidecar.close(handle);
    const at = this.now();
    const next = stepDeviceSession(session.state, { kind: "device/revoke", at }).state;
    this.sessions.set(handle, { ...session, state: next });
    if (this.locks.get(session.state.classId) === session.state.holder) {
      this.locks.delete(session.state.classId);
    }
    for (const [streamHandle, stream] of this.streams) {
      if (stream.session === handle) {
        this.streams.delete(streamHandle);
        this.streamShareOfferIds.delete(streamHandle);
        this.streamAdaptation.delete(streamHandle);
        const egress = this.egresses.get(streamHandle);
        this.egresses.delete(streamHandle);
        void egress?.close();
      }
    }
    this.notifyChrome();
  }

  private materializeSample(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown
  ): DeviceSample {
    const classId = sessionMeta.state.classId;
    const tierId = sessionMeta.state.tierId;
    if (classId === "location") {
      const fix = raw as PreciseLocationFix;
      if (typeof fix?.latitude !== "number" || typeof fix?.longitude !== "number") {
        throw new DeviceError("DEVICE_BAD_REQUEST", "Location driver returned an invalid fix.");
      }
      if (tierId === "coarse") {
        const coarse = quantizeLocationCoarse(fix);
        return {
          kind: "location",
          tier: "coarse",
          at,
          latitude: coarse.latitude,
          longitude: coarse.longitude,
          accuracyM: coarse.accuracyM
        };
      }
      return {
        kind: "location",
        tier: "precise",
        at,
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracyM: fix.accuracyM ?? 10,
        ...(fix.altitudeM !== undefined ? { altitudeM: fix.altitudeM } : {}),
        ...(fix.speedMps !== undefined ? { speedMps: fix.speedMps } : {}),
        ...(fix.headingDeg !== undefined ? { headingDeg: fix.headingDeg } : {})
      };
    }

    if (classId === "ambient-light") {
      const lux = typeof raw === "number" ? raw : (raw as { lux?: number })?.lux;
      if (typeof lux !== "number") {
        throw new DeviceError("DEVICE_BAD_REQUEST", "Ambient-light driver returned an invalid reading.");
      }
      return {
        kind: "ambient-light",
        tier: "quantized",
        at,
        luxBucket: quantizeAmbientLux(lux)
      };
    }

    if (classId === "camera") {
      if (tierId === "derived") {
        const derived = deriveCameraSample((raw ?? {}) as CameraDerivedInput);
        const sample = { kind: "camera" as const, tier: "derived" as const, at, ...derived };
        this.pushSidecar(sessionMeta, DEVICE_STREAM_KIND.derivedEvent, encodeDerivedEvent(sample));
        return sample;
      }
      if (tierId === "frames") {
        const frame = sanitizeCameraFrame(raw as RawCameraFrameInput);
        const sidecar = this.pushSidecar(sessionMeta, DEVICE_STREAM_KIND.cameraFrame, frame.bytes);
        return {
          kind: "camera",
          tier: "frames",
          at,
          width: frame.width,
          height: frame.height,
          format: frame.format,
          byteLength: frame.bytes.length,
          ...(sidecar !== undefined ? { sidecar } : {})
        };
      }
      throw new DeviceError("DEVICE_TIER_REQUIRED", `Unsupported camera tier "${tierId}".`);
    }

    if (classId === "microphone") {
      if (tierId === "derived") {
        const derived = deriveMicrophoneSample((raw ?? {}) as MicrophoneDerivedInput);
        const sample = { kind: "microphone" as const, tier: "derived" as const, at, ...derived };
        this.pushSidecar(sessionMeta, DEVICE_STREAM_KIND.derivedEvent, encodeDerivedEvent(sample));
        return sample;
      }
      if (tierId === "pcm") {
        const pcm = sanitizePcmSample(raw as RawPcmInput);
        const payload = floatSamplesToBytes(pcm.samples);
        const sidecar = this.pushSidecar(sessionMeta, DEVICE_STREAM_KIND.pcm, payload);
        return {
          kind: "microphone",
          tier: "pcm",
          at,
          sampleRate: pcm.sampleRate,
          channels: pcm.channels,
          sampleCount: pcm.samples.length,
          ...(sidecar !== undefined ? { sidecar } : {})
        };
      }
      throw new DeviceError("DEVICE_TIER_REQUIRED", `Unsupported microphone tier "${tierId}".`);
    }

    if (classId === "motion") {
      if (tierId === "derived") {
        const sample = raw as RawMotionSample;
        if (
          !Array.isArray(sample?.accel) ||
          sample.accel.length !== 3 ||
          !Array.isArray(sample?.gyro) ||
          sample.gyro.length !== 3
        ) {
          throw new DeviceError("DEVICE_BAD_REQUEST", "Motion driver returned an invalid IMU sample.");
        }
        const derived = deriveMotionSample(sample);
        const derivedSample = { kind: "motion" as const, tier: "derived" as const, at, ...derived };
        this.pushSidecar(sessionMeta, DEVICE_STREAM_KIND.derivedEvent, encodeDerivedEvent(derivedSample));
        return derivedSample;
      }
      if (tierId === "samples") {
        const sanitized = sanitizeMotionSamples(raw as RawMotionInput);
        const payload = new TextEncoder().encode(JSON.stringify(sanitized));
        const sidecar = this.pushSidecar(sessionMeta, DEVICE_STREAM_KIND.motionSamples, payload);
        return {
          kind: "motion",
          tier: "samples",
          at,
          ...sanitized,
          ...(sidecar !== undefined ? { sidecar } : {})
        };
      }
      throw new DeviceError("DEVICE_TIER_REQUIRED", `Unsupported motion tier "${tierId}".`);
    }

    if (classId === "screen-capture") {
      if (tierId !== "frames") {
        throw new DeviceError("DEVICE_TIER_REQUIRED", "screen-capture derived tier is not implemented yet.");
      }
      const frame = sanitizeCameraFrame(raw as RawCameraFrameInput);
      const sidecar = this.pushSidecar(sessionMeta, DEVICE_STREAM_KIND.screenFrame, frame.bytes);
      return {
        kind: "screen-capture",
        tier: "frames",
        at,
        width: frame.width,
        height: frame.height,
        format: frame.format,
        byteLength: frame.bytes.length,
        ...(sidecar !== undefined ? { sidecar } : {})
      };
    }

    if (classId === "biometric") {
      const passed = Boolean((raw as { passed?: boolean })?.passed);
      return {
        kind: "biometric",
        tier: "assertion",
        at,
        passed,
        // Explicitly never include templates.
      };
    }

    if (classId === "proximity") {
      const near = Boolean((raw as { near?: boolean })?.near);
      return { kind: "proximity", tier: "near-far", at, near };
    }
    if (classId === "barometer") {
      const hPa = Number((raw as { hPa?: number })?.hPa);
      if (!Number.isFinite(hPa)) {
        throw new DeviceError("DEVICE_BAD_REQUEST", "Barometer driver returned an invalid reading.");
      }
      return { kind: "barometer", tier: "pressure", at, hPa: Math.round(hPa * 10) / 10 };
    }
    if (classId === "thermometer") {
      const celsius = Number((raw as { celsius?: number })?.celsius);
      if (!Number.isFinite(celsius)) {
        throw new DeviceError("DEVICE_BAD_REQUEST", "Thermometer driver returned an invalid reading.");
      }
      return { kind: "thermometer", tier: "celsius", at, celsius: Math.round(celsius * 10) / 10 };
    }
    if (classId === "hygrometer") {
      const relativeHumidity = Number((raw as { relativeHumidity?: number })?.relativeHumidity);
      if (!Number.isFinite(relativeHumidity)) {
        throw new DeviceError("DEVICE_BAD_REQUEST", "Hygrometer driver returned an invalid reading.");
      }
      return {
        kind: "hygrometer",
        tier: "humidity",
        at,
        relativeHumidity: Math.max(0, Math.min(100, Math.round(relativeHumidity)))
      };
    }
    if (classId === "thermal" || classId === "battery") {
      const bucket = String((raw as { bucket?: string })?.bucket ?? "nominal");
      return {
        kind: classId,
        tier: "coarse",
        at,
        bucket: bucket as "cold" | "nominal" | "warm" | "hot" | "critical" | "unknown"
      };
    }

    if (classId === "stt") {
      const text = String((raw as { text?: string })?.text ?? "");
      const isFinal = (raw as { isFinal?: boolean })?.isFinal !== false;
      const confidence = (raw as { confidence?: number })?.confidence;
      return {
        kind: "stt",
        tier: "transcript",
        at,
        text,
        isFinal,
        ...(typeof confidence === "number" && Number.isFinite(confidence) ? { confidence } : {})
      };
    }

    throw new DeviceError(
      "DEVICE_UNSUPPORTED",
      `Reading samples for "${classId}" is not implemented in this host API phase.`
    );
  }

  private requireLiveSession(appId: string, handle: DeviceSessionHandle): LiveSession {
    const session = this.sessions.get(handle);
    if (session === undefined) {
      throw new DeviceError("DEVICE_SESSION_EXPIRED", `Unknown device session "${handle}".`);
    }
    if (session.state.appId !== appId) {
      throw new DeviceError("DEVICE_DENIED", "Device session is not scoped to this app.");
    }
    this.enforceTtl(session);
    const current = this.sessions.get(handle);
    if (current === undefined || !isDeviceSessionLive(current.state.phase)) {
      throw new DeviceError("DEVICE_SESSION_EXPIRED", "Device session is no longer active.");
    }
    return current;
  }

  private enforceTtl(session: LiveSession): void {
    const at = this.now();
    const stepped = stepDeviceSession(session.state, { kind: "device/ttl", at });
    if (stepped.state.phase !== session.state.phase) {
      this.sessions.set(session.handle, { ...session, state: stepped.state });
      if (this.locks.get(session.state.classId) === session.state.holder) {
        this.locks.delete(session.state.classId);
      }
    }
  }

  private resolveTier(entry: DeviceClassEntry, tierId: string | undefined) {
    if (tierId === undefined) return defaultTierForClass(entry);
    const tier = entry.tiers.find((candidate) => candidate.id === tierId);
    if (tier === undefined) {
      throw new DeviceError("DEVICE_TIER_REQUIRED", `Unknown tier "${tierId}" for ${entry.id}.`);
    }
    return tier;
  }

  private async availabilityFor(classId: string): Promise<DeviceAvailability> {
    if (this.policyDisabled.has(classId)) return "policy-disabled";
    const external = this.options.externalHolders?.().get(classId);
    if (external !== undefined || this.locks.has(classId)) return "busy";
    const driver = this.drivers.get(classId);
    if (driver === undefined) return "unsupported";
    return driver.availability();
  }

  private notifyChrome(): void {
    this.options.onChromeChange?.();
  }

  private validatePurpose(purpose: string): void {
    if (
      typeof purpose !== "string" ||
      purpose.length < 1 ||
      purpose.length > MAX_PURPOSE_LENGTH ||
      [...purpose].some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code < 32 || code === 127;
      })
    ) {
      throw new DeviceError("DEVICE_BAD_REQUEST", "A bounded, printable device purpose is required.");
    }
  }

  private async maybeConfirmSession(options: {
    readonly appId: string;
    readonly publisherPublicKey: string;
    readonly entry: DeviceClassEntry;
    readonly tierId: string;
    readonly consentClass: DeviceConsentClass;
    readonly purpose: string;
    readonly kind?: "device-session" | "device-stream" | "device-remote-grant";
    readonly peerId?: string;
  }): Promise<void> {
    if (options.consentClass === "low" && options.kind !== "device-remote-grant") return;
    const effects = this.options.confirmationEffects;
    if (effects === undefined) {
      // Simulation / unit hosts may omit chrome; elevated still requires an explicit channel when provided.
      if (this.options.confirmationChannel === undefined) return;
      throw new DeviceError("DEVICE_DENIED", "Confirmation effects are required for elevated device sessions.");
    }
    const kind = options.kind ?? "device-session";
    await requestHostConfirmation(
      this.options.confirmationChannel,
      {
        kind,
        appId: options.appId,
        publisherPublicKey: options.publisherPublicKey,
        summary: {
          device: options.entry.id,
          tier: options.tierId,
          purpose: options.purpose,
          destination: options.peerId ?? "local",
          ...(options.peerId !== undefined ? { peer: options.peerId } : {})
        }
      },
      effects
    );
  }

  private pushSidecar(
    session: LiveSession,
    sampleKind: (typeof DEVICE_STREAM_KIND)[keyof typeof DEVICE_STREAM_KIND],
    payload: Uint8Array
  ): DeviceSidecarDelivery | undefined {
    if (session.sidecarToken === null) return undefined;
    const delivery = this.sidecar.push({
      sessionHandle: session.handle,
      sessionToken: session.sidecarToken,
      sampleKind,
      sequence: Math.floor(this.now()),
      captureAtUs: Math.floor(this.now() * 1_000),
      clockId: session.sidecarToken,
      payload
    });
    for (const [streamHandle, stream] of this.streams) {
      if (stream.session !== session.handle) continue;
      const egress = this.egresses.get(streamHandle);
      if (egress !== undefined) void this.sendFramesToEgress(streamHandle, egress, delivery.frames);
    }
    return delivery;
  }

  private async sendFramesToEgress(
    streamHandle: DeviceStreamHandle,
    egress: StreamEgress,
    frames: ReadonlyArray<Uint8Array>
  ): Promise<void> {
    const offerId = this.streamShareOfferIds.get(streamHandle);
    if (!isShareOfferLive(offerId === undefined ? undefined : this.shareOffers.get(offerId), this.now())) {
      this.closeStreamsForShareOffer(offerId);
      return;
    }
    try {
      let droppedOldest = 0;
      let queuedBytes = 0;
      for (const frame of frames) {
        const result = await egress.send(frame);
        droppedOldest += result.droppedOldest;
        queuedBytes = Math.max(queuedBytes, result.queuedBytes);
      }
      const stream = this.streams.get(streamHandle);
      const context = this.streamAdaptation.get(streamHandle);
      if (stream !== undefined && context !== undefined) {
        const quality = egress.quality();
        const effectiveBps = droppedOldest > 0 || queuedBytes > 0
          ? Math.min(quality.goodputBps, stream.admission.admittedDemandBps / 2)
          : quality.goodputBps;
        const deficit = effectiveBps < stream.admission.admittedDemandBps;
        const surplus = effectiveBps >= Math.min(stream.admission.demandBps, stream.admission.admittedDemandBps * 2);
        const deficitStreak = droppedOldest > 0 ? 2 : deficit ? context.deficitStreak + 1 : 0;
        const surplusStreak = surplus ? context.surplusStreak + 1 : 0;
        const admission = adaptStreamAdmission({
          previous: stream.admission,
          supply: {
            plane: egress.plane,
            effectiveBps,
            headroomBps: effectiveBps,
            measuredGoodputBps: effectiveBps,
            queueDepthBytes: queuedBytes
          },
          ladder: degradationLadderFor(this.sessions.get(stream.session)?.state.classId ?? ""),
          deficitStreak,
          surplusStreak
        });
        this.streamAdaptation.set(streamHandle, { ...context, deficitStreak, surplusStreak });
        if (admission.rungIndex !== stream.admission.rungIndex) {
          await egress.close();
          const replacement = await this.options.streamEgressFactory!.create({ appId: context.appId, peer: context.peer, demand: context.demand, admission });
          if (replacement.plane !== admission.plane) { await replacement.close(); throw new Error("Adapted media egress returned the wrong plane."); }
          this.egresses.set(streamHandle, replacement);
          this.streams.set(streamHandle, { ...stream, admission });
          this.streamAdaptation.set(streamHandle, { ...context, deficitStreak: 0, surplusStreak: 0 });
          this.notifyChrome();
        }
      }
    } catch {
      this.streams.delete(streamHandle);
      this.streamShareOfferIds.delete(streamHandle);
      this.streamAdaptation.delete(streamHandle);
      this.egresses.delete(streamHandle);
      await egress.close();
      this.notifyChrome();
    }
  }

  private closeStreamsForShareOffer(offerId: string | undefined): void {
    if (offerId === undefined) return;
    for (const [streamHandle, candidateOfferId] of this.streamShareOfferIds) {
      if (candidateOfferId !== offerId) continue;
      this.streams.delete(streamHandle);
      this.streamShareOfferIds.delete(streamHandle);
      this.streamAdaptation.delete(streamHandle);
      const egress = this.egresses.get(streamHandle);
      this.egresses.delete(streamHandle);
      void egress?.close();
    }
  }

  private assertCommandMatchesSession(classId: string, command: DeviceCommand): void {
    if (command.kind !== classId) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        `Command kind "${command.kind}" does not match session class "${classId}".`
      );
    }
  }

  private async confirmNfcWrite(options: {
    readonly appId: string;
    readonly publisherPublicKey: string;
    readonly purpose: string;
    readonly ndef: string;
  }): Promise<void> {
    const effects = this.options.confirmationEffects;
    if (effects === undefined) {
      if (this.options.confirmationChannel === undefined) return;
      throw new DeviceError("DEVICE_DENIED", "Confirmation effects are required for NFC writes.");
    }
    await requestHostConfirmation(
      this.options.confirmationChannel,
      {
        kind: "device-session",
        appId: options.appId,
        publisherPublicKey: options.publisherPublicKey,
        summary: {
          device: "nfc",
          tier: "ndef",
          purpose: options.purpose,
          destination: "local",
          payload: options.ndef.slice(0, 256)
        }
      },
      effects
    );
  }

  private async stopDriver(classId: string): Promise<void> {
    const driver = this.drivers.get(classId);
    await driver?.stop?.();
  }
}

function applyAdvisoryCandidateCeilings(
  hostCandidates: ReadonlyArray<LinkSupply>,
  advisory: ReadonlyArray<LinkSupply> | undefined
): ReadonlyArray<LinkSupply> {
  if (advisory === undefined) return hostCandidates;
  const capped: LinkSupply[] = [];
  for (const host of hostCandidates) {
    const ceiling = advisory.find((candidate) => candidate.plane === host.plane);
    if (ceiling === undefined) continue;
    const hostMeasured = host.measuredGoodputBps ?? host.effectiveBps;
    const advisoryMeasured = ceiling.measuredGoodputBps ?? ceiling.effectiveBps;
    capped.push({
      ...host,
      effectiveBps: Math.min(host.effectiveBps, ceiling.effectiveBps),
      headroomBps: Math.min(host.headroomBps, ceiling.headroomBps),
      measuredGoodputBps: Math.min(hostMeasured, advisoryMeasured),
      queueDepthBytes: Math.max(host.queueDepthBytes ?? 0, ceiling.queueDepthBytes ?? 0),
      metered: host.metered === true || ceiling.metered === true,
      lowBattery: host.lowBattery === true || ceiling.lowBattery === true
    });
  }
  return capped;
}

function codecMatchesTier(classId: string, tierId: string, codec: string): boolean {
  if ((classId === "microphone" || classId === "speaker") && tierId === "pcm") {
    return codec === "opus" || codec === "pcm";
  }
  if ((classId === "camera" || classId === "screen-capture") && tierId === "frames") {
    return codec === "vp8" || codec === "vp9" || codec === "h264" || codec === "jpeg";
  }
  return false;
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
    granted: expandDeviceCapabilities(options.granted)
  });
}

function expandDeviceCapabilities(capabilities: ReadonlyArray<string>): string[] {
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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function floatSamplesToBytes(samples: ReadonlyArray<number>): Uint8Array {
  const bytes = new Uint8Array(samples.length * 4);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i += 1) {
    view.setFloat32(i * 4, samples[i] ?? 0, true);
  }
  return bytes;
}

function encodeDerivedEvent(sample: DeviceSample): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(sample));
}

/** Simulated drivers for Phase 1–2 end-to-end coverage without hardware. */
export function createSimulatedLocationDriver(fix: PreciseLocationFix = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracyM: 5
}): DeviceDriver {
  return {
    classId: "location",
    availability: () => "available",
    sense: async () => fix
  };
}

export function createSimulatedAmbientLightDriver(lux = 320): DeviceDriver {
  return {
    classId: "ambient-light",
    availability: () => "available",
    sense: async () => lux
  };
}

export function createSimulatedCameraDriver(
  input: CameraDerivedInput = {
    barcodes: [{ format: "qr", value: "TPI1:example" }],
    motionDetected: false,
    faceCount: 0,
    objectCount: 1
  }
): DeviceDriver {
  return {
    classId: "camera",
    availability: () => "available",
    sense: async () => input
  };
}

export function createSimulatedMicrophoneDriver(
  input: MicrophoneDerivedInput = { level: 0.2, tones: [] }
): DeviceDriver {
  return {
    classId: "microphone",
    availability: () => "available",
    sense: async () => input
  };
}

export function createSimulatedMotionDriver(
  sample: RawMotionSample = { accel: [0.1, 0.2, 1.0], gyro: [0, 0, 0] }
): DeviceDriver {
  return {
    classId: "motion",
    availability: () => "available",
    sense: async () => sample
  };
}

export interface SimulatedActuatorLog {
  commands: DeviceCommand[];
  stopped: number;
}

function createActuatorDriver(classId: string, log: SimulatedActuatorLog): DeviceDriver {
  return {
    classId,
    availability: () => "available",
    actuate: async (command) => {
      log.commands.push(command);
    },
    stop: async () => {
      log.stopped += 1;
    }
  };
}

export function createSimulatedTorchDriver(log: SimulatedActuatorLog = { commands: [], stopped: 0 }): DeviceDriver {
  return createActuatorDriver("torch", log);
}

export function createSimulatedSpeakerDriver(log: SimulatedActuatorLog = { commands: [], stopped: 0 }): DeviceDriver {
  return createActuatorDriver("speaker", log);
}

export function createSimulatedTtsDriver(log: SimulatedActuatorLog = { commands: [], stopped: 0 }): DeviceDriver {
  return createActuatorDriver("tts", log);
}

export function createSimulatedHapticsDriver(log: SimulatedActuatorLog = { commands: [], stopped: 0 }): DeviceDriver {
  return createActuatorDriver("haptics", log);
}

export function createSimulatedNfcDriver(log: SimulatedActuatorLog = { commands: [], stopped: 0 }): DeviceDriver {
  return createActuatorDriver("nfc", log);
}

export function createSimulatedRawCameraDriver(
  input: RawCameraFrameInput = {
    width: 16,
    height: 16,
    format: "rgba8",
    bytes: new Uint8Array(16 * 16 * 4),
    deviceModel: "secret-phone",
    sensorCalibration: { fx: 1 }
  }
): DeviceDriver {
  return {
    classId: "camera",
    availability: () => "available",
    sense: async () => input
  };
}

export function createSimulatedRawMicrophoneDriver(
  input: RawPcmInput = {
    sampleRate: 16_000,
    channels: 1,
    samples: [0.1, -0.1, 0.2],
    deviceId: "mic-fingerprint"
  }
): DeviceDriver {
  return {
    classId: "microphone",
    availability: () => "available",
    sense: async () => input
  };
}

export function createSimulatedRawMotionDriver(
  input: RawMotionInput = {
    accel: [0.1234, 0.5678, 0.9012],
    gyro: [0.01, -0.02, 0.03],
    calibrationBias: { ax: 0.001 },
    deviceSerial: "imu-serial"
  }
): DeviceDriver {
  return {
    classId: "motion",
    availability: () => "available",
    sense: async () => input
  };
}

export function createSimulatedScreenCaptureDriver(
  input: RawCameraFrameInput = {
    width: 8,
    height: 8,
    format: "rgba8",
    bytes: new Uint8Array(8 * 8 * 4)
  }
): DeviceDriver {
  return {
    classId: "screen-capture",
    availability: () => "available",
    sense: async () => input
  };
}

export function createSimulatedBiometricDriver(passed = true): DeviceDriver {
  return {
    classId: "biometric",
    availability: () => "available",
    sense: async () => ({ passed })
  };
}

export function createSimulatedSttDriver(
  transcript: { text?: string; isFinal?: boolean; confidence?: number } = {
    text: "hello twistedpear",
    isFinal: true,
    confidence: 0.9
  }
): DeviceDriver {
  return {
    classId: "stt",
    availability: () => "available",
    sense: async () => transcript
  };
}

export function createSimulatedScalarDriver(
  classId: "proximity" | "barometer" | "thermometer" | "hygrometer" | "thermal" | "battery",
  reading: unknown
): DeviceDriver {
  return {
    classId,
    availability: () => "available",
    sense: async () => reading
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
    createSimulatedScalarDriver("battery", { bucket: "nominal" })
  ];
}

export function createSimulatedDeviceManager(
  options: Omit<DeviceManagerOptions, "drivers"> & { readonly drivers?: ReadonlyArray<DeviceDriver> } = {}
): DeviceManager {
  return new DeviceManager({
    ...options,
    drivers: options.drivers ?? createSimulatedDeviceDrivers()
  });
}

/**
 * Simulated drivers for every class, with selected classes replaced by host-bridged
 * OS/browser drivers. Used by shipping hosts that can answer sense/actuate on chrome.
 */
export function createHybridDeviceDrivers(
  bridgedClassIds: ReadonlyArray<string>,
  bridge: DeviceHostBridge
): ReadonlyArray<DeviceDriver> {
  const bridged = new Set(bridgedClassIds);
  return [
    ...createSimulatedDeviceDrivers().filter((driver) => !bridged.has(driver.classId)),
    ...createHostBridgedDrivers(bridgedClassIds, bridge)
  ];
}
