/**
 * `tp node` peers: the TCP hub and any extra headless nodes.
 *
 * The hub runs the TCP *server* interface every other peer connects to.
 * AutoInterface cannot work loopback-only (multicast skips lo0), so this
 * hub-and-spoke shape is what makes a single-machine mesh possible at all.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTROL_PORT,
  HUB_PORT,
  WEB_GATEWAY_PORT,
  dataDirFor,
  logPath,
  processAlive,
  repoRoot,
} from "../state.mjs";

const TP_BIN = join(repoRoot, "packages/cli/dist/bin/tp.js");
/** Local-only identity passphrase; these peers hold no real user data. */
const PASSPHRASE = "local-multipeer conformance passphrase";
const HUB_STATUS_PORT = 9473;

function hostConfigFor(id, isHub) {
  return {
    // The hub has to relay between its spokes, or peers only ever discover the
    // hub itself: `transportEnabled` in node-host.ts requires the transport
    // role *and* this relay mode.
    ...(isHub ? { relay: { mode: "transport-node" } } : {}),
    interfaces: {
      tcp: isHub
        ? {
            enabled: true,
            mode: "server",
            listenPort: HUB_PORT,
            direction: "both",
            relay: true,
          }
        : {
            enabled: true,
            mode: "client",
            targetHost: "127.0.0.1",
            targetPort: HUB_PORT,
            direction: "both",
            relay: true,
          },
      // Loopback multicast cannot reach a sibling process; keep the noise off.
      auto: {
        enabled: false,
        multicast: false,
        bonjour: false,
        direction: "both",
        relay: true,
      },
    },
  };
}

export function makeNodeAdapter({ id, isHub, statusPort }) {
  return {
    id,
    kind: isHub ? "hub" : "node",
    describe: () =>
      isHub
        ? `tp node hub (TCP server 0.0.0.0:${HUB_PORT}, status ${statusPort})`
        : `tp node (TCP client 127.0.0.1:${HUB_PORT}, status ${statusPort})`,

    async up({ log }) {
      if (!existsSync(TP_BIN)) {
        throw new Error(`${TP_BIN} is missing — run \`npm run build\` first`);
      }
      const dataDir = dataDirFor(id);
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(
        join(dataDir, "config.json"),
        `${JSON.stringify(hostConfigFor(id, isHub), null, 2)}\n`,
      );

      const out = openSync(logPath(id), "a");
      const child = spawn(
        process.execPath,
        [
          TP_BIN,
          "node",
          "--data-dir",
          dataDir,
          "--no-seeder",
          "--status-endpoint",
          String(statusPort),
          "--test-agent",
          `127.0.0.1:${CONTROL_PORT}:${id}`,
          ...(isHub
            ? ["--ws-listen", `127.0.0.1:${WEB_GATEWAY_PORT}`, "--serve-web"]
            : []),
        ],
        {
          cwd: repoRoot,
          detached: true,
          stdio: ["ignore", out, out],
          env: { ...process.env, TP_IDENTITY_PASSPHRASE: PASSPHRASE },
        },
      );
      child.unref();
      log(`${id}: tp node pid ${child.pid}`);

      return {
        kind: isHub ? "hub" : "node",
        pid: child.pid,
        dataDir,
        statusPort,
        ...(isHub
          ? { hubPort: HUB_PORT, webGatewayPort: WEB_GATEWAY_PORT }
          : {}),
      };
    },

    async down(entry, { log }) {
      if (!processAlive(entry.pid)) {
        return;
      }
      try {
        process.kill(entry.pid, "SIGTERM");
      } catch {
        return;
      }
      for (let attempt = 0; attempt < 50; attempt += 1) {
        if (!processAlive(entry.pid)) {
          log(`${id}: stopped`);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      try {
        process.kill(entry.pid, "SIGKILL");
      } catch {
        // Already gone.
      }
      log(`${id}: killed`);
    },

    running: (entry) => processAlive(entry?.pid),
  };
}
