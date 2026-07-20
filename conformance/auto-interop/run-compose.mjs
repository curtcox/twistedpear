#!/usr/bin/env node
/**
 * AutoInterface interop via a veth pair attached to two `--network none`
 * containers. Docker bridge IPv6 link-local binds return EADDRNOTAVAIL on both
 * Docker Desktop and GitHub-hosted runners; moving a real veth into each
 * container netns gives distinct, bindable fe80 addresses.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const composeFile = join(repoRoot, "conformance/docker/docker-compose.yml");
const pyName = "tp-auto-interop-py";
const tsName = "tp-auto-interop-ts";
const vethPy = "tpvethpy";
const vethTs = "tpvethts";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(
      `${command} ${args.join(" ")} failed with status ${result.status ?? 1}${detail ? `\n${detail}` : ""}`
    );
  }
  return result.stdout ?? "";
}

function runInherit(command, args) {
  run(command, args, { stdio: "inherit", encoding: "utf8" });
}

function dockerInspectPid(name) {
  return run("docker", ["inspect", "-f", "{{.State.Pid}}", name]).trim();
}

function cleanup() {
  spawnSync("docker", ["rm", "-f", pyName, tsName], { stdio: "ignore" });
  spawnSync("sudo", ["ip", "link", "del", vethPy], { stdio: "ignore" });
  spawnSync("sudo", ["ip", "link", "del", vethTs], { stdio: "ignore" });
}

try {
  cleanup();

  runInherit("docker", ["compose", "-f", composeFile, "--profile", "auto-ts", "build", "auto-interop"]);

  // Hold both containers open with empty netns; attach veth before starting peers.
  runInherit("docker", [
    "run",
    "-d",
    "--name",
    pyName,
    "--network",
    "none",
    "--cap-add",
    "NET_ADMIN",
    "docker-auto-interop",
    "sleep",
    "infinity"
  ]);
  runInherit("docker", [
    "run",
    "-d",
    "--name",
    tsName,
    "--network",
    "none",
    "--cap-add",
    "NET_ADMIN",
    "-v",
    `${repoRoot}:/work`,
    "-w",
    "/work",
    "node:22-bookworm",
    "sleep",
    "infinity"
  ]);

  const pyPid = dockerInspectPid(pyName);
  const tsPid = dockerInspectPid(tsName);
  if (!/^\d+$/.test(pyPid) || !/^\d+$/.test(tsPid) || pyPid === "0" || tsPid === "0") {
    throw new Error(`could not resolve container PIDs (py=${pyPid}, ts=${tsPid})`);
  }

  runInherit("sudo", ["ip", "link", "add", vethPy, "type", "veth", "peer", "name", vethTs]);
  runInherit("sudo", ["ip", "link", "set", vethPy, "netns", pyPid]);
  runInherit("sudo", ["ip", "link", "set", vethTs, "netns", tsPid]);
  runInherit("sudo", ["nsenter", "-t", pyPid, "-n", "ip", "link", "set", "lo", "up"]);
  runInherit("sudo", ["nsenter", "-t", tsPid, "-n", "ip", "link", "set", "lo", "up"]);
  runInherit("sudo", ["nsenter", "-t", pyPid, "-n", "ip", "link", "set", vethPy, "up"]);
  runInherit("sudo", ["nsenter", "-t", tsPid, "-n", "ip", "link", "set", vethTs, "up"]);
  spawnSync("sleep", ["2"], { stdio: "inherit" });

  const pyAddrs = run("sudo", ["nsenter", "-t", pyPid, "-n", "ip", "-6", "addr", "show", "dev", vethPy]);
  const tsAddrs = run("sudo", ["nsenter", "-t", tsPid, "-n", "ip", "-6", "addr", "show", "dev", vethTs]);
  if (!pyAddrs.includes("fe80:") || !tsAddrs.includes("fe80:")) {
    throw new Error(`missing fe80 on veth pair\npython:\n${pyAddrs}\nts:\n${tsAddrs}`);
  }

  // Start Python peer now that its link-local iface exists.
  runInherit("docker", [
    "exec",
    "-d",
    "-w",
    "/conformance/scenarios/python",
    pyName,
    "sh",
    "-c",
    "python auto_interop.py > /tmp/auto-interop.log 2>&1"
  ]);

  const readyDeadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < readyDeadline) {
    const probe = spawnSync(
      "docker",
      ["exec", pyName, "sh", "-c", "grep -c '^READY ' /tmp/auto-interop.log 2>/dev/null || true"],
      { encoding: "utf8" }
    );
    if ((probe.stdout ?? "").trim() !== "" && Number.parseInt((probe.stdout ?? "0").trim(), 10) > 0) {
      ready = true;
      break;
    }
    spawnSync("sleep", ["1"], { stdio: "ignore" });
  }
  if (!ready) {
    throw new Error("Python AutoInterface peer did not print READY within 30s");
  }

  runInherit("docker", [
    "exec",
    "-e",
    "AUTO_INTEROP_IN_COMPOSE=1",
    tsName,
    "node",
    "conformance/auto-interop/run.mjs"
  ]);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  // Surface the first line in GitHub Actions annotations (public via check-runs API).
  console.error(`::error::auto-interop:compose failed: ${message.split("\n")[0]}`);
  console.error(message);
  const pyLog = spawnSync("docker", ["exec", pyName, "cat", "/tmp/auto-interop.log"], { encoding: "utf8" });
  if (pyLog.stdout || pyLog.stderr) {
    const text = `${pyLog.stdout ?? ""}${pyLog.stderr ?? ""}`.trim();
    console.error(`Python peer log:\n${text}`);
    const preview = text.split("\n").slice(0, 8).join(" | ");
    if (preview) console.error(`::error::auto-interop python peer: ${preview.slice(0, 200)}`);
  }
  process.exitCode = 1;
} finally {
  cleanup();
}
