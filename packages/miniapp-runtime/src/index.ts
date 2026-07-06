export { HOST_API_VERSION, HOST_API_CHANGELOG } from "./host-api.js";
export type { HostApiChangelogEntry } from "./host-api.js";
export {
  CAPABILITY_DEFINITIONS,
  CapabilityError,
  GrantStore,
  assertCapabilityAllowed,
  describeCapability,
  grantStoreKey,
  isMiniappCapability,
  validateManifestCapabilities
} from "./capabilities.js";
export type { CapabilityDefinition, GrantKeyValueStore, GrantRecord, MiniappCapability } from "./capabilities.js";
export { BrokerError, MiniappBroker } from "./broker.js";
export type { BrokerAuditEntry, BrokerContext, BrokerHandler, BrokerOptions, BrokerRequest, BrokerResponse } from "./broker.js";
export { MiniappLifecycle } from "./lifecycle.js";
export type { MiniappLifecycleSnapshot, MiniappLifecycleState, LifecycleOptions } from "./lifecycle.js";
export type { SandboxBackend, SandboxInstance, SandboxLimits, SandboxSpawnOptions } from "./sandbox/backend.js";
export { BareWorkerSandboxBackend, WorkerBackendUnavailableError } from "./sandbox/worker.js";
export { HardenedCompartmentSandboxBackend, CompartmentBackendUnavailableError } from "./sandbox/compartment.js";
export { NamespacedKvService, MiniappKvQuotaError } from "./services/storage-kv.js";
export type { MiniappKvStoreBackend } from "./services/storage-kv.js";
export { storageBeeDescriptor } from "./services/storage-bee.js";
export type { StorageBeeDescriptor } from "./services/storage-bee.js";
export type { AppScopedIdentity } from "./services/identity.js";
export type { AnnounceEvent, AnnounceSubscription } from "./services/announce.js";
export type { LxmfDelivery, LxmfSendRequest } from "./services/lxmf.js";
export type { PresenceSnapshot } from "./services/presence.js";
export type { ResourceFetchProgress, ResourceFetchRequest } from "./services/resource.js";
export { WIDGET_PROP_KEYS, WIDGET_STYLE_KEYS, WIDGET_TYPES } from "./ui/schema.js";
export type { WidgetNode, WidgetStyle, WidgetTree, WidgetType } from "./ui/schema.js";
export { WidgetValidationError, validateWidgetTree } from "./ui/validate.js";
export type { WidgetValidationOptions } from "./ui/validate.js";
export { diffWidgetTrees } from "./ui/diff.js";
export type { WidgetPatch } from "./ui/diff.js";
