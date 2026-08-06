import { generateConfirmationToken } from "../../../packages/miniapp-runtime/dist/worklet.js";
import { createHarnessPeerPair } from "../../../packages/worklet-core/src/harness-peer-pair.mjs";
import { createDesktopPeerChrome } from "./peer-chrome.mjs";
import { createPeerSessionOps } from "./peer-session.mjs";
import { createMiniappHostOps } from "./miniapp-host-ops.mjs";
import { createTestSupportOps } from "./test-support.mjs";
import { createNodeMessageHandlers } from "./messages-node.mjs";
import { createIdentityMessageHandlers } from "./messages-identity.mjs";
import { createCatalogMessageHandlers } from "./messages-catalog.mjs";
import { createMiniappMessageHandlers } from "./messages-miniapp.mjs";
import { createTestAgentHandler } from "./test-agent-handler.mjs";

/** Assemble desktop host message handlers and peer/mini-app ops. */
export function createDesktopHostMessagePlane(deps) {
  const {
    state,
    provider,
    runtime,
    status,
    send,
    log,
    pushStatus,
    freenetBackendProxy,
    hostReplyChannel,
    webRtcRouteListeners,
    webRtcRoutePending,
    refuseStoreAction,
    shouldRefuseDeveloperMode,
    identityStoreKey,
    applyInterfaceConfig,
    startTcpInterface,
    stopTcpInterface,
    startAutoInterface,
    stopAutoInterface,
    startFreenetInterface,
    stopFreenetInterface,
    quiesceInterfaces,
    resumeInterfaces,
    reconnectTcpAfterNetworkChange,
    stopNode,
    startPropagation,
    stopPropagation,
    ensureReticulum,
    ensureMiniappHost,
    loadRelayConfig,
    persistRelayConfig,
    loadPacketLogWasm,
    createIdentity,
    persistIdentity,
    resetIdentity,
    updateIdentityStatus,
    pushModerationState,
    persistModerationState,
    normalizedSourceHash,
    ensureCatalog,
    persistCatalogState,
    pushCatalog,
    ensureTrustStore,
    pushTrustList,
    ensureEntryCasStore,
    ensurePackageDriveManager,
    resolveIdentity,
    installFromT256,
    ensureDevChannel,
    runtimeKeyValueStore,
    envValue,
    requestRendererReply,
    outboundBandwidthLimiter,
    webRtcSessionByFingerprint,
    peerLinks,
    ensurePeerLinkDestination,
    automaticReticulumChannel,
    hostDataPath,
    bundledCatalogModule,
    NodeWorkerSandboxBackend,
    inboundBandwidthLimiter,
    publishArchiveFromWorklet,
    publishArchiveAsIdentity,
    harnessPeerPair = createHarnessPeerPair(),
  } = deps;

  const peerChromeBase = createDesktopPeerChrome({
    requestReply: requestRendererReply,
    send,
    createToken: () =>
      generateConfirmationToken((length) => provider.randomBytes(length)),
    ntfyServer: envValue("TWISTEDPEAR_NTFY_URL"),
  });
  const peerChrome = {
    ...peerChromeBase,
    get manual() {
      return harnessPeerPair.enabled
        ? harnessPeerPair.channel
        : peerChromeBase.manual;
    },
    qr: peerChromeBase.qr,
    audio: peerChromeBase.audio,
    ntfy: peerChromeBase.ntfy,
    async confirm(peer, pairingRequest) {
      if (harnessPeerPair.enabled) return true;
      return peerChromeBase.confirm(peer, pairingRequest);
    },
  };

  const { ensurePeerSessionManager, peerSessionManagerProxy } =
    createPeerSessionOps({
      state,
      provider,
      send,
      log,
      envValue,
      peerChrome,
      requestRendererReply,
      outboundBandwidthLimiter,
      webRtcSessionByFingerprint,
      webRtcRouteListeners,
      webRtcRoutePending,
      peerLinks,
      resolveIdentity,
      ensureReticulum,
      ensurePeerLinkDestination,
      automaticReticulumChannel,
    });

  const miniappHostOps = createMiniappHostOps({
    state,
    provider,
    runtime,
    status,
    send,
    log,
    pushStatus,
    hostDataPath,
    bundledCatalogModule,
    NodeWorkerSandboxBackend,
    freenetBackendProxy,
    peerSessionManagerProxy,
    requestRendererReply,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
    webRtcSessionByFingerprint,
    applyInterfaceConfig,
    runtimeKeyValueStore,
    ensureReticulum,
    resolveIdentity,
    ensureCatalog,
    persistCatalogState,
    pushCatalog,
    ensureTrustStore,
    pushTrustList,
    ensureEntryCasStore,
    publishArchiveFromWorklet,
    publishArchiveAsIdentity,
    installFromT256,
  });

  const { importTrustedPublisherForTest, ensureCrossDeviceTestDriver } =
    createTestSupportOps({
      state,
      provider,
      runtime,
      requestRendererReply,
      ensureTrustStore,
      ensureMiniappHost,
      ensureCatalog,
      ensureEntryCasStore,
      installFromT256,
      resolveIdentity,
    });

  const nodeMessages = createNodeMessageHandlers({
    state,
    provider,
    runtime,
    status,
    send,
    log,
    pushStatus,
    freenetBackendProxy,
    applyInterfaceConfig,
    startTcpInterface,
    stopTcpInterface,
    startAutoInterface,
    stopAutoInterface,
    startFreenetInterface,
    stopFreenetInterface,
    quiesceInterfaces,
    resumeInterfaces,
    reconnectTcpAfterNetworkChange,
    stopNode,
    startPropagation,
    stopPropagation,
    ensureReticulum,
    ensureMiniappHost,
    loadRelayConfig,
    persistRelayConfig,
    loadPacketLogWasm,
  });

  const identityMessages = createIdentityMessageHandlers({
    state,
    provider,
    runtime,
    status,
    send,
    log,
    pushStatus,
    identityStoreKey,
    applyInterfaceConfig,
    createIdentity,
    persistIdentity,
    resetIdentity,
    updateIdentityStatus,
    ensureMiniappHost,
    pushModerationState,
    persistModerationState,
    normalizedSourceHash,
  });

  const catalogMessages = createCatalogMessageHandlers({
    state,
    provider,
    runtime,
    status,
    send,
    log,
    pushStatus,
    refuseStoreAction,
    ensureCatalog,
    persistCatalogState,
    pushCatalog,
    ensureTrustStore,
    pushTrustList,
    ensureEntryCasStore,
    ensurePackageDriveManager,
    resolveIdentity,
    installFromT256,
    importTrustedPublisherForTest,
  });

  const miniappMessages = createMiniappMessageHandlers({
    state,
    provider,
    runtime,
    status,
    send,
    log,
    pushStatus,
    hostReplyChannel,
    webRtcRouteListeners,
    webRtcRoutePending,
    refuseStoreAction,
    shouldRefuseDeveloperMode,
    ensureMiniappHost,
    ensureCatalog,
    ensureDevChannel,
    runtimeKeyValueStore,
  });

  const handleConnectTestAgent = createTestAgentHandler({
    state,
    provider,
    status,
    log,
    harnessPeerPair,
    requestRendererReply,
    resolveIdentity,
    ensureReticulum,
    startTcpInterface,
    ensureHostLxmfDelivery: deps.ensureHostLxmfDelivery,
    ensureMiniappHost,
    ensurePeerSessionManager,
    ensureCrossDeviceTestDriver,
  });

  return {
    ...miniappHostOps,
    ensurePeerSessionManager,
    importTrustedPublisherForTest,
    ensureCrossDeviceTestDriver,
    identityMessages,
    hostMessageHandlers: {
      ...nodeMessages.handlers,
      ...identityMessages.handlers,
      ...catalogMessages.handlers,
      ...miniappMessages.handlers,
      "connect-test-agent": handleConnectTestAgent,
    },
  };
}
