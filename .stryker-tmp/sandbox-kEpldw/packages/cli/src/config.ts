// @ts-nocheck
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface TpConfig {
  readonly identityPath: string;
  readonly bootstrap: ReadonlyArray<string>;
  readonly seederAddress: string | null;
  readonly storageDir: string;
}

export const DEFAULT_CONFIG: TpConfig = {
  identityPath: ".tp/identity",
  bootstrap: [],
  seederAddress: null,
  storageDir: ".tp/storage"
};

export function loadConfig(cwd: string): TpConfig {
  const configPath = join(cwd, "tp.config.json");
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Partial<TpConfig>;
  return {
    identityPath: parsed.identityPath ?? DEFAULT_CONFIG.identityPath,
    bootstrap: parsed.bootstrap ?? DEFAULT_CONFIG.bootstrap,
    seederAddress: parsed.seederAddress ?? DEFAULT_CONFIG.seederAddress,
    storageDir: parsed.storageDir ?? DEFAULT_CONFIG.storageDir
  };
}

export function saveConfig(cwd: string, config: TpConfig): void {
  const configPath = join(cwd, "tp.config.json");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function resolveFromCwd(cwd: string, path: string): string {
  return resolve(cwd, path);
}

export function readBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

export function writeBytes(path: string, bytes: Uint8Array): void {
  ensureDir(dirname(path));
  writeFileSync(path, bytes);
}
