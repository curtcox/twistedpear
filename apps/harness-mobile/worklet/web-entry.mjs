/**
 * Browser core Web Worker (Phase W1). Leaf peer via createWebLeafHost + WS gateway.
 * Uses the same newline-delimited JSON IPC protocol as the Bare worklet.
 */

import { createWebLeafHost } from "../../../packages/host-core/dist/web.js";
import {
  Identity,
  PureCryptoProvider,
  bytesToHex,
  hasWebIdentity,
  loadOrCreateWebIdentity,
  persistWebIdentity,
  resetWebIdentity
} from "../../../packages/reticulum-ts/dist/web.js";

const IDENTITY_STORE_NAME = "twistedpear-harness-web-identity";
const DEFAULT_PASSPHRASE = "harness-web-dev";

/** @type {import("./protocol.ts").WorkletStatus} */
const status = {
  running: false,
  linkOnline: false,
  announcesSeen: 0,
  identityHash: null,
  identityPersisted: false,
  tcpEnabled: false,
  autoEnabled: false,
  bleEnabled: false,
  bleConnected: false,
  rnodeEnabled: false,
  rnodeConnected: false,
  rnodeDeviceName: null,
  cryptoProvider: "pure",
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  developerMode: false,
  miniappRunning: false,
  wsEnabled: false,
  gatewayUrl: null
};

/** @type {{ gatewayUrl: string; sharedToken?: string; identityPassphrase: string }} */
let webConfig = {
  gatewayUrl: "",
  identityPassphrase: DEFAULT_PASSPHRASE
};

/** @type {Awaited<ReturnType<typeof createWebLeafHost>> | null} */
let hostSession = null;
/** @type {ReturnType<typeof setInterval> | null} */
let statusTimer = null;

function identityOptions() {
  return {
    storeName: IDENTITY_STORE_NAME,
    passphrase: webConfig.identityPassphrase
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
  }

  send({ type: "status", status: { ...status } });
}

function startStatusTimer() {
  if (statusTimer !== null) {
    return;
  }

  statusTimer = setInterval(pushStatus, 1_000);
}

function stopStatusTimer() {
  if (statusTimer === null) {
    return;
  }

  clearInterval(statusTimer);
  statusTimer = null;
}

async function stopHostSession() {
  stopStatusTimer();
  if (hostSession !== null) {
    await hostSession.stop();
    hostSession = null;
  }

  status.running = false;
  status.linkOnline = false;
  status.onlineInterfaces = 0;
  status.wsEnabled = false;
  status.tcpEnabled = false;
  pushStatus();
}

async function startHostSession() {
  if (webConfig.gatewayUrl.length === 0) {
    log("Web gateway URL is not configured");
    return;
  }

  if (hostSession !== null) {
    pushStatus();
    return;
  }

  hostSession = await createWebLeafHost({
    gatewayUrl: webConfig.gatewayUrl,
    ...(webConfig.sharedToken === undefined ? {} : { sharedToken: webConfig.sharedToken }),
    identity: identityOptions()
  });

  hostSession.reticulum.registerAnnounceHandler({
    receivedAnnounce(info) {
      status.announcesSeen += 1;
      pushStatus();
      send({
        type: "announce",
        entry: {
          destinationHash: bytesToHex(info.destinationHash),
          hops: info.packet.hops,
          receivedAt: Date.now(),
          appDataHex: info.appData === null ? null : bytesToHex(info.appData)
        }
      });
    }
  });

  status.wsEnabled = true;
  status.tcpEnabled = true;
  status.running = true;
  startStatusTimer();
  pushStatus();
  log(`Web leaf host connected to ${webConfig.gatewayUrl}`);
}

async function refreshIdentityStatus() {
  const provider = new PureCryptoProvider();
  if (!(await hasWebIdentity(identityOptions()))) {
    status.identityHash = null;
    status.identityPersisted = false;
    pushStatus();
    return;
  }

  const identity = await loadOrCreateWebIdentity(provider, identityOptions());
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
}

async function createIdentity() {
  const provider = new PureCryptoProvider();
  await resetWebIdentity(identityOptions());
  const identity = new Identity(provider);
  await persistWebIdentity(identity, identityOptions());
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
  log(`Created web identity ${status.identityHash}`);
}

async function resetIdentity() {
  await resetWebIdentity(identityOptions());
  await stopHostSession();
  status.identityHash = null;
  status.identityPersisted = false;
  pushStatus();
  log("Web identity cleared");
}

async function handleHostMessage(raw) {
  const line = raw.trim();
  if (line.length === 0) {
    return;
  }

  let message;
  try {
    message = JSON.parse(line);
  } catch {
    log(`Ignored host message: ${line}`);
    return;
  }

  if (message.type === "start") {
    if (message.gatewayUrl !== undefined) {
      webConfig = {
        gatewayUrl: message.gatewayUrl,
        identityPassphrase: message.identityPassphrase ?? DEFAULT_PASSPHRASE,
        ...(message.sharedToken === undefined ? {} : { sharedToken: message.sharedToken })
      };
      status.gatewayUrl = message.gatewayUrl;
    }

    await refreshIdentityStatus();
    if (status.tcpEnabled || status.wsEnabled) {
      await startHostSession();
    } else {
      log(`Gateway configured (${webConfig.gatewayUrl || "unset"}); enable WS gateway to connect`);
    }
    return;
  }

  if (message.type === "stop") {
    await stopHostSession();
    log("Web core worker stopped");
    return;
  }

  if (message.type === "create-identity") {
    await createIdentity();
    return;
  }

  if (message.type === "reset-identity") {
    await resetIdentity();
    return;
  }

  if (message.type === "set-interfaces") {
    status.tcpEnabled = message.tcp;
    status.autoEnabled = message.auto;
    status.bleEnabled = message.ble;
    status.rnodeEnabled = message.rnode;
    pushStatus();

    if (message.tcp) {
      await startHostSession();
      return;
    }

    await stopHostSession();
    log("WS gateway disabled");
    return;
  }

  if (message.type === "list-catalog" || message.type === "list-installed") {
    send({ type: "catalog", entries: [] });
    send({ type: "installed", packages: [] });
    return;
  }

  log(`Web worker: unsupported message ${message.type} (Phase W2)`);
}

self.onmessage = (event) => {
  if (event.data?.channel !== "host-ipc") {
    return;
  }

  const payload = event.data.data;
  const text = typeof payload === "string" ? payload : new TextDecoder().decode(payload);
  handleHostMessage(text).catch((error) => {
    log(`Web worker error: ${error instanceof Error ? error.message : String(error)}`);
    pushStatus();
  });
};

pushStatus();
log("Web core worker ready");
