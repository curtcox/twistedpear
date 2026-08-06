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
import { LinkLayer2Establish } from "./layer-2-establish.js";
export class LinkLayer2 extends LinkLayer2Establish {
  static request(options: InitiatorLinkOptions): Link {
    const destination = options.destination;
    const requestLink = stepRequestLinkDestinationWithActions(
      initialRequestLinkDestinationState(),
      {
        kind: "destination/request-link-gate",
        typeSingle: destination.type === DestinationType.SINGLE,
        directionOut: destination.direction === DestinationDirection.OUT,
      },
    );
    if (!shouldAllowRequestLinkDestination(requestLink.actions)) {
      throw new Error(
        "Links can only be established to OUT SINGLE destinations",
      );
    }

    const provider = destination.cryptoProvider;
    const link = new Link(
      provider,
      options.transport,
      options.transport.clock,
      {
        initiator: true,
        owner: null,
        destination,
        ...(options.callbacks === undefined
          ? {}
          : { callbacks: options.callbacks }),
      },
    );

    const initiatorStepped = stepSplitInitiatorLinkEntropyWithActions(
      initialSplitInitiatorLinkEntropyState(),
      {
        kind: "link-keygen/split-initiator-gate",
        entropy:
          options.entropy ??
          options.transport.entropy.randomBytes(LINK_INITIATOR_ENTROPY_SIZE),
      },
    );
    const initiatorKeys = initiatorLinkEntropyFieldsFromActions(
      initiatorStepped.actions,
    );
    if (
      shouldRejectSplitInitiatorLinkEntropy(initiatorStepped.actions) ||
      !shouldUseSplitInitiatorLinkEntropy(initiatorStepped.actions) ||
      initiatorKeys === null
    ) {
      throw new Error(
        `Initiator link entropy must be at least ${LINK_INITIATOR_ENTROPY_SIZE} bytes`,
      );
    }
    link.privateKey = initiatorKeys.privateKey;
    link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
    const signaturePublicKeyBytes = provider.ed25519PublicFromPrivate(
      initiatorKeys.signaturePrivateKey,
    );
    link.expectedHops = options.transport.hopsTo(destination.hash);
    link.requestTime = options.transport.clock.now() / 1000;
    link.establishmentTimeout = linkEstablishmentTimeoutForHops(
      link.expectedHops ?? 1,
      LINK_KEEPALIVE,
    );

    const discoveryEnabled = options.linkMtuDiscovery !== false;
    const mtuStepped = stepLinkInitiatorMtuWithActions(
      initialLinkInitiatorMtuState(),
      {
        kind: "link/initiator-mtu-gate",
        discoveryEnabled,
        nextHopMtu: discoveryEnabled
          ? options.transport.nextHopInterfaceMtu(destination.hash)
          : null,
        defaultMtu: RETICULUM_MTU,
      },
    );
    const mtu = shouldUseLinkInitiatorMtu(mtuStepped.actions)
      ? (linkInitiatorMtuFromActions(mtuStepped.actions) ?? RETICULUM_MTU)
      : RETICULUM_MTU;

    link.mtu = mtu;
    link.mode = LINK_MODE_DEFAULT;
    link.updateMdu();
    const packStepped = stepPackLinkRequestDataWithActions(
      initialPackLinkRequestDataState(),
      {
        kind: "link-request/pack-gate",
        publicKey: link.publicKeyBytes,
        signaturePublicKey: signaturePublicKeyBytes,
        signallingBytes: Link.signallingBytes(mtu, link.mode),
      },
    );
    const requestData = shouldUsePackLinkRequestData(packStepped.actions)
      ? packLinkRequestDataRawFromActions(packStepped.actions)
      : null;
    if (requestData === null) {
      throw new Error("Link.request: missing use-raw action");
    }
    const packet = Packet.fromFields(provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.SINGLE,
      packetType: PacketType.LINKREQUEST,
      destinationHash: destination.hash,
      context: PacketContext.NONE,
      data: requestData,
    });

    link.setLinkId(packet);
    link.establishmentCost += packet.raw.length;
    options.transport.registerLink(link);
    link.startWatchdog();
    void options.transport.sendPacket(packet).then(() => {
      link.hadOutbound(false);
    });

    return link;
  }

  static validateRequest(
    owner: RegisteredDestination,
    transport: LeafTransport,
    packet: Packet,
    iface: PacketInterface,
    options?: { readonly entropy?: Uint8Array },
  ): Link | null {
    const splitStepped = stepSplitLinkRequestDataWithActions(
      initialSplitLinkRequestDataState(),
      {
        kind: "link-request/split-gate",
        data: packet.data,
      },
    );
    const request =
      shouldRejectSplitLinkRequestData(splitStepped.actions) ||
      !shouldUseSplitLinkRequestData(splitStepped.actions)
        ? null
        : linkRequestKeyFieldsFromActions(splitStepped.actions);
    const early = stepLinkValidateRequestWithActions(
      initialLinkValidateRequestState(),
      {
        kind: "validate-request/gate",
        requestPresent: request !== null,
        ownerIdentityPresent: owner.identity !== null,
        modeEnabled: true,
      },
    );
    if (
      !shouldContinueLinkValidateRequestNow(
        stepContinueLinkValidateRequestWithActions(
          initialContinueLinkValidateRequestState(),
          {
            kind: "validate-request/continue-gate",
            planProceed: shouldProceedLinkValidateRequest(early.actions),
            requestPresent: request !== null,
          },
        ).actions,
      ) ||
      request === null
    ) {
      return null;
    }

    try {
      const provider = owner.cryptoProvider;
      const link = new Link(provider, transport, transport.clock, {
        initiator: false,
        owner,
        destination: null,
      });

      const responderStepped = stepSplitResponderLinkEntropyWithActions(
        initialSplitResponderLinkEntropyState(),
        {
          kind: "link-keygen/split-responder-gate",
          entropy:
            options?.entropy ??
            transport.entropy.randomBytes(LINK_RESPONDER_ENTROPY_SIZE),
        },
      );
      const responderKeys = responderLinkEntropyFieldsFromActions(
        responderStepped.actions,
      );
      if (
        shouldRejectSplitResponderLinkEntropy(responderStepped.actions) ||
        !shouldUseSplitResponderLinkEntropy(responderStepped.actions) ||
        responderKeys === null
      ) {
        throw new Error(
          `Responder link entropy must be at least ${LINK_RESPONDER_ENTROPY_SIZE} bytes`,
        );
      }
      link.privateKey = responderKeys.privateKey;
      link.publicKeyBytes = provider.x25519PublicFromPrivate(link.privateKey);
      link.loadPeer(request.publicKey, request.signaturePublicKey);
      link.setLinkId(packet);

      const responderMtuStepped = stepLinkRequestResponderMtuWithActions(
        initialLinkRequestResponderMtuState(),
        {
          kind: "link/request-responder-mtu-gate",
          signallingPresent: request.signallingBytes.length > 0,
          signallingMtu: Link.mtuFromLrPacket(packet),
          currentMtu: link.mtu,
          defaultMtu: RETICULUM_MTU,
        },
      );
      if (shouldUseLinkRequestResponderMtu(responderMtuStepped.actions)) {
        const selected = linkRequestResponderMtuFromActions(
          responderMtuStepped.actions,
        );
        if (selected !== null) {
          link.mtu = selected;
        }
      }

      link.mode = Link.modeFromLrPacket(packet);
      const modeGate = stepLinkValidateRequestWithActions(
        initialLinkValidateRequestState(),
        {
          kind: "validate-request/gate",
          requestPresent: true,
          ownerIdentityPresent: true,
          modeEnabled: shouldTreatLinkModeEnabled(
            stepLinkModeEnabledWithActions(initialLinkModeEnabledState(), {
              kind: "link/mode-enabled-gate",
              mode: link.mode,
            }).actions,
          ),
        },
      );
      if (!shouldProceedLinkValidateRequest(modeGate.actions)) {
        return null;
      }

      link.updateMdu();
      link.attachedInterface = iface;
      link.establishmentCost += packet.raw.length;
      link.handshake();
      link.requestTime = transport.clock.now() / 1000;
      link.lastInbound = link.requestTime;
      link.establishmentTimeout = linkEstablishmentTimeoutForHops(
        packet.hops,
        LINK_KEEPALIVE,
      );
      transport.registerLink(link);
      link.startWatchdog();
      void link.prove();
      return link;
    } catch {
      return null;
    }
  }

  static modeFromLrPacket(packet: Packet): LinkModeValue {
    const stepped = stepModeFromLinkRequestDataWithActions(
      initialModeFromLinkRequestDataState(),
      {
        kind: "link-proof/mode-from-request-gate",
        data: packet.data,
        defaultMode: LINK_MODE_DEFAULT,
      },
    );
    const mode = modeFromLinkRequestDataFromActions(stepped.actions);
    if (!shouldUseModeFromLinkRequestData(stepped.actions) || mode === null) {
      throw new Error("Could not decode link-request mode");
    }
    return mode as LinkModeValue;
  }

  static modeFromLpPacket(packet: Packet): LinkModeValue {
    const stepped = stepModeFromLinkProofDataWithActions(
      initialModeFromLinkProofDataState(),
      {
        kind: "link-proof/mode-from-proof-gate",
        data: packet.data,
        defaultMode: LINK_MODE_DEFAULT,
      },
    );
    const mode = modeFromLinkProofDataFromActions(stepped.actions);
    if (!shouldUseModeFromLinkProofData(stepped.actions) || mode === null) {
      throw new Error("Could not decode link-proof mode");
    }
    return mode as LinkModeValue;
  }

  static mtuBytes(mtu: number): Uint8Array {
    const stepped = stepEncodeLinkMtuBytesWithActions(
      initialEncodeLinkMtuBytesState(),
      {
        kind: "link-proof/encode-mtu-gate",
        mtu,
      },
    );
    const raw = encodeLinkMtuBytesRawFromActions(stepped.actions);
    if (!shouldUseEncodeLinkMtuBytes(stepped.actions) || raw === null) {
      throw new Error("Could not encode link MTU bytes");
    }
    return raw;
  }

  static mtuFromLrPacket(packet: Packet): number | null {
    const stepped = stepMtuFromLinkRequestDataWithActions(
      initialMtuFromLinkRequestDataState(),
      {
        kind: "link-proof/mtu-from-request-gate",
        data: packet.data,
      },
    );
    if (
      shouldRejectMtuFromLinkRequestData(stepped.actions) ||
      !shouldUseMtuFromLinkRequestData(stepped.actions)
    ) {
      return null;
    }
    return mtuFromLinkRequestDataFromActions(stepped.actions);
  }

  static mtuFromLpPacket(packet: Packet): number | null {
    const stepped = stepMtuFromLinkProofDataWithActions(
      initialMtuFromLinkProofDataState(),
      {
        kind: "link-proof/mtu-from-proof-gate",
        data: packet.data,
      },
    );
    if (
      shouldRejectMtuFromLinkProofData(stepped.actions) ||
      !shouldUseMtuFromLinkProofData(stepped.actions)
    ) {
      return null;
    }
    return mtuFromLinkProofDataFromActions(stepped.actions);
  }

  loadPeer(
    peerPublicKey: Uint8Array,
    peerSignaturePublicKey: Uint8Array,
  ): void {
    this.peerPublicKeyBytes = Uint8Array.from(peerPublicKey);
    this.peerSignaturePublicKeyBytes = Uint8Array.from(peerSignaturePublicKey);
  }

  handshake(): void {
    const privateKey = this.privateKey;
    const peerPublicKeyBytes = this.peerPublicKeyBytes;
    const handshakeAllow = stepPerformLinkHandshakeAllowWithActions(
      initialPerformLinkHandshakeAllowState(),
      {
        kind: "link/perform-handshake-allow-gate",
        status: this.status,
        privateKeyPresent: privateKey !== null,
        peerPublicKeyPresent: peerPublicKeyBytes !== null,
      },
    );
    if (
      !shouldAllowPerformLinkHandshake(handshakeAllow.actions) ||
      privateKey === null ||
      peerPublicKeyBytes === null
    ) {
      throw new Error("Invalid link state for handshake");
    }

    void this.applyLinkEstablishActions(
      stepLinkEstablishWithActions(
        initialLinkEstablishState({
          initiator: this.initiator,
          status: this.status,
        }),
        { kind: "establish/handshake" },
      ).actions,
    );
    const sharedKey = this.provider.x25519SharedSecret(
      privateKey,
      peerPublicKeyBytes,
    );
    // ECDH at the crypto adapter edge; RNS HKDF length/salt selection is pure protocol.
    const deriveStepped = stepDeriveRnsLinkKeyWithActions(
      initialDeriveRnsLinkKeyState(),
      {
        kind: "link-key/derive-gate",
        sharedSecret: sharedKey,
        linkId: this.linkId,
        mode: this.mode,
      },
    );
    const derivedKey = deriveRnsLinkKeyRawFromActions(deriveStepped.actions);
    if (
      shouldRejectDeriveRnsLinkKey(deriveStepped.actions) ||
      !shouldUseDeriveRnsLinkKey(deriveStepped.actions) ||
      derivedKey === null
    ) {
      throw new Error("Cannot derive key from empty input material");
    }
    this.derivedKey = derivedKey;
  }
}
