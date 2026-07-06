import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOST_API_VERSION, validateManifestCapabilities } from "@twistedpear/miniapp-runtime";
import {
  buildAppAnnounceSummary,
  buildUnsignedManifest,
  encodeAppAnnounceData,
  packPackage,
  signManifest,
  unpackPackage,
  type PackageFile
} from "@twistedpear/app-registry";
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
import { isSeederStateDir, registerDriveWithSeeder } from "../seed/register.js";
import { startDevServer } from "../dev/server.js";

export interface CommandContext {
  readonly cwd: string;
  readonly args: ReadonlyArray<string>;
}

export function printHelp(command: string): void {
  const help: Record<string, string> = {
    init: "tp init [--force]  Create/load publisher Reticulum identity",
    create: "tp create <hello|chat-min> [app-dir]  Scaffold a mini-app template",
    dev: "tp dev <app-dir> [--host 127.0.0.1:34987]  Build and side-load to a dev-mode host",
    pack: "tp pack <app-dir> [--out <file.tpkg>]  Build unsigned package archive",
    sign: "tp sign <file.tpkg>  Re-sign an existing package archive",
    publish: "tp publish <app-dir>  Pack, sign, publish to Hyperdrive",
    update: "tp update <app-dir> --version <semver>  Bump version and republish",
    seed: "tp seed [--state-dir <path>] [--transport]  Run headless mirror/resource seeder"
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

function loadIdentity(provider: NodeCryptoProvider, path: string): Identity {
  const bytes = readBytes(path);
  const identity = Identity.fromBytes(provider, bytes);
  if (identity === null) {
    throw new Error(`Invalid identity at ${path}`);
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

  const destinationName = `tp.app.${publisherHash}.${nameHash}`;
  await reticulum.stop();
  return { destinationName, appDataHex: bytesToHex(appData) };
}

export async function runInit(ctx: CommandContext): Promise<number> {
  const config = loadConfig(ctx.cwd);
  const provider = new NodeCryptoProvider();
  const identityPath = resolveFromCwd(ctx.cwd, config.identityPath);

  if (existsSync(identityPath) && !hasFlag(ctx.args, "--force")) {
    console.log(`Identity already exists at ${identityPath}`);
    return 0;
  }

  ensureDir(resolveFromCwd(ctx.cwd, ".tp"));
  const identity = new Identity(provider);
  writeBytes(identityPath, identity.getPrivateKey());
  saveConfig(ctx.cwd, config);
  console.log(`Publisher identity: ${bytesToHex(identity.getPublicKey())}`);
  return 0;
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
    ? bytesToHex(loadIdentity(provider, identityPath).getPublicKey())
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
  const identity = loadIdentity(provider, resolveFromCwd(ctx.cwd, config.identityPath));
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
  const identity = loadIdentity(provider, resolveFromCwd(ctx.cwd, config.identityPath));
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

  const packCode = await runPack({ cwd: ctx.cwd, args: [appDir, "--out", ".tp/last.tpkg"] });
  if (packCode !== 0) {
    return packCode;
  }

  const provider = new NodeCryptoProvider();
  const config = loadConfig(ctx.cwd);
  const identity = loadIdentity(provider, resolveFromCwd(ctx.cwd, config.identityPath));
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

  const announce = await announcePublishedApp({
    identity,
    manifest: unpacked.manifest,
    packageHash: unpacked.packageHash,
    archiveBytes: archive,
    driveManager: drives
  });

  if (isSeederStateDir(config.seederAddress)) {
    registerDriveWithSeeder(
      resolveFromCwd(ctx.cwd, config.seederAddress),
      keyHex,
      published.version,
      published.packageHash,
      archive
    );
    console.log(`Registered drive with seeder at ${config.seederAddress}`);
  }

  writePublishMetadata(ctx.cwd, {
    driveKey: keyHex,
    version: published.version,
    packageHash: published.packageHash,
    destinationName: announce.destinationName,
    appDataHex: announce.appDataHex
  });

  console.log(`Published ${published.version} to drive ${keyHex}`);
  console.log(`Announced ${announce.destinationName}`);
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
  return runPublish({ cwd: ctx.cwd, args: [appDir] });
}

export async function runSeed(ctx: CommandContext): Promise<number> {
  const { runSeeder } = await import("../seed/daemon.js");
  const stateDir = parseFlag(ctx.args, "--state-dir") ?? ".tp/seeder";
  const transport = hasFlag(ctx.args, "--transport");
  await runSeeder({
    cwd: ctx.cwd,
    stateDir: resolveFromCwd(ctx.cwd, stateDir),
    transport
  });
  return 0;
}
