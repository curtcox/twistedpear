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
  validateManifestCapabilities,
} from "./capabilities.js";
export type {
  CapabilityDefinition,
  GrantKeyValueStore,
  GrantRecord,
  MiniappCapability,
} from "./capabilities.js";
export { BrokerError, MiniappBroker } from "./broker.js";
export {
  EGRESS_OFFER_CAPABILITIES,
  EgressDeniedError,
  assertEgressAllowed,
} from "./egress-enforcement.js";
export type {
  BrokerAuditEntry,
  BrokerContext,
  BrokerHandler,
  BrokerOptions,
  BrokerRequest,
  BrokerResponse,
} from "./broker.js";
export { MiniappLifecycle } from "./lifecycle.js";
export type {
  MiniappLifecycleSnapshot,
  MiniappLifecycleState,
  LifecycleOptions,
} from "./lifecycle.js";
export type {
  SandboxBackend,
  SandboxInstance,
  SandboxLimits,
  SandboxSpawnOptions,
} from "./sandbox/backend.js";
export {
  BareWorkerSandboxBackend,
  WorkerBackendUnavailableError,
} from "./sandbox/worker.js";
export {
  HardenedCompartmentSandboxBackend,
  CompartmentBackendUnavailableError,
} from "./sandbox/compartment.js";
export { NodeWorkerSandboxBackend } from "./sandbox/node-worker.js";
export {
  WebSandboxBackend,
  WebSandboxBackendUnavailableError,
} from "./sandbox/web.js";
export {
  encodeJsonWireValue,
  reviveJsonWireValue,
  isJsonWireBytes,
} from "./sandbox/json-wire.js";
export type { JsonWireBytes } from "./sandbox/json-wire.js";
export {
  createWebSandboxProxyBackend,
  type WebSandboxProxyController,
  type WebSandboxProxyOutbound,
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
  ResourceLimitsSnapshot,
} from "./host.js";
export {
  ConfirmationError,
  DEFAULT_CONFIRMATION_TIMEOUT_MS,
  generateConfirmationToken,
  requestHostConfirmation,
} from "./confirm.js";
export type {
  ConfirmationEffects,
  ConfirmationKind,
  ConfirmationRequest,
  ConfirmationResult,
  HostConfirmationChannel,
} from "./confirm.js";
export {
  ConsentTranscript,
  consentAuthorities,
  consentDiscloses,
  consentRecordFromConfirmation,
  installReviewConsentRecord,
} from "./consent-record.js";
export type {
  ConsentAuthority,
  ConsentKind,
  ConsentRecord,
  ConsentSubject,
} from "./consent-record.js";
export {
  NamespacedKvService,
  MiniappKvQuotaError,
} from "./services/storage-kv.js";
export type { MiniappKvStoreBackend } from "./services/storage-kv.js";
export { CorestoreBeeBackend } from "./services/storage-bee-corestore.js";
export { KvStorageBeeBackend } from "./services/storage-bee-kv.js";
export {
  StorageBeeQuotaError,
  storageBeeDescriptor,
} from "./services/storage-bee.js";
export type {
  StorageBeeBackend,
  StorageBeeDescriptor,
  StorageBeeEntry,
  StorageBeeListOptions,
} from "./services/storage-bee.js";
export { AppIdentityService } from "./services/identity.js";
export type {
  AppScopedIdentity,
  IdentityBackend,
} from "./services/identity.js";
export { AnnounceService } from "./services/announce.js";
export {
  LoopbackResourceBackend,
  MemoryBeeBackend,
  MemoryKvStoreBackend,
  StaticPresenceBackend,
  createLoopbackBinding,
  type LoopbackBinding,
  type LoopbackBindingOptions,
} from "./services/loopback.js";
export type {
  AnnounceBackend,
  AnnounceEvent,
  AnnounceSubscription,
} from "./services/announce.js";
export { NamespacedLxmfService } from "./services/lxmf.js";
export type {
  LxmfBackend,
  LxmfDelivery,
  LxmfInboxMessage,
  LxmfSendRequest,
} from "./services/lxmf.js";
export { PresenceService } from "./services/presence.js";
export type { PresenceBackend, PresenceSnapshot } from "./services/presence.js";
export { HostInfoService, defaultHostInfo } from "./services/host-info.js";
export type {
  HostInfo,
  HostInfoBackend,
  HostPlatformId,
  HostQuotaSnapshot,
  HostRolesInfo,
} from "./services/host-info.js";
export { ResourceService } from "./services/resource.js";
export type {
  ResourceFetchBackend,
  ResourceFetchProgress,
  ResourceFetchRequest,
} from "./services/resource.js";
export {
  AiService,
  AiServiceError,
  DEFAULT_AI_SERVICE_LIMITS,
  cosineSimilarity,
} from "./services/ai.js";
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
  AiServiceLimits,
} from "./services/ai.js";
export { createOpenRouterBackend } from "./services/ai-openrouter.js";
export type { OpenRouterBackendOptions } from "./services/ai-openrouter.js";
export {
  DEFAULT_WORKSPACE_LIMITS,
  WorkspaceError,
  WorkspaceService,
  validateWorkspacePath,
} from "./services/workspace.js";
export type {
  WorkspaceFileInfo,
  WorkspaceLimits,
} from "./services/workspace.js";
export { AppsService, AppsServiceError } from "./services/apps.js";
export type {
  AppManifestDraft,
  AppsBackend,
  AppsInstallResult,
  AppsPackageResult,
  AppsPublishResult,
} from "./services/apps.js";
export type { CasShareBackend } from "./host.js";
export {
  PeerBrokerService,
  PeerServiceError,
  DEFAULT_PEER_TIMEOUT_MS,
  MAX_PEER_TIMEOUT_MS,
  MAX_PEER_PURPOSE_LENGTH,
} from "./services/peers.js";
export {
  FreenetBrokerService,
  FreenetBrokerServiceError,
} from "./services/freenet.js";
export type { FreenetContractBackend } from "./services/freenet.js";
export { createWorkletFlagRelayService } from "./services/worklet-flag-relay.js";
export type {
  WorkletFlagRelayController,
  WorkletFlagRelaySnapshot,
} from "./services/worklet-flag-relay.js";
export {
  MemoryAnnounceTransport,
  TransportBackedAnnounceService,
} from "./services/transport-announce.js";
export type { AnnounceTransport } from "./services/transport-announce.js";
export type { PeerRequestPayload } from "./services/peers.js";
export {
  DeviceBrokerService,
  DeviceBrokerServiceError,
  DeviceError,
  DeviceManager,
} from "./services/device.js";
export type {
  DeviceDescriptor,
  DeviceDiagnostic,
  DeviceOpenRequest,
  DeviceSample,
  DeviceSession,
  DeviceSessionHandle,
} from "./services/device.js";
export {
  assertDeviceCapabilityAllowed,
  createSimulatedAmbientLightDriver,
  createSimulatedCameraDriver,
  createSimulatedDeviceDrivers,
  createSimulatedDeviceManager,
  createSimulatedHapticsDriver,
  createSimulatedLocationDriver,
  createSimulatedMicrophoneDriver,
  createSimulatedMotionDriver,
  createSimulatedNfcDriver,
  createSimulatedRawCameraDriver,
  createSimulatedRawMicrophoneDriver,
  createSimulatedRawMotionDriver,
  createSimulatedScreenCaptureDriver,
  createSimulatedBiometricDriver,
  createSimulatedScalarDriver,
  createSimulatedSpeakerDriver,
  createSimulatedSttDriver,
  createSimulatedTorchDriver,
  createSimulatedTtsDriver,
  createHybridDeviceDrivers,
} from "./device-manager.js";
export type {
  DeviceActiveIndicator,
  DeviceAvailability,
  DeviceChromeSession,
  DeviceCommand,
  DeviceDriver,
  DeviceManagerOptions,
  DeviceStreamConstraints,
  DeviceStreamSession,
  SimulatedActuatorLog,
} from "./device-manager.js";
export {
  createHostBridgedDriver,
  createHostBridgedDrivers,
} from "./drivers/host-bridge.js";
export type { DeviceHostBridge } from "./drivers/host-bridge.js";
export {
  browserDeviceAvailability,
  browserDeviceSense,
  browserDeviceActuate,
} from "./drivers/browser-effects.js";
export { DeviceStreamSidecar, DEVICE_STREAM_KIND } from "./device-sidecar.js";
export type {
  DeviceSidecarDelivery,
  DeviceSidecarPush,
  DeviceSidecarTransport,
} from "./device-sidecar.js";
export { DEVICE_CAPABILITY_DEFINITIONS } from "./device-capabilities.gen.js";
export type {
  DeviceCapability,
  DeviceCapabilityDefinition,
} from "./device-capabilities.gen.js";
export {
  DEFAULT_LINK_PROBE_BUDGET_BYTES,
  LINK_PROBE_INTERVAL_MS,
  LinkQualityService,
  LinkServiceError,
  PeerRouteLinkObservatory,
} from "./services/links.js";
export type { LinkQuality, PeerMediaReadiness } from "@twistedpear/protocol";
export type { ShareOffer } from "@twistedpear/protocol";
export {
  InboundMediaRouter,
  CodecStreamEgressFactory,
  createCasDerivedPlaneOpener,
  createHostPlaneOpeners,
  createPearsBulkAppendPlaneOpener,
  createPeerRouteLinkSupply,
  createPeerRoutePlaneOpeners,
  createWebRtcMediaTrackPlaneOpener,
  createDelegatedWebRtcMediaPlaneOpener,
  PeerRouteStreamEgressFactory,
  PeerRouteMediaBridge,
  PlaneStreamEgressFactory,
  ReservedStreamEgressFactory,
} from "./media-stream.js";
export { SessionInviteService } from "./session-invite.js";
export type { SessionInvite, SessionInviteChrome } from "./session-invite.js";
export type {
  InboundMediaBackend,
  InboundStream,
  CasDerivedPlaneOpenerOptions,
  PearsBulkAppendPlaneOpenerOptions,
  MediaCodecDriverOpener,
  PlaneMediaTransport,
  PlaneMediaTransportOpener,
  WebRtcMediaTrackHandle,
  WebRtcMediaTrackPlaneOpenerOptions,
  AppPeerMediaRouteDirectory,
  PeerRouteMediaBridgeOptions,
  PeerRouteMediaDirectory,
  RealtimeBandwidthReservation,
  RealtimeBandwidthReservationProvider,
  StreamEgress,
  StreamEgressFactory,
  StreamEgressSendResult,
  StreamOffer,
  StreamOfferBatch,
  StreamSink,
} from "./media-stream.js";
export type {
  LinkFreshness,
  HostLinkProbeRequest,
  LinkObservatoryBackend,
  LinkProbeOptions,
  LinkQualityServiceOptions,
  AppPeerDirectory,
  PeerRouteLinkObservatoryOptions,
  LinkReachability,
  LinkWatchBatch,
  PeerLinkEvent,
  PeerLinkSummary,
} from "./services/links.js";
export { ProductionCapabilityAdapter } from "./simulation-adapter.js";
export type { ProductionCapabilityObservation } from "./simulation-adapter.js";
export {
  BearerReplayPolicy,
  FederationPolicy,
  KeySharePolicy,
} from "./security-policies.js";
export {
  CODE_EDITOR_LANGUAGES,
  EXTRA_PROP_SCHEMAS,
  EXTRA_REQUIRED,
  MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH,
  MAX_DEVICE_SESSION_PROP_LENGTH,
  MAX_QR_CODE_VALUE_LENGTH,
  PREVIEW_SURFACE_TYPES,
  STYLE_VALUE_SCHEMAS,
  visitWidget,
  WIDGET_PROP_KEYS,
  WIDGET_STYLE_KEYS,
  WIDGET_TYPES,
} from "./ui/schema.js";
export type {
  WidgetNode,
  WidgetStyle,
  WidgetTree,
  WidgetType,
  WidgetVisitor,
} from "./ui/schema.js";
export { WidgetValidationError, validateWidgetTree } from "./ui/validate.js";
export type { WidgetValidationOptions } from "./ui/validate.js";
export { diffWidgetTrees } from "./ui/diff.js";
export type { WidgetPatch } from "./ui/diff.js";
export { describeWidgetTree } from "./ui/describe.js";
export type { RenderedWidgetNode } from "./ui/describe.js";
