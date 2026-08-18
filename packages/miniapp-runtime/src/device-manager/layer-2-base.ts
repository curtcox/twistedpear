import {
  deviceClassById,
  initialDeviceSessionState,
  isDeviceSessionLive,
  isRemoteGrantLive,
  isShareOfferLive,
  remoteGrantKey,
  stepDeviceSession,
  stepRemoteGrantStore,
  stepShareOfferStore,
  ActuatorSafetyError,
  validateActuatorCommand,
  type DeviceCommand,
  type RemoteDeviceGrant,
  type ShareOffer,
} from "@twistedpear/protocol";
import { DeviceError, SENSITIVE_DEFAULT_TTL_MS, bytesToHex } from "./shared.js";
import type {
  DeviceSample,
  DeviceSession,
  DeviceSessionHandle,
  DeviceStreamSession,
  LiveSession,
  RemoteOpenRequest,
} from "./shared.js";
import { DeviceManagerLayer1 } from "./layer-1.js";

export abstract class DeviceManagerLayer2Base extends DeviceManagerLayer1 {
  async read(
    appId: string,
    handle: DeviceSessionHandle,
  ): Promise<DeviceSample> {
    const session = this.requireLiveSession(appId, handle);
    this.enforceTtl(session);
    const live = this.sessions.get(handle);
    if (live === undefined || !isDeviceSessionLive(live.state.phase)) {
      throw new DeviceError(
        "DEVICE_SESSION_EXPIRED",
        "Device session is no longer active.",
      );
    }

    const minIntervalMs = 1000 / live.rateHz;
    const at = this.now();
    if (live.lastReadAt !== null && at - live.lastReadAt < minIntervalMs - 1) {
      throw new DeviceError(
        "DEVICE_RATE_EXCEEDED",
        `Device read rate exceeded (${live.rateHz} Hz).`,
      );
    }

    const driver = this.drivers.get(live.state.classId);
    if (driver?.sense === undefined) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `No sense driver for ${live.state.classId}.`,
      );
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
    command: DeviceCommand,
  ): Promise<void> {
    const session = this.requireLiveSession(appId, handle);
    this.enforceTtl(session);
    const live = this.requireActiveLive(handle);
    this.assertCommandMatchesSession(live, command);
    const normalized = this.normalizeActuatorCommand(command);
    await this.confirmNfcCommandIfNeeded(
      appId,
      publisherPublicKey,
      live,
      normalized,
    );
    const at = this.enforceActuateRate(live);
    const driver = this.drivers.get(live.state.classId);
    if (driver?.actuate === undefined) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `No actuate driver for ${live.state.classId}.`,
      );
    }
    await driver.actuate(normalized);
    live.lastReadAt = at;
  }

  private requireActiveLive(handle: DeviceSessionHandle): LiveSession {
    const live = this.sessions.get(handle);
    if (live === undefined || !isDeviceSessionLive(live.state.phase)) {
      throw new DeviceError(
        "DEVICE_SESSION_EXPIRED",
        "Device session is no longer active.",
      );
    }
    return live;
  }

  private normalizeActuatorCommand(command: DeviceCommand): DeviceCommand {
    try {
      return validateActuatorCommand(command).normalized;
    } catch (error) {
      if (error instanceof ActuatorSafetyError) {
        throw new DeviceError("DEVICE_BAD_REQUEST", error.message);
      }
      throw error;
    }
  }

  private async confirmNfcCommandIfNeeded(
    appId: string,
    publisherPublicKey: string,
    live: LiveSession,
    normalized: DeviceCommand,
  ): Promise<void> {
    if (normalized.kind !== "nfc") {
      return;
    }
    if (normalized.action === "write") {
      await this.confirmNfcWrite({
        appId,
        publisherPublicKey,
        purpose: live.purpose,
        ndef: normalized.ndef,
      });
      return;
    }
    await this.confirmNfcWrite({
      appId,
      publisherPublicKey,
      purpose: live.purpose,
      ndef: `APDU aid=${normalized.aid}`,
    });
  }

  private enforceActuateRate(live: LiveSession): number {
    const minIntervalMs = 1000 / live.rateHz;
    const at = this.now();
    if (live.lastReadAt !== null && at - live.lastReadAt < minIntervalMs - 1) {
      throw new DeviceError(
        "DEVICE_RATE_EXCEEDED",
        `Device write rate exceeded (${live.rateHz} Hz).`,
      );
    }
    return at;
  }

  activeStreams(): ReadonlyArray<DeviceStreamSession> {
    return [...this.streams.values()];
  }

  activeStreamsForApp(appId: string): ReadonlyArray<DeviceStreamSession> {
    return [...this.streams.values()].filter(
      (stream) => this.sessions.get(stream.session)?.state.appId === appId,
    );
  }

  setRemoteAcquisitionEnabled(enabled: boolean): void {
    this.remoteEnabled = enabled;
    if (!enabled) {
      this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
        kind: "remote/clear-all",
        at: this.now(),
      });
      for (const [handle, session] of this.sessions) {
        if (
          session.remotePeerId === null ||
          !isDeviceSessionLive(session.state.phase)
        )
          continue;
        void this.stopDriver(session.state.classId);
        this.sidecar.close(handle);
        const at = this.now();
        const next = stepDeviceSession(session.state, {
          kind: "device/revoke",
          at,
        }).state;
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

  grantRemotePeer(options: {
    readonly peerId: string;
    readonly classId: string;
    readonly tierId: string;
    readonly ttlMs: number;
    readonly maxConcurrent?: number;
    readonly maxSessionMs?: number;
  }): RemoteDeviceGrant {
    if (!this.remoteEnabled) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Remote device acquisition is disabled on this host.",
      );
    }
    const entry = deviceClassById(options.classId);
    if (entry === undefined || !entry.remoteEligible) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${options.classId}" is not remote-eligible.`,
      );
    }
    if (entry.tiers.every((tier) => tier.id !== options.tierId)) {
      throw new DeviceError(
        "DEVICE_TIER_REQUIRED",
        `Unknown tier "${options.tierId}".`,
      );
    }
    this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
      kind: "remote/grant",
      at: this.now(),
      peerId: options.peerId,
      classId: options.classId,
      tierId: options.tierId,
      ttlMs: options.ttlMs,
      ...(options.maxConcurrent !== undefined
        ? { maxConcurrent: options.maxConcurrent }
        : {}),
      ...(options.maxSessionMs !== undefined
        ? { maxSessionMs: options.maxSessionMs }
        : {}),
    });
    const grant = this.remoteGrants.get(
      remoteGrantKey(options.peerId, options.classId, options.tierId),
    );
    if (grant === undefined) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Failed to record remote grant.",
      );
    }
    return grant;
  }

  revokeRemotePeer(peerId: string, classId: string, tierId: string): void {
    this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
      kind: "remote/revoke",
      at: this.now(),
      peerId,
      classId,
      tierId,
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
      const next = stepDeviceSession(session.state, {
        kind: "device/revoke",
        at,
      }).state;
      this.sessions.set(handle, { ...session, state: next });
      if (this.locks.get(session.state.classId) === session.state.holder) {
        this.locks.delete(session.state.classId);
      }
    }
  }

  clearRemoteGrantsForRestart(): void {
    this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
      kind: "remote/clear-all",
      at: this.now(),
    });
  }

  listRemoteGrants(): ReadonlyArray<RemoteDeviceGrant> {
    const at = this.now();
    return [...this.remoteGrants.values()].filter((grant) =>
      isRemoteGrantLive(grant, at),
    );
  }

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
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Share offer TTL must be between 1 ms and 24 hours.",
      );
    }
    const entry = deviceClassById(options.classId);
    if (
      entry === undefined ||
      !entry.tiers.some((tier) => tier.id === options.tierId)
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Share offer class/tier is invalid.",
      );
    }
    if (!entry.degradationLadder.includes(options.maxRung)) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Share offer quality ceiling is invalid.",
      );
    }
    const grantedAt = this.now();
    const id = `share-${this.nextStreamHandle++}-${bytesToHex(this.randomBytes(3))}`;
    const { ttlMs, ...authored } = options;
    this.shareOffers = stepShareOfferStore(this.shareOffers, {
      kind: "share/grant",
      offer: { id, grantedAt, ...authored },
      ttlMs,
    });
    const offer = this.shareOffers.get(id);
    if (offer === undefined)
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Share offer was not created.",
      );
    this.notifyChrome();
    return offer;
  }

  async requestShareOfferFromChrome(
    appId: string,
    purpose: string,
  ): Promise<ShareOffer | null> {
    this.validatePurpose(purpose);
    const authored =
      (await this.options.requestShareOffer?.({ appId, purpose })) ?? null;
    return authored === null
      ? null
      : this.grantShareOffer({ appId, ...authored });
  }

  listLiveShareOffers(): ReadonlyArray<ShareOffer> {
    const at = this.now();
    for (const offer of this.shareOffers.values()) {
      if (offer.phase === "active" && at >= offer.expiresAt) {
        this.shareOffers = stepShareOfferStore(this.shareOffers, {
          kind: "share/ttl",
          id: offer.id,
          at,
        });
        this.closeStreamsForShareOffer(offer.id);
      }
    }
    return [...this.shareOffers.values()].filter((offer) =>
      isShareOfferLive(offer, at),
    );
  }

  listShareOffers(appId: string): ReadonlyArray<ShareOffer> {
    return this.listLiveShareOffers().filter((offer) => offer.appId === appId);
  }

  async requestShareOfferRevoke(appId: string, id: string): Promise<boolean> {
    const offer = this.shareOffers.get(id);
    if (
      offer === undefined ||
      offer.appId !== appId ||
      !isShareOfferLive(offer, this.now())
    )
      return false;
    const approved =
      (await this.options.confirmShareOfferRevoke?.(offer)) ?? false;
    if (!approved) return false;
    this.shareOffers = stepShareOfferStore(this.shareOffers, {
      kind: "share/revoke",
      id,
      at: this.now(),
    });
    this.closeStreamsForShareOffer(id);
    this.notifyChrome();
    return true;
  }

  revokeShareOfferFromChrome(appId: string, id: string): boolean {
    const offer = this.shareOffers.get(id);
    if (
      offer === undefined ||
      offer.appId !== appId ||
      !isShareOfferLive(offer, this.now())
    )
      return false;
    this.shareOffers = stepShareOfferStore(this.shareOffers, {
      kind: "share/revoke",
      id,
      at: this.now(),
    });
    this.closeStreamsForShareOffer(id);
    this.notifyChrome();
    return true;
  }

  clearShareOffersForRestart(): void {
    for (const id of this.streamShareOfferIds.values())
      this.closeStreamsForShareOffer(id);
    this.shareOffers = stepShareOfferStore(this.shareOffers, {
      kind: "share/clear-sensitive",
      at: this.now(),
    });
    this.notifyChrome();
  }

  async openForRemotePeer(
    request: RemoteOpenRequest,
    publisherPublicKey = "remote-host",
  ): Promise<DeviceSession> {
    if (!this.remoteEnabled) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Remote device acquisition is disabled on this host.",
      );
    }
    this.validatePurpose(request.purpose);
    if (typeof request.peerId !== "string" || request.peerId.length < 1) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Remote peer id is required.",
      );
    }

    const entry = deviceClassById(request.class);
    if (entry === undefined || !entry.remoteEligible) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${request.class}" is not remote-eligible.`,
      );
    }
    const tier = this.resolveTier(entry, request.tier);
    const at = this.now();
    const grant = this.requireLiveRemoteGrant(
      request.peerId,
      entry.id,
      tier.id,
      at,
    );
    this.assertRemotePeerCapacity(request.peerId, entry.id, tier.id, grant);

    await this.maybeConfirmSession({
      appId: `remote:${request.peerId}`,
      publisherPublicKey,
      entry,
      tierId: tier.id,
      consentClass:
        tier.consentClass === "low" ? "elevated" : tier.consentClass,
      purpose: request.purpose,
      kind: "device-remote-grant",
      peerId: request.peerId,
    });

    return this.openGrantedRemoteSession(request, entry, tier, grant, at);
  }

  private requireLiveRemoteGrant(
    peerId: string,
    classId: string,
    tierId: string,
    at: number,
  ): RemoteDeviceGrant {
    this.remoteGrants = stepRemoteGrantStore(this.remoteGrants, {
      kind: "remote/ttl",
      at,
      peerId,
      classId,
      tierId,
    });
    const grant = this.remoteGrants.get(
      remoteGrantKey(peerId, classId, tierId),
    );
    if (grant === undefined || !isRemoteGrantLive(grant, at)) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "No live remote grant for this peer/class/tier.",
      );
    }
    return grant;
  }

  private assertRemotePeerCapacity(
    peerId: string,
    classId: string,
    tierId: string,
    grant: RemoteDeviceGrant,
  ): void {
    const remoteLive = [...this.sessions.values()].filter(
      (session) =>
        session.remotePeerId !== null &&
        isDeviceSessionLive(session.state.phase),
    );
    const peerConcurrent = remoteLive.filter(
      (session) =>
        session.remotePeerId === peerId &&
        session.state.classId === classId &&
        session.state.tierId === tierId,
    ).length;
    this.assertRemoteConcurrency(remoteLive.length, peerConcurrent, grant);
  }

  private async openGrantedRemoteSession(
    request: RemoteOpenRequest,
    entry: NonNullable<ReturnType<typeof deviceClassById>>,
    tier: ReturnType<DeviceManagerLayer2Base["resolveTier"]>,
    grant: RemoteDeviceGrant,
    at: number,
  ): Promise<DeviceSession> {
    const appId = `remote:${request.peerId}`;
    const rateHz = this.requireSessionRateHz(entry, request.rateHz);
    const availability = await this.availabilityFor(entry.id);
    if (availability !== "available") {
      throw new DeviceError(
        availability === "busy" ? "DEVICE_BUSY" : "DEVICE_UNSUPPORTED",
        `Device class "${entry.id}" is ${availability}.`,
      );
    }

    const ttlMs = Math.min(
      request.maxDurationMs ?? grant.maxSessionMs,
      grant.maxSessionMs,
      entry.defaults.maxSessionMs,
      SENSITIVE_DEFAULT_TTL_MS,
    );
    const holder = `remote:${request.peerId}`;
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
    const sidecarToken = remoteSidecarNeeded(entry.id)
      ? this.sidecar.open(handle)
      : null;
    this.sessions.set(handle, {
      handle,
      state,
      rateHz,
      purpose: request.purpose,
      consentClass: tier.consentClass,
      sidecarToken,
      remotePeerId: request.peerId,
      options: {},
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

  private assertRemoteConcurrency(
    hostLive: number,
    peerConcurrent: number,
    grant: RemoteDeviceGrant | undefined,
  ): void {
    if (hostLive >= this.maxRemoteSessions) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Host remote session concurrency cap reached.",
      );
    }
    if (peerConcurrent >= (grant?.maxConcurrent ?? 1)) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Per-peer remote concurrency cap reached.",
      );
    }
  }

  protected abstract materializeSample(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample;

  protected abstract assertCommandMatchesSession(
    live: LiveSession,
    command: DeviceCommand,
  ): void;

  protected abstract confirmNfcWrite(options: {
    readonly appId: string;
    readonly publisherPublicKey: string;
    readonly purpose: string;
    readonly ndef: string;
  }): Promise<void>;
}

function remoteSidecarNeeded(classId: string): boolean {
  return ["camera", "microphone", "motion", "screen-capture"].includes(classId);
}
