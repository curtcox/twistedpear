import {
  identityPublicKeyFieldsFromActions,
  incomingLinkResourceConcludeIndex,
  initialAcceptLinkRttState,
  initialAttemptLinkProofCryptoState,
  initialClassifyLinkProofPayloadState,
  initialCreateLinkChannelState,
  initialExpectedLinkModeState,
  initialLinkEstablishState,
  initialLinkProofSignedMaterialState,
  initialLinkProofValidateState,
  initialLinkResourceConcludeState,
  initialSplitIdentityPublicKeyState,
  initialSplitLinkProofBodyState,
  initialValidateLinkProofAllowState,
  LINK_PROOF_BODY_SIZE,
  linkProofBodyFieldsFromActions,
  linkProofSignedMaterialRawFromActions,
  outgoingLinkResourceConcludeIndex,
  shouldAcceptLinkRttNow,
  shouldAllowValidateLinkProof,
  shouldAttemptLinkProofCryptoNow,
  shouldClassifyLinkProofPayloadBodyOnly,
  shouldClassifyLinkProofPayloadBodyWithMtu,
  shouldCreateLinkChannelNow,
  shouldMatchExpectedLinkMode,
  shouldRejectLinkProofValidate,
  shouldRejectSplitLinkProofBody,
  shouldRemoveIncomingLinkResourceConclude,
  shouldRemoveOutgoingLinkResourceConclude,
  shouldUseLinkProofSignedMaterial,
  shouldUseSplitIdentityPublicKey,
  shouldUseSplitLinkProofBody,
  stepAcceptLinkRttWithActions,
  stepAttemptLinkProofCryptoWithActions,
  stepClassifyLinkProofPayloadWithActions,
  stepCreateLinkChannelWithActions,
  stepExpectedLinkModeWithActions,
  stepLinkEstablishWithActions,
  stepLinkProofSignedMaterialWithActions,
  stepLinkProofValidateWithActions,
  stepLinkResourceConcludeWithActions,
  stepSplitIdentityPublicKeyWithActions,
  stepSplitLinkProofBodyWithActions,
  stepValidateLinkProofAllowWithActions,
} from "./protocol.js";
import { Channel, LinkChannelOutlet } from "../channel.js";
import type { PacketInterface } from "../interfaces/interface.js";
import { Packet } from "../packet.js";
import { RETICULUM_MTU } from "../reticulum-constants.js";
import { Resource } from "../resource.js";
import { linkRttSecondsForRequest } from "./shared.js";
import type { Link } from "../link.js";
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
      const evaluated = this.evaluateLinkProof(packet, destination);
      const proofGate = stepLinkProofValidateWithActions(
        initialLinkProofValidateState(),
        {
          kind: "proof/validate-gate",
          canValidate: true,
          modeMatches: evaluated.modeMatches,
          layoutValid: evaluated.layoutValid,
          bodyPresent: evaluated.bodyPresent,
          peerPublicPresent: evaluated.peerPublicPresent,
          signatureValid: evaluated.signatureValid,
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
            this.mtu = evaluated.confirmedMtu ?? RETICULUM_MTU;
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

  private evaluateLinkProof(
    packet: Packet,
    destination: NonNullable<LinkLayer3Core["destination"]>,
  ): {
    modeMatches: boolean;
    layoutValid: boolean;
    bodyPresent: boolean;
    peerPublicPresent: boolean;
    signatureValid: boolean;
    confirmedMtu: number | null;
  } {
    const mode = LinkLayer2.modeFromLpPacket(packet);
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
      confirmedMtu = LinkLayer2.mtuFromLpPacket(packet);
      signallingBytes = Uint8Array.from(
        LinkLayer2.signallingBytes(confirmedMtu ?? RETICULUM_MTU, mode),
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

    return {
      modeMatches,
      layoutValid,
      bodyPresent: body !== null,
      peerPublicPresent: peerPublic !== null,
      signatureValid: this.verifyLinkProofSignature({
        destination,
        modeMatches,
        layoutValid,
        body,
        peerPublic,
        signallingBytes,
      }),
      confirmedMtu,
    };
  }

  private verifyLinkProofSignature(input: {
    destination: NonNullable<LinkLayer3Core["destination"]>;
    modeMatches: boolean;
    layoutValid: boolean;
    body: ReturnType<typeof linkProofBodyFieldsFromActions> | null;
    peerPublic: ReturnType<typeof identityPublicKeyFieldsFromActions> | null;
    signallingBytes: Uint8Array;
  }): boolean {
    const {
      destination,
      modeMatches,
      layoutValid,
      body,
      peerPublic,
      signallingBytes,
    } = input;
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
      !shouldAttemptLinkProofCryptoNow(proofCrypto.actions) ||
      body === null ||
      peerPublic === null
    ) {
      return false;
    }
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
    const signedData = shouldUseLinkProofSignedMaterial(signedStepped.actions)
      ? linkProofSignedMaterialRawFromActions(signedStepped.actions)
      : null;
    return (
      signedData !== null &&
      destination.identity!.validate(body.signature, signedData)
    );
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
