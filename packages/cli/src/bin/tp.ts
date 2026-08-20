#!/usr/bin/env node
import {
  runApp,
  runCreate,
  runDev,
  runGuida,
  runIdentity,
  runInit,
  runNode,
  runPack,
  runPublish,
  runSeed,
  runSign,
  runTrust,
  runUpdate,
  printHelp,
  type CommandContext,
} from "../commands/index.js";
import { readHiddenSecret } from "./secret-reader.js";

const [command, ...args] = process.argv.slice(2);

if (command === undefined || command === "--help" || command === "-h") {
  console.log("tp — TwistedPear publish tooling");
  console.log(
    "Commands: init, identity, create, guida, app, dev, pack, sign, publish, update, seed, node, trust",
  );
  process.exit(0);
}

const handlers: Record<string, (ctx: CommandContext) => Promise<number>> = {
  init: runInit,
  identity: runIdentity,
  create: runCreate,
  guida: runGuida,
  app: runApp,
  dev: runDev,
  pack: runPack,
  sign: runSign,
  publish: runPublish,
  update: runUpdate,
  seed: runSeed,
  node: runNode,
  trust: runTrust,
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

const identityCommands = new Set([
  "init",
  "identity",
  "dev",
  "pack",
  "sign",
  "publish",
  "update",
  "seed",
  "node",
]);
const environmentPassphrase = process.env.TP_IDENTITY_PASSPHRASE;
const identityPassphrase = identityCommands.has(command)
  ? (environmentPassphrase ?? (await readHiddenSecret("Identity passphrase")))
  : undefined;
const identityPassphraseConfirmation =
  command === "init" && environmentPassphrase === undefined
    ? await readHiddenSecret("Confirm identity passphrase")
    : identityPassphrase;

handler({
  cwd: process.cwd(),
  args,
  ...(identityPassphrase === undefined ? {} : { identityPassphrase }),
  ...(identityPassphraseConfirmation === undefined
    ? {}
    : { identityPassphraseConfirmation }),
  interactive: process.stdin.isTTY === true && process.stdout.isTTY === true,
  readSecret: readHiddenSecret,
})
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
