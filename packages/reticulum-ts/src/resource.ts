import {
  RESOURCE_ADVERTISEMENT_OVERHEAD,
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_MAPHASH_LEN,
  RESOURCE_MAX_ADV_RETRIES,
  RESOURCE_MAX_RETRIES,
  RESOURCE_PART_TIMEOUT_FACTOR,
  RESOURCE_PROCESSING_GRACE,
  RESOURCE_RANDOM_HASH_SIZE,
  RESOURCE_SENDER_GRACE_TIME,
  RESOURCE_ADVERTISE_WAIT_TIMER_ID,
  RESOURCE_WINDOW,
  RESOURCE_WINDOW_FLEXIBILITY,
  RESOURCE_WINDOW_MAX,
  RESOURCE_WINDOW_MAX_FAST,
  RESOURCE_WINDOW_MAX_SLOW,
  RESOURCE_WINDOW_MIN,
  ResourceStatus,
  applyResourceStatusEvent,
  assembleByteArraysRawFromActions,
  assembleResourceHashmapBytesRawFromActions,
  encodeResourceAdvertisementFlagsFromActions,
  initialAcceptIncomingResourceAdvertisementState,
  initialAdvertiseResourceState,
  initialAppendResourceMapHashCollisionGuardState,
  initialAssembleByteArraysState,
  initialAssembleResourceHashmapBytesState,
  initialClassifyResourceAdvertisementState,
  initialComputeResourceTimeoutState,
  initialComputeResourceTotalPartsState,
  initialContainsResourceHashState,
  initialDecodeResourceAdvertisementFlagsState,
  initialEncodeResourceAdvertisementFlagsState,
  initialProveResourceAllowState,
  initialResourceAdvertisementRoleFlagsState,
  initialResourceAdvertiseWaitState,
  initialResourceContinueTransferState,
  initialResourceEncryptMaterialState,
  initialResourceExpectedProofMaterialState,
  initialResourceHashMaterialState,
  initialResourceHashmapSlotWritesState,
  initialResourcePartMapHashMaterialState,
  initialResourceReceivePartAllowState,
  initialResourceRequestNextAllowState,
  initialResourceStatusState,
  initialResourceWatchdogAllowState,
  isResourceComplete,
  initialPackResourceAdvertisementState,
  initialReadResourceRequestHashState,
  initialUnpackResourceAdvertisementState,
  packResourceAdvertisementRawFromActions,
  packResourceHashmapUpdatePacketRawFromActions,
  packResourceHashmapUpdateRawFromActions,
  packResourceProofRawFromActions,
  applyResourceHashmapSlotWrites,
  initialPackResourceHashmapUpdatePacketState,
  initialPackResourceHashmapUpdateState,
  initialPackResourceProofState,
  initialParseResourcePartRequestState,
  initialResourceAssembleState,
  initialResourceHashmapUpdateAcceptState,
  initialResourcePartRequestState,
  initialResourceProofAcceptState,
  initialResourceReceivePartState,
  initialResourceRequestFulfillState,
  initialSplitResourceDecryptedPayloadState,
  initialSplitResourceHashmapUpdatePacketState,
  initialSplitResourceProofState,
  initialUnpackResourceHashmapUpdateState,
  resourceAdvertisementFieldsFromActions,
  resourceAdvertisementFlagFieldsFromActions,
  resourceAdvertisementRoleFlagsFromActions,
  resourceDecryptedPayloadFromActions,
  resourceHashmapSlotWritesFromActions,
  resourceHashmapUpdateFieldsFromActions,
  resourceHashmapUpdatePacketFieldsFromActions,
  resourceMapHashCollisionGuardFromActions,
  resourcePartRequestFieldsFromActions,
  resourcePartRequestFromActions,
  resourceProofFieldsFromActions,
  resourceReceivePartFromActions,
  resourceRequestFulfillFromActions,
  readResourceRequestHashRawFromActions,
  shouldAppendResourceMapHashCollisionGuard,
  shouldApplyResourceHashmapUpdateAccept,
  shouldCollideResourceMapHashCollisionGuard,
  shouldCompleteResourceAssemble,
  shouldCompleteResourceProofAccept,
  shouldClassifyResourceAdvertisementRequest,
  shouldClassifyResourceAdvertisementResponse,
  shouldPresentResourceHash,
  shouldRejectUnpackResourceAdvertisement,
  shouldRejectParseResourcePartRequest,
  shouldRejectSplitResourceDecryptedPayload,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectSplitResourceProof,
  shouldRejectUnpackResourceHashmapUpdate,
  shouldUseAssembleByteArrays,
  shouldUseAssembleResourceHashmapBytes,
  shouldUseDecodeResourceAdvertisementFlags,
  shouldUseEncodeResourceAdvertisementFlags,
  shouldUsePackResourceAdvertisement,
  shouldUsePackResourceHashmapUpdate,
  shouldUsePackResourceHashmapUpdatePacket,
  shouldUsePackResourceProof,
  shouldUseParseResourcePartRequest,
  shouldUseReadResourceRequestHash,
  shouldUseResourceAdvertisementRoleFlags,
  shouldUseUnpackResourceAdvertisement,
  shouldUseSplitResourceDecryptedPayload,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseSplitResourceProof,
  shouldUseUnpackResourceHashmapUpdate,
  shouldWriteResourceHashmapSlots,
  stepAppendResourceMapHashCollisionGuardWithActions,
  stepAssembleByteArraysWithActions,
  stepAssembleResourceHashmapBytesWithActions,
  stepClassifyResourceAdvertisementWithActions,
  stepComputeResourceTimeoutWithActions,
  stepComputeResourceTotalPartsWithActions,
  stepContainsResourceHashWithActions,
  stepDecodeResourceAdvertisementFlagsWithActions,
  stepEncodeResourceAdvertisementFlagsWithActions,
  stepPackResourceAdvertisementWithActions,
  stepReadResourceRequestHashWithActions,
  stepResourceEncryptMaterialWithActions,
  stepResourceExpectedProofMaterialWithActions,
  stepResourceHashMaterialWithActions,
  stepResourcePartMapHashMaterialWithActions,
  stepPackResourceHashmapUpdatePacketWithActions,
  stepPackResourceHashmapUpdateWithActions,
  stepPackResourceProofWithActions,
  stepParseResourcePartRequestWithActions,
  stepResourceAdvertisementRoleFlagsWithActions,
  stepUnpackResourceAdvertisementWithActions,
  stepResourceAssembleWithActions,
  stepResourceHashmapSlotWritesWithActions,
  stepResourceHashmapUpdateAcceptWithActions,
  stepResourcePartRequestWithActions,
  stepResourceProofAcceptWithActions,
  stepResourceReceivePartWithActions,
  stepResourceRequestFulfillWithActions,
  stepSplitResourceDecryptedPayloadWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepSplitResourceProofWithActions,
  stepUnpackResourceHashmapUpdateWithActions,
  resourceEncryptMaterialRawFromActions,
  resourceExpectedProofMaterialRawFromActions,
  resourceHashMaterialRawFromActions,
  resourceHashmapMaxLen,
  resourcePartMapHashMaterialRawFromActions,
  resourceTimeoutFromActions,
  resourceTotalPartsFromActions,
  shouldAcceptResourceRandomHashLength,
  initialResourceRandomHashLengthValidState,
  stepResourceRandomHashLengthValidWithActions,
  shouldRejectResourceEncryptMaterial,
  shouldRejectResourceHashMaterial,
  shouldRejectResourcePartMapHashMaterial,
  shouldUseComputeResourceTotalParts,
  shouldUseResourceTimeout,
  shouldUseResourceEncryptMaterial,
  shouldUseResourceExpectedProofMaterial,
  shouldUseResourceHashMaterial,
  shouldUseResourcePartMapHashMaterial,
  shouldAcceptIncomingResourceAdvertisementNow,
  shouldAdvertiseResourceNow,
  shouldAdvanceResourceAwaitingProof,
  shouldAllowProveResource,
  shouldAllowResourceReceivePart,
  shouldAllowResourceRequestNext,
  shouldAllowResourceWatchdog,
  shouldApplyResourceFulfillPartNow,
  shouldApplyResourceReceivePartSlot,
  shouldCommitResourceAssemblePayload,
  shouldContinueResourceTransfer,
  shouldFulfillResourcePartRequest,
  shouldSendResourceHashmapUpdate,
  stepAcceptIncomingResourceAdvertisementWithActions,
  stepAdvertiseResourceWithActions,
  stepApplyResourceFulfillPartWithActions,
  stepProveResourceAllowWithActions,
  stepResourceAdvertiseWaitWithActions,
  stepResourceContinueTransferWithActions,
  stepResourceReceivePartAllowWithActions,
  stepResourceRequestNextAllowWithActions,
  stepResourceWatchdogAllowWithActions,
  stepResourceWatchdogWithActions,
  initialApplyResourceFulfillPartState,
  type ResourceStatusEvent,
  type ResourceStatusValue,
  type ResourceWatchdogState,
  type ResourceWatchdogStepResult
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./crypto/provider.js";
import { equalBytes } from "./crypto/bytes.js";
import { Identity } from "./identity.js";
import type { Link } from "./link.js";
import type { LeafTransport } from "./transport/node.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType
} from "./packet.js";
import { DestinationType } from "./destination.js";

/** Mirrors RNS/Resource.py constants. */
export {
  ResourceStatus,
  RESOURCE_WINDOW,
  RESOURCE_WINDOW_MIN,
  RESOURCE_WINDOW_MAX_SLOW,
  RESOURCE_WINDOW_MAX_FAST,
  RESOURCE_WINDOW_MAX,
  RESOURCE_WINDOW_FLEXIBILITY,
  RESOURCE_MAPHASH_LEN,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_RANDOM_HASH_SIZE,
  RESOURCE_MAX_RETRIES,
  RESOURCE_MAX_ADV_RETRIES,
  RESOURCE_PART_TIMEOUT_FACTOR,
  RESOURCE_SENDER_GRACE_TIME,
  RESOURCE_PROCESSING_GRACE,
  type ResourceStatusValue
};

export interface ResourceCallbacks {
  readonly callback?: (resource: Resource) => void;
  readonly progressCallback?: (resource: Resource) => void;
}

export interface ResourceOptions extends ResourceCallbacks {
  readonly advertise?: boolean;
  readonly autoCompress?: boolean;
  readonly timeout?: number;
  /** Optional injected resource random hash (first 4 bytes used). */
  readonly randomHash?: Uint8Array;
}

interface ResourcePart {
  readonly data: Uint8Array;
  readonly mapHash: Uint8Array;
  raw: Uint8Array;
  sent: boolean;
}

/** Mirrors RNS/Resource.py ResourceAdvertisement. */
export class ResourceAdvertisement {
  static readonly OVERHEAD = RESOURCE_ADVERTISEMENT_OVERHEAD;
  static readonly HASHMAP_MAX_LEN = resourceHashmapMaxLen();

  t = 0;
  d = 0;
  n = 0;
  h = new Uint8Array(0);
  r = new Uint8Array(0);
  o = new Uint8Array(0);
  m = new Uint8Array(0);
  f = 0;
  i = 1;
  l = 1;
  q: Uint8Array | null = null;
  e = false;
  c = false;
  s = false;
  u = false;
  p = false;
  x = false;

  static isRequest(plaintext: Uint8Array): boolean {
    const stepped = stepUnpackResourceAdvertisementWithActions(
      initialUnpackResourceAdvertisementState(),
      {
        kind: "resource-advertisement/unpack-gate",
        data: plaintext
      }
    );
    if (shouldRejectUnpackResourceAdvertisement(stepped.actions)) {
      return false;
    }
    const fields = shouldUseUnpackResourceAdvertisement(stepped.actions)
      ? resourceAdvertisementFieldsFromActions(stepped.actions)
      : null;
    if (fields === null) {
      return false;
    }
    const classified = stepClassifyResourceAdvertisementWithActions(
      initialClassifyResourceAdvertisementState(),
      {
        kind: "resource-advertisement/classify-gate",
        fields
      }
    );
    return shouldClassifyResourceAdvertisementRequest(classified.actions);
  }

  static isResponse(plaintext: Uint8Array): boolean {
    const stepped = stepUnpackResourceAdvertisementWithActions(
      initialUnpackResourceAdvertisementState(),
      {
        kind: "resource-advertisement/unpack-gate",
        data: plaintext
      }
    );
    if (shouldRejectUnpackResourceAdvertisement(stepped.actions)) {
      return false;
    }
    const fields = shouldUseUnpackResourceAdvertisement(stepped.actions)
      ? resourceAdvertisementFieldsFromActions(stepped.actions)
      : null;
    if (fields === null) {
      return false;
    }
    const classified = stepClassifyResourceAdvertisementWithActions(
      initialClassifyResourceAdvertisementState(),
      {
        kind: "resource-advertisement/classify-gate",
        fields
      }
    );
    return shouldClassifyResourceAdvertisementResponse(classified.actions);
  }

  static unpack(data: Uint8Array): ResourceAdvertisement {
    const stepped = stepUnpackResourceAdvertisementWithActions(
      initialUnpackResourceAdvertisementState(),
      {
        kind: "resource-advertisement/unpack-gate",
        data
      }
    );
    if (
      shouldRejectUnpackResourceAdvertisement(stepped.actions) ||
      !shouldUseUnpackResourceAdvertisement(stepped.actions)
    ) {
      throw new Error("Invalid resource advertisement");
    }
    const fields = resourceAdvertisementFieldsFromActions(stepped.actions);
    if (fields === null) {
      throw new Error("Invalid resource advertisement");
    }
    const flagStepped = stepDecodeResourceAdvertisementFlagsWithActions(
      initialDecodeResourceAdvertisementFlagsState(),
      {
        kind: "resource-advertisement/decode-flags-gate",
        flags: fields.f
      }
    );
    const flags = shouldUseDecodeResourceAdvertisementFlags(flagStepped.actions)
      ? resourceAdvertisementFlagFieldsFromActions(flagStepped.actions)
      : null;
    if (flags === null) {
      throw new Error("Invalid resource advertisement");
    }
    const adv = new ResourceAdvertisement();
    adv.t = fields.t;
    adv.d = fields.d;
    adv.n = fields.n;
    adv.h = fields.h;
    adv.r = fields.r;
    adv.o = fields.o;
    adv.m = fields.m;
    adv.f = fields.f;
    adv.i = fields.i;
    adv.l = fields.l;
    adv.q = fields.q;
    adv.e = flags.e;
    adv.c = flags.c;
    adv.s = flags.s;
    adv.u = flags.u;
    adv.p = flags.p;
    adv.x = flags.x;
    return adv;
  }

  constructor(resource?: Resource) {
    if (resource === undefined) {
      return;
    }

    this.t = resource.size;
    this.d = resource.totalSize;
    this.n = resource.totalParts;
    this.h = Uint8Array.from(resource.hash);
    this.r = Uint8Array.from(resource.randomHash);
    this.o = Uint8Array.from(resource.originalHash);
    this.m = Uint8Array.from(resource.hashmapBytes);
    this.c = resource.compressed;
    this.e = resource.encrypted;
    this.s = resource.split;
    this.x = resource.hasMetadata;
    this.i = resource.segmentIndex;
    this.l = resource.totalSegments;
    this.q = resource.requestId;
    const roleStepped = stepResourceAdvertisementRoleFlagsWithActions(
      initialResourceAdvertisementRoleFlagsState(),
      {
        kind: "resource/advertisement-role-flags-gate",
        requestIdPresent: resource.requestId !== null,
        isResponse: resource.isResponse
      }
    );
    const role = shouldUseResourceAdvertisementRoleFlags(roleStepped.actions)
      ? resourceAdvertisementRoleFlagsFromActions(roleStepped.actions)
      : null;
    this.u = role?.u ?? false;
    this.p = role?.p ?? false;
    const encodeStepped = stepEncodeResourceAdvertisementFlagsWithActions(
      initialEncodeResourceAdvertisementFlagsState(),
      {
        kind: "resource-advertisement/encode-flags-gate",
        flags: {
          e: this.e,
          c: this.c,
          s: this.s,
          u: this.u,
          p: this.p,
          x: this.x
        }
      }
    );
    const packedFlags = shouldUseEncodeResourceAdvertisementFlags(encodeStepped.actions)
      ? encodeResourceAdvertisementFlagsFromActions(encodeStepped.actions)
      : null;
    if (packedFlags === null) {
      throw new Error("Failed to encode resource advertisement flags");
    }
    this.f = packedFlags;
  }

  pack(): Uint8Array {
    const stepped = stepPackResourceAdvertisementWithActions(
      initialPackResourceAdvertisementState(),
      {
        kind: "resource-advertisement/pack-gate",
        fields: {
          t: this.t,
          d: this.d,
          n: this.n,
          h: this.h,
          r: this.r,
          o: this.o,
          m: this.m,
          f: this.f,
          i: this.i,
          l: this.l,
          q: this.q
        }
      }
    );
    const packed = shouldUsePackResourceAdvertisement(stepped.actions)
      ? packResourceAdvertisementRawFromActions(stepped.actions)
      : null;
    if (packed === null) {
      throw new Error("Failed to pack resource advertisement");
    }
    return packed;
  }
}

/** Mirrors RNS/Resource.py bulk transfer over links. */
/** Adapt resource timeout via protocol actions (no ad-hoc `computeResourceTimeout` reads). */
function resourceTimeoutForLink(link: Link): number {
  const stepped = stepComputeResourceTimeoutWithActions(
    initialComputeResourceTimeoutState(),
    {
      kind: "resource/timeout-gate",
      rtt: link.rtt ?? 1,
      trafficTimeoutFactor: link.trafficTimeoutFactor
    }
  );
  const timeout = shouldUseResourceTimeout(stepped.actions)
    ? resourceTimeoutFromActions(stepped.actions)
    : null;
  if (timeout === null) {
    throw new Error("Resource: missing use-timeout action");
  }
  return timeout;
}

export class Resource {
  readonly link: Link;
  readonly initiator: boolean;
  readonly hash: Uint8Array;
  readonly originalHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly encrypted: boolean;
  readonly compressed: boolean;
  readonly split = false;
  readonly hasMetadata = false;
  readonly segmentIndex = 1;
  readonly totalSegments = 1;
  readonly requestId: Uint8Array | null;
  readonly isResponse: boolean;
  readonly hashmapBytes: Uint8Array;
  readonly expectedProof: Uint8Array;
  readonly totalSize: number;
  readonly sdu: number;

  size = 0;
  totalParts = 0;
  status: ResourceStatusValue = ResourceStatus.NONE;
  data: Uint8Array | null = null;
  progress = 0;
  window = RESOURCE_WINDOW;
  windowMax = RESOURCE_WINDOW_MAX_SLOW;
  windowMin = RESOURCE_WINDOW_MIN;
  windowFlexibility = RESOURCE_WINDOW_FLEXIBILITY;
  eifr: number | null = null;

  private readonly provider: CryptoProvider;
  private readonly parts: ResourcePart[] = [];
  private readonly receivedParts: Array<Uint8Array | null> = [];
  private hashmap: Array<Uint8Array | null> = [];
  private readonly reqHashlist = new Set<string>();
  private readonly callbacks: ResourceCallbacks;
  private readonly timeout: number;
  private retriesLeft = RESOURCE_MAX_RETRIES;
  private advSent = 0;
  private consecutiveCompletedHeight = -1;
  private receivedCount = 0;
  private outstandingParts = 0;
  private waitingForHashmap = false;
  private receiverMinConsecutiveHeight = 0;
  private sentParts = 0;
  private hashmapHeight = 0;
  private assemblyStarted = false;
  private watchdogTimer: ReturnType<LeafTransport["clock"]["setTimeout"]> | null = null;
  startedTransferring: number | null = null;

  private constructor(
    provider: CryptoProvider,
    link: Link,
    options: {
      readonly initiator: boolean;
      readonly hash: Uint8Array;
      readonly originalHash: Uint8Array;
      readonly randomHash: Uint8Array;
      readonly encrypted: boolean;
      readonly compressed: boolean;
      readonly size: number;
      readonly totalSize: number;
      readonly totalParts: number;
      readonly hashmapBytes: Uint8Array;
      readonly expectedProof: Uint8Array;
      readonly parts: ResourcePart[];
      readonly requestId?: Uint8Array | null;
      readonly isResponse?: boolean;
      readonly callbacks?: ResourceCallbacks;
      readonly timeout?: number;
    }
  ) {
    this.provider = provider;
    this.link = link;
    this.initiator = options.initiator;
    this.hash = options.hash;
    this.originalHash = options.originalHash;
    this.randomHash = options.randomHash;
    this.encrypted = options.encrypted;
    this.compressed = options.compressed;
    this.size = options.size;
    this.totalSize = options.totalSize;
    this.totalParts = options.totalParts;
    this.hashmapBytes = options.hashmapBytes;
    this.expectedProof = options.expectedProof;
    this.parts = options.parts;
    this.requestId = options.requestId ?? null;
    this.isResponse = options.isResponse ?? false;
    this.callbacks = options.callbacks ?? {};
    this.sdu = link.mdu;
    this.timeout = options.timeout ?? resourceTimeoutForLink(link);
  }

  static send(link: Link, data: Uint8Array, options: ResourceOptions = {}): Resource {
    const provider = link.cryptoProvider;
    const randomHash =
      options.randomHash !== undefined
        ? Uint8Array.from(options.randomHash.subarray(0, RESOURCE_RANDOM_HASH_SIZE))
        : Identity.getRandomHash(provider, link.linkTransport.entropy).subarray(
            0,
            RESOURCE_RANDOM_HASH_SIZE
          );
    if (
      !shouldAcceptResourceRandomHashLength(
        stepResourceRandomHashLengthValidWithActions(
          initialResourceRandomHashLengthValidState(),
          {
            kind: "resource-proof/random-hash-length-valid-gate",
            length: randomHash.length
          }
        ).actions
      )
    ) {
      throw new Error(`Resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
    }
    const encryptStepped = stepResourceEncryptMaterialWithActions(
      initialResourceEncryptMaterialState(),
      {
        kind: "resource-material/encrypt-gate",
        randomHash,
        data
      }
    );
    const payload = resourceEncryptMaterialRawFromActions(encryptStepped.actions);
    if (
      shouldRejectResourceEncryptMaterial(encryptStepped.actions) ||
      !shouldUseResourceEncryptMaterial(encryptStepped.actions) ||
      payload === null
    ) {
      throw new Error("Resource encrypt material rejected");
    }
    const encryptedPayload = link.encrypt(payload);
    const sdu = link.mdu;
    const totalPartsStepped = stepComputeResourceTotalPartsWithActions(
      initialComputeResourceTotalPartsState(),
      {
        kind: "resource-material/total-parts-gate",
        length: encryptedPayload.length,
        sdu
      }
    );
    const totalParts = resourceTotalPartsFromActions(totalPartsStepped.actions);
    if (
      !shouldUseComputeResourceTotalParts(totalPartsStepped.actions) ||
      totalParts === null
    ) {
      throw new Error("Resource total parts rejected");
    }
    const hashMaterialStepped = stepResourceHashMaterialWithActions(
      initialResourceHashMaterialState(),
      {
        kind: "resource-material/hash-gate",
        data,
        randomHash
      }
    );
    const hashInput = resourceHashMaterialRawFromActions(hashMaterialStepped.actions);
    if (
      shouldRejectResourceHashMaterial(hashMaterialStepped.actions) ||
      !shouldUseResourceHashMaterial(hashMaterialStepped.actions) ||
      hashInput === null
    ) {
      throw new Error("Resource hash material rejected");
    }
    const hash = Identity.fullHash(provider, hashInput);
    const expectedProofStepped = stepResourceExpectedProofMaterialWithActions(
      initialResourceExpectedProofMaterialState(),
      {
        kind: "resource-material/expected-proof-gate",
        data,
        resourceHash: hash
      }
    );
    const expectedProofMaterial = resourceExpectedProofMaterialRawFromActions(
      expectedProofStepped.actions
    );
    if (
      !shouldUseResourceExpectedProofMaterial(expectedProofStepped.actions) ||
      expectedProofMaterial === null
    ) {
      throw new Error("Resource expected-proof material rejected");
    }
    const expectedProof = Identity.fullHash(provider, expectedProofMaterial);

    const parts: ResourcePart[] = [];
    const mapHashes: Uint8Array[] = [];
    let collisionGuard: Uint8Array[] = [];

    let hashmapOk = false;
    while (!hashmapOk) {
      hashmapOk = true;
      parts.length = 0;
      mapHashes.length = 0;
      collisionGuard = [];

      for (let index = 0; index < totalParts; index += 1) {
        const partData = encryptedPayload.subarray(index * sdu, (index + 1) * sdu);
        const partMapStepped = stepResourcePartMapHashMaterialWithActions(
          initialResourcePartMapHashMaterialState(),
          {
            kind: "resource-material/part-map-hash-gate",
            partData,
            randomHash
          }
        );
        const partMapMaterial = resourcePartMapHashMaterialRawFromActions(partMapStepped.actions);
        if (
          shouldRejectResourcePartMapHashMaterial(partMapStepped.actions) ||
          !shouldUseResourcePartMapHashMaterial(partMapStepped.actions) ||
          partMapMaterial === null
        ) {
          throw new Error("Resource part map-hash material rejected");
        }
        const mapHash = Identity.fullHash(provider, partMapMaterial).subarray(
          0,
          RESOURCE_MAPHASH_LEN
        );

        const collisionStepped = stepAppendResourceMapHashCollisionGuardWithActions(
          initialAppendResourceMapHashCollisionGuardState(),
          {
            kind: "resource-hashmap/collision-guard-gate",
            guard: collisionGuard,
            mapHash,
            hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN
          }
        );
        if (shouldCollideResourceMapHashCollisionGuard(collisionStepped.actions)) {
          hashmapOk = false;
          break;
        }
        const nextGuard = resourceMapHashCollisionGuardFromActions(collisionStepped.actions);
        if (
          !shouldAppendResourceMapHashCollisionGuard(collisionStepped.actions) ||
          nextGuard === null
        ) {
          hashmapOk = false;
          break;
        }
        collisionGuard = [...nextGuard];

        const packet = Packet.fromFields(provider, {
          headerType: PacketHeaderType.HEADER_1,
          transportType: TransportType.BROADCAST,
          destinationType: DestinationType.LINK,
          packetType: PacketType.DATA,
          destinationHash: link.linkId,
          context: PacketContext.RESOURCE,
          data: partData
        });

        parts.push({
          data: partData,
          mapHash: Uint8Array.from(mapHash),
          raw: packet.raw,
          sent: false
        });
        mapHashes.push(Uint8Array.from(mapHash));
      }
    }

    const assembleStepped = stepAssembleResourceHashmapBytesWithActions(
      initialAssembleResourceHashmapBytesState(),
      {
        kind: "resource-hashmap/assemble-bytes-gate",
        mapHashes
      }
    );
    const hashmapBytes = shouldUseAssembleResourceHashmapBytes(assembleStepped.actions)
      ? assembleResourceHashmapBytesRawFromActions(assembleStepped.actions)
      : null;
    if (hashmapBytes === null) {
      throw new Error("Resource hashmap assemble rejected");
    }

    const resource = new Resource(provider, link, {
      initiator: true,
      hash,
      originalHash: hash,
      randomHash,
      encrypted: true,
      compressed: false,
      size: encryptedPayload.length,
      totalSize: data.length,
      totalParts,
      hashmapBytes,
      expectedProof,
      parts,
      callbacks: {
        ...(options.callback === undefined ? {} : { callback: options.callback }),
        ...(options.progressCallback === undefined ? {} : { progressCallback: options.progressCallback })
      },
      ...(options.timeout === undefined ? {} : { timeout: options.timeout })
    });

    if (
      shouldAdvertiseResourceNow(
        stepAdvertiseResourceWithActions(initialAdvertiseResourceState(), {
          kind: "resource/advertise-option-gate",
          advertiseOption: options.advertise
        }).actions
      )
    ) {
      void resource.advertise();
    }

    return resource;
  }

  static accept(
    link: Link,
    plaintext: Uint8Array,
    packet: Packet,
    options: ResourceCallbacks = {}
  ): Resource | null {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      const provider = link.cryptoProvider;
      const containsStepped = stepContainsResourceHashWithActions(initialContainsResourceHashState(), {
        kind: "resource-hashmap/contains-hash-gate",
        hashes: link.incomingResources.map((resource) => resource.hash),
        target: adv.h
      });
      if (
        !shouldAcceptIncomingResourceAdvertisementNow(
          stepAcceptIncomingResourceAdvertisementWithActions(
            initialAcceptIncomingResourceAdvertisementState(),
            {
              kind: "resource/accept-incoming-adv-gate",
              alreadyIncoming: shouldPresentResourceHash(containsStepped.actions)
            }
          ).actions
        )
      ) {
        return null;
      }

      const resource = new Resource(provider, link, {
        initiator: false,
        hash: adv.h,
        originalHash: adv.o,
        randomHash: adv.r,
        encrypted: adv.e,
        compressed: adv.c,
        size: adv.t,
        totalSize: adv.d,
        totalParts: adv.n,
        hashmapBytes: adv.m,
        expectedProof: new Uint8Array(0),
        parts: [],
        requestId: adv.q,
        isResponse: adv.p,
        callbacks: {
          ...(options.callback === undefined ? {} : { callback: options.callback }),
          ...(options.progressCallback === undefined ? {} : { progressCallback: options.progressCallback })
        }
      });

      resource.applyStatus({ kind: "resource/transferring" });
      resource.receivedParts.length = adv.n;
      resource.receivedParts.fill(null);
      resource.hashmap = new Array(adv.n).fill(null);
      resource.startedTransferring = link.linkTransport.clock.now() / 1000;
      resource.hashmapUpdate(0, adv.m);
      link.registerIncomingResource(resource);
      resource.startWatchdog();
      return resource;
    } catch {
      return null;
    }
  }

  static reject(link: Link, plaintext: Uint8Array): void {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      void link.sendContext(PacketContext.RESOURCE_RCL, adv.h);
    } catch {
      // Ignore malformed advertisements.
    }
  }

  static readRequestHash(requestData: Uint8Array): Uint8Array {
    const stepped = stepReadResourceRequestHashWithActions(initialReadResourceRequestHashState(), {
      kind: "resource-hashmap/read-request-hash-gate",
      requestData
    });
    const hash = shouldUseReadResourceRequestHash(stepped.actions)
      ? readResourceRequestHashRawFromActions(stepped.actions)
      : null;
    if (hash === null) {
      throw new Error("Resource request hash read rejected");
    }
    return hash;
  }

  getTransferSize(): number {
    return this.size;
  }

  getDataSize(): number {
    return this.totalSize;
  }

  getParts(): number {
    return this.totalParts;
  }

  isComplete(): boolean {
    return isResourceComplete(this.status);
  }

  async advertise(): Promise<void> {
    await new Promise<void>((resolve) => {
      const armed = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
        kind: "advertise-wait/arm"
      });
      let waitState = armed.state;
      let timer: ReturnType<LeafTransport["clock"]["setTimeout"]> | null = null;
      let concluded = false;

      const finish = (): void => {
        if (concluded) {
          return;
        }
        concluded = true;
        timer?.cancel();
        timer = null;
        resolve();
      };

      const applyIntents = (
        intents: ReturnType<typeof stepResourceAdvertiseWaitWithActions>["intents"]
      ): void => {
        for (const intent of intents) {
          if (intent.kind === "timer/cancel" && intent.timer.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID) {
            timer?.cancel();
            timer = null;
          }
          if (intent.kind === "timer/set" && intent.timer.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID) {
            timer?.cancel();
            timer = this.link.linkTransport.clock.setTimeout(() => {
              timer = null;
              const tick = stepResourceAdvertiseWaitWithActions(waitState, {
                kind: "timer/fired",
                id: RESOURCE_ADVERTISE_WAIT_TIMER_ID,
                at: this.link.linkTransport.clock.now()
              });
              waitState = tick.state;
              applyIntents(tick.intents);
              applyActions(tick.actions);
            }, intent.timer.delayMs);
          }
        }
      };

      const applyActions = (
        actions: ReturnType<typeof stepResourceAdvertiseWaitWithActions>["actions"]
      ): void => {
        for (const action of actions) {
          if (action.kind === "queue") {
            this.applyStatus({ kind: "resource/queue" });
          }
          if (action.kind === "probe") {
            const probe = stepResourceAdvertiseWaitWithActions(waitState, {
              kind: "advertise-wait/link-ready",
              ready: this.link.readyForNewResource()
            });
            waitState = probe.state;
            applyIntents(probe.intents);
            applyActions(probe.actions);
          }
          if (action.kind === "resolve") {
            finish();
          }
        }
      };

      applyIntents(armed.intents);
      applyActions(armed.actions);
    });

    const packed = new ResourceAdvertisement(this).pack();
    this.applyStatus({ kind: "resource/advertise" });
    this.advSent = this.link.linkTransport.clock.now() / 1000;
    this.startedTransferring = this.advSent;
    this.retriesLeft = RESOURCE_MAX_ADV_RETRIES;
    this.link.registerOutgoingResource(this);
    await this.link.sendContext(PacketContext.RESOURCE_ADV, packed);
    this.startWatchdog();
  }

  hasSeenRequest(packet: Packet): boolean {
    const key = bytesToHex(packet.raw);
    return this.reqHashlist.has(key);
  }

  trackRequest(packet: Packet): void {
    this.reqHashlist.add(bytesToHex(packet.raw));
  }

  async handleRequest(requestData: Uint8Array): Promise<void> {
    if (
      !shouldContinueResourceTransfer(
        stepResourceContinueTransferWithActions(initialResourceContinueTransferState(), {
          kind: "resource/continue-transfer-gate",
          status: this.status
        }).actions
      )
    ) {
      return;
    }

    this.applyStatus({ kind: "resource/transferring" });
    this.retriesLeft = RESOURCE_MAX_RETRIES;
    this.startWatchdog();

    const parseStepped = stepParseResourcePartRequestWithActions(
      initialParseResourcePartRequestState(),
      {
        kind: "resource-hashmap/parse-part-request-gate",
        requestData
      }
    );
    const request = shouldRejectParseResourcePartRequest(parseStepped.actions)
      ? null
      : shouldUseParseResourcePartRequest(parseStepped.actions)
        ? resourcePartRequestFieldsFromActions(parseStepped.actions)
        : null;
    if (!shouldFulfillResourcePartRequest(request !== null)) {
      return;
    }

    const { actions } = stepResourceRequestFulfillWithActions(initialResourceRequestFulfillState(), {
      kind: "resource/request-fulfill-gate",
      request: request!,
      partMapHashes: this.parts.map((part) => part.mapHash),
      partSent: this.parts.map((part) => part.sent),
      receiverMinConsecutiveHeight: this.receiverMinConsecutiveHeight,
      hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN,
      windowMax: RESOURCE_WINDOW_MAX,
      totalParts: this.totalParts,
      sentParts: this.sentParts
    });
    await this.applyResourceRequestFulfillActions(actions);
  }

  private async applyResourceRequestFulfillActions(
    actions: ReturnType<typeof stepResourceRequestFulfillWithActions>["actions"]
  ): Promise<void> {
    const plan = resourceRequestFulfillFromActions(actions);
    if (plan === null) {
      return;
    }

    for (const action of plan.partActions) {
      const part = this.parts[action.index];
      const applyStepped = stepApplyResourceFulfillPartWithActions(
        initialApplyResourceFulfillPartState(),
        {
          kind: "resource-hashmap/apply-fulfill-part-gate",
          partPresent: part !== undefined
        }
      );
      if (!shouldApplyResourceFulfillPartNow(applyStepped.actions)) {
        continue;
      }
      if (action.kind === "send") {
        await this.link.sendResourcePart(part!.data);
        part!.sent = true;
      } else {
        await this.link.resendPacket(part!.raw);
      }
    }
    this.sentParts = plan.nextSentParts;
    this.receiverMinConsecutiveHeight = plan.nextReceiverMinConsecutiveHeight;

    if (shouldSendResourceHashmapUpdate(plan.hashmapUpdate !== null)) {
      const assembleStepped = stepAssembleResourceHashmapBytesWithActions(
        initialAssembleResourceHashmapBytesState(),
        {
          kind: "resource-hashmap/assemble-bytes-gate",
          mapHashes: plan.hashmapUpdate!.mapHashes
        }
      );
      const hashmap = shouldUseAssembleResourceHashmapBytes(assembleStepped.actions)
        ? assembleResourceHashmapBytesRawFromActions(assembleStepped.actions)
        : null;
      if (hashmap === null) {
        return;
      }
      const packUpdateStepped = stepPackResourceHashmapUpdateWithActions(
        initialPackResourceHashmapUpdateState(),
        {
          kind: "resource-hashmap/pack-update-gate",
          segment: plan.hashmapUpdate!.segment,
          hashmap
        }
      );
      const update = shouldUsePackResourceHashmapUpdate(packUpdateStepped.actions)
        ? packResourceHashmapUpdateRawFromActions(packUpdateStepped.actions)
        : null;
      if (update === null) {
        return;
      }
      const packPacketStepped = stepPackResourceHashmapUpdatePacketWithActions(
        initialPackResourceHashmapUpdatePacketState(),
        {
          kind: "resource-hashmap/pack-packet-gate",
          resourceHash: this.hash,
          updateBytes: update
        }
      );
      const packet = shouldUsePackResourceHashmapUpdatePacket(packPacketStepped.actions)
        ? packResourceHashmapUpdatePacketRawFromActions(packPacketStepped.actions)
        : null;
      if (packet === null) {
        return;
      }
      await this.link.sendContext(PacketContext.RESOURCE_HMU, packet);
    }

    if (shouldAdvanceResourceAwaitingProof(plan.status)) {
      this.applyStatus({ kind: "resource/awaiting-proof" });
    }
  }

  hashmapUpdatePacket(plaintext: Uint8Array): void {
    const splitStepped = stepSplitResourceHashmapUpdatePacketWithActions(
      initialSplitResourceHashmapUpdatePacketState(),
      {
        kind: "resource-hashmap/split-packet-gate",
        plaintext
      }
    );
    const split = shouldRejectSplitResourceHashmapUpdatePacket(splitStepped.actions)
      ? null
      : shouldUseSplitResourceHashmapUpdatePacket(splitStepped.actions)
        ? resourceHashmapUpdatePacketFieldsFromActions(splitStepped.actions)
        : null;
    const unpackStepped =
      split === null
        ? null
        : stepUnpackResourceHashmapUpdateWithActions(initialUnpackResourceHashmapUpdateState(), {
            kind: "resource-hashmap/unpack-update-gate",
            bytes: split.updateBytes
          });
    const update =
      unpackStepped === null || shouldRejectUnpackResourceHashmapUpdate(unpackStepped.actions)
        ? null
        : shouldUseUnpackResourceHashmapUpdate(unpackStepped.actions)
          ? resourceHashmapUpdateFieldsFromActions(unpackStepped.actions)
          : null;
    const { actions } = stepResourceHashmapUpdateAcceptWithActions(
      initialResourceHashmapUpdateAcceptState(),
      {
        kind: "resource/hashmap-update-accept-gate",
        canContinue: shouldContinueResourceTransfer(
          stepResourceContinueTransferWithActions(initialResourceContinueTransferState(), {
            kind: "resource/continue-transfer-gate",
            status: this.status
          }).actions
        ),
        splitOk: split !== null,
        unpackOk: update !== null
      }
    );
    if (!shouldApplyResourceHashmapUpdateAccept(actions) || update === null) {
      return;
    }
    this.hashmapUpdate(update.segment, update.hashmap);
  }

  hashmapUpdate(segment: number, hashmap: Uint8Array): void {
    if (
      !shouldContinueResourceTransfer(
        stepResourceContinueTransferWithActions(initialResourceContinueTransferState(), {
          kind: "resource/continue-transfer-gate",
          status: this.status
        }).actions
      )
    ) {
      return;
    }

    this.applyStatus({ kind: "resource/transferring" });
    const writesStepped = stepResourceHashmapSlotWritesWithActions(
      initialResourceHashmapSlotWritesState(),
      {
        kind: "resource/hashmap-slot-writes-gate",
        segment,
        hashmap,
        hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN
      }
    );
    const writes = shouldWriteResourceHashmapSlots(writesStepped.actions)
      ? resourceHashmapSlotWritesFromActions(writesStepped.actions)
      : [];
    const applied = applyResourceHashmapSlotWrites({
      hashmap: this.hashmap,
      hashmapHeight: this.hashmapHeight,
      writes
    });
    this.hashmap = applied.hashmap;
    this.hashmapHeight = applied.hashmapHeight;

    this.waitingForHashmap = false;
    void this.requestNext();
  }

  receivePart(packet: Packet): void {
    if (
      !shouldAllowResourceReceivePart(
        stepResourceReceivePartAllowWithActions(initialResourceReceivePartAllowState(), {
          kind: "resource/receive-part-allow-gate",
          status: this.status
        }).actions
      )
    ) {
      return;
    }

    const partData = packet.data;
    const partMapStepped = stepResourcePartMapHashMaterialWithActions(
      initialResourcePartMapHashMaterialState(),
      {
        kind: "resource-material/part-map-hash-gate",
        partData,
        randomHash: this.randomHash
      }
    );
    const partMapMaterial = resourcePartMapHashMaterialRawFromActions(partMapStepped.actions);
    if (
      shouldRejectResourcePartMapHashMaterial(partMapStepped.actions) ||
      !shouldUseResourcePartMapHashMaterial(partMapStepped.actions) ||
      partMapMaterial === null
    ) {
      return;
    }
    const partHash = Identity.fullHash(this.provider, partMapMaterial).subarray(
      0,
      RESOURCE_MAPHASH_LEN
    );

    const { actions } = stepResourceReceivePartWithActions(initialResourceReceivePartState(), {
      kind: "resource/receive-part-gate",
      partHash,
      hashmap: this.hashmap,
      receivedParts: this.receivedParts,
      consecutiveCompletedHeight: this.consecutiveCompletedHeight,
      window: this.window,
      receivedCount: this.receivedCount,
      outstandingParts: this.outstandingParts,
      totalParts: this.totalParts,
      assemblyStarted: this.assemblyStarted
    });
    this.applyResourceReceivePartActions(partData, actions);
  }

  private applyResourceReceivePartActions(
    partData: Uint8Array,
    actions: ReturnType<typeof stepResourceReceivePartWithActions>["actions"]
  ): void {
    const plan = resourceReceivePartFromActions(actions);
    if (plan === null) {
      return;
    }

    if (
      shouldApplyResourceReceivePartSlot({
        matched: plan.matched,
        slotPresent: plan.slot !== null
      })
    ) {
      this.receivedParts[plan.slot!] = Uint8Array.from(partData);
      this.receivedCount = plan.receivedCount;
      this.outstandingParts = plan.outstandingParts;
      this.consecutiveCompletedHeight = plan.consecutiveCompletedHeight;
      this.progress = plan.progress;
      this.callbacks.progressCallback?.(this);
    }

    if (plan.shouldAssemble) {
      this.assemblyStarted = true;
      void this.assemble();
    } else if (plan.shouldRequestNext) {
      void this.requestNext();
    }
  }

  async requestNext(): Promise<void> {
    if (
      !shouldAllowResourceRequestNext(
        stepResourceRequestNextAllowWithActions(initialResourceRequestNextAllowState(), {
          kind: "resource/request-next-allow-gate",
          status: this.status,
          waitingForHashmap: this.waitingForHashmap
        }).actions
      )
    ) {
      return;
    }

    const { actions } = stepResourcePartRequestWithActions(initialResourcePartRequestState(), {
      kind: "resource/part-request-gate",
      receivedParts: this.receivedParts,
      hashmap: this.hashmap,
      consecutiveCompletedHeight: this.consecutiveCompletedHeight,
      window: this.window,
      hashmapHeight: this.hashmapHeight,
      resourceHash: this.hash
    });
    const plan = resourcePartRequestFromActions(actions);
    if (plan === null) {
      return;
    }
    this.outstandingParts = plan.outstandingParts;
    this.waitingForHashmap = plan.waitingForHashmap;
    await this.link.sendContext(PacketContext.RESOURCE_REQ, plan.requestData);
  }

  async assemble(): Promise<void> {
    if (
      !shouldContinueResourceTransfer(
        stepResourceContinueTransferWithActions(initialResourceContinueTransferState(), {
          kind: "resource/continue-transfer-gate",
          status: this.status
        }).actions
      )
    ) {
      return;
    }

    try {
      this.applyStatus({ kind: "resource/assemble" });
      const assembleStepped = stepAssembleByteArraysWithActions(
        initialAssembleByteArraysState(),
        {
          kind: "bytes/assemble-gate",
          parts: this.receivedParts.map((part) => part!)
        }
      );
      const stream = shouldUseAssembleByteArrays(assembleStepped.actions)
        ? assembleByteArraysRawFromActions(assembleStepped.actions)
        : null;
      if (stream === null) {
        return;
      }
      const decrypted = this.link.decrypt(stream);
      const decryptedStepped =
        decrypted === null
          ? null
          : stepSplitResourceDecryptedPayloadWithActions(
              initialSplitResourceDecryptedPayloadState(),
              {
                kind: "resource-proof/split-decrypted-gate",
                decrypted
              }
            );
      const payload =
        decryptedStepped === null ||
        shouldRejectSplitResourceDecryptedPayload(decryptedStepped.actions) ||
        !shouldUseSplitResourceDecryptedPayload(decryptedStepped.actions)
          ? null
          : resourceDecryptedPayloadFromActions(decryptedStepped.actions);
      const hashMaterialStepped =
        payload === null
          ? null
          : stepResourceHashMaterialWithActions(initialResourceHashMaterialState(), {
              kind: "resource-material/hash-gate",
              data: payload,
              randomHash: this.randomHash
            });
      const hashInput =
        hashMaterialStepped === null ||
        shouldRejectResourceHashMaterial(hashMaterialStepped.actions) ||
        !shouldUseResourceHashMaterial(hashMaterialStepped.actions)
          ? null
          : resourceHashMaterialRawFromActions(hashMaterialStepped.actions);
      const calculatedHash =
        hashInput === null ? null : Identity.fullHash(this.provider, hashInput);
      const { actions } = stepResourceAssembleWithActions(initialResourceAssembleState(), {
        kind: "resource/assemble-gate",
        decryptedPresent: decrypted !== null,
        payloadPresent: payload !== null,
        hashMatches:
          calculatedHash !== null && equalBytes(calculatedHash, this.hash)
      });

      if (
        !shouldCommitResourceAssemblePayload({
          outcomeComplete: shouldCompleteResourceAssemble(actions),
          payloadPresent: payload !== null
        })
      ) {
        this.applyStatus({ kind: "resource/corrupt" });
        this.cancel();
        return;
      }

      this.data = payload!;
      this.applyStatus({ kind: "resource/complete" });
      this.progress = 1;
      await this.prove();
      this.link.resourceConcluded(this);
      this.callbacks.callback?.(this);
    } catch {
      this.applyStatus({ kind: "resource/corrupt" });
      this.cancel();
    }
  }

  async prove(): Promise<void> {
    if (
      !shouldAllowProveResource(
        stepProveResourceAllowWithActions(initialProveResourceAllowState(), {
          kind: "resource/prove-allow-gate",
          dataPresent: this.data !== null
        }).actions
      )
    ) {
      return;
    }

    const expectedProofStepped = stepResourceExpectedProofMaterialWithActions(
      initialResourceExpectedProofMaterialState(),
      {
        kind: "resource-material/expected-proof-gate",
        data: this.data!,
        resourceHash: this.hash
      }
    );
    const expectedProofMaterial = resourceExpectedProofMaterialRawFromActions(
      expectedProofStepped.actions
    );
    if (
      !shouldUseResourceExpectedProofMaterial(expectedProofStepped.actions) ||
      expectedProofMaterial === null
    ) {
      return;
    }
    const proof = Identity.fullHash(this.provider, expectedProofMaterial);
    const stepped = stepPackResourceProofWithActions(initialPackResourceProofState(), {
      kind: "resource-proof/pack-gate",
      resourceHash: this.hash,
      proofHash: proof
    });
    const proofData =
      shouldUsePackResourceProof(stepped.actions)
        ? packResourceProofRawFromActions(stepped.actions)
        : null;
    if (proofData === null) {
      return;
    }
    await this.link.sendProof(PacketContext.RESOURCE_PRF, proofData);
  }

  validateProof(proofData: Uint8Array): void {
    const splitStepped = stepSplitResourceProofWithActions(initialSplitResourceProofState(), {
      kind: "resource-proof/split-gate",
      proofData
    });
    const split =
      shouldRejectSplitResourceProof(splitStepped.actions) ||
      !shouldUseSplitResourceProof(splitStepped.actions)
        ? null
        : resourceProofFieldsFromActions(splitStepped.actions);
    const { actions } = stepResourceProofAcceptWithActions(initialResourceProofAcceptState(), {
      kind: "resource/proof-accept-gate",
      status: this.status,
      proofValid:
        split !== null && equalBytes(split.proofHash, this.expectedProof)
    });
    if (!shouldCompleteResourceProofAccept(actions)) {
      return;
    }

    this.applyStatus({ kind: "resource/complete" });
    this.progress = 1;
    this.link.resourceConcluded(this);
    this.callbacks.callback?.(this);
  }

  cancel(): void {
    this.applyStatus({ kind: "resource/fail" });
    this.stopWatchdog();
    this.link.resourceConcluded(this);
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    this.applyWatchdogResult(
      stepResourceWatchdogWithActions(this.snapshotWatchdogState(), { kind: "resource/watchdog-start" })
    );
  }

  private stopWatchdog(): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = null;
  }

  private scheduleWatchdog(delayMs: number): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = this.link.linkTransport.clock.setTimeout(() => {
      void this.watchdogTick();
    }, delayMs);
  }

  private async watchdogTick(): Promise<void> {
    if (
      !shouldAllowResourceWatchdog(
        stepResourceWatchdogAllowWithActions(initialResourceWatchdogAllowState(), {
          kind: "resource/watchdog-allow-gate",
          status: this.status
        }).actions
      )
    ) {
      return;
    }

    const result = stepResourceWatchdogWithActions(this.snapshotWatchdogState(), {
      kind: "timer/fired",
      id: "resource-watchdog",
      at: this.link.linkTransport.clock.now()
    });

    await this.applyWatchdogResultAsync(result);
  }

  private snapshotWatchdogState(): ResourceWatchdogState {
    return {
      status: this.status,
      initiator: this.initiator,
      advSent: this.advSent,
      timeout: this.timeout,
      retriesLeft: this.retriesLeft,
      outstandingParts: this.outstandingParts,
      receivedCount: this.receivedCount,
      totalParts: this.totalParts
    };
  }

  private applyStatus(event: ResourceStatusEvent): void {
    this.status = applyResourceStatusEvent(initialResourceStatusState(this.status), event).status;
  }

  private applyWatchdogResult(result: ResourceWatchdogStepResult): void {
    this.retriesLeft = result.state.retriesLeft;

    for (const intent of result.intents) {
      if (intent.kind === "timer/set" && intent.timer.id === "resource-watchdog") {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }

  private async applyWatchdogResultAsync(result: ResourceWatchdogStepResult): Promise<void> {
    this.retriesLeft = result.state.retriesLeft;

    for (const action of result.actions) {
      if (action.kind === "cancel") {
        this.cancel();
        return;
      }
      if (action.kind === "advertise") {
        await this.advertise();
      } else if (action.kind === "request-next") {
        await this.requestNext();
      }
    }

    for (const intent of result.intents) {
      if (intent.kind === "timer/set" && intent.timer.id === "resource-watchdog") {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

