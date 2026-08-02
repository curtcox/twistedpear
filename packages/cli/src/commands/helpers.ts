import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOST_API_VERSION } from "@twistedpear/miniapp-runtime";
import {
  TrustStore,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
  type PackageFile
} from "@twistedpear/app-registry";
import {
  casAnnounceAspects,
  encodeCasLocator,
  type CasLocator
} from "@twistedpear/cas-256t";
import {
  DriveManager,
  attachPackageResourceServer
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
import { ensureDir, readBytes, resolveFromCwd } from "../config.js";
import {
  decryptIdentityBackup,
  identityHashHex,
  isEncryptedIdentityBackup,
  persistEncryptedIdentity,
  validateNewIdentityPassphrase
} from "@twistedpear/host-core";

export interface CommandContext {
  readonly cwd: string;
  readonly args: ReadonlyArray<string>;
  readonly identityPassphrase?: string;
  readonly identityPassphraseConfirmation?: string;
  readonly readSecret?: (prompt: string) => Promise<string>;
  readonly interactive?: boolean;
}

const sessionPassphrases = new Map<string, string>();

export function rememberSessionPassphrase(cwd: string, passphrase: string): void {
  sessionPassphrases.set(cwd, passphrase);
}

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

export const TEMPLATE_SOURCES = {
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

export function parseFlag(args: ReadonlyArray<string>, flag: string): string | null {
  const index = args.indexOf(flag);
  if (index < 0 || index + 1 >= args.length) {
    return null;
  }

  return args[index + 1] ?? null;
}

export function hasFlag(args: ReadonlyArray<string>, flag: string): boolean {
  return args.includes(flag);
}

export function parseOptionalFlagValue(
  args: ReadonlyArray<string>,
  flag: string
): string | null {
  const index = args.indexOf(flag);
  const candidate = index < 0 ? undefined : args[index + 1];
  return candidate === undefined || candidate.startsWith("--") ? null : candidate;
}

export function parseOptionalFlag(args: ReadonlyArray<string>, name: string): string | null {
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
export function parseStatusEndpointPort(args: ReadonlyArray<string>): number | null {
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
export function parseTestAgentArg(
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

export function parseWsListenArg(value: string): { listenHost: string; listenPort: number } {
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

export function requiredPassphrase(ctx: CommandContext): string {
  const passphrase = ctx.identityPassphrase ?? sessionPassphrases.get(ctx.cwd);
  if (passphrase === undefined || passphrase.length === 0) {
    throw new Error("Identity passphrase required (set TP_IDENTITY_PASSPHRASE or use an interactive terminal)");
  }
  return passphrase;
}

export function loadIdentity(
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
    rememberSessionPassphrase(ctx.cwd, passphrase);
  }

  return identity;
}

export function collectAppFiles(appDir: string): PackageFile[] {
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

export function readAppManifest(appDir: string) {
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

export function writeTemplate(appDir: string, templateName: keyof typeof TEMPLATE_SOURCES): void {
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

export function writePublishMetadata(
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

export async function announcePublishedApp(options: {
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

export async function readRequiredSecret(ctx: CommandContext, prompt: string): Promise<string> {
  if (ctx.readSecret === undefined) throw new Error(`${prompt} requires an interactive terminal`);
  const value = await ctx.readSecret(prompt);
  if (value.length === 0) throw new Error("Cancelled");
  return value;
}

export async function confirmIdentityReplacement(
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

export function cliTrustStore(cwd: string): TrustStore {
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
