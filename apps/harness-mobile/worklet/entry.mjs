/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import { bytesToHex } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { BareCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/bare.js";
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";

const { IPC } = BareKit;

function createProvider() {
  try {
    return new BareCryptoProvider();
  } catch {
    return new PureCryptoProvider();
  }
}

const provider = createProvider();
const runtime = bareRuntime({ storePath: "reticulum-store" });
const IDENTITY_STORE_KEY = "harness-identity";

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
  cryptoProvider: provider.name
};

/** @type {Reticulum | null} */
let reticulum = null;
/** @type {import("@twistedpear/reticulum-ts").TcpClientInterface | null} */
let tcpIface = null;
/** @type {ReturnType<typeof setInterval> | null} */
let statusTimer = null;
/** @type {Identity | null} */
let activeIdentity = null;
/** @type {{ targetHost: string; targetPort: number } | null} */
let pendingTarget = null;

function send(message) {
  IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

function log(line) {
  send({ type: "log", line });
}

function pushStatus() {
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

function updateIdentityStatus(identity) {
  activeIdentity = identity;
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
}

async function loadPersistedIdentity() {
  const stored = await runtime.store.get(IDENTITY_STORE_KEY);
  if (stored === undefined) {
    status.identityHash = null;
    status.identityPersisted = false;
    pushStatus();
    return null;
  }

  const identity = Identity.fromBytes(provider, stored);
  if (identity === null) {
    await runtime.store.delete(IDENTITY_STORE_KEY);
    status.identityHash = null;
    status.identityPersisted = false;
    pushStatus();
    return null;
  }

  updateIdentityStatus(identity);
  return identity;
}

async function persistIdentity(identity) {
  await runtime.store.set(IDENTITY_STORE_KEY, identity.getPrivateKey());
  updateIdentityStatus(identity);
}

async function createIdentity() {
  const identity = new Identity(provider);
  await persistIdentity(identity);
  log(`Created harness identity ${status.identityHash}`);
}

async function resetIdentity() {
  await runtime.store.delete(IDENTITY_STORE_KEY);
  activeIdentity = null;
  status.identityHash = null;
  status.identityPersisted = false;
  pushStatus();
  log("Harness identity cleared");
}

async function stopTcpInterface() {
  if (tcpIface !== null) {
    await tcpIface.close();
    tcpIface = null;
  }

  status.linkOnline = false;
}

async function stopNode() {
  stopStatusTimer();
  status.running = false;
  status.linkOnline = false;
  pushStatus();

  await stopTcpInterface();

  if (reticulum !== null) {
    reticulum.stop();
    reticulum = null;
  }
}

async function resolveIdentity() {
  if (activeIdentity !== null) {
    return activeIdentity;
  }

  const loaded = await loadPersistedIdentity();
  if (loaded !== null) {
    return loaded;
  }

  await createIdentity();
  return activeIdentity;
}

function registerAnnounceHandler() {
  if (reticulum === null) {
    return;
  }

  reticulum.registerAnnounceHandler({
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
}

async function ensureReticulum() {
  if (reticulum !== null) {
    return reticulum;
  }

  const identity = await resolveIdentity();
  if (identity === null) {
    throw new Error("Failed to resolve harness identity");
  }

  reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();
  status.running = true;
  registerAnnounceHandler();

  const inbound = reticulum.registerDestination({
    provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });
  inbound.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
  await inbound.announce();
  log("Announced harness identity");

  startStatusTimer();
  pushStatus();
  return reticulum;
}

async function startTcpInterface(targetHost, targetPort) {
  const node = await ensureReticulum();
  if (tcpIface !== null) {
    status.linkOnline = tcpIface.online;
    pushStatus();
    return;
  }

  log(`Starting TCP client to ${targetHost}:${targetPort}`);
  tcpIface = await node.addTcpClientInterface({
    name: "docker-peer",
    targetHost,
    targetPort
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    status.linkOnline = tcpIface.online;
    pushStatus();
    if (tcpIface.online) {
      log("TCP interface online");
      return;
    }

    await sleep(250);
  }

  log("Timed out waiting for TCP interface (peer may be unreachable)");
}

async function applyInterfaceConfig() {
  if (!status.tcpEnabled && !status.autoEnabled && !status.bleEnabled) {
    await stopNode();
    log("All interfaces disabled; node stopped");
    return;
  }

  if (status.autoEnabled) {
    log("AutoInterface requires M3 multicast native module (not wired yet)");
    status.autoEnabled = false;
  }

  if (status.bleEnabled) {
    log("BLE interface requires M5 ble-bridge native module (not wired yet)");
    status.bleEnabled = false;
  }

  pushStatus();

  if (status.tcpEnabled) {
    if (pendingTarget === null) {
      log("TCP enabled but no target host configured yet");
      return;
    }

    await startTcpInterface(pendingTarget.targetHost, pendingTarget.targetPort);
    return;
  }

  await stopTcpInterface();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleHostMessage(raw) {
  const line = raw.toString().trim();
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
    pendingTarget = { targetHost: message.targetHost, targetPort: message.targetPort };
    if (status.tcpEnabled) {
      await applyInterfaceConfig();
    } else {
      log(`Target set to ${message.targetHost}:${message.targetPort} (enable TCP to connect)`);
    }
    return;
  }

  if (message.type === "stop") {
    await stopNode();
    log("Worklet stopped");
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
    pushStatus();
    await applyInterfaceConfig();
    return;
  }
}

IPC.on("data", (data) => {
  handleHostMessage(data).catch((error) => {
    log(`Worklet error: ${error instanceof Error ? error.message : String(error)}`);
    pushStatus();
  });
});

void loadPersistedIdentity();
pushStatus();
log(`Harness worklet ready (crypto: ${provider.name})`);
