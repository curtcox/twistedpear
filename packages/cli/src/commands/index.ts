import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOST_API_VERSION, validateManifestCapabilities } from "@twistedpear/miniapp-runtime";
import {
  TrustStore,
  buildAppAnnounceSummary,
  buildUnsignedManifest,
  decodePublisherIdentity256t,
  encodeAppAnnounceData,
  encodePublisherIdentity256t,
  packPackage,
  signManifest,
  unpackPackage,
  type PackageFile
} from "@twistedpear/app-registry";
import {
  casAnnounceAspects,
  encode256t,
  encodeCasLocator,
  signCasLocator,
  type CasLocator
} from "@twistedpear/cas-256t";
import {
  DriveManager,
  attachPackageResourceServer,
  createSwarm
} from "@twistedpear/bridge-hyper";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  Reticulum,
  bytesToHex,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
import { ensureDir, loadConfig, readBytes, resolveFromCwd, saveConfig, writeBytes } from "../config.js";
import { isSeederStateDir, registerDriveWithSeederQuota } from "../seed/register.js";
import {
  DEFAULT_QUOTAS,
  atomicWritePrivateFile,
  decryptIdentityBackup,
  encryptIdentityBackup,
  identityFromRecoveryWords,
  identityHashHex,
  identityToRecoveryWords,
  isEncryptedIdentityBackup,
  persistEncryptedIdentity,
  validateNewIdentityPassphrase
} from "@twistedpear/host-core";
import { startDevServer } from "../dev/server.js";

export interface CommandContext {
  readonly cwd: string;
  readonly args: ReadonlyArray<string>;
  readonly identityPassphrase?: string;
  readonly identityPassphraseConfirmation?: string;
  readonly readSecret?: (prompt: string) => Promise<string>;
  readonly interactive?: boolean;
}

const sessionPassphrases = new Map<string, string>();

export function printHelp(command: string): void {
  const help: Record<string, string> = {
    init: "tp init [--force]  Create/load publisher Reticulum identity",
    identity: "tp identity <export|import|recovery show|recovery import|change-passphrase>",
    create: "tp create <hello|chat-min> [app-dir]  Scaffold a mini-app template",
    dev: "tp dev <app-dir> [--host 127.0.0.1:34987]  Build and side-load to a dev-mode host",
    pack: "tp pack <app-dir> [--out <file.tpkg>]  Build unsigned package archive",
    sign: "tp sign <file.tpkg>  Re-sign an existing package archive",
    publish: "tp publish <app-dir> [--freenet] [--freenet-node <ws-url>] [--freenet-token <token>] [--freenet-contract <wasm>]  Pack, sign, publish to Hyperdrive and optionally Freenet",
    update: "tp update <app-dir> --version <semver>  Bump version and republish",
    seed: "tp seed [--state-dir <path>] [--transport] [--propagation] [--attach-rnsd host:port]  Run headless seeder",
    node: "tp node [--data-dir <path>] [--no-transport] [--no-seeder] [--propagation] [--attach-rnsd host:port] [--ws-listen [host:]port] [--ws-token <token>] [--serve-web [dir]] [--status-endpoint [port]] [--test-agent host:port[:label]] [--freenet [ws-url]] [--freenet-node <ws-url>] [--freenet-token <token>] [--freenet-binary <path>] [--freenet-binary-sha256 <hex>] [--freenet-interface] [--freenet-rendezvous <64hex>] [--freenet-direction <0|1>]  Run desktop-class host node",
    trust: "tp trust <list|show|add <256t> --label <name>|remove <key-or-256t>>  Manage trusted publishers"
  };

  console.log(help[command] ?? `tp ${command}`);
}

const TEMPLATE_SOURCES = {
  hello: {
    name: "hello-miniapp",
    capabilities: [],
    entry: `import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Hello from TwistedPear" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "body", type: "text", props: { value: "This widget tree is rendered by the host." } }
    ]
  }
});
`
  },
  "chat-min": {
    name: "chat-min",
    capabilities: ["identity", "lxmf:send", "lxmf:receive"],
    entry: `import { identity, lxmf, ui } from "@twistedpear/miniapp-sdk";

const destination = await identity.destinationHash();
await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Chat" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "me", type: "text", props: { value: \`Destination: \${destination}\` } },
      { id: "refresh", type: "button", props: { label: "Check inbox", event: "inbox.refresh" } }
    ]
  }
});

await lxmf.receive();
`
  }
} as const;

function parseFlag(args: ReadonlyArray<string>, flag: string): string | null {
  const index = args.indexOf(flag);
  if (index < 0 || index + 1 >= args.length) {
    return null;
  }

  return args[index + 1] ?? null;
}

function hasFlag(args: ReadonlyArray<string>, flag: string): boolean {
  return args.includes(flag);
}

function parseOptionalFlagValue(
  args: ReadonlyArray<string>,
  flag: string
): string | null {
  const index = args.indexOf(flag);
  const candidate = index < 0 ? undefined : args[index + 1];
  return candidate === undefined || candidate.startsWith("--") ? null : candidate;
}

function requiredPassphrase(ctx: CommandContext): string {
  const passphrase = ctx.identityPassphrase ?? sessionPassphrases.get(ctx.cwd);
  if (passphrase === undefined || passphrase.length === 0) {
    throw new Error("Identity passphrase required (set TP_IDENTITY_PASSPHRASE or use an interactive terminal)");
  }
  return passphrase;
}

function loadIdentity(
  provider: NodeCryptoProvider,
  path: string,
  ctx: CommandContext,
  migrateLegacy = true
): Identity {
  const bytes = readBytes(path);
  const encrypted = isEncryptedIdentityBackup(bytes);
  const passphrase = requiredPassphrase(ctx);
  const identity = encrypted
    ? decryptIdentityBackup(provider, bytes, passphrase)
    : Identity.fromBytes(provider, bytes);
  if (identity === null) {
    throw new Error(`Invalid identity at ${path}`);
  }

  if (!encrypted && migrateLegacy) {
    validateNewIdentityPassphrase(passphrase, ctx.identityPassphraseConfirmation ?? passphrase);
    persistEncryptedIdentity(provider, path, identity, passphrase);
    sessionPassphrases.set(ctx.cwd, passphrase);
  }

  return identity;
}

function collectAppFiles(appDir: string): PackageFile[] {
  const files: PackageFile[] = [];

  const walk = (relativeDir: string) => {
    const absolute = join(appDir, relativeDir);
    for (const entry of readdirSync(absolute)) {
      const rel = join(relativeDir, entry);
      const full = join(appDir, rel);
      const stats = statSync(full);
      if (stats.isDirectory()) {
        walk(rel);
      } else if (entry !== "app.manifest.json") {
        files.push({ path: rel.split("\\").join("/"), content: readBytes(full) });
      }
    }
  };

  walk(".");
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function readAppManifest(appDir: string) {
  const manifestPath = join(appDir, "app.manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing app.manifest.json in ${appDir}`);
  }

  return JSON.parse(readFileSync(manifestPath, "utf8")) as {
    name: string;
    version: string;
    entry: string;
    capabilities?: string[];
    icon?: string | null;
    minHostApi?: string;
  };
}

function writeTemplate(appDir: string, templateName: keyof typeof TEMPLATE_SOURCES): void {
  if (existsSync(appDir)) {
    throw new Error(`Refusing to overwrite existing directory: ${appDir}`);
  }

  const template = TEMPLATE_SOURCES[templateName];
  ensureDir(appDir);
  writeFileSync(
    join(appDir, "app.manifest.json"),
    `${JSON.stringify(
      {
        name: template.name,
        version: "0.1.0",
        entry: "bundle.js",
        capabilities: template.capabilities,
        icon: null,
        minHostApi: HOST_API_VERSION
      },
      null,
      2
    )}\n`
  );
  writeFileSync(join(appDir, "bundle.js"), template.entry);
}

function writePublishMetadata(
  cwd: string,
  metadata: {
    driveKey: string;
    version: string;
    packageHash: string;
    destinationName?: string;
    appDataHex?: string;
    t256?: string;
    freenetContractKey?: string;
  }
) {
  ensureDir(resolveFromCwd(cwd, ".tp"));
  writeFileSync(join(cwd, ".tp", "publish.json"), `${JSON.stringify(metadata, null, 2)}\n`);
}

async function announcePublishedApp(options: {
  readonly identity: Identity;
  readonly manifest: ReturnType<typeof unpackPackage>["manifest"];
  readonly packageHash: string;
  readonly archiveBytes: Uint8Array;
  readonly driveManager: DriveManager;
  readonly casLocator?: CasLocator;
}): Promise<{ destinationName: string; appDataHex: string }> {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const publisherHash = bytesToHex(provider.sha256(options.identity.getPublicKey()).slice(0, 8));
  const nameHash = bytesToHex(provider.sha256(new TextEncoder().encode(options.manifest.name)).slice(0, 8));

  const destination = reticulum.registerDestination({
    provider,
    identity: options.identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", publisherHash, nameHash]
  });

  attachPackageResourceServer(destination, {
    async listVersions() {
      return options.driveManager.listVersions();
    },
    async fetchArchive(version) {
      return options.driveManager.fetchVersion(version);
    }
  });

  const summary = buildAppAnnounceSummary(provider, options.identity, {
    manifest: options.manifest,
    packageSize: options.archiveBytes.length,
    packageHash: options.packageHash,
    resourceAvailable: true
  });
  const appData = encodeAppAnnounceData(summary);
  await destination.announce({ appData });

  if (options.casLocator !== undefined) {
    const casDestination = reticulum.registerDestination({
      provider,
      identity: options.identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: casAnnounceAspects(options.casLocator.t256)
    });
    await casDestination.announce({ appData: encodeCasLocator(options.casLocator) });
  }

  const destinationName = `tp.app.${publisherHash}.${nameHash}`;
  await reticulum.stop();
  return { destinationName, appDataHex: bytesToHex(appData) };
}

export async function runInit(ctx: CommandContext): Promise<number> {
  const config = loadConfig(ctx.cwd);
  const provider = new NodeCryptoProvider();
  const identityPath = resolveFromCwd(ctx.cwd, config.identityPath);

  if (existsSync(identityPath) && !hasFlag(ctx.args, "--force")) {
    loadIdentity(provider, identityPath, ctx);
    console.log(`Identity already exists at ${identityPath}`);
    return 0;
  }

  ensureDir(resolveFromCwd(ctx.cwd, ".tp"));
  const identity = new Identity(provider);
  const passphrase = requiredPassphrase(ctx);
  validateNewIdentityPassphrase(passphrase, ctx.identityPassphraseConfirmation ?? passphrase);
  persistEncryptedIdentity(provider, identityPath, identity, passphrase);
  sessionPassphrases.set(ctx.cwd, passphrase);
  saveConfig(ctx.cwd, config);
  console.log(`Publisher identity: ${bytesToHex(identity.getPublicKey())}`);
  return 0;
}

async function readRequiredSecret(ctx: CommandContext, prompt: string): Promise<string> {
  if (ctx.readSecret === undefined) throw new Error(`${prompt} requires an interactive terminal`);
  const value = await ctx.readSecret(prompt);
  if (value.length === 0) throw new Error("Cancelled");
  return value;
}

async function confirmIdentityReplacement(
  ctx: CommandContext,
  current: Identity,
  candidate: Identity
): Promise<void> {
  if (ctx.interactive !== true) return;
  const currentHash = identityHashHex(current).slice(0, 12);
  const candidateHash = identityHashHex(candidate).slice(0, 12);
  const confirmation = await readRequiredSecret(
    ctx,
    `Replace identity ${currentHash} with ${candidateHash}? Type ${candidateHash}`
  );
  if (confirmation.trim().toLowerCase() !== candidateHash) {
    throw new Error("Identity replacement cancelled");
  }
}

export async function runIdentity(ctx: CommandContext): Promise<number> {
  const provider = new NodeCryptoProvider();
  const config = loadConfig(ctx.cwd);
  const identityPath = resolveFromCwd(ctx.cwd, config.identityPath);
  const [operation, suboperation] = ctx.args;

  if (operation === "export") {
    const identity = loadIdentity(provider, identityPath, ctx);
    const backupPassphrase = await readRequiredSecret(ctx, "Backup passphrase");
    const confirmation = await readRequiredSecret(ctx, "Confirm backup passphrase");
    validateNewIdentityPassphrase(backupPassphrase, confirmation);
    const outputPath = resolveFromCwd(ctx.cwd, parseFlag(ctx.args, "--out") ?? "identity.tpidentity");
    if (existsSync(outputPath) && !hasFlag(ctx.args, "--force")) throw new Error(`Refusing to overwrite ${outputPath}`);
    const backup = encryptIdentityBackup(provider, identity, backupPassphrase);
    try {
      atomicWritePrivateFile(outputPath, backup);
    } finally {
      backup.fill(0);
    }
    console.log(`Exported encrypted identity ${identityHashHex(identity).slice(0, 12)} to ${outputPath}`);
    return 0;
  }

  if (operation === "import") {
    const input = ctx.args[1];
    if (input === undefined || input.startsWith("--")) throw new Error("tp identity import requires a .tpidentity file");
    const backupPassphrase = await readRequiredSecret(ctx, "Backup passphrase");
    const candidate = decryptIdentityBackup(provider, readBytes(resolveFromCwd(ctx.cwd, input)), backupPassphrase);
    if (existsSync(identityPath)) {
      if (!hasFlag(ctx.args, "--force")) {
        throw new Error("An identity already exists; inspect the candidate and repeat with --force to replace it");
      }
      await confirmIdentityReplacement(ctx, loadIdentity(provider, identityPath, ctx, false), candidate);
    }
    const vaultPassphrase = requiredPassphrase(ctx);
    validateNewIdentityPassphrase(vaultPassphrase, vaultPassphrase);
    persistEncryptedIdentity(provider, identityPath, candidate, vaultPassphrase);
    console.log(`Imported identity ${identityHashHex(candidate).slice(0, 12)}; restart the host`);
    return 0;
  }

  if (operation === "recovery" && suboperation === "show") {
    const identity = loadIdentity(provider, identityPath, ctx);
    const words = identityToRecoveryWords(identity);
    console.log("Anyone with these words is you. Store them offline. TwistedPear cannot reset or revoke them.");
    console.log(`TwistedPear identity 1/2: ${words.first}`);
    console.log(`TwistedPear identity 2/2: ${words.second}`);
    return 0;
  }

  if (operation === "recovery" && suboperation === "import") {
    const first = await readRequiredSecret(ctx, "TwistedPear identity 1/2");
    const second = await readRequiredSecret(ctx, "TwistedPear identity 2/2");
    const candidate = identityFromRecoveryWords(provider, { first, second });
    if (existsSync(identityPath)) {
      if (!hasFlag(ctx.args, "--force")) {
        throw new Error("An identity already exists; repeat with --force to replace it");
      }
      await confirmIdentityReplacement(ctx, loadIdentity(provider, identityPath, ctx, false), candidate);
    }
    const vaultPassphrase = requiredPassphrase(ctx);
    validateNewIdentityPassphrase(vaultPassphrase, vaultPassphrase);
    persistEncryptedIdentity(provider, identityPath, candidate, vaultPassphrase);
    console.log(`Recovered identity ${identityHashHex(candidate).slice(0, 12)}; restart the host`);
    return 0;
  }

  if (operation === "change-passphrase") {
    const identity = loadIdentity(provider, identityPath, ctx);
    const next = await readRequiredSecret(ctx, "New identity passphrase");
    const confirmation = await readRequiredSecret(ctx, "Confirm new identity passphrase");
    validateNewIdentityPassphrase(next, confirmation);
    persistEncryptedIdentity(provider, identityPath, identity, next);
    console.log(`Changed passphrase for identity ${identityHashHex(identity).slice(0, 12)}`);
    return 0;
  }

  printHelp("identity");
  return 1;
}

export async function runCreate(ctx: CommandContext): Promise<number> {
  const templateName = ctx.args[0];
  if (templateName !== "hello" && templateName !== "chat-min") {
    printHelp("create");
    return 1;
  }

  const appDir = resolveFromCwd(ctx.cwd, ctx.args[1] ?? TEMPLATE_SOURCES[templateName].name);
  writeTemplate(appDir, templateName);
  console.log(`Created ${templateName} mini-app at ${appDir}`);
  return 0;
}

export async function runDev(ctx: CommandContext): Promise<number> {
  const appDir = ctx.args[0];
  if (appDir === undefined) {
    printHelp("dev");
    return 1;
  }

  const resolvedAppDir = resolveFromCwd(ctx.cwd, appDir);
  const app = readAppManifest(resolvedAppDir);
  validateManifestCapabilities(app.capabilities ?? []);
  const host = parseFlag(ctx.args, "--host") ?? "127.0.0.1";
  const port = Number(parseFlag(ctx.args, "--port") ?? "34987");
  const config = loadConfig(ctx.cwd);
  const provider = new NodeCryptoProvider();
  const identityPath = resolveFromCwd(ctx.cwd, config.identityPath);
  const publisherPublicKey = existsSync(identityPath)
    ? bytesToHex(loadIdentity(provider, identityPath, ctx).getPublicKey())
    : "dev";

  const server = await startDevServer({
    appDir: resolvedAppDir,
    host,
    port,
    manifest: {
      name: app.name,
      version: app.version,
      entry: app.entry,
      capabilities: app.capabilities ?? [],
      publisherPublicKey,
      minHostApi: app.minHostApi ?? HOST_API_VERSION
    }
  });

  console.log(`Dev side-load ready for ${app.name} (${app.version})`);
  console.log(`Connect harness developer mode to ${server.url}`);
  console.log("Press Ctrl+C to stop.");

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => resolve());
    process.on("SIGTERM", () => resolve());
  });

  await server.close();
  return 0;
}

export async function runPack(ctx: CommandContext): Promise<number> {
  const appDir = ctx.args[0];
  if (appDir === undefined) {
    printHelp("pack");
    return 1;
  }

  const app = readAppManifest(resolveFromCwd(ctx.cwd, appDir));
  validateManifestCapabilities(app.capabilities ?? []);
  const provider = new NodeCryptoProvider();
  const config = loadConfig(ctx.cwd);
  const identity = loadIdentity(provider, resolveFromCwd(ctx.cwd, config.identityPath), ctx);
  const files = collectAppFiles(resolveFromCwd(ctx.cwd, appDir));

  const driveKey = existsSync(resolveFromCwd(ctx.cwd, ".tp/publish.json"))
    ? (JSON.parse(readFileSync(resolveFromCwd(ctx.cwd, ".tp/publish.json"), "utf8")) as { driveKey: string }).driveKey
    : "0".repeat(64);

  const unsigned = buildUnsignedManifest(
    {
      name: app.name,
      version: app.version,
      entry: app.entry,
      capabilities: app.capabilities ?? [],
      icon: app.icon ?? null,
      minHostApi: app.minHostApi ?? HOST_API_VERSION,
      driveKey,
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files
    },
    provider
  );

  const manifest = signManifest(provider, identity, unsigned);
  const packed = packPackage(provider, {
    ...manifest,
    signature: manifest.signature,
    files
  });

  const out = parseFlag(ctx.args, "--out") ?? `${app.name}-${app.version}.tpkg`;
  writeBytes(resolveFromCwd(ctx.cwd, out), packed.archiveBytes);
  console.log(`Wrote ${out} (${packed.packageHash})`);
  return 0;
}

export async function runSign(ctx: CommandContext): Promise<number> {
  const archivePath = ctx.args[0];
  if (archivePath === undefined) {
    printHelp("sign");
    return 1;
  }

  const provider = new NodeCryptoProvider();
  const config = loadConfig(ctx.cwd);
  const identity = loadIdentity(provider, resolveFromCwd(ctx.cwd, config.identityPath), ctx);
  const archive = readBytes(resolveFromCwd(ctx.cwd, archivePath));
  const unpacked = unpackPackage(provider, archive);
  const { signature: _old, ...unsigned } = unpacked.manifest;
  const manifest = signManifest(provider, identity, unsigned);
  const files = [...unpacked.files.entries()].map(([path, content]) => ({ path, content }));
  const packed = packPackage(provider, { ...manifest, signature: manifest.signature, files });
  writeBytes(resolveFromCwd(ctx.cwd, archivePath), packed.archiveBytes);
  console.log(`Re-signed ${archivePath}`);
  return 0;
}

export async function runPublish(ctx: CommandContext): Promise<number> {
  const appDir = ctx.args[0];
  if (appDir === undefined) {
    printHelp("publish");
    return 1;
  }

  const packCode = await runPack({
    cwd: ctx.cwd,
    args: [appDir, "--out", ".tp/last.tpkg"],
    ...(ctx.identityPassphrase === undefined ? {} : { identityPassphrase: ctx.identityPassphrase }),
    ...(ctx.readSecret === undefined ? {} : { readSecret: ctx.readSecret })
  });
  if (packCode !== 0) {
    return packCode;
  }

  const provider = new NodeCryptoProvider();
  const config = loadConfig(ctx.cwd);
  const identity = loadIdentity(provider, resolveFromCwd(ctx.cwd, config.identityPath), ctx);
  const archive = readBytes(resolveFromCwd(ctx.cwd, ".tp/last.tpkg"));
  const unpacked = unpackPackage(provider, archive);

  const swarm = createSwarm({ bootstrap: config.bootstrap });
  const drives = new DriveManager({
    storagePath: resolveFromCwd(ctx.cwd, config.storageDir),
    swarm
  });
  await drives.ready();

  let keyHex = unpacked.manifest.driveKey;
  if (keyHex === "0".repeat(64)) {
    const created = await drives.createDrive();
    keyHex = created.keyHex;
  } else {
    await drives.openDrive(keyHex);
  }

  const published = await drives.publishVersion(unpacked.manifest.version, archive, unpacked.packageHash);

  const t256 = encode256t(archive, (data: Uint8Array) => provider.sha512(data));
  const casLocator = signCasLocator(identity, {
    t256,
    appId: unpacked.manifest.name,
    version: unpacked.manifest.version,
    driveKey: keyHex,
    packageHash: unpacked.packageHash,
    packageSize: archive.length
  });

  let freenetContractKey: string | undefined;
  if (hasFlag(ctx.args, "--freenet")) {
    const {
      DEFAULT_FREENET_URL,
      FreenetClient,
      publishPackageToFreenet
    } = await import("@twistedpear/bridge-freenet");
    const defaultContractPath = fileURLToPath(
      new URL(
        "../../../bridge-freenet/contract/locator/locator-contract.wasm",
        import.meta.url
      )
    );
    const contractPath =
      parseFlag(ctx.args, "--freenet-contract") ?? defaultContractPath;
    if (!existsSync(contractPath)) {
      throw new Error(
        `Freenet locator contract not found at ${contractPath}; run npm run build:freenet-contract or pass --freenet-contract`
      );
    }
    const authToken = parseFlag(ctx.args, "--freenet-token");
    const client = new FreenetClient({
      url: parseFlag(ctx.args, "--freenet-node") ?? DEFAULT_FREENET_URL,
      ...(authToken === null ? {} : { authToken })
    });
    try {
      const result = await publishPackageToFreenet({
        provider,
        client,
        locatorContractWasm: readBytes(contractPath),
        locator: casLocator,
        archiveBytes: archive
      });
      freenetContractKey = bytesToHex(result.contractKey);
      console.log(
        `Published ${result.stateBytes} bytes to Freenet contract ${freenetContractKey}`
      );
    } finally {
      await client.close();
    }
  }

  const announce = await announcePublishedApp({
    identity,
    manifest: unpacked.manifest,
    packageHash: unpacked.packageHash,
    archiveBytes: archive,
    driveManager: drives,
    casLocator
  });

  if (isSeederStateDir(config.seederAddress)) {
    const evicted = registerDriveWithSeederQuota(
      resolveFromCwd(ctx.cwd, config.seederAddress),
      keyHex,
      published.version,
      published.packageHash,
      archive,
      DEFAULT_QUOTAS.seedStorageBytes
    );
    console.log(
      `Registered drive with seeder at ${config.seederAddress}${evicted > 0 ? ` (evicted ${evicted} archive(s) over quota)` : ""}`
    );
  }

  writePublishMetadata(ctx.cwd, {
    driveKey: keyHex,
    version: published.version,
    packageHash: published.packageHash,
    destinationName: announce.destinationName,
    appDataHex: announce.appDataHex,
    t256,
    ...(freenetContractKey === undefined ? {} : { freenetContractKey })
  });

  console.log(`Published ${published.version} to drive ${keyHex}`);
  console.log(`Announced ${announce.destinationName}`);
  console.log(`256t: ${t256}`);
  await drives.close();
  await swarm.destroy();
  return 0;
}

export async function runUpdate(ctx: CommandContext): Promise<number> {
  const version = parseFlag(ctx.args, "--version");
  if (version === null) {
    printHelp("update");
    return 1;
  }

  const appDir = ctx.args[0];
  if (appDir === undefined) {
    printHelp("update");
    return 1;
  }

  const manifestPath = resolveFromCwd(ctx.cwd, join(appDir, "app.manifest.json"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version: string };
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return runPublish({
    cwd: ctx.cwd,
    args: [appDir],
    ...(ctx.identityPassphrase === undefined ? {} : { identityPassphrase: ctx.identityPassphrase }),
    ...(ctx.readSecret === undefined ? {} : { readSecret: ctx.readSecret })
  });
}

export async function runSeed(ctx: CommandContext): Promise<number> {
  const { runSeeder } = await import("../seed/daemon.js");
  const stateDir = parseFlag(ctx.args, "--state-dir") ?? ".tp/seeder";
  const transport = hasFlag(ctx.args, "--transport");
  const propagation = hasFlag(ctx.args, "--propagation");
  const attachRnsd = parseFlag(ctx.args, "--attach-rnsd");
  await runSeeder({
    cwd: ctx.cwd,
    stateDir: resolveFromCwd(ctx.cwd, stateDir),
    transport,
    propagation,
    attachRnsd,
    statusEndpoint: hasFlag(ctx.args, "--status-endpoint"),
    identityPassphrase: requiredPassphrase(ctx)
  });
  return 0;
}

function cliTrustStore(cwd: string): TrustStore {
  const path = resolveFromCwd(cwd, ".tp/trust.json");
  return new TrustStore({
    async get(key) {
      if (!existsSync(path)) {
        return null;
      }

      const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
      const value = parsed[key];
      return value === undefined ? null : new TextEncoder().encode(value);
    },
    async set(key, value) {
      ensureDir(resolveFromCwd(cwd, ".tp"));
      const parsed = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, string>) : {};
      parsed[key] = new TextDecoder().decode(value);
      writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
    },
    async delete(key) {
      if (!existsSync(path)) {
        return;
      }

      const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
      delete parsed[key];
      writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
    }
  });
}

export async function runTrust(ctx: CommandContext): Promise<number> {
  const [subcommand, ...rest] = ctx.args;
  const store = cliTrustStore(ctx.cwd);

  if (subcommand === "list") {
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

  if (subcommand === "show") {
    const provider = new NodeCryptoProvider();
    const config = loadConfig(ctx.cwd);
    const identity = loadIdentity(provider, resolveFromCwd(ctx.cwd, config.identityPath), ctx);
    console.log(encodePublisherIdentity256t(identity.getPublicKey()));
    return 0;
  }

  if (subcommand === "add") {
    const identityString = rest[0];
    const label = parseFlag(rest, "--label");
    if (identityString === undefined || label === null) {
      printHelp("trust");
      return 1;
    }

    const publisherPublicKey = decodePublisherIdentity256t(identityString);
    await store.add({ publisherPublicKey, label, addedAt: Date.now(), source: "paste" });
    console.log(`Trusted ${label} (${publisherPublicKey.slice(0, 16)}…)`);
    return 0;
  }

  if (subcommand === "remove") {
    const target = rest[0];
    if (target === undefined) {
      printHelp("trust");
      return 1;
    }

    const publisherPublicKey = target.length === 94 ? decodePublisherIdentity256t(target) : target;
    await store.remove(publisherPublicKey);
    console.log(`Removed ${publisherPublicKey.slice(0, 16)}…`);
    return 0;
  }

  printHelp("trust");
  return 1;
}

export async function runNode(ctx: CommandContext): Promise<number> {
  const { resolveHostConfig, FreenetSupervisor } = await import("@twistedpear/host-core");
  const { runNodeHost } = await import("@twistedpear/host-core");
  const dataDir = parseFlag(ctx.args, "--data-dir");
  const attachRnsd = parseFlag(ctx.args, "--attach-rnsd");
  const wsListen = parseOptionalFlag(ctx.args, "--ws-listen");
  const wsToken = parseFlag(ctx.args, "--ws-token");
  const serveWeb = parseOptionalFlag(ctx.args, "--serve-web");
  const freenet = resolveFreenetNodeFlags(ctx.args);
  if (freenet.logLines.length > 0) {
    for (const line of freenet.logLines) {
      console.log(line);
    }
  }

  let supervisor: InstanceType<typeof FreenetSupervisor> | null = null;
  let freenetConfig = freenet.config;
  if (freenet.supervise !== null) {
    const resolvedDataDir =
      dataDir === null
        ? resolveHostConfig({}).dataDir
        : resolveFromCwd(ctx.cwd, dataDir);
    supervisor = new FreenetSupervisor({
      binaryPath: freenet.supervise.binaryPath,
      ...(freenet.supervise.expectedSha256 === undefined
        ? {}
        : { expectedSha256: freenet.supervise.expectedSha256 }),
      dataDir: resolvedDataDir,
      onStatus: (status, detail) => {
        const suffix = detail === undefined ? "" : `: ${detail}`;
        console.log(`Freenet supervisor ${status}${suffix}`);
      }
    });
    const snapshot = await supervisor.start();
    if (snapshot.wsUrl === null) {
      throw new Error("Freenet supervisor started without a WebSocket URL");
    }
    freenetConfig = {
      enabled: freenet.config?.enabled ?? false,
      url: snapshot.wsUrl,
      ...(snapshot.authToken === null ? {} : { authToken: snapshot.authToken }),
      ...(freenet.config?.rendezvousHex === undefined
        ? {}
        : { rendezvousHex: freenet.config.rendezvousHex }),
      ...(freenet.config?.localDirection === undefined
        ? {}
        : { localDirection: freenet.config.localDirection })
    };
    console.log(
      `Freenet supervised node online at ${snapshot.wsUrl} (user-supplied binary; not redistributed)`
    );
  }

  const statusEndpointPort = parseStatusEndpointPort(ctx.args);
  const testAgent = parseTestAgentArg(parseOptionalFlagValue(ctx.args, "--test-agent"));

  const config = resolveHostConfig({
    ...(dataDir === null ? {} : { dataDir: resolveFromCwd(ctx.cwd, dataDir) }),
    overrides: {
      roles: {
        transport: !hasFlag(ctx.args, "--no-transport") && attachRnsd === null,
        seeder: !hasFlag(ctx.args, "--no-seeder"),
        propagation: hasFlag(ctx.args, "--propagation"),
        attachRnsd:
          attachRnsd === null
            ? null
            : (() => {
                const [host, portText] = attachRnsd.split(":");
                if (host === undefined || portText === undefined) {
                  throw new Error(`Invalid --attach-rnsd value: ${attachRnsd}`);
                }

                return { host, port: Number.parseInt(portText, 10) };
              })()
      },
      interfaces: {
        ...(wsListen === null && serveWeb === null && wsToken === null
          ? {}
          : {
              websocket: {
                enabled: true,
                ...(wsListen === null ? {} : parseWsListenArg(wsListen)),
                ...(wsToken === null ? {} : { sharedToken: wsToken }),
                ...(serveWeb === null
                  ? {}
                  : { staticRoot: serveWeb === "" ? resolveFromCwd(ctx.cwd, "dist/web-host") : resolveFromCwd(ctx.cwd, serveWeb) })
              }
            }),
        ...(freenetConfig === null ? {} : { freenet: freenetConfig })
      },
      statusEndpoint: hasFlag(ctx.args, "--status-endpoint"),
      ...(statusEndpointPort === null ? {} : { statusEndpointPort }),
      ...(testAgent === null ? {} : { testAgent })
    }
  });

  const stopSupervisor = async () => {
    if (supervisor !== null) {
      await supervisor.stop();
      supervisor = null;
    }
  };
  // Registering a signal listener suppresses the default termination, so the
  // handler has to exit itself once the supervised node is down.
  const shutdown = (signal: NodeJS.Signals) => {
    void stopSupervisor().finally(() => {
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await runNodeHost({ config, identityPassphrase: requiredPassphrase(ctx) });
    return 0;
  } finally {
    await stopSupervisor();
  }
}

/**
 * Freenet node config for `tp node`.
 * `--freenet` / `--freenet-node` point at an external WebSocket URL.
 * `--freenet-binary` supervises a user-supplied, optionally hash-verified
 * executable (ephemeral port + generated token; not redistributed by TP).
 */
export function resolveFreenetNodeFlags(args: ReadonlyArray<string>): {
  readonly config: {
    readonly enabled: boolean;
    readonly url: string;
    readonly authToken?: string;
    readonly rendezvousHex?: string;
    readonly localDirection?: 0 | 1;
  } | null;
  readonly supervise: {
    readonly binaryPath: string;
    readonly expectedSha256?: string;
  } | null;
  readonly logLines: ReadonlyArray<string>;
} {
  const binaryPath = parseFlag(args, "--freenet-binary");
  const expectedSha256 = parseFlag(args, "--freenet-binary-sha256") ?? undefined;
  const wantSupervise = binaryPath !== null || hasFlag(args, "--freenet-supervise");
  const wantFreenet =
    hasFlag(args, "--freenet") ||
    hasFlag(args, "--freenet-interface") ||
    parseFlag(args, "--freenet-node") !== null ||
    wantSupervise;
  if (!wantFreenet) {
    return { config: null, supervise: null, logLines: [] };
  }

  if (wantSupervise && binaryPath === null) {
    throw new Error("--freenet-supervise requires --freenet-binary <path>");
  }
  if (expectedSha256 !== undefined && !/^[0-9a-fA-F]{64}$/.test(expectedSha256)) {
    throw new Error("--freenet-binary-sha256 must be 64 hex characters");
  }

  const url =
    parseFlag(args, "--freenet-node") ??
    parseOptionalFlagValue(args, "--freenet") ??
    "ws://127.0.0.1:50509/v1/contract/command";
  const authToken = parseFlag(args, "--freenet-token") ?? undefined;
  const interfaceEnabled = hasFlag(args, "--freenet-interface");
  let rendezvousHex = parseFlag(args, "--freenet-rendezvous") ?? undefined;
  const directionFlag = parseFlag(args, "--freenet-direction");
  const localDirection =
    directionFlag === null ? undefined : Number(directionFlag);
  const logLines: string[] = [];

  if (
    localDirection !== undefined &&
    localDirection !== 0 &&
    localDirection !== 1
  ) {
    throw new Error("--freenet-direction must be 0 or 1");
  }

  if (interfaceEnabled) {
    if (rendezvousHex === undefined) {
      const bytes = new Uint8Array(32);
      globalThis.crypto.getRandomValues(bytes);
      rendezvousHex = bytesToHex(bytes);
      logLines.push(
        `Freenet HDLC rendezvous (share with peer): ${rendezvousHex}`
      );
    } else if (!/^[0-9a-fA-F]{64}$/.test(rendezvousHex)) {
      throw new Error("--freenet-rendezvous must be 64 hex characters (32 bytes)");
    }
  } else if (rendezvousHex !== undefined && !/^[0-9a-fA-F]{64}$/.test(rendezvousHex)) {
    throw new Error("--freenet-rendezvous must be 64 hex characters (32 bytes)");
  }

  if (wantSupervise) {
    logLines.push(
      `Freenet supervision enabled for user-supplied binary ${binaryPath} (hash-verified when --freenet-binary-sha256 is set)`
    );
  } else {
    logLines.push(
      interfaceEnabled
        ? `Freenet HDLC interface enabled against ${url} (external node; not bundled)`
        : `Freenet URL configured for contracts/propagation mirror: ${url} (external node; not bundled)`
    );
  }

  return {
    config: wantSupervise
      ? {
          enabled: interfaceEnabled,
          url: "ws://127.0.0.1:0/v1/contract/command",
          ...(rendezvousHex === undefined ? {} : { rendezvousHex }),
          ...(localDirection === undefined
            ? {}
            : { localDirection: localDirection as 0 | 1 })
        }
      : {
          enabled: interfaceEnabled,
          url,
          ...(authToken === undefined ? {} : { authToken }),
          ...(rendezvousHex === undefined ? {} : { rendezvousHex }),
          ...(localDirection === undefined
            ? {}
            : { localDirection: localDirection as 0 | 1 })
        },
    supervise:
      binaryPath === null
        ? null
        : {
            binaryPath,
            ...(expectedSha256 === undefined ? {} : { expectedSha256 })
          },
    logLines
  };
}

function parseOptionalFlag(args: ReadonlyArray<string>, name: string): string | null {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }

  const next = args[index + 1];
  if (next === undefined || next.startsWith("--")) {
    return "";
  }

  return next;
}

/** `--status-endpoint [port]`; omitted or bare keeps the default loopback port. */
function parseStatusEndpointPort(args: ReadonlyArray<string>): number | null {
  const value = parseOptionalFlagValue(args, "--status-endpoint");
  if (value === null) {
    return null;
  }
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid --status-endpoint port: ${value}`);
  }
  return port;
}

/**
 * `--test-agent host:port[:label]` mounts the test-only peer control agent used
 * by `conformance/local-multipeer`. Never set on a default code path.
 */
function parseTestAgentArg(
  value: string | null
): { host: string; port: number; label: string } | null {
  if (value === null) {
    return null;
  }
  const [host, portText, label] = value.split(":");
  if (host === undefined || host === "" || portText === undefined) {
    throw new Error(`Invalid --test-agent value: ${value} (expected host:port[:label])`);
  }
  const port = Number.parseInt(portText, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid --test-agent port: ${value}`);
  }
  return { host, port, label: label === undefined || label === "" ? "tp-node" : label };
}

function parseWsListenArg(value: string): { listenHost: string; listenPort: number } {
  if (value === "") {
    return { listenHost: "127.0.0.1", listenPort: 9480 };
  }

  const colonIndex = value.lastIndexOf(":");
  if (colonIndex === -1) {
    const port = Number.parseInt(value, 10);
    if (!Number.isFinite(port)) {
      throw new Error(`Invalid --ws-listen port: ${value}`);
    }

    return { listenHost: "127.0.0.1", listenPort: port };
  }

  const host = value.slice(0, colonIndex);
  const port = Number.parseInt(value.slice(colonIndex + 1), 10);
  if (host === "" || !Number.isFinite(port)) {
    throw new Error(`Invalid --ws-listen value: ${value} (expected [host:]port)`);
  }

  return { listenHost: host, listenPort: port };
}
