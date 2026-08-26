#!/usr/bin/env node
/**
 * Background resource sampler for a single GitHub Actions job.
 *
 * Started by `.github/actions/telemetry-start` right after checkout and stopped
 * by `.github/actions/telemetry-finish`, so the window it covers is the part of
 * the job that does the work: dependency install, builds, gates and tests.
 *
 * It answers the question the Actions API cannot: a step that took eleven
 * minutes was doing what — saturating cores, thrashing memory, or waiting on a
 * network it never got bandwidth from.
 *
 *   node scripts/ci/sampler.mjs --out=<dir> [--interval=5000] [--label=<name>]
 *     [--max-lifetime=21600000]
 *
 * Writes `<dir>/samples.ndjson` as it goes and `<dir>/summary.json` on exit.
 * Stops when `<dir>/stop` appears (a file, not a signal: Windows runners kill
 * without running handlers, so a signal-only stop loses the summary), or when
 * it outlives any plausible job.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  cpuPercent,
  cpuTicks,
  disk,
  diskIo,
  loadAverage,
  memory,
  network,
  processCount,
  round,
} from "./sample-sources.mjs";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const outDir = path.resolve(args.get("out") ?? ".ci-telemetry");
const intervalMs = Number(args.get("interval") ?? 5000);
const label = args.get("label") ?? process.env.GITHUB_JOB ?? "job";
/**
 * Hard ceiling on the sampler's own life.
 *
 * On a hosted runner an orphaned sampler dies with the VM, so this never
 * matters. The emulator lab is self-hosted: a job killed hard enough that
 * `telemetry-finish` never runs would otherwise leave this process ticking on
 * a machine that outlives it, appending to a file nobody will read. Six hours
 * is comfortably past GitHub's own job timeout.
 */
const maxLifetimeMs = Number(args.get("max-lifetime") ?? 6 * 60 * 60 * 1000);
const stopFile = path.join(outDir, "stop");
const samplesFile = path.join(outDir, "samples.ndjson");

fs.mkdirSync(outDir, { recursive: true });

const diskPaths = {
  workspace: process.env.GITHUB_WORKSPACE ?? process.cwd(),
  temp: process.env.RUNNER_TEMP ?? os.tmpdir(),
};

const startedAt = Date.now();
const samples = [];
let previousTicks = cpuTicks();
let firstIo = diskIo();
let firstNet = network();
let stopping = false;

const stream = fs.createWriteStream(samplesFile, { flags: "a" });

function collect() {
  const ticks = cpuTicks();
  const io = diskIo();
  const net = network();
  const sample = {
    t: Date.now() - startedAt,
    cpuPct: cpuPercent(previousTicks, ticks),
    load: loadAverage(),
    mem: memory(),
    disk: disk(diskPaths),
    procs: processCount(),
    ioReadBytes: io && firstIo ? io.readBytes - firstIo.readBytes : null,
    ioWriteBytes: io && firstIo ? io.writeBytes - firstIo.writeBytes : null,
    netRxBytes: net && firstNet ? net.rxBytes - firstNet.rxBytes : null,
    netTxBytes: net && firstNet ? net.txBytes - firstNet.txBytes : null,
  };
  previousTicks = ticks;
  // A counter that wrapped or a device that disappeared would otherwise report
  // a negative total for the rest of the job.
  if (io && firstIo && sample.ioReadBytes < 0) firstIo = io;
  if (net && firstNet && sample.netRxBytes < 0) firstNet = net;
  samples.push(sample);
  stream.write(`${JSON.stringify(sample)}\n`);
  return sample;
}

function series(key, pick) {
  const values = samples
    .map(pick)
    .filter((value) => typeof value === "number" && !Number.isNaN(value));
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    key,
    samples: values.length,
    mean: round(sum / values.length, 2),
    p50: round(sorted[Math.floor(sorted.length * 0.5)], 2),
    p95: round(
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
      2,
    ),
    max: round(sorted.at(-1), 2),
    min: round(sorted[0], 2),
  };
}

function last(pick) {
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const value = pick(samples[index]);
    if (typeof value === "number" && !Number.isNaN(value)) return value;
  }
  return null;
}

function summarize() {
  const durationMs = Date.now() - startedAt;
  const memTotal = samples.at(-1)?.mem?.totalBytes ?? os.totalmem();
  // Free space on the runner's own volume, not the size of the checkout: what
  // matters here is whether a job is filling the disk it shares with the cache.
  const workspaceStart = samples[0]?.disk?.workspace?.usedBytes ?? null;
  const workspaceEnd = last((sample) => sample.disk?.workspace?.usedBytes);
  return {
    schema: 1,
    label,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs,
    intervalMs,
    sampleCount: samples.length,
    runner: {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      cpuCount: os.cpus()?.length ?? null,
      cpuModel: os.cpus()?.[0]?.model ?? null,
      memTotalBytes: memTotal,
      osLabel: process.env.RUNNER_OS ?? null,
      runnerName: process.env.RUNNER_NAME ?? null,
      imageOs: process.env.ImageOS ?? null,
    },
    cpuPct: series("cpuPct", (sample) => sample.cpuPct),
    loadOne: series("loadOne", (sample) => sample.load?.one),
    memUsedBytes: series("memUsedBytes", (sample) => sample.mem?.usedBytes),
    memUsedPct: series("memUsedPct", (sample) => sample.mem?.usedPct),
    procs: series("procs", (sample) => sample.procs),
    diskWorkspacePct: series(
      "diskWorkspacePct",
      (sample) => sample.disk?.workspace?.usedPct,
    ),
    runnerDiskGrowthBytes:
      workspaceStart != null && workspaceEnd != null
        ? workspaceEnd - workspaceStart
        : null,
    ioReadBytes: last((sample) => sample.ioReadBytes),
    ioWriteBytes: last((sample) => sample.ioWriteBytes),
    netRxBytes: last((sample) => sample.netRxBytes),
    netTxBytes: last((sample) => sample.netTxBytes),
    // CPU-seconds actually consumed, the closest stand-in for the compute a
    // job bought with its wall-clock minutes.
    cpuSeconds: estimateCpuSeconds(durationMs),
  };
}

function estimateCpuSeconds(durationMs) {
  const cores = os.cpus()?.length ?? 1;
  const mean = series("cpuPct", (sample) => sample.cpuPct)?.mean;
  if (mean == null) return null;
  return round((mean / 100) * cores * (durationMs / 1000), 1);
}

function finish() {
  if (stopping) return;
  stopping = true;
  collect();
  fs.writeFileSync(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(summarize(), null, 2)}\n`,
  );
  stream.end();
  process.exit(0);
}

/**
 * How often the stop file is checked, independently of the sampling interval.
 *
 * These were one timer until the first real CI run measured the cost: the
 * finish step waited a whole sampling interval for the sampler to notice it
 * had been asked to stop, which across a hundred jobs was most of the
 * telemetry's total overhead. Sampling is expensive enough to want a coarse
 * interval; noticing a file is not.
 */
const STOP_POLL_MS = 250;

collect();
const sampleTimer = setInterval(collect, Math.max(500, intervalMs));
const stopTimer = setInterval(() => {
  if (fs.existsSync(stopFile) || Date.now() - startedAt >= maxLifetimeMs) {
    clearInterval(sampleTimer);
    clearInterval(stopTimer);
    finish();
  }
}, STOP_POLL_MS);

for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  process.on(signal, finish);
}
