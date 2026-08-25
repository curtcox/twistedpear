import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HOST_API_VERSION } from "@twistedpear/miniapp-runtime";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  APP_DATA_ADDRESS_WARNING,
  APP_DATA_ARCHIVE_EXTENSION,
  atomicWritePrivateFile,
  decodeAppDataArchive,
  encodeAppDataArchive,
  restoreAppData,
  snapshotAppData,
  type AppDataMutableStore,
} from "@twistedpear/host-core";
import { resolveFromCwd } from "../config.js";
import {
  type CommandContext,
  hasFlag,
  parseFlag,
  printHelp,
  readRequiredSecret,
} from "./helpers.js";

const STORE_PATH = [".tp", "miniapp-kv.json"];

type StoredRow = { readonly seq?: number; readonly value: string };

class JsonAppDataStore implements AppDataMutableStore {
  constructor(
    private readonly path: string,
    private rows: Record<string, StoredRow>,
  ) {}

  list(prefix = ""): Promise<readonly string[]> {
    return Promise.resolve(
      Object.keys(this.rows)
        .filter((key) => key.startsWith(prefix))
        .sort(),
    );
  }

  get(key: string): Promise<Uint8Array | null> {
    const row = this.rows[key];
    return Promise.resolve(
      row === undefined ? null : Buffer.from(row.value, "hex"),
    );
  }

  seq(key: string): Promise<number> {
    return Promise.resolve(this.rows[key]?.seq ?? 0);
  }

  put(key: string, value: Uint8Array, seq: number): Promise<void> {
    this.rows[key] = { seq, value: Buffer.from(value).toString("hex") };
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    delete this.rows[key];
    return Promise.resolve();
  }

  persist(): void {
    atomicWritePrivateFile(
      this.path,
      new TextEncoder().encode(`${JSON.stringify(this.rows)}\n`),
    );
  }
}

function openStore(cwd: string, required: boolean): JsonAppDataStore {
  const path = join(cwd, ...STORE_PATH);
  if (!existsSync(path)) {
    if (required) throw new Error(`No local app data store at ${path}`);
    return new JsonAppDataStore(path, {});
  }
  return new JsonAppDataStore(
    path,
    JSON.parse(readFileSync(path, "utf8")) as Record<string, StoredRow>,
  );
}

export async function runAppExport(ctx: CommandContext): Promise<number> {
  const appId = ctx.args[0];
  if (appId === undefined || appId.startsWith("--")) {
    printHelp("app");
    return 1;
  }
  const outputPath = resolveFromCwd(
    ctx.cwd,
    parseFlag(ctx.args, "--out") ?? `${appId}${APP_DATA_ARCHIVE_EXTENSION}`,
  );
  if (existsSync(outputPath) && !hasFlag(ctx.args, "--force")) {
    throw new Error(`Refusing to overwrite ${outputPath}`);
  }
  const passphrase = await readRequiredSecret(ctx, "Archive passphrase");
  const confirmation = await readRequiredSecret(
    ctx,
    "Confirm archive passphrase",
  );
  const snapshot = await snapshotAppData(openStore(ctx.cwd, true), appId, {
    hostApi: HOST_API_VERSION,
    includePending: hasFlag(ctx.args, "--include-pending"),
  });
  const archive = encodeAppDataArchive(
    new NodeCryptoProvider(),
    snapshot,
    passphrase,
    confirmation,
  );
  try {
    atomicWritePrivateFile(outputPath, archive);
  } finally {
    archive.fill(0);
  }
  console.log(
    `Exported ${snapshot.records.length} records for ${appId} to ${outputPath}`,
  );
  return 0;
}

export async function runAppRestore(ctx: CommandContext): Promise<number> {
  const input = ctx.args[0];
  if (input === undefined || input.startsWith("--")) {
    printHelp("app");
    return 1;
  }
  const archivePath = resolveFromCwd(ctx.cwd, input);
  if (!existsSync(archivePath)) {
    throw new Error(`No app data archive at ${archivePath}`);
  }
  const passphrase = await readRequiredSecret(ctx, "Archive passphrase");
  const quotaFlag = parseFlag(ctx.args, "--quota-bytes");
  const snapshot = decodeAppDataArchive(
    new Uint8Array(readFileSync(archivePath)),
    passphrase,
  );
  const store = openStore(ctx.cwd, false);
  const result = await restoreAppData(store, snapshot, {
    collision: hasFlag(ctx.args, "--replace") ? "replace" : "refuse",
    quotaBytes:
      quotaFlag === undefined ? undefined : Number.parseInt(quotaFlag, 10),
  });
  store.persist();
  console.log(
    `Restored ${result.restored} records for ${result.appId} from ${archivePath}`,
  );
  console.log(APP_DATA_ADDRESS_WARNING);
  if (result.parked) {
    console.log(
      `Parked data for ${result.appId}; install the app to use it.`,
    );
  }
  return 0;
}
