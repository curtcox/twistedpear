/**
 * Preflight host headroom for serial gate runs.
 *
 * A 16 GB Mac under sustained swap pressure, or one that already has
 * Gradle/JDT heaps resident, cannot take broad Vitest workers on top. The kernel then spends
 * its time compressing memory; if it stalls long enough to miss the SMC
 * watchdog, the machine hard-resets (`wdog,reset_in_1`) instead of exiting the
 * gate. Judgment is pure so it can be tested against that snapshot; sampling
 * the live host is a thin wrapper around `os`, `ps`, and swap sysctls.
 *
 * CI jobs skip the probe: each gate is an isolated VM, which is why parallel
 * coverage workers are safe there and lethal next to three IDEs here.
 */
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";

export const GiB = 1024 ** 3;

/** Gates that fork whole-program workers or instrument the tree. */
export const HEAVY_GATE_IDS = [
  "unit-tests",
  "coverage",
  "type-coverage",
  "typed-lint",
  "complexity",
  "mutation",
  "rust-coverage",
  "swift-coverage",
  "kotlin-coverage",
];

export const RIVAL_PATTERNS = [
  /GradleDaemon/,
  /kotlin-daemon/,
  /jdt\.ls/,
  /org\.eclipse\.equinox\.launcher/,
  /vitest.*--coverage/,
  /scripts\/checks\/run\.mjs/,
];

export const LIMITS = {
  maxHeavySwapUsedBytes: 2 * GiB,
  maxLightSwapUsedBytes: 4 * GiB,
  minLightFreeBytesWhileSwapped: 1 * GiB,
  maxLoadPerCpu: 4,
  /** Advertised 16/24 GB machines cannot stack heavy gates on IDE heaps. */
  smallHostBytes: 32 * GiB,
  recoverySamples: 7,
  recoveryDelayMs: 10_000,
};

/**
 * @typedef {object} ProcessRow
 * @property {number} pid
 * @property {number} rssKiB
 * @property {string} args
 */

/**
 * @typedef {object} HostSnapshot
 * @property {boolean} ci
 * @property {number} totalBytes
 * @property {number} freeBytes
 * @property {number} swapUsedBytes
 * @property {number} load1
 * @property {number} cpuCount
 * @property {ProcessRow[]} processes
 * @property {Set<number>} selfPids
 */

/**
 * @typedef {object} HeadroomVerdict
 * @property {boolean} ok
 * @property {string[]} reasons
 */

/** @param {string} id */
export function gateCost(id) {
  return HEAVY_GATE_IDS.includes(id) ? "heavy" : "light";
}

/**
 * Local coverage runs one Vitest worker so the gate cannot fan out across
 * every core on top of the IDEs. CI keeps the default pool: the job is alone
 * on the VM. `TP_COVERAGE_SERIAL=1` forces serial in CI too.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function coverageWorkerArgs(env = process.env) {
  if (env.CI && env.TP_COVERAGE_SERIAL !== "1") return [];
  return ["--maxWorkers=1"];
}

/** The broad unit gate is heavy locally; CI already gives it an isolated VM. */
export function unitWorkerArgs(env = process.env) {
  if (env.CI) return [];
  const requested = Number.parseInt(env.TP_UNIT_MAX_WORKERS ?? "1", 10);
  const workers = Number.isFinite(requested) && requested > 0 ? requested : 1;
  return [`--maxWorkers=${workers}`];
}

function parseDarwinSwapUsedBytes(text) {
  const normalized = text.toLowerCase();
  const usedAt = normalized.indexOf("used");
  if (usedAt === -1) return null;
  const separatorAt = normalized.indexOf("=", usedAt);
  if (separatorAt === -1) return null;
  const quantity = normalized.slice(separatorAt + 1);
  const value = Number.parseFloat(quantity);
  if (!Number.isFinite(value)) return null;
  if (quantity.includes("g")) return value * GiB;
  if (quantity.includes("m")) return value * 1024 * 1024;
  return null;
}

function parseLinuxSwapKiB(text, label) {
  const prefixed = `\n${text}`;
  const start = prefixed.indexOf(`\n${label}`);
  if (start === -1) return null;
  const value = Number.parseInt(prefixed.slice(start + label.length + 1), 10);
  return Number.isFinite(value) ? value : null;
}

function parseLinuxSwapUsedBytes(text) {
  const totalKiB = parseLinuxSwapKiB(text, "SwapTotal:");
  const freeKiB = parseLinuxSwapKiB(text, "SwapFree:");
  if (totalKiB === null || freeKiB === null) return null;
  return Math.max(0, (totalKiB - freeKiB) * 1024);
}

/**
 * @param {string} text
 * @returns {number}
 */
export function parseSwapUsedBytes(text) {
  return parseDarwinSwapUsedBytes(text) ?? parseLinuxSwapUsedBytes(text) ?? 0;
}

/**
 * @param {string} text
 * @returns {ProcessRow[]}
 */
export function parseProcessTable(text) {
  return text
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
    .filter((match) => match !== null)
    .map((match) => ({
      pid: Number(match[1]),
      rssKiB: Number(match[2]),
      args: match[3],
    }));
}

/**
 * @param {ProcessRow[]} processes
 * @param {Set<number>} selfPids
 */
export function rivalProcesses(processes, selfPids = new Set()) {
  return processes.filter(
    (row) =>
      !selfPids.has(row.pid) &&
      RIVAL_PATTERNS.some((pattern) => pattern.test(row.args)),
  );
}

function formatGiB(bytes) {
  return `${(bytes / GiB).toFixed(1)} GiB`;
}

function appendSwapReason(reasons, snapshot, cost) {
  if (
    cost === "heavy" &&
    snapshot.swapUsedBytes > LIMITS.maxHeavySwapUsedBytes
  ) {
    reasons.push(
      `swap used ${formatGiB(snapshot.swapUsedBytes)} (heavy-gate limit ${formatGiB(LIMITS.maxHeavySwapUsedBytes)})`,
    );
    return;
  }
  if (cost !== "light") return;
  if (snapshot.swapUsedBytes > LIMITS.maxLightSwapUsedBytes) {
    reasons.push(
      `swap used ${formatGiB(snapshot.swapUsedBytes)} (light-gate limit ${formatGiB(LIMITS.maxLightSwapUsedBytes)})`,
    );
    return;
  }
  if (
    snapshot.swapUsedBytes > LIMITS.maxHeavySwapUsedBytes &&
    snapshot.freeBytes < LIMITS.minLightFreeBytesWhileSwapped
  ) {
    reasons.push(
      `free memory ${formatGiB(snapshot.freeBytes)} while swap remains above ${formatGiB(LIMITS.maxHeavySwapUsedBytes)} (minimum ${formatGiB(LIMITS.minLightFreeBytesWhileSwapped)})`,
    );
  }
}

function appendLoadReason(reasons, snapshot, cpus) {
  if (snapshot.load1 <= cpus * LIMITS.maxLoadPerCpu) return;
  reasons.push(
    `load ${snapshot.load1.toFixed(1)} on ${cpus} cores (limit ${LIMITS.maxLoadPerCpu}×)`,
  );
}

function appendRivalReason(reasons, snapshot, cost, rivals) {
  if (cost !== "heavy" || rivals.length === 0) return;
  if (snapshot.totalBytes >= LIMITS.smallHostBytes) return;
  const names = [...new Set(rivals.map((row) => rivalLabel(row.args)))];
  reasons.push(
    `${rivals.length} rival heap(s) on a <32 GiB host: ${names.join(", ")}`,
  );
}

/**
 * @param {HostSnapshot} snapshot
 * @param {{ cost?: "light" | "heavy"; force?: boolean }} [options]
 * @returns {HeadroomVerdict}
 */
export function judgeHeadroom(snapshot, options = {}) {
  if (snapshot.ci || options.force) return { ok: true, reasons: [] };

  const cost = options.cost ?? "light";
  const reasons = [];
  const cpus = Math.max(1, snapshot.cpuCount);
  const rivals = rivalProcesses(snapshot.processes, snapshot.selfPids);

  appendSwapReason(reasons, snapshot, cost);
  appendLoadReason(reasons, snapshot, cpus);
  appendRivalReason(reasons, snapshot, cost, rivals);

  return { ok: reasons.length === 0, reasons };
}

function recoverablePressure(verdict) {
  return (
    verdict.reasons.length > 0 &&
    verdict.reasons.every(
      (reason) =>
        reason.startsWith("swap used") || reason.startsWith("free memory"),
    )
  );
}

function resolveWaitOptions(options) {
  return {
    cost: options.cost ?? "light",
    sample: options.sample ?? snapshotHost,
    wait: options.wait ?? ((ms) => new Promise((done) => setTimeout(done, ms))),
    maxSamples: options.maxSamples ?? LIMITS.recoverySamples,
    delayMs: options.delayMs ?? LIMITS.recoveryDelayMs,
    force: options.force ?? false,
  };
}

function pressureIsImproving(current, next) {
  return (
    next.swapUsedBytes < current.swapUsedBytes ||
    next.freeBytes > current.freeBytes
  );
}

/**
 * Give macOS a bounded chance to drain swap after a completed gate. Continue
 * only while swap is falling or immediately free memory is rising; rival heaps
 * and load are operator actions, not conditions a runner should sleep through.
 */
export async function waitForHeadroom(options = {}) {
  const { cost, sample, wait, maxSamples, delayMs, force } =
    resolveWaitOptions(options);
  let current = sample();
  let verdict = judgeHeadroom(current, { cost, force });
  let samples = 1;

  while (!verdict.ok && samples < maxSamples && recoverablePressure(verdict)) {
    await wait(delayMs);
    const next = sample();
    samples += 1;
    const nextVerdict = judgeHeadroom(next, { cost, force });
    if (nextVerdict.ok)
      return { snapshot: next, verdict: nextVerdict, samples, recovered: true };
    const improving = pressureIsImproving(current, next);
    current = next;
    verdict = nextVerdict;
    if (!improving) break;
  }

  return { snapshot: current, verdict, samples, recovered: false };
}

function processLabel(args) {
  if (/Google Chrome/.test(args)) return "Chrome";
  if (/Codex|ChatGPT/.test(args)) return "Codex";
  if (/Claude/.test(args)) return "Claude";
  if (/Devin|language_server_macos_arm/.test(args)) return "Devin";
  if (/Zed|language_server/.test(args)) return "language server";
  if (/GradleDaemon/.test(args)) return "GradleDaemon";
  if (/kotlin-daemon/.test(args)) return "kotlin-daemon";
  if (/jdt\.ls|equinox\.launcher/.test(args)) return "jdt.ls";
  if (/freenet-bin/.test(args)) return "Freenet";
  if (/Simulator|launchd_sim|SimMetalHost/.test(args)) return "Simulator";
  if (/node|vitest/.test(args)) return "Node";
  return "other";
}

export function hostDiagnostics(snapshot) {
  const largestRss = snapshot.processes
    .filter((row) => !snapshot.selfPids.has(row.pid))
    .sort((a, b) => b.rssKiB - a.rssKiB)
    .slice(0, 5)
    .map((row) => ({
      pid: row.pid,
      label: processLabel(row.args),
      rssMiB: Math.round(row.rssKiB / 1024),
    }));
  return {
    totalGiB: Number((snapshot.totalBytes / GiB).toFixed(2)),
    freeGiB: Number((snapshot.freeBytes / GiB).toFixed(2)),
    swapUsedGiB: Number((snapshot.swapUsedBytes / GiB).toFixed(2)),
    load1: Number(snapshot.load1.toFixed(2)),
    cpuCount: snapshot.cpuCount,
    processCount: snapshot.processes.length,
    largestRss,
  };
}

/** @param {string} args */
function rivalLabel(args) {
  if (/GradleDaemon/.test(args)) return "GradleDaemon";
  if (/kotlin-daemon/.test(args)) return "kotlin-daemon";
  if (/jdt\.ls|equinox\.launcher/.test(args)) return "jdt.ls";
  if (/vitest.*--coverage/.test(args)) return "vitest-coverage";
  if (/scripts\/checks\/run\.mjs/.test(args)) return "checks-run";
  return "rival";
}

/**
 * @param {string} gateId
 * @param {HeadroomVerdict} verdict
 */
export function formatRefusal(gateId, verdict, snapshot, samples = 1) {
  const diagnostic = snapshot ? hostDiagnostics(snapshot) : null;
  return [
    `REFUSE ${gateId}: host headroom`,
    ...verdict.reasons.map((reason) => `  ${reason}`),
    ...(diagnostic
      ? [
          `  snapshot: ${diagnostic.freeGiB.toFixed(1)} GiB free, ${diagnostic.swapUsedGiB.toFixed(1)} GiB swap, load ${diagnostic.load1.toFixed(1)}/${diagnostic.cpuCount} cores, ${diagnostic.processCount} processes`,
          ...(diagnostic.largestRss.length
            ? [
                `  largest RSS: ${diagnostic.largestRss.map((row) => `${row.label} ${row.rssMiB} MiB (pid ${row.pid})`).join(", ")}`,
              ]
            : []),
          ...(samples > 1 ? [`  recovery samples: ${samples}`] : []),
        ]
      : []),
    "Close large apps, wait briefly for swap to drain, then retry.",
    "Record from CI: npm run checks:status:import",
    "Override (unsafe): --force-headroom",
  ].join("\n");
}

function readSwapUsedBytes() {
  if (process.platform === "darwin") {
    const result = spawnSync("sysctl", ["vm.swapusage"], { encoding: "utf8" });
    return parseSwapUsedBytes(`${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
  try {
    return parseSwapUsedBytes(fs.readFileSync("/proc/meminfo", "utf8"));
  } catch {
    return 0;
  }
}

function readProcessTable() {
  const result = spawnSync("ps", ["-axo", "pid=,rss=,command="], {
    encoding: "utf8",
  });
  if (result.status !== 0) return [];
  return parseProcessTable(result.stdout ?? "");
}

function resolveHostOptions(options = {}) {
  const env = options.env ?? process.env;
  const ownerPids = (env.TP_HEADROOM_OWNER_PIDS ?? "")
    .split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  return {
    env,
    osApi: options.osApi ?? os,
    readSwap: options.readSwap ?? readSwapUsedBytes,
    listProcesses: options.listProcesses ?? readProcessTable,
    pid: options.pid ?? process.pid,
    ppid: options.ppid ?? process.ppid,
    ownerPids,
  };
}

/**
 * @param {object} [options]
 * @returns {HostSnapshot}
 */
export function snapshotHost(options = {}) {
  const resolved = resolveHostOptions(options);
  return {
    ci: Boolean(resolved.env.CI),
    totalBytes: resolved.osApi.totalmem(),
    freeBytes: resolved.osApi.freemem(),
    swapUsedBytes: resolved.readSwap(),
    load1: resolved.osApi.loadavg()[0] ?? 0,
    cpuCount: resolved.osApi.cpus()?.length || 1,
    processes: resolved.listProcesses(),
    selfPids: new Set(
      [resolved.pid, resolved.ppid, ...resolved.ownerPids].filter(Boolean),
    ),
  };
}
