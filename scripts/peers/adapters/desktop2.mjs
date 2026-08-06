/**
 * Second Electron desktop host for WebRTC GUI call evidence.
 * Same shipping app as `desktop`, separate data dir and CDP port.
 */
import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import {
  CONTROL_PORT,
  dataDirFor,
  logPath,
  processAlive,
  repoRoot,
} from "../state.mjs";

export const DESKTOP2_CDP_PORT = 34993;
const PASSPHRASE = "local-multipeer conformance passphrase";

async function downDesktop(entry, { log }, label) {
  if (!processAlive(entry.pid)) {
    return;
  }
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
      log(`${label}: stopped`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  try {
    process.kill(-entry.pid, "SIGKILL");
  } catch {
    // Already gone.
  }
  log(`${label}: killed`);
}

export const desktop2Adapter = {
  id: "desktop2",
  kind: "desktop",
  describe: () => "Second Electron desktop host (TCP client to the hub)",

  async up({ log }) {
    const out = openSync(logPath("desktop2"), "a");
    const child = spawn("npm", ["run", "start", "--workspace=host-desktop"], {
      cwd: repoRoot,
      detached: true,
      stdio: ["ignore", out, out],
      env: {
        ...process.env,
        TP_TEST_AGENT: `127.0.0.1:${CONTROL_PORT}:desktop2`,
        TP_CDP_PORT: String(DESKTOP2_CDP_PORT),
        TP_IDENTITY_PASSPHRASE: PASSPHRASE,
        TWISTEDPEAR_HOST_DATA_DIR: dataDirFor("desktop2"),
      },
    });
    child.unref();
    log(`desktop2: electron pid ${child.pid}`);
    return {
      kind: "desktop",
      pid: child.pid,
      cdpPort: DESKTOP2_CDP_PORT,
      dataDir: dataDirFor("desktop2"),
    };
  },

  async down(entry, ctx) {
    await downDesktop(entry, ctx, "desktop2");
  },

  running: (entry) => processAlive(entry?.pid),
};
