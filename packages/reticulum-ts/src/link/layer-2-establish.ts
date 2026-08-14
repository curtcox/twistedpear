import {
  identityPublicKeyFieldsFromActions,
  initialAcceptLinkOwnerPublicKeyState,
  initialComputeKeepaliveState,
  initialLinkEstablishState,
  initialLinkProofSignedMaterialState,
  initialPackLinkProofDataState,
  initialPackMsgpackFloat64State,
  initialProveLinkAllowState,
  initialSplitIdentityPublicKeyState,
  initialUnpackMsgpackFloatState,
  initialUpdateLinkKeepaliveAllowState,
  LINK_STALE_FACTOR,
  linkEstablishActivatedAction,
  linkKeepaliveFromActions,
  linkProofSignedMaterialRawFromActions,
  LinkStatus,
  msgpackFloatFromActions,
  packLinkProofDataRawFromActions,
  packMsgpackFloat64RawFromActions,
  shouldAcceptLinkEstablishRtt,
  shouldAcceptLinkOwnerPublicKeyNow,
  shouldActivateLinkEstablish,
  shouldAllowProveLink,
  shouldAllowUpdateLinkKeepalive,
  shouldEnterLinkHandshake,
  shouldFailLinkEstablish,
  shouldIgnoreLinkEstablishRtt,
  shouldRejectUnpackMsgpackFloat,
  shouldTeardownLinkEstablish,
  shouldUseLinkKeepalive,
  shouldUseLinkProofSignedMaterial,
  shouldUsePackLinkProofData,
  shouldUsePackMsgpackFloat64,
  shouldUseSplitIdentityPublicKey,
  shouldUseUnpackMsgpackFloat,
  stepAcceptLinkOwnerPublicKeyWithActions,
  stepComputeKeepaliveWithActions,
  stepLinkEstablishWithActions,
  stepLinkProofSignedMaterialWithActions,
  stepLinkWatchdogWithActions,
  stepPackLinkProofDataWithActions,
  stepPackMsgpackFloat64WithActions,
  stepProveLinkAllowWithActions,
  stepSplitIdentityPublicKeyWithActions,
  stepUnpackMsgpackFloatWithActions,
  stepUpdateLinkKeepaliveAllowWithActions,
  type LinkEstablishAction,
} from "./protocol.js";

import { DestinationType } from "../destination.js";
import { Identity } from "../identity.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../packet.js";
import { linkRttSecondsForRequest, mergedLinkRtt } from "./shared.js";
import type { Link } from "../link.js";
import { LinkLayer1Request } from "./layer-1-request.js";
import { LinkLayer1 } from "./layer-1.js";
export class LinkLayer2Establish extends LinkLayer1Request {
  async prove(): Promise<void> {
    const ownerIdentity = this.requireProveOwnerIdentity();
    const publicKeyBytes = this.publicKeyBytes!;
    const signallingBytes = LinkLayer1.signallingBytes(this.mtu, this.mode);
    const ownerSigPublicKey = this.requireOwnerSigPublicKey(ownerIdentity);
    const proofData = this.packLinkProofData(
      ownerIdentity,
      publicKeyBytes,
      ownerSigPublicKey,
      signallingBytes,
    );
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

  private requireProveOwnerIdentity(): Identity {
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
    return ownerIdentity;
  }

  private requireOwnerSigPublicKey(ownerIdentity: Identity): Uint8Array {
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
    return ownerPublic!.signaturePublicKey;
  }

  private packLinkProofData(
    ownerIdentity: Identity,
    publicKeyBytes: Uint8Array,
    ownerSigPublicKey: Uint8Array,
    signallingBytes: Uint8Array,
  ): Uint8Array {
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
    return proofData;
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
      await this.applyLinkEstablishRtt(context);
      return;
    }
    if (shouldEnterLinkHandshake(actions)) {
      this.status = LinkStatus.HANDSHAKE;
    }
    if (shouldFailLinkEstablish(actions)) {
      this.status = LinkStatus.CLOSED;
      return;
    }
    if (shouldActivateLinkEstablish(actions)) {
      await this.applyLinkEstablishActivate(actions, context);
    }
  }

  private async applyLinkEstablishRtt(context?: {
    readonly prepareInitiatorActivate?: () => void;
    readonly rttPlaintext?: Uint8Array | null;
  }): Promise<void> {
    try {
      const measuredRtt = linkRttSecondsForRequest(
        this.clock.now() / 1000,
        this.requestTime,
      );
      const remoteRtt = unpackEstablishRtt(context?.rttPlaintext!);
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
  }

  private async applyLinkEstablishActivate(
    actions: readonly LinkEstablishAction[],
    context?: {
      readonly prepareInitiatorActivate?: () => void;
      readonly rttPlaintext?: Uint8Array | null;
    },
  ): Promise<void> {
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
      await this.sendEstablishRttPacket();
    }
    this.callbacks.linkEstablished?.(this as unknown as Link);
  }

  private async sendEstablishRttPacket(): Promise<void> {
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

function unpackEstablishRtt(bytes: Uint8Array): number {
  const unpackRtt = stepUnpackMsgpackFloatWithActions(
    initialUnpackMsgpackFloatState(),
    {
      kind: "msgpack-float/unpack-gate",
      bytes,
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
  return remoteRtt;
}
