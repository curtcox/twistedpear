/** Browser web-host peer, controlled through an opt-in in-page test shim. */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, openSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  WEB_CDP_PORT,
  WEB_GATEWAY_PORT,
  dataDirFor,
  logPath,
  processAlive,
  repoRoot,
  stateRoot,
} from "../state.mjs";

const WEB_ROOT = join(repoRoot, "dist", "web-host");
const READY_PATH = join(stateRoot, "web-ready.json");
const HELPER = join(repoRoot, "scripts", "peers", "web-peer-process.mjs");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForGateway() {
  const url = `http://127.0.0.1:${WEB_GATEWAY_PORT}/`;
  const deadline = Date.now() + 30_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`gateway answered HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(
    `web gateway did not become ready: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export const webAdapter = {
  id: "web",
  kind: "web",
  describe: () =>
    `Chromium web host (same-origin WS gateway 127.0.0.1:${WEB_GATEWAY_PORT})`,

  async up({ log, build }) {
    if (build || !existsSync(join(WEB_ROOT, "index.html"))) {
      log("web: building the static web host");
      const built = spawnSync("npm", ["run", "build:web-host"], {
        cwd: repoRoot,
        encoding: "utf8",
      });
      if (built.status !== 0)
        throw new Error(
          `web host build failed: ${built.stderr || built.stdout}`,
        );
    }
    await waitForGateway();
    rmSync(READY_PATH, { force: true });
    const out = openSync(logPath("web"), "a");
    const child = spawn(
      process.execPath,
      [
        HELPER,
        `--url=http://127.0.0.1:${WEB_GATEWAY_PORT}/?cross-device-control=1`,
        `--cdp=${WEB_CDP_PORT}`,
        `--ready=${READY_PATH}`,
        `--label=web`,
        `--user-data-dir=${dataDirFor("web-chromium")}`,
      ],
      { cwd: repoRoot, detached: true, stdio: ["ignore", out, out] },
    );
    child.unref();
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (!processAlive(child.pid))
        throw new Error(
          `web browser exited during startup (see ${logPath("web")})`,
        );
      if (existsSync(READY_PATH)) {
        const ready = JSON.parse(readFileSync(READY_PATH, "utf8"));
        log(`web: Chromium ready (${ready.gateway})`);
        return {
          kind: "web",
          pid: child.pid,
          cdpPort: WEB_CDP_PORT,
          url: ready.url,
        };
      }
      await sleep(250);
    }
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {}
    throw new Error(
      `web browser did not reach the gateway within 90s (see ${logPath("web")})`,
    );
  },

  async down(entry, { log }) {
    if (!processAlive(entry?.pid)) return;
    try {
      process.kill(entry.pid, "SIGTERM");
    } catch {
      return;
    }
    for (let attempt = 0; attempt < 50 && processAlive(entry.pid); attempt += 1)
      await sleep(100);
    if (processAlive(entry.pid)) {
      try {
        process.kill(entry.pid, "SIGKILL");
      } catch {}
    }
    log("web: Chromium stopped");
  },

  running: (entry) => processAlive(entry?.pid),
};
