#!/usr/bin/env node
// @ts-nocheck
import { spawn } from "node:child_process";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { record } from "./record.mjs";
import { rootFrom } from "./common.mjs";

const root = rootFrom(import.meta.url);
const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
const oneHourMs = 60 * 60 * 1000;

function statePath(stateDir) { return join(stateDir, "state.json"); }
function samplesPath(stateDir) { return join(stateDir, "samples.ndjson"); }
function readState(stateDir) { return JSON.parse(readFileSync(statePath(stateDir), "utf8")); }
function writeState(stateDir, value) { writeFileSync(statePath(stateDir), `${JSON.stringify(value, null, 2)}\n`); }
function appendSample(stateDir, value) { appendFileSync(samplesPath(stateDir), `${JSON.stringify(value)}\n`); }

export function readSamples(stateDir) {
  if (!existsSync(samplesPath(stateDir))) return [];
  return readFileSync(samplesPath(stateDir), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function linuxRssKiB(pid) {
  const path = `/proc/${pid}/status`;
  if (!existsSync(path)) throw new Error(`node process ${pid} is not alive`);
  const match = /^VmRSS:\s+(\d+)\s+kB$/m.exec(readFileSync(path, "utf8"));
  if (!match) throw new Error(`could not read VmRSS for process ${pid}`);
  return Number.parseInt(match[1], 10);
}

export function verifySamples(samples, state) {
  if (samples.length < 2) throw new Error("H20 requires at least two successful samples");
  const sorted = [...samples].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const elapsedMs = Date.parse(sorted.at(-1).at) - Date.parse(sorted[0].at);
  if (elapsedMs < state.durationMs) throw new Error(`H20 duration incomplete (${elapsedMs} < ${state.durationMs} ms)`);
  for (let index = 0; index < sorted.length; index += 1) {
    const sample = sorted[index];
    if (sample.error) throw new Error(`H20 sample failed at ${sample.at}: ${sample.error}`);
    if (!sample.status?.running || !sample.status?.propagationEnabled) throw new Error(`node or propagation role offline at ${sample.at}`);
    if (!Number.isFinite(sample.rssKiB) || sample.rssKiB <= 0) throw new Error(`RSS missing at ${sample.at}`);
    if (index > 0) {
      const previous = sorted[index - 1];
      const gap = Date.parse(sample.at) - Date.parse(previous.at);
      if (gap > state.intervalMs * 2.5) throw new Error(`monitoring gap ${gap} ms exceeds allowance`);
      if (sample.status.uptimeMs < previous.status.uptimeMs) throw new Error(`node restarted between ${previous.at} and ${sample.at}`);
    }
  }
  const first = sorted[0];
  const last = sorted.at(-1);
  const values = (key) => sorted.map((sample) => sample[key]);
  return {
    elapsedMs,
    samples: sorted.length,
    rssKiB: { min: Math.min(...values("rssKiB")), max: Math.max(...values("rssKiB")), growth: last.rssKiB - first.rssKiB },
    pathTableCount: { first: first.status.pathTableCount, last: last.status.pathTableCount },
    propagationStoreBytes: { first: first.status.propagationStoreBytes, last: last.status.propagationStoreBytes },
    propagationMessageCount: { first: first.status.propagationMessageCount, last: last.status.propagationMessageCount },
    propagationEvictions: { first: first.status.propagationEvictions, last: last.status.propagationEvictions }
  };
}

export async function sample(stateDir, now = new Date()) {
  const state = readState(stateDir);
  try {
    const response = await fetch(state.endpoint, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`status endpoint returned HTTP ${response.status}`);
    const status = await response.json();
    const value = { at: now.toISOString(), rssKiB: linuxRssKiB(state.pid), status };
    appendSample(stateDir, value);
    return value;
  } catch (error) {
    const value = { at: now.toISOString(), error: error instanceof Error ? error.message : String(error) };
    appendSample(stateDir, value);
    throw error;
  }
}

function finish(stateDir) {
  const state = readState(stateDir);
  const summary = verifySamples(readSamples(stateDir), state);
  const out = join(root, "release/evidence-logs", "h20-two-week-summary.log");
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, `[release] H20 two-week unattended node run passed\n${JSON.stringify(summary, null, 2)}\n`);
  record({ root, id: "hardware:H20", status: "passed", log: out, note: `${summary.samples} samples over ${Math.round(summary.elapsedMs / 86_400_000)} days` });
  return summary;
}

async function watch(stateDir) {
  const state = readState(stateDir);
  while (true) {
    try {
      await sample(stateDir);
      const samples = readSamples(stateDir).filter((entry) => !entry.error);
      if (samples.length >= 2 && Date.parse(samples.at(-1).at) - Date.parse(samples[0].at) >= state.durationMs) {
        console.log(JSON.stringify(finish(stateDir), null, 2));
        return;
      }
    } catch (error) {
      const out = join(stateDir, "failure.log");
      writeFileSync(out, `[release] H20 monitor failed: ${error instanceof Error ? error.stack : String(error)}\n`);
      record({ root, id: "hardware:H20-run", status: "failed", log: out, note: "H20 monitor or node failed" });
      throw error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, state.intervalMs));
  }
}

function option(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : fallback;
}

function positive(value, flag) {
  if (!/^\d+$/.test(value ?? "") || Number(value) <= 0) throw new Error(`${flag} must be a positive integer`);
  return Number(value);
}

function start(argv) {
  if (process.platform !== "linux" && !argv.includes("--allow-non-linux")) throw new Error("H20 must run on Linux");
  const stateDir = resolve(option(argv, "--state-dir", join(root, ".tmp/release-h20")));
  const dataDir = resolve(option(argv, "--data-dir", join(stateDir, "node-data")));
  const endpoint = option(argv, "--endpoint", "http://127.0.0.1:9473/status");
  const durationMs = positive(option(argv, "--duration-ms", String(twoWeeksMs)), "--duration-ms");
  const intervalMs = positive(option(argv, "--interval-ms", String(oneHourMs)), "--interval-ms");
  const cli = join(root, "packages/cli/dist/bin/tp.js");
  if (!existsSync(cli)) throw new Error("CLI build missing; run npm run build before starting H20");
  if (existsSync(statePath(stateDir))) throw new Error(`H20 state already exists at ${stateDir}`);
  mkdirSync(stateDir, { recursive: true });
  const nodeLog = join(stateDir, "node.log");
  const fd = openSync(nodeLog, "a");
  const node = spawn(process.execPath, [cli, "node", "--propagation", "--status-endpoint", "--data-dir", dataDir], {
    cwd: root, detached: true, stdio: ["ignore", fd, fd]
  });
  closeSync(fd);
  node.unref();
  const state = { schema: "twistedpear.h20-v1", startedAt: new Date().toISOString(), pid: node.pid, endpoint, durationMs, intervalMs, dataDir };
  writeState(stateDir, state);
  record({ root, id: "hardware:H20-run", status: "started", log: nodeLog, note: `H20 node started with pid ${node.pid}` });
  const monitorLogFd = openSync(join(stateDir, "monitor.log"), "a");
  const monitor = spawn(process.execPath, [process.argv[1], "watch", "--state-dir", stateDir], {
    cwd: root, detached: true, stdio: ["ignore", monitorLogFd, monitorLogFd]
  });
  closeSync(monitorLogFd);
  monitor.unref();
  writeFileSync(join(stateDir, "monitor.pid"), `${monitor.pid}\n`);
  console.log(JSON.stringify({ stateDir, nodePid: node.pid, monitorPid: monitor.pid, endpoint, durationMs, intervalMs }, null, 2));
}

async function main(argv = process.argv.slice(2)) {
  const command = argv[0];
  const stateDir = resolve(option(argv, "--state-dir", join(root, ".tmp/release-h20")));
  if (command === "start") start(argv);
  else if (command === "sample") console.log(JSON.stringify(await sample(stateDir), null, 2));
  else if (command === "verify") console.log(JSON.stringify(finish(stateDir), null, 2));
  else if (command === "watch") await watch(stateDir);
  else throw new Error("usage: release:h20 <start|sample|watch|verify> [--state-dir PATH]");
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
