import { DEVICE_CLASS_REGISTRY,DEVICE_STREAM_KIND,ActuatorSafetyError,assertAidAllowed,adaptStreamAdmission,decideStreamAdmission,degradationLadderFor,defaultTierForClass,deriveCameraSample,deriveMicrophoneSample,deriveMotionSample,deviceCapabilityId,deviceClassById,initialDeviceSessionState,initialRemoteGrantStore,initialShareOfferStore,isDeviceSessionLive,isRemoteGrantLive,isShareOfferLive,quantizeAmbientLux,quantizeLocationCoarse,remoteGrantKey,sanitizeCameraFrame,sanitizeMotionSamples,sanitizePcmSample,stepDeviceSession,stepRemoteGrantStore,stepShareOfferStore,validateActuatorCommand,type AdmissionDecision,type CameraDerivedInput,type DeviceClassEntry,type DeviceCommand,type DeviceConsentClass,type DeviceSessionState,type LinkSupply,type MicrophoneDerivedInput,type PreciseLocationFix,type RawCameraFrameInput,type RawMotionInput,type RawMotionSample,type RawPcmInput,type RemoteDeviceGrant,type ShareOffer,type StreamDemand,type StreamPlane } from "@twistedpear/protocol";
import { assertCapabilityAllowed,CapabilityError } from "../capabilities.js";
import { requestHostConfirmation,type ConfirmationEffects,type HostConfirmationChannel } from "../confirm.js";
import { DeviceStreamSidecar,type DeviceSidecarDelivery } from "../device-sidecar.js";
import type { StreamEgress,StreamEgressFactory } from "../media-stream.js";
import { createHostBridgedDrivers,type DeviceHostBridge } from "../drivers/host-bridge.js";
import { DeviceError, MAX_PURPOSE_LENGTH, SENSITIVE_DEFAULT_TTL_MS, applyAdvisoryCandidateCeilings, assertDeviceCapabilityAllowed, bytesToHex, codecMatchesTier, createActuatorDriver, createHybridDeviceDrivers, createSimulatedAmbientLightDriver, createSimulatedBiometricDriver, createSimulatedCameraDriver, createSimulatedDeviceDrivers, createSimulatedDeviceManager, createSimulatedHapticsDriver, createSimulatedLocationDriver, createSimulatedMicrophoneDriver, createSimulatedMotionDriver, createSimulatedNfcDriver, createSimulatedRawCameraDriver, createSimulatedRawMicrophoneDriver, createSimulatedRawMotionDriver, createSimulatedScalarDriver, createSimulatedScreenCaptureDriver, createSimulatedSpeakerDriver, createSimulatedSttDriver, createSimulatedTorchDriver, createSimulatedTtsDriver, encodeDerivedEvent, expandDeviceCapabilities, floatSamplesToBytes } from "./shared.js";
import type { DeviceActiveIndicator, DeviceAvailability, DeviceChromeSession, DeviceDescriptor, DeviceDiagnostic, DeviceDriver, DeviceManagerOptions, DeviceOpenRequest, DevicePeerHandle, DeviceSample, DeviceSession, DeviceSessionHandle, DeviceStreamConstraints, DeviceStreamHandle, DeviceStreamSession, LiveSession, RemoteOpenRequest, SimulatedActuatorLog } from "./shared.js";
import { DeviceManager } from "../device-manager.js";
import { DeviceManagerLayer1 } from "./layer-1.js";
export class DeviceManagerLayer2 extends DeviceManagerLayer1 {
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

  protected materializeSample(
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

  protected assertCommandMatchesSession(classId: string, command: DeviceCommand): void {
    if (command.kind !== classId) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        `Command kind "${command.kind}" does not match session class "${classId}".`
      );
    }
  }

  protected async confirmNfcWrite(options: {
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
}
