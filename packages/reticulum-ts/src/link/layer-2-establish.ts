import {
  deriveRnsLinkKeyRawFromActions,
  encodeLinkMtuBytesRawFromActions,
  identityPublicKeyFieldsFromActions,
  initialAcceptLinkOwnerPublicKeyState,
  initialComputeKeepaliveState,
  initialContinueLinkValidateRequestState,
  initialDeriveRnsLinkKeyState,
  initialEncodeLinkMtuBytesState,
  initialLinkEstablishState,
  initialLinkInitiatorMtuState,
  initialLinkModeEnabledState,
  initialLinkProofSignedMaterialState,
  initialLinkRequestResponderMtuState,
  initialLinkValidateRequestState,
  initialModeFromLinkProofDataState,
  initialModeFromLinkRequestDataState,
  initialMtuFromLinkProofDataState,
  initialMtuFromLinkRequestDataState,
  initialPackLinkProofDataState,
  initialPackLinkRequestDataState,
  initialPackMsgpackFloat64State,
  initialPerformLinkHandshakeAllowState,
  initialProveLinkAllowState,
  initialRequestLinkDestinationState,
  initialSplitIdentityPublicKeyState,
  initialSplitInitiatorLinkEntropyState,
  initialSplitLinkRequestDataState,
  initialSplitResponderLinkEntropyState,
  initialUnpackMsgpackFloatState,
  initialUpdateLinkKeepaliveAllowState,
  initiatorLinkEntropyFieldsFromActions,
  LINK_INITIATOR_ENTROPY_SIZE,
  LINK_KEEPALIVE,
  LINK_MODE_DEFAULT,
  LINK_RESPONDER_ENTROPY_SIZE,
  LINK_STALE_FACTOR,
  linkEstablishActivatedAction,
  linkInitiatorMtuFromActions,
  linkKeepaliveFromActions,
  linkProofSignedMaterialRawFromActions,
  linkRequestKeyFieldsFromActions,
  linkRequestResponderMtuFromActions,
  LinkStatus,
  modeFromLinkProofDataFromActions,
  modeFromLinkRequestDataFromActions,
  msgpackFloatFromActions,
  mtuFromLinkProofDataFromActions,
  mtuFromLinkRequestDataFromActions,
  packLinkProofDataRawFromActions,
  packLinkRequestDataRawFromActions,
  packMsgpackFloat64RawFromActions,
  responderLinkEntropyFieldsFromActions,
  shouldAcceptLinkEstablishRtt,
  shouldAcceptLinkOwnerPublicKeyNow,
  shouldActivateLinkEstablish,
  shouldAllowPerformLinkHandshake,
  shouldAllowProveLink,
  shouldAllowRequestLinkDestination,
  shouldAllowUpdateLinkKeepalive,
  shouldContinueLinkValidateRequestNow,
  shouldEnterLinkHandshake,
  shouldFailLinkEstablish,
  shouldIgnoreLinkEstablishRtt,
  shouldProceedLinkValidateRequest,
  shouldRejectDeriveRnsLinkKey,
  shouldRejectMtuFromLinkProofData,
  shouldRejectMtuFromLinkRequestData,
  shouldRejectSplitInitiatorLinkEntropy,
  shouldRejectSplitLinkRequestData,
  shouldRejectSplitResponderLinkEntropy,
  shouldRejectUnpackMsgpackFloat,
  shouldTeardownLinkEstablish,
  shouldTreatLinkModeEnabled,
  shouldUseDeriveRnsLinkKey,
  shouldUseEncodeLinkMtuBytes,
  shouldUseLinkInitiatorMtu,
  shouldUseLinkKeepalive,
  shouldUseLinkProofSignedMaterial,
  shouldUseLinkRequestResponderMtu,
  shouldUseModeFromLinkProofData,
  shouldUseModeFromLinkRequestData,
  shouldUseMtuFromLinkProofData,
  shouldUseMtuFromLinkRequestData,
  shouldUsePackLinkProofData,
  shouldUsePackLinkRequestData,
  shouldUsePackMsgpackFloat64,
  shouldUseSplitIdentityPublicKey,
  shouldUseSplitInitiatorLinkEntropy,
  shouldUseSplitLinkRequestData,
  shouldUseSplitResponderLinkEntropy,
  shouldUseUnpackMsgpackFloat,
  stepAcceptLinkOwnerPublicKeyWithActions,
  stepComputeKeepaliveWithActions,
  stepContinueLinkValidateRequestWithActions,
  stepDeriveRnsLinkKeyWithActions,
  stepEncodeLinkMtuBytesWithActions,
  stepLinkEstablishWithActions,
  stepLinkInitiatorMtuWithActions,
  stepLinkModeEnabledWithActions,
  stepLinkProofSignedMaterialWithActions,
  stepLinkRequestResponderMtuWithActions,
  stepLinkValidateRequestWithActions,
  stepLinkWatchdogWithActions,
  stepModeFromLinkProofDataWithActions,
  stepModeFromLinkRequestDataWithActions,
  stepMtuFromLinkProofDataWithActions,
  stepMtuFromLinkRequestDataWithActions,
  stepPackLinkProofDataWithActions,
  stepPackLinkRequestDataWithActions,
  stepPackMsgpackFloat64WithActions,
  stepPerformLinkHandshakeAllowWithActions,
  stepProveLinkAllowWithActions,
  stepRequestLinkDestinationWithActions,
  stepSplitIdentityPublicKeyWithActions,
  stepSplitInitiatorLinkEntropyWithActions,
  stepSplitLinkRequestDataWithActions,
  stepSplitResponderLinkEntropyWithActions,
  stepUnpackMsgpackFloatWithActions,
  stepUpdateLinkKeepaliveAllowWithActions,
  type LinkEstablishAction,
  type LinkModeValue,
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
import type { Link } from "../link.js";
import { LinkLayer1 } from "./layer-1.js";
export class LinkLayer2Establish extends LinkLayer1 {
  async prove(): Promise<void> {
    const owner = this.owner;
    const publicKeyBytes = this.publicKeyBytes;
    const ownerIdentity = owner?.identity ?? null;
    const proveAllow = stepProveLinkAllowWithActions(
      initialProveLinkAllowState(),
      {
        kind: "link/prove-allow-gate",
        ownerPresent: owner !== null,
        publicKeyPresent: publicKeyBytes !== null,
        ownerIdentityPresent: ownerIdentity !== null,
      },
    );
    if (
      !shouldAllowProveLink(proveAllow.actions) ||
      owner === null ||
      publicKeyBytes === null ||
      ownerIdentity === null
    ) {
      throw new Error("Responder link is missing owner or key material");
    }

    const signallingBytes = LinkLayer1.signallingBytes(this.mtu, this.mode);
    const ownerSplit = stepSplitIdentityPublicKeyWithActions(
      initialSplitIdentityPublicKeyState(),
      {
        kind: "identity-key/split-public-gate",
        publicKeyBytes: ownerIdentity.getPublicKey(),
      },
    );
    const ownerPublic = shouldUseSplitIdentityPublicKey(ownerSplit.actions)
      ? identityPublicKeyFieldsFromActions(ownerSplit.actions)
      : null;
    const ownerKeyAllow = stepAcceptLinkOwnerPublicKeyWithActions(
      initialAcceptLinkOwnerPublicKeyState(),
      {
        kind: "link/accept-owner-public-key-gate",
        splitOk: ownerPublic !== null,
      },
    );
    if (!shouldAcceptLinkOwnerPublicKeyNow(ownerKeyAllow.actions)) {
      throw new Error("Responder link owner public key is invalid");
    }
    const ownerSigPublicKey = ownerPublic!.signaturePublicKey;
    const signedStepped = stepLinkProofSignedMaterialWithActions(
      initialLinkProofSignedMaterialState(),
      {
        kind: "link-proof/signed-material-gate",
        linkId: this.linkId,
        publicKey: publicKeyBytes,
        ownerSigPublicKey,
        signallingBytes,
      },
    );
    const signedData = shouldUseLinkProofSignedMaterial(signedStepped.actions)
      ? linkProofSignedMaterialRawFromActions(signedStepped.actions)
      : null;
    if (signedData === null) {
      throw new Error("Link.prove: missing signed-material use-raw action");
    }
    const signature = ownerIdentity.sign(signedData);
    const packStepped = stepPackLinkProofDataWithActions(
      initialPackLinkProofDataState(),
      {
        kind: "link-proof/pack-gate",
        signature,
        publicKey: publicKeyBytes,
        signallingBytes,
      },
    );
    const proofData = shouldUsePackLinkProofData(packStepped.actions)
      ? packLinkProofDataRawFromActions(packStepped.actions)
      : null;
    if (proofData === null) {
      throw new Error("Link.prove: missing use-raw action");
    }
    const proofPacket = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.PROOF,
      destinationHash: this.linkId,
      context: PacketContext.LRPROOF,
      data: proofData,
    });

    this.establishmentCost += proofPacket.raw.length;
    await this.transport.sendPacket(proofPacket, {
      attachedInterface: this.attachedInterface,
    });
    this.hadOutbound(false);
  }

  protected async applyLinkEstablishActions(
    actions: readonly LinkEstablishAction[],
    context?: {
      readonly prepareInitiatorActivate?: () => void;
      readonly rttPlaintext?: Uint8Array | null;
    },
  ): Promise<void> {
    if (shouldIgnoreLinkEstablishRtt(actions)) {
      return;
    }

    if (shouldTeardownLinkEstablish(actions)) {
      await this.teardown();
      return;
    }

    if (shouldAcceptLinkEstablishRtt(actions)) {
      try {
        const measuredRtt = linkRttSecondsForRequest(
          this.clock.now() / 1000,
          this.requestTime,
        );
        const unpackRtt = stepUnpackMsgpackFloatWithActions(
          initialUnpackMsgpackFloatState(),
          {
            kind: "msgpack-float/unpack-gate",
            bytes: context?.rttPlaintext!,
          },
        );
        if (
          shouldRejectUnpackMsgpackFloat(unpackRtt.actions) ||
          !shouldUseUnpackMsgpackFloat(unpackRtt.actions)
        ) {
          throw new Error("Link.handleRtt: missing use-fields action");
        }
        const remoteRtt = msgpackFloatFromActions(unpackRtt.actions);
        if (remoteRtt === null) {
          throw new Error("Link.handleRtt: missing use-fields action");
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
              rtt: mergedLinkRtt(measuredRtt, remoteRtt),
            },
          ).actions,
        );
      } catch {
        await this.applyLinkEstablishActions(
          stepLinkEstablishWithActions(
            initialLinkEstablishState({
              initiator: this.initiator,
              status: this.status,
            }),
            { kind: "establish/rtt-failed" },
          ).actions,
        );
      }
      return;
    }

    if (shouldEnterLinkHandshake(actions)) {
      this.status = LinkStatus.HANDSHAKE;
    }

    if (shouldFailLinkEstablish(actions)) {
      this.status = LinkStatus.CLOSED;
      return;
    }

    if (!shouldActivateLinkEstablish(actions)) {
      return;
    }

    const activated = linkEstablishActivatedAction(actions);
    if (activated === null) {
      return;
    }

    this.status = LinkStatus.ACTIVE;
    this.rtt = activated.rtt;
    this.activatedAt = activated.activatedAt;
    if (activated.activateMembership || activated.sendRtt) {
      context?.prepareInitiatorActivate?.();
    }
    this.updateKeepalive();
    if (activated.activateMembership) {
      this.transport.activateLink(this as unknown as Link);
    }
    if (activated.sendRtt) {
      const packRtt = stepPackMsgpackFloat64WithActions(
        initialPackMsgpackFloat64State(),
        {
          kind: "msgpack-float/pack-gate",
          value: this.rtt!,
        },
      );
      if (!shouldUsePackMsgpackFloat64(packRtt.actions)) {
        throw new Error("Link.sendRtt: missing use-raw action");
      }
      const rttRaw = packMsgpackFloat64RawFromActions(packRtt.actions);
      if (rttRaw === null) {
        throw new Error("Link.sendRtt: missing use-raw action");
      }
      const rttPacket = Packet.fromFields(this.provider, {
        headerType: PacketHeaderType.HEADER_1,
        transportType: TransportType.BROADCAST,
        destinationType: DestinationType.LINK,
        packetType: PacketType.DATA,
        destinationHash: this.linkId,
        context: PacketContext.LRRTT,
        data: this.encrypt(rttRaw),
      });
      await this.transport.sendPacket(rttPacket, {
        attachedInterface: this.attachedInterface,
      });
      this.hadOutbound(false);
    }
    this.callbacks.linkEstablished?.(this as unknown as Link);
  }

  protected updateKeepalive(): void {
    const keepaliveAllow = stepUpdateLinkKeepaliveAllowWithActions(
      initialUpdateLinkKeepaliveAllowState(),
      {
        kind: "link/update-keepalive-allow-gate",
        rttPresent: this.rtt !== null,
      },
    );
    if (!shouldAllowUpdateLinkKeepalive(keepaliveAllow.actions)) {
      return;
    }

    /** Adapt keepalive via protocol actions (no ad-hoc `computeKeepalive` reads). */
    const keepaliveStepped = stepComputeKeepaliveWithActions(
      initialComputeKeepaliveState(),
      {
        kind: "link/keepalive-gate",
        rtt: this.rtt!,
      },
    );
    const keepalive = shouldUseLinkKeepalive(keepaliveStepped.actions)
      ? linkKeepaliveFromActions(keepaliveStepped.actions)
      : null;
    if (keepalive === null) {
      throw new Error("Link.updateKeepalive: missing use-keepalive action");
    }
    this.keepalive = keepalive;
    this.staleTime = keepalive * LINK_STALE_FACTOR;

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "link/rtt-measured",
        rtt: this.rtt!,
      }),
    );
  }
}
