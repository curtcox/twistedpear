/**
 * Browser entrypoint for host-core (Phase W / Workstream C).
 * Excludes Node-only host wiring and Hyperdrive fetch paths.
 */
export {
  DEFAULT_WEB_LEAF_ROLES,
  assertWebLeafRoles,
  type LeafRoleConfig,
  type WebLeafHostStatus,
} from "./leaf-roles.js";
export type {
  FetchPath,
  FetchPlane,
  FetchPlaneRequest,
  FetchPlaneResult,
  FetchProgress,
} from "./fetch-plane.js";
export {
  createResourceFetchPlane,
  listResourceVersions,
} from "./fetch-plane-resource.js";
export type { ResourceFetchPlaneOptions } from "./fetch-plane-resource.js";
export { createWebLeafHost } from "./web-leaf-host.js";
export type {
  WebLeafHostOptions,
  WebLeafHostSession,
} from "./web-leaf-host.js";
export {
  createHostLxmfDelivery,
  DEFAULT_HOST_LXMF_ANNOUNCE_INTERVAL_MS,
  type HostLxmfDeliveryOptions,
  type HostLxmfDeliverySession,
  type HostLxmfPeerRecord,
} from "./host-lxmf-delivery.js";
export {
  createSessionInviteReceiver,
  sessionInviteContent,
  SESSION_INVITE_PREFIX,
  SESSION_INVITE_TITLE,
  type DeliveredSessionInvite,
  type SessionInviteCarrierMessage,
  type SessionInviteReceiverOptions,
} from "./session-invite-carrier.js";
export {
  createWebPackageStorage,
  resetWebPackageStorage,
} from "./web-package-storage.js";
export type {
  WebOpfsDirectoryHandle,
  WebOpfsFileHandle,
  WebOpfsRootDirectory,
  WebPackageInstallResult,
  WebPackageStorageOptions,
  WebPackageStorageSession,
  WebStorageManager,
  WebStorageQuotaInfo,
} from "./web-package-storage.js";
export {
  RETICULUM_COMMUNITY_NETWORK,
  type CommunityNetworkProfile,
  type CommunityTcpEndpoint,
} from "./community-network.js";
export {
  APP_SCOPED_IDENTITY_SALT,
  IDENTITY_UNAVAILABLE_CODE,
  IdentityUnavailableError,
  createAppScopedIdentityBackend,
  deriveAppScopedIdentity,
  type AppScopedIdentityBackend,
  type AppScopedIdentityOptions,
  type IdentityReadinessOptions,
} from "./app-scoped-identity.js";
export {
  LINKED_INSTALLATION_ANNOUNCE_ASPECT,
  LINKED_INSTALLATION_APP_NAME,
  createLinkedInstallation,
  createLinkedInstallationId,
  decodeLinkedInstallationCertificate,
  deriveLinkedInstallationIdentity,
  encodeLinkedInstallationCertificate,
  linkedInstallationAnnounceAspects,
  linkedInstallationAnnounceFilter,
  signLinkedInstallationCertificate,
  verifyLinkedInstallationCertificate,
  type LinkedInstallationCertificate,
} from "./linked-installation.js";
export {
  LINKED_ACCOUNT_BACKUP_WARNING,
  createKeyValueLinkedInstallationRoster,
  exportLinkedAccountBackup,
  pairNewLinkedInstallation,
  type LinkedAccountBackupExport,
  type LinkedInstallationKeyValueStore,
  type LinkedInstallationRoster,
  type LinkedInstallationRosterEntry,
} from "./linked-installation-roster.js";
export {
  createLinkedInstallationAnnounce,
  type LinkedInstallationAnnounceOptions,
  type LinkedInstallationAnnounceSession,
} from "./linked-installation-announce.js";
