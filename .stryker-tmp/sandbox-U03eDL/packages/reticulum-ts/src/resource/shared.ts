// @ts-nocheck
import { RESOURCE_ADVERTISEMENT_OVERHEAD,RESOURCE_HASHMAP_IS_EXHAUSTED,RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,RESOURCE_MAPHASH_LEN,RESOURCE_MAX_ADV_RETRIES,RESOURCE_MAX_RETRIES,RESOURCE_PART_TIMEOUT_FACTOR,RESOURCE_PROCESSING_GRACE,RESOURCE_RANDOM_HASH_SIZE,RESOURCE_SENDER_GRACE_TIME,RESOURCE_ADVERTISE_WAIT_TIMER_ID,RESOURCE_WINDOW,RESOURCE_WINDOW_FLEXIBILITY,RESOURCE_WINDOW_MAX,RESOURCE_WINDOW_MAX_FAST,RESOURCE_WINDOW_MAX_SLOW,RESOURCE_WINDOW_MIN,ResourceStatus,applyResourceStatusEvent,assembleByteArraysRawFromActions,assembleResourceHashmapBytesRawFromActions,encodeResourceAdvertisementFlagsFromActions,initialAcceptIncomingResourceAdvertisementState,initialAdvertiseResourceState,initialAppendResourceMapHashCollisionGuardState,initialAssembleByteArraysState,initialAssembleResourceHashmapBytesState,initialClassifyResourceAdvertisementState,initialComputeResourceTimeoutState,initialComputeResourceTotalPartsState,initialContainsResourceHashState,initialDecodeResourceAdvertisementFlagsState,initialEncodeResourceAdvertisementFlagsState,initialProveResourceAllowState,initialResourceAdvertisementRoleFlagsState,initialResourceAdvertiseWaitState,initialResourceContinueTransferState,initialResourceEncryptMaterialState,initialResourceExpectedProofMaterialState,initialResourceHashMaterialState,initialResourceHashmapSlotWritesState,initialResourcePartMapHashMaterialState,initialResourceReceivePartAllowState,initialResourceRequestNextAllowState,initialResourceStatusState,initialResourceWatchdogAllowState,initialResourceCompleteState,initialPackResourceAdvertisementState,
  initialReadResourceRequestHashState,initialUnpackResourceAdvertisementState,packResourceAdvertisementRawFromActions,packResourceHashmapUpdatePacketRawFromActions,packResourceHashmapUpdateRawFromActions,packResourceProofRawFromActions,applyResourceHashmapSlotWritesFieldsFromActions,initialApplyResourceHashmapSlotWritesState,initialPackResourceHashmapUpdatePacketState,initialPackResourceHashmapUpdateState,initialPackResourceProofState,initialParseResourcePartRequestState,initialResourceAssembleState,initialResourceHashmapUpdateAcceptState,initialResourcePartRequestState,initialResourceProofAcceptState,initialResourceReceivePartState,initialResourceRequestFulfillState,initialSplitResourceDecryptedPayloadState,initialSplitResourceHashmapUpdatePacketState,initialSplitResourceProofState,initialUnpackResourceHashmapUpdateState,resourceAdvertisementFieldsFromActions,resourceAdvertisementFlagFieldsFromActions,resourceAdvertisementRoleFlagsFromActions,resourceDecryptedPayloadFromActions,resourceHashmapSlotWritesFromActions,resourceHashmapUpdateFieldsFromActions,resourceHashmapUpdatePacketFieldsFromActions,resourceMapHashCollisionGuardFromActions,resourcePartRequestFieldsFromActions,resourcePartRequestFromActions,resourceProofFieldsFromActions,resourceReceivePartFromActions,resourceRequestFulfillFromActions,readResourceRequestHashRawFromActions,shouldAppendResourceMapHashCollisionGuard,shouldApplyResourceHashmapUpdateAccept,shouldCollideResourceMapHashCollisionGuard,shouldCompleteResourceAssemble,shouldCompleteResourceProofAccept,shouldClassifyResourceAdvertisementRequest,
  shouldClassifyResourceAdvertisementResponse,shouldPresentResourceHash,shouldRejectUnpackResourceAdvertisement,shouldRejectParseResourcePartRequest,shouldRejectSplitResourceDecryptedPayload,shouldRejectSplitResourceHashmapUpdatePacket,shouldRejectSplitResourceProof,shouldRejectUnpackResourceHashmapUpdate,shouldUseApplyResourceHashmapSlotWrites,shouldUseAssembleByteArrays,shouldUseAssembleResourceHashmapBytes,shouldUseDecodeResourceAdvertisementFlags,shouldUseEncodeResourceAdvertisementFlags,shouldUsePackResourceAdvertisement,shouldUsePackResourceHashmapUpdate,shouldUsePackResourceHashmapUpdatePacket,shouldUsePackResourceProof,shouldUseParseResourcePartRequest,shouldUseReadResourceRequestHash,shouldUseResourceAdvertisementRoleFlags,shouldUseUnpackResourceAdvertisement,shouldUseSplitResourceDecryptedPayload,shouldUseSplitResourceHashmapUpdatePacket,shouldUseSplitResourceProof,shouldUseUnpackResourceHashmapUpdate,shouldWriteResourceHashmapSlots,stepAppendResourceMapHashCollisionGuardWithActions,stepApplyResourceHashmapSlotWritesWithActions,stepAssembleByteArraysWithActions,stepAssembleResourceHashmapBytesWithActions,stepClassifyResourceAdvertisementWithActions,stepComputeResourceTimeoutWithActions,stepComputeResourceTotalPartsWithActions,stepContainsResourceHashWithActions,stepDecodeResourceAdvertisementFlagsWithActions,stepEncodeResourceAdvertisementFlagsWithActions,stepPackResourceAdvertisementWithActions,stepReadResourceRequestHashWithActions,stepResourceEncryptMaterialWithActions,stepResourceExpectedProofMaterialWithActions,stepResourceHashMaterialWithActions,
  stepResourcePartMapHashMaterialWithActions,stepPackResourceHashmapUpdatePacketWithActions,stepPackResourceHashmapUpdateWithActions,stepPackResourceProofWithActions,stepParseResourcePartRequestWithActions,stepResourceAdvertisementRoleFlagsWithActions,stepUnpackResourceAdvertisementWithActions,stepCommitResourceAssemblePayloadWithActions,stepResourceAssembleWithActions,stepResourceHashmapSlotWritesWithActions,stepResourceHashmapUpdateAcceptWithActions,stepResourcePartRequestWithActions,stepResourceProofAcceptWithActions,stepResourceReceivePartWithActions,stepResourceRequestFulfillWithActions,stepSplitResourceDecryptedPayloadWithActions,stepSplitResourceHashmapUpdatePacketWithActions,stepSplitResourceProofWithActions,stepUnpackResourceHashmapUpdateWithActions,resourceEncryptMaterialRawFromActions,resourceExpectedProofMaterialRawFromActions,resourceHashMaterialRawFromActions,resourceHashmapMaxLen,resourcePartMapHashMaterialRawFromActions,resourceTimeoutFromActions,resourceTotalPartsFromActions,shouldAcceptResourceRandomHashLength,initialResourceRandomHashLengthValidState,stepResourceRandomHashLengthValidWithActions,shouldRejectResourceEncryptMaterial,shouldRejectResourceHashMaterial,shouldRejectResourcePartMapHashMaterial,shouldUseComputeResourceTotalParts,shouldUseResourceTimeout,shouldUseResourceEncryptMaterial,shouldUseResourceExpectedProofMaterial,shouldUseResourceHashMaterial,shouldUseResourcePartMapHashMaterial,shouldAcceptIncomingResourceAdvertisementNow,shouldAdvertiseResourceNow,shouldAdvanceResourceAwaitingProofNow,shouldAllowProveResource,
  shouldAllowResourceReceivePart,shouldAllowResourceRequestNext,shouldAllowResourceWatchdog,shouldApplyResourceFulfillPartNow,shouldApplyResourceReceivePartSlotNow,shouldCommitResourceAssemblePayloadNow,shouldContinueResourceTransfer,shouldFulfillResourcePartRequestNow,shouldSendResourceHashmapUpdateNow,shouldTreatResourceComplete,stepAcceptIncomingResourceAdvertisementWithActions,stepAdvertiseResourceWithActions,stepAdvanceResourceAwaitingProofWithActions,stepApplyResourceFulfillPartWithActions,stepApplyResourceReceivePartSlotWithActions,stepFulfillResourcePartRequestWithActions,stepProveResourceAllowWithActions,stepResourceAdvertiseWaitWithActions,stepResourceCompleteWithActions,stepResourceContinueTransferWithActions,stepResourceReceivePartAllowWithActions,stepResourceRequestNextAllowWithActions,stepResourceWatchdogAllowWithActions,stepResourceWatchdogWithActions,stepSendResourceHashmapUpdateWithActions,initialAdvanceResourceAwaitingProofState,initialApplyResourceFulfillPartState,initialApplyResourceReceivePartSlotState,initialCommitResourceAssemblePayloadState,initialFulfillResourcePartRequestState,initialSendResourceHashmapUpdateState,type ResourceStatusEvent,type ResourceStatusValue,type ResourceWatchdogState,type ResourceWatchdogStepResult } from "@twistedpear/protocol";
import Bunzip from "seek-bzip";
import type { CryptoProvider } from "../crypto/provider.js";
import { equalBytes } from "../crypto/bytes.js";
import { Identity } from "../identity.js";
import type { Link } from "../link.js";
import type { LeafTransport } from "../transport/node.js";
import { Packet,PacketContext,PacketHeaderType,PacketType,TransportType } from "../packet.js";
import { DestinationType } from "../destination.js";
import type { Resource } from "../resource.js";
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

export interface ResourcePart {
  readonly data: Uint8Array;
  readonly mapHash: Uint8Array;
  raw: Uint8Array;
  sent: boolean;
}

export const RESOURCE_PACKET_HEADER_MAX = 35;
export const RESOURCE_IFAC_MIN_SIZE = 1;

/** Compression adapter for Python RNS resource payloads. */
export function decodeResourcePayload(payload: Uint8Array, compressed: boolean): Uint8Array {
  return compressed ? Uint8Array.from(Bunzip.decode(payload)) : payload;
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

  pack(segment = 0): Uint8Array {
    const hashmapStart = segment * ResourceAdvertisement.HASHMAP_MAX_LEN * RESOURCE_MAPHASH_LEN;
    const hashmapEnd = Math.min(
      hashmapStart + ResourceAdvertisement.HASHMAP_MAX_LEN * RESOURCE_MAPHASH_LEN,
      this.m.length
    );
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
          m: this.m.subarray(hashmapStart, hashmapEnd),
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
export function resourceTimeoutForLink(link: Link): number {
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

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
