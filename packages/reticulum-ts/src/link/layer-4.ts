import {
  initialAcceptLinkPacketInterfaceState,
  initialAcceptResourceHashmapUpdateFrameState,
  initialAcceptResourceProofPayloadState,
  initialAcceptResourceProofSplitState,
  initialClassifyLinkKeepaliveState,
  initialContainsResourceHashState,
  initialDispatchLinkPlaintextState,
  initialHandleIncomingResourceByHashState,
  initialIdentifyOnLinkAllowState,
  initialIgnoreInitiatorKeepaliveProbeState,
  initialLinkClosedState,
  initialLinkDataContextState,
  initialLinkHopsMatchState,
  initialLinkIdentifySignedMaterialState,
  initialLinkInboundDataPacketState,
  initialLinkKeepaliveContextState,
  initialLinkReadyForNewResourceState,
  initialLinkTeardownState,
  initialPackLinkIdentifyPayloadState,
  initialPackLinkKeepaliveReplyState,
  initialPendingLinkRequestRegisterState,
  initialRegisterLinkResourceState,
  initialReplyKeepaliveProbeState,
  initialResendLinkPacketAllowState,
  initialSplitResourceHashmapUpdatePacketState,
  initialSplitResourceProofState,
  initialUpdateLinkLastDataState,
  LINK_TRAFFIC_TIMEOUT_FACTOR,
  linkIdentifySignedMaterialRawFromActions,
  packLinkIdentifyPayloadRawFromActions,
  packLinkKeepaliveReplyRawFromActions,
  resourceHashmapUpdatePacketFieldsFromActions,
  resourceProofFieldsFromActions,
  shouldAcceptLinkPacketInterfaceNow,
  shouldAcceptResourceHashmapUpdateFrameNow,
  shouldAcceptResourceProofPayloadNow,
  shouldAcceptResourceProofSplitNow,
  shouldAllowIdentifyOnLink,
  shouldAllowResendLinkPacket,
  shouldClassifyLinkKeepaliveProbe,
  shouldDispatchLinkInboundData,
  shouldDispatchLinkPlaintextNow,
  shouldHandleIncomingResourceByHashNow,
  shouldHandleLinkDataChannel,
  shouldHandleLinkDataClose,
  shouldHandleLinkDataIdentify,
  shouldHandleLinkDataKeepalive,
  shouldHandleLinkDataPlaintext,
  shouldHandleLinkDataRequest,
  shouldHandleLinkDataResource,
  shouldHandleLinkDataResourceAdv,
  shouldHandleLinkDataResourceHmu,
  shouldHandleLinkDataResourceIcl,
  shouldHandleLinkDataResourceRcl,
  shouldHandleLinkDataResourceReq,
  shouldHandleLinkDataResponse,
  shouldHandleLinkDataRtt,
  shouldIgnoreInitiatorKeepaliveProbeNow,
  shouldIgnoreLinkDataContext,
  shouldLinkReadyForNewResource,
  shouldMatchLinkHops,
  shouldPresentResourceHash,
  shouldRegisterLinkResourceNow,
  shouldRegisterPendingLinkRequestNow,
  shouldRejectPackLinkIdentifyPayload,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectSplitResourceProof,
  shouldReplyKeepaliveProbeNow,
  shouldTreatLinkClosed,
  shouldTreatLinkKeepaliveContext,
  shouldUpdateLinkLastDataNow,
  shouldUseLinkIdentifySignedMaterial,
  shouldUsePackLinkIdentifyPayload,
  shouldUsePackLinkKeepaliveReply,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseSplitResourceProof,
  stepAcceptLinkPacketInterfaceWithActions,
  stepAcceptResourceHashmapUpdateFrameWithActions,
  stepAcceptResourceProofPayloadWithActions,
  stepAcceptResourceProofSplitWithActions,
  stepClassifyLinkKeepaliveWithActions,
  stepContainsResourceHashWithActions,
  stepDispatchLinkPlaintextWithActions,
  stepHandleIncomingResourceByHashWithActions,
  stepIdentifyOnLinkAllowWithActions,
  stepIgnoreInitiatorKeepaliveProbeWithActions,
  stepLinkClosedWithActions,
  stepLinkDataContextWithActions,
  stepLinkHopsMatchWithActions,
  stepLinkIdentifySignedMaterialWithActions,
  stepLinkInboundDataPacketWithActions,
  stepLinkKeepaliveContextWithActions,
  stepLinkReadyForNewResourceWithActions,
  stepLinkTeardownWithActions,
  stepLinkWatchdogWithActions,
  stepPackLinkIdentifyPayloadWithActions,
  stepPackLinkKeepaliveReplyWithActions,
  stepPendingLinkRequestRegisterWithActions,
  stepRegisterLinkResourceWithActions,
  stepReplyKeepaliveProbeWithActions,
  stepResendLinkPacketAllowWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepSplitResourceProofWithActions,
  stepUpdateLinkLastDataWithActions,
  type LinkResourceStrategyValue,
} from "./protocol.js";

import type { CryptoProvider } from "../crypto/provider.js";
import { Token } from "../crypto/token.js";
import { Channel, LinkChannelOutlet } from "../channel.js";
import { equalBytes } from "../crypto/bytes.js";
import { DestinationDirection, DestinationType } from "../destination.js";
import { Identity } from "../identity.js";
import type { PacketInterface } from "../interfaces/interface.js";
import { LinkRequestReceipt } from "../link-request-receipt.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../packet.js";
import type { PacketReceipt } from "../packet-receipt.js";
import type {
  RegisteredDestination,
  RequestHandler,
} from "../registered-destination.js";
import { RETICULUM_MTU } from "../reticulum-constants.js";
import type { Clock } from "../runtime/runtime.js";
import type { LeafTransport } from "../transport/node.js";
import { PATHFINDER_MAX_HOPS } from "../transport/node.js";
import { Resource, ResourceAdvertisement } from "../resource.js";
import {
  LINK_ECPUB_SIZE,
  LINK_KEY_SIZE,
  LINK_MTU_SIZE,
  LINK_SIGNATURE_SIZE,
  linkEstablishmentTimeoutForHops,
  linkMduForMtu,
  linkRequestTimeoutForRtt,
  linkRttSecondsForRequest,
  mergedLinkRtt,
} from "./shared.js";
import type {
  InitiatorLinkOptions,
  LinkCallbacks,
  LinkRequestOptions,
  LinkSendContextResult,
} from "./shared.js";
import { LinkLayer3 } from "./layer-3.js";
export class LinkLayer4 extends LinkLayer3 {
  async receive(packet: Packet, iface: PacketInterface): Promise<void> {
    const closedStepped = stepLinkClosedWithActions(initialLinkClosedState(), {
      kind: "link/closed-gate",
      status: this.status,
    });
    if (shouldTreatLinkClosed(closedStepped.actions)) {
      return;
    }

    const keepaliveClassify = stepClassifyLinkKeepaliveWithActions(
      initialClassifyLinkKeepaliveState(),
      {
        kind: "link-keepalive/classify-gate",
        data: packet.data,
      },
    );
    const probePayload = shouldClassifyLinkKeepaliveProbe(
      keepaliveClassify.actions,
    );

    const keepaliveContext = stepLinkKeepaliveContextWithActions(
      initialLinkKeepaliveContextState(),
      {
        kind: "link/keepalive-context-gate",
        context: packet.context,
      },
    );
    const contextKeepalive = shouldTreatLinkKeepaliveContext(
      keepaliveContext.actions,
    );

    const ignoreProbe = stepIgnoreInitiatorKeepaliveProbeWithActions(
      initialIgnoreInitiatorKeepaliveProbeState(),
      {
        kind: "link-keepalive/ignore-initiator-probe-gate",
        initiator: this.initiator,
        contextKeepalive,
        probePayload,
      },
    );
    if (shouldIgnoreInitiatorKeepaliveProbeNow(ignoreProbe.actions)) {
      return;
    }

    const ifaceStepped = stepAcceptLinkPacketInterfaceWithActions(
      initialAcceptLinkPacketInterfaceState(),
      {
        kind: "link/accept-packet-interface-gate",
        hasAttachedInterface: this.attachedInterface !== null,
        sameInterface: iface === this.attachedInterface,
      },
    );
    if (!shouldAcceptLinkPacketInterfaceNow(ifaceStepped.actions)) {
      return;
    }

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "link/inbound",
        at: this.clock.now() / 1000,
      }),
    );
    const lastDataStepped = stepUpdateLinkLastDataWithActions(
      initialUpdateLinkLastDataState(),
      {
        kind: "link/update-last-data-gate",
        contextKeepalive,
      },
    );
    if (shouldUpdateLinkLastDataNow(lastDataStepped.actions)) {
      this.lastData = this.lastInbound;
    }

    const inboundData = stepLinkInboundDataPacketWithActions(
      initialLinkInboundDataPacketState(),
      {
        kind: "link/inbound-data-packet-gate",
        packetType: packet.packetType,
      },
    );
    if (!shouldDispatchLinkInboundData(inboundData.actions)) {
      return;
    }

    const contextStepped = stepLinkDataContextWithActions(
      initialLinkDataContextState(),
      {
        kind: "link/data-context-gate",
        context: packet.context,
      },
    );
    if (shouldHandleLinkDataRtt(contextStepped.actions)) {
      await this.handleRttPacket(packet);
      return;
    }
    if (shouldHandleLinkDataKeepalive(contextStepped.actions)) {
      const replyStepped = stepReplyKeepaliveProbeWithActions(
        initialReplyKeepaliveProbeState(),
        {
          kind: "link-keepalive/reply-probe-gate",
          initiator: this.initiator,
          probePayload,
        },
      );
      if (shouldReplyKeepaliveProbeNow(replyStepped.actions)) {
        await this.sendKeepaliveReply();
      }
      return;
    }
    if (shouldHandleLinkDataClose(contextStepped.actions)) {
      await this.handleTeardownPacket(packet);
      return;
    }
    if (shouldHandleLinkDataIdentify(contextStepped.actions)) {
      await this.handleIdentifyPacket(packet);
      return;
    }
    if (shouldHandleLinkDataRequest(contextStepped.actions)) {
      await this.handleRequestPacket(packet);
      return;
    }
    if (shouldHandleLinkDataResponse(contextStepped.actions)) {
      await this.handleResponsePacket(packet);
      return;
    }
    if (shouldHandleLinkDataChannel(contextStepped.actions)) {
      await this.handleChannelPacket(packet);
      return;
    }
    if (shouldHandleLinkDataResourceAdv(contextStepped.actions)) {
      await this.handleResourceAdvertisementPacket(packet);
      return;
    }
    if (shouldHandleLinkDataResourceReq(contextStepped.actions)) {
      await this.handleResourceRequestPacket(packet);
      return;
    }
    if (shouldHandleLinkDataResourceHmu(contextStepped.actions)) {
      await this.handleResourceHashmapUpdatePacket(packet);
      return;
    }
    if (shouldHandleLinkDataResourceIcl(contextStepped.actions)) {
      await this.handleResourceCancelPacket(packet, true);
      return;
    }
    if (shouldHandleLinkDataResourceRcl(contextStepped.actions)) {
      await this.handleResourceCancelPacket(packet, false);
      return;
    }
    if (shouldHandleLinkDataResource(contextStepped.actions)) {
      await this.handleResourcePartPacket(packet);
      return;
    }
    if (shouldHandleLinkDataPlaintext(contextStepped.actions)) {
      const plaintext = this.decrypt(packet.data);
      if (
        shouldDispatchLinkPlaintextNow(
          stepDispatchLinkPlaintextWithActions(
            initialDispatchLinkPlaintextState(),
            {
              kind: "link/dispatch-plaintext-gate",
              plaintextPresent: plaintext !== null,
            },
          ).actions,
        ) &&
        plaintext !== null
      ) {
        this.callbacks.packet?.(plaintext, packet);
      }
      return;
    }
    if (shouldIgnoreLinkDataContext(contextStepped.actions)) {
      return;
    }
  }

  identify(identity: Identity): void {
    const identifyAllow = stepIdentifyOnLinkAllowWithActions(
      initialIdentifyOnLinkAllowState(),
      {
        kind: "link/identify-allow-gate",
        status: this.status,
        initiator: this.initiator,
      },
    );
    if (
      !shouldAllowIdentifyOnLink(identifyAllow.actions) ||
      identity === null
    ) {
      return;
    }

    const publicKey = identity.getPublicKey();
    const signedStepped = stepLinkIdentifySignedMaterialWithActions(
      initialLinkIdentifySignedMaterialState(),
      {
        kind: "link-identify/signed-material-gate",
        linkId: this.linkId,
        publicKey,
      },
    );
    const signedData = shouldUseLinkIdentifySignedMaterial(
      signedStepped.actions,
    )
      ? linkIdentifySignedMaterialRawFromActions(signedStepped.actions)
      : null;
    if (signedData === null) {
      throw new Error("Link.identify: missing signed-material use-raw action");
    }
    const signature = identity.sign(signedData);
    const packStepped = stepPackLinkIdentifyPayloadWithActions(
      initialPackLinkIdentifyPayloadState(),
      {
        kind: "link-identify/pack-gate",
        publicKey,
        signature,
      },
    );
    if (
      shouldRejectPackLinkIdentifyPayload(packStepped.actions) ||
      !shouldUsePackLinkIdentifyPayload(packStepped.actions)
    ) {
      throw new Error("Link.identify: missing use-raw action");
    }
    const payload = packLinkIdentifyPayloadRawFromActions(packStepped.actions);
    if (payload === null) {
      throw new Error("Link.identify: missing use-raw action");
    }
    void this.sendContext(PacketContext.LINKIDENTIFY, payload);
  }

  getRemoteIdentity(): Identity | null {
    return this.remoteIdentity;
  }

  get linkTransport(): LeafTransport {
    return this.transport;
  }

  async sendProof(context: number, data: Uint8Array): Promise<void> {
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.PROOF,
      destinationHash: this.linkId,
      context,
      data,
    });
    await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
    });
  }

  readyForNewResource(): boolean {
    const ready = stepLinkReadyForNewResourceWithActions(
      initialLinkReadyForNewResourceState(),
      {
        kind: "link/ready-for-new-resource-gate",
        outgoingCount: this.outgoingResourcesList.length,
      },
    );
    return shouldLinkReadyForNewResource(ready.actions);
  }

  registerOutgoingResource(resource: Resource): void {
    const registerOutgoing = stepRegisterLinkResourceWithActions(
      initialRegisterLinkResourceState(),
      {
        kind: "link/register-resource-gate",
        alreadyPresent: this.outgoingResourcesList.includes(resource),
      },
    );
    if (shouldRegisterLinkResourceNow(registerOutgoing.actions)) {
      this.outgoingResourcesList.push(resource);
    }
  }

  registerIncomingResource(resource: Resource): void {
    const registerIncoming = stepRegisterLinkResourceWithActions(
      initialRegisterLinkResourceState(),
      {
        kind: "link/register-resource-gate",
        alreadyPresent: this.incomingResourcesList.includes(resource),
      },
    );
    if (shouldRegisterLinkResourceNow(registerIncoming.actions)) {
      this.incomingResourcesList.push(resource);
    }
  }

  hasIncomingResource(resource: Resource): boolean {
    const stepped = stepContainsResourceHashWithActions(
      initialContainsResourceHashState(),
      {
        kind: "resource-hashmap/contains-hash-gate",
        hashes: this.incomingResourcesList.map((incoming) => incoming.hash),
        target: resource.hash,
      },
    );
    return shouldPresentResourceHash(stepped.actions);
  }

  setResourceStrategy(strategy: LinkResourceStrategyValue): void {
    this.resourceStrategy = strategy;
  }

  get trafficTimeoutFactor(): number {
    return LINK_TRAFFIC_TIMEOUT_FACTOR;
  }

  registerPendingRequest(receipt: LinkRequestReceipt): void {
    const register = stepPendingLinkRequestRegisterWithActions(
      initialPendingLinkRequestRegisterState(),
      {
        kind: "link/pending-request-register-gate",
        alreadyPresent: this.pendingRequests.includes(receipt),
      },
    );
    if (shouldRegisterPendingLinkRequestNow(register.actions)) {
      this.pendingRequests.push(receipt);
    }
  }

  async sendResourcePart(data: Uint8Array): Promise<void> {
    await this.sendContext(PacketContext.RESOURCE, data, { encrypt: false });
  }

  async resendPacket(
    raw: Uint8Array,
    options: { createReceipt?: boolean } = {},
  ): Promise<LinkSendContextResult | null> {
    const packet = Packet.decode(this.provider, raw);
    const resendAllow = stepResendLinkPacketAllowWithActions(
      initialResendLinkPacketAllowState(),
      {
        kind: "link/resend-packet-allow-gate",
        packetDecoded: packet !== null,
        attachedInterfacePresent: this.attachedInterface !== null,
      },
    );
    if (!shouldAllowResendLinkPacket(resendAllow.actions) || packet === null) {
      return null;
    }

    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false,
    });

    return { raw, receipt };
  }

  hopsMatch(packet: Packet): boolean {
    const stepped = stepLinkHopsMatchWithActions(initialLinkHopsMatchState(), {
      kind: "link/hops-match-gate",
      expectedHops: this.expectedHops,
      packetHops: packet.hops,
      pathfinderMaxHops: PATHFINDER_MAX_HOPS,
    });
    return shouldMatchLinkHops(stepped.actions);
  }

  protected handleChannelPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (
      !shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(
          initialDispatchLinkPlaintextState(),
          {
            kind: "link/dispatch-plaintext-gate",
            plaintextPresent: plaintext !== null,
          },
        ).actions,
      )
    ) {
      return Promise.resolve();
    }

    this.getChannel().receive(plaintext!);
    return Promise.resolve();
  }

  protected handleResourceCancelPacket(
    packet: Packet,
    incoming: boolean,
  ): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (
      !shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(
          initialDispatchLinkPlaintextState(),
          {
            kind: "link/dispatch-plaintext-gate",
            plaintextPresent: plaintext !== null,
          },
        ).actions,
      )
    ) {
      return Promise.resolve();
    }

    const splitStepped = stepSplitResourceHashmapUpdatePacketWithActions(
      initialSplitResourceHashmapUpdatePacketState(),
      {
        kind: "resource-hashmap/split-packet-gate",
        plaintext: plaintext!,
      },
    );
    const split = shouldRejectSplitResourceHashmapUpdatePacket(
      splitStepped.actions,
    )
      ? null
      : shouldUseSplitResourceHashmapUpdatePacket(splitStepped.actions)
        ? resourceHashmapUpdatePacketFieldsFromActions(splitStepped.actions)
        : null;
    if (
      !shouldAcceptResourceHashmapUpdateFrameNow(
        stepAcceptResourceHashmapUpdateFrameWithActions(
          initialAcceptResourceHashmapUpdateFrameState(),
          {
            kind: "resource-hashmap/accept-update-frame-gate",
            splitOk: split !== null,
          },
        ).actions,
      )
    ) {
      return Promise.resolve();
    }
    const resources = incoming
      ? this.incomingResourcesList
      : this.outgoingResourcesList;
    for (const resource of resources) {
      if (
        shouldHandleIncomingResourceByHashNow(
          stepHandleIncomingResourceByHashWithActions(
            initialHandleIncomingResourceByHashState(),
            {
              kind: "link/handle-incoming-resource-by-hash-gate",
              hashMatches: equalBytes(resource.hash, split!.resourceHash),
            },
          ).actions,
        )
      ) {
        resource.cancel();
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  handleResourceProof(packet: Packet): Promise<void> {
    if (
      !shouldAcceptResourceProofPayloadNow(
        stepAcceptResourceProofPayloadWithActions(
          initialAcceptResourceProofPayloadState(),
          {
            kind: "resource-proof/accept-payload-gate",
            dataLength: packet.data.length,
          },
        ).actions,
      )
    ) {
      return Promise.resolve();
    }
    const stepped = stepSplitResourceProofWithActions(
      initialSplitResourceProofState(),
      {
        kind: "resource-proof/split-gate",
        proofData: packet.data,
      },
    );
    const split =
      shouldRejectSplitResourceProof(stepped.actions) ||
      !shouldUseSplitResourceProof(stepped.actions)
        ? null
        : resourceProofFieldsFromActions(stepped.actions);
    if (
      !shouldAcceptResourceProofSplitNow(
        stepAcceptResourceProofSplitWithActions(
          initialAcceptResourceProofSplitState(),
          {
            kind: "resource-proof/accept-split-gate",
            splitOk: split !== null,
          },
        ).actions,
      )
    ) {
      return Promise.resolve();
    }
    const proofFields = split!;
    for (const resource of this.outgoingResourcesList) {
      if (
        shouldHandleIncomingResourceByHashNow(
          stepHandleIncomingResourceByHashWithActions(
            initialHandleIncomingResourceByHashState(),
            {
              kind: "link/handle-incoming-resource-by-hash-gate",
              hashMatches: equalBytes(resource.hash, proofFields.resourceHash),
            },
          ).actions,
        )
      ) {
        resource.validateProof(packet.data);
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  protected handleResourcePartPacket(packet: Packet): Promise<void> {
    for (const resource of this.incomingResourcesList) {
      resource.receivePart(packet);
    }
    return Promise.resolve();
  }

  protected async handleTeardownPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    await this.applyLinkTeardownActions(
      stepLinkTeardownWithActions(
        initialLinkTeardownState({
          status: this.status,
          initiator: this.initiator,
        }),
        {
          kind: "teardown/remote",
          plaintextPresent: plaintext !== null,
          linkIdMatches:
            plaintext !== null && equalBytes(plaintext, this.linkId),
        },
      ).actions,
    );
  }

  protected async sendKeepaliveReply(): Promise<void> {
    const packReply = stepPackLinkKeepaliveReplyWithActions(
      initialPackLinkKeepaliveReplyState(),
      { kind: "link-keepalive/pack-reply-gate" },
    );
    if (!shouldUsePackLinkKeepaliveReply(packReply.actions)) {
      throw new Error("Link.sendKeepaliveReply: missing use-raw action");
    }
    const reply = packLinkKeepaliveReplyRawFromActions(packReply.actions);
    if (reply === null) {
      throw new Error("Link.sendKeepaliveReply: missing use-raw action");
    }
    await this.sendContext(PacketContext.KEEPALIVE, reply);
  }
}
