/* Concat part 2 of web-entry.mjs; assembled by build scripts. */
/** @type {null | ((input: { appId: string; peer: string; demand: any }) => Promise<{ quality?: () => any; close: () => Promise<void>; bytesSent?: number; sessionId?: string }>)>} */
let attachWebRtcMediaTrack = null;
async function ensurePeerSessionManager() {
  return ensurePeerSessionManagerImpl(extractedContext);
}
const peerSessionManagerProxy = {
  async request(appId, runtimeId, request) {
    return (await ensurePeerSessionManager()).request(
      appId,
      runtimeId,
      request,
    );
  },
  async listen(appId, runtimeId, request) {
    return (await ensurePeerSessionManager()).listen(appId, runtimeId, request);
  },
  async diagnostics() {
    return (await ensurePeerSessionManager()).diagnostics();
  },
  list(appId) {
    return peerSessionManager?.list(appId) ?? [];
  },
  route(appId, handle) {
    return peerSessionManager?.route(appId, handle);
  },
  info(appId, runtimeId, handle) {
    if (peerSessionManager === null) throw new Error("Unknown peer handle");
    return peerSessionManager.info(appId, runtimeId, handle);
  },
  async close(appId, runtimeId, handle) {
    if (peerSessionManager !== null)
      await peerSessionManager.close(appId, runtimeId, handle);
  },
  async closeRuntime(appId, runtimeId) {
    if (peerSessionManager !== null)
      await peerSessionManager.closeRuntime(appId, runtimeId);
  },
};

function identityOptions() {
  return {
    storeName: IDENTITY_STORE_NAME,
    passphrase: webConfig.identityPassphrase,
  };
}

function send(message) {
  postMessage({ channel: "ipc", data: `${JSON.stringify(message)}\n` });
}

function log(line) {
  send({ type: "log", line });
}

function pushStatus() {
  if (hostSession !== null) {
    const hostStatus = hostSession.getStatus();
    status.running = hostStatus.running;
    status.linkOnline = hostStatus.linkOnline;
    status.identityHash = hostStatus.identityHash;
    status.identityPersisted = hostStatus.identityPersisted;
    status.onlineInterfaces = hostStatus.onlineInterfaces;
    status.gatewayUrl = hostStatus.gatewayUrl;
  } else if (standaloneReticulum !== null) {
    status.running = true;
    status.onlineInterfaces = standaloneReticulum
      .listInterfaces()
      .filter((iface) => iface.online).length;
  }

  if (packageStorage !== null) {
    status.installedPackages = packageStorage.listInstalled().length;
    status.storageUsedBytes = packageStorage.getPackageUsedBytes();
  }

  send({ type: "status", status: { ...status } });
}

function createMiniappKvStore(dbName) {
  const ready = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (event) => {
      event.target.result.createObjectStore(KV_OBJECT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error(`Failed to open IndexedDB ${dbName}`));
  });

  async function withStore(mode, run) {
    const database = await ready;
    const transaction = database.transaction(KV_OBJECT_STORE, mode);
    const store = transaction.objectStore(KV_OBJECT_STORE);
    return new Promise((resolve, reject) => {
      const request = run(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB request failed"));
    });
  }

  return {
    async get(key) {
      const value = await withStore("readonly", (store) => store.get(key));
      if (value === undefined) {
        return null;
      }

      return value instanceof Uint8Array
        ? Uint8Array.from(value)
        : new Uint8Array(value);
    },
    async set(key, value) {
      await withStore("readwrite", (store) =>
        store.put(Uint8Array.from(value), key),
      );
    },
    async delete(key) {
      await withStore("readwrite", (store) => store.delete(key));
    },
    async list(prefix) {
      const keys = await withStore("readonly", (store) => store.getAllKeys());
      return keys.filter(
        (key) => typeof key === "string" && key.startsWith(prefix),
      );
    },
  };
}

function ensureMiniappKvStore() {
  if (miniappKvStore === null) {
    miniappKvStore = createMiniappKvStore(MINIAPP_KV_STORE_NAME);
  }

  return miniappKvStore;
}

async function loadHyperFetch() {
  if (hyperFetchModule === null) {
    const hyperFetchUrl = new URL("./web-hyper-fetch.js", import.meta.url).href;
    hyperFetchModule = import(hyperFetchUrl);
  }

  return hyperFetchModule;
}

function emitHostMessage(message) {
  send(message);
}

async function ensureReticulumForInterfaces() {
  if (hostSession !== null) {
    return hostSession.reticulum;
  }

  if (standaloneReticulum === null) {
    standaloneReticulum = Reticulum.create({
      provider: cryptoProvider,
      runtime: webRuntime(identityOptions()),
      bandwidthBytesPerSecond: HOST_BANDWIDTH_BYTES_PER_SECOND,
    });
    standaloneReticulum.start();
    status.running = true;
    startStatusTimer();
  }

  return standaloneReticulum;
}

async function stopStandaloneReticulumIfIdle() {
  if (hostSession !== null || standaloneReticulum === null) {
    return;
  }

  if (!status.rnodeEnabled) {
    await standaloneReticulum.stop();
    standaloneReticulum = null;
    status.running = false;
    stopStatusTimer();
    pushStatus();
  }
}

async function stopRnodeInterface() {
  if (rnodeIface !== null) {
    const reticulum = hostSession?.reticulum ?? standaloneReticulum;
    if (reticulum !== null && reticulum !== undefined) {
      try {
        reticulum.unregisterInterface(rnodeIface);
      } catch {
        // Interface may already be unregistered.
      }
    }

    await rnodeIface.close();
    rnodeIface = null;
  }

  if (serialBridge !== null) {
    await serialBridge.close();
    serialBridge = null;
  }

  status.rnodeConnected = false;
  status.rnodeDeviceName = null;
  await stopStandaloneReticulumIfIdle();
  pushStatus();
}

async function startRnodeInterface() {
  const reticulum = await ensureReticulumForInterfaces();

  if (rnodeIface !== null) {
    status.rnodeConnected = serialBridge?.connected ?? false;
    pushStatus();
    return;
  }

  log("Starting RNode interface over Web Serial");
  serialBridge = createWebSerialPipe(emitHostMessage, pendingRnodeBaudRate);
  rnodeIface = await RNodeInterface.open(cryptoProvider, {
    name: "web-rnode",
    provider: cryptoProvider,
    pipe: serialBridge,
  });
  reticulum.registerInterface(rnodeIface);

  status.rnodeConnected = serialBridge.connected;
  status.rnodeDeviceName = status.rnodeConnected ? "webserial" : null;
  if (rnodeIface.online) {
    log(
      `RNode interface online (firmware: ${rnodeIface.rnodeStatus.firmwareVersion ?? "unknown"})`,
    );
  } else {
    log("RNode interface started; waiting for Web Serial connection from host");
  }

  pushStatus();
}

async function applyInterfaceConfig() {
  if (status.rnodeEnabled) {
    await startRnodeInterface();
  } else {
    await stopRnodeInterface();
  }
}

function handleSerialHostMessage(message) {
  if (serialBridge === null) {
    return;
  }

  serialBridge.handleHostMessage(message);
  if (message.type === "serial-connect") {
    status.rnodeConnected = true;
    status.rnodeDeviceName = message.deviceName;
    log(`RNode Web Serial connected (${message.deviceName})`);
    pushStatus();
    return;
  }

  if (message.type === "serial-disconnect") {
    status.rnodeConnected = false;
    status.rnodeDeviceName = null;
    log("RNode Web Serial disconnected");
    pushStatus();
    return;
  }

  if (message.type === "serial-error") {
    log(`RNode Web Serial error: ${message.message}`);
  }
}

function ensurePublishService() {
  if (publishService === null) {
    publishService = createWebPublishService({
      provider: cryptoProvider,
      log,
      onCasLocator(locator) {
        ensureInstallService().ingestCasLocatorAppData(
          bytesToHex(encodeCasLocator(locator)),
        );
      },
    });
  }

  return publishService;
}

/** When true, ai.chat returns a fixed assistant reply (Playwright Handbook CI). */
let mockAiChat = false;
/** When true, apps.publish succeeds from local CAS without a live gateway (Handbook CI). */
let mockLocalPublish = false;
function ensureMiniappHost() {
  return ensureMiniappHostImpl(extractedContext);
}

const transportAnnounceService = createMiniappAnnounceService({
  provider: cryptoProvider,
  bytesToHex,
  DestinationDirection,
  DestinationType,
  getNode: () => ensureReticulumForInterfaces(),
  getIdentity: () => loadOrCreateWebIdentity(cryptoProvider, identityOptions()),
  copyAppData: true,
});
function ensureInstallService() {
  return ensureInstallServiceImpl(extractedContext);
}

async function pushInstalledList() {
  const storage = await ensurePackageStorage();
  send({
    type: "installed",
    packages: storage.listInstalled().map((record) => ({
      appId: record.appId,
      version: record.version,
      activeVersion: storage.activeVersion(record.appId) ?? record.version,
      packageHash: record.packageHash,
      installedAt: record.installedAt,
      rollbackAvailable: false,
      capabilities: record.manifest.capabilities,
      publisherPublicKey: record.manifest.publisherPublicKey,
    })),
  });
  pushStatus();
}

async function ensurePackageStorage() {
  if (packageStorage !== null) {
    return packageStorage;
  }

  packageStorage = await createWebPackageStorage({
    dbName: PACKAGE_STORE_NAME,
    hostApiVersion: HOST_API_VERSION,
  });
  await packageStorage.requestPersistence();
  status.installedPackages = packageStorage.listInstalled().length;
  return packageStorage;
}

async function refreshStorageStatus() {
  const storage = await ensurePackageStorage();
  const quota = await storage.getQuotaInfo();
  status.installedPackages = storage.listInstalled().length;
  status.storageUsedBytes = quota.packageUsedBytes;
  pushStatus();
  return quota;
}

async function stopHostSession() {
  if (hostLxmfDelivery !== null) {
    await hostLxmfDelivery.stop();
    hostLxmfDelivery = null;
  }
  if (hostSession !== null) {
    await hostSession.stop();
    hostSession = null;
  }

  status.linkOnline = false;
  status.wsEnabled = false;
  status.tcpEnabled = false;
  if (standaloneReticulum === null && !status.rnodeEnabled) {
    stopStatusTimer();
    status.running = false;
    status.onlineInterfaces = 0;
  }
  pushStatus();
}
async function startHostSession() {
  return startHostSessionImpl(extractedContext);
}

async function refreshIdentityStatus() {
  if (!(await hasWebIdentity(identityOptions()))) {
    status.identityHash = null;
    status.identityPersisted = false;
    pushStatus();
    return;
  }

  const identity = await loadOrCreateWebIdentity(
    cryptoProvider,
    identityOptions(),
  );
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
}

async function createIdentity() {
  await resetWebIdentity(identityOptions());
  const identity = new Identity(cryptoProvider);
  await persistWebIdentity(identity, identityOptions());
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
  log(`Created web identity ${status.identityHash}`);
}

async function importIdentity(privateKeyHex) {
  const identity = Identity.fromBytes(
    cryptoProvider,
    hexToBytes(privateKeyHex),
  );
  if (identity === null) {
    throw new Error("Invalid identity private key");
  }

  await resetWebIdentity(identityOptions());
  await persistWebIdentity(identity, identityOptions());
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
  log(`Imported web identity ${status.identityHash}`);
}

async function resetIdentity() {
  await resetWebIdentity(identityOptions());
  await stopHostSession();
  status.identityHash = null;
  status.identityPersisted = false;
  pushStatus();
  log("Web identity cleared");
}

function handleSandboxHostMessage(message) {
  const controller = ensureMiniappHost().sandboxController;
  if (message.type === "sandbox-spawned") {
    controller.handleSpawned(message.requestId, message.instanceId);
    return;
  }

  if (message.type === "sandbox-spawn-failed") {
    controller.handleSpawnFailed(message.requestId, message.message);
    return;
  }

  if (message.type === "sandbox-ping-result") {
    controller.handlePingResult(message.requestId, message.alive);
    return;
  }

  if (message.type === "sandbox-broker-request") {
    controller.handleBrokerRequest(
      message.requestId,
      message.instanceId,
      reviveJsonWireValue(message.request),
    );
  }
}
async function handleHostMessage(raw) {
  return handleHostMessageImpl(extractedContext, raw);
}

self.onmessage = (event) => {
  if (event.data?.channel !== "host-ipc") {
    return;
  }

  const payload = event.data.data;
  const text =
    typeof payload === "string" ? payload : new TextDecoder().decode(payload);
  handleHostMessage(text).catch((error) => {
    log(
      `Web worker error: ${error instanceof Error ? error.message : String(error)}`,
    );
    pushStatus();
  });
};

pushStatus();
refreshStorageStatus().catch((error) => {
  log(
    `Web package storage unavailable: ${error instanceof Error ? error.message : String(error)}`,
  );
});
log(
  "Web core worker ready (Phase W4 WebSerial RNode + Hyperdrive-over-relay install)",
);
