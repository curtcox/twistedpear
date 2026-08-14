import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { bytesToHex, equalBytes, hexToBytes } from "@twistedpear/reticulum-ts";
import {
  PACKAGE_FORMAT_VERSION,
  compareSemver,
  type AppManifest,
  type ManifestFileEntry,
  type UnsignedManifest,
  serializeCanonicalJson,
  validateManifestStructure,
} from "./manifest.js";
import { verifyManifestSignature } from "./signing.js";

export const PACKAGE_MAGIC = new Uint8Array([0x54, 0x50, 0x4b, 0x47, 0x01]); // TPKG\x01

export class PackageError extends Error {
  constructor(
    readonly code:
      | "TRUNCATED"
      | "INVALID_MAGIC"
      | "FILE_HASH_MISMATCH"
      | "MANIFEST_INVALID"
      | "SIGNATURE_INVALID"
      | "WRONG_KEY"
      | "DOWNGRADE"
      | "MIN_HOST_API",
    message: string,
  ) {
    super(message);
    this.name = "PackageError";
  }
}

export interface PackageFile {
  readonly path: string;
  readonly content: Uint8Array;
}

export interface PackOptions {
  readonly name: string;
  readonly version: string;
  readonly entry: string;
  readonly capabilities?: ReadonlyArray<string>;
  readonly icon?: string | null;
  readonly minHostApi?: string;
  readonly driveKey: string;
  readonly publisherPublicKey: string;
  readonly signature: string;
  readonly files: ReadonlyArray<PackageFile>;
}

export interface UnpackResult {
  readonly manifest: AppManifest;
  readonly files: ReadonlyMap<string, Uint8Array>;
  readonly packageHash: string;
  readonly archiveBytes: Uint8Array;
}

function readU32Be(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.length) {
    throw new PackageError("TRUNCATED", "Archive truncated reading u32");
  }

  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}

function writeU32Be(value: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (value >>> 24) & 0xff;
  out[1] = (value >>> 16) & 0xff;
  out[2] = (value >>> 8) & 0xff;
  out[3] = value & 0xff;
  return out;
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

function hashFileEntries(
  provider: CryptoProvider,
  files: ReadonlyArray<PackageFile>,
): ManifestFileEntry[] {
  return files
    .map((file) => ({
      path: file.path,
      sha256: bytesToHex(provider.sha256(file.content)),
      size: file.content.length,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function buildUnsignedManifest(
  options: Omit<PackOptions, "signature" | "files"> & {
    readonly files: ReadonlyArray<PackageFile>;
  },
  provider: CryptoProvider,
): UnsignedManifest {
  const fileEntries = hashFileEntries(provider, options.files);

  return {
    formatVersion: PACKAGE_FORMAT_VERSION,
    name: options.name,
    version: options.version,
    entry: options.entry,
    capabilities: options.capabilities ?? [],
    icon: options.icon ?? null,
    minHostApi: options.minHostApi ?? "0.0.0",
    files: fileEntries,
    driveKey: options.driveKey,
    publisherPublicKey: options.publisherPublicKey,
  };
}

export function buildCanonicalArchive(
  manifest: AppManifest,
  files: ReadonlyMap<string, Uint8Array>,
): Uint8Array {
  const manifestBytes = new TextEncoder().encode(
    serializeCanonicalJson(manifest),
  );
  const sortedPaths = [...files.keys()].sort((left, right) =>
    left.localeCompare(right),
  );
  const parts: Uint8Array[] = [
    PACKAGE_MAGIC,
    writeU32Be(manifestBytes.length),
    manifestBytes,
  ];

  for (const path of sortedPaths) {
    const content = files.get(path);
    if (content === undefined) {
      throw new PackageError(
        "MANIFEST_INVALID",
        `Missing file content for ${path}`,
      );
    }

    const pathBytes = new TextEncoder().encode(path);
    parts.push(
      writeU32Be(pathBytes.length),
      pathBytes,
      writeU32Be(content.length),
      content,
    );
  }

  const signatureBytes = hexToBytes(manifest.signature);
  parts.push(writeU32Be(signatureBytes.length), signatureBytes);
  return concatBytes(...parts);
}

export function packPackage(
  provider: CryptoProvider,
  options: PackOptions,
): UnpackResult {
  const fileMap = new Map<string, Uint8Array>();

  for (const file of options.files) {
    fileMap.set(file.path, file.content);
  }

  const manifest: AppManifest = {
    ...buildUnsignedManifest(options, provider),
    signature: options.signature,
  };

  validateManifestStructure(manifest);

  for (const entry of manifest.files) {
    const content = fileMap.get(entry.path);
    if (content === undefined) {
      throw new PackageError(
        "MANIFEST_INVALID",
        `Manifest lists missing file: ${entry.path}`,
      );
    }

    const hash = bytesToHex(provider.sha256(content));
    if (hash !== entry.sha256) {
      throw new PackageError(
        "FILE_HASH_MISMATCH",
        `Hash mismatch for ${entry.path}`,
      );
    }
  }

  const archiveBytes = buildCanonicalArchive(manifest, fileMap);
  return {
    manifest,
    files: fileMap,
    packageHash: bytesToHex(provider.sha256(archiveBytes)),
    archiveBytes,
  };
}

export function unpackPackage(
  provider: CryptoProvider,
  archiveBytes: Uint8Array,
): UnpackResult {
  const { manifest, offset: afterManifest } = readArchiveManifest(archiveBytes);
  const { files, offset: afterFiles } = readArchiveFiles(
    archiveBytes,
    afterManifest,
    manifest,
  );
  verifyArchiveSignatureBlock(archiveBytes, afterFiles, manifest);
  verifyUnpackedFileEntries(provider, manifest, files);

  if (!verifyManifestSignature(provider, manifest)) {
    throw new PackageError(
      "SIGNATURE_INVALID",
      "Manifest signature verification failed",
    );
  }

  return {
    manifest,
    files,
    packageHash: bytesToHex(provider.sha256(archiveBytes)),
    archiveBytes,
  };
}

function readArchiveManifest(archiveBytes: Uint8Array): {
  readonly manifest: AppManifest;
  readonly offset: number;
} {
  if (archiveBytes.length < PACKAGE_MAGIC.length + 4) {
    throw new PackageError("TRUNCATED", "Archive too short");
  }

  if (
    !equalBytes(archiveBytes.subarray(0, PACKAGE_MAGIC.length), PACKAGE_MAGIC)
  ) {
    throw new PackageError("INVALID_MAGIC", "Invalid package magic bytes");
  }

  let offset = PACKAGE_MAGIC.length;
  const manifestLength = readU32Be(archiveBytes, offset);
  offset += 4;

  if (offset + manifestLength > archiveBytes.length) {
    throw new PackageError("TRUNCATED", "Archive truncated at manifest");
  }

  const manifestText = new TextDecoder().decode(
    archiveBytes.subarray(offset, offset + manifestLength),
  );
  offset += manifestLength;

  try {
    const manifest = JSON.parse(manifestText) as AppManifest;
    const { signature: _signature, ...unsigned } = manifest;
    validateManifestStructure(unsigned);
    return { manifest, offset };
  } catch (error) {
    throw new PackageError(
      "MANIFEST_INVALID",
      error instanceof Error ? error.message : "Invalid manifest",
    );
  }
}

function readArchiveFiles(
  archiveBytes: Uint8Array,
  start: number,
  manifest: AppManifest,
): { readonly files: Map<string, Uint8Array>; readonly offset: number } {
  const files = new Map<string, Uint8Array>();
  const sortedPaths = manifest.files
    .map((entry) => entry.path)
    .sort((left, right) => left.localeCompare(right));
  let offset = start;

  for (const path of sortedPaths) {
    if (offset + 4 > archiveBytes.length) {
      throw new PackageError(
        "TRUNCATED",
        `Archive truncated before file ${path}`,
      );
    }

    const pathLength = readU32Be(archiveBytes, offset);
    offset += 4;

    if (offset + pathLength + 4 > archiveBytes.length) {
      throw new PackageError(
        "TRUNCATED",
        `Archive truncated at file path ${path}`,
      );
    }

    const pathText = new TextDecoder().decode(
      archiveBytes.subarray(offset, offset + pathLength),
    );
    offset += pathLength;

    if (pathText !== path) {
      throw new PackageError(
        "MANIFEST_INVALID",
        `Archive file order mismatch: expected ${path}, got ${pathText}`,
      );
    }

    const contentLength = readU32Be(archiveBytes, offset);
    offset += 4;

    if (offset + contentLength > archiveBytes.length) {
      throw new PackageError("TRUNCATED", `Archive truncated at file ${path}`);
    }

    files.set(path, archiveBytes.subarray(offset, offset + contentLength));
    offset += contentLength;
  }

  return { files, offset };
}

function verifyArchiveSignatureBlock(
  archiveBytes: Uint8Array,
  offset: number,
  manifest: AppManifest,
): void {
  if (offset + 4 > archiveBytes.length) {
    throw new PackageError("TRUNCATED", "Archive truncated at signature block");
  }

  const signatureLength = readU32Be(archiveBytes, offset);
  const signatureStart = offset + 4;

  if (signatureStart + signatureLength !== archiveBytes.length) {
    throw new PackageError(
      "TRUNCATED",
      "Archive trailing bytes after signature block",
    );
  }

  const signatureBytes = archiveBytes.subarray(
    signatureStart,
    signatureStart + signatureLength,
  );
  if (bytesToHex(signatureBytes) !== manifest.signature) {
    throw new PackageError(
      "SIGNATURE_INVALID",
      "Archive signature block does not match manifest",
    );
  }
}

function verifyUnpackedFileEntries(
  provider: CryptoProvider,
  manifest: AppManifest,
  files: ReadonlyMap<string, Uint8Array>,
): void {
  for (const entry of manifest.files) {
    const content = files.get(entry.path);
    if (content === undefined) {
      throw new PackageError(
        "MANIFEST_INVALID",
        `Manifest file missing from archive: ${entry.path}`,
      );
    }

    const hash = bytesToHex(provider.sha256(content));
    if (hash !== entry.sha256) {
      throw new PackageError(
        "FILE_HASH_MISMATCH",
        `File hash mismatch for ${entry.path}`,
      );
    }

    if (entry.size !== content.length) {
      throw new PackageError(
        "MANIFEST_INVALID",
        `File size mismatch for ${entry.path}: manifest ${entry.size}, archive ${content.length}`,
      );
    }
  }
}

export function verifyPackage(
  provider: CryptoProvider,
  archiveBytes: Uint8Array,
  options: {
    readonly expectedPublisherKey?: Uint8Array;
    readonly minVersion?: string;
    readonly hostApiVersion?: string;
  } = {},
): UnpackResult {
  const result = unpackPackage(provider, archiveBytes);

  if (options.expectedPublisherKey !== undefined) {
    const publisherKey = hexToBytes(result.manifest.publisherPublicKey);
    if (!equalBytes(publisherKey, options.expectedPublisherKey)) {
      throw new PackageError(
        "WRONG_KEY",
        "Publisher public key does not match expected key",
      );
    }
  }

  if (options.minVersion !== undefined) {
    if (compareSemver(result.manifest.version, options.minVersion) < 0) {
      throw new PackageError(
        "DOWNGRADE",
        `Package version ${result.manifest.version} is older than minimum ${options.minVersion}`,
      );
    }
  }

  if (options.hostApiVersion !== undefined) {
    if (compareSemver(options.hostApiVersion, result.manifest.minHostApi) < 0) {
      throw new PackageError(
        "MIN_HOST_API",
        `Host API ${options.hostApiVersion} does not satisfy minHostApi ${result.manifest.minHostApi}`,
      );
    }
  }

  return result;
}

export function packageHash(
  provider: CryptoProvider,
  archiveBytes: Uint8Array,
): string {
  return bytesToHex(provider.sha256(archiveBytes));
}
