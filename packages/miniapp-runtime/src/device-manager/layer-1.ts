import {
  DEVICE_STREAM_KIND,
  adaptStreamAdmission,
  decideStreamAdmission,
  degradationLadderFor,
  deviceClassById,
  isShareOfferLive,
  type ShareOffer,
  type StreamDemand,
} from "@twistedpear/protocol";
import { CapabilityError } from "../capabilities.js";
import {
  DeviceStreamSidecar,
  type DeviceSidecarDelivery,
} from "../device-sidecar.js";
import type { StreamEgress } from "../media-stream.js";
import {
  DeviceError,
  applyAdvisoryCandidateCeilings,
  assertDeviceCapabilityAllowed,
  bytesToHex,
  codecMatchesTier,
} from "./shared.js";
import type {
  DevicePeerHandle,
  DeviceStreamConstraints,
  DeviceStreamHandle,
  DeviceStreamSession,
  LiveSession,
} from "./shared.js";
import { DeviceManagerLayer1Base } from "./layer-1-base.js";

type StreamAdaptationContext = {
  appId: string;
  peer: string;
  demand: StreamDemand;
  deficitStreak: number;
  surplusStreak: number;
};

export class DeviceManagerLayer1 extends DeviceManagerLayer1Base {
  async stream(
    appId: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    sessionHandle: import("./shared.js").DeviceSessionHandle,
    peer: DevicePeerHandle,
    constraints: DeviceStreamConstraints = {},
  ): Promise<DeviceStreamSession> {
    this.assertStreamCapability(declared, granted);
    this.assertStreamPeer(peer);
    const live = this.requireLiveSession(appId, sessionHandle);
    if (live.remotePeerId !== null && live.remotePeerId !== peer) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Remote-acquired devices cannot be re-served to a third peer.",
      );
    }
    const admitted = await this.admitDeviceStream({
      appId,
      live,
      peer,
      constraints,
    });
    const { shareOffer, demand, admission } = admitted;
    const handle = `stream-${this.nextStreamHandle++}-${bytesToHex(this.randomBytes(3))}`;
    const stream: DeviceStreamSession = {
      handle,
      session: sessionHandle,
      peer,
      admission,
    };
    const egress = await this.openStreamEgress(appId, peer, demand, admission);
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

  private assertStreamCapability(
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
  ): void {
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
  }

  private assertStreamPeer(peer: DevicePeerHandle): void {
    if (typeof peer !== "string" || peer.length < 1 || peer.length > 128) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "A peer handle is required to stream.",
      );
    }
  }

  private async openStreamEgress(
    appId: string,
    peer: DevicePeerHandle,
    demand: StreamDemand,
    admission: Exclude<
      ReturnType<typeof decideStreamAdmission>,
      { kind: "reject" }
    >,
  ): Promise<StreamEgress> {
    let egress: StreamEgress;
    try {
      egress = await this.options.streamEgressFactory!.create({
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
    return egress;
  }

  private async admitDeviceStream(input: {
    appId: string;
    live: LiveSession;
    peer: DevicePeerHandle;
    constraints: DeviceStreamConstraints;
  }): Promise<{
    shareOffer: ShareOffer;
    demand: StreamDemand;
    admission: Exclude<ReturnType<typeof decideStreamAdmission>, { kind: "reject" }>;
  }> {
    const { appId, live, peer, constraints } = input;
    const entry = deviceClassById(live.state.classId);
    if (entry === undefined || !entry.streamable) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Device class "${live.state.classId}" is not streamable.`,
      );
    }
    const shareOffer = this.requireShareOffer(appId, live, peer);
    const candidates = await this.streamCandidates(appId, peer, constraints);
    this.assertStreamConstraints(entry, live, constraints);

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
    admission = this.applyShareRungCeiling(live, shareOffer, admission);
    if (this.options.streamEgressFactory === undefined) {
      throw new DeviceError(
        "DEVICE_UNCONFIGURED",
        "No host media egress is configured for this plane.",
      );
    }
    return { shareOffer, demand, admission };
  }

  private requireShareOffer(
    appId: string,
    live: LiveSession,
    peer: DevicePeerHandle,
  ): ShareOffer {
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
    return shareOffer;
  }

  private async streamCandidates(
    appId: string,
    peer: DevicePeerHandle,
    constraints: DeviceStreamConstraints,
  ) {
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
    return applyAdvisoryCandidateCeilings(preferred, constraints.candidates);
  }

  private assertStreamConstraints(
    entry: NonNullable<ReturnType<typeof deviceClassById>>,
    live: LiveSession,
    constraints: DeviceStreamConstraints,
  ): void {
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
  }

  private applyShareRungCeiling(
    live: LiveSession,
    shareOffer: ShareOffer,
    admission: Exclude<ReturnType<typeof decideStreamAdmission>, { kind: "reject" }>,
  ): Exclude<ReturnType<typeof decideStreamAdmission>, { kind: "reject" }> {
    const ladder = degradationLadderFor(live.state.classId);
    const maximumRungIndex = ladder.indexOf(shareOffer.maxRung);
    if (maximumRungIndex < 0) {
      throw new DeviceError(
        "DEVICE_DENIED",
        "Host share policy contains an invalid quality ceiling.",
      );
    }
    if (admission.rungIndex >= maximumRungIndex) {
      return admission;
    }
    const rungDelta = maximumRungIndex - admission.rungIndex;
    return {
      ...admission,
      kind: "degrade",
      rung: ladder[maximumRungIndex] ?? shareOffer.maxRung,
      rungIndex: maximumRungIndex,
      admittedDemandBps: admission.admittedDemandBps / 2 ** rungDelta,
      reason: `limited by host share policy to ${shareOffer.maxRung}`,
    };
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
      await this.adaptEgressAfterSend(streamHandle, egress, frames);
    } catch {
      this.streams.delete(streamHandle);
      this.streamShareOfferIds.delete(streamHandle);
      this.streamAdaptation.delete(streamHandle);
      this.egresses.delete(streamHandle);
      await egress.close();
      this.notifyChrome();
    }
  }

  private async adaptEgressAfterSend(
    streamHandle: DeviceStreamHandle,
    egress: StreamEgress,
    frames: ReadonlyArray<Uint8Array>,
  ): Promise<void> {
    let droppedOldest = 0;
    let queuedBytes = 0;
    for (const frame of frames) {
      const result = await egress.send(frame);
      droppedOldest += result.droppedOldest;
      queuedBytes = Math.max(queuedBytes, result.queuedBytes);
    }
    const stream = this.streams.get(streamHandle);
    const context = this.streamAdaptation.get(streamHandle);
    if (stream === undefined || context === undefined) {
      return;
    }
    const quality = egress.quality();
    const effectiveBps = effectiveStreamBps(
      quality.goodputBps,
      stream.admission.admittedDemandBps,
      droppedOldest,
      queuedBytes,
    );
    const deficitStreak = nextDeficitStreak(
      droppedOldest,
      effectiveBps < stream.admission.admittedDemandBps,
      context.deficitStreak,
    );
    const surplusStreak = nextSurplusStreak(
      effectiveBps,
      stream.admission.demandBps,
      stream.admission.admittedDemandBps,
      context.surplusStreak,
    );
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
      await this.replaceAdaptedEgress(
        streamHandle,
        egress,
        stream,
        context,
        admission,
      );
    }
  }

  private async replaceAdaptedEgress(
    streamHandle: DeviceStreamHandle,
    egress: StreamEgress,
    stream: DeviceStreamSession,
    context: StreamAdaptationContext,
    admission: ReturnType<typeof adaptStreamAdmission>,
  ): Promise<void> {
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
}

function effectiveStreamBps(
  goodputBps: number,
  admittedDemandBps: number,
  droppedOldest: number,
  queuedBytes: number,
): number {
  if (droppedOldest > 0 || queuedBytes > 0) {
    return Math.min(goodputBps, admittedDemandBps / 2);
  }
  return goodputBps;
}

function nextDeficitStreak(
  droppedOldest: number,
  deficit: boolean,
  previous: number,
): number {
  if (droppedOldest > 0) return 2;
  return deficit ? previous + 1 : 0;
}

function nextSurplusStreak(
  effectiveBps: number,
  demandBps: number,
  admittedDemandBps: number,
  previous: number,
): number {
  const surplus = effectiveBps >= Math.min(demandBps, admittedDemandBps * 2);
  return surplus ? previous + 1 : 0;
}
