/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";

const { IPC } = BareKit;

const provider = new PureCryptoProvider();
const runtime = bareRuntime({ storePath: "reticulum-store" });

/** @type {import("./protocol.ts").WorkletStatus} */
const status = {
  running: false,
  linkOnline: false,
  announcesSeen: 0
};

/** @type {Reticulum | null} */
let reticulum = null;
/** @type {import("@twistedpear/reticulum-ts").TcpClientInterface | null} */
let iface = null;
/** @type {ReturnType<typeof setInterval> | null} */
let statusTimer = null;

const ALICE_PRIVATE_KEY_HEX =
  "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f40";

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

async function stopNode() {
  stopStatusTimer();
  status.running = false;
  status.linkOnline = false;
  pushStatus();

  if (iface !== null) {
    await iface.close();
    iface = null;
  }

  if (reticulum !== null) {
    reticulum.stop();
    reticulum = null;
  }
}

async function startNode(targetHost, targetPort) {
  await stopNode();

  log(`Starting Reticulum node (target ${targetHost}:${targetPort})`);
  reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();
  status.running = true;
  pushStatus();

  iface = await reticulum.addTcpClientInterface({
    name: "docker-peer",
    targetHost,
    targetPort
  });

  const identity = Identity.fromBytes(provider, hexToBytes(ALICE_PRIVATE_KEY_HEX));
  if (identity === null) {
    throw new Error("Failed to load harness identity");
  }

  const inbound = reticulum.registerDestination({
    provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });
  inbound.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  reticulum.registerAnnounceHandler(() => {
    status.announcesSeen += 1;
    pushStatus();
  });

  await inbound.announce();
  log("Announced harness identity; waiting for docker peer path");

  startStatusTimer();

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    status.linkOnline = iface.online;
    pushStatus();
    if (iface.online) {
      log("TCP interface online");
      return;
    }

    await sleep(250);
  }

  log("Timed out waiting for TCP interface (peer may be unreachable)");
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
    await startNode(message.targetHost, message.targetPort);
    return;
  }

  if (message.type === "stop") {
    await stopNode();
    log("Worklet stopped");
    return;
  }
}

IPC.on("data", (data) => {
  handleHostMessage(data).catch((error) => {
    log(`Worklet error: ${error instanceof Error ? error.message : String(error)}`);
    pushStatus();
  });
});

pushStatus();
log("Harness worklet ready");
