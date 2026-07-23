import {
  DEVICE_CLASS_REGISTRY,
  defaultTierForClass,
  deviceCapabilityId,
  deviceClassById,
  initialDeviceSessionState,
  isDeviceSessionLive,
  quantizeAmbientLux,
  quantizeLocationCoarse,
  stepDeviceSession,
  type DeviceClassEntry,
  type DeviceConsentClass,
  type DeviceSessionState,
  type PreciseLocationFix
} from "@twistedpear/protocol";
import { assertCapabilityAllowed, CapabilityError } from "./capabilities.js";
import {
  requestHostConfirmation,
  type ConfirmationEffects,
  type HostConfirmationChannel
} from "./confirm.js";

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
    };

export interface DeviceDriver {
  readonly classId: string;
  availability(): Promise<DeviceAvailability> | DeviceAvailability;
  /** Precise/raw reading before host-side derived processing. */
  sense(options?: Readonly<Record<string, unknown>>): Promise<unknown>;
}

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
}

interface LiveSession {
  readonly handle: DeviceSessionHandle;
  readonly state: DeviceSessionState;
  readonly rateHz: number;
  readonly purpose: string;
  lastReadAt: number | null;
}

const MAX_PURPOSE_LENGTH = 160;
const SENSITIVE_DEFAULT_TTL_MS = 15 * 60_000;

export class DeviceManager {
  private readonly drivers = new Map<string, DeviceDriver>();
  private readonly sessions = new Map<DeviceSessionHandle, LiveSession>();
  private readonly locks = new Map<string, string>();
  private nextHandle = 0;
  private readonly now: () => number;
  private readonly randomBytes: (length: number) => Uint8Array;

  constructor(private readonly options: DeviceManagerOptions = {}) {
    for (const driver of options.drivers ?? []) {
      this.drivers.set(driver.classId, driver);
    }
    this.now = options.now ?? (() => Date.now());
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
    this.sessions.set(handle, {
      handle,
      state,
      rateHz,
      purpose: request.purpose,
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
    const at = this.now();
    const next = stepDeviceSession(session.state, { kind: "device/close", at }).state;
    this.sessions.set(handle, { ...session, state: next });
    if (this.locks.get(session.state.classId) === session.state.holder) {
      this.locks.delete(session.state.classId);
    }
  }

  closeApp(appId: string): void {
    for (const [handle, session] of this.sessions) {
      if (session.state.appId !== appId || !isDeviceSessionLive(session.state.phase)) continue;
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
    if (driver === undefined) {
      throw new DeviceError("DEVICE_UNSUPPORTED", `No driver for ${live.state.classId}.`);
    }

    const raw = await driver.sense();
    const sample = this.materializeSample(live.state.classId, live.state.tierId, at, raw);
    live.lastReadAt = at;
    return sample;
  }

  activeSessions(): ReadonlyArray<DeviceSessionState> {
    return [...this.sessions.values()]
      .filter((session) => isDeviceSessionLive(session.state.phase))
      .map((session) => session.state);
  }

  private materializeSample(
    classId: string,
    tierId: string,
    at: number,
    raw: unknown
  ): DeviceSample {
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
  }): Promise<void> {
    if (options.consentClass === "low") return;
    const effects = this.options.confirmationEffects;
    if (effects === undefined) {
      // Simulation / unit hosts may omit chrome; elevated still requires an explicit channel when provided.
      if (this.options.confirmationChannel === undefined) return;
      throw new DeviceError("DEVICE_DENIED", "Confirmation effects are required for elevated device sessions.");
    }
    const kind = options.consentClass === "sensitive" ? "device-session" : "device-session";
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
          destination: "local"
        }
      },
      effects
    );
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

/** Simulated drivers for Phase 1 end-to-end coverage without hardware. */
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
