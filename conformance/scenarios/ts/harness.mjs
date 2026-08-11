import { execSync, spawn } from "node:child_process";
import { connect } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const INTEROP_ENABLED = process.env.INTEROP === "1";

export const LEAF_ECHO_PORT = Number.parseInt(
  process.env.LEAF_ECHO_PORT ?? "4242",
  10,
);
export const LXMF_ECHO_PORT = Number.parseInt(
  process.env.LXMF_ECHO_PORT ?? "4243",
  10,
);
export const LINK_ECHO_PORT = Number.parseInt(
  process.env.LINK_ECHO_PORT ?? "4244",
  10,
);
export const PROPAGATION_LXMD_PORT = Number.parseInt(
  process.env.PROPAGATION_LXMD_PORT ?? "4245",
  10,
);
export const UDP_TS_PORT = Number.parseInt(
  process.env.UDP_TS_PORT ?? "4246",
  10,
);
export const UDP_ECHO_PORT = Number.parseInt(
  process.env.UDP_ECHO_PORT ?? "4247",
  10,
);
export const RESOURCE_ECHO_PORT = Number.parseInt(
  process.env.RESOURCE_ECHO_PORT ?? "4248",
  10,
);
export const PROPAGATION_TS_PORT = Number.parseInt(
  process.env.PROPAGATION_TS_PORT ?? "4249",
  10,
);
export const TRANSPORT_HUB_PORT = Number.parseInt(
  process.env.TRANSPORT_HUB_PORT ?? "4250",
  10,
);

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const COMPOSE_FILE = join(
  REPO_ROOT,
  "conformance/docker/docker-compose.yml",
);

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
    if (await isTcpReady(host, port)) {
      return;
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for ${host}:${port}`);
}

async function isTcpReady(host, port) {
  try {
    await new Promise((resolve, reject) => {
      const socket = connect({ host, port }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", reject);
      socket.setTimeout(1000);
    });
    return true;
  } catch {
    return false;
  }
}

export function composeUp(...services) {
  if (
    services.length === 0 ||
    services.some((service) => !/^[a-z0-9-]+$/.test(service))
  ) {
    throw new Error("composeUp requires one or more valid service names");
  }

  execSync(
    `docker compose -f "${COMPOSE_FILE}" up -d --build ${services.join(" ")}`,
    {
      stdio: "inherit",
      cwd: REPO_ROOT,
      timeout: 180_000,
    },
  );
}

export function tryComposeUp(service) {
  try {
    composeUp(service);
    return true;
  } catch {
    return false;
  }
}

export function composeDown(...services) {
  if (services.length === 0) {
    execSync(`docker compose -f "${COMPOSE_FILE}" down`, {
      stdio: "inherit",
      cwd: REPO_ROOT,
    });
    return;
  }

  if (services.some((service) => !/^[a-z0-9-]+$/.test(service))) {
    throw new Error("composeDown requires valid service names");
  }

  execSync(`docker compose -f "${COMPOSE_FILE}" stop ${services.join(" ")}`, {
    stdio: "inherit",
    cwd: REPO_ROOT,
  });
  execSync(`docker compose -f "${COMPOSE_FILE}" rm -f ${services.join(" ")}`, {
    stdio: "inherit",
    cwd: REPO_ROOT,
  });
}

export function composePause(service) {
  execSync(`docker compose -f "${COMPOSE_FILE}" pause ${service}`, {
    stdio: "inherit",
    cwd: REPO_ROOT,
  });
}

export function composeUnpause(service) {
  execSync(`docker compose -f "${COMPOSE_FILE}" unpause ${service}`, {
    stdio: "inherit",
    cwd: REPO_ROOT,
  });
}

export function composeLogs(service, tail = 50) {
  return execSync(
    `docker compose -f "${COMPOSE_FILE}" logs --tail=${tail} ${service}`,
    {
      encoding: "utf8",
      cwd: REPO_ROOT,
    },
  );
}

export async function waitForReadyLine(service, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const logs = composeLogs(service, 20);
      const match = logs.match(/READY ([0-9a-f]+)/i);
      if (match?.[1] !== undefined) {
        return match[1];
      }
      lastError = null;
    } catch (error) {
      lastError = error;
    }

    await sleep(500);
  }

  let logs;
  try {
    logs = composeLogs(service, 100);
  } catch (error) {
    logs = `(compose logs unavailable: ${error instanceof Error ? error.message : String(error)})`;
  }
  const suffix =
    lastError instanceof Error ? `\nLast poll error: ${lastError.message}` : "";
  throw new Error(
    `Timed out waiting for READY line from ${service}. Logs:\n${logs}${suffix}`,
  );
}

export async function withComposeService(service, port, run) {
  const startedCompose = tryComposeUp(service);
  const udpOnly = service === "udp-echo";
  if (!startedCompose && (udpOnly || !(await isTcpReady("127.0.0.1", port)))) {
    throw new Error(
      `Failed to start ${service} and no peer is listening on 127.0.0.1:${port}`,
    );
  }

  // Prefer READY over bare TCP accept: peers often bind before RNS/LXMF is live,
  // and a premature client connect can reset mid-announce.
  if (
    udpOnly ||
    service === "lxmf-echo" ||
    service === "leaf-echo" ||
    service === "link-echo" ||
    service === "propagation-lxmd"
  ) {
    await waitForReadyLine(service);
  }
  if (!udpOnly) {
    await waitForTcp("127.0.0.1", port);
  }

  try {
    return await run();
  } catch (error) {
    if (startedCompose) {
      console.error(
        `Interop peer logs for ${service}:\n${composeLogs(service, 100)}`,
      );
    }
    throw error;
  } finally {
    if (startedCompose) {
      composeDown(service);
    }
  }
}

export async function withTransportHubLeaves(run) {
  composeUp("transport-leaf-bob", "transport-leaf-alice");
  try {
    return await run();
  } catch (error) {
    console.error(
      `Transport leaf logs:\n${composeLogs("transport-leaf-bob", 100)}${composeLogs("transport-leaf-alice", 100)}`,
    );
    throw error;
  } finally {
    composeDown("transport-leaf-bob", "transport-leaf-alice");
  }
}

export function spawnComposeService(service) {
  return spawn(
    "docker",
    ["compose", "-f", COMPOSE_FILE, "up", "--build", service],
    {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

export function composeRun(service, args = [], env = {}, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "compose",
        "-f",
        COMPOSE_FILE,
        "--profile",
        "tools",
        "run",
        "--rm",
        service,
        ...args,
      ],
      {
        cwd: REPO_ROOT,
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGKILL");
      reject(
        new Error(
          `docker compose run ${service} timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
        return;
      }
      const detail = [stdout, stderr].filter(Boolean).join("\n").trim();
      reject(
        new Error(
          `docker compose run ${service} failed with status ${code ?? 1}${detail ? `\n${detail}` : ""}`,
        ),
      );
    });
  });
}

export async function waitForLogLine(service, pattern, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const logs = composeLogs(service, 40);
    const match = logs.match(pattern);
    if (match !== null) {
      return match;
    }

    await sleep(500);
  }

  throw new Error(
    `Timed out waiting for ${pattern} from ${service}. Logs:\n${composeLogs(service, 100)}`,
  );
}
