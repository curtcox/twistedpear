// @ts-nocheck
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOST_API_VERSION, validateManifestCapabilities } from "@twistedpear/miniapp-runtime";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
  unpackPackage
} from "@twistedpear/app-registry";
import {
  encode256t,
  signCasLocator
} from "@twistedpear/cas-256t";
import {
  DriveManager,
  createSwarm
} from "@twistedpear/bridge-hyper";
import { NodeCryptoProvider, bytesToHex } from "@twistedpear/reticulum-ts";
import { loadConfig, readBytes, resolveFromCwd, writeBytes } from "../config.js";
import { isSeederStateDir, registerDriveWithSeederQuota } from "../seed/register.js";
import { DEFAULT_QUOTAS } from "@twistedpear/host-core";
import { startDevServer } from "../dev/server.js";
import {
  type CommandContext,
  TEMPLATE_SOURCES,
  announcePublishedApp,
  collectAppFiles,
  hasFlag,
  loadIdentity,
  parseFlag,
  printHelp,
  readAppManifest,
  requiredPassphrase,
  writePublishMetadata,
  writeTemplate
} from "./helpers.js";

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
