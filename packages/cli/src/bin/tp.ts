#!/usr/bin/env node
import { runInit, runPack, runPublish, runSeed, runSign, runUpdate, printHelp } from "../commands/index.js";

const [command, ...args] = process.argv.slice(2);

if (command === undefined || command === "--help" || command === "-h") {
  console.log("tp — TwistedPear publish tooling");
  console.log("Commands: init, pack, sign, publish, update, seed");
  process.exit(0);
}

const handlers: Record<string, (ctx: { cwd: string; args: string[] }) => Promise<number>> = {
  init: runInit,
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

handler({ cwd: process.cwd(), args })
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
