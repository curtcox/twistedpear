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
  EgressBudgetLedger,
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
export {
  DiagnosticsRing,
  DIAGNOSTICS_ENTRY_MAX_BYTES,
  DIAGNOSTICS_RING_CAPACITY,
  isDiagnosticsLevel,
} from "./diagnostics.js";
export type {
  AppErrorPhase,
  AppErrorReport,
  DiagnosticsLevel,
  DiagnosticsLogEntry,
  DiagnosticsRingSnapshot,
} from "./diagnostics.js";
export { MiniappLifecycle } from "./lifecycle.js";
export type {
  MiniappLifecycleSnapshot,
  MiniappLifecycleState,
  LifecycleOptions,
} from "./lifecycle.js";
export {
  BareWorkerSandboxBackend,
  CompartmentBackendUnavailableError,
  createSandboxBackend,
  createWebSandboxProxyBackend,
  encodeJsonWireValue,
  HardenedCompartmentSandboxBackend,
  isJsonWireBytes,
  NodeWorkerSandboxBackend,
  prepareBundleSource,
  reviveJsonWireValue,
  WebSandboxBackend,
  WebSandboxBackendUnavailableError,
  WorkerBackendUnavailableError,
} from "./export-sandbox.js";
export type {
  JsonWireBytes,
  SandboxBackend,
  SandboxInstance,
  SandboxLimits,
  SandboxSpawnOptions,
  WebSandboxProxyController,
  WebSandboxProxyOutbound,
} from "./export-sandbox.js";
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
  BACKGROUND_GRANT_COST,
  BACKGROUND_IOS_LIMITATION,
  BACKGROUND_SLOT_LIMIT,
  BackgroundBudgetError,
  RUNTIME_BACKGROUND_CAPABILITY,
  assertBackgroundSlotAvailable,
  presentBackgroundGrant,
  shouldKeepRunningOnHostSuspend,
} from "./background-execution.js";
export {
  RUNTIME_WAKE_CAPABILITY,
  WAKE_GRANT_COST,
  WAKE_MAX_BUDGET_MS,
  WAKE_MIN_INTERVAL_MS,
  WAKE_SLOT_LIMIT,
  WakeBudgetError,
  advanceWake,
  allocateWake,
  dueWakes,
  presentWakeGrant,
} from "./scheduled-wake.js";
export type { WakeGrant, WakeRequest } from "./scheduled-wake.js";
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
export * from "./public-services/index.js";
export type * from "./public-services/index.js";
export type { CasShareBackend } from "./host.js";
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
export { ProductionCapabilityAdapter } from "./simulation-adapter.js";
export type { ProductionCapabilityObservation } from "./simulation-adapter.js";
export {
  BearerReplayPolicy,
  FederationPolicy,
  KeySharePolicy,
} from "./security-policies.js";
export {
  ACCESSIBILITY_DECORATIVE_TYPES,
  ACCESSIBILITY_HEADING_TYPES,
  ACCESSIBILITY_HINT_TYPES,
  ACCESSIBILITY_LABEL_TYPES,
  ACCESSIBILITY_LIVE_REGIONS,
  ACCESSIBILITY_LIVE_TYPES,
  CODE_EDITOR_LANGUAGES,
  EXTRA_PROP_SCHEMAS,
  EXTRA_REQUIRED,
  MAX_ACCESSIBILITY_TEXT_LENGTH,
  MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH,
  MAX_DEVICE_SESSION_PROP_LENGTH,
  MAX_QR_CODE_VALUE_LENGTH,
  PREVIEW_SURFACE_TYPES,
  STYLE_VALUE_SCHEMAS,
  TEXT_INPUT_KEYBOARDS,
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
export {
  APP_TRACE_FORMAT,
  APP_TRACE_KIND,
  APP_TRACE_MODE_SHAPE,
  APP_TRACE_SHAPE_FORBIDDEN_KEYS,
  AppTraceFormatError,
  hashAppTrace,
  parseAppTrace,
  serializeAppTrace,
} from "./diagnostics.js";
export type {
  AppTrace,
  AppTraceEntry,
  AppTraceHost,
  AppTraceIdentity,
  AppTraceInboundKind,
} from "./diagnostics.js";
export {
  APP_TRACE_MODE_PAYLOAD,
  hashPayloadAppTrace,
  parsePayloadAppTrace,
  redactAppTrace,
  serializePayloadAppTrace,
} from "./trace-payload.js";
export type {
  PayloadAppTrace,
  PayloadAppTraceEntry,
  PayloadBrokerEntry,
} from "./trace-payload.js";
export {
  APP_TRACE_MODE_SEALED,
  APP_TRACE_SEAL_ALG,
  openSealedAppTrace,
  parseSealedAppTrace,
  sealAppTrace,
} from "./trace-seal.js";
export type { SealedAppTrace, TraceEntropy } from "./trace-seal.js";
export {
  DEFAULT_TRACE_MAX_BYTES,
  SessionRecorder,
  UnshimmedClockError,
  countWidgetNodes,
} from "./trace-recording.js";
export type {
  SessionRecorderOptions,
  BrokerAuditShape,
} from "./trace-recording.js";
export { installTimeShims, isNativeDateNow } from "./sandbox/time-shims.js";
export type {
  TimeShimGlobal,
  TimeShimHandle,
  TimeShimOptions,
} from "./sandbox/time-shims.js";
