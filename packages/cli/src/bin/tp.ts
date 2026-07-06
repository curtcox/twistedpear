#!/usr/bin/env node
import { runCreate, runDev, runInit, runPack, runPublish, runSeed, runSign, runUpdate, printHelp } from "../commands/index.js";

const [command, ...args] = process.argv.slice(2);

if (command === undefined || command === "--help" || command === "-h") {
  console.log("tp — TwistedPear publish tooling");
  console.log("Commands: init, create, dev, pack, sign, publish, update, seed");
  process.exit(0);
}

const handlers: Record<string, (ctx: { cwd: string; args: string[] }) => Promise<number>> = {
  init: runInit,
  create: runCreate,
  dev: runDev,
  pack: runPack,
  sign: runSign,
  publish: runPublish,
  update: runUpdate,
  seed: runSeed
};

const handler = handlers[command];
if (handler === undefined) {
  console.error(`Unknown command: ${command}`);
  printHelp(command);
  process.exit(1);
}

if (args.includes("--help") || args.includes("-h")) {
  printHelp(command);
  process.exit(0);
}

handler({ cwd: process.cwd(), args })
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
