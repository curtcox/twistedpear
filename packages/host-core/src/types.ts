import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_WEB_LEAF_ROLES, assertWebLeafRoles, type WebLeafHostStatus } from "./leaf-roles.js";

export { DEFAULT_WEB_LEAF_ROLES, assertWebLeafRoles, type WebLeafHostStatus } from "./leaf-roles.js";

export interface HostQuotas {
  readonly seedStorageBytes: number;
  readonly propagationStoreBytes: number;
  readonly propagationMessageCount: number;
  readonly bandwidthBytesPerSecond: number;
}

export interface HostRoleConfig {
  readonly transport: boolean;
  readonly seeder: boolean;
  readonly propagation: boolean;
  readonly attachRnsd: RnsdAttachConfig | null;
}

export interface RnsdAttachConfig {
  readonly host: string;
  readonly port: number;
}

export interface TcpInterfaceConfig {
  readonly enabled: boolean;
  readonly mode: "client" | "server";
  readonly targetHost?: string;
  readonly targetPort?: number;
  readonly listenPort?: number;
}

export interface WebSocketInterfaceConfig {
  readonly enabled: boolean;
  readonly listenHost?: string;
  readonly listenPort?: number;
  readonly path?: string;
  readonly sharedToken?: string;
  /** Directory of built web-host static assets (`--serve-web`). */
  readonly staticRoot?: string;
  /** When true (default), expose Hyperswarm DHT relay at `/dht-relay` on the gateway port. */
  readonly dhtRelay?: boolean;
}

export interface AutoInterfaceConfig {
  readonly enabled: boolean;
  readonly multicast: boolean;
  readonly bonjour: boolean;
}

export interface I2pInterfaceConfig {
  readonly enabled: boolean;
  readonly samHost?: string;
  readonly samPort?: number;
}

export interface RnodeInterfaceConfig {
  readonly enabled: boolean;
  readonly portPath?: string;
  readonly baudRate?: number;
}

export interface HostInterfaceConfig {
  readonly tcp: TcpInterfaceConfig;
  readonly websocket: WebSocketInterfaceConfig;
  readonly auto: AutoInterfaceConfig;
  readonly i2p: I2pInterfaceConfig;
  readonly rnode: RnodeInterfaceConfig;
}

export interface HostAiConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly allowedModels?: ReadonlyArray<string>;
  readonly embeddingModel?: string;
  readonly allowedEmbeddingModels?: ReadonlyArray<string>;
}

export interface HostConfig {
  readonly dataDir: string;
  readonly identityPath: string;
  readonly bootstrap: ReadonlyArray<string>;
  readonly roles: HostRoleConfig;
  readonly interfaces: HostInterfaceConfig;
  readonly quotas: HostQuotas;
  readonly statusEndpoint: boolean;
  readonly ai: HostAiConfig | null;
}

export type HostInterfaceOverrides = {
  readonly tcp?: Partial<TcpInterfaceConfig>;
  readonly websocket?: Partial<WebSocketInterfaceConfig>;
  readonly auto?: Partial<AutoInterfaceConfig>;
  readonly i2p?: Partial<I2pInterfaceConfig>;
  readonly rnode?: Partial<RnodeInterfaceConfig>;
};

export type HostConfigOverrides = {
  readonly dataDir?: string;
  readonly identityPath?: string;
  readonly bootstrap?: ReadonlyArray<string>;
  readonly roles?: Partial<HostRoleConfig>;
  readonly interfaces?: HostInterfaceOverrides;
  readonly quotas?: Partial<HostQuotas>;
  readonly statusEndpoint?: boolean;
  readonly ai?: HostAiConfig | null;
};

export const DEFAULT_QUOTAS: HostQuotas = {
  seedStorageBytes: 2 * 1024 * 1024 * 1024,
  propagationStoreBytes: 256 * 1024 * 1024,
  propagationMessageCount: 10_000,
  bandwidthBytesPerSecond: 512 * 1024
};

export const DEFAULT_DESKTOP_ROLES: HostRoleConfig = {
  transport: true,
  seeder: true,
  propagation: false,
  attachRnsd: null
};

export const DEFAULT_INTERFACE_CONFIG: HostInterfaceConfig = {
  tcp: { enabled: false, mode: "client", targetHost: "127.0.0.1", targetPort: 4242 },
  websocket: { enabled: false, listenHost: "127.0.0.1", listenPort: 9480 },
  auto: { enabled: true, multicast: true, bonjour: true },
  i2p: { enabled: false },
  rnode: { enabled: false, baudRate: 115_200 }
};

export function defaultHostDataDir(platform: NodeJS.Platform = process.platform): string {
  switch (platform) {
    case "darwin":
      return join(homedir(), "Library", "Application Support", "TwistedPear", "host");
    case "win32":
      return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "TwistedPear", "host");
    default:
      return join(homedir(), ".local", "share", "twistedpear", "host");
  }
}

export function defaultHostConfig(overrides: HostConfigOverrides = {}): HostConfig {
  const dataDir = overrides.dataDir ?? defaultHostDataDir();
  const baseInterfaces = DEFAULT_INTERFACE_CONFIG;
  return {
    dataDir,
    identityPath: overrides.identityPath ?? join(dataDir, "identity"),
    bootstrap: overrides.bootstrap ?? [],
    roles: { ...DEFAULT_DESKTOP_ROLES, ...overrides.roles },
    interfaces: {
      tcp: { ...baseInterfaces.tcp, ...overrides.interfaces?.tcp },
      websocket: { ...baseInterfaces.websocket, ...overrides.interfaces?.websocket },
      auto: { ...baseInterfaces.auto, ...overrides.interfaces?.auto },
      i2p: { ...baseInterfaces.i2p, ...overrides.interfaces?.i2p },
      rnode: { ...baseInterfaces.rnode, ...overrides.interfaces?.rnode }
    },
    quotas: { ...DEFAULT_QUOTAS, ...overrides.quotas },
    statusEndpoint: overrides.statusEndpoint ?? false,
    ai: overrides.ai ?? null
  };
}

export function defaultWebLeafConfig(overrides: HostConfigOverrides = {}): HostConfig {
  return defaultHostConfig({
    ...overrides,
    roles: { ...DEFAULT_WEB_LEAF_ROLES, ...overrides.roles },
    interfaces: {
      tcp: { enabled: false, mode: "client", ...overrides.interfaces?.tcp },
      websocket: { enabled: false, ...overrides.interfaces?.websocket },
      auto: { enabled: false, multicast: false, bonjour: false, ...overrides.interfaces?.auto },
      i2p: { enabled: false, ...overrides.interfaces?.i2p },
      rnode: { enabled: false, ...overrides.interfaces?.rnode }
    }
  });
}

export interface HostStatus {
  readonly running: boolean;
  readonly uptimeMs: number;
  readonly identityHash: string | null;
  readonly transportEnabled: boolean;
  readonly seederEnabled: boolean;
  readonly propagationEnabled: boolean;
  readonly attachRnsd: RnsdAttachConfig | null;
  readonly linkOnline: boolean;
  readonly announcesSeen: number;
  readonly autoPeers: number;
  readonly onlineInterfaces: number;
  readonly preferredInterface: string | null;
  readonly seedStorageUsedBytes: number;
  readonly seedStorageQuotaBytes: number;
  readonly propagationStoreBytes: number;
  readonly propagationMessageCount: number;
  readonly propagationEvictions: number;
  readonly websocketGatewayPort: number | null;
  readonly pathTableCount: number;
  readonly activeLinkCount: number;
  readonly bandwidthBytesOut: number;
  readonly bandwidthBytesIn: number;
}
