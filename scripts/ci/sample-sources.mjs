/**
 * Platform probes for the CI resource sampler.
 *
 * Every probe is best-effort and returns `null` when the platform cannot
 * answer. GitHub-hosted runners span Linux, macOS and Windows, and a sampler
 * that throws on the two platforms without `/proc` would take the job with it.
 */
import fs from "node:fs";
import os from "node:os";

/** Aggregate CPU tick counters across all cores. */
export function cpuTicks() {
  let user = 0;
  let nice = 0;
  let sys = 0;
  let idle = 0;
  let irq = 0;
  for (const cpu of os.cpus() ?? []) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }
  return { user, nice, sys, idle, irq, total: user + nice + sys + idle + irq };
}

/**
 * Busy fraction between two tick snapshots, as a percentage of all cores.
 *
 * @returns {number | null} null when the counters did not advance, which is
 *   what a sub-tick interval looks like and is not the same as 0% busy.
 */
export function cpuPercent(previous, current) {
  if (!previous || !current) return null;
  const total = current.total - previous.total;
  if (total <= 0) return null;
  const idle = current.idle - previous.idle;
  return round((1 - idle / total) * 100, 2);
}

export function memory() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalBytes: total,
    freeBytes: free,
    usedBytes: used,
    usedPct: total > 0 ? round((used / total) * 100, 2) : null,
  };
}

/** Free/total space on the paths the job actually writes to. */
export function disk(paths) {
  const out = {};
  for (const [label, target] of Object.entries(paths)) {
    if (!target) continue;
    try {
      const stat = fs.statfsSync(target);
      const totalBytes = stat.blocks * stat.bsize;
      const freeBytes = stat.bavail * stat.bsize;
      out[label] = {
        totalBytes,
        freeBytes,
        usedBytes: totalBytes - freeBytes,
        usedPct:
          totalBytes > 0
            ? round(((totalBytes - freeBytes) / totalBytes) * 100, 2)
            : null,
      };
    } catch {
      // A path that does not exist yet (RUNNER_TEMP before first use) is not
      // an error worth reporting on every sample.
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Cumulative block-device bytes. Linux only; the field is absent elsewhere. */
export function diskIo() {
  const text = readProc("/proc/diskstats");
  if (!text) return null;
  let readBytes = 0;
  let writeBytes = 0;
  for (const line of text.split("\n")) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 10) continue;
    const name = fields[2];
    // Partitions repeat their parent disk's traffic; count whole devices only.
    if (!/^(sd[a-z]+|nvme\d+n\d+|vd[a-z]+|xvd[a-z]+)$/.test(name)) continue;
    readBytes += Number(fields[5]) * 512;
    writeBytes += Number(fields[9]) * 512;
  }
  return { readBytes, writeBytes };
}

/** Cumulative network bytes across non-loopback interfaces. Linux only. */
export function network() {
  const text = readProc("/proc/net/dev");
  if (!text) return null;
  let rxBytes = 0;
  let txBytes = 0;
  for (const line of text.split("\n").slice(2)) {
    const [rawName, rest] = line.split(":");
    if (!rest) continue;
    const name = rawName.trim();
    if (name === "lo" || name.startsWith("docker") || name.startsWith("veth"))
      continue;
    const fields = rest.trim().split(/\s+/);
    rxBytes += Number(fields[0]) || 0;
    txBytes += Number(fields[8]) || 0;
  }
  return { rxBytes, txBytes };
}

/** Running process count. Linux only, and cheap enough to sample. */
export function processCount() {
  try {
    return fs.readdirSync("/proc").filter((name) => /^\d+$/.test(name)).length;
  } catch {
    return null;
  }
}

export function loadAverage() {
  const [one, five, fifteen] = os.loadavg();
  // Windows reports [0, 0, 0] rather than "unsupported"; do not publish zeros
  // as if they were a measurement.
  if (one === 0 && five === 0 && fifteen === 0 && os.platform() === "win32")
    return null;
  return {
    one: round(one, 2),
    five: round(five, 2),
    fifteen: round(fifteen, 2),
  };
}

export function round(value, digits) {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function readProc(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}
