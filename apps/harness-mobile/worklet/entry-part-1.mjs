/* global TextDecoder, TextEncoder */
/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import {
  bytesToHex,
  hexToBytes,
} from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import {
  DestinationDirection,
  DestinationType,
} from "../../../packages/reticulum-ts/dist/destination.js";
import { BandwidthLimiter } from "../../../packages/reticulum-ts/dist/transport/bandwidth.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { createIpcMulticastBridge } from "../../../packages/worklet-core/src/ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "../../../packages/worklet-core/src/ipc-bonjour-bridge.mjs";
import {
  createAutoInterfaceOps,
  createAutomaticReticulumDiscovery,
  createCasLocatorOps,
  createCatalogOps,
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
  createStatusTimer,
  createTrustStoreOps,
  createWorkletPropagationPersistenceOps,
} from "../../../packages/worklet-core/src/index.mjs";
import {
  decodePeerInvitation,
} from "../../../packages/protocol/dist/index.js";
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
  get applyInterfaceConfig() {
    return applyInterfaceConfig;
  },
  get attachFreenetBackends() {
    return attachFreenetBackends;
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
  get ensureBareWebSocket() {
    return ensureBareWebSocket;
  },
  get ensureCatalog() {
    return ensureCatalog;
  },
  get ensureCrossDeviceTestDriver() {
    return ensureCrossDeviceTestDriver;
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
  get ensureMiniappHost() {
    return ensureMiniappHost;
  },
  get ensurePackageDriveManager() {
    return ensurePackageDriveManager;
  },
  get ensurePeerLinkDestination() {
    return ensurePeerLinkDestination;
  },
  get ensurePeerSessionManager() {
    return ensurePeerSessionManager;
  },
  get ensureReticulum() {
    return ensureReticulum;
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
  get loadPersistedIdentity() {
    return loadPersistedIdentity;
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
  get log() {
    return log;
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
  get refuseStoreAction() {
    return refuseStoreAction;
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
  get resolveIdentity() {
    return resolveIdentity;
  },
  get resumeInterfaces() {
    return resumeInterfaces;
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
  get runtimeStoreKeys() {
    return runtimeStoreKeys;
  },
  get send() {
    return send;
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
