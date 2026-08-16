/** Resource-growth sampling for a soak whose system under test is a child process tree. */
import fs from "node:fs";
import { spawnSync } from "node:child_process";

import { resourceMonitor } from "./soak-resources.mjs";

/** @param {string} output */
export function parseProcessTable(output) {
  return output
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)$/))
    .filter((match) => match !== null)
    .map((match) => ({
      pid: Number(match[1]),
      parentPid: Number(match[2]),
      rssKiB: Number(match[3]),
    }));
}

/**
 * Resolve a process tree from one stable process-table snapshot.
 * @param {{pid: number, parentPid: number}[]} rows
 * @param {number} rootPid
 * @param {boolean} includeRoot
 */
export function descendantPids(rows, rootPid, includeRoot = true) {
  const found = new Set(includeRoot ? [rootPid] : []);
  let parents = new Set([rootPid]);
  while (parents.size > 0) {
    const children = rows
      .filter((row) => parents.has(row.parentPid) && !found.has(row.pid))
      .map((row) => row.pid);
    if (children.length === 0) break;
    for (const pid of children) found.add(pid);
    parents = new Set(children);
  }
  return [...found];
}

/** @param {string} output */
export function countLsofDescriptors(output) {
  return output.split("\n").filter((line) => /^f\d+$/.test(line)).length;
}

/** @param {number[]} pids */
function openFileDescriptors(pids) {
  if (process.platform === "linux")
    return pids.reduce((count, pid) => {
      try {
        return count + fs.readdirSync(`/proc/${pid}/fd`).length;
      } catch {
        return count;
      }
    }, 0);
  if (process.platform === "darwin" && pids.length > 0) {
    const result = spawnSync(
      "lsof",
      ["-nP", "-a", "-p", pids.join(","), "-F", "f"],
      { encoding: "utf8", timeout: 10_000 },
    );
    // lsof returns 1 if even one short-lived renderer exits while it scans the
    // list, but stdout still contains valid descriptors for the survivors.
    if (result.stdout.length > 0) return countLsofDescriptors(result.stdout);
  }
  return 0;
}

/**
 * @param {{rootPid: number, includeRoot?: boolean, now?: () => number}} options
 */
export function takeProcessTreeSample(options) {
  if (process.platform !== "linux" && process.platform !== "darwin")
    return null;
  const result = spawnSync("ps", ["-axo", "pid=,ppid=,rss="], {
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.status !== 0) return null;
  // The synchronous `ps` probe is itself our child. Excluding its PID keeps an
  // idle harness from manufacturing a tiny one-process "system under test".
  const rows = parseProcessTable(result.stdout).filter(
    (row) => row.pid !== result.pid,
  );
  const pids = descendantPids(
    rows,
    options.rootPid,
    options.includeRoot ?? true,
  );
  const selected = rows.filter((row) => pids.includes(row.pid));
  if (selected.length === 0) return null;
  return {
    atMs: (options.now ?? Date.now)(),
    rss: selected.reduce((sum, row) => sum + row.rssKiB * 1024, 0),
    handles: openFileDescriptors(pids),
    processes: selected.length,
    pids: selected.map((row) => row.pid),
  };
}

/**
 * @param {{id: string, rootPid: number, includeRoot?: boolean, write?: (line: string) => void, now?: () => number}} options
 */
export function childProcessResources(options) {
  return resourceMonitor({
    id: options.id,
    write: options.write,
    takeSample() {
      return takeProcessTreeSample(options);
    },
    metadata: {
      source: "process-tree",
      rootPid: options.rootPid,
      includeRoot: options.includeRoot ?? true,
    },
    describeGrowth: (growth, count) =>
      ` process-tree rss ${growth.rssBytesPerMinute}B/min, descriptors ${growth.handlesPerMinute}/min over ${count} sample(s)`,
  });
}
