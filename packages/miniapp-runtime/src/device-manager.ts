import {
  DEVICE_CLASS_REGISTRY,
  DEVICE_STREAM_KIND,
  ActuatorSafetyError,
  assertAidAllowed,
  decideStreamAdmission,
  defaultTierForClass,
  deriveCameraSample,
  deriveMicrophoneSample,
  deriveMotionSample,
  deviceCapabilityId,
  deviceClassById,
  initialDeviceSessionState,
  initialRemoteGrantStore,
  isDeviceSessionLive,
  isRemoteGrantLive,
  quantizeAmbientLux,
  quantizeLocationCoarse,
  remoteGrantKey,
  sanitizeCameraFrame,
  sanitizeMotionSamples,
  sanitizePcmSample,
  stepDeviceSession,
  stepRemoteGrantStore,
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
  type StreamPlane
} from "@twistedpear/protocol";
import { assertCapabilityAllowed, CapabilityError } from "./capabilities.js";
import {
  requestHostConfirmation,
  type ConfirmationEffects,
  type HostConfirmationChannel
} from "./confirm.js";
import { DeviceStreamSidecar, type DeviceSidecarDelivery } from "./device-sidecar.js";

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
  readonly options?: Readonly<Record<string, unknown>>;
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
  readonly candidates?: ReadonlyArray<LinkSupply>;
  readonly preferredPlane?: StreamPlane;
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
      | "DEVICE_UNCONFIGURED"
      | "DEVICE_BANDWIDTH_INSUFFICIENT",
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
  /** Max concurrent remote sessions host-wide (serving side). */
  readonly maxRemoteSessions?: number;
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
  lastReadAt: number | null;
}

const MAX_PURPOSE_LENGTH = 160;
const SENSITIVE_DEFAULT_TTL_MS = 15 * 60_000;

export class DeviceManager {
  private readonly drivers = new Map<string, DeviceDriver>();
  private readonly sessions = new Map<DeviceSessionHandle, LiveSession>();
  private readonly streams = new Map<DeviceStreamHandle, DeviceStreamSession>();
  private readonly locks = new Map<string, string>();
  private readonly sidecar: DeviceStreamSidecar;
  private remoteEnabled = false;
  private remoteGrants = initialRemoteGrantStore();
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
    if (entry.id === "speaker" && tier.id === "pcm") {
      throw new DeviceError(
        "DEVICE_TIER_REQUIRED",
        `Tier "${tier.id}" for ${entry.id} requires a later host API phase.`
      );
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
    const needsSidecar =
      (entry.id === "camera" && tier.id === "frames") ||
      (entry.id === "microphone" && tier.id === "pcm") ||
      (entry.id === "motion" && tier.id === "samples") ||
      (entry.id === "screen-capture" && tier.id === "frames");
    const sidecarToken = needsSidecar ? this.sidecar.open(handle) : null;
    this.sessions.set(handle, {
      handle,
      state,
      rateHz,
      purpose: request.purpose,
      consentClass,
      sidecarToken,
      remotePeerId: null,
      lastReadAt: null
    });

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
  }

  closeApp(appId: string): void {
    for (const [handle, stream] of this.streams) {
      const session = this.sessions.get(stream.session);
      if (session?.state.appId === appId) this.streams.delete(handle);
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
    }
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

    const raw = await driver.sense();
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

    const candidates =
      constraints.candidates ??
      ([
        {
          plane: constraints.preferredPlane ?? "reticulum",
          effectiveBps: 64_000,
          headroomBps: 524_288
        }
      ] satisfies ReadonlyArray<LinkSupply>);

    const admission = decideStreamAdmission(
      {
        classId: live.state.classId,
        tierId: live.state.tierId,
        rateHz: live.rateHz
      },
      candidates
    );

    if (admission.kind === "reject") {
      throw new DeviceError("DEVICE_BANDWIDTH_INSUFFICIENT", admission.reason);
    }

    const handle = `stream-${this.nextStreamHandle++}-${bytesToHex(this.randomBytes(3))}`;
    const stream: DeviceStreamSession = {
      handle,
      session: sessionHandle,
      peer,
      admission
    };
    this.streams.set(handle, stream);
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
  }

  activeStreams(): ReadonlyArray<DeviceStreamSession> {
    return [...this.streams.values()];
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
    const needsSidecar =
      (entry.id === "camera" && tier.id === "frames") ||
      (entry.id === "microphone" && tier.id === "pcm") ||
      (entry.id === "motion" && tier.id === "samples") ||
      (entry.id === "screen-capture" && tier.id === "frames");
    const sidecarToken = needsSidecar ? this.sidecar.open(handle) : null;
    this.sessions.set(handle, {
      handle,
      state,
      rateHz,
      purpose: request.purpose,
      consentClass: tier.consentClass,
      sidecarToken,
      remotePeerId: request.peerId,
      lastReadAt: null
    });
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
        return { kind: "camera", tier: "derived", at, ...derived };
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
        return { kind: "microphone", tier: "derived", at, ...derived };
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
        return { kind: "motion", tier: "derived", at, ...derived };
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
    if (this.options.policyDisabled?.has(classId)) return "policy-disabled";
    const external = this.options.externalHolders?.().get(classId);
    if (external !== undefined || this.locks.has(classId)) return "busy";
    const driver = this.drivers.get(classId);
    if (driver === undefined) return "unsupported";
    return driver.availability();
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
    return this.sidecar.push({
      sessionHandle: session.handle,
      sessionToken: session.sidecarToken,
      sampleKind,
      sequence: Math.floor(this.now()),
      payload
    });
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
    if (parts.length === 3) {
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
