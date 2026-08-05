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
  type StreamPlane,
} from "@twistedpear/protocol";
import { assertCapabilityAllowed, CapabilityError } from "../capabilities.js";
import {
  requestHostConfirmation,
  type ConfirmationEffects,
  type HostConfirmationChannel,
} from "../confirm.js";
import {
  DeviceStreamSidecar,
  type DeviceSidecarDelivery,
} from "../device-sidecar.js";
import type { StreamEgress, StreamEgressFactory } from "../media-stream.js";
import {
  createHostBridgedDrivers,
  type DeviceHostBridge,
} from "../drivers/host-bridge.js";
import {
  DeviceError,
  MAX_PURPOSE_LENGTH,
  SENSITIVE_DEFAULT_TTL_MS,
  applyAdvisoryCandidateCeilings,
  assertDeviceCapabilityAllowed,
  bytesToHex,
  codecMatchesTier,
  createActuatorDriver,
  createHybridDeviceDrivers,
  createSimulatedAmbientLightDriver,
  createSimulatedBiometricDriver,
  createSimulatedCameraDriver,
  createSimulatedDeviceDrivers,
  createSimulatedDeviceManager,
  createSimulatedHapticsDriver,
  createSimulatedLocationDriver,
  createSimulatedMicrophoneDriver,
  createSimulatedMotionDriver,
  createSimulatedNfcDriver,
  createSimulatedRawCameraDriver,
  createSimulatedRawMicrophoneDriver,
  createSimulatedRawMotionDriver,
  createSimulatedScalarDriver,
  createSimulatedScreenCaptureDriver,
  createSimulatedSpeakerDriver,
  createSimulatedSttDriver,
  createSimulatedTorchDriver,
  createSimulatedTtsDriver,
  encodeDerivedEvent,
  expandDeviceCapabilities,
  floatSamplesToBytes,
} from "./shared.js";
import type {
  DeviceActiveIndicator,
  DeviceAvailability,
  DeviceChromeSession,
  DeviceDescriptor,
  DeviceDiagnostic,
  DeviceDriver,
  DeviceManagerOptions,
  DeviceOpenRequest,
  DevicePeerHandle,
  DeviceSample,
  DeviceSession,
  DeviceSessionHandle,
  DeviceStreamConstraints,
  DeviceStreamHandle,
  DeviceStreamSession,
  LiveSession,
  RemoteOpenRequest,
  SimulatedActuatorLog,
} from "./shared.js";
import { DeviceManager } from "../device-manager.js";
export class DeviceManagerLayer1 {
  protected readonly drivers = new Map<string, DeviceDriver>();
  protected readonly sessions = new Map<DeviceSessionHandle, LiveSession>();
  protected readonly streams = new Map<
    DeviceStreamHandle,
    DeviceStreamSession
  >();
  protected readonly egresses = new Map<DeviceStreamHandle, StreamEgress>();
  protected readonly streamShareOfferIds = new Map<
    DeviceStreamHandle,
    string
  >();
  protected readonly streamAdaptation = new Map<
    DeviceStreamHandle,
    {
      appId: string;
      peer: string;
      demand: StreamDemand;
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
    if (
      request.options?.voiceDuplex !== undefined &&
      typeof request.options.voiceDuplex !== "boolean"
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "voiceDuplex must be a boolean.",
      );
    }
    if (
      request.options?.voiceDuplex === true &&
      entry.id !== "microphone" &&
      entry.id !== "speaker"
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "voiceDuplex is only valid for microphone or speaker sessions.",
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
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${entry.id}" is unsupported on this host.`,
      );
    }
    if (availability === "policy-disabled") {
      throw new DeviceError(
        "DEVICE_DENIED",
        `Device class "${entry.id}" is disabled by host policy.`,
      );
    }
    if (availability === "permission-required") {
      throw new DeviceError(
        "DEVICE_DENIED",
        `Device class "${entry.id}" requires host permission.`,
      );
    }
    if (availability === "offline") {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${entry.id}" is offline.`,
      );
    }
    if (availability === "busy") {
      const holder =
        this.locks.get(entry.id) ??
        this.options.externalHolders?.().get(entry.id) ??
        "unknown";
      throw new DeviceError(
        "DEVICE_BUSY",
        `Device class "${entry.id}" is busy (held by ${holder}).`,
      );
    }

    const rateHz = request.rateHz ?? Math.min(1, entry.defaults.maxRateHz);
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

  async stream(
    appId: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    sessionHandle: DeviceSessionHandle,
    peer: DevicePeerHandle,
    constraints: DeviceStreamConstraints = {},
  ): Promise<DeviceStreamSession> {
    try {
      assertDeviceCapabilityAllowed({
        capability: "device:stream",
        declared,
        granted,
      });
    } catch (error) {
      if (error instanceof CapabilityError) {
        throw new DeviceError("DEVICE_DENIED", error.message);
      }
      throw error;
    }

    if (typeof peer !== "string" || peer.length < 1 || peer.length > 128) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "A peer handle is required to stream.",
      );
    }

    const live = this.requireLiveSession(appId, sessionHandle);
    if (live.remotePeerId !== null && live.remotePeerId !== peer) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Remote-acquired devices cannot be re-served to a third peer.",
      );
    }
    const entry = deviceClassById(live.state.classId);
    if (entry === undefined || !entry.streamable) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${live.state.classId}" is not streamable.`,
      );
    }
    const shareOffer = [...this.shareOffers.values()].find(
      (offer) =>
        offer.appId === appId &&
        ((offer.targetKind === "peer" && offer.targetId === peer) ||
          (offer.targetKind === "group" &&
            this.options.shareOfferTargetsPeer?.(offer, peer) === true)) &&
        offer.classId === live.state.classId &&
        offer.tierId === live.state.tierId &&
        isShareOfferLive(offer, this.now()),
    );
    if (shareOffer === undefined) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Host share policy does not permit this stream.",
      );
    }

    if (this.options.linkSupply === undefined) {
      throw new DeviceError(
        "DEVICE_UNCONFIGURED",
        "No host-owned link measurement is configured for streaming.",
      );
    }
    const hostCandidates = await this.options.linkSupply(appId, peer);
    const preferred =
      constraints.preferredPlane === undefined
        ? hostCandidates
        : hostCandidates.filter(
            (candidate) => candidate.plane === constraints.preferredPlane,
          );
    const candidates = applyAdvisoryCandidateCeilings(
      preferred,
      constraints.candidates,
    );

    const bandwidthProfile = entry.bandwidth[live.state.tierId];
    if (
      constraints.encoding !== undefined &&
      bandwidthProfile?.encodings?.[constraints.encoding] === undefined
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Requested media encoding profile is unsupported.",
      );
    }
    if (
      constraints.codec !== undefined &&
      !codecMatchesTier(
        live.state.classId,
        live.state.tierId,
        constraints.codec,
      )
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Requested media codec is unsupported for this device tier.",
      );
    }

    const demand = {
      classId: live.state.classId,
      tierId: live.state.tierId,
      rateHz: live.rateHz,
      ...(constraints.encoding === undefined
        ? {}
        : { encoding: constraints.encoding }),
      ...(constraints.codec === undefined ? {} : { codec: constraints.codec }),
    };
    let admission = decideStreamAdmission(demand, candidates);

    if (admission.kind === "reject") {
      throw new DeviceError("DEVICE_BANDWIDTH_INSUFFICIENT", admission.reason);
    }
    const ladder = degradationLadderFor(live.state.classId);
    const maximumRungIndex = ladder.indexOf(shareOffer.maxRung);
    if (maximumRungIndex < 0) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Host share policy contains an invalid quality ceiling.",
      );
    }
    if (admission.rungIndex < maximumRungIndex) {
      const rungDelta = maximumRungIndex - admission.rungIndex;
      admission = {
        ...admission,
        kind: "degrade",
        rung: ladder[maximumRungIndex] ?? shareOffer.maxRung,
        rungIndex: maximumRungIndex,
        admittedDemandBps: admission.admittedDemandBps / 2 ** rungDelta,
        reason: `limited by host share policy to ${shareOffer.maxRung}`,
      };
    }
    if (this.options.streamEgressFactory === undefined) {
      throw new DeviceError(
        "DEVICE_UNCONFIGURED",
        "No host media egress is configured for this plane.",
      );
    }

    const handle = `stream-${this.nextStreamHandle++}-${bytesToHex(this.randomBytes(3))}`;
    const stream: DeviceStreamSession = {
      handle,
      session: sessionHandle,
      peer,
      admission,
    };
    let egress: StreamEgress;
    try {
      egress = await this.options.streamEgressFactory.create({
        appId,
        peer,
        demand,
        admission,
      });
    } catch (error) {
      throw new DeviceError(
        "DEVICE_UNCONFIGURED",
        error instanceof Error
          ? error.message
          : "Host media egress could not be opened.",
      );
    }
    if (egress.plane !== admission.plane) {
      await egress.close();
      throw new DeviceError(
        "DEVICE_UNCONFIGURED",
        "Host media egress returned the wrong plane.",
      );
    }
    this.streams.set(handle, stream);
    this.egresses.set(handle, egress);
    this.streamShareOfferIds.set(handle, shareOffer.id);
    this.streamAdaptation.set(handle, {
      appId,
      peer,
      demand,
      deficitStreak: 0,
      surplusStreak: 0,
    });
    return stream;
  }

  async closeStream(
    appId: string,
    streamHandle: DeviceStreamHandle,
  ): Promise<void> {
    const stream = this.streams.get(streamHandle);
    if (stream === undefined) {
      throw new DeviceError(
        "DEVICE_SESSION_EXPIRED",
        `Unknown stream "${streamHandle}".`,
      );
    }
    const session = this.sessions.get(stream.session);
    if (session !== undefined && session.state.appId !== appId) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Stream is not scoped to this app.",
      );
    }
    this.streams.delete(streamHandle);
    this.streamShareOfferIds.delete(streamHandle);
    this.streamAdaptation.delete(streamHandle);
    const egress = this.egresses.get(streamHandle);
    this.egresses.delete(streamHandle);
    await egress?.close();
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
      // Simulation / unit hosts may omit chrome; elevated still requires an explicit channel when provided.
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

  protected pushSidecar(
    session: LiveSession,
    sampleKind: (typeof DEVICE_STREAM_KIND)[keyof typeof DEVICE_STREAM_KIND],
    payload: Uint8Array,
  ): DeviceSidecarDelivery | undefined {
    if (session.sidecarToken === null) return undefined;
    const delivery = this.sidecar.push({
      sessionHandle: session.handle,
      sessionToken: session.sidecarToken,
      sampleKind,
      sequence: Math.floor(this.now()),
      captureAtUs: Math.floor(this.now() * 1_000),
      clockId: session.sidecarToken,
      payload,
    });
    for (const [streamHandle, stream] of this.streams) {
      if (stream.session !== session.handle) continue;
      const egress = this.egresses.get(streamHandle);
      if (egress !== undefined)
        void this.sendFramesToEgress(streamHandle, egress, delivery.frames);
    }
    return delivery;
  }

  protected async sendFramesToEgress(
    streamHandle: DeviceStreamHandle,
    egress: StreamEgress,
    frames: ReadonlyArray<Uint8Array>,
  ): Promise<void> {
    const offerId = this.streamShareOfferIds.get(streamHandle);
    if (
      !isShareOfferLive(
        offerId === undefined ? undefined : this.shareOffers.get(offerId),
        this.now(),
      )
    ) {
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
        const effectiveBps =
          droppedOldest > 0 || queuedBytes > 0
            ? Math.min(
                quality.goodputBps,
                stream.admission.admittedDemandBps / 2,
              )
            : quality.goodputBps;
        const deficit = effectiveBps < stream.admission.admittedDemandBps;
        const surplus =
          effectiveBps >=
          Math.min(
            stream.admission.demandBps,
            stream.admission.admittedDemandBps * 2,
          );
        const deficitStreak =
          droppedOldest > 0 ? 2 : deficit ? context.deficitStreak + 1 : 0;
        const surplusStreak = surplus ? context.surplusStreak + 1 : 0;
        const admission = adaptStreamAdmission({
          previous: stream.admission,
          supply: {
            plane: egress.plane,
            effectiveBps,
            headroomBps: effectiveBps,
            measuredGoodputBps: effectiveBps,
            queueDepthBytes: queuedBytes,
          },
          ladder: degradationLadderFor(
            this.sessions.get(stream.session)?.state.classId ?? "",
          ),
          deficitStreak,
          surplusStreak,
        });
        this.streamAdaptation.set(streamHandle, {
          ...context,
          deficitStreak,
          surplusStreak,
        });
        if (admission.rungIndex !== stream.admission.rungIndex) {
          await egress.close();
          const replacement = await this.options.streamEgressFactory!.create({
            appId: context.appId,
            peer: context.peer,
            demand: context.demand,
            admission,
          });
          if (replacement.plane !== admission.plane) {
            await replacement.close();
            throw new Error("Adapted media egress returned the wrong plane.");
          }
          this.egresses.set(streamHandle, replacement);
          this.streams.set(streamHandle, { ...stream, admission });
          this.streamAdaptation.set(streamHandle, {
            ...context,
            deficitStreak: 0,
            surplusStreak: 0,
          });
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

  protected closeStreamsForShareOffer(offerId: string | undefined): void {
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

  protected async stopDriver(classId: string): Promise<void> {
    const driver = this.drivers.get(classId);
    await driver?.stop?.();
  }
}
