import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { authorAttackStrategies } from "../../packages/sim-adversaries/dist/index.js";

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
const output = {
  schema: "twistedpear.model-authored-attacks-v1",
  context,
  accepted: result.accepted.map((entry) => ({ proposal: entry.proposal, powers: entry.powers })),
  rejected: result.rejected
};
const body = `${JSON.stringify(output, (_key, value) => value instanceof Uint8Array
  ? { $bytes: [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("") } : value, 2)}\n`;
const destination = process.env.SIM_ATTACK_OUTPUT;
if (destination === undefined) process.stdout.write(body);
else { writeFileSync(destination, body); console.error(`wrote ${result.accepted.length} compiled strategies to ${destination}`); }

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
