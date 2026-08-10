import {
  Identity,
  bytesToHex,
  equalBytes,
  hexToBytes,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";
import {
  T256Error,
  T256_ID_LENGTH,
  decode256t,
  encode256tParts,
} from "./codec.js";

/**
 * A signed, compact record that maps a 256t id of a .tpkg archive onto the
 * existing CatalogEntry-keyed fetch chain (Hyperdrive -> LAN mirror ->
 * Reticulum Resource). Announced as Reticulum app_data (<= 383 bytes).
 */
export interface CasLocator {
  readonly formatVersion: number;
  readonly t256: string;
  readonly appId: string;
  readonly version: string;
  readonly driveKey: string;
  readonly packageHash: string;
  readonly packageSize: number;
  readonly publisherPublicKey: string;
  /** Installation identity serving the Resource destination; v1 implied publisherPublicKey. */
  readonly servingPublicKey: string;
  readonly signature: string;
}

export const CAS_LOCATOR_MAGIC = new Uint8Array([0x54, 0x50, 0x43, 0x4c, 0x01]); // TPCL\x01
export const CAS_LOCATOR_REQUEST_MAGIC = new Uint8Array([
  0x54, 0x50, 0x43, 0x52, 0x01,
]); // TPCR\x01
export const MAX_CAS_LOCATOR_BYTES = 383;
export const CAS_ANNOUNCE_ASPECT = "cas";
export const CAS_REQUEST_ASPECT = "cas-request";

export function casAnnounceAspects(t256: string): [string, string] {
  const decoded = decode256t(t256);
  if (decoded.sha512 === null) {
    throw new T256Error(
      "INVALID_ID",
      "Inline 256t content is not announced; share the string directly",
    );
  }

  return [CAS_ANNOUNCE_ASPECT, bytesToHex(decoded.sha512.slice(0, 8))];
}

export function casDestinationName(t256: string): string {
  const [aspect, hash] = casAnnounceAspects(t256);
  return `tp.${aspect}.${hash}`;
}

export function casRequestAspects(t256: string): [string, string] {
  const [, hash] = casAnnounceAspects(t256);
  return [CAS_REQUEST_ASPECT, hash];
}

function writeString(value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  if (encoded.length > 255) {
    throw new T256Error("INVALID_ID", "Locator string field exceeds 255 bytes");
  }

  const out = new Uint8Array(1 + encoded.length);
  out[0] = encoded.length;
  out.set(encoded, 1);
  return out;
}

function readString(
  bytes: Uint8Array,
  offset: number,
): { value: string; offset: number } {
  const length = bytes[offset]!;
  const value = new TextDecoder().decode(
    bytes.subarray(offset + 1, offset + 1 + length),
  );
  return { value, offset: offset + 1 + length };
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Compact app_data asking peers to re-announce the locator for one 256t id. */
export function encodeCasLocatorRequest(t256: string): Uint8Array {
  const decoded = decode256t(t256);
  if (decoded.sha512 === null) {
    throw new T256Error(
      "INVALID_ID",
      "Inline 256t content needs no locator request",
    );
  }
  return concatBytes(CAS_LOCATOR_REQUEST_MAGIC, new TextEncoder().encode(t256));
}

export function decodeCasLocatorRequest(bytes: Uint8Array): string {
  if (
    bytes.length !== CAS_LOCATOR_REQUEST_MAGIC.length + T256_ID_LENGTH ||
    !equalBytes(
      bytes.subarray(0, CAS_LOCATOR_REQUEST_MAGIC.length),
      CAS_LOCATOR_REQUEST_MAGIC,
    )
  ) {
    throw new T256Error("INVALID_ID", "CAS locator request is invalid");
  }

  const t256 = new TextDecoder().decode(
    bytes.subarray(CAS_LOCATOR_REQUEST_MAGIC.length),
  );
  const decoded = decode256t(t256);
  if (decoded.sha512 === null) {
    throw new T256Error(
      "INVALID_ID",
      "Inline 256t content needs no locator request",
    );
  }
  return t256;
}

function locatorSigningPayload(
  locator: Omit<CasLocator, "signature">,
): Uint8Array {
  const decoded = decode256t(locator.t256);
  if (decoded.sha512 === null) {
    throw new T256Error(
      "INVALID_ID",
      "Inline 256t content needs no locator; share the string directly",
    );
  }

  const lengthBytes = new Uint8Array(6);
  let remaining = decoded.length;
  for (let index = 5; index >= 0; index -= 1) {
    lengthBytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }

  const size = new Uint8Array(4);
  size[0] = (locator.packageSize >>> 24) & 0xff;
  size[1] = (locator.packageSize >>> 16) & 0xff;
  size[2] = (locator.packageSize >>> 8) & 0xff;
  size[3] = locator.packageSize & 0xff;

  return concatBytes(
    CAS_LOCATOR_MAGIC,
    new Uint8Array([locator.formatVersion]),
    lengthBytes,
    decoded.sha512,
    writeString(locator.appId),
    writeString(locator.version),
    size,
    hexToBytes(locator.packageHash),
    hexToBytes(locator.driveKey),
    writeBytes(hexToBytes(locator.publisherPublicKey)),
    ...(locator.formatVersion >= 2
      ? [writeBytes(hexToBytes(locator.servingPublicKey))]
      : []),
  );
}

// Raw length-prefixed bytes: the publisher key as hex text would blow the
// Reticulum announce MTU (announce overhead + app_data must stay under 500).
function writeBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length > 255) {
    throw new T256Error("INVALID_ID", "Locator byte field exceeds 255 bytes");
  }

  const out = new Uint8Array(1 + bytes.length);
  out[0] = bytes.length;
  out.set(bytes, 1);
  return out;
}

function readBytes(
  bytes: Uint8Array,
  offset: number,
): { value: Uint8Array; offset: number } {
  const length = bytes[offset]!;
  return {
    value: Uint8Array.from(bytes.subarray(offset + 1, offset + 1 + length)),
    offset: offset + 1 + length,
  };
}

export function signCasLocator(
  identity: Identity,
  locator: Omit<
    CasLocator,
    "signature" | "publisherPublicKey" | "servingPublicKey" | "formatVersion"
  > & {
    readonly servingPublicKey?: string;
  },
): CasLocator {
  const publisherPublicKey = bytesToHex(identity.getPublicKey());
  const servingPublicKey = locator.servingPublicKey ?? publisherPublicKey;
  // Keep the common same-device case on v1 so announce packets stay under the
  // default 500-byte interface MTU; only emit v2 when serving diverges.
  const formatVersion = servingPublicKey === publisherPublicKey ? 1 : 2;
  const unsigned = {
    ...locator,
    formatVersion,
    publisherPublicKey,
    servingPublicKey,
  };
  const signature = bytesToHex(identity.sign(locatorSigningPayload(unsigned)));
  return { ...unsigned, signature };
}

export function verifyCasLocator(
  provider: CryptoProvider,
  locator: CasLocator,
): boolean {
  if (
    (locator.formatVersion !== 1 && locator.formatVersion !== 2) ||
    locator.t256.length !== T256_ID_LENGTH
  ) {
    return false;
  }

  try {
    const identity = Identity.fromPublicKey(
      provider,
      hexToBytes(locator.publisherPublicKey),
    );
    if (identity === null) {
      return false;
    }

    const { signature, ...unsigned } = locator;
    return identity.validate(
      hexToBytes(signature),
      locatorSigningPayload(unsigned),
    );
  } catch {
    return false;
  }
}

export function encodeCasLocator(locator: CasLocator): Uint8Array {
  const payload = locatorSigningPayload(locator);
  const bytes = concatBytes(payload, hexToBytes(locator.signature));
  if (bytes.length > MAX_CAS_LOCATOR_BYTES) {
    throw new T256Error(
      "INVALID_ID",
      `CAS locator exceeds ${MAX_CAS_LOCATOR_BYTES} bytes (${bytes.length})`,
    );
  }

  return bytes;
}

export function decodeCasLocator(bytes: Uint8Array): CasLocator {
  if (bytes.length < CAS_LOCATOR_MAGIC.length + 1 + 6 + 64) {
    throw new T256Error("INVALID_ID", "CAS locator too short");
  }

  if (
    !equalBytes(bytes.subarray(0, CAS_LOCATOR_MAGIC.length), CAS_LOCATOR_MAGIC)
  ) {
    throw new T256Error("INVALID_ID", "CAS locator magic mismatch");
  }

  let offset = CAS_LOCATOR_MAGIC.length;
  const formatVersion = bytes[offset]!;
  offset += 1;

  let length = 0;
  for (let index = 0; index < 6; index += 1) {
    length = length * 256 + bytes[offset + index]!;
  }
  offset += 6;

  const field = bytes.subarray(offset, offset + 64);
  offset += 64;
  const t256 = encode256tParts(length, Uint8Array.from(field));

  const appId = readString(bytes, offset);
  offset = appId.offset;
  const version = readString(bytes, offset);
  offset = version.offset;

  const packageSize =
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0;
  offset += 4;

  const packageHash = bytesToHex(bytes.subarray(offset, offset + 32));
  offset += 32;
  const driveKey = bytesToHex(bytes.subarray(offset, offset + 32));
  offset += 32;

  const publisherPublicKey = readBytes(bytes, offset);
  offset = publisherPublicKey.offset;

  const servingPublicKey =
    formatVersion >= 2 ? readBytes(bytes, offset) : publisherPublicKey;
  if (formatVersion >= 2) offset = servingPublicKey.offset;

  const signature = bytesToHex(bytes.subarray(offset, offset + 64));

  return {
    formatVersion,
    t256,
    appId: appId.value,
    version: version.value,
    driveKey,
    packageHash,
    packageSize,
    publisherPublicKey: bytesToHex(publisherPublicKey.value),
    servingPublicKey: bytesToHex(servingPublicKey.value),
    signature,
  };
}

/** Shape consumed by bridge-hyper's fetchPackage chain (CatalogEntry-compatible). */
export function toCatalogEntryLike(locator: CasLocator): {
  readonly appId: string;
  readonly name: string;
  readonly version: string;
  readonly packageSize: number;
  readonly packageHash: string;
  readonly driveKey: string;
  readonly publisherPublicKey: string;
  readonly servingPublicKey: string;
} {
  return {
    appId: locator.appId,
    name: locator.appId,
    version: locator.version,
    packageSize: locator.packageSize,
    packageHash: locator.packageHash,
    driveKey: locator.driveKey,
    publisherPublicKey: locator.publisherPublicKey,
    servingPublicKey: locator.servingPublicKey,
  };
}
