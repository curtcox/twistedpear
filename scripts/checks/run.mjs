#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gates } from "./registry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const value = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const tier = value("tier") ?? "pr";
const only = value("only");
const requiredFilter = value("requires");
const matrix = args.includes("--matrix");

function hasCommand(command, commandArgs = ["--version"]) {
  return spawnSync(command, commandArgs, { encoding: "utf8" }).status === 0;
}

function requirementAvailable(requirement) {
  if (requirement === "node") return true;
  if (requirement === "macos") return process.platform === "darwin";
  if (requirement === "jvm") return hasCommand("java");
  if (requirement === "rust") return hasCommand("cargo");
  if (requirement === "python") return hasCommand("python3");
  if (requirement === "actionlint") return hasCommand("actionlint", ["-version"]);
  return hasCommand(requirement);
}

let selected = gates.filter((gate) => gate.tier === tier);
if (only) selected = selected.filter((gate) => gate.id === only);
if (requiredFilter) {
  const allowed = new Set(requiredFilter.split(","));
  selected = selected.filter((gate) => gate.requires.every((requirement) => allowed.has(requirement)));
}
if (only && selected.length === 0) {
  console.error(`Unknown ${tier} gate: ${only}`);
  process.exit(2);
}

if (matrix) {
  process.stdout.write(JSON.stringify(selected.map(({ id, title, os: runner }) => ({ id, title, runner }))));
  process.exit(0);
}

let failed = 0;
for (const gate of selected) {
  const missing = gate.requires.filter((requirement) => !requirementAvailable(requirement));
  if (missing.length > 0) {
    const message = `${gate.title}: missing ${missing.join(", ")}`;
    if (process.env.CI) {
      console.error(`FAIL ${message}`);
      failed += 1;
    } else {
      console.log(`SKIP ${message}`);
    }
    continue;
  }

  const startedAt = new Date().toISOString();
  console.log(`\n==> ${gate.title} (${gate.id})`);
  const result = spawnSync(gate.command[0], gate.command.slice(1), {
    cwd: ROOT,
    env: { ...process.env, CHECK_ID: gate.id },
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  const exitCode = result.status ?? 1;
  const artifact = {
    id: gate.id,
    title: gate.title,
    command: gate.command.join(" "),
    requires: gate.requires,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode,
    ok: exitCode === 0,
    host: `${os.platform()}-${os.arch()}`
  };
  const artifactPath = path.join(ROOT, "artifacts", "checks", `${gate.id}.json`);
  const logPath = path.join(ROOT, "artifacts", "logs", `${gate.id}.log`);
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  fs.writeFileSync(
    logPath,
    [`$ ${gate.command.join(" ")}`, `exit: ${exitCode}`, "", stdout, stderr ? `\n--- stderr ---\n${stderr}` : ""].join("\n")
  );
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## ${gate.title}\n\n| Gate | Result | Duration |\n|---|---:|---:|\n| \`${gate.id}\` | ${exitCode === 0 ? "PASS" : "FAIL"} | ${Date.parse(artifact.finishedAt) - Date.parse(startedAt)} ms |\n\n`
    );
  }
  if (exitCode !== 0) failed += 1;
}

console.log(`\nStatic-analysis gates: ${selected.length - failed}/${selected.length} passed.`);
if (failed > 0) process.exit(1);
