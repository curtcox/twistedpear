import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
  unpackPackage,
  type PackageFile
} from "@twistedpear/app-registry";
import { DriveManager, createSwarm } from "@twistedpear/bridge-hyper";
import { Identity, NodeCryptoProvider, bytesToHex } from "@twistedpear/reticulum-ts";
import { ensureDir, loadConfig, readBytes, resolveFromCwd, saveConfig, writeBytes } from "../config.js";

export interface CommandContext {
  readonly cwd: string;
  readonly args: ReadonlyArray<string>;
}

export function printHelp(command: string): void {
  const help: Record<string, string> = {
    init: "tp init [--force]  Create/load publisher Reticulum identity",
    pack: "tp pack <app-dir> [--out <file.tpkg>]  Build unsigned package archive",
    sign: "tp sign <file.tpkg>  Re-sign an existing package archive",
    publish: "tp publish <app-dir>  Pack, sign, publish to Hyperdrive",
    update: "tp update <app-dir> --version <semver>  Bump version and republish",
    seed: "tp seed [--state-dir <path>] [--transport]  Run headless mirror/resource seeder"
  };

  console.log(help[command] ?? `tp ${command}`);
}

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

function writePublishMetadata(cwd: string, metadata: { driveKey: string; version: string; packageHash: string }) {
  ensureDir(resolveFromCwd(cwd, ".tp"));
  writeFileSync(join(cwd, ".tp", "publish.json"), `${JSON.stringify(metadata, null, 2)}\n`);
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

export async function runPack(ctx: CommandContext): Promise<number> {
  const appDir = ctx.args[0];
  if (appDir === undefined) {
    printHelp("pack");
    return 1;
  }

  const app = readAppManifest(resolveFromCwd(ctx.cwd, appDir));
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
      minHostApi: app.minHostApi ?? "0.1.0",
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
  writePublishMetadata(ctx.cwd, {
    driveKey: keyHex,
    version: published.version,
    packageHash: published.packageHash
  });

  console.log(`Published ${published.version} to drive ${keyHex}`);
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
