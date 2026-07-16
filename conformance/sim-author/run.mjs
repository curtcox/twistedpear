import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { serializeHistory } from "../../packages/effects/dist/adapters/sim/index.js";
import { authorAttackStrategies, executeAuthoredStrategies } from "../../packages/sim-adversaries/dist/index.js";

const separator = process.argv.indexOf("--");
const command = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2);
if (command.length === 0) throw new Error("usage: npm run sim:author -- -- <model-command> [args...]");

const context = {
  objective: process.env.SIM_ATTACK_OBJECTIVE ?? "Find authority replay, revocation, duplication, and containment failures",
  allowedPowers: ["drop", "delay", "reorder", "duplicate", "inject"],
  nodes: (process.env.SIM_ATTACK_NODES ?? "app,host,peer,relay").split(",").filter(Boolean),
  channels: (process.env.SIM_ATTACK_CHANNELS ?? "grant,broker,link,key-share").split(",").filter(Boolean),
  maxProposals: 16
};

const result = await authorAttackStrategies((prompt) => runModelCommand(command, prompt), context);
const executions = executeAuthoredStrategies(result.accepted, integerEnv("SIM_ATTACK_SEED", 44));
const output = {
  schema: "twistedpear.model-authored-attacks-v1",
  provenance: {
    modelTool: process.env.SIM_ATTACK_MODEL_VERSION ?? command.join(" "),
    command,
    generatedAt: process.env.SIM_ATTACK_GENERATED_AT ?? new Date().toISOString(),
    rawResponse: result.rawResponse
  },
  context,
  accepted: result.accepted.map((entry) => ({ proposal: entry.proposal, powers: entry.powers })),
  rejected: result.rejected,
  executions: executions.map((entry) => ({ proposal: entry.proposal,
    finding: entry.finding?.violation ?? null,
    minimizedTraceLength: entry.minimized?.trace.length ?? null }))
};
const body = `${JSON.stringify(output, (_key, value) => value instanceof Uint8Array
  ? { $bytes: [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("") } : value, 2)}\n`;
const destination = process.env.SIM_ATTACK_OUTPUT;
if (destination === undefined) process.stdout.write(body);
else { mkdirSync(dirname(resolve(destination)), { recursive: true }); writeFileSync(destination, body);
  console.error(`wrote ${result.accepted.length} executed strategies to ${destination}`); }

const fixtureDestination = process.env.SIM_ATTACK_FIXTURE;
if (fixtureDestination !== undefined) {
  const retained = executions.find((entry) => entry.minimized !== null) ?? executions[0];
  if (retained === undefined) throw new Error("model produced no accepted strategy to retain");
  const fixture = {
    schema: "twistedpear.model-authored-regression-v1",
    proposal: retained.proposal,
    expectedOracle: retained.minimized?.violation?.oracle ?? null,
    history: retained.minimized === null ? null : JSON.parse(serializeHistory(retained.minimized))
  };
  mkdirSync(dirname(resolve(fixtureDestination)), { recursive: true });
  writeFileSync(fixtureDestination, `${JSON.stringify(fixture, bytesReplacer, 2)}\n`);
}

function runModelCommand([executable, ...args], prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ["pipe", "pipe", "inherit"] });
    let stdout = "";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("strategy model timed out")); }, 120_000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`strategy model exited with status ${code}`));
    });
    child.stdin.end(prompt);
  });
}

function bytesReplacer(_key, value) {
  return value instanceof Uint8Array
    ? { $bytes: [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("") }
    : value;
}

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be an integer`);
  return value;
}
