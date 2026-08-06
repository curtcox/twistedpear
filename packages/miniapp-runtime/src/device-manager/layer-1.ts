import {
  DEVICE_STREAM_KIND,
  adaptStreamAdmission,
  decideStreamAdmission,
  degradationLadderFor,
  deviceClassById,
  isShareOfferLive,
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

export class DeviceManagerLayer1 extends DeviceManagerLayer1Base {
  async stream(
    appId: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    sessionHandle: import("./shared.js").DeviceSessionHandle,
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
}
