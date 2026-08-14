import {
  Destination,
  DestinationDirection,
  DestinationType,
  Identity,
  bytesToHex,
  equalBytes,
  hexToBytes,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";
import type { AppManifest } from "./manifest.js";
import { manifestSigningPayload } from "./manifest.js";
import { verifyManifestSignature } from "./signing.js";

export const APP_DESTINATION_ASPECT = "app";
export const MAX_ANNOUNCE_APP_DATA_BYTES = 383;

export interface AppAnnounceSummary {
  readonly formatVersion: number;
  readonly name: string;
  readonly version: string;
  readonly packageSize: number;
  readonly packageHash: string;
  readonly driveKey: string;
  readonly resourceAvailable: boolean;
  readonly publisherKeyHash: string;
  readonly signatureHash: string;
  readonly announceSignature: string;
}

export interface EncodedAppAnnounce {
  readonly summary: AppAnnounceSummary;
  readonly appData: Uint8Array;
  readonly destinationName: string;
}

export function appDestinationName(
  provider: CryptoProvider,
  publisherPublicKeyHex: string,
  appName: string,
): string {
  const publisherHash = provider
    .sha256(hexToBytes(publisherPublicKeyHex))
    .slice(0, 8);
  const nameHash = provider
    .sha256(new TextEncoder().encode(appName))
    .slice(0, 8);
  return `tp.app.${bytesToHex(publisherHash)}.${bytesToHex(nameHash)}`;
}

export function buildAppAnnounceSummary(
  provider: CryptoProvider,
  identity: Identity,
  options: {
    readonly manifest: AppManifest;
    readonly packageSize: number;
    readonly packageHash: string;
    readonly resourceAvailable: boolean;
  },
): AppAnnounceSummary {
  const publisherPublicKey = options.manifest.publisherPublicKey;
  const payload = manifestSigningPayload({
    formatVersion: options.manifest.formatVersion,
    name: options.manifest.name,
    version: options.manifest.version,
    entry: options.manifest.entry,
    capabilities: options.manifest.capabilities,
    icon: options.manifest.icon,
    minHostApi: options.manifest.minHostApi,
    files: options.manifest.files,
    driveKey: options.manifest.driveKey,
    publisherPublicKey,
  });
  const announceSignature = bytesToHex(identity.sign(payload));

  return {
    formatVersion: 1,
    name: options.manifest.name,
    version: options.manifest.version,
    packageSize: options.packageSize,
    packageHash: options.packageHash.slice(0, 16),
    driveKey: options.manifest.driveKey,
    resourceAvailable: options.resourceAvailable,
    publisherKeyHash: bytesToHex(
      provider.sha256(hexToBytes(publisherPublicKey)).slice(0, 8),
    ),
    signatureHash: bytesToHex(
      provider.sha256(hexToBytes(options.manifest.signature)).slice(0, 8),
    ),
    announceSignature,
  };
}

export const APP_ANNOUNCE_MAGIC = new Uint8Array([
  0x54, 0x50, 0x41, 0x44, 0x01,
]); // TPAD\x01

function writeString(bytes: string): Uint8Array {
  const encoded = new TextEncoder().encode(bytes);
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

export function encodeAppAnnounceData(summary: AppAnnounceSummary): Uint8Array {
  const packageHash = hexToBytes(summary.packageHash).slice(0, 8);
  const driveKey = hexToBytes(summary.driveKey).slice(0, 32);
  const publisherKeyHash = hexToBytes(summary.publisherKeyHash).slice(0, 8);
  const signatureHash = hexToBytes(summary.signatureHash).slice(0, 8);
  const announceSignature = hexToBytes(summary.announceSignature);

  const size = new Uint8Array(4);
  size[0] = (summary.packageSize >>> 24) & 0xff;
  size[1] = (summary.packageSize >>> 16) & 0xff;
  size[2] = (summary.packageSize >>> 8) & 0xff;
  size[3] = summary.packageSize & 0xff;

  const bytes = concatBytes(
    APP_ANNOUNCE_MAGIC,
    new Uint8Array([summary.formatVersion]),
    writeString(summary.name),
    writeString(summary.version),
    size,
    packageHash,
    driveKey,
    new Uint8Array([summary.resourceAvailable ? 1 : 0]),
    publisherKeyHash,
    signatureHash,
    announceSignature,
  );

  if (bytes.length > MAX_ANNOUNCE_APP_DATA_BYTES) {
    throw new Error(
      `App announce data exceeds ${MAX_ANNOUNCE_APP_DATA_BYTES} bytes (${bytes.length})`,
    );
  }

  return bytes;
}

function decodeLegacyAppAnnounce(appData: Uint8Array): AppAnnounceSummary {
  const parsed = JSON.parse(new TextDecoder().decode(appData)) as Record<
    string,
    unknown
  >;
  return {
    formatVersion: Number(legacyField(parsed, "v", "formatVersion", 1)),
    name: String(legacyField(parsed, "n", "name", "")),
    version: String(legacyField(parsed, "ver", "version", "0.0.0")),
    packageSize: Number(legacyField(parsed, "sz", "packageSize", 0)),
    packageHash: String(legacyField(parsed, "ph", "packageHash", "")),
    driveKey: String(legacyField(parsed, "dk", "driveKey", "")),
    resourceAvailable: Boolean(
      legacyField(parsed, "ra", "resourceAvailable", false),
    ),
    publisherKeyHash: String(
      legacyField(parsed, "pkh", "publisherKeyHash", ""),
    ),
    signatureHash: String(legacyField(parsed, "sh", "signatureHash", "")),
    announceSignature: String(
      legacyField(parsed, "sig", "announceSignature", ""),
    ),
  };
}

function legacyField(
  parsed: Record<string, unknown>,
  short: string,
  long: string,
  fallback: unknown,
): unknown {
  return parsed[short] ?? parsed[long] ?? fallback;
}

export function decodeAppAnnounceData(appData: Uint8Array): AppAnnounceSummary {
  if (appData.length < APP_ANNOUNCE_MAGIC.length + 1) {
    throw new Error("Invalid app announce data");
  }

  if (
    !equalBytes(
      appData.subarray(0, APP_ANNOUNCE_MAGIC.length),
      APP_ANNOUNCE_MAGIC,
    )
  ) {
    return decodeLegacyAppAnnounce(appData);
  }

  let offset = APP_ANNOUNCE_MAGIC.length;
  const formatVersion = appData[offset]!;
  offset += 1;
  const name = readString(appData, offset);
  offset = name.offset;
  const version = readString(appData, offset);
  offset = version.offset;
  const packageSize =
    ((appData[offset]! << 24) |
      (appData[offset + 1]! << 16) |
      (appData[offset + 2]! << 8) |
      appData[offset + 3]!) >>>
    0;
  offset += 4;
  const packageHash = bytesToHex(appData.subarray(offset, offset + 8));
  offset += 8;
  const driveKey = bytesToHex(appData.subarray(offset, offset + 32));
  offset += 32;
  const resourceAvailable = appData[offset] === 1;
  offset += 1;
  const publisherKeyHash = bytesToHex(appData.subarray(offset, offset + 8));
  offset += 8;
  const signatureHash = bytesToHex(appData.subarray(offset, offset + 8));
  offset += 8;
  const announceSignature = bytesToHex(appData.subarray(offset, offset + 64));

  return {
    formatVersion,
    name: name.value,
    version: version.value,
    packageSize,
    packageHash,
    driveKey,
    resourceAvailable,
    publisherKeyHash,
    signatureHash,
    announceSignature,
  };
}

export function verifyAppAnnounceSummary(
  provider: CryptoProvider,
  summary: AppAnnounceSummary,
  manifest: AppManifest,
  identity: Identity,
  packageHash: string,
): boolean {
  if (summary.formatVersion !== 1) {
    return false;
  }

  if (summary.name !== manifest.name || summary.version !== manifest.version) {
    return false;
  }

  if (summary.driveKey !== manifest.driveKey) {
    return false;
  }

  if (!packageHash.startsWith(summary.packageHash)) {
    return false;
  }

  const publisherKeyHash = bytesToHex(
    provider.sha256(hexToBytes(manifest.publisherPublicKey)).slice(0, 8),
  );
  const signatureHash = bytesToHex(
    provider.sha256(hexToBytes(manifest.signature)).slice(0, 8),
  );

  if (
    summary.publisherKeyHash !== publisherKeyHash ||
    summary.signatureHash !== signatureHash
  ) {
    return false;
  }

  const payload = manifestSigningPayload({
    formatVersion: manifest.formatVersion,
    name: manifest.name,
    version: manifest.version,
    entry: manifest.entry,
    capabilities: manifest.capabilities,
    icon: manifest.icon,
    minHostApi: manifest.minHostApi,
    files: manifest.files,
    driveKey: manifest.driveKey,
    publisherPublicKey: manifest.publisherPublicKey,
  });

  return (
    identity.validate(hexToBytes(summary.announceSignature), payload) &&
    verifyManifestSignature(provider, manifest)
  );
}

export function createAppDestination(
  provider: CryptoProvider,
  identity: Identity,
  appName: string,
): Destination {
  const publisherHash = bytesToHex(
    provider.sha256(identity.getPublicKey()).slice(0, 8),
  );
  const nameHash = bytesToHex(
    provider.sha256(new TextEncoder().encode(appName)).slice(0, 8),
  );
  return new Destination(provider, {
    identity,
    type: DestinationType.SINGLE,
    direction: DestinationDirection.IN,
    appName: "tp",
    aspects: ["app", publisherHash, nameHash],
  });
}

export function encodeAppAnnounce(
  provider: CryptoProvider,
  identity: Identity,
  appName: string,
  summary: AppAnnounceSummary,
): EncodedAppAnnounce {
  const destinationName = appDestinationName(
    provider,
    bytesToHex(identity.getPublicKey()),
    appName,
  );
  const appData = encodeAppAnnounceData(summary);
  return { summary, appData, destinationName };
}
