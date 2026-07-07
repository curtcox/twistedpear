/**
 * Browser entrypoint for host-core (Phase W / Workstream C).
 * Excludes Node-only host wiring and Hyperdrive fetch paths.
 */
export {
  DEFAULT_WEB_LEAF_ROLES,
  assertWebLeafRoles,
  type LeafRoleConfig,
  type WebLeafHostStatus
} from "./leaf-roles.js";
export type { FetchPath, FetchPlane, FetchPlaneRequest, FetchPlaneResult, FetchProgress } from "./fetch-plane.js";
export { createResourceFetchPlane, listResourceVersions } from "./fetch-plane-resource.js";
export type { ResourceFetchPlaneOptions } from "./fetch-plane-resource.js";
export { createWebLeafHost } from "./web-leaf-host.js";
export type { WebLeafHostOptions, WebLeafHostSession } from "./web-leaf-host.js";
export { createWebPackageStorage, resetWebPackageStorage } from "./web-package-storage.js";
export type {
  WebOpfsDirectoryHandle,
  WebOpfsFileHandle,
  WebOpfsRootDirectory,
  WebPackageInstallResult,
  WebPackageStorageOptions,
  WebPackageStorageSession,
  WebStorageManager,
  WebStorageQuotaInfo
} from "./web-package-storage.js";
