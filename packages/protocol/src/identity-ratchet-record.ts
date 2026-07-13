/**
 * Pure Identity ratchet persistence record (JSON over UTF-8).
 * Store IO and expiry clock stay at the adapter edge.
 */
import { bytesToHexLower, hexToBytesLower } from "./destination-name.js";
import { utf8Decode, utf8Encode } from "./utf8.js";

/** RATCHET_SIZE (256 bits) / 8 */
export const IDENTITY_RATCHET_BYTES = 32;
/** Mirrors RNS Identity.RATCHET_EXPIRY */
export const IDENTITY_RATCHET_EXPIRY_SECONDS = 60 * 60 * 24 * 30;

export interface IdentityRatchetRecord {
  readonly ratchet: Uint8Array;
  readonly received: number;
}

export function identityRatchetStoreKey(destinationHashHex: string): string {
  return `ratchets/${destinationHashHex}`;
}

export function encodeIdentityRatchetRecord(record: IdentityRatchetRecord): Uint8Array {
  const json = JSON.stringify({
    ratchet: bytesToHexLower(record.ratchet),
    received: record.received
  });
  return utf8Encode(json);
}

export function decodeIdentityRatchetRecord(bytes: Uint8Array): IdentityRatchetRecord {
  const parsed = JSON.parse(utf8Decode(bytes)) as {
    ratchet: string;
    received: number;
  };
  return {
    ratchet: hexToBytesLower(parsed.ratchet),
    received: parsed.received
  };
}

export function isIdentityRatchetRecordUsable(
  record: IdentityRatchetRecord,
  nowSeconds: number,
  options: {
    readonly expirySeconds?: number;
    readonly ratchetBytes?: number;
  } = {}
): boolean {
  const expirySeconds = options.expirySeconds ?? IDENTITY_RATCHET_EXPIRY_SECONDS;
  const ratchetBytes = options.ratchetBytes ?? IDENTITY_RATCHET_BYTES;
  if (record.ratchet.length !== ratchetBytes) {
    return false;
  }
  return nowSeconds < record.received + expirySeconds;
}

export type IdentityRatchetLookupPlan =
  | "use-cache"
  | "miss-no-store"
  | "miss-store"
  | "reject-unusable"
  | "restore";

/**
 * Ratchet lookup: cache hit, store absence/miss, unusable record, or restore.
 * Store get / Map set stay at the adapter (call again after store read).
 */
export function planIdentityRatchetLookup(input: {
  readonly cachedPresent: boolean;
  readonly storePresent: boolean;
  readonly storedPresent: boolean;
  readonly usable: boolean;
}): IdentityRatchetLookupPlan {
  if (input.cachedPresent) {
    return "use-cache";
  }
  if (!input.storePresent) {
    return "miss-no-store";
  }
  if (!input.storedPresent) {
    return "miss-store";
  }
  if (!input.usable) {
    return "reject-unusable";
  }
  return "restore";
}
