import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { HostConfig, HostConfigOverrides } from "./types.js";
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

export function saveHostConfigFile(
  configPath: string,
  config: HostConfig,
): void {
  ensureDir(dirname(configPath));
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

const RELAY_MODES = new Set(["off", "bridge", "transport-node"]);
const DIRECTIONS = new Set(["tx", "rx", "both"]);
const INTERFACE_KINDS = new Set([
  "tcp",
  "websocket",
  "auto",
  "i2p",
  "rnode",
  "bluetooth",
  "optical",
  "acoustic",
  "ntfy",
  "freenet",
]);

function requireNumber(value: unknown, label: string, minimum: number): void {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${label} must be a finite number >= ${minimum}`);
  }
}

function validateCommonInterfaces(config: HostConfig): void {
  for (const [kind, value] of Object.entries(config.interfaces)) {
    if (
      !INTERFACE_KINDS.has(kind) ||
      typeof value !== "object" ||
      value === null
    )
      throw new Error(`Invalid interface config: ${kind}`);
    const common = value as {
      enabled?: unknown;
      direction?: unknown;
      relay?: unknown;
      bitrateHint?: unknown;
    };
    if (typeof common.enabled !== "boolean")
      throw new Error(`interfaces.${kind}.enabled must be a boolean`);
    if (
      common.direction !== undefined &&
      !DIRECTIONS.has(String(common.direction))
    )
      throw new Error(`Invalid interfaces.${kind}.direction`);
    if (common.relay !== undefined && typeof common.relay !== "boolean")
      throw new Error(`interfaces.${kind}.relay must be a boolean`);
    requireNumber(
      common.bitrateHint,
      `interfaces.${kind}.bitrateHint`,
      Number.MIN_VALUE,
    );
  }
}

function validateInterfaceNumbers(config: HostConfig): void {
  for (const [value, label] of [
    [config.interfaces.tcp.targetPort, "interfaces.tcp.targetPort"],
    [config.interfaces.i2p.samPort, "interfaces.i2p.samPort"],
    [config.interfaces.rnode.baudRate, "interfaces.rnode.baudRate"],
    [config.interfaces.ntfy.pollIntervalMs, "interfaces.ntfy.pollIntervalMs"],
  ] as const)
    requireNumber(value, label, Number.MIN_VALUE);
  requireNumber(
    config.interfaces.tcp.listenPort,
    "interfaces.tcp.listenPort",
    0,
  );
  requireNumber(
    config.interfaces.websocket.listenPort,
    "interfaces.websocket.listenPort",
    0,
  );
}

function validateRequiredInterfaceFields(config: HostConfig): void {
  if (config.interfaces.i2p.enabled && !config.interfaces.i2p.peerDestination)
    throw new Error("Enabled I2P interface requires peerDestination");
  if (config.interfaces.rnode.enabled && !config.interfaces.rnode.portPath)
    throw new Error("Enabled RNode interface requires portPath");
  if (
    config.interfaces.ntfy.enabled &&
    (!config.interfaces.ntfy.topic || !config.interfaces.ntfy.secret)
  )
    throw new Error("Enabled ntfy interface requires topic and secret");
  if (config.interfaces.freenet.enabled && !config.interfaces.freenet.url)
    throw new Error("Enabled Freenet interface requires url");
}

function validateRelayPolicy(config: HostConfig): void {
  for (const [from, row] of Object.entries(config.relay.policy?.allow ?? {})) {
    if (!INTERFACE_KINDS.has(from) || typeof row !== "object")
      throw new Error(`Invalid relay policy source: ${from}`);
    for (const [to, permitted] of Object.entries(row)) {
      if (!INTERFACE_KINDS.has(to) || typeof permitted !== "boolean")
        throw new Error(`Invalid relay policy cell: ${from}→${to}`);
    }
  }
}

/** Validate a fully defaulted host config before it reaches interface effects. */
export function validateHostConfig(config: HostConfig): HostConfig {
  const relayMode: unknown = config.relay.mode;
  const tcpMode: unknown = config.interfaces.tcp.mode;
  if (typeof relayMode !== "string" || !RELAY_MODES.has(relayMode))
    throw new Error("Invalid relay.mode");
  if (
    relayMode === "transport-node" &&
    (!config.roles.transport || config.roles.attachRnsd !== null)
  ) {
    throw new Error(
      "transport-node relay requires the local transport role and no rnsd attachment",
    );
  }
  if (tcpMode !== "client" && tcpMode !== "server")
    throw new Error("Invalid interfaces.tcp.mode");
  validateCommonInterfaces(config);
  validateInterfaceNumbers(config);
  validateRequiredInterfaceFields(config);
  validateRelayPolicy(config);
  return config;
}

export function resolveHostConfig(options: {
  readonly dataDir?: string;
  readonly configPath?: string;
  readonly overrides?: HostConfigOverrides;
}): HostConfig {
  const dataDir = options.dataDir ?? defaultHostConfig().dataDir;
  const configPath = options.configPath ?? join(dataDir, "config.json");
  const fromFile = loadHostConfigFile(configPath);
  const merged = defaultHostConfig({
    ...fromFile,
    ...options.overrides,
    dataDir,
    roles: {
      ...defaultHostConfig().roles,
      ...fromFile.roles,
      ...options.overrides?.roles,
    },
    interfaces: {
      ...defaultHostConfig().interfaces,
      ...fromFile.interfaces,
      ...options.overrides?.interfaces,
      tcp: {
        ...defaultHostConfig().interfaces.tcp,
        ...fromFile.interfaces?.tcp,
        ...options.overrides?.interfaces?.tcp,
      },
      websocket: {
        ...defaultHostConfig().interfaces.websocket,
        ...fromFile.interfaces?.websocket,
        ...options.overrides?.interfaces?.websocket,
      },
      auto: {
        ...defaultHostConfig().interfaces.auto,
        ...fromFile.interfaces?.auto,
        ...options.overrides?.interfaces?.auto,
      },
      i2p: {
        ...defaultHostConfig().interfaces.i2p,
        ...fromFile.interfaces?.i2p,
        ...options.overrides?.interfaces?.i2p,
      },
      rnode: {
        ...defaultHostConfig().interfaces.rnode,
        ...fromFile.interfaces?.rnode,
        ...options.overrides?.interfaces?.rnode,
      },
      bluetooth: {
        ...defaultHostConfig().interfaces.bluetooth,
        ...fromFile.interfaces?.bluetooth,
        ...options.overrides?.interfaces?.bluetooth,
      },
      optical: {
        ...defaultHostConfig().interfaces.optical,
        ...fromFile.interfaces?.optical,
        ...options.overrides?.interfaces?.optical,
      },
      acoustic: {
        ...defaultHostConfig().interfaces.acoustic,
        ...fromFile.interfaces?.acoustic,
        ...options.overrides?.interfaces?.acoustic,
      },
      ntfy: {
        ...defaultHostConfig().interfaces.ntfy,
        ...fromFile.interfaces?.ntfy,
        ...options.overrides?.interfaces?.ntfy,
      },
      freenet: {
        ...defaultHostConfig().interfaces.freenet,
        ...fromFile.interfaces?.freenet,
        ...options.overrides?.interfaces?.freenet,
      },
    },
    quotas: {
      ...defaultHostConfig().quotas,
      ...fromFile.quotas,
      ...options.overrides?.quotas,
    },
  });

  return validateHostConfig(merged);
}

export function parseRnsdAttachArg(value: string): {
  host: string;
  port: number;
} {
  const [host, portText] = value.split(":");
  if (host === undefined || portText === undefined) {
    throw new Error(
      `Invalid rnsd attach address: ${value} (expected host:port)`,
    );
  }

  const port = Number.parseInt(portText, 10);
  if (!Number.isFinite(port)) {
    throw new Error(`Invalid rnsd port: ${portText}`);
  }

  return { host, port };
}
