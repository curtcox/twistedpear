import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HOST_API_VERSION } from "@twistedpear/miniapp-runtime";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  APP_DATA_ARCHIVE_EXTENSION,
  atomicWritePrivateFile,
  encodeAppDataArchive,
  snapshotAppData,
  type AppDataKeyStore,
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

class JsonAppDataStore implements AppDataKeyStore {
  constructor(private readonly rows: Readonly<Record<string, StoredRow>>) {}

  list(prefix = ""): Promise<readonly string[]> {
    return Promise.resolve(
      Object.keys(this.rows)
        .filter((key) => key.startsWith(prefix))
        .sort(),
    );
  }

  get(key: string): Promise<Uint8Array | null> {
    const row = this.rows[key];
    return Promise.resolve(row === undefined ? null : Buffer.from(row.value, "hex"));
  }

  seq(key: string): Promise<number> {
    return Promise.resolve(this.rows[key]?.seq ?? 0);
  }
}

function loadStore(cwd: string): JsonAppDataStore {
  const path = join(cwd, ...STORE_PATH);
  if (!existsSync(path)) {
    throw new Error(`No local app data store at ${path}`);
  }
  return new JsonAppDataStore(
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
  const snapshot = await snapshotAppData(loadStore(ctx.cwd), appId, {
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
