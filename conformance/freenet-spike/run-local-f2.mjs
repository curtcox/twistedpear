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

const keepState = process.env.FREENET_KEEP_LOCAL_STATE === "1";
const binary =
  process.env.FREENET_BINARY ??
  (existsSync("/Applications/Freenet.app/Contents/MacOS/freenet-bin")
    ? "/Applications/Freenet.app/Contents/MacOS/freenet-bin"
    : "freenet");
const wsPort = Number(process.env.FREENET_F2_WS_PORT ?? 17629);
const networkPort = Number(process.env.FREENET_F2_NETWORK_PORT ?? 31458);

assert(
  Number.isSafeInteger(wsPort) && wsPort >= 1 && wsPort <= 65535,
  `Invalid Freenet F2 ws port: ${wsPort}`
);
assert(
  Number.isSafeInteger(networkPort) && networkPort >= 1 && networkPort <= 65535,
  `Invalid Freenet F2 network port: ${networkPort}`
);

const root = mkdtempSync(join(tmpdir(), "twistedpear-freenet-f2-"));
const homeRoot = join(root, "home");
const children = [];
const tails = new Map();

function isolateHome() {
  const support = join(
    homeRoot,
    "Library",
    "Application Support",
    "The-Freenet-Project-Inc.Freenet"
  );
  mkdirSync(support, { recursive: true });
  writeFileSync(join(support, "gateways.toml"), "gateways = []\n");
}

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

function startGateway(secretPath) {
  const nodeRoot = join(root, "gateway");
  for (const directory of ["config", "data", "logs"].map((name) =>
    join(nodeRoot, name)
  )) {
    mkdirSync(directory, { recursive: true });
  }
  const args = [
    "network",
    "--ws-api-address",
    "127.0.0.1",
    "--ws-api-port",
    String(wsPort),
    "--network-address",
    "127.0.0.1",
    "--network-port",
    String(networkPort),
    "--public-network-address",
    "127.0.0.1",
    "--public-network-port",
    String(networkPort),
    "--skip-load-from-network",
    "--is-gateway",
    "--transport-keypair",
    secretPath,
    "--min-number-of-connections",
    "0",
    "--max-number-of-connections",
    "2",
    "--config-dir",
    join(nodeRoot, "config"),
    "--data-dir",
    join(nodeRoot, "data"),
    "--log-dir",
    join(nodeRoot, "logs"),
    "--log-level",
    "info",
    "--disable-auto-update"
  ];
  const child = spawn(binary, args, {
    env: {
      ...process.env,
      HOME: homeRoot,
      FREENET_TELEMETRY_ENABLED: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => appendTail("gateway", chunk));
  child.stderr.on("data", (chunk) => appendTail("gateway", chunk));
  children.push({ name: "gateway", child });
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

async function main() {
  section("Freenet F2 isolated single-node interface proof");
  isolateHome();
  const secret = randomBytes(32);
  const secretPath = join(root, "gateway-x25519-secret");
  writeFileSync(secretPath, `${secret.toString("hex")}\n`);
  chmodSync(secretPath, 0o600);
  x25519PublicKey(secret);

  step(`starting gateway on ws://127.0.0.1:${wsPort}`);
  startGateway(secretPath);
  await waitForPort(wsPort);

  section("FreenetInterface HDLC packet exchange");
  const proof = spawn(
    process.execPath,
    [join(import.meta.dirname, "prove-f2-interface.mjs")],
    {
      env: {
        ...process.env,
        FREENET_NODE_URL: `ws://127.0.0.1:${wsPort}/v1/contract/command`,
        FREENET_F2_LABEL: "local-isolated"
      },
      stdio: "inherit"
    }
  );
  const exitCode = await new Promise((resolve, reject) => {
    proof.once("error", reject);
    proof.once("exit", (code, signal) => {
      if (signal !== null) reject(new Error(`F2 proof exited via ${signal}`));
      else resolve(code ?? 1);
    });
  });
  if (exitCode !== 0) {
    throw new Error(`F2 proof exited with status ${exitCode}`);
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
      console.error(`Preserved Freenet F2 state at ${root}`);
    } else {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
