import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { createPrivateKey, createPublicKey, randomBytes } from "node:crypto";
import { connect } from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { assert, runMain, section, step } from "../lib/index.mjs";

const smoke = process.argv.includes("--smoke");
const keepState = process.env.FREENET_KEEP_LOCAL_STATE === "1";
const binary =
  process.env.FREENET_BINARY ??
  (existsSync("/Applications/Freenet.app/Contents/MacOS/freenet-bin")
    ? "/Applications/Freenet.app/Contents/MacOS/freenet-bin"
    : "freenet");
const wsPorts = [
  Number(process.env.FREENET_GATEWAY_WS_PORT ?? 17609),
  Number(process.env.FREENET_PUBLISHER_WS_PORT ?? 17610),
  Number(process.env.FREENET_SUBSCRIBER_WS_PORT ?? 17611)
];
const networkPorts = [
  Number(process.env.FREENET_GATEWAY_NETWORK_PORT ?? 31438),
  Number(process.env.FREENET_PUBLISHER_NETWORK_PORT ?? 31439),
  Number(process.env.FREENET_SUBSCRIBER_NETWORK_PORT ?? 31440)
];
const settleMs = Number(process.env.FREENET_TOPOLOGY_SETTLE_MS ?? 5000);

for (const port of [...wsPorts, ...networkPorts]) {
  assert(
    Number.isSafeInteger(port) && port >= 1 && port <= 65535,
    `Invalid Freenet local topology port: ${port}`
  );
}
assert(
  Number.isSafeInteger(settleMs) && settleMs >= 0 && settleMs <= 120_000,
  "FREENET_TOPOLOGY_SETTLE_MS must be from 0 through 120000"
);

const root = mkdtempSync(join(tmpdir(), "twistedpear-freenet-s2-"));
const children = [];
const tails = new Map();

function x25519PublicKey(secret) {
  const pkcs8Prefix = Buffer.from("302e020100300506032b656e04220420", "hex");
  const privateKey = createPrivateKey({
    key: Buffer.concat([pkcs8Prefix, secret]),
    format: "der",
    type: "pkcs8"
  });
  const publicDer = createPublicKey(privateKey).export({
    format: "der",
    type: "spki"
  });
  return Buffer.from(publicDer).subarray(-32);
}

function appendTail(name, chunk) {
  const lines = `${tails.get(name) ?? ""}${chunk}`.split("\n");
  tails.set(name, lines.slice(-80).join("\n"));
}

function nodeArgs(index, gatewayPublicKey) {
  const name = ["gateway", "publisher", "subscriber"][index];
  const nodeRoot = join(root, name);
  const configDir = join(nodeRoot, "config");
  const dataDir = join(nodeRoot, "data");
  const logsDir = join(nodeRoot, "logs");
  for (const directory of [configDir, dataDir, logsDir]) {
    mkdirSync(directory, { recursive: true });
  }
  const args = [
    "network",
    "--ws-api-address",
    "127.0.0.1",
    "--ws-api-port",
    String(wsPorts[index]),
    "--public-network-address",
    "127.0.0.1",
    "--public-network-port",
    String(networkPorts[index]),
    "--skip-load-from-network",
    "--min-number-of-connections",
    "2",
    "--max-number-of-connections",
    "4",
    "--config-dir",
    configDir,
    "--data-dir",
    dataDir,
    "--log-dir",
    logsDir,
    "--log-level",
    "info",
    "--disable-auto-update"
  ];
  if (index === 0) {
    args.push("--is-gateway");
  } else {
    args.push(
      "--gateway",
      `127.0.0.1:${networkPorts[0]},${gatewayPublicKey.toString("hex")}`
    );
  }
  return args;
}

function startNode(name, args) {
  const child = spawn(binary, args, {
    env: { ...process.env, FREENET_TELEMETRY_ENABLED: "false" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => appendTail(name, chunk));
  child.stderr.on("data", (chunk) => appendTail(name, chunk));
  children.push({ name, child });
  return child;
}

function waitForPort(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = connect({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for 127.0.0.1:${port}`));
        } else {
          setTimeout(attempt, 200);
        }
      });
    };
    attempt();
  });
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function stopNodes() {
  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGINT");
  }
  await Promise.all(children.map(({ child }) => waitForExit(child, 5000)));
  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
  await Promise.all(children.map(({ child }) => waitForExit(child, 1000)));
}

function measurementEnvironment() {
  return {
    ...process.env,
    FREENET_NODE_URL: `ws://127.0.0.1:${wsPorts[1]}/v1/contract/command`,
    FREENET_SUBSCRIBER_NODE_URL:
      `ws://127.0.0.1:${wsPorts[2]}/v1/contract/command`,
    FREENET_MEASUREMENT_LABEL: "local-3-node",
    ...(smoke
      ? { FREENET_SAMPLE_COUNT: "1", FREENET_ALLOW_INCOMPLETE: "1" }
      : {})
  };
}

async function main() {
  section("Freenet S2 isolated topology");
  const secret = randomBytes(32);
  const secretPath = join(root, "gateway-x25519-secret");
  writeFileSync(secretPath, `${secret.toString("hex")}\n`);
  chmodSync(secretPath, 0o600);
  const publicKey = x25519PublicKey(secret);

  const gatewayArgs = nodeArgs(0, publicKey);
  gatewayArgs.push("--transport-keypair", secretPath);
  step(`starting gateway on ws://127.0.0.1:${wsPorts[0]}`);
  startNode("gateway", gatewayArgs);
  await waitForPort(wsPorts[0]);
  step(`starting publisher on ws://127.0.0.1:${wsPorts[1]}`);
  startNode("publisher", nodeArgs(1, publicKey));
  step(`starting subscriber on ws://127.0.0.1:${wsPorts[2]}`);
  startNode("subscriber", nodeArgs(2, publicKey));
  await Promise.all([waitForPort(wsPorts[1]), waitForPort(wsPorts[2])]);
  await new Promise((resolve) => setTimeout(resolve, settleMs));

  section(smoke ? "Incomplete one-sample diagnostic" : "100-sample gate run");
  const measurement = spawn(
    process.execPath,
    [join(import.meta.dirname, "measure-roundtrip.mjs")],
    { env: measurementEnvironment(), stdio: "inherit" }
  );
  const exitCode = await new Promise((resolve, reject) => {
    measurement.once("error", reject);
    measurement.once("exit", (code, signal) => {
      if (signal !== null) reject(new Error(`Measurement exited via ${signal}`));
      else resolve(code ?? 1);
    });
  });
  if (exitCode !== 0) {
    throw new Error(`S2 measurement exited with status ${exitCode}`);
  }
}

await runMain(async () => {
  try {
    await main();
  } catch (error) {
    for (const { name } of children) {
      console.error(`\n--- ${name} tail ---\n${tails.get(name) ?? "(no output)"}`);
    }
    throw error;
  } finally {
    await stopNodes();
    if (keepState) {
      console.error(`Preserved Freenet S2 state at ${root}`);
    } else {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
