import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  CasStore,
  T256_ID_LENGTH,
  encode256t,
  type CasKeyValueStore,
} from "@twistedpear/cas-256t";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import { loadConfig, resolveFromCwd } from "../config.js";

class DirKvStore implements CasKeyValueStore {
  constructor(private readonly root: string) {
    mkdirSync(root, { recursive: true });
  }

  private pathFor(key: string): string {
    return join(this.root, encodeURIComponent(key));
  }

  get(key: string): Promise<Uint8Array | null> {
    const path = this.pathFor(key);
    return Promise.resolve(
      existsSync(path) ? new Uint8Array(readFileSync(path)) : null,
    );
  }

  set(key: string, value: Uint8Array): Promise<void> {
    writeFileSync(this.pathFor(key), value);
    return Promise.resolve();
  }

  delete(_key: string): Promise<void> {
    // Inspect cache is write-mostly; delete is unused.
    return Promise.resolve();
  }

  list(prefix: string): Promise<ReadonlyArray<string>> {
    if (!existsSync(this.root)) return Promise.resolve([]);
    return Promise.resolve(
      readdirSync(this.root)
        .map((name) => decodeURIComponent(name))
        .filter((key) => key.startsWith(prefix)),
    );
  }
}

function casRoot(cwd: string): string {
  const config = loadConfig(cwd);
  return resolveFromCwd(cwd, join(config.storageDir, "cas"));
}

export function openLocalCas(cwd: string): CasStore {
  const provider = new NodeCryptoProvider();
  return new CasStore(new DirKvStore(casRoot(cwd)), (data) =>
    provider.sha512(data),
  );
}

export async function putLocalCas(
  cwd: string,
  archiveBytes: Uint8Array,
): Promise<string> {
  return openLocalCas(cwd).put(archiveBytes);
}

function looksLike256t(value: string): boolean {
  return (
    value.length === T256_ID_LENGTH &&
    !value.includes("/") &&
    !value.includes("\\")
  );
}

function scanTpkg(
  cwd: string,
  id: string,
  sha512: (data: Uint8Array) => Uint8Array,
): Uint8Array | null {
  if (!existsSync(cwd)) return null;
  for (const name of readdirSync(cwd)) {
    if (!name.endsWith(".tpkg")) continue;
    const bytes = new Uint8Array(readFileSync(join(cwd, name)));
    if (encode256t(bytes, sha512) === id) return bytes;
  }
  return null;
}

export async function loadInspectBytes(
  target: string,
  cwd: string,
): Promise<Uint8Array> {
  const path = resolveFromCwd(cwd, target);
  if (existsSync(path)) {
    const bytes = new Uint8Array(readFileSync(path));
    await putLocalCas(cwd, bytes);
    return bytes;
  }
  if (!looksLike256t(target)) {
    throw new Error(`Nothing to inspect at ${path}`);
  }
  const cas = openLocalCas(cwd);
  const stored = await cas.get(target).catch(() => null);
  if (stored !== null) return stored;
  const provider = new NodeCryptoProvider();
  const scanned = scanTpkg(cwd, target, (data) => provider.sha512(data));
  if (scanned !== null) {
    await cas.put(scanned);
    return scanned;
  }
  throw new Error(
    `256t not found in local CAS at ${casRoot(cwd)}. Pack or inspect a .tpkg first, or pass the archive path.`,
  );
}
