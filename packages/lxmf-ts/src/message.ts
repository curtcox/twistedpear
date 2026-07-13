import {
  lxmfContentSizeFromPackedLength,
  lxmfHashableMaterial,
  lxmfOpportunisticPayload,
  lxmfSignedMaterial,
  packLxmfWire,
  planLxmfDelivery,
  splitLxmfWire,
  utf8Decode,
  utf8Encode
} from "@twistedpear/protocol";
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  Identity,
  bytesToHex,
  equalBytes
} from "@twistedpear/reticulum-ts";
import {
  DESTINATION_LENGTH,
  LXMessageMethod,
  LXMessageRepresentation,
  LXMessageState,
  LXMessageUnverifiedReason,
  SIGNATURE_LENGTH,
  STRUCT_OVERHEAD,
  TIMESTAMP_SIZE,
  type LXMessageFields,
  type LXMessageMethodValue,
  type LXMessageRepresentationValue,
  type LXMessageStateValue,
  type LXMessageUnverifiedReasonValue,
  APP_NAME
} from "./constants.js";
import { msgpackPackLxmPayload, msgpackPackPropagationEnvelope, msgpackUnpackLxmPayload } from "./msgpack.js";

/** Mirrors RNS/Packet.py encrypted MDU with LXMF timestamp allowance. */
export const ENCRYPTED_PACKET_MDU = 391;
export const ENCRYPTED_PACKET_MAX_CONTENT =
  ENCRYPTED_PACKET_MDU -
  (2 * DESTINATION_LENGTH + SIGNATURE_LENGTH + TIMESTAMP_SIZE + STRUCT_OVERHEAD) +
  DESTINATION_LENGTH;
export const LINK_PACKET_MDU = 431;
export const LINK_PACKET_MAX_CONTENT =
  LINK_PACKET_MDU - (2 * DESTINATION_LENGTH + SIGNATURE_LENGTH + TIMESTAMP_SIZE + STRUCT_OVERHEAD);

export interface LXMessagePackOptions {
  readonly provider: CryptoProvider;
  readonly destination: Destination;
  readonly source: Destination;
  readonly title?: string | Uint8Array;
  readonly content?: string | Uint8Array;
  readonly fields?: LXMessageFields;
  /** Unix seconds. Required unless `now` is provided. */
  readonly timestamp?: number;
  /** Injected clock in seconds — used when `timestamp` is omitted. */
  readonly now?: () => number;
  readonly stamp?: Uint8Array | null;
  readonly deferStamp?: boolean;
  readonly desiredMethod?: LXMessageMethodValue;
}

export interface LXMessageUnpackOptions {
  readonly provider: CryptoProvider;
  readonly sourceIdentity?: Identity | null;
  readonly originalMethod?: LXMessageMethodValue;
}

export class LXMessage {
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  title: Uint8Array;
  content: Uint8Array;
  fields: LXMessageFields;
  timestamp: number | null = null;
  signature: Uint8Array | null = null;
  hash: Uint8Array | null = null;
  packed: Uint8Array | null = null;
  propagationPacked: Uint8Array | null = null;
  transientId: Uint8Array | null = null;
  stamp: Uint8Array | null = null;
  state: LXMessageStateValue = LXMessageState.GENERATING;
  method: LXMessageMethodValue = LXMessageMethod.DIRECT;
  desiredMethod: LXMessageMethodValue | null = LXMessageMethod.DIRECT;
  representation: LXMessageRepresentationValue = LXMessageRepresentation.UNKNOWN;
  incoming = false;
  signatureValidated = false;
  unverifiedReason: LXMessageUnverifiedReasonValue | null = null;
  progress = 0;

  readonly destination: Destination | null;
  readonly source: Destination | null;

  constructor(options: {
    destination?: Destination | null;
    source?: Destination | null;
    destinationHash?: Uint8Array;
    sourceHash?: Uint8Array;
    title?: string | Uint8Array;
    content?: string | Uint8Array;
    fields?: LXMessageFields;
    desiredMethod?: LXMessageMethodValue | null;
  }) {
    this.destination = options.destination ?? null;
    this.source = options.source ?? null;
    this.destinationHash = options.destinationHash ?? options.destination?.hash ?? new Uint8Array(DESTINATION_LENGTH);
    this.sourceHash = options.sourceHash ?? options.source?.hash ?? new Uint8Array(DESTINATION_LENGTH);
    this.title = encodeTextOrBytes(options.title ?? "");
    this.content = encodeTextOrBytes(options.content ?? "");
    this.fields = options.fields ?? {};
    this.desiredMethod = options.desiredMethod ?? LXMessageMethod.DIRECT;
  }

  static pack(options: LXMessagePackOptions): LXMessage {
    if (options.destination.direction !== DestinationDirection.OUT) {
      throw new Error("LXMessage destination must be OUT");
    }

    if (options.source.direction !== DestinationDirection.IN || options.source.identity === null) {
      throw new Error("LXMessage source must be IN with identity");
    }

    const message = new LXMessage({
      destination: options.destination,
      source: options.source,
      ...(options.title === undefined ? {} : { title: options.title }),
      ...(options.content === undefined ? {} : { content: options.content }),
      ...(options.fields === undefined ? {} : { fields: options.fields }),
      desiredMethod: options.desiredMethod ?? LXMessageMethod.DIRECT
    });

    if (options.timestamp !== undefined) {
      message.timestamp = options.timestamp;
    } else if (options.now !== undefined) {
      message.timestamp = options.now();
    } else {
      throw new Error("LXMessage.pack requires timestamp or now()");
    }
    message.pack(options.provider, {
      ...(options.stamp === undefined ? {} : { stamp: options.stamp }),
      ...(options.deferStamp === undefined ? {} : { deferStamp: options.deferStamp })
    });
    return message;
  }

  static unpackFromBytes(lxmfBytes: Uint8Array, options: LXMessageUnpackOptions): LXMessage {
    const wire = splitLxmfWire(lxmfBytes);
    if (wire === null) {
      throw new Error("LXMF bytes too short");
    }

    const { destinationHash, sourceHash, signature, payload } = wire;
    const { timestamp, title, content, fields, stamp } = msgpackUnpackLxmPayload(payload);
    const payloadWithoutStamp = msgpackPackLxmPayload(timestamp, title, content, fields);
    const hashedPart = lxmfHashableMaterial(destinationHash, sourceHash, payloadWithoutStamp);
    const messageHash = Identity.fullHash(options.provider, hashedPart);
    const signedPart = lxmfSignedMaterial(hashedPart, messageHash);

    const sourceIdentity = options.sourceIdentity ?? Identity.recall(options.provider, sourceHash);
    const destinationIdentity = Identity.recall(options.provider, destinationHash);

    const message = new LXMessage({
      destination:
        destinationIdentity === null
          ? null
          : new Destination(options.provider, {
              identity: destinationIdentity,
              direction: DestinationDirection.OUT,
              type: DestinationType.SINGLE,
              appName: APP_NAME,
              aspects: ["delivery"]
            }),
      source:
        sourceIdentity === null
          ? null
          : new Destination(options.provider, {
              identity: sourceIdentity,
              direction: DestinationDirection.IN,
              type: DestinationType.SINGLE,
              appName: APP_NAME,
              aspects: ["delivery"]
            }),
      destinationHash,
      sourceHash,
      title,
      content,
      fields,
      desiredMethod: options.originalMethod ?? null
    });

    message.hash = messageHash;
    message.signature = Uint8Array.from(signature);
    message.stamp = stamp;
    message.timestamp = timestamp;
    message.packed = Uint8Array.from(lxmfBytes);
    message.incoming = true;

    if (sourceIdentity !== null) {
      message.signatureValidated = sourceIdentity.validate(signature, signedPart);
      if (!message.signatureValidated) {
        message.unverifiedReason = LXMessageUnverifiedReason.SIGNATURE_INVALID;
      }
    } else {
      message.signatureValidated = false;
      message.unverifiedReason = LXMessageUnverifiedReason.SOURCE_UNKNOWN;
    }

    return message;
  }

  pack(
    provider: CryptoProvider,
    options: { stamp?: Uint8Array | null; deferStamp?: boolean } = {}
  ): void {
    if (this.packed !== null) {
      throw new Error("LXMessage is already packed");
    }

    if (this.destination === null || this.source === null || this.source.identity === null) {
      throw new Error("LXMessage requires destination and source destinations to pack");
    }

    if (this.timestamp === null) {
      throw new Error("LXMessage.pack requires timestamp to be set before packing");
    }

    const payloadCore = msgpackPackLxmPayload(this.timestamp, this.title, this.content, this.fields);
    const hashedPart = lxmfHashableMaterial(this.destination.hash, this.source.hash, payloadCore);
    this.hash = Identity.fullHash(provider, hashedPart);

    let stamp: Uint8Array | null = null;
    if (options.deferStamp !== true) {
      stamp = options.stamp ?? null;
    }

    const payload = msgpackPackLxmPayload(this.timestamp, this.title, this.content, this.fields, stamp);
    const signedPart = lxmfSignedMaterial(hashedPart, this.hash);
    this.signature = this.source.identity.sign(signedPart);
    this.signatureValidated = true;
    this.stamp = stamp;

    this.packed = packLxmfWire({
      destinationHash: this.destination.hash,
      sourceHash: this.source.hash,
      signature: this.signature,
      payload
    });
    this.selectDeliveryParameters(provider);
  }

  titleAsString(): string {
    return utf8Decode(this.title);
  }

  contentAsString(): string {
    return utf8Decode(this.content);
  }

  opportunisticPayload(): Uint8Array {
    if (this.packed === null) {
      throw new Error("LXMessage must be packed before extracting opportunistic payload");
    }

    return lxmfOpportunisticPayload(this.packed);
  }

  private selectDeliveryParameters(provider: CryptoProvider): void {
    if (this.packed === null) {
      return;
    }

    const desiredMethod = this.desiredMethod ?? LXMessageMethod.DIRECT;
    const contentSize = lxmfContentSizeFromPackedLength(this.packed.length);

    if (desiredMethod === LXMessageMethod.PROPAGATED) {
      if (this.destination === null || this.destination.identity === null) {
        throw new Error("PROPAGATED LXMF requires destination identity");
      }

      const encryptedPayload = this.destination.identity.encrypt(this.packed.subarray(DESTINATION_LENGTH));
      const lxmfData = concatBytes(this.destination.hash, encryptedPayload);
      this.transientId = Identity.fullHash(provider, lxmfData);
      if (this.timestamp === null) {
        throw new Error("LXMessage.pack requires timestamp to be set before packing");
      }
      this.propagationPacked = msgpackPackPropagationEnvelope(this.timestamp, [lxmfData]);
    }

    const plan = planLxmfDelivery({
      desiredMethod,
      contentSize,
      encryptedPacketMaxContent: ENCRYPTED_PACKET_MAX_CONTENT,
      linkPacketMaxContent: LINK_PACKET_MAX_CONTENT,
      ...(desiredMethod === LXMessageMethod.PROPAGATED
        ? { propagationPackedLength: this.propagationPacked!.length }
        : {})
    });

    if (plan.kind === "reject-opportunistic-too-large") {
      throw new TypeError(
        `Opportunistic LXMF content of length ${plan.contentSize} exceeds single-packet limit ${plan.maxContent}`
      );
    }

    if (plan.kind === "deliver") {
      this.method = plan.method as LXMessageMethodValue;
      this.representation = plan.representation as LXMessageRepresentationValue;
    }
  }
}

export function deliveryDestinationHash(provider: CryptoProvider, identity: Identity): Uint8Array {
  return Destination.hash(provider, identity.hash, APP_NAME, "delivery");
}

export function propagationDestinationHash(provider: CryptoProvider, identity: Identity): Uint8Array {
  return Destination.hash(provider, identity.hash, APP_NAME, "propagation");
}

function encodeTextOrBytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? utf8Encode(value) : Uint8Array.from(value);
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

export function rememberMessage(seen: Set<string>, message: LXMessage): void {
  if (message.hash === null) {
    return;
  }

  seen.add(bytesToHex(message.hash));
}

export function messagesEqual(left: LXMessage, right: LXMessage): boolean {
  return (
    left.titleAsString() === right.titleAsString() &&
    left.contentAsString() === right.contentAsString() &&
    equalBytes(left.destinationHash, right.destinationHash) &&
    equalBytes(left.sourceHash, right.sourceHash)
  );
}
