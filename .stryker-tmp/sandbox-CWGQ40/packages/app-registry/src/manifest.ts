// @ts-nocheck
import { bytesToHex, hexToBytes } from "@twistedpear/reticulum-ts";

export const PACKAGE_FORMAT_VERSION = 1;
export const MANIFEST_SIGNING_FIELDS = [
  "formatVersion",
  "name",
  "version",
  "entry",
  "capabilities",
  "icon",
  "minHostApi",
  "files",
  "driveKey",
  "publisherPublicKey"
] as const;

export interface ManifestFileEntry {
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
}

export interface AppManifest {
  readonly formatVersion: number;
  readonly name: string;
  readonly version: string;
  readonly entry: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly icon: string | null;
  readonly minHostApi: string;
  readonly files: ReadonlyArray<ManifestFileEntry>;
  readonly driveKey: string;
  readonly publisherPublicKey: string;
  readonly signature: string;
}

export type UnsignedManifest = Omit<AppManifest, "signature">;

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function isValidSemver(version: string): boolean {
  return SEMVER_RE.test(version);
}

export function compareSemver(left: string, right: string): number {
  if (!isValidSemver(left) || !isValidSemver(right)) {
    throw new Error(`Invalid semver: ${left} or ${right}`);
  }

  const parse = (value: string): [number, number, number, string, string] => {
    const match = SEMVER_RE.exec(value);
    if (match === null) {
      throw new Error(`Invalid semver: ${value}`);
    }

    return [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      match[4] ?? "",
      match[5] ?? ""
    ];
  };

  const [lMajor, lMinor, lPatch, lPre, lBuild] = parse(left);
  const [rMajor, rMinor, rPatch, rPre, rBuild] = parse(right);

  if (lMajor !== rMajor) {
    return lMajor - rMajor;
  }

  if (lMinor !== rMinor) {
    return lMinor - rMinor;
  }

  if (lPatch !== rPatch) {
    return lPatch - rPatch;
  }

  if (lPre === "" && rPre !== "") {
    return 1;
  }

  if (lPre !== "" && rPre === "") {
    return -1;
  }

  if (lPre !== rPre) {
    return lPre < rPre ? -1 : 1;
  }

  if (lBuild !== rBuild) {
    return lBuild < rBuild ? -1 : 1;
  }

  return 0;
}

/** Recursively sort object keys for deterministic JSON serialization. */
export function canonicalizeJson(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const result: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    result[key] = canonicalizeJson(record[key]);
  }

  return result;
}

export function serializeCanonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value));
}

export function manifestSigningPayload(manifest: UnsignedManifest): Uint8Array {
  const payload: Record<string, unknown> = {};

  for (const field of MANIFEST_SIGNING_FIELDS) {
    payload[field] = manifest[field];
  }

  return new TextEncoder().encode(serializeCanonicalJson(payload));
}

export function validateManifestStructure(manifest: UnsignedManifest): void {
  if (manifest.formatVersion !== PACKAGE_FORMAT_VERSION) {
    throw new Error(`Unsupported format version: ${manifest.formatVersion}`);
  }

  if (manifest.name.length === 0 || manifest.name.length > 128) {
    throw new Error("Manifest name must be 1–128 characters");
  }

  if (!isValidSemver(manifest.version)) {
    throw new Error(`Invalid semver version: ${manifest.version}`);
  }

  if (!isValidSemver(manifest.minHostApi)) {
    throw new Error(`Invalid minHostApi semver: ${manifest.minHostApi}`);
  }

  if (manifest.entry.length === 0) {
    throw new Error("Manifest entry point is required");
  }

  if (manifest.files.length === 0) {
    throw new Error("Manifest must list at least one file");
  }

  const paths = new Set<string>();

  for (const file of manifest.files) {
    if (paths.has(file.path)) {
      throw new Error(`Duplicate manifest file path: ${file.path}`);
    }

    paths.add(file.path);

    if (!/^[a-zA-Z0-9._/-]+$/.test(file.path) || file.path.includes("..")) {
      throw new Error(`Invalid manifest file path: ${file.path}`);
    }

    if (file.sha256.length !== 64 || !/^[0-9a-f]+$/.test(file.sha256)) {
      throw new Error(`Invalid SHA-256 for ${file.path}`);
    }

    if (file.size < 0 || !Number.isInteger(file.size)) {
      throw new Error(`Invalid file size for ${file.path}`);
    }
  }

  if (!paths.has(manifest.entry)) {
    throw new Error("Manifest entry point must appear in files table");
  }

  if (manifest.icon !== null && !paths.has(manifest.icon)) {
    throw new Error("Manifest icon must appear in files table");
  }

  if (manifest.driveKey.length !== 64 || !/^[0-9a-f]+$/.test(manifest.driveKey)) {
    throw new Error("Invalid driveKey hex");
  }

  if (manifest.publisherPublicKey.length !== 128 || !/^[0-9a-f]+$/.test(manifest.publisherPublicKey)) {
    throw new Error("Invalid publisherPublicKey hex");
  }
}

export function parseManifestJson(text: string): AppManifest {
  const parsed = JSON.parse(text) as AppManifest;
  const { signature, ...unsigned } = parsed;
  validateManifestStructure(unsigned);
  return parsed;
}

export function manifestToJson(manifest: AppManifest | UnsignedManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function manifestPublisherKeyBytes(manifest: UnsignedManifest): Uint8Array {
  return hexToBytes(manifest.publisherPublicKey);
}

export function manifestSignatureBytes(manifest: AppManifest): Uint8Array {
  return hexToBytes(manifest.signature);
}

export function manifestDriveKeyBytes(manifest: UnsignedManifest): Uint8Array {
  return hexToBytes(manifest.driveKey);
}
