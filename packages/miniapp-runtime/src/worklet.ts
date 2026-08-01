/**
 * Bare worklet entrypoint for miniapp-runtime.
 * Excludes Node `worker_threads`, web-only sandbox backends, and the index barrel
 * that re-exports them (linked externals evaluate every static export).
 */
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
export { MiniappLifecycle } from "./lifecycle.js";
export type { MiniappLifecycleSnapshot, MiniappLifecycleState, LifecycleOptions } from "./lifecycle.js";
export type { SandboxBackend, SandboxInstance, SandboxLimits, SandboxSpawnOptions } from "./sandbox/backend.js";
export { BareWorkerSandboxBackend, WorkerBackendUnavailableError } from "./sandbox/worker.js";
export { encodeJsonWireValue, reviveJsonWireValue, isJsonWireBytes } from "./sandbox/json-wire.js";
export type { JsonWireBytes } from "./sandbox/json-wire.js";
export { createSandboxBackend } from "./sandbox/worklet-factory.js";
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
  ConfirmationKind,
  ConfirmationRequest,
  ConfirmationResult,
  HostConfirmationChannel
} from "./confirm.js";
export { KvStorageBeeBackend } from "./services/storage-bee-kv.js";
export { createOpenRouterBackend } from "./services/ai-openrouter.js";
export type { OpenRouterBackendOptions } from "./services/ai-openrouter.js";
export {
  DeviceBrokerService,
  DeviceBrokerServiceError,
  DeviceError,
  DeviceManager
} from "./services/device.js";
export type {
  DeviceDescriptor,
  DeviceDiagnostic,
  DeviceOpenRequest,
  DeviceSample,
  DeviceSession,
  DeviceSessionHandle
} from "./services/device.js";
export {
  createSimulatedDeviceDrivers,
  createSimulatedDeviceManager,
  createHybridDeviceDrivers
} from "./device-manager.js";
export type { DeviceChromeSession, DeviceManagerOptions } from "./device-manager.js";
export {
  CodecStreamEgressFactory,
  ReservedStreamEgressFactory,
  PeerRouteStreamEgressFactory,
  PeerRouteMediaBridge,
  PlaneStreamEgressFactory,
  createCasDerivedPlaneOpener,
  createHostPlaneOpeners,
  createPearsBulkAppendPlaneOpener,
  createPeerRouteLinkSupply,
  createPeerRoutePlaneOpeners,
  createWebRtcMediaTrackPlaneOpener,
  createDelegatedWebRtcMediaPlaneOpener
} from "./media-stream.js";
export type {
  CasDerivedPlaneOpenerOptions,
  PearsBulkAppendPlaneOpenerOptions,
  WebRtcMediaTrackHandle,
  WebRtcMediaTrackPlaneOpenerOptions
} from "./media-stream.js";
export { SessionInviteService } from "./session-invite.js";
export type { SessionInvite, SessionInviteChrome } from "./session-invite.js";
export {
  createHostBridgedDriver,
  createHostBridgedDrivers
} from "./drivers/host-bridge.js";
export type { DeviceHostBridge } from "./drivers/host-bridge.js";
export type { RelayService } from "./services/relay.js";
export {
  createWorkletFlagRelayService
} from "./services/worklet-flag-relay.js";
export type {
  WorkletFlagRelayController,
  WorkletFlagRelaySnapshot
} from "./services/worklet-flag-relay.js";
