import {
  DEVICE_CLASS_REGISTRY,
  defaultTierForClass,
  deviceCapabilityId,
  deviceClassById,
  initialDeviceSessionState,
  initialRemoteGrantStore,
  initialShareOfferStore,
  isDeviceSessionLive,
  stepDeviceSession,
  type DeviceClassEntry,
  type DeviceConsentClass,
} from "@twistedpear/protocol";
import { CapabilityError } from "../capabilities.js";
import { requestHostConfirmation } from "../confirm.js";
import { DeviceStreamSidecar } from "../device-sidecar.js";
import {
  DeviceError,
  MAX_PURPOSE_LENGTH,
  SENSITIVE_DEFAULT_TTL_MS,
  assertDeviceCapabilityAllowed,
  bytesToHex,
} from "./shared.js";
import type {
  DeviceAvailability,
  DeviceDescriptor,
  DeviceDiagnostic,
  DeviceDriver,
  DeviceManagerOptions,
  DeviceOpenRequest,
  DeviceSession,
  DeviceSessionHandle,
  LiveSession,
} from "./shared.js";

export class DeviceManagerLayer1Base {
  protected readonly drivers = new Map<string, DeviceDriver>();
  protected readonly sessions = new Map<DeviceSessionHandle, LiveSession>();
  protected readonly streams = new Map<
    string,
    import("./shared.js").DeviceStreamSession
  >();
  protected readonly egresses = new Map<
    string,
    import("../media-stream.js").StreamEgress
  >();
  protected readonly streamShareOfferIds = new Map<string, string>();
  protected readonly streamAdaptation = new Map<
    string,
    {
      appId: string;
      peer: string;
      demand: import("@twistedpear/protocol").StreamDemand;
      deficitStreak: number;
      surplusStreak: number;
    }
  >();
  protected readonly locks = new Map<string, string>();
  protected readonly sidecar: DeviceStreamSidecar;
  protected readonly policyDisabled: Set<string>;
  protected remoteEnabled = false;
  protected remoteGrants = initialRemoteGrantStore();
  protected shareOffers = initialShareOfferStore();
  protected nextHandle = 0;
  protected nextStreamHandle = 0;
  protected readonly now: () => number;
  protected readonly randomBytes: (length: number) => Uint8Array;
  protected readonly maxRemoteSessions: number;

  constructor(protected readonly options: DeviceManagerOptions = {}) {
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
          remoteEligible: entry.remoteEligible,
        } satisfies DeviceDescriptor;
      }),
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
          ...(holder !== undefined
            ? { holder, reason: `held by ${holder}` }
            : {}),
          ...(availability === "unsupported"
            ? { reason: "no driver on this host" }
            : {}),
          ...(availability === "policy-disabled"
            ? { reason: "disabled by host policy" }
            : {}),
        } satisfies DeviceDiagnostic;
      }),
    );
  }

  async open(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    request: DeviceOpenRequest,
  ): Promise<DeviceSession> {
    this.validatePurpose(request.purpose);
    const entry = deviceClassById(request.class);
    if (entry === undefined) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Unknown device class "${request.class}".`,
      );
    }

    const tier = this.resolveTier(entry, request.tier);
    this.assertVoiceDuplexOptions(entry.id, request.options?.voiceDuplex);
    const capability = deviceCapabilityId(entry.id, tier.id);
    try {
      assertDeviceCapabilityAllowed({ capability, declared, granted });
    } catch (error) {
      if (error instanceof CapabilityError) {
        throw new DeviceError("DEVICE_DENIED", error.message);
      }
      throw error;
    }

    await this.assertLocalDeviceAvailable(entry.id);
    const rateHz = this.requireSessionRateHz(entry, request.rateHz);

    const consentClass = tier.consentClass;
    await this.maybeConfirmSession({
      appId,
      publisherPublicKey,
      entry,
      tierId: tier.id,
      consentClass,
      purpose: request.purpose,
    });

    const at = this.now();
    const ttlMs = Math.min(
      request.maxDurationMs ?? entry.defaults.maxSessionMs,
      entry.defaults.maxSessionMs,
      consentClass === "sensitive"
        ? SENSITIVE_DEFAULT_TTL_MS
        : entry.defaults.maxSessionMs,
    );
    const holder = `app:${appId}`;
    this.locks.set(entry.id, holder);

    let state = initialDeviceSessionState({
      classId: entry.id,
      tierId: tier.id,
      appId,
      holder,
      openedAt: at,
    });
    state = stepDeviceSession(state, { kind: "device/open", at, ttlMs }).state;
    const handle = `dev-${this.nextHandle++}-${bytesToHex(this.randomBytes(4))}`;
    const needsSidecar = [
      "camera",
      "microphone",
      "motion",
      "screen-capture",
    ].includes(entry.id);
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
      lastReadAt: null,
    });
    this.notifyChrome();

    return {
      handle,
      class: entry.id,
      tier: tier.id,
      expiresAt: state.expiresAt,
    };
  }

  private assertVoiceDuplexOptions(
    classId: string,
    voiceDuplex: unknown,
  ): void {
    if (voiceDuplex !== undefined && typeof voiceDuplex !== "boolean") {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "voiceDuplex must be a boolean.",
      );
    }
    if (
      voiceDuplex === true &&
      classId !== "microphone" &&
      classId !== "speaker"
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "voiceDuplex is only valid for microphone or speaker sessions.",
      );
    }
  }

  private async assertLocalDeviceAvailable(classId: string): Promise<void> {
    const availability = await this.availabilityFor(classId);
    if (availability === "unsupported") {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${classId}" is unsupported on this host.`,
      );
    }
    if (availability === "policy-disabled") {
      throw new DeviceError(
        "DEVICE_DENIED",
        `Device class "${classId}" is disabled by host policy.`,
      );
    }
    if (availability === "permission-required") {
      throw new DeviceError(
        "DEVICE_DENIED",
        `Device class "${classId}" requires host permission.`,
      );
    }
    if (availability === "offline") {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${classId}" is offline.`,
      );
    }
    if (availability === "busy") {
      const holder =
        this.locks.get(classId) ??
        this.options.externalHolders?.().get(classId) ??
        "unknown";
      throw new DeviceError(
        "DEVICE_BUSY",
        `Device class "${classId}" is busy (held by ${holder}).`,
      );
    }
  }

  protected requireSessionRateHz(
    entry: DeviceClassEntry,
    requested: number | undefined,
  ): number {
    const rateHz = requested ?? Math.min(1, entry.defaults.maxRateHz);
    if (
      !Number.isFinite(rateHz) ||
      rateHz <= 0 ||
      rateHz > entry.defaults.maxRateHz
    ) {
      throw new DeviceError(
        "DEVICE_RATE_EXCEEDED",
        `Requested rate ${rateHz} Hz exceeds max ${entry.defaults.maxRateHz} Hz for ${entry.id}.`,
      );
    }
    return rateHz;
  }

  async close(appId: string, handle: DeviceSessionHandle): Promise<void> {
    const session = this.requireLiveSession(appId, handle);
    await this.stopDriver(session.state.classId);
    this.sidecar.close(handle);
    const at = this.now();
    const next = stepDeviceSession(session.state, {
      kind: "device/close",
      at,
    }).state;
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
      if (
        session.state.appId !== appId ||
        !isDeviceSessionLive(session.state.phase)
      )
        continue;
      void this.stopDriver(session.state.classId);
      this.sidecar.close(handle);
      const at = this.now();
      const next = stepDeviceSession(session.state, {
        kind: "device/close",
        at,
      }).state;
      this.sessions.set(handle, { ...session, state: next });
      if (this.locks.get(session.state.classId) === session.state.holder) {
        this.locks.delete(session.state.classId);
      }
      changed = true;
    }
    if (changed) this.notifyChrome();
  }

  protected requireLiveSession(
    appId: string,
    handle: DeviceSessionHandle,
  ): LiveSession {
    const session = this.sessions.get(handle);
    if (session === undefined) {
      throw new DeviceError(
        "DEVICE_SESSION_EXPIRED",
        `Unknown device session "${handle}".`,
      );
    }
    if (session.state.appId !== appId) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Device session is not scoped to this app.",
      );
    }
    this.enforceTtl(session);
    const current = this.sessions.get(handle);
    if (current === undefined || !isDeviceSessionLive(current.state.phase)) {
      throw new DeviceError(
        "DEVICE_SESSION_EXPIRED",
        "Device session is no longer active.",
      );
    }
    return current;
  }

  protected enforceTtl(session: LiveSession): void {
    const at = this.now();
    const stepped = stepDeviceSession(session.state, {
      kind: "device/ttl",
      at,
    });
    if (stepped.state.phase !== session.state.phase) {
      this.sessions.set(session.handle, { ...session, state: stepped.state });
      if (this.locks.get(session.state.classId) === session.state.holder) {
        this.locks.delete(session.state.classId);
      }
    }
  }

  protected resolveTier(entry: DeviceClassEntry, tierId: string | undefined) {
    if (tierId === undefined) return defaultTierForClass(entry);
    const tier = entry.tiers.find((candidate) => candidate.id === tierId);
    if (tier === undefined) {
      throw new DeviceError(
        "DEVICE_TIER_REQUIRED",
        `Unknown tier "${tierId}" for ${entry.id}.`,
      );
    }
    return tier;
  }

  protected async availabilityFor(
    classId: string,
  ): Promise<DeviceAvailability> {
    if (this.policyDisabled.has(classId)) return "policy-disabled";
    const external = this.options.externalHolders?.().get(classId);
    if (external !== undefined || this.locks.has(classId)) return "busy";
    const driver = this.drivers.get(classId);
    if (driver === undefined) return "unsupported";
    return driver.availability();
  }

  protected notifyChrome(): void {
    this.options.onChromeChange?.();
  }

  protected validatePurpose(purpose: string): void {
    if (
      typeof purpose !== "string" ||
      purpose.length < 1 ||
      purpose.length > MAX_PURPOSE_LENGTH ||
      [...purpose].some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code < 32 || code === 127;
      })
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "A bounded, printable device purpose is required.",
      );
    }
  }

  protected async maybeConfirmSession(options: {
    readonly appId: string;
    readonly publisherPublicKey: string;
    readonly entry: DeviceClassEntry;
    readonly tierId: string;
    readonly consentClass: DeviceConsentClass;
    readonly purpose: string;
    readonly kind?: "device-session" | "device-stream" | "device-remote-grant";
    readonly peerId?: string;
  }): Promise<void> {
    if (
      options.consentClass === "low" &&
      options.kind !== "device-remote-grant"
    )
      return;
    const effects = this.options.confirmationEffects;
    if (effects === undefined) {
      if (this.options.confirmationChannel === undefined) return;
      throw new DeviceError(
        "DEVICE_DENIED",
        "Confirmation effects are required for elevated device sessions.",
      );
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
          ...(options.peerId !== undefined ? { peer: options.peerId } : {}),
        },
      },
      effects,
    );
  }

  protected async stopDriver(classId: string): Promise<void> {
    const driver = this.drivers.get(classId);
    await driver?.stop?.();
  }
}
