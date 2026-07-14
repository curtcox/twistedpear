import {
  bytesToHexLower,
  LXMF_ENCRYPTED_PACKET_MAX_CONTENT,
  LXMF_ENCRYPTED_PACKET_MDU,
  LXMF_LINK_PACKET_MAX_CONTENT,
  LXMF_LINK_PACKET_MDU,
  lxmfContentSizeFromPackedLength,
  canExtractLxmfOpportunisticPayload,
  initialLxmfDeliveryState,
  initialLxmfHashableMaterialState,
  initialLxmfOpportunisticPayloadState,
  initialLxmfPackTimestampState,
  initialLxmfPropagatedPackPrepState,
  initialLxmfSignedMaterialState,
  initialLxMessageInstancePackState,
  initialLxMessagePackState,
  initialLxmfSignatureState,
  initialPackLxmPayloadState,
  initialPackLxmfDestinationPrefixedState,
  initialPackLxmfWireState,
  initialPackPropagationEnvelopeState,
  initialSplitLxmfWireState,
  initialUnpackLxmPayloadState,
  lxmPayloadFieldsFromActions,
  lxmfDeliveryDeliverParams,
  lxmfDeliveryOpportunisticRejectSizes,
  lxmfHashableMaterialRawFromActions,
  lxmfOpportunisticPayloadRawFromActions,
  lxmfSignatureOutcomeFromActions,
  lxmfSignedMaterialRawFromActions,
  lxmfWireFieldsFromActions,
  packLxmPayloadRawFromActions,
  packLxmfDestinationPrefixedRawFromActions,
  packLxmfWireRawFromActions,
  packPropagationEnvelopeRawFromActions,
  shouldDeliverLxmf,
  shouldIncludeLxmfStamp,
  shouldAcceptLxmfWireFrame,
  shouldCommitRememberedLxmfHash,
  shouldProceedLxmfPropagatedPackPrep,
  shouldRejectLxmfOpportunisticPayload,
  shouldRejectLxmfOpportunisticTooLarge,
  shouldRejectLxmfPropagatedPackMissingIdentity,
  shouldRejectLxmfPropagatedPackMissingTimestamp,
  shouldRejectLxMessageInstanceAlreadyPacked,
  shouldRejectLxMessageInstanceMissingEndpoints,
  shouldRejectLxMessageInstanceMissingTimestamp,
  shouldRejectLxMessagePackBadDestination,
  shouldRejectLxMessagePackBadSource,
  shouldRejectPackLxmfDestinationPrefixed,
  shouldRejectPackLxmfWire,
  shouldRejectSplitLxmfWire,
  shouldRejectUnpackLxmPayload,
  shouldRememberLxmfMessage,
  shouldSelectLxmfDeliveryParameters,
  shouldUseLxmfHashableMaterial,
  shouldUseLxmfOpportunisticPayload,
  shouldUseLxmfPackNow,
  shouldUseLxmfPackTimestamp,
  shouldUseLxmfSignedMaterial,
  shouldUsePackLxmPayload,
  shouldUsePackLxmfDestinationPrefixed,
  shouldUsePackLxmfWire,
  shouldUsePackPropagationEnvelope,
  shouldUseSplitLxmfWire,
  shouldUseUnpackLxmPayload,
  stepLxmfDeliveryWithActions,
  stepLxmfHashableMaterialWithActions,
  stepLxmfOpportunisticPayloadWithActions,
  stepLxmfPackTimestampWithActions,
  stepLxmfPropagatedPackPrepWithActions,
  stepLxmfSignatureWithActions,
  stepLxmfSignedMaterialWithActions,
  stepLxMessageInstancePackWithActions,
  stepLxMessagePackWithActions,
  stepPackLxmPayloadWithActions,
  stepPackLxmfDestinationPrefixedWithActions,
  stepPackLxmfWireWithActions,
  stepPackPropagationEnvelopeWithActions,
  stepSplitLxmfWireWithActions,
  stepUnpackLxmPayloadWithActions,
  stepUtf8DecodeWithActions,
  stepUtf8OrBytesWithActions,
  initialUtf8DecodeState,
  initialUtf8OrBytesState,
  shouldUseUtf8Decode,
  shouldUseUtf8OrBytes,
  utf8DecodeTextFromActions,
  utf8OrBytesRawFromActions
} from "@twistedpear/protocol";
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  Identity,
  equalBytes
} from "@twistedpear/reticulum-ts";
import {
  DESTINATION_LENGTH,
  LXMessageMethod,
  LXMessageRepresentation,
  LXMessageState,
  type LXMessageFields,
  type LXMessageMethodValue,
  type LXMessageRepresentationValue,
  type LXMessageStateValue,
  type LXMessageUnverifiedReasonValue,
  APP_NAME
} from "./constants.js";

/** Mirrors RNS/Packet.py encrypted MDU with LXMF timestamp allowance. */
export const ENCRYPTED_PACKET_MDU = LXMF_ENCRYPTED_PACKET_MDU;
export const ENCRYPTED_PACKET_MAX_CONTENT = LXMF_ENCRYPTED_PACKET_MAX_CONTENT;
export const LINK_PACKET_MDU = LXMF_LINK_PACKET_MDU;
export const LINK_PACKET_MAX_CONTENT = LXMF_LINK_PACKET_MAX_CONTENT;

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
    const packGate = stepLxMessagePackWithActions(initialLxMessagePackState(), {
      kind: "lxmessage-pack/gate",
      destinationDirectionOut: options.destination.direction === DestinationDirection.OUT,
      sourceDirectionIn: options.source.direction === DestinationDirection.IN,
      sourceIdentityPresent: options.source.identity !== null
    });
    if (shouldRejectLxMessagePackBadDestination(packGate.actions)) {
      throw new Error("LXMessage destination must be OUT");
    }
    if (shouldRejectLxMessagePackBadSource(packGate.actions)) {
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

    const timestampGate = stepLxmfPackTimestampWithActions(initialLxmfPackTimestampState(), {
      kind: "pack-timestamp/select",
      hasTimestamp: options.timestamp !== undefined,
      hasNow: options.now !== undefined
    });
    if (shouldUseLxmfPackTimestamp(timestampGate.actions)) {
      message.timestamp = options.timestamp!;
    } else if (shouldUseLxmfPackNow(timestampGate.actions)) {
      message.timestamp = options.now!();
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
    const splitStepped = stepSplitLxmfWireWithActions(initialSplitLxmfWireState(), {
      kind: "lxmf-wire/split-gate",
      bytes: lxmfBytes
    });
    const wire = lxmfWireFieldsFromActions(splitStepped.actions);
    if (
      shouldRejectSplitLxmfWire(splitStepped.actions) ||
      !shouldUseSplitLxmfWire(splitStepped.actions) ||
      !shouldAcceptLxmfWireFrame(wire !== null) ||
      wire === null
    ) {
      throw new Error("LXMF bytes too short");
    }

    const { destinationHash, sourceHash, signature, payload } = wire;
    const unpackPayloadStepped = stepUnpackLxmPayloadWithActions(initialUnpackLxmPayloadState(), {
      kind: "lxmf-codec/unpack-payload-gate",
      data: payload
    });
    if (
      shouldRejectUnpackLxmPayload(unpackPayloadStepped.actions) ||
      !shouldUseUnpackLxmPayload(unpackPayloadStepped.actions)
    ) {
      throw new Error("Invalid LXMF payload");
    }
    const unpackedPayload = lxmPayloadFieldsFromActions(unpackPayloadStepped.actions);
    if (unpackedPayload === null) {
      throw new Error("Invalid LXMF payload");
    }
    const { timestamp, title, content, fields, stamp } = unpackedPayload;
    const packCoreStepped = stepPackLxmPayloadWithActions(initialPackLxmPayloadState(), {
      kind: "lxmf-codec/pack-payload-gate",
      timestamp,
      title,
      content,
      fields
    });
    if (!shouldUsePackLxmPayload(packCoreStepped.actions)) {
      throw new Error("Invalid LXMF payload");
    }
    const payloadWithoutStamp = packLxmPayloadRawFromActions(packCoreStepped.actions);
    if (payloadWithoutStamp === null) {
      throw new Error("Invalid LXMF payload");
    }
    const hashedStepped = stepLxmfHashableMaterialWithActions(initialLxmfHashableMaterialState(), {
      kind: "lxmf-wire/hashable-material-gate",
      destinationHash,
      sourceHash,
      payloadWithoutStamp
    });
    const hashedPart =
      shouldUseLxmfHashableMaterial(hashedStepped.actions)
        ? lxmfHashableMaterialRawFromActions(hashedStepped.actions)
        : null;
    if (hashedPart === null) {
      throw new Error("LXMF hashable material: missing use-raw action");
    }
    const messageHash = Identity.fullHash(options.provider, hashedPart);
    const signedStepped = stepLxmfSignedMaterialWithActions(initialLxmfSignedMaterialState(), {
      kind: "lxmf-wire/signed-material-gate",
      hashableMaterial: hashedPart,
      messageHash
    });
    const signedPart =
      shouldUseLxmfSignedMaterial(signedStepped.actions)
        ? lxmfSignedMaterialRawFromActions(signedStepped.actions)
        : null;
    if (signedPart === null) {
      throw new Error("LXMF signed material: missing use-raw action");
    }

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

    const signatureGate = stepLxmfSignatureWithActions(initialLxmfSignatureState(), {
      kind: "signature/outcome-gate",
      sourceIdentityPresent: sourceIdentity !== null,
      signatureValid:
        sourceIdentity !== null ? sourceIdentity.validate(signature, signedPart) : false
    });
    const outcome = lxmfSignatureOutcomeFromActions(signatureGate.actions);
    if (outcome !== null) {
      message.signatureValidated = outcome.signatureValidated;
      message.unverifiedReason = outcome.unverifiedReason;
    }

    return message;
  }

  pack(
    provider: CryptoProvider,
    options: { stamp?: Uint8Array | null; deferStamp?: boolean } = {}
  ): void {
    const packGate = stepLxMessageInstancePackWithActions(initialLxMessageInstancePackState(), {
      kind: "instance-pack/gate",
      alreadyPacked: this.packed !== null,
      destinationPresent: this.destination !== null,
      sourcePresent: this.source !== null,
      sourceIdentityPresent: this.source?.identity !== null,
      timestampPresent: this.timestamp !== null
    });
    if (shouldRejectLxMessageInstanceAlreadyPacked(packGate.actions)) {
      throw new Error("LXMessage is already packed");
    }
    if (shouldRejectLxMessageInstanceMissingEndpoints(packGate.actions)) {
      throw new Error("LXMessage requires destination and source destinations to pack");
    }
    if (shouldRejectLxMessageInstanceMissingTimestamp(packGate.actions)) {
      throw new Error("LXMessage.pack requires timestamp to be set before packing");
    }

    const packCoreStepped = stepPackLxmPayloadWithActions(initialPackLxmPayloadState(), {
      kind: "lxmf-codec/pack-payload-gate",
      timestamp: this.timestamp!,
      title: this.title,
      content: this.content,
      fields: this.fields
    });
    if (!shouldUsePackLxmPayload(packCoreStepped.actions)) {
      throw new Error("LXMessage failed to pack payload");
    }
    const payloadCore = packLxmPayloadRawFromActions(packCoreStepped.actions);
    if (payloadCore === null) {
      throw new Error("LXMessage failed to pack payload");
    }
    const hashedStepped = stepLxmfHashableMaterialWithActions(initialLxmfHashableMaterialState(), {
      kind: "lxmf-wire/hashable-material-gate",
      destinationHash: this.destination!.hash,
      sourceHash: this.source!.hash,
      payloadWithoutStamp: payloadCore
    });
    const hashedPart =
      shouldUseLxmfHashableMaterial(hashedStepped.actions)
        ? lxmfHashableMaterialRawFromActions(hashedStepped.actions)
        : null;
    if (hashedPart === null) {
      throw new Error("LXMF hashable material: missing use-raw action");
    }
    this.hash = Identity.fullHash(provider, hashedPart);

    let stamp: Uint8Array | null = null;
    if (shouldIncludeLxmfStamp(options.deferStamp)) {
      stamp = options.stamp ?? null;
    }

    const packPayloadStepped = stepPackLxmPayloadWithActions(initialPackLxmPayloadState(), {
      kind: "lxmf-codec/pack-payload-gate",
      timestamp: this.timestamp!,
      title: this.title,
      content: this.content,
      fields: this.fields,
      stamp
    });
    if (!shouldUsePackLxmPayload(packPayloadStepped.actions)) {
      throw new Error("LXMessage failed to pack payload");
    }
    const payload = packLxmPayloadRawFromActions(packPayloadStepped.actions);
    if (payload === null) {
      throw new Error("LXMessage failed to pack payload");
    }
    const signedStepped = stepLxmfSignedMaterialWithActions(initialLxmfSignedMaterialState(), {
      kind: "lxmf-wire/signed-material-gate",
      hashableMaterial: hashedPart,
      messageHash: this.hash
    });
    const signedPart =
      shouldUseLxmfSignedMaterial(signedStepped.actions)
        ? lxmfSignedMaterialRawFromActions(signedStepped.actions)
        : null;
    if (signedPart === null) {
      throw new Error("LXMF signed material: missing use-raw action");
    }
    this.signature = this.source!.identity!.sign(signedPart);
    this.signatureValidated = true;
    this.stamp = stamp;

    const packStepped = stepPackLxmfWireWithActions(initialPackLxmfWireState(), {
      kind: "lxmf-wire/pack-gate",
      destinationHash: this.destination!.hash,
      sourceHash: this.source!.hash,
      signature: this.signature,
      payload
    });
    if (
      shouldRejectPackLxmfWire(packStepped.actions) ||
      !shouldUsePackLxmfWire(packStepped.actions)
    ) {
      throw new Error(`destination hash must be ${DESTINATION_LENGTH} bytes`);
    }
    const packed = packLxmfWireRawFromActions(packStepped.actions);
    if (packed === null) {
      throw new Error(`destination hash must be ${DESTINATION_LENGTH} bytes`);
    }
    this.packed = packed;
    this.selectDeliveryParameters(provider);
  }

  titleAsString(): string {
    const stepped = stepUtf8DecodeWithActions(initialUtf8DecodeState(), {
      kind: "utf8/decode-gate",
      bytes: this.title
    });
    const text = utf8DecodeTextFromActions(stepped.actions);
    if (!shouldUseUtf8Decode(stepped.actions) || text === null) {
      throw new Error("LXMessage.titleAsString: missing use-fields action");
    }
    return text;
  }

  contentAsString(): string {
    const stepped = stepUtf8DecodeWithActions(initialUtf8DecodeState(), {
      kind: "utf8/decode-gate",
      bytes: this.content
    });
    const text = utf8DecodeTextFromActions(stepped.actions);
    if (!shouldUseUtf8Decode(stepped.actions) || text === null) {
      throw new Error("LXMessage.contentAsString: missing use-fields action");
    }
    return text;
  }

  opportunisticPayload(): Uint8Array {
    if (!canExtractLxmfOpportunisticPayload(this.packed !== null)) {
      throw new Error("LXMessage must be packed before extracting opportunistic payload");
    }

    const stepped = stepLxmfOpportunisticPayloadWithActions(initialLxmfOpportunisticPayloadState(), {
      kind: "lxmf-wire/opportunistic-payload-gate",
      packed: this.packed!
    });
    if (
      shouldRejectLxmfOpportunisticPayload(stepped.actions) ||
      !shouldUseLxmfOpportunisticPayload(stepped.actions)
    ) {
      throw new Error("LXMF packed bytes too short for opportunistic payload");
    }
    const payload = lxmfOpportunisticPayloadRawFromActions(stepped.actions);
    if (payload === null) {
      throw new Error("LXMF packed bytes too short for opportunistic payload");
    }
    return payload;
  }

  private selectDeliveryParameters(provider: CryptoProvider): void {
    const packed = this.packed;
    if (!shouldSelectLxmfDeliveryParameters(packed !== null)) {
      return;
    }

    const desiredMethod = this.desiredMethod ?? LXMessageMethod.DIRECT;
    const contentSize = lxmfContentSizeFromPackedLength(packed!.length);

    const prep = stepLxmfPropagatedPackPrepWithActions(initialLxmfPropagatedPackPrepState(), {
      kind: "propagated-pack-prep/gate",
      packedPresent: true,
      desiredMethod,
      destinationIdentityPresent: this.destination !== null && this.destination.identity !== null,
      timestampPresent: this.timestamp !== null
    });
    if (shouldRejectLxmfPropagatedPackMissingIdentity(prep.actions)) {
      throw new Error("PROPAGATED LXMF requires destination identity");
    }
    if (shouldRejectLxmfPropagatedPackMissingTimestamp(prep.actions)) {
      throw new Error("LXMessage.pack requires timestamp to be set before packing");
    }
    if (shouldProceedLxmfPropagatedPackPrep(prep.actions)) {
      const encryptedPayload = this.destination!.identity!.encrypt(
        packed!.subarray(DESTINATION_LENGTH)
      );
      const prefixStepped = stepPackLxmfDestinationPrefixedWithActions(
        initialPackLxmfDestinationPrefixedState(),
        {
          kind: "lxmf-destination-prefixed/pack-gate",
          destinationHash: this.destination!.hash,
          remainder: encryptedPayload
        }
      );
      if (
        shouldRejectPackLxmfDestinationPrefixed(prefixStepped.actions) ||
        !shouldUsePackLxmfDestinationPrefixed(prefixStepped.actions)
      ) {
        throw new Error(`destination hash must be ${DESTINATION_LENGTH} bytes`);
      }
      const lxmfData = packLxmfDestinationPrefixedRawFromActions(prefixStepped.actions);
      if (lxmfData === null) {
        throw new Error(`destination hash must be ${DESTINATION_LENGTH} bytes`);
      }
      this.transientId = Identity.fullHash(provider, lxmfData);
      const envelopeStepped = stepPackPropagationEnvelopeWithActions(
        initialPackPropagationEnvelopeState(),
        {
          kind: "lxmf-codec/pack-propagation-envelope-gate",
          timestamp: this.timestamp!,
          messages: [lxmfData]
        }
      );
      if (!shouldUsePackPropagationEnvelope(envelopeStepped.actions)) {
        throw new Error("LXMessage failed to pack propagation envelope");
      }
      const propagationPacked = packPropagationEnvelopeRawFromActions(envelopeStepped.actions);
      if (propagationPacked === null) {
        throw new Error("LXMessage failed to pack propagation envelope");
      }
      this.propagationPacked = propagationPacked;
    }

    const stepped = stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
      kind: "delivery/select",
      desiredMethod,
      contentSize,
      encryptedPacketMaxContent: ENCRYPTED_PACKET_MAX_CONTENT,
      linkPacketMaxContent: LINK_PACKET_MAX_CONTENT,
      ...(desiredMethod === LXMessageMethod.PROPAGATED
        ? { propagationPackedLength: this.propagationPacked!.length }
        : {})
    });
    this.applyLxmfDeliveryActions(stepped.actions);
  }

  private applyLxmfDeliveryActions(
    actions: ReturnType<typeof stepLxmfDeliveryWithActions>["actions"]
  ): void {
    if (shouldRejectLxmfOpportunisticTooLarge(actions)) {
      const sizes = lxmfDeliveryOpportunisticRejectSizes(actions);
      throw new TypeError(
        `Opportunistic LXMF content of length ${sizes!.contentSize} exceeds single-packet limit ${sizes!.maxContent}`
      );
    }
    if (!shouldDeliverLxmf(actions)) {
      return;
    }
    const params = lxmfDeliveryDeliverParams(actions);
    if (params === null) {
      return;
    }
    this.method = params.method as LXMessageMethodValue;
    this.representation = params.representation as LXMessageRepresentationValue;
  }
}

export function deliveryDestinationHash(provider: CryptoProvider, identity: Identity): Uint8Array {
  return Destination.hash(provider, identity.hash, APP_NAME, "delivery");
}

export function propagationDestinationHash(provider: CryptoProvider, identity: Identity): Uint8Array {
  return Destination.hash(provider, identity.hash, APP_NAME, "propagation");
}

function encodeTextOrBytes(value: string | Uint8Array): Uint8Array {
  const stepped = stepUtf8OrBytesWithActions(initialUtf8OrBytesState(), {
    kind: "utf8/or-bytes-gate",
    value
  });
  const raw = utf8OrBytesRawFromActions(stepped.actions);
  if (!shouldUseUtf8OrBytes(stepped.actions) || raw === null) {
    throw new Error("encodeTextOrBytes: missing use-raw action");
  }
  return raw;
}

export function rememberMessage(seen: Set<string>, message: LXMessage): void {
  if (!shouldRememberLxmfMessage(message.hash !== null)) {
    return;
  }
  const hash = message.hash;
  if (!shouldCommitRememberedLxmfHash(hash !== null) || hash === null) {
    return;
  }

  seen.add(bytesToHexLower(hash));
}

export function messagesEqual(left: LXMessage, right: LXMessage): boolean {
  return (
    left.titleAsString() === right.titleAsString() &&
    left.contentAsString() === right.contentAsString() &&
    equalBytes(left.destinationHash, right.destinationHash) &&
    equalBytes(left.sourceHash, right.sourceHash)
  );
}
