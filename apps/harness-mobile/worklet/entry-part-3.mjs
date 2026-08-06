/* Concat part 3 of entry.mjs; assembled by build scripts. */
const hostReplyChannel = createHostReplyChannel({ send });
const requestHostReply = hostReplyChannel.requestReply;
function peerToken() {
  return peerTokenImpl(extractedContext);
}
const harnessPeerPair = createHarnessPeerPair();
const peerChromeBase = {
  manual: {
    async *offer(session, code, options) {
      const reply = await requestHostReply(
        {
          type: "peer-manual-present",
          token: peerToken(),
          sessionId: session.id,
          code,
          expectsResponse: true,
        },
        options.timeoutMs,
      );
      if (reply?.accepted === true && typeof reply.code === "string")
        yield reply.code;
    },
    async *accept(options) {
      const session = { id: peerToken(), kind: "manual" };
      const reply = await requestHostReply(
        {
          type: "peer-manual-enter",
          token: peerToken(),
          sessionId: session.id,
          service: options.service,
        },
        options.timeoutMs,
      );
      if (reply?.accepted === true && typeof reply.code === "string")
        yield { session, code: reply.code };
    },
    async answer(session, code) {
      await requestHostReply({
        type: "peer-manual-present",
        token: peerToken(),
        sessionId: session.id,
        code,
        expectsResponse: false,
      });
    },
    async cancel(sessionId) {
      send({ type: "peer-chrome-cancel", sessionId });
    },
  },
  qr: {
    async availability() {
      const reply = await requestHostReply(
        { type: "peer-qr-availability", token: peerToken() },
        5_000,
      );
      return (
        reply?.availability ?? {
          state: "unsupported",
          reason: "Native QR support could not be detected",
        }
      );
    },
    async *present(session, codes, options) {
      const reply = await requestHostReply(
        {
          type: "peer-qr-present",
          token: peerToken(),
          sessionId: session.id,
          codes,
          expectsResponse: true,
        },
        options.timeoutMs,
      );
      if (reply?.accepted === true && typeof reply.code === "string")
        yield reply.code;
    },
    async *scan(options) {
      const session = { id: peerToken(), kind: "qr" };
      const reply = await requestHostReply(
        {
          type: "peer-qr-scan",
          token: peerToken(),
          sessionId: session.id,
          service: options.service,
        },
        options.timeoutMs,
      );
      if (reply?.accepted === true && typeof reply.code === "string")
        yield { session, code: reply.code };
    },
    async answer(session, codes) {
      await requestHostReply({
        type: "peer-qr-present",
        token: peerToken(),
        sessionId: session.id,
        codes,
        expectsResponse: false,
      });
    },
    async cancel(sessionId) {
      send({ type: "peer-chrome-cancel", sessionId });
    },
  },
  audio: {
    async availability() {
      const reply = await requestHostReply(
        { type: "peer-audio-availability", token: peerToken() },
        5_000,
      );
      return (
        reply?.availability ?? {
          state: "unsupported",
          reason: "Native PCM support could not be detected",
        }
      );
    },
    async *transmit(session, frames, options) {
      const reply = await requestHostReply(
        {
          type: "peer-audio-transmit",
          token: peerToken(),
          sessionId: session.id,
          framesHex: frames.map(bytesToHex),
          expectsResponse: true,
        },
        options.timeoutMs,
      );
      if (reply?.error !== undefined) throw new Error(reply.error);
      for (const frame of reply?.framesHex ?? []) yield hexToBytes(frame);
    },
    async *receive(options) {
      const session = { id: peerToken(), kind: "audio" };
      const reply = await requestHostReply(
        {
          type: "peer-audio-receive",
          token: peerToken(),
          sessionId: session.id,
          service: options.service,
        },
        options.timeoutMs,
      );
      if (reply?.error !== undefined) throw new Error(reply.error);
      for (const frame of reply?.framesHex ?? [])
        yield { session, frame: hexToBytes(frame) };
    },
    async answer(session, frames) {
      const reply = await requestHostReply(
        {
          type: "peer-audio-transmit",
          token: peerToken(),
          sessionId: session.id,
          framesHex: frames.map(bytesToHex),
          expectsResponse: false,
        },
        120_000,
      );
      if (reply?.accepted !== true)
        throw new Error(reply?.error ?? "Audio answer playback was cancelled");
    },
    async cancel(sessionId) {
      send({ type: "peer-chrome-cancel", sessionId });
    },
  },
  ntfy: {
    async availability() {
      return ntfyUrl === null
        ? {
            state: "offline",
            reason: "No ntfy rendezvous server is configured",
          }
        : {
            state: "available",
            reason: `Encrypted rendezvous through ${ntfyUrl}`,
          };
    },
    async presentCode(session, code, options) {
      const reply = await requestHostReply(
        {
          type: "peer-ntfy-present",
          token: peerToken(),
          sessionId: session.id,
          code,
          server: ntfyUrl,
        },
        options.timeoutMs,
      );
      if (reply?.accepted !== true)
        throw new Error("ntfy rendezvous was cancelled");
    },
    async requestCode(session, options) {
      const reply = await requestHostReply(
        {
          type: "peer-ntfy-enter",
          token: peerToken(),
          sessionId: session.id,
          service: options.service,
          server: ntfyUrl,
        },
        options.timeoutMs,
      );
      if (reply?.accepted !== true || typeof reply.code !== "string")
        throw new Error("ntfy rendezvous was cancelled");
      return reply.code;
    },
    async cancel(sessionId) {
      send({ type: "peer-chrome-cancel", sessionId });
    },
  },
  async confirm(peer, request) {
    const reply = await requestHostReply({
      type: "peer-confirm-request",
      token: peerToken(),
      appId: request.service,
      service: request.service,
      purpose: request.purpose,
      peer,
    });
    return reply?.approved === true;
  },
};
const peerChrome = {
  get manual() {
    return harnessPeerPair.enabled
      ? harnessPeerPair.channel
      : peerChromeBase.manual;
  },
  qr: peerChromeBase.qr,
  audio: peerChromeBase.audio,
  ntfy: peerChromeBase.ntfy,
  async confirm(peer, request) {
    if (harnessPeerPair.enabled) return true;
    return peerChromeBase.confirm(peer, request);
  },
};
function ntfyHostFetch(input, init = {}) {
  return ntfyHostFetchImpl(extractedContext, input, init);
}
function sendBluetoothInvitation(envelope) {
  return sendBluetoothInvitationImpl(extractedContext, envelope);
}
function receiveBluetoothFrame(frameBytes) {
  return receiveBluetoothFrameImpl(extractedContext, frameBytes);
}

const bluetoothDiscoveryChannel = {
  async availability() {
    return status.bleConnected
      ? {
          state: "available",
          reason: "Native BLE invitation GATT multiplex is connected",
        }
      : status.bleEnabled
        ? {
            state: "offline",
            reason: "BLE is enabled but no peer GATT pipe is connected",
          }
        : {
            state: "permission-required",
            reason:
              "Enable BLE in trusted host settings to grant scan/advertise permission",
          };
  },
  async *advertise(session, envelope) {
    const invitation = decodePeerInvitation(envelope, Date.now());
    const key = bytesToHex(invitation.sessionId);
    bluetoothOfferKeys.set(session.id, key);
    const answer = new Promise((resolve, reject) =>
      bluetoothAnswerWaiters.set(key, {
        resolve,
        reject,
        adapterSessionId: session.id,
      }),
    );
    sendBluetoothInvitation(envelope);
    yield await answer;
  },
  async *scan() {
    const immediate = bluetoothOfferQueue.shift();
    if (immediate !== undefined) {
      yield immediate;
      return;
    }
    yield await new Promise((resolve) => bluetoothOfferWaiters.push(resolve));
  },
  async answer(_session, envelope) {
    sendBluetoothInvitation(envelope);
  },
  async cancel(sessionId) {
    const key = bluetoothOfferKeys.get(sessionId);
    if (key !== undefined) {
      bluetoothOfferKeys.delete(sessionId);
      const waiter = bluetoothAnswerWaiters.get(key);
      bluetoothAnswerWaiters.delete(key);
      waiter?.reject(new Error("Bluetooth invitation exchange cancelled"));
    }
  },
};
async function ensurePeerSessionManager() {
  return ensurePeerSessionManagerImpl(extractedContext);
}

const peerSessionManagerProxy = createPeerSessionManagerProxyFromState({
  getManager: () => peerSessionManager,
  ensurePeerSessionManager,
});
function log(line) {
  return logImpl(extractedContext, line);
}
function refuseStoreAction(action) {
  return refuseStoreActionImpl(extractedContext, action);
}
function pushStatus() {
  return pushStatusImpl(extractedContext);
}

const statusTimer = createStatusTimer({ onTick: () => pushStatus() });
const startStatusTimer = statusTimer.start;
const stopStatusTimer = statusTimer.stop;

({
  loadPropagationCache,
  createPersistence: createWorkletPropagationPersistence,
} = createWorkletPropagationPersistenceOps({
  runtime,
  propagationStoreKey: PROPAGATION_STORE_KEY,
  getPropagationStoreCache: () => propagationStoreCache,
  setPropagationStoreCache: (cache) => {
    propagationStoreCache = cache;
  },
}));

({ publishArchiveFromWorklet } = createPublishArchiveOps({
  provider,
  DestinationDirection,
  DestinationType,
  nodeFallback: false,
  casLocators,
  casResponseDestinations,
  ensureReticulum,
  resolveIdentity,
  ensurePackageDriveManager,
  log,
}));

installFromT256 = createInstallFromT256({
  provider,
  runtime,
  nodeFallback: false,
  ensureEntryCasStore,
  waitForCasLocator,
  ensureReticulum,
  getReticulum: () => reticulum,
  resolveIdentity,
  ensurePackageDriveManager,
  ensureCatalog,
  ensureTrustStore,
  persistCatalogState,
  pushCatalog,
  ensureMiniappHost,
  requestHostReply,
});

registerAnnounceHandler = createRegisterAnnounceHandler({
  getReticulum: () => reticulum,
  status,
  pushStatus,
  send,
  ingestCasLocator,
  respondToCasLocatorRequest,
  ensureCatalog,
  persistCatalogState,
  pushCatalog,
  log,
  dropCensus: createDropCensus(),
});

ensureDevChannel = createEnsureDevChannel({
  createDevChannelClient,
  ensureMiniappHost,
  send,
  log,
});

({ startAutoInterface, stopAutoInterface } = createAutoInterfaceOps({
  provider,
  runtime,
  status,
  pushStatus,
  log,
  ensureReticulum,
  getAutoIface: () => autoIface,
  setAutoIface: (value) => {
    autoIface = value;
  },
  getMulticastBridge: () => multicastBridge,
  setMulticastBridge: (value) => {
    multicastBridge = value;
  },
  getBonjourBridge: () => bonjourBridge,
  setBonjourBridge: (value) => {
    bonjourBridge = value;
  },
  getMulticastEntitled: () => multicastEntitled,
  getBonjourDiscoveryEnabled: () => bonjourDiscoveryEnabled,
  createIpcMulticastBridge,
  createIpcBonjourBridge,
}));

quiesceInterfaces = createQuiesceInterfaces({
  log,
  pushStatus,
  stopTcpInterface,
  stopAutoInterface,
  stopBleInterface,
  stopRnodeInterface,
  stopFreenetInterface,
});
function updateIdentityStatus(identity) {
  return updateIdentityStatusImpl(extractedContext, identity);
}
async function loadPersistedIdentity() {
  return loadPersistedIdentityImpl(extractedContext);
}
async function persistIdentity(identity) {
  return persistIdentityImpl(extractedContext, identity);
}
async function createIdentity() {
  return createIdentityImpl(extractedContext);
}
async function resetIdentity() {
  return resetIdentityImpl(extractedContext);
}
async function stopBleInterface() {
  return stopBleInterfaceImpl(extractedContext);
}
async function stopRnodeInterface() {
  return stopRnodeInterfaceImpl(extractedContext);
}
async function stopTcpInterface() {
  return stopTcpInterfaceImpl(extractedContext);
}
function loadPacketLogWasm() {
  return loadPacketLogWasmImpl(extractedContext);
}
function loadPropagationSetWasm() {
  return loadPropagationSetWasmImpl(extractedContext);
}
async function stopFreenetInterface() {
  return stopFreenetInterfaceImpl(extractedContext);
}
async function startFreenetInterface() {
  return startFreenetInterfaceImpl(extractedContext);
}
async function stopFreenetPropagationRole() {
  return stopFreenetPropagationRoleImpl(extractedContext);
}
async function startFreenetPropagationRole(mirror) {
  return startFreenetPropagationRoleImpl(extractedContext, mirror);
}
async function detachFreenetBackends() {
  return detachFreenetBackendsImpl(extractedContext);
}
async function attachFreenetBackends() {
  return attachFreenetBackendsImpl(extractedContext);
}
function anyRelayOrFreenetEnabled() {
  return anyRelayOrFreenetEnabledImpl(extractedContext);
}
async function stopNode() {
  return stopNodeImpl(extractedContext);
}
async function resumeInterfaces() {
  return resumeInterfacesImpl(extractedContext);
}
async function resolveIdentity() {
  return resolveIdentityImpl(extractedContext);
}
async function ensureReticulum() {
  return ensureReticulumImpl(extractedContext);
}
async function ensureHostLxmfDelivery() {
  return ensureHostLxmfDeliveryImpl(extractedContext);
}
async function stopHostLxmfDelivery() {
  return stopHostLxmfDeliveryImpl(extractedContext);
}
async function startTcpInterface(targetHost, targetPort) {
  return startTcpInterfaceImpl(extractedContext, targetHost, targetPort);
}
async function startBleInterface() {
  return startBleInterfaceImpl(extractedContext);
}
async function startRnodeInterface() {
  return startRnodeInterfaceImpl(extractedContext);
}
async function applyInterfaceConfig() {
  return applyInterfaceConfigImpl(extractedContext);
}
async function handleHostMessage(raw) {
  return handleHostMessageImpl(extractedContext, raw);
}

let hostMessageBuffer = "";
let hostMessageQueue = Promise.resolve();
const HOST_REPLY_TYPES = new Set([
  "confirm-response",
  "launch-confirm",
  "install-confirm",
  "peer-chrome-response",
  "device-bridge-response",
  "media-codec-response",
  "media-opus-play-response",
  "media-opus-duplex-response",
]);

IPC.on("data", (data) => {
  hostMessageBuffer += data.toString();
  const lines = hostMessageBuffer.split("\n");
  hostMessageBuffer = lines.pop() ?? "";
  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    // Replies must not wait behind other host-message handlers: those handlers
    // often await requestHostReply, which would deadlock if the matching
    // device-bridge-response / peer-chrome-response sat on this queue.
    try {
      const parsed = JSON.parse(line);
      if (parsed && HOST_REPLY_TYPES.has(parsed.type)) {
        if (!hostReplyChannel.resolveReply(parsed)) {
          log(
            `Orphan host reply ${parsed.type} token=${typeof parsed.token === "string" ? parsed.token.slice(0, 12) : "?"}`,
          );
        }
        continue;
      }
    } catch {
      // Fall through to the ordered handler for malformed lines.
    }
    hostMessageQueue = hostMessageQueue
      .then(() => handleHostMessage(line))
      .catch((error) => {
        log(
          `Worklet error: ${error instanceof Error ? error.message : String(error)}`,
        );
        pushStatus();
      });
  }
});

void loadPersistedIdentity().then(() => loadCatalogState().then(pushCatalog));
pushStatus();
log(`Harness worklet ready (crypto: ${provider.name})`);
