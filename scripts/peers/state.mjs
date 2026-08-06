/**
 * Persistent state for the single-machine multi-peer environment.
 *
 * `npm run peers -- up` records one entry per running peer so a later `down`,
 * `status`, or `logs` in a different shell can find it. Everything lives under
 * `.tmp/local-peers/` so a stale tree can be removed wholesale.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const stateRoot = join(repoRoot, ".tmp", "local-peers");
export const logDir = join(stateRoot, "logs");
const statePath = join(stateRoot, "state.json");

/** Port peer control agents dial. Hardcoded in the mobile harness UI too. */
export const CONTROL_PORT = 34990;
/** TCP hub port every peer connects to; matches the mobile harness default. */
export const HUB_PORT = 4242;
/** Same-origin WebSocket gateway and static web-host listener. */
export const WEB_GATEWAY_PORT = 9480;
/** Playwright CDP endpoint used by the cross-device web driver. */
export const WEB_CDP_PORT = 34992;
/** Second web peer CDP (isolated Chromium profile). */
export const WEB2_CDP_PORT = 34994;
export const DESKTOP_CDP_PORT = 34991;
/** SPEC-TRACE observe-snapshot tapes written when `--capture` is set. */
export const tapesDir = join(stateRoot, "tapes");

export function ensureStateDirs() {
  mkdirSync(logDir, { recursive: true });
  mkdirSync(tapesDir, { recursive: true });
}

/**
 * Persist an observe-snapshot envelope under the peers state root.
 * @param {string} label peer agent label
 * @param {{ history?: unknown; dropCensus?: { byReason: Record<string, number>; byPeer: Record<string, unknown> } }} snapshot
 * @param {{ now?: Date }} [options]
 * @returns {string} absolute path written
 */
export function writeObserveTape(label, snapshot, options = {}) {
  ensureStateDirs();
  const now = options.now ?? new Date();
  const stamp = now.toISOString().replaceAll(":", "-");
  const safeLabel = String(label).replaceAll(/[^a-zA-Z0-9._-]+/g, "_");
  const path = join(tapesDir, `${safeLabel}-${stamp}.json`);
  const envelope = {
    label: String(label),
    capturedAt: now.toISOString(),
    dropCensus: snapshot.dropCensus ?? { byReason: {}, byPeer: {} },
    history: snapshot.history ?? {
      schema: "recorded-history",
      version: 1,
      entries: [],
    },
  };
  writeFileSync(path, `${JSON.stringify(envelope, null, 2)}\n`);
  return path;
}

export function readState() {
  if (!existsSync(statePath)) {
    return { peers: {} };
  }
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    return { peers: parsed.peers ?? {} };
  } catch {
    return { peers: {} };
  }
}

export function writeState(state) {
  ensureStateDirs();
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

export function recordPeer(id, entry) {
  const state = readState();
  state.peers[id] = { id, startedAt: Date.now(), ...entry };
  writeState(state);
  return state.peers[id];
}

export function forgetPeer(id) {
  const state = readState();
  delete state.peers[id];
  writeState(state);
}

export function peerEntry(id) {
  return readState().peers[id] ?? null;
}

export function logPath(id) {
  return join(logDir, `${id}.log`);
}

export function dataDirFor(id) {
  return join(stateRoot, "data", id);
}

/** Best-effort liveness check for a detached child we started earlier. */
export function processAlive(pid) {
  if (typeof pid !== "number") {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function clearState() {
  rmSync(statePath, { force: true });
}
