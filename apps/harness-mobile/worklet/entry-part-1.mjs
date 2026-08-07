/* global TextDecoder, TextEncoder */
/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import {
  FreenetClient,
  FreenetClientContractBackend,
  FreenetContractPacketLogBackend,
  FreenetPropagationStore,
} from "../../../packages/bridge-freenet/dist/index.js";
import { FreenetInterface } from "../../../packages/reticulum-interfaces/dist/freenet.js";
import { PACKET_LOG_WASM_BASE64 } from "./packet-log-wasm.generated.mjs";
import { PROPAGATION_SET_WASM_BASE64 } from "./propagation-set-wasm.generated.mjs";
import {
  bytesToHex,
  hexToBytes,
} from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { BareCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/bare.js";
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import {
  DestinationDirection,
  DestinationType,
} from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import { BandwidthLimiter } from "../../../packages/reticulum-ts/dist/transport/bandwidth.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { AutoInterfaceBridge } from "../../../packages/reticulum-interfaces/dist/auto-bridge.js";
import { BleInterface } from "../../../packages/reticulum-interfaces/dist/ble/interface.js";
import { createIpcMulticastBridge } from "../../../packages/worklet-core/src/ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "../../../packages/worklet-core/src/ipc-bonjour-bridge.mjs";
import { createIpcBleBridge } from "./ipc-ble-bridge.mjs";
import { createIpcSerialBridge } from "../../../packages/worklet-core/src/ipc-serial-bridge.mjs";
import {
  connectTestAgent,
  createAutoInterfaceOps,
  createAutomaticReticulumDiscovery,
  createCasLocatorOps,
  createCatalogOps,
  createCrossDeviceTestDriver,
  createDevChannelClient,
  createEnsureDevChannel,
  createHarnessPeerPair,
  createHostReplyChannel,
  createInstallFromT256,
  createMiniappAnnounceService,
  createPeerSessionManagerProxyFromState,
  createPublishArchiveOps,
  createQuiesceInterfaces,
  createRegisterAnnounceHandler,
  createDropCensus,
  createRuntimeKeyValueStore,
  createStatusTimer,
  createTrustStoreOps,
  createWorkletMiniappHost,
  createWorkletPropagationPersistenceOps,
  joinCommunityNetwork,
  peerServiceAspect,
  sleep,
} from "../../../packages/worklet-core/src/index.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
  verifyPackage,
} from "../../../packages/app-registry/dist/index.js";
import {
  PackageResourceClient,
  assessFetchBudget,
  fetchPackage,
} from "../../../packages/bridge-hyper/dist/worklet.js";
import {
  HOST_API_VERSION,
  createWorkletFlagRelayService,
  generateConfirmationToken,
  validateManifestCapabilities,
} from "../../../packages/miniapp-runtime/dist/worklet.js";
import {
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS,
} from "../../../packages/lxmf-ts/dist/index.js";
import {
  decodePeerAudioFrame,
  decodePeerInvitation,
  framePeerAudioPayload,
  initialPeerAudioAssemblyState,
  stepPeerAudioAssembly,
} from "../../../packages/protocol/dist/index.js";
import { SimulatedMediaCodecDriver } from "../../../packages/effects/dist/media-codec.js";
import { createDelegatedWebRtcMediaPlaneOpener } from "../../../packages/miniapp-runtime/dist/media-stream.js";
import {
  refuseStorePosture,
  shouldRefuseDeveloperMode,
} from "./store-posture-policy.mjs";
import { RETICULUM_COMMUNITY_NETWORK } from "../../../packages/host-core/dist/community-network.js";
import { createHostLxmfDelivery } from "../../../packages/host-core/dist/host-lxmf-delivery.js";
import {
  AudioPeerDiscoveryAdapter,
  BluetoothPeerDiscoveryAdapter,
  CryptoPeerPairingBackend,
  InvitationPairingDriver,
  ManualPeerDiscoveryAdapter,
  meterHostPeerRoute,
  NtfyPeerDiscoveryAdapter,
  NtfyRendezvousClient,
  PeerDiscoveryRegistry,
  PeerSessionManager,
  QrPeerDiscoveryAdapter,
  ReticulumPeerDiscoveryAdapter,
  UnavailablePeerDiscoveryAdapter,
} from "../../../packages/peer-discovery/dist/index.js";
import {
  ensureBareWebSocketImpl,
  createProviderImpl,
  mobileStorePathImpl,
  runtimeKeyValueStoreImpl,
  importTrustedPublisherImpl,
  ensureCrossDeviceTestDriverImpl,
  handleNativeMediaOpusCommandImpl,
  ensurePackageDriveManagerImpl,
  sendImpl,
  peerTokenImpl,
  ntfyHostFetchImpl,
  sendBluetoothInvitationImpl,
  receiveBluetoothFrameImpl,
} from "./entry-extracted-1.mjs";
import { ensureMiniappHostImpl } from "./entry-extracted-5.mjs";
import {
  logImpl,
  refuseStoreActionImpl,
  pushStatusImpl,
  updateIdentityStatusImpl,
  loadPersistedIdentityImpl,
  persistIdentityImpl,
  createIdentityImpl,
  resetIdentityImpl,
  stopBleInterfaceImpl,
  stopRnodeInterfaceImpl,
  stopTcpInterfaceImpl,
  loadPacketLogWasmImpl,
  loadPropagationSetWasmImpl,
  stopFreenetInterfaceImpl,
  startFreenetInterfaceImpl,
  stopFreenetPropagationRoleImpl,
  startFreenetPropagationRoleImpl,
  detachFreenetBackendsImpl,
  attachFreenetBackendsImpl,
  anyRelayOrFreenetEnabledImpl,
  stopNodeImpl,
  resumeInterfacesImpl,
  resolveIdentityImpl,
  ensureReticulumImpl,
  ensureHostLxmfDeliveryImpl,
  stopHostLxmfDeliveryImpl,
  startTcpInterfaceImpl,
} from "./entry-extracted-2.mjs";
import { ensurePeerSessionManagerImpl } from "./entry-extracted-6.mjs";
import {
  startBleInterfaceImpl,
  startRnodeInterfaceImpl,
  applyInterfaceConfigImpl,
} from "./entry-extracted-3.mjs";
import { handleHostMessageImpl } from "./entry-extracted-4.mjs";

const extractedContext = {
  get IDENTITY_STORE_KEY() {
    return IDENTITY_STORE_KEY;
  },
  get IPC() {
    return IPC;
  },
  get activeIdentity() {
    return activeIdentity;
  },
  set activeIdentity(value) {
    activeIdentity = value;
  },
  get anyRelayOrFreenetEnabled() {
    return anyRelayOrFreenetEnabled;
  },
  set anyRelayOrFreenetEnabled(value) {
    anyRelayOrFreenetEnabled = value;
  },
  get applyInterfaceConfig() {
    return applyInterfaceConfig;
  },
  set applyInterfaceConfig(value) {
    applyInterfaceConfig = value;
  },
  get attachFreenetBackends() {
    return attachFreenetBackends;
  },
  set attachFreenetBackends(value) {
    attachFreenetBackends = value;
  },
  get attachWebRtcMediaTrack() {
    return attachWebRtcMediaTrack;
  },
  set attachWebRtcMediaTrack(value) {
    attachWebRtcMediaTrack = value;
  },
  get autoIface() {
    return autoIface;
  },
  set autoIface(value) {
    autoIface = value;
  },
  get automaticReticulumChannel() {
    return automaticReticulumChannel;
  },
  get bareWebSocketReady() {
    return bareWebSocketReady;
  },
  set bareWebSocketReady(value) {
    bareWebSocketReady = value;
  },
  get bleBridge() {
    return bleBridge;
  },
  set bleBridge(value) {
    bleBridge = value;
  },
  get bleIface() {
    return bleIface;
  },
  set bleIface(value) {
    bleIface = value;
  },
  get bluetoothAnswerWaiters() {
    return bluetoothAnswerWaiters;
  },
  get bluetoothAssemblies() {
    return bluetoothAssemblies;
  },
  get bluetoothDiscoveryChannel() {
    return bluetoothDiscoveryChannel;
  },
  get bluetoothOfferKeys() {
    return bluetoothOfferKeys;
  },
  get bluetoothOfferQueue() {
    return bluetoothOfferQueue;
  },
  get bluetoothOfferWaiters() {
    return bluetoothOfferWaiters;
  },
  get bonjourBridge() {
    return bonjourBridge;
  },
  set bonjourBridge(value) {
    bonjourBridge = value;
  },
  get bonjourDiscoveryEnabled() {
    return bonjourDiscoveryEnabled;
  },
  set bonjourDiscoveryEnabled(value) {
    bonjourDiscoveryEnabled = value;
  },
  get createIdentity() {
    return createIdentity;
  },
  set createIdentity(value) {
    createIdentity = value;
  },
  get createWorkletPropagationPersistence() {
    return createWorkletPropagationPersistence;
  },
  set createWorkletPropagationPersistence(value) {
    createWorkletPropagationPersistence = value;
  },
  get crossDeviceTestDriver() {
    return crossDeviceTestDriver;
  },
  set crossDeviceTestDriver(value) {
    crossDeviceTestDriver = value;
  },
  get detachFreenetBackends() {
    return detachFreenetBackends;
  },
  set detachFreenetBackends(value) {
    detachFreenetBackends = value;
  },
  get ensureBareWebSocket() {
    return ensureBareWebSocket;
  },
  set ensureBareWebSocket(value) {
    ensureBareWebSocket = value;
  },
  get ensureCatalog() {
    return ensureCatalog;
  },
  get ensureCrossDeviceTestDriver() {
    return ensureCrossDeviceTestDriver;
  },
  set ensureCrossDeviceTestDriver(value) {
    ensureCrossDeviceTestDriver = value;
  },
  get ensureDevChannel() {
    return ensureDevChannel;
  },
  set ensureDevChannel(value) {
    ensureDevChannel = value;
  },
  get ensureEntryCasStore() {
    return ensureEntryCasStore;
  },
  get ensureHostLxmfDelivery() {
    return ensureHostLxmfDelivery;
  },
  set ensureHostLxmfDelivery(value) {
    ensureHostLxmfDelivery = value;
  },
  get ensureMiniappHost() {
    return ensureMiniappHost;
  },
  set ensureMiniappHost(value) {
    ensureMiniappHost = value;
  },
  get ensurePackageDriveManager() {
    return ensurePackageDriveManager;
  },
  set ensurePackageDriveManager(value) {
    ensurePackageDriveManager = value;
  },
  get ensurePeerLinkDestination() {
    return ensurePeerLinkDestination;
  },
  get ensurePeerSessionManager() {
    return ensurePeerSessionManager;
  },
  set ensurePeerSessionManager(value) {
    ensurePeerSessionManager = value;
  },
  get ensureReticulum() {
    return ensureReticulum;
  },
  set ensureReticulum(value) {
    ensureReticulum = value;
  },
  get ensureTrustStore() {
    return ensureTrustStore;
  },
  get freenetBackendImpl() {
    return freenetBackendImpl;
  },
  set freenetBackendImpl(value) {
    freenetBackendImpl = value;
  },
  get freenetBackendProxy() {
    return freenetBackendProxy;
  },
  get freenetCapabilities() {
    return freenetCapabilities;
  },
  set freenetCapabilities(value) {
    freenetCapabilities = value;
  },
  get freenetIface() {
    return freenetIface;
  },
  set freenetIface(value) {
    freenetIface = value;
  },
  get freenetPropagationStore() {
    return freenetPropagationStore;
  },
  set freenetPropagationStore(value) {
    freenetPropagationStore = value;
  },
  get freenetSharedClient() {
    return freenetSharedClient;
  },
  set freenetSharedClient(value) {
    freenetSharedClient = value;
  },
  get handleNativeMediaOpusCommand() {
    return handleNativeMediaOpusCommand;
  },
  set handleNativeMediaOpusCommand(value) {
    handleNativeMediaOpusCommand = value;
  },
  get harnessPeerPair() {
    return harnessPeerPair;
  },
  get hostLxmfDelivery() {
    return hostLxmfDelivery;
  },
  set hostLxmfDelivery(value) {
    hostLxmfDelivery = value;
  },
  get hostReplyChannel() {
    return hostReplyChannel;
  },
  get importTrustedPublisher() {
    return importTrustedPublisher;
  },
  set importTrustedPublisher(value) {
    importTrustedPublisher = value;
  },
  get inboundBandwidthLimiter() {
    return inboundBandwidthLimiter;
  },
  get installFromT256() {
    return installFromT256;
  },
  set installFromT256(value) {
    installFromT256 = value;
  },
  get loadPacketLogWasm() {
    return loadPacketLogWasm;
  },
  set loadPacketLogWasm(value) {
    loadPacketLogWasm = value;
  },
  get loadPersistedIdentity() {
    return loadPersistedIdentity;
  },
  set loadPersistedIdentity(value) {
    loadPersistedIdentity = value;
  },
  get loadPropagationCache() {
    return loadPropagationCache;
  },
  set loadPropagationCache(value) {
    loadPropagationCache = value;
  },
  get loadPropagationSetWasm() {
    return loadPropagationSetWasm;
  },
  set loadPropagationSetWasm(value) {
    loadPropagationSetWasm = value;
  },
  get log() {
    return log;
  },
  set log(value) {
    log = value;
  },
  get miniappHost() {
    return miniappHost;
  },
  set miniappHost(value) {
    miniappHost = value;
  },
  get multicastBridge() {
    return multicastBridge;
  },
  set multicastBridge(value) {
    multicastBridge = value;
  },
  get multicastEntitled() {
    return multicastEntitled;
  },
  set multicastEntitled(value) {
    multicastEntitled = value;
  },
  get nodeSuspended() {
    return nodeSuspended;
  },
  set nodeSuspended(value) {
    nodeSuspended = value;
  },
  get ntfyHostFetch() {
    return ntfyHostFetch;
  },
  set ntfyHostFetch(value) {
    ntfyHostFetch = value;
  },
  get ntfyUrl() {
    return ntfyUrl;
  },
  set ntfyUrl(value) {
    ntfyUrl = value;
  },
  get outboundBandwidthLimiter() {
    return outboundBandwidthLimiter;
  },
  get packageDriveManager() {
    return packageDriveManager;
  },
  set packageDriveManager(value) {
    packageDriveManager = value;
  },
  get packageSwarm() {
    return packageSwarm;
  },
  set packageSwarm(value) {
    packageSwarm = value;
  },
  get packetLogWasmCache() {
    return packetLogWasmCache;
  },
  set packetLogWasmCache(value) {
    packetLogWasmCache = value;
  },
  get peerChrome() {
    return peerChrome;
  },
  get peerLinks() {
    return peerLinks;
  },
  get peerSessionManager() {
    return peerSessionManager;
  },
  set peerSessionManager(value) {
    peerSessionManager = value;
  },
  get peerSessionManagerProxy() {
    return peerSessionManagerProxy;
  },
  get peerToken() {
    return peerToken;
  },
  set peerToken(value) {
    peerToken = value;
  },
  get pendingFreenetAuthToken() {
    return pendingFreenetAuthToken;
  },
  set pendingFreenetAuthToken(value) {
    pendingFreenetAuthToken = value;
  },
  get pendingFreenetLocalDirection() {
    return pendingFreenetLocalDirection;
  },
  set pendingFreenetLocalDirection(value) {
    pendingFreenetLocalDirection = value;
  },
  get pendingRnodeBaudRate() {
    return pendingRnodeBaudRate;
  },
  set pendingRnodeBaudRate(value) {
    pendingRnodeBaudRate = value;
  },
  get pendingRnodeDeviceId() {
    return pendingRnodeDeviceId;
  },
  set pendingRnodeDeviceId(value) {
    pendingRnodeDeviceId = value;
  },
  get pendingTarget() {
    return pendingTarget;
  },
  set pendingTarget(value) {
    pendingTarget = value;
  },
  get persistCatalogState() {
    return persistCatalogState;
  },
  get persistIdentity() {
    return persistIdentity;
  },
  set persistIdentity(value) {
    persistIdentity = value;
  },
  get propagationDestination() {
    return propagationDestination;
  },
  set propagationDestination(value) {
    propagationDestination = value;
  },
  get propagationServer() {
    return propagationServer;
  },
  set propagationServer(value) {
    propagationServer = value;
  },
  get propagationSetWasmCache() {
    return propagationSetWasmCache;
  },
  set propagationSetWasmCache(value) {
    propagationSetWasmCache = value;
  },
  get provider() {
    return provider;
  },
  get publishArchiveFromWorklet() {
    return publishArchiveFromWorklet;
  },
  set publishArchiveFromWorklet(value) {
    publishArchiveFromWorklet = value;
  },
  get pushCatalog() {
    return pushCatalog;
  },
  get pushStatus() {
    return pushStatus;
  },
  set pushStatus(value) {
    pushStatus = value;
  },
  get pushTrustList() {
    return pushTrustList;
  },
  get quiesceInterfaces() {
    return quiesceInterfaces;
  },
  set quiesceInterfaces(value) {
    quiesceInterfaces = value;
  },
  get receiveBluetoothFrame() {
    return receiveBluetoothFrame;
  },
  set receiveBluetoothFrame(value) {
    receiveBluetoothFrame = value;
  },
  get refuseStoreAction() {
    return refuseStoreAction;
  },
  set refuseStoreAction(value) {
    refuseStoreAction = value;
  },
  get registerAnnounceHandler() {
    return registerAnnounceHandler;
  },
  set registerAnnounceHandler(value) {
    registerAnnounceHandler = value;
  },
  get requestHostReply() {
    return requestHostReply;
  },
  get resetIdentity() {
    return resetIdentity;
  },
  set resetIdentity(value) {
    resetIdentity = value;
  },
  get resolveIdentity() {
    return resolveIdentity;
  },
  set resolveIdentity(value) {
    resolveIdentity = value;
  },
  get resumeInterfaces() {
    return resumeInterfaces;
  },
  set resumeInterfaces(value) {
    resumeInterfaces = value;
  },
  get reticulum() {
    return reticulum;
  },
  set reticulum(value) {
    reticulum = value;
  },
  get relayBridge() {
    return relayBridge;
  },
  set relayBridge(value) {
    relayBridge = value;
  },
  get relayPolicy() {
    return relayPolicy;
  },
  set relayPolicy(value) {
    relayPolicy = value;
  },
  get relayService() {
    return relayService;
  },
  set relayService(value) {
    relayService = value;
  },
  get loadRelayConfig() {
    return loadRelayConfig;
  },
  get persistRelayConfig() {
    return persistRelayConfig;
  },
  get rnodeIface() {
    return rnodeIface;
  },
  set rnodeIface(value) {
    rnodeIface = value;
  },
  get runtime() {
    return runtime;
  },
  get runtimeKeyValueStore() {
    return runtimeKeyValueStore;
  },
  set runtimeKeyValueStore(value) {
    runtimeKeyValueStore = value;
  },
  get runtimeStoreKeys() {
    return runtimeStoreKeys;
  },
  get send() {
    return send;
  },
  set send(value) {
    send = value;
  },
  get serialBridge() {
    return serialBridge;
  },
  set serialBridge(value) {
    serialBridge = value;
  },
  get startAutoInterface() {
    return startAutoInterface;
  },
  set startAutoInterface(value) {
    startAutoInterface = value;
  },
  get startBleInterface() {
    return startBleInterface;
  },
