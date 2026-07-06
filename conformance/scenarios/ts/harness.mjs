import { execSync, spawn } from "node:child_process";
import { connect } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const INTEROP_ENABLED = process.env.INTEROP === "1";

export const LEAF_ECHO_PORT = Number.parseInt(process.env.LEAF_ECHO_PORT ?? "4242", 10);
export const LXMF_ECHO_PORT = Number.parseInt(process.env.LXMF_ECHO_PORT ?? "4243", 10);
export const LINK_ECHO_PORT = Number.parseInt(process.env.LINK_ECHO_PORT ?? "4244", 10);

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const COMPOSE_FILE = join(REPO_ROOT, "conformance/docker/docker-compose.yml");

export function dockerAvailable() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function interopReady() {
  return INTEROP_ENABLED && dockerAvailable();
}

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForTcp(host, port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const socket = connect({ host, port }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
        socket.setTimeout(1000);
      });
      return;
    } catch {
      await sleep(250);
    }
  }

  throw new Error(`Timed out waiting for ${host}:${port}`);
}

export function composeUp(service) {
  execSync(`docker compose -f "${COMPOSE_FILE}" up -d --build ${service}`, {
    stdio: "inherit",
    cwd: REPO_ROOT
  });
}

export function composeDown() {
  execSync(`docker compose -f "${COMPOSE_FILE}" down`, {
    stdio: "inherit",
    cwd: REPO_ROOT
  });
}

export function composeLogs(service, tail = 50) {
  return execSync(`docker compose -f "${COMPOSE_FILE}" logs --tail=${tail} ${service}`, {
    encoding: "utf8",
    cwd: REPO_ROOT
  });
}

export async function waitForReadyLine(service, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const logs = composeLogs(service, 20);
    const match = logs.match(/READY ([0-9a-f]+)/i);
    if (match?.[1] !== undefined) {
      return match[1];
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for READY line from ${service}. Logs:\n${composeLogs(service, 100)}`);
}

export async function withComposeService(service, port, run) {
  composeUp(service);
  try {
    await waitForTcp("127.0.0.1", port);
    return await run();
  } finally {
    composeDown();
  }
}

export function spawnComposeService(service) {
  return spawn("docker", ["compose", "-f", COMPOSE_FILE, "up", "--build", service], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"]
  });
}
