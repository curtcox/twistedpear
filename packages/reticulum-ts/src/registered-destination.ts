import type { CryptoProvider } from "./crypto/provider.js";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  type DestinationOptions,
} from "./destination.js";
import type { PacketInterface } from "./interfaces/interface.js";
import { ANNOUNCE_RANDOM_HASH_SIZE, Announce } from "./announce.js";
import { bytesToHex } from "./crypto/bytes.js";
import { Identity } from "./identity.js";
import { Link, type LinkCallbacks } from "./link.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "./packet.js";
import type { PacketReceipt } from "./packet-receipt.js";
import {
  DestinationProofStrategy,
  type DestinationProofStrategyValue,
  type LeafTransport,
} from "./transport/node.js";
import {
  DestinationAllowPolicyCode,
  initialAcceptDestinationLinkRequestState,
  initialAnnounceDestinationState,
  initialAnnounceWithIdentityState,
  initialDestinationDecryptState,
  initialDestinationEncryptState,
  initialDestinationLinkEstablishedCallbackState,
  initialDestinationProofCallbackState,
  initialDestinationRequestPathValidState,
  initialDestinationSendState,
  initialOperateAttachedDestinationState,
  initialRegisterDestinationLinkState,
  shouldAcceptDestinationRequestPath,
  shouldAllowAnnounceWithIdentity,
  shouldAllowDestinationAnnounce,
  shouldAllowDestinationLinkRequest,
  shouldAllowDestinationSend,
  shouldAllowOperateAttachedDestination,
  shouldDecryptDestinationWithIdentity,
  shouldEncryptDestinationWithIdentity,
  shouldInvokeDestinationLinkEstablishedCallbackNow,
  shouldInvokeDestinationProofCallbackNow,
  shouldRegisterDestinationLinkNow,
  shouldRejectDestinationDecrypt,
  shouldRejectDestinationEncrypt,
  shouldReturnDestinationDecryptCiphertext,
  shouldUseDestinationEncryptPlaintext,
  stepAcceptDestinationLinkRequestWithActions,
  stepAnnounceDestinationWithActions,
  stepAnnounceWithIdentityWithActions,
  stepDestinationDecryptWithActions,
  stepDestinationEncryptWithActions,
  stepDestinationLinkEstablishedCallbackWithActions,
  stepDestinationProofCallbackWithActions,
  stepDestinationRequestPathValidWithActions,
  stepDestinationSendWithActions,
  stepOperateAttachedDestinationWithActions,
  stepRegisterDestinationLinkWithActions,
  stepUtf8EncodeWithActions,
  initialUtf8EncodeState,
  shouldUseUtf8Encode,
  utf8EncodeRawFromActions,
  type DestinationAllowPolicyCodeValue,
} from "@twistedpear/protocol";

export interface RegisteredDestinationOptions extends DestinationOptions {
  readonly provider: CryptoProvider;
}

export { DestinationProofStrategy };

export const DestinationAllowPolicy = DestinationAllowPolicyCode;
export type DestinationAllowPolicyValue = DestinationAllowPolicyCodeValue;

export interface RequestHandlerContext {
  readonly path: string;
  readonly data: Uint8Array | null;
  readonly requestId: Uint8Array;
  readonly linkId: Uint8Array;
  readonly remoteIdentity: Identity | null;
  readonly requestedAt: number;
}

export interface RequestHandler {
  readonly path: string;
  readonly pathHash: Uint8Array;
  readonly responseGenerator: (
    context: RequestHandlerContext,
  ) => Uint8Array | null | Promise<Uint8Array | null>;
  readonly allow: DestinationAllowPolicyValue;
  readonly allowedList: ReadonlyArray<Uint8Array>;
}

export class RegisteredDestination extends Destination {
  readonly cryptoProvider: CryptoProvider;
  private packetCallback: ((data: Uint8Array, packet: Packet) => void) | null =
    null;
  private linkEstablishedCallback: ((link: Link) => void) | null = null;
  private proofRequestedCallback: ((packet: Packet) => boolean) | null = null;
  proofStrategy: DestinationProofStrategyValue =
    DestinationProofStrategy.PROVE_NONE;
  acceptLinkRequests = true;
  private readonly links: Link[] = [];
  private readonly requestHandlers = new Map<string, RequestHandler>();
  private transport: LeafTransport | null = null;

  get activeLinks(): readonly Link[] {
    return this.links;
  }

  constructor(options: RegisteredDestinationOptions) {
    super(options.provider, options);
    this.cryptoProvider = options.provider;
  }

  attachTransport(transport: LeafTransport): void {
    this.transport = transport;
    transport.registerDestination(this);
  }

  setPacketCallback(
    callback: (data: Uint8Array, packet: Packet) => void,
  ): void {
    this.packetCallback = callback;
  }

  setLinkEstablishedCallback(callback: (link: Link) => void): void {
    this.linkEstablishedCallback = callback;
  }

  setProofRequestedCallback(callback: (packet: Packet) => boolean): void {
    this.proofRequestedCallback = callback;
  }

  setProofStrategy(strategy: DestinationProofStrategyValue): void {
    this.proofStrategy = strategy;
  }

  setAcceptLinkRequests(accept: boolean): void {
    this.acceptLinkRequests = accept;
  }

  registerRequestHandler(
    path: string,
    responseGenerator: RequestHandler["responseGenerator"],
    allow: DestinationAllowPolicyValue = DestinationAllowPolicy.ALLOW_NONE,
    allowedList: ReadonlyArray<Uint8Array> = [],
  ): void {
    const pathGate = stepDestinationRequestPathValidWithActions(
      initialDestinationRequestPathValidState(),
      {
        kind: "destination/request-path-valid-gate",
        path,
      },
    );
    if (!shouldAcceptDestinationRequestPath(pathGate.actions)) {
      throw new Error("Invalid path specified");
    }

    const pathHash = Identity.truncatedHash(
      this.cryptoProvider,
      utf8EncodePath(path),
    );
    this.requestHandlers.set(bytesToHex(pathHash), {
      path,
      pathHash,
      responseGenerator,
      allow,
      allowedList,
    });
  }

  deregisterRequestHandler(path: string): boolean {
    const pathHash = Identity.truncatedHash(
      this.cryptoProvider,
      utf8EncodePath(path),
    );
    return this.requestHandlers.delete(bytesToHex(pathHash));
  }

  getRequestHandler(pathHash: Uint8Array): RequestHandler | undefined {
    return this.requestHandlers.get(bytesToHex(pathHash));
  }

  requestLink(
    callbacks?: LinkCallbacks,
    options?: { readonly entropy?: Uint8Array },
  ): Link {
    const attached = stepOperateAttachedDestinationWithActions(
      initialOperateAttachedDestinationState(),
      {
        kind: "destination/operate-attached-gate",
        transportPresent: this.transport !== null,
      },
    );
    if (!shouldAllowOperateAttachedDestination(attached.actions)) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }

    return Link.request({
      destination: this,
      transport: this.transport!,
      ...(callbacks === undefined ? {} : { callbacks }),
      ...(options?.entropy === undefined ? {} : { entropy: options.entropy }),
    });
  }

  handleLinkRequest(packet: Packet, iface: PacketInterface): void {
    const accept = stepAcceptDestinationLinkRequestWithActions(
      initialAcceptDestinationLinkRequestState(),
      {
        kind: "destination/accept-link-request-gate",
        acceptLinkRequests: this.acceptLinkRequests,
        directionIn: this.direction === DestinationDirection.IN,
      },
    );
    if (!shouldAllowDestinationLinkRequest(accept.actions)) {
      return;
    }

    const link = Link.validateRequest(this, this.transport!, packet, iface);
    const register = stepRegisterDestinationLinkWithActions(
      initialRegisterDestinationLinkState(),
      {
        kind: "destination/register-link-gate",
        validatedLinkPresent: link !== null,
      },
    );
    if (!shouldRegisterDestinationLinkNow(register.actions)) {
      return;
    }
    if (link === null) {
      return;
    }

    const established = stepDestinationLinkEstablishedCallbackWithActions(
      initialDestinationLinkEstablishedCallbackState(),
      {
        kind: "destination/link-established-callback-gate",
        callbackPresent: this.linkEstablishedCallback !== null,
      },
    );
    if (
      shouldInvokeDestinationLinkEstablishedCallbackNow(established.actions)
    ) {
      const callback = this.linkEstablishedCallback!;
      const existing = link.callbacks.linkEstablished;
      link.callbacks.linkEstablished = (establishedLink) => {
        existing?.(establishedLink);
        callback(establishedLink);
      };
    }

    this.links.push(link);
  }

  dispatchPacket(data: Uint8Array, packet: Packet): void {
    this.packetCallback?.(data, packet);
  }

  shouldProve(packet: Packet): boolean {
    const proofCallback = stepDestinationProofCallbackWithActions(
      initialDestinationProofCallbackState(),
      {
        kind: "destination/proof-callback-gate",
        callbackPresent: this.proofRequestedCallback !== null,
      },
    );
    if (!shouldInvokeDestinationProofCallbackNow(proofCallback.actions)) {
      return false;
    }

    return this.proofRequestedCallback!(packet);
  }

  decrypt(ciphertext: Uint8Array): Uint8Array | null {
    const gate = stepDestinationDecryptWithActions(
      initialDestinationDecryptState(),
      {
        kind: "destination/decrypt-gate",
        typePlain: this.type === DestinationType.PLAIN,
        identityPresent: this.identity !== null,
      },
    );
    if (shouldReturnDestinationDecryptCiphertext(gate.actions)) {
      return ciphertext;
    }
    if (shouldRejectDestinationDecrypt(gate.actions)) {
      return null;
    }
    if (
      !shouldDecryptDestinationWithIdentity(gate.actions) ||
      this.identity === null
    ) {
      return null;
    }

    return this.identity.decrypt(ciphertext).plaintext;
  }

  async announce(
    options: {
      appData?: Uint8Array;
      attachedInterface?: PacketInterface | null;
      pathResponse?: boolean;
      randomHash?: Uint8Array;
    } = {},
  ): Promise<void> {
    const attached = stepOperateAttachedDestinationWithActions(
      initialOperateAttachedDestinationState(),
      {
        kind: "destination/operate-attached-gate",
        transportPresent: this.transport !== null,
      },
    );
    if (!shouldAllowOperateAttachedDestination(attached.actions)) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }

    const announce = stepAnnounceDestinationWithActions(
      initialAnnounceDestinationState(),
      {
        kind: "destination/announce-gate",
        typeSingle: this.type === DestinationType.SINGLE,
        directionIn: this.direction === DestinationDirection.IN,
      },
    );
    if (!shouldAllowDestinationAnnounce(announce.actions)) {
      throw new Error("Only IN SINGLE destinations can be announced");
    }

    const withIdentity = stepAnnounceWithIdentityWithActions(
      initialAnnounceWithIdentityState(),
      {
        kind: "destination/announce-with-identity-gate",
        identityPresent: this.identity !== null,
      },
    );
    if (!shouldAllowAnnounceWithIdentity(withIdentity.actions)) {
      throw new Error("Announce destination must hold an identity");
    }

    let randomHash = options.randomHash;
    if (randomHash === undefined) {
      randomHash = this.transport!.entropy.randomBytes(
        ANNOUNCE_RANDOM_HASH_SIZE,
      );
      let emittedAt = Math.floor(this.transport!.clock.now() / 1_000);
      for (let index = ANNOUNCE_RANDOM_HASH_SIZE - 1; index >= 5; index -= 1) {
        randomHash[index] = emittedAt % 256;
        emittedAt = Math.floor(emittedAt / 256);
      }
    }

    const packet = Announce.buildPacket(this.cryptoProvider, this, {
      randomHash,
      ...(options.appData === undefined ? {} : { appData: options.appData }),
      ...(options.pathResponse === true ? { pathResponse: true } : {}),
    });
    await this.transport!.sendPacket(packet, {
      attachedInterface: options.attachedInterface ?? null,
    });
  }

  async answerPathRequest(iface: PacketInterface): Promise<void> {
    await this.announce({ pathResponse: true, attachedInterface: iface });
  }

  async send(
    data: Uint8Array,
    options: {
      createReceipt?: boolean;
      attachedInterface?: PacketInterface | null;
    } = {},
  ): Promise<PacketReceipt | null> {
    const attached = stepOperateAttachedDestinationWithActions(
      initialOperateAttachedDestinationState(),
      {
        kind: "destination/operate-attached-gate",
        transportPresent: this.transport !== null,
      },
    );
    if (!shouldAllowOperateAttachedDestination(attached.actions)) {
      throw new Error("Destination is not attached to a Reticulum instance");
    }

    const send = stepDestinationSendWithActions(initialDestinationSendState(), {
      kind: "destination/send-gate",
      directionOut: this.direction === DestinationDirection.OUT,
    });
    if (!shouldAllowDestinationSend(send.actions)) {
      throw new Error("Only OUT destinations can send packets");
    }

    const gate = stepDestinationEncryptWithActions(
      initialDestinationEncryptState(),
      {
        kind: "destination/encrypt-gate",
        typePlain: this.type === DestinationType.PLAIN,
        identityPresent: this.identity !== null,
      },
    );
    let ciphertext: Uint8Array;
    if (shouldUseDestinationEncryptPlaintext(gate.actions)) {
      ciphertext = data;
    } else if (shouldRejectDestinationEncrypt(gate.actions)) {
      throw new Error("Destination cannot encrypt outbound data");
    } else if (
      !shouldEncryptDestinationWithIdentity(gate.actions) ||
      this.identity === null
    ) {
      throw new Error("Destination cannot encrypt outbound data");
    } else {
      ciphertext = this.identity.encrypt(data, {
        entropy: this.transport!.entropy,
      });
    }

    const packet = Packet.fromFields(this.cryptoProvider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: this.type,
      packetType: PacketType.DATA,
      destinationHash: this.hash,
      context: PacketContext.NONE,
      data: ciphertext,
    });

    return this.transport!.sendPacket(packet, {
      createReceipt: options.createReceipt ?? false,
      attachedInterface: options.attachedInterface ?? null,
    });
  }
}

function utf8EncodePath(path: string): Uint8Array {
  const stepped = stepUtf8EncodeWithActions(initialUtf8EncodeState(), {
    kind: "utf8/encode-gate",
    value: path,
  });
  const raw = utf8EncodeRawFromActions(stepped.actions);
  if (!shouldUseUtf8Encode(stepped.actions) || raw === null) {
    throw new Error("utf8EncodePath: missing use-raw action");
  }
  return raw;
}
