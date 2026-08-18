/**
 * Preflight host headroom for serial gate runs.
 *
 * A 16 GB Mac that is already swapping, or that already has Gradle/JDT heaps
 * resident, cannot take Vitest coverage workers on top. The kernel then spends
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
  maxSwapUsedBytes: 2 * GiB,
  maxLoadPerCpu: 4,
  /** Advertised 16/24 GB machines cannot stack heavy gates on IDE heaps. */
  smallHostBytes: 32 * GiB,
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

/**
 * @param {string} text
 * @returns {number}
 */
export function parseSwapUsedBytes(text) {
  const darwin = text.match(/used\s*=\s*([\d.]+)\s*([MG])/i);
  if (darwin) {
    const value = Number(darwin[1]);
    return darwin[2].toUpperCase() === "G"
      ? value * GiB
      : value * 1024 * 1024;
  }
  const total = text.match(/^SwapTotal:\s+(\d+)\s+kB/m);
  const free = text.match(/^SwapFree:\s+(\d+)\s+kB/m);
  if (total && free) {
    return Math.max(0, (Number(total[1]) - Number(free[1])) * 1024);
  }
  return 0;
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

  if (snapshot.swapUsedBytes > LIMITS.maxSwapUsedBytes) {
    reasons.push(
      `swap used ${formatGiB(snapshot.swapUsedBytes)} (limit ${formatGiB(LIMITS.maxSwapUsedBytes)})`,
    );
  }
  if (snapshot.load1 > cpus * LIMITS.maxLoadPerCpu) {
    reasons.push(
      `load ${snapshot.load1.toFixed(1)} on ${cpus} cores (limit ${LIMITS.maxLoadPerCpu}×)`,
    );
  }
  if (
    cost === "heavy" &&
    rivals.length > 0 &&
    snapshot.totalBytes < LIMITS.smallHostBytes
  ) {
    const names = [...new Set(rivals.map((row) => rivalLabel(row.args)))];
    reasons.push(
      `${rivals.length} rival heap(s) on a <32 GiB host: ${names.join(", ")}`,
    );
  }

  return { ok: reasons.length === 0, reasons };
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
export function formatRefusal(gateId, verdict) {
  return [
    `REFUSE ${gateId}: host headroom`,
    ...verdict.reasons.map((reason) => `  ${reason}`),
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

/**
 * @param {{
 *   env?: NodeJS.ProcessEnv;
 *   pid?: number;
 *   ppid?: number;
 *   osApi?: Pick<typeof os, "totalmem" | "freemem" | "loadavg" | "cpus">;
 *   readSwap?: () => number;
 *   listProcesses?: () => ProcessRow[];
 * }} [options]
 * @returns {HostSnapshot}
 */
export function snapshotHost(options = {}) {
  const env = options.env ?? process.env;
  const osApi = options.osApi ?? os;
  const readSwap = options.readSwap ?? readSwapUsedBytes;
  const listProcesses = options.listProcesses ?? readProcessTable;
  return {
    ci: Boolean(env.CI),
    totalBytes: osApi.totalmem(),
    freeBytes: osApi.freemem(),
    swapUsedBytes: readSwap(),
    load1: osApi.loadavg()[0] ?? 0,
    cpuCount: osApi.cpus()?.length || 1,
    processes: listProcesses(),
    selfPids: new Set(
      [options.pid ?? process.pid, options.ppid ?? process.ppid].filter(
        Boolean,
      ),
    ),
  };
}
