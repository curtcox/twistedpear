import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { HostConfig } from "./types.js";
import { defaultHostConfig } from "./types.js";

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function loadHostConfigFile(configPath: string): Partial<HostConfig> {
  if (!existsSync(configPath)) {
    return {};
  }

  return JSON.parse(readFileSync(configPath, "utf8")) as Partial<HostConfig>;
}

export function saveHostConfigFile(configPath: string, config: HostConfig): void {
  ensureDir(dirname(configPath));
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

export function resolveHostConfig(options: {
  readonly dataDir?: string;
  readonly configPath?: string;
  readonly overrides?: Partial<HostConfig>;
}): HostConfig {
  const dataDir = options.dataDir ?? defaultHostConfig().dataDir;
  const configPath = options.configPath ?? join(dataDir, "config.json");
  const fromFile = loadHostConfigFile(configPath);
  const merged = defaultHostConfig({
    ...fromFile,
    ...options.overrides,
    dataDir,
    roles: { ...defaultHostConfig().roles, ...fromFile.roles, ...options.overrides?.roles },
    interfaces: {
      ...defaultHostConfig().interfaces,
      ...fromFile.interfaces,
      ...options.overrides?.interfaces,
      tcp: {
        ...defaultHostConfig().interfaces.tcp,
        ...fromFile.interfaces?.tcp,
        ...options.overrides?.interfaces?.tcp
      },
      websocket: {
        ...defaultHostConfig().interfaces.websocket,
        ...fromFile.interfaces?.websocket,
        ...options.overrides?.interfaces?.websocket
      },
      auto: {
        ...defaultHostConfig().interfaces.auto,
        ...fromFile.interfaces?.auto,
        ...options.overrides?.interfaces?.auto
      },
      i2p: {
        ...defaultHostConfig().interfaces.i2p,
        ...fromFile.interfaces?.i2p,
        ...options.overrides?.interfaces?.i2p
      },
      rnode: {
        ...defaultHostConfig().interfaces.rnode,
        ...fromFile.interfaces?.rnode,
        ...options.overrides?.interfaces?.rnode
      }
    },
    quotas: { ...defaultHostConfig().quotas, ...fromFile.quotas, ...options.overrides?.quotas }
  });

  return merged;
}

export function parseRnsdAttachArg(value: string): { host: string; port: number } {
  const [host, portText] = value.split(":");
  if (host === undefined || portText === undefined) {
    throw new Error(`Invalid rnsd attach address: ${value} (expected host:port)`);
  }

  const port = Number.parseInt(portText, 10);
  if (!Number.isFinite(port)) {
    throw new Error(`Invalid rnsd port: ${portText}`);
  }

  return { host, port };
}
