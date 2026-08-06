#!/usr/bin/env node
/**
 * Start and stop any combination of local peer implementations on one Mac.
 *
 *   npm run peers -- up hub desktop ios android
 *   npm run peers -- status
 *   npm run peers -- logs ios -f
 *   npm run peers -- down
 *
 * State lives in `.tmp/local-peers/`; see `scripts/peers/state.mjs`.
 * The matching assertions live in `conformance/local-multipeer`.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { startControlServer } from "./peers/control-server.mjs";
import { GUI_PEER_IDS, KNOWN_PEER_IDS, adapterFor } from "./peers/registry.mjs";
import {
  CONTROL_PORT,
  clearState,
  ensureStateDirs,
  forgetPeer,
  logPath,
  peerEntry,
  readState,
  recordPeer,
  writeObserveTape,
} from "./peers/state.mjs";

const log = (line) => console.log(line);

function usage() {
  console.log(`Usage: npm run peers -- <command> [peers...] [flags]

Commands:
  up [peers...]     Start peers (default: hub). \`hub\` is implied unless --no-hub.
  down [peers...]   Stop peers (default: everything recorded as running).
  status            Show recorded peers and, when the control port is free, live agent state.
  logs <peer> [-f]  Print a peer's log.
  list              List known peer ids.

Peers: ${KNOWN_PEER_IDS.join(", ")}

Flags:
  --build           Force GUI peer rebuilds instead of reusing installed builds.
  --no-hub          Do not imply the hub on \`up\`.
  --json            Machine-readable \`status\` output.
  --capture         On \`status\`, write observe-snapshot tapes under .tmp/local-peers/tapes/.`);
}

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith("-")));
  const positional = argv.filter((arg) => !arg.startsWith("-"));
  return { command: positional[0], peers: positional.slice(1), flags };
}

async function resolveAdapters(ids) {
  const adapters = [];
  for (const id of ids) {
    const adapter = await adapterFor(id);
    if (adapter === null) {
      throw new Error(
        `Unknown peer: ${id} (known: ${KNOWN_PEER_IDS.join(", ")})`,
      );
    }
    adapters.push(adapter);
  }
  return adapters;
}

async function isRunning(adapter) {
  const entry = peerEntry(adapter.id);
  return entry !== null && adapter.running(entry);
}

async function commandUp(ids, flags) {
  ensureStateDirs();
  const wanted = ids.length === 0 ? ["hub"] : ids;
  const withHub =
    flags.has("--no-hub") || wanted.includes("hub")
      ? wanted
      : ["hub", ...wanted];
  // The hub must be listening before spokes dial it.
  const ordered = [...withHub].sort((a, b) =>
    a === "hub" ? -1 : b === "hub" ? 1 : 0,
  );

  const adapters = await resolveAdapters(ordered);
  const failures = [];
  for (const adapter of adapters) {
    if (await isRunning(adapter)) {
      log(`${adapter.id}: already running`);
      continue;
    }
    forgetPeer(adapter.id);
    log(`${adapter.id}: starting — ${adapter.describe()}`);
    try {
      const entry = await adapter.up({ log, build: flags.has("--build") });
      recordPeer(adapter.id, entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (GUI_PEER_IDS.includes(adapter.id)) {
        log(`${adapter.id}: unavailable — ${message}`);
        failures.push(adapter.id);
        continue;
      }
      throw error;
    }
  }

  if (failures.length > 0) {
    log(`\nStarted without: ${failures.join(", ")}`);
  }
  log(
    `\nPeers up. Control port ${CONTROL_PORT}. Run: npm run test:local-multipeer -- --attach`,
  );
  return 0;
}

async function commandDown(ids) {
  const recorded = Object.keys(readState().peers);
  const targets = ids.length === 0 ? recorded : ids;
  if (targets.length === 0) {
    log("Nothing running.");
    return 0;
  }
  // Stop spokes before the hub so they do not log reconnect churn on the way out.
  const ordered = [...targets].sort((a, b) =>
    a === "hub" ? 1 : b === "hub" ? -1 : 0,
  );
  const adapters = await resolveAdapters(ordered);
  for (const adapter of adapters) {
    const entry = peerEntry(adapter.id);
    if (entry === null) {
      log(`${adapter.id}: not running`);
      continue;
    }
    try {
      await adapter.down(entry, { log });
    } catch (error) {
      log(
        `${adapter.id}: stop failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    forgetPeer(adapter.id);
  }
  if (ids.length === 0) {
    clearState();
  }
  return 0;
}

/**
 * Binds the control port briefly so attached agents re-check in and can report
 * live state. When a test run already holds the port we fall back to the
 * recorded process view.
 * @param {number} [waitMs]
 * @param {{ capture?: boolean }} [options]
 */
async function liveAgents(waitMs = 3_000, options = {}) {
  let control;
  try {
    control = await startControlServer();
  } catch {
    return null;
  }
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const snapshot = [];
  const tapes = [];
  for (const label of control.labels()) {
    try {
      snapshot.push({
        label,
        status: await control.status(label),
        peers: await control.peers(label),
      });
      if (options.capture === true) {
        const observe = await control.observeSnapshot(label);
        tapes.push(writeObserveTape(label, observe));
      }
    } catch {
      snapshot.push({ label, status: null, peers: [] });
    }
  }
  await control.close();
  return { agents: snapshot, tapes };
}

async function commandStatus(flags) {
  const state = readState();
  const rows = [];
  for (const [id, entry] of Object.entries(state.peers)) {
    const adapter = await adapterFor(id);
    rows.push({
      id,
      kind: entry.kind,
      running: adapter !== null && adapter.running(entry),
      startedAt: entry.startedAt,
      ...(entry.statusPort === undefined
        ? {}
        : { statusPort: entry.statusPort }),
    });
  }

  const live =
    rows.length === 0
      ? null
      : await liveAgents(3_000, { capture: flags.has("--capture") });
  const agents = live?.agents ?? (rows.length === 0 ? [] : null);
  const tapes = live?.tapes ?? [];

  if (flags.has("--json")) {
    console.log(JSON.stringify({ peers: rows, agents, tapes }, null, 2));
    return 0;
  }

  if (rows.length === 0) {
    log("No peers recorded. Start some with: npm run peers -- up hub");
    return 0;
  }

  log("Peer      Kind     Process   Agent   Discovered");
  for (const row of rows) {
    const agent = agents?.find((entry) => entry.label === row.id) ?? null;
    const agentState =
      agents === null ? "?" : agent === null ? "-" : "attached";
    const discovered = agent === null ? "-" : String(agent.peers.length);
    log(
      `${row.id.padEnd(9)} ${String(row.kind).padEnd(8)} ${(row.running ? "up" : "down").padEnd(9)} ${agentState.padEnd(7)} ${discovered}`,
    );
  }
  if (agents === null) {
    log(
      `\nControl port ${CONTROL_PORT} is busy (a test run holds it); agent columns unavailable.`,
    );
  }
  for (const path of tapes) {
    log(`Captured observe tape: ${path}`);
  }
  return 0;
}

function commandLogs(ids, flags) {
  const id = ids[0];
  if (id === undefined) {
    usage();
    return 1;
  }
  const path = logPath(id);
  if (!existsSync(path)) {
    log(`No log for ${id} at ${path}`);
    return 1;
  }
  if (flags.has("-f") || flags.has("--follow")) {
    const tail = spawn("tail", ["-f", path], { stdio: "inherit" });
    return new Promise((resolve) => tail.on("exit", () => resolve(0)));
  }
  process.stdout.write(readFileSync(path, "utf8"));
  return 0;
}

async function main() {
  const { command, peers, flags } = parseArgs(process.argv.slice(2));
  switch (command) {
    case "up":
      return commandUp(peers, flags);
    case "down":
      return commandDown(peers);
    case "status":
      return commandStatus(flags);
    case "logs":
      return commandLogs(peers, flags);
    case "list":
      log(KNOWN_PEER_IDS.join("\n"));
      return 0;
    default:
      usage();
      return command === undefined ? 0 : 1;
  }
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
