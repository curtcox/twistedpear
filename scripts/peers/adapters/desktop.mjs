/**
 * Electron desktop host peer.
 *
 * Reuses the workspace's own start script so the peer is the same app a user
 * launches with `npm run run:desktop`; `TP_TEST_AGENT` is what puts it into the
 * multi-peer environment (TCP to the hub plus the control agent).
 */
import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import {
  CONTROL_PORT,
  DESKTOP_CDP_PORT,
  dataDirFor,
  logPath,
  processAlive,
  repoRoot,
} from "../state.mjs";

const PASSPHRASE = "local-multipeer conformance passphrase";

export const desktopAdapter = {
  id: "desktop",
  kind: "desktop",
  describe: () => "Electron desktop host (TCP client to the hub)",

  // `npm run start --workspace=host-desktop` builds before launching, so the
  // first `up` after a source change is slow and `--build` is implicit.
  async up({ log }) {
    const out = openSync(logPath("desktop"), "a");
    const child = spawn("npm", ["run", "start", "--workspace=host-desktop"], {
      cwd: repoRoot,
      detached: true,
      stdio: ["ignore", out, out],
      env: {
        ...process.env,
        TP_TEST_AGENT: `127.0.0.1:${CONTROL_PORT}:desktop`,
        TP_CDP_PORT: String(DESKTOP_CDP_PORT),
        TP_IDENTITY_PASSPHRASE: PASSPHRASE,
        TWISTEDPEAR_HOST_DATA_DIR: dataDirFor("desktop"),
      },
    });
    child.unref();
    log(`desktop: electron pid ${child.pid}`);
    return {
      kind: "desktop",
      pid: child.pid,
      cdpPort: DESKTOP_CDP_PORT,
      dataDir: dataDirFor("desktop"),
    };
  },

  async down(entry, { log }) {
    if (!processAlive(entry.pid)) {
      return;
    }
    // `npm run start` is a shell wrapper; kill the whole process group so
    // Electron and its worklet child go with it.
    try {
      process.kill(-entry.pid, "SIGTERM");
    } catch {
      try {
        process.kill(entry.pid, "SIGTERM");
      } catch {
        return;
      }
    }
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (!processAlive(entry.pid)) {
        log("desktop: stopped");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    try {
      process.kill(-entry.pid, "SIGKILL");
    } catch {
      // Already gone.
    }
    log("desktop: killed");
  },

  running: (entry) => processAlive(entry?.pid),
};
