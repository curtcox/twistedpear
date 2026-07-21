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
export { NodeWorkerSandboxBackend } from "./sandbox/node-worker.js";
export { WebSandboxBackend, WebSandboxBackendUnavailableError } from "./sandbox/web.js";
export { encodeJsonWireValue, reviveJsonWireValue, isJsonWireBytes } from "./sandbox/json-wire.js";
export type { JsonWireBytes } from "./sandbox/json-wire.js";
export {
  createWebSandboxProxyBackend,
  type WebSandboxProxyController,
  type WebSandboxProxyOutbound
} from "./sandbox/web-proxy.js";
export { createSandboxBackend } from "./sandbox/factory.js";
export { prepareBundleSource } from "./sandbox/prepare-bundle.js";
export { MiniappHost } from "./host.js";
export type {
  LaunchManifest,
  MiniappHostCallbacks,
  MiniappHostLogEntry,
  MiniappHostOptions,
  MiniappHostSnapshot,
  ResourceLimitUpdate,
  ResourceLimitsSnapshot
} from "./host.js";
export {
  ConfirmationError,
  DEFAULT_CONFIRMATION_TIMEOUT_MS,
  generateConfirmationToken,
  requestHostConfirmation
} from "./confirm.js";
export type {
  ConfirmationEffects,
  ConfirmationKind,
  ConfirmationRequest,
  ConfirmationResult,
  HostConfirmationChannel
} from "./confirm.js";
export { NamespacedKvService, MiniappKvQuotaError } from "./services/storage-kv.js";
export type { MiniappKvStoreBackend } from "./services/storage-kv.js";
export { CorestoreBeeBackend } from "./services/storage-bee-corestore.js";
export { KvStorageBeeBackend } from "./services/storage-bee-kv.js";
export { StorageBeeQuotaError, storageBeeDescriptor } from "./services/storage-bee.js";
export type { StorageBeeBackend, StorageBeeDescriptor, StorageBeeEntry, StorageBeeListOptions } from "./services/storage-bee.js";
export { AppIdentityService } from "./services/identity.js";
export type { AppScopedIdentity, IdentityBackend } from "./services/identity.js";
export { AnnounceService } from "./services/announce.js";
export {
  LoopbackResourceBackend,
  MemoryBeeBackend,
  MemoryKvStoreBackend,
  StaticPresenceBackend,
  createLoopbackBinding,
  type LoopbackBinding,
  type LoopbackBindingOptions
} from "./services/loopback.js";
export type { AnnounceBackend, AnnounceEvent, AnnounceSubscription } from "./services/announce.js";
export { NamespacedLxmfService } from "./services/lxmf.js";
export type { LxmfBackend, LxmfDelivery, LxmfInboxMessage, LxmfSendRequest } from "./services/lxmf.js";
export { PresenceService } from "./services/presence.js";
export type { PresenceBackend, PresenceSnapshot } from "./services/presence.js";
export { HostInfoService, defaultHostInfo } from "./services/host-info.js";
export type {
  HostInfo,
  HostInfoBackend,
  HostPlatformId,
  HostQuotaSnapshot,
  HostRolesInfo
} from "./services/host-info.js";
export { ResourceService } from "./services/resource.js";
export type { ResourceFetchBackend, ResourceFetchProgress, ResourceFetchRequest } from "./services/resource.js";
export { AiService, AiServiceError, DEFAULT_AI_SERVICE_LIMITS, cosineSimilarity } from "./services/ai.js";
export type {
  AiChatBackend,
  AiChatBackendChunk,
  AiChatMessage,
  AiChatRequest,
  AiChatResponse,
  AiChatRole,
  AiChatStreamEvent,
  AiChatUsage,
  AiEmbedRequest,
  AiEmbedResponse,
  AiVectorSearchRequest,
  AiVectorSearchResponse,
  AiServiceLimits
} from "./services/ai.js";
export { createOpenRouterBackend } from "./services/ai-openrouter.js";
export type { OpenRouterBackendOptions } from "./services/ai-openrouter.js";
export { DEFAULT_WORKSPACE_LIMITS, WorkspaceError, WorkspaceService, validateWorkspacePath } from "./services/workspace.js";
export type { WorkspaceFileInfo, WorkspaceLimits } from "./services/workspace.js";
export { AppsService, AppsServiceError } from "./services/apps.js";
export type {
  AppManifestDraft,
  AppsBackend,
  AppsInstallResult,
  AppsPackageResult,
  AppsPublishResult
} from "./services/apps.js";
export type { CasShareBackend } from "./host.js";
export { ProductionCapabilityAdapter } from "./simulation-adapter.js";
export type { ProductionCapabilityObservation } from "./simulation-adapter.js";
export { BearerReplayPolicy, FederationPolicy, KeySharePolicy } from "./security-policies.js";
export {
  CODE_EDITOR_LANGUAGES,
  MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH,
  MAX_QR_CODE_VALUE_LENGTH,
  WIDGET_PROP_KEYS,
  WIDGET_STYLE_KEYS,
  WIDGET_TYPES
} from "./ui/schema.js";
export type { WidgetNode, WidgetStyle, WidgetTree, WidgetType } from "./ui/schema.js";
export { WidgetValidationError, validateWidgetTree } from "./ui/validate.js";
export type { WidgetValidationOptions } from "./ui/validate.js";
export { diffWidgetTrees } from "./ui/diff.js";
export type { WidgetPatch } from "./ui/diff.js";
export { describeWidgetTree } from "./ui/describe.js";
export type { RenderedWidgetNode } from "./ui/describe.js";
