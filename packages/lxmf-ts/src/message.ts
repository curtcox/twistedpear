import {
  bytesToHexLower,
  LXMF_ENCRYPTED_PACKET_MAX_CONTENT,
  LXMF_ENCRYPTED_PACKET_MDU,
  LXMF_LINK_PACKET_MAX_CONTENT,
  LXMF_LINK_PACKET_MDU,
  lxmfContentSizeFromPackedLength,
  initialCommitRememberedLxmfHashState,
  initialExtractLxmfOpportunisticPayloadState,
  initialLxmfDeliveryState,
  initialLxmfOpportunisticPayloadState,
  initialLxmfPackTimestampState,
  initialLxmfPropagatedPackPrepState,
  initialLxMessageInstancePackState,
  initialLxMessagePackState,
  initialLxmfSignatureState,
  initialRememberLxmfMessageState,
  initialSelectLxmfDeliveryParametersState,
  lxmfDeliveryDeliverParams,
  lxmfDeliveryOpportunisticRejectSizes,
  lxmfOpportunisticPayloadRawFromActions,
  lxmfSignatureOutcomeFromActions,
  shouldCommitRememberedLxmfHashNow,
  shouldDeliverLxmf,
  shouldExtractLxmfOpportunisticPayloadNow,
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
  shouldRememberLxmfMessageNow,
  shouldSelectLxmfDeliveryParametersNow,
  shouldUseLxmfOpportunisticPayload,
  shouldUseLxmfPackNow,
  shouldUseLxmfPackTimestamp,
  stepCommitRememberedLxmfHashWithActions,
  stepExtractLxmfOpportunisticPayloadWithActions,
  stepLxmfDeliveryWithActions,
  stepLxmfOpportunisticPayloadWithActions,
  stepLxmfPackTimestampWithActions,
  stepLxmfPropagatedPackPrepWithActions,
  stepLxmfSignatureWithActions,
  stepLxMessageInstancePackWithActions,
  stepLxMessagePackWithActions,
  stepRememberLxmfMessageWithActions,
  stepSelectLxmfDeliveryParametersWithActions,
} from "@twistedpear/protocol";
import type {
  CryptoProvider,
  DestinationDirectionValue,
} from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  Identity,
  equalBytes,
} from "@twistedpear/reticulum-ts";
import {
  decodeUtf8,
  encodeTextOrBytes,
  lxmfHashableMaterial,
  lxmfSignedMaterial,
  packLxmPayload,
  packLxmfDestinationPrefixed,
  packLxmfWire,
  packPropagationEnvelope,
  selectPackStamp,
  splitLxmfWire,
  unpackLxmPayload,
  type LxmPayloadParts,
} from "./message-codec.js";
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
  APP_NAME,
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

function selectMessageTimestamp(
  options: Pick<LXMessagePackOptions, "timestamp" | "now">,
): number {
  const timestampGate = stepLxmfPackTimestampWithActions(
    initialLxmfPackTimestampState(),
    {
      kind: "pack-timestamp/select",
      hasTimestamp: options.timestamp !== undefined,
      hasNow: options.now !== undefined,
    },
  );
  if (shouldUseLxmfPackTimestamp(timestampGate.actions)) {
    return options.timestamp!;
  }
  if (shouldUseLxmfPackNow(timestampGate.actions)) {
    return options.now!();
  }
  throw new Error("LXMessage.pack requires timestamp or now()");
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
  representation: LXMessageRepresentationValue =
    LXMessageRepresentation.UNKNOWN;
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
    this.destinationHash = endpointHash(
      options.destinationHash,
      this.destination,
    );
    this.sourceHash = endpointHash(options.sourceHash, this.source);
    this.title = encodeTextOrBytes(options.title ?? "");
    this.content = encodeTextOrBytes(options.content ?? "");
    this.fields = options.fields ?? {};
    this.desiredMethod = options.desiredMethod ?? LXMessageMethod.DIRECT;
  }

  static pack(options: LXMessagePackOptions): LXMessage {
    const packGate = stepLxMessagePackWithActions(initialLxMessagePackState(), {
      kind: "lxmessage-pack/gate",
      destinationDirectionOut:
        options.destination.direction === DestinationDirection.OUT,
      sourceDirectionIn: options.source.direction === DestinationDirection.IN,
      sourceIdentityPresent: options.source.identity !== null,
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
      desiredMethod: options.desiredMethod ?? LXMessageMethod.DIRECT,
    });

    message.timestamp = selectMessageTimestamp(options);
    message.pack(options.provider, {
      ...(options.stamp === undefined ? {} : { stamp: options.stamp }),
      ...(options.deferStamp === undefined
        ? {}
        : { deferStamp: options.deferStamp }),
    });
    return message;
  }

  static unpackFromBytes(
    lxmfBytes: Uint8Array,
    options: LXMessageUnpackOptions,
  ): LXMessage {
    const { destinationHash, sourceHash, signature, payload } =
      splitLxmfWire(lxmfBytes);
    const { timestamp, title, content, fields, stamp } =
      unpackLxmPayload(payload);
    const hashedPart = lxmfHashableMaterial(
      destinationHash,
      sourceHash,
      packLxmPayload(
        { timestamp, title, content, fields },
        undefined,
        "Invalid LXMF payload",
      ),
    );
    const messageHash = Identity.fullHash(options.provider, hashedPart);
    const signedPart = lxmfSignedMaterial(hashedPart, messageHash);

    const sourceIdentity =
      options.sourceIdentity ?? Identity.recall(options.provider, sourceHash);
    const destinationIdentity = Identity.recall(
      options.provider,
      destinationHash,
    );

    const message = new LXMessage({
      destination: deliveryDestination(
        options.provider,
        destinationIdentity,
        DestinationDirection.OUT,
      ),
      source: deliveryDestination(
        options.provider,
        sourceIdentity,
        DestinationDirection.IN,
      ),
      destinationHash,
      sourceHash,
      title,
      content,
      fields,
      desiredMethod: options.originalMethod ?? null,
    });

    message.hash = messageHash;
    message.signature = Uint8Array.from(signature);
    message.stamp = stamp;
    message.timestamp = timestamp;
    message.packed = Uint8Array.from(lxmfBytes);
    message.incoming = true;
    applySignatureOutcome(message, sourceIdentity, signature, signedPart);

    return message;
  }

  pack(
    provider: CryptoProvider,
    options: { stamp?: Uint8Array | null; deferStamp?: boolean } = {},
  ): void {
    this.assertPackable();

    const failure = "LXMessage failed to pack payload";
    const hashedPart = lxmfHashableMaterial(
      this.destination!.hash,
      this.source!.hash,
      packLxmPayload(this.payloadParts(), undefined, failure),
    );
    this.hash = Identity.fullHash(provider, hashedPart);

    const stamp = selectPackStamp(options);
    const payload = packLxmPayload(this.payloadParts(), stamp, failure);
    this.signature = this.source!.identity!.sign(
      lxmfSignedMaterial(hashedPart, this.hash),
    );
    this.signatureValidated = true;
    this.stamp = stamp;

    this.packed = packLxmfWire({
      destinationHash: this.destination!.hash,
      sourceHash: this.source!.hash,
      signature: this.signature,
      payload,
    });
    this.selectDeliveryParameters(provider);
  }

  private payloadParts(): LxmPayloadParts {
    return {
      timestamp: this.timestamp!,
      title: this.title,
      content: this.content,
      fields: this.fields,
    };
  }

  private assertPackable(): void {
    const packGate = stepLxMessageInstancePackWithActions(
      initialLxMessageInstancePackState(),
      {
        kind: "instance-pack/gate",
        alreadyPacked: this.packed !== null,
        destinationPresent: this.destination !== null,
        sourcePresent: this.source !== null,
        sourceIdentityPresent: this.source?.identity !== null,
        timestampPresent: this.timestamp !== null,
      },
    );
    if (shouldRejectLxMessageInstanceAlreadyPacked(packGate.actions)) {
      throw new Error("LXMessage is already packed");
    }
    if (shouldRejectLxMessageInstanceMissingEndpoints(packGate.actions)) {
      throw new Error(
        "LXMessage requires destination and source destinations to pack",
      );
    }
    if (shouldRejectLxMessageInstanceMissingTimestamp(packGate.actions)) {
      throw new Error(
        "LXMessage.pack requires timestamp to be set before packing",
      );
    }
  }

  titleAsString(): string {
    return decodeUtf8(this.title, "LXMessage.titleAsString");
  }

  contentAsString(): string {
    return decodeUtf8(this.content, "LXMessage.contentAsString");
  }

  opportunisticPayload(): Uint8Array {
    if (
      !shouldExtractLxmfOpportunisticPayloadNow(
        stepExtractLxmfOpportunisticPayloadWithActions(
          initialExtractLxmfOpportunisticPayloadState(),
          {
            kind: "lxmf/extract-opportunistic-payload-gate",
            packedPresent: this.packed !== null,
          },
        ).actions,
      )
    ) {
      throw new Error(
        "LXMessage must be packed before extracting opportunistic payload",
      );
    }

    const stepped = stepLxmfOpportunisticPayloadWithActions(
      initialLxmfOpportunisticPayloadState(),
      {
        kind: "lxmf-wire/opportunistic-payload-gate",
        packed: this.packed!,
      },
    );
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
    if (
      !shouldSelectLxmfDeliveryParametersNow(
        stepSelectLxmfDeliveryParametersWithActions(
          initialSelectLxmfDeliveryParametersState(),
          {
            kind: "lxmf/select-delivery-parameters-gate",
            packedPresent: packed !== null,
          },
        ).actions,
      )
    ) {
      return;
    }

    const desiredMethod = this.desiredMethod ?? LXMessageMethod.DIRECT;
    const contentSize = lxmfContentSizeFromPackedLength(packed!.length);

    const prep = stepLxmfPropagatedPackPrepWithActions(
      initialLxmfPropagatedPackPrepState(),
      {
        kind: "propagated-pack-prep/gate",
        packedPresent: true,
        desiredMethod,
        destinationIdentityPresent:
          this.destination !== null && this.destination.identity !== null,
        timestampPresent: this.timestamp !== null,
      },
    );
    if (shouldRejectLxmfPropagatedPackMissingIdentity(prep.actions)) {
      throw new Error("PROPAGATED LXMF requires destination identity");
    }
    if (shouldRejectLxmfPropagatedPackMissingTimestamp(prep.actions)) {
      throw new Error(
        "LXMessage.pack requires timestamp to be set before packing",
      );
    }
    if (shouldProceedLxmfPropagatedPackPrep(prep.actions)) {
      this.packPropagation(provider, packed!);
    }

    const stepped = stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
      kind: "delivery/select",
      desiredMethod,
      contentSize,
      encryptedPacketMaxContent: ENCRYPTED_PACKET_MAX_CONTENT,
      linkPacketMaxContent: LINK_PACKET_MAX_CONTENT,
      ...(desiredMethod === LXMessageMethod.PROPAGATED
        ? { propagationPackedLength: this.propagationPacked!.length }
        : {}),
    });
    this.applyLxmfDeliveryActions(stepped.actions);
  }

  private packPropagation(provider: CryptoProvider, packed: Uint8Array): void {
    const lxmfData = packLxmfDestinationPrefixed(
      this.destination!.hash,
      this.destination!.identity!.encrypt(packed.subarray(DESTINATION_LENGTH)),
    );
    this.transientId = Identity.fullHash(provider, lxmfData);
    this.propagationPacked = packPropagationEnvelope(this.timestamp!, [
      lxmfData,
    ]);
  }

  private applyLxmfDeliveryActions(
    actions: ReturnType<typeof stepLxmfDeliveryWithActions>["actions"],
  ): void {
    if (shouldRejectLxmfOpportunisticTooLarge(actions)) {
      const sizes = lxmfDeliveryOpportunisticRejectSizes(actions);
      throw new TypeError(
        `Opportunistic LXMF content of length ${sizes!.contentSize} exceeds single-packet limit ${sizes!.maxContent}`,
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

export function deliveryDestinationHash(
  provider: CryptoProvider,
  identity: Identity,
): Uint8Array {
  return Destination.hash(provider, identity.hash, APP_NAME, "delivery");
}

export function propagationDestinationHash(
  provider: CryptoProvider,
  identity: Identity,
): Uint8Array {
  return Destination.hash(provider, identity.hash, APP_NAME, "propagation");
}

function endpointHash(
  explicit: Uint8Array | undefined,
  endpoint: Destination | null,
): Uint8Array {
  return explicit ?? endpoint?.hash ?? new Uint8Array(DESTINATION_LENGTH);
}

function applySignatureOutcome(
  message: LXMessage,
  sourceIdentity: Identity | null,
  signature: Uint8Array,
  signedPart: Uint8Array,
): void {
  const signatureGate = stepLxmfSignatureWithActions(
    initialLxmfSignatureState(),
    {
      kind: "signature/outcome-gate",
      sourceIdentityPresent: sourceIdentity !== null,
      signatureValid:
        sourceIdentity !== null
          ? sourceIdentity.validate(signature, signedPart)
          : false,
    },
  );
  const outcome = lxmfSignatureOutcomeFromActions(signatureGate.actions);
  if (outcome === null) return;
  message.signatureValidated = outcome.signatureValidated;
  message.unverifiedReason = outcome.unverifiedReason;
}

function deliveryDestination(
  provider: CryptoProvider,
  identity: Identity | null,
  direction: DestinationDirectionValue,
): Destination | null {
  if (identity === null) return null;
  return new Destination(provider, {
    identity,
    direction,
    type: DestinationType.SINGLE,
    appName: APP_NAME,
    aspects: ["delivery"],
  });
}

export function rememberMessage(seen: Set<string>, message: LXMessage): void {
  if (
    !shouldRememberLxmfMessageNow(
      stepRememberLxmfMessageWithActions(initialRememberLxmfMessageState(), {
        kind: "lxmf/remember-message-gate",
        hasHash: message.hash !== null,
      }).actions,
    )
  ) {
    return;
  }
  const hash = message.hash;
  if (
    !shouldCommitRememberedLxmfHashNow(
      stepCommitRememberedLxmfHashWithActions(
        initialCommitRememberedLxmfHashState(),
        {
          kind: "lxmf/commit-remembered-hash-gate",
          hashPresent: hash !== null,
        },
      ).actions,
    ) ||
    hash === null
  ) {
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
