import { existsSync } from "node:fs";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
} from "@twistedpear/app-registry";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import {
  ensureDir,
  loadConfig,
  readBytes,
  resolveFromCwd,
  saveConfig,
} from "../config.js";
import {
  atomicWritePrivateFile,
  decryptIdentityBackup,
  encryptIdentityBackup,
  identityFromRecoveryWords,
  identityHashHex,
  identityToRecoveryWords,
  persistEncryptedIdentity,
  validateNewIdentityPassphrase,
} from "@twistedpear/host-core";
import {
  type CommandContext,
  cliTrustStore,
  confirmIdentityReplacement,
  hasFlag,
  loadIdentity,
  parseFlag,
  printHelp,
  readRequiredSecret,
  rememberSessionPassphrase,
  requiredPassphrase,
} from "./helpers.js";

export function runInit(ctx: CommandContext): Promise<number> {
  const config = loadConfig(ctx.cwd);
  const provider = new NodeCryptoProvider();
  const identityPath = resolveFromCwd(ctx.cwd, config.identityPath);

  if (existsSync(identityPath) && !hasFlag(ctx.args, "--force")) {
    loadIdentity(provider, identityPath, ctx);
    console.log(`Identity already exists at ${identityPath}`);
    return Promise.resolve(0);
  }

  ensureDir(resolveFromCwd(ctx.cwd, ".tp"));
  const identity = new Identity(provider);
  const passphrase = requiredPassphrase(ctx);
  validateNewIdentityPassphrase(
    passphrase,
    ctx.identityPassphraseConfirmation ?? passphrase,
  );
  persistEncryptedIdentity(provider, identityPath, identity, passphrase);
  rememberSessionPassphrase(ctx.cwd, passphrase);
  saveConfig(ctx.cwd, config);
  console.log(`Publisher identity: ${bytesToHex(identity.getPublicKey())}`);
  return Promise.resolve(0);
}

export async function runIdentity(ctx: CommandContext): Promise<number> {
  const provider = new NodeCryptoProvider();
  const config = loadConfig(ctx.cwd);
  const identityPath = resolveFromCwd(ctx.cwd, config.identityPath);
  const [operation, suboperation] = ctx.args;

  if (operation === "export") return exportIdentity(ctx, provider, identityPath);
  if (operation === "import") return importIdentity(ctx, provider, identityPath);
  if (operation === "recovery" && suboperation === "show")
    return showRecovery(ctx, provider, identityPath);
  if (operation === "recovery" && suboperation === "import")
    return importRecovery(ctx, provider, identityPath);
  if (operation === "change-passphrase")
    return changePassphrase(ctx, provider, identityPath);

  printHelp("identity");
  return 1;
}

async function exportIdentity(
  ctx: CommandContext,
  provider: NodeCryptoProvider,
  identityPath: string,
): Promise<number> {
  const identity = loadIdentity(provider, identityPath, ctx);
  const backupPassphrase = await readRequiredSecret(ctx, "Backup passphrase");
  const confirmation = await readRequiredSecret(
    ctx,
    "Confirm backup passphrase",
  );
  validateNewIdentityPassphrase(backupPassphrase, confirmation);
  const outputPath = resolveFromCwd(
    ctx.cwd,
    parseFlag(ctx.args, "--out") ?? "identity.tpidentity",
  );
  if (existsSync(outputPath) && !hasFlag(ctx.args, "--force"))
    throw new Error(`Refusing to overwrite ${outputPath}`);
  const backup = encryptIdentityBackup(provider, identity, backupPassphrase);
  try {
    atomicWritePrivateFile(outputPath, backup);
  } finally {
    backup.fill(0);
  }
  console.log(
    `Exported encrypted identity ${identityHashHex(identity).slice(0, 12)} to ${outputPath}`,
  );
  return 0;
}

async function importIdentity(
  ctx: CommandContext,
  provider: NodeCryptoProvider,
  identityPath: string,
): Promise<number> {
  const input = ctx.args[1];
  if (input === undefined || input.startsWith("--"))
    throw new Error("tp identity import requires a .tpidentity file");
  const backupPassphrase = await readRequiredSecret(ctx, "Backup passphrase");
  const candidate = decryptIdentityBackup(
    provider,
    readBytes(resolveFromCwd(ctx.cwd, input)),
    backupPassphrase,
  );
  await maybeReplaceIdentity(ctx, provider, identityPath, candidate);
  persistImportedIdentity(ctx, provider, identityPath, candidate);
  console.log(
    `Imported identity ${identityHashHex(candidate).slice(0, 12)}; restart the host`,
  );
  return 0;
}

function showRecovery(
  ctx: CommandContext,
  provider: NodeCryptoProvider,
  identityPath: string,
): Promise<number> {
  const identity = loadIdentity(provider, identityPath, ctx);
  const words = identityToRecoveryWords(identity);
  console.log(
    "Anyone with these words is you. Store them offline. TwistedPear cannot reset or revoke them.",
  );
  console.log(`TwistedPear identity 1/2: ${words.first}`);
  console.log(`TwistedPear identity 2/2: ${words.second}`);
  return Promise.resolve(0);
}

async function importRecovery(
  ctx: CommandContext,
  provider: NodeCryptoProvider,
  identityPath: string,
): Promise<number> {
  const first = await readRequiredSecret(ctx, "TwistedPear identity 1/2");
  const second = await readRequiredSecret(ctx, "TwistedPear identity 2/2");
  const candidate = identityFromRecoveryWords(provider, { first, second });
  await maybeReplaceIdentity(
    ctx,
    provider,
    identityPath,
    candidate,
    "An identity already exists; repeat with --force to replace it",
  );
  persistImportedIdentity(ctx, provider, identityPath, candidate);
  console.log(
    `Recovered identity ${identityHashHex(candidate).slice(0, 12)}; restart the host`,
  );
  return 0;
}

async function changePassphrase(
  ctx: CommandContext,
  provider: NodeCryptoProvider,
  identityPath: string,
): Promise<number> {
  const identity = loadIdentity(provider, identityPath, ctx);
  const next = await readRequiredSecret(ctx, "New identity passphrase");
  const confirmation = await readRequiredSecret(
    ctx,
    "Confirm new identity passphrase",
  );
  validateNewIdentityPassphrase(next, confirmation);
  persistEncryptedIdentity(provider, identityPath, identity, next);
  console.log(
    `Changed passphrase for identity ${identityHashHex(identity).slice(0, 12)}`,
  );
  return 0;
}

async function maybeReplaceIdentity(
  ctx: CommandContext,
  provider: NodeCryptoProvider,
  identityPath: string,
  candidate: Identity,
  existingMessage = "An identity already exists; inspect the candidate and repeat with --force to replace it",
): Promise<void> {
  if (!existsSync(identityPath)) return;
  if (!hasFlag(ctx.args, "--force")) {
    throw new Error(existingMessage);
  }
  await confirmIdentityReplacement(
    ctx,
    loadIdentity(provider, identityPath, ctx, false),
    candidate,
  );
}

function persistImportedIdentity(
  ctx: CommandContext,
  provider: NodeCryptoProvider,
  identityPath: string,
  candidate: Identity,
): void {
  const vaultPassphrase = requiredPassphrase(ctx);
  validateNewIdentityPassphrase(vaultPassphrase, vaultPassphrase);
  persistEncryptedIdentity(provider, identityPath, candidate, vaultPassphrase);
}

export async function runTrust(ctx: CommandContext): Promise<number> {
  const [subcommand, ...rest] = ctx.args;
  const store = cliTrustStore(ctx.cwd);
  if (subcommand === "list") return runTrustList(store);
  if (subcommand === "show") return runTrustShow(ctx);
  if (subcommand === "add") return runTrustAdd(store, rest);
  if (subcommand === "remove") return runTrustRemove(store, rest);
  printHelp("trust");
  return 1;
}

async function runTrustList(
  store: ReturnType<typeof cliTrustStore>,
): Promise<number> {
  const entries = await store.list();
  if (entries.length === 0) {
    console.log("No trusted publishers");
    return 0;
  }
  for (const entry of entries) {
    console.log(`${entry.label}\t${entry.publisherPublicKey}`);
  }
  return 0;
}

function runTrustShow(ctx: CommandContext): number {
  const provider = new NodeCryptoProvider();
  const config = loadConfig(ctx.cwd);
  const identity = loadIdentity(
    provider,
    resolveFromCwd(ctx.cwd, config.identityPath),
    ctx,
  );
  console.log(encodePublisherIdentity256t(identity.getPublicKey()));
  return 0;
}

async function runTrustAdd(
  store: ReturnType<typeof cliTrustStore>,
  rest: string[],
): Promise<number> {
  const identityString = rest[0];
  const label = parseFlag(rest, "--label");
  if (identityString === undefined || label === null) {
    printHelp("trust");
    return 1;
  }
  const publisherPublicKey = decodePublisherIdentity256t(identityString);
  await store.add({
    publisherPublicKey,
    label,
    addedAt: Date.now(),
    source: "paste",
  });
  console.log(`Trusted ${label} (${publisherPublicKey.slice(0, 16)}…)`);
  return 0;
}

async function runTrustRemove(
  store: ReturnType<typeof cliTrustStore>,
  rest: string[],
): Promise<number> {
  const target = rest[0];
  if (target === undefined) {
    printHelp("trust");
    return 1;
  }
  const publisherPublicKey =
    target.length === 94 ? decodePublisherIdentity256t(target) : target;
  await store.remove(publisherPublicKey);
  console.log(`Removed ${publisherPublicKey.slice(0, 16)}…`);
  return 0;
}
