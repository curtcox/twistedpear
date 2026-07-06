export {
  PACKAGE_FORMAT_VERSION,
  MANIFEST_SIGNING_FIELDS,
  compareSemver,
  isValidSemver,
  canonicalizeJson,
  serializeCanonicalJson,
  manifestSigningPayload,
  validateManifestStructure,
  parseManifestJson,
  manifestToJson,
  manifestPublisherKeyBytes,
  manifestSignatureBytes,
  manifestDriveKeyBytes
} from "./manifest.js";
export type { AppManifest, ManifestFileEntry, UnsignedManifest } from "./manifest.js";

export {
  PACKAGE_MAGIC,
  PackageError,
  buildUnsignedManifest,
  buildCanonicalArchive,
  packPackage,
  unpackPackage,
  verifyPackage,
  packageHash
} from "./package.js";
export type { PackageFile, PackOptions, UnpackResult } from "./package.js";

export { signManifest, verifyManifestSignature } from "./signing.js";

export {
  APP_DESTINATION_ASPECT,
  MAX_ANNOUNCE_APP_DATA_BYTES,
  appDestinationName,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  decodeAppAnnounceData,
  verifyAppAnnounceSummary,
  createAppDestination,
  encodeAppAnnounce
} from "./announce.js";
export type { AppAnnounceSummary, EncodedAppAnnounce } from "./announce.js";

export {
  DEFAULT_CATALOG_MAX_ENTRIES,
  DEFAULT_CATALOG_MAX_PER_PUBLISHER,
  DEFAULT_CATALOG_ENTRY_TTL_MS,
  CatalogStore,
  InstalledPackageStore,
  catalogEntryKey,
  installedPackageKey
} from "./catalog.js";
export type {
  CatalogEntry,
  CatalogIngestOptions,
  CatalogStoreOptions,
  InstalledPackageRecord
} from "./catalog.js";
