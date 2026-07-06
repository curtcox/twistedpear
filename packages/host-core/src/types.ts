import { homedir } from "node:os";
import { join } from "node:path";

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
  readonly auto: AutoInterfaceConfig;
  readonly i2p: I2pInterfaceConfig;
  readonly rnode: RnodeInterfaceConfig;
}

export interface HostConfig {
  readonly dataDir: string;
  readonly identityPath: string;
  readonly bootstrap: ReadonlyArray<string>;
  readonly roles: HostRoleConfig;
  readonly interfaces: HostInterfaceConfig;
  readonly quotas: HostQuotas;
  readonly statusEndpoint: boolean;
}

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

export function defaultHostConfig(overrides: Partial<HostConfig> = {}): HostConfig {
  const dataDir = overrides.dataDir ?? defaultHostDataDir();
  return {
    dataDir,
    identityPath: overrides.identityPath ?? join(dataDir, "identity"),
    bootstrap: overrides.bootstrap ?? [],
    roles: overrides.roles ?? DEFAULT_DESKTOP_ROLES,
    interfaces: overrides.interfaces ?? DEFAULT_INTERFACE_CONFIG,
    quotas: overrides.quotas ?? DEFAULT_QUOTAS,
    statusEndpoint: overrides.statusEndpoint ?? false
  };
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
  readonly pathTableCount: number;
  readonly activeLinkCount: number;
  readonly bandwidthBytesOut: number;
  readonly bandwidthBytesIn: number;
}
