import {
  identityPublicKeyFieldsFromActions,
  incomingLinkResourceConcludeIndex,
  initialAcceptLinkIdentifyState,
  initialAcceptLinkRttState,
  initialAcceptResourceHashmapUpdateFrameState,
  initialAttemptLinkProofCryptoState,
  initialClassifyLinkProofPayloadState,
  initialCommitLinkRemoteIdentityState,
  initialCreateLinkChannelState,
  initialDeliverPendingLinkAppResponseState,
  initialDispatchLinkPlaintextState,
  initialExpectedLinkModeState,
  initialHandleIncomingResourceByHashState,
  initialHandleOutgoingResourceRequestState,
  initialIndexOfPendingLinkAppRequestState,
  initialInvokeLinkAppRequestHandlerState,
  initialLinkAppRequestInboundState,
  initialLinkEstablishState,
  initialLinkIdentifySignedMaterialState,
  initialLinkIdentifyState,
  initialLinkProofSignedMaterialState,
  initialLinkProofValidateState,
  initialLinkResourceAdvertisementState,
  initialLinkResourceConcludeState,
  initialPackLinkResponseState,
  initialSendLinkAppRequestResponseState,
  initialSplitIdentityPublicKeyState,
  initialSplitLinkIdentifyPayloadState,
  initialSplitLinkProofBodyState,
  initialSplitResourceHashmapUpdatePacketState,
  initialUnpackLinkRequestState,
  initialUnpackLinkResponseState,
  initialValidateLinkProofAllowState,
  LINK_PROOF_BODY_SIZE,
  linkIdentifyPayloadFieldsFromActions,
  linkIdentifySignedMaterialRawFromActions,
  linkProofBodyFieldsFromActions,
  linkProofSignedMaterialRawFromActions,
  linkRequestFieldsFromActions,
  linkResponseFieldsFromActions,
  outgoingLinkResourceConcludeIndex,
  packLinkResponseRawFromActions,
  pendingLinkAppRequestIndexFromActions,
  resourceHashmapUpdatePacketFieldsFromActions,
  shouldAcceptLinkIdentifyNow,
  shouldAcceptLinkResourceAdvertisement,
  shouldAcceptLinkRttNow,
  shouldAcceptResourceHashmapUpdateFrameNow,
  shouldAllowValidateLinkProof,
  shouldAskAppLinkResourceAdvertisement,
  shouldAttemptLinkProofCryptoNow,
  shouldClassifyLinkProofPayloadBodyOnly,
  shouldClassifyLinkProofPayloadBodyWithMtu,
  shouldCommitLinkIdentify,
  shouldCommitLinkRemoteIdentityNow,
  shouldCreateLinkChannelNow,
  shouldDeliverPendingLinkAppResponseNow,
  shouldDispatchLinkPlaintextNow,
  shouldForbidLinkAppRequestInbound,
  shouldHandleIncomingResourceByHashNow,
  shouldHandleOutgoingResourceRequestNow,
  shouldIgnoreLinkAppRequestInbound,
  shouldIgnoreLinkAppRequestInboundResponse,
  shouldIgnoreLinkResourceAdvertisement,
  shouldInvokeLinkAppRequestHandlerNow,
  shouldInvokeLinkAppRequestInbound,
  shouldMatchExpectedLinkMode,
  shouldRejectLinkAppRequestInboundTooBig,
  shouldRejectLinkIdentify,
  shouldRejectLinkProofValidate,
  shouldRejectLinkResourceAdvertisement,
  shouldRejectSplitLinkIdentifyPayload,
  shouldRejectSplitLinkProofBody,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectUnpackLinkRequest,
  shouldRejectUnpackLinkResponse,
  shouldRemoveIncomingLinkResourceConclude,
  shouldRemoveOutgoingLinkResourceConclude,
  shouldSendLinkAppRequestInboundResponse,
  shouldSendLinkAppRequestResponseNow,
  shouldUseLinkIdentifySignedMaterial,
  shouldUseLinkProofSignedMaterial,
  shouldUsePackLinkResponse,
  shouldUsePendingLinkAppRequestIndex,
  shouldUseSplitIdentityPublicKey,
  shouldUseSplitLinkIdentifyPayload,
  shouldUseSplitLinkProofBody,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseUnpackLinkRequest,
  shouldUseUnpackLinkResponse,
  stepAcceptLinkIdentifyWithActions,
  stepAcceptLinkRttWithActions,
  stepAcceptResourceHashmapUpdateFrameWithActions,
  stepAttemptLinkProofCryptoWithActions,
  stepClassifyLinkProofPayloadWithActions,
  stepCommitLinkRemoteIdentityWithActions,
  stepCreateLinkChannelWithActions,
  stepDeliverPendingLinkAppResponseWithActions,
  stepDispatchLinkPlaintextWithActions,
  stepExpectedLinkModeWithActions,
  stepHandleIncomingResourceByHashWithActions,
  stepHandleOutgoingResourceRequestWithActions,
  stepIndexOfPendingLinkAppRequestWithActions,
  stepInvokeLinkAppRequestHandlerWithActions,
  stepLinkAppRequestInboundWithActions,
  stepLinkEstablishWithActions,
  stepLinkIdentifySignedMaterialWithActions,
  stepLinkIdentifyWithActions,
  stepLinkProofSignedMaterialWithActions,
  stepLinkProofValidateWithActions,
  stepLinkResourceAdvertisementWithActions,
  stepLinkResourceConcludeWithActions,
  stepPackLinkResponseWithActions,
  stepSendLinkAppRequestResponseWithActions,
  stepSplitIdentityPublicKeyWithActions,
  stepSplitLinkIdentifyPayloadWithActions,
  stepSplitLinkProofBodyWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepUnpackLinkRequestWithActions,
  stepUnpackLinkResponseWithActions,
  stepValidateLinkProofAllowWithActions,
  type LinkAppRequestInboundAction,
  type LinkAppRequestInboundState,
  type LinkIdentifyAction,
  type LinkRequestFields,
  type LinkResourceAdvertisementAction,
  type LinkResourceAdvertisementState,
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
import { RETICULUM_MTU } from "../reticulum.js";
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
import { Link } from "../link.js";
import { LinkLayer2 } from "./layer-2.js";
export class LinkLayer3Core extends LinkLayer2 {
  async validateProof(packet: Packet, iface: PacketInterface): Promise<void> {
    const destination = this.destination;
    const validateAllow = stepValidateLinkProofAllowWithActions(
      initialValidateLinkProofAllowState(),
      {
        kind: "link/validate-proof-allow-gate",
        status: this.status,
        initiator: this.initiator,
        destinationPresent: destination !== null,
      },
    );
    if (
      !shouldAllowValidateLinkProof(validateAllow.actions) ||
      destination === null
    ) {
      return;
    }

    try {
      const mode = Link.modeFromLpPacket(packet);
      const modeMatch = stepExpectedLinkModeWithActions(
        initialExpectedLinkModeState(),
        {
          kind: "link/expected-mode-gate",
          expected: this.mode,
          received: mode,
        },
      );
      const modeMatches = shouldMatchExpectedLinkMode(modeMatch.actions);

      let proofData = packet.data;
      let signallingBytes = new Uint8Array(0);
      let confirmedMtu: number | null = null;

      const layoutStepped = stepClassifyLinkProofPayloadWithActions(
        initialClassifyLinkProofPayloadState(),
        {
          kind: "link-proof/classify-payload-gate",
          dataLength: proofData.length,
        },
      );
      const layoutValid =
        shouldClassifyLinkProofPayloadBodyOnly(layoutStepped.actions) ||
        shouldClassifyLinkProofPayloadBodyWithMtu(layoutStepped.actions);
      if (shouldClassifyLinkProofPayloadBodyWithMtu(layoutStepped.actions)) {
        confirmedMtu = Link.mtuFromLpPacket(packet);
        signallingBytes = Uint8Array.from(
          Link.signallingBytes(confirmedMtu ?? RETICULUM_MTU, mode),
        );
        proofData = proofData.subarray(0, LINK_PROOF_BODY_SIZE);
      }

      const bodyStepped = stepSplitLinkProofBodyWithActions(
        initialSplitLinkProofBodyState(),
        {
          kind: "link-proof/split-body-gate",
          data: proofData,
        },
      );
      const body =
        shouldRejectSplitLinkProofBody(bodyStepped.actions) ||
        !shouldUseSplitLinkProofBody(bodyStepped.actions)
          ? null
          : linkProofBodyFieldsFromActions(bodyStepped.actions);
      const peerSplit =
        body !== null
          ? stepSplitIdentityPublicKeyWithActions(
              initialSplitIdentityPublicKeyState(),
              {
                kind: "identity-key/split-public-gate",
                publicKeyBytes: destination.identity!.getPublicKey(),
              },
            )
          : null;
      const peerPublic =
        peerSplit !== null && shouldUseSplitIdentityPublicKey(peerSplit.actions)
          ? identityPublicKeyFieldsFromActions(peerSplit.actions)
          : null;

      let signatureValid = false;
      const proofCrypto = stepAttemptLinkProofCryptoWithActions(
        initialAttemptLinkProofCryptoState(),
        {
          kind: "link/attempt-proof-crypto-gate",
          modeMatches,
          layoutValid,
          bodyPresent: body !== null,
          peerPublicPresent: peerPublic !== null,
        },
      );
      if (
        shouldAttemptLinkProofCryptoNow(proofCrypto.actions) &&
        body !== null &&
        peerPublic !== null
      ) {
        this.loadPeer(body.peerPublicKey, peerPublic.signaturePublicKey);
        this.handshake();

        const signedStepped = stepLinkProofSignedMaterialWithActions(
          initialLinkProofSignedMaterialState(),
          {
            kind: "link-proof/signed-material-gate",
            linkId: this.linkId,
            publicKey: this.peerPublicKeyBytes!,
            ownerSigPublicKey: peerPublic.signaturePublicKey,
            signallingBytes,
          },
        );
        const signedData = shouldUseLinkProofSignedMaterial(
          signedStepped.actions,
        )
          ? linkProofSignedMaterialRawFromActions(signedStepped.actions)
          : null;
        signatureValid =
          signedData !== null &&
          destination.identity!.validate(body.signature, signedData);
      }

      const proofGate = stepLinkProofValidateWithActions(
        initialLinkProofValidateState(),
        {
          kind: "proof/validate-gate",
          canValidate: true,
          modeMatches,
          layoutValid,
          bodyPresent: body !== null,
          peerPublicPresent: peerPublic !== null,
          signatureValid,
        },
      );
      if (shouldRejectLinkProofValidate(proofGate.actions)) {
        throw new Error("Invalid link request proof");
      }

      const nowSeconds = this.clock.now() / 1000;
      await this.applyLinkEstablishActions(
        stepLinkEstablishWithActions(
          initialLinkEstablishState({
            initiator: this.initiator,
            status: this.status,
          }),
          {
            kind: "establish/activated",
            atSeconds: nowSeconds,
            rtt: linkRttSecondsForRequest(nowSeconds, this.requestTime),
          },
        ).actions,
        {
          prepareInitiatorActivate: () => {
            this.attachedInterface = iface;
            this.mtu = confirmedMtu ?? RETICULUM_MTU;
            this.updateMdu();
            this.establishmentCost += packet.raw.length;
          },
        },
      );
    } catch {
      await this.applyLinkEstablishActions(
        stepLinkEstablishWithActions(
          initialLinkEstablishState({
            initiator: this.initiator,
            status: this.status,
          }),
          { kind: "establish/failed" },
        ).actions,
      );
    }
  }

  async handleRttPacket(packet: Packet): Promise<void> {
    const rttAccept = stepAcceptLinkRttWithActions(
      initialAcceptLinkRttState(),
      {
        kind: "link/accept-rtt-gate",
        status: this.status,
        initiator: this.initiator,
      },
    );
    const plaintext = shouldAcceptLinkRttNow(rttAccept.actions)
      ? this.decrypt(packet.data)
      : null;
    await this.applyLinkEstablishActions(
      stepLinkEstablishWithActions(
        initialLinkEstablishState({
          initiator: this.initiator,
          status: this.status,
        }),
        {
          kind: "establish/rtt",
          plaintextPresent: plaintext !== null,
        },
      ).actions,
      { rttPlaintext: plaintext },
    );
  }

  getChannel(): Channel {
    const createChannel = stepCreateLinkChannelWithActions(
      initialCreateLinkChannelState(),
      {
        kind: "link/create-channel-gate",
        channelPresent: this.channel !== null,
      },
    );
    if (shouldCreateLinkChannelNow(createChannel.actions)) {
      this.channel = new Channel(
        new LinkChannelOutlet(this as unknown as Link),
      );
    }

    return this.channel!;
  }

  resourceConcluded(resource: Resource): void {
    const concluded = stepLinkResourceConcludeWithActions(
      initialLinkResourceConcludeState(),
      {
        kind: "link/resource-conclude-gate",
        outgoingIndex: this.outgoingResourcesList.indexOf(resource),
        incomingIndex: this.incomingResourcesList.indexOf(resource),
      },
    );
    const removeOutgoing = outgoingLinkResourceConcludeIndex(concluded.actions);
    if (
      shouldRemoveOutgoingLinkResourceConclude(concluded.actions) &&
      removeOutgoing !== null
    ) {
      this.outgoingResourcesList.splice(removeOutgoing, 1);
    }
    const removeIncoming = incomingLinkResourceConcludeIndex(concluded.actions);
    if (
      shouldRemoveIncomingLinkResourceConclude(concluded.actions) &&
      removeIncoming !== null
    ) {
      this.incomingResourcesList.splice(removeIncoming, 1);
    }
  }

  decrypt(ciphertext: Uint8Array): Uint8Array | null {
    try {
      return this.tokenInstance().decrypt(ciphertext);
    } catch {
      return null;
    }
  }
}
