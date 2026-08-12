/**
 * Cut an encrypted resource payload into wire parts and the hashmap that
 * advertises them.
 *
 * Each part carries a truncated map hash; a collision between two map hashes
 * within one hashmap window makes the receiver unable to tell the parts apart,
 * so the whole payload is re-cut under a fresh random hash until the window is
 * collision-free — the same retry the reference implementation performs.
 */
import {
  initialAppendResourceMapHashCollisionGuardState,
  initialAssembleResourceHashmapBytesState,
  initialResourcePartMapHashMaterialState,
  RESOURCE_MAPHASH_LEN,
  assembleResourceHashmapBytesRawFromActions,
  resourceMapHashCollisionGuardFromActions,
  resourcePartMapHashMaterialRawFromActions,
  shouldAppendResourceMapHashCollisionGuard,
  shouldCollideResourceMapHashCollisionGuard,
  shouldRejectResourcePartMapHashMaterial,
  shouldUseAssembleResourceHashmapBytes,
  shouldUseResourcePartMapHashMaterial,
  stepAppendResourceMapHashCollisionGuardWithActions,
  stepAssembleResourceHashmapBytesWithActions,
  stepResourcePartMapHashMaterialWithActions,
} from "./protocol.js";

import type { CryptoProvider } from "../crypto/provider.js";
import { Identity } from "../identity.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../packet.js";
import { DestinationType } from "../destination.js";
import type { ResourcePart } from "./part.js";

export interface ResourcePartsPlan {
  readonly parts: ResourcePart[];
  readonly hashmapBytes: Uint8Array;
}

function partMapHash(
  provider: CryptoProvider,
  partData: Uint8Array,
  randomHash: Uint8Array,
): Uint8Array {
  const stepped = stepResourcePartMapHashMaterialWithActions(
    initialResourcePartMapHashMaterialState(),
    {
      kind: "resource-material/part-map-hash-gate",
      partData,
      randomHash,
    },
  );
  const material = resourcePartMapHashMaterialRawFromActions(stepped.actions);
  if (
    shouldRejectResourcePartMapHashMaterial(stepped.actions) ||
    !shouldUseResourcePartMapHashMaterial(stepped.actions) ||
    material === null
  ) {
    throw new Error("Resource part map-hash material rejected");
  }
  return Identity.fullHash(provider, material).subarray(
    0,
    RESOURCE_MAPHASH_LEN,
  );
}

function hashmapBytesFor(mapHashes: Uint8Array[]): Uint8Array {
  const stepped = stepAssembleResourceHashmapBytesWithActions(
    initialAssembleResourceHashmapBytesState(),
    {
      kind: "resource-hashmap/assemble-bytes-gate",
      mapHashes,
    },
  );
  if (!shouldUseAssembleResourceHashmapBytes(stepped.actions)) {
    throw new Error("Resource hashmap assemble rejected");
  }
  const bytes = assembleResourceHashmapBytesRawFromActions(stepped.actions);
  if (bytes === null) {
    throw new Error("Resource hashmap assemble rejected");
  }
  return bytes;
}

/**
 * Append `mapHash` to the collision guard, or report the collision that forces
 * the payload to be re-cut.
 */
function guardWith(
  guard: Uint8Array[],
  mapHash: Uint8Array,
  hashmapMaxLen: number,
): readonly Uint8Array[] | null {
  const stepped = stepAppendResourceMapHashCollisionGuardWithActions(
    initialAppendResourceMapHashCollisionGuardState(),
    {
      kind: "resource-hashmap/collision-guard-gate",
      guard,
      mapHash,
      hashmapMaxLen,
    },
  );
  if (shouldCollideResourceMapHashCollisionGuard(stepped.actions)) {
    return null;
  }
  const next = resourceMapHashCollisionGuardFromActions(stepped.actions);
  if (!shouldAppendResourceMapHashCollisionGuard(stepped.actions)) {
    return null;
  }
  return next;
}

function partPacket(
  provider: CryptoProvider,
  linkId: Uint8Array,
  partData: Uint8Array,
): Packet {
  return Packet.fromFields(provider, {
    headerType: PacketHeaderType.HEADER_1,
    transportType: TransportType.BROADCAST,
    destinationType: DestinationType.LINK,
    packetType: PacketType.DATA,
    destinationHash: linkId,
    context: PacketContext.RESOURCE,
    data: partData,
  });
}

export function buildResourceParts(options: {
  readonly provider: CryptoProvider;
  readonly linkId: Uint8Array;
  readonly encryptedPayload: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly totalParts: number;
  readonly sdu: number;
  readonly hashmapMaxLen: number;
}): ResourcePartsPlan {
  const {
    provider,
    linkId,
    encryptedPayload,
    randomHash,
    totalParts,
    sdu,
    hashmapMaxLen,
  } = options;
  const parts: ResourcePart[] = [];
  const mapHashes: Uint8Array[] = [];

  let hashmapOk = false;
  while (!hashmapOk) {
    hashmapOk = true;
    parts.length = 0;
    mapHashes.length = 0;
    let collisionGuard: Uint8Array[] = [];

    for (let index = 0; index < totalParts; index += 1) {
      const partData = encryptedPayload.subarray(
        index * sdu,
        (index + 1) * sdu,
      );
      const mapHash = partMapHash(provider, partData, randomHash);
      const nextGuard = guardWith(collisionGuard, mapHash, hashmapMaxLen);
      if (nextGuard === null) {
        hashmapOk = false;
        break;
      }
      collisionGuard = [...nextGuard];

      parts.push({
        data: partData,
        mapHash: Uint8Array.from(mapHash),
        raw: partPacket(provider, linkId, partData).raw,
        sent: false,
      });
      mapHashes.push(Uint8Array.from(mapHash));
    }
  }

  return { parts, hashmapBytes: hashmapBytesFor(mapHashes) };
}
