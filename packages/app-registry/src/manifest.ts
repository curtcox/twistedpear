import { hexToBytes } from "@twistedpear/reticulum-ts";
import {
  PACKAGE_FORMAT_MAX,
  PACKAGE_FORMAT_MIN,
  parseCapabilityDeclarations,
  type ManifestCapabilityEntry,
} from "./capability-declaration.js";

export const PACKAGE_FORMAT_VERSION = PACKAGE_FORMAT_MAX;
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
  "publisherPublicKey",
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
  readonly capabilities: ReadonlyArray<ManifestCapabilityEntry>;
  readonly icon: string | null;
  readonly minHostApi: string;
  readonly files: ReadonlyArray<ManifestFileEntry>;
  readonly driveKey: string;
  readonly publisherPublicKey: string;
  readonly signature: string;
}

export type UnsignedManifest = Omit<AppManifest, "signature">;

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function isValidSemver(version: string): boolean {
  return SEMVER_RE.test(version);
}

type ParsedSemver = readonly [
  major: number,
  minor: number,
  patch: number,
  prerelease: string,
  build: string,
];

function parseSemver(value: string): ParsedSemver {
  const match = SEMVER_RE.exec(value);
  if (match === null) {
    throw new Error(`Invalid semver: ${value}`);
  }

  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    match[4] ?? "",
    match[5] ?? "",
  ];
}

function compareNumericParts(left: ParsedSemver, right: ParsedSemver): number {
  const majorDifference = left[0] - right[0];
  if (majorDifference !== 0) return majorDifference;

  const minorDifference = left[1] - right[1];
  if (minorDifference !== 0) return minorDifference;

  const patchDifference = left[2] - right[2];
  if (patchDifference !== 0) return patchDifference;

  return 0;
}

function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function comparePrerelease(left: string, right: string): number {
  if (left === "" && right !== "") return 1;
  if (left !== "" && right === "") return -1;
  return compareText(left, right);
}

export function compareSemver(left: string, right: string): number {
  if (!isValidSemver(left) || !isValidSemver(right)) {
    throw new Error(`Invalid semver: ${left} or ${right}`);
  }

  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);
  const numericResult = compareNumericParts(leftParts, rightParts);
  if (numericResult !== 0) return numericResult;

  const prereleaseResult = comparePrerelease(leftParts[3], rightParts[3]);
  if (prereleaseResult !== 0) return prereleaseResult;

  return compareText(leftParts[4], rightParts[4]);
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

function validateManifestMetadata(manifest: UnsignedManifest): void {
  if (
    manifest.formatVersion < PACKAGE_FORMAT_MIN ||
    manifest.formatVersion > PACKAGE_FORMAT_MAX
  ) {
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
}

function validateManifestFile(
  file: ManifestFileEntry,
  paths: Set<string>,
): void {
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

function validateManifestReferences(
  manifest: UnsignedManifest,
  paths: ReadonlySet<string>,
): void {
  if (!paths.has(manifest.entry)) {
    throw new Error("Manifest entry point must appear in files table");
  }

  if (manifest.icon !== null && !paths.has(manifest.icon)) {
    throw new Error("Manifest icon must appear in files table");
  }
}

function validateHex(value: string, length: number, label: string): void {
  if (value.length !== length || !/^[0-9a-f]+$/.test(value)) {
    throw new Error(`Invalid ${label} hex`);
  }
}

export function validateManifestStructure(manifest: UnsignedManifest): void {
  validateManifestMetadata(manifest);

  const paths = new Set<string>();
  for (const file of manifest.files) {
    validateManifestFile(file, paths);
  }

  validateManifestReferences(manifest, paths);
  validateHex(manifest.driveKey, 64, "driveKey");
  validateHex(manifest.publisherPublicKey, 128, "publisherPublicKey");
  parseCapabilityDeclarations(manifest.capabilities, manifest.formatVersion);
}

export function parseManifestJson(text: string): AppManifest {
  const parsed = JSON.parse(text) as AppManifest;
  const { signature, ...unsigned } = parsed;
  validateManifestStructure(unsigned);
  return parsed;
}

export function manifestToJson(
  manifest: AppManifest | UnsignedManifest,
): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function manifestPublisherKeyBytes(
  manifest: UnsignedManifest,
): Uint8Array {
  return hexToBytes(manifest.publisherPublicKey);
}

export function manifestSignatureBytes(manifest: AppManifest): Uint8Array {
  return hexToBytes(manifest.signature);
}

export function manifestDriveKeyBytes(manifest: UnsignedManifest): Uint8Array {
  return hexToBytes(manifest.driveKey);
}
