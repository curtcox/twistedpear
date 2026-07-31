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

export type InterfaceDirection = "tx" | "rx" | "both";

export interface RelayInterfaceCommon {
  readonly enabled: boolean;
  /** Which directions this interface may use. Defaults to "both". */
  readonly direction?: InterfaceDirection;
  /** Whether this interface participates in relay/bridge mode. Defaults to true. */
  readonly relay?: boolean;
  /** Optional bitrate hint overriding the default for this kind. */
  readonly bitrateHint?: number;
}

export interface TcpInterfaceConfig extends RelayInterfaceCommon {
  readonly mode: "client" | "server";
  readonly targetHost?: string;
  readonly targetPort?: number;
  readonly listenPort?: number;
}

export interface WebSocketInterfaceConfig extends RelayInterfaceCommon {
  readonly listenHost?: string;
  readonly listenPort?: number;
  readonly path?: string;
  readonly sharedToken?: string;
  /** Directory of built web-host static assets (`--serve-web`). */
  readonly staticRoot?: string;
  /** When true (default), expose Hyperswarm DHT relay at `/dht-relay` on the gateway port. */
  readonly dhtRelay?: boolean;
}

export interface AutoInterfaceConfig extends RelayInterfaceCommon {
  readonly multicast?: boolean;
  readonly bonjour?: boolean;
}

export interface I2pInterfaceConfig extends RelayInterfaceCommon {
  readonly samHost?: string;
  readonly samPort?: number;
  readonly peerDestination?: string;
}

export interface RnodeInterfaceConfig extends RelayInterfaceCommon {
  readonly portPath?: string;
  readonly baudRate?: number;
}

export interface OpticalInterfaceConfig extends RelayInterfaceCommon {
  /** Frame rate cap for outgoing QR/color code streams. */
  readonly frameRate?: number;
  /** Whether to prefer high-density color codes over monochrome QR. */
  readonly colorCodes?: boolean;
}

export interface AcousticInterfaceConfig extends RelayInterfaceCommon {
  /** Center frequency / band selection hint. */
  readonly band?: "audible" | "ultrasonic";
  /** Target bitrate hint in bps. */
  readonly bitrate?: number;
}

export interface NtfyInterfaceConfig extends RelayInterfaceCommon {
  readonly baseUrl?: string;
  readonly topic?: string;
  readonly secret?: string;
  readonly bearerToken?: string;
  readonly pollIntervalMs?: number;
}

export interface FreenetInterfaceConfig extends RelayInterfaceCommon {
  /** Freenet WebSocket URL (`ws://host:port/v1/contract/command`). */
  readonly url?: string;
  readonly authToken?: string;
  /** Retention window per direction (default 64). */
  readonly retentionPerDirection?: number;
  /** Hex-encoded 32-byte rendezvous; generated when omitted. */
  readonly rendezvousHex?: string;
  /** Local write direction 0|1; peer uses the other. Default 0. */
  readonly localDirection?: 0 | 1;
  /**
   * When true (default if omitted while enabled+url), attach
   * FreenetPropagationStore as the PropagationServer remote mirror.
   */
  readonly propagationMirror?: boolean;
}

export interface BluetoothInterfaceConfig extends RelayInterfaceCommon {
  readonly pipeMtu?: number;
}

export interface HostInterfaceConfig {
  readonly tcp: TcpInterfaceConfig;
  readonly websocket: WebSocketInterfaceConfig;
  readonly auto: AutoInterfaceConfig;
  readonly i2p: I2pInterfaceConfig;
  readonly rnode: RnodeInterfaceConfig;
  readonly bluetooth: BluetoothInterfaceConfig;
  readonly optical: OpticalInterfaceConfig;
  readonly acoustic: AcousticInterfaceConfig;
  readonly ntfy: NtfyInterfaceConfig;
  readonly freenet: FreenetInterfaceConfig;
}

export type RelayMode = "off" | "bridge" | "transport-node";

export type RelayInterfaceKind = "tcp" | "websocket" | "auto" | "i2p" | "rnode" | "bluetooth" | "optical" | "acoustic" | "ntfy" | "freenet";

export interface RelayPolicyEntry {
  readonly from: RelayInterfaceKind;
  readonly to: RelayInterfaceKind;
  readonly allow: boolean;
}

export interface RelayPolicyMatrix {
  /** allow[fromKind][toKind] = true|false. Missing entries default to true. */
  readonly allow?: {
    readonly [From in RelayInterfaceKind]?: {
      readonly [To in RelayInterfaceKind]?: boolean;
    };
  };
}

export interface HostRelayConfig {
  readonly mode: RelayMode;
  readonly policy?: RelayPolicyMatrix;
}

export interface HostAiConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly allowedModels?: ReadonlyArray<string>;
  readonly embeddingModel?: string;
  readonly allowedEmbeddingModels?: ReadonlyArray<string>;
}

/**
 * Test-only control endpoint for the single-machine multi-peer environment.
 * When set, the host mounts the peer test agent and dials this address.
 * See `test-agent.ts` and `conformance/local-multipeer`.
 */
export interface TestAgentConfig {
  readonly host: string;
  readonly port: number;
  /** Peer id the harness knows this host by, e.g. `hub` or `node2`. */
  readonly label: string;
}

export interface HostConfig {
  readonly dataDir: string;
  readonly identityPath: string;
  readonly bootstrap: ReadonlyArray<string>;
  readonly roles: HostRoleConfig;
  readonly relay: HostRelayConfig;
  readonly interfaces: HostInterfaceConfig;
  readonly quotas: HostQuotas;
  readonly statusEndpoint: boolean;
  readonly statusEndpointPort: number;
  readonly testAgent: TestAgentConfig | null;
  readonly ai: HostAiConfig | null;
}

export type HostInterfaceOverrides = {
  readonly tcp?: Partial<TcpInterfaceConfig>;
  readonly websocket?: Partial<WebSocketInterfaceConfig>;
  readonly auto?: Partial<AutoInterfaceConfig>;
  readonly i2p?: Partial<I2pInterfaceConfig>;
  readonly rnode?: Partial<RnodeInterfaceConfig>;
  readonly bluetooth?: Partial<BluetoothInterfaceConfig>;
  readonly optical?: Partial<OpticalInterfaceConfig>;
  readonly acoustic?: Partial<AcousticInterfaceConfig>;
  readonly ntfy?: Partial<NtfyInterfaceConfig>;
  readonly freenet?: Partial<FreenetInterfaceConfig>;
};

export type HostConfigOverrides = {
  readonly dataDir?: string;
  readonly identityPath?: string;
  readonly bootstrap?: ReadonlyArray<string>;
  readonly roles?: Partial<HostRoleConfig>;
  readonly relay?: Partial<HostRelayConfig>;
  readonly interfaces?: HostInterfaceOverrides;
  readonly quotas?: Partial<HostQuotas>;
  readonly statusEndpoint?: boolean;
  readonly statusEndpointPort?: number;
  readonly testAgent?: TestAgentConfig | null;
  readonly ai?: HostAiConfig | null;
};

/** Loopback port the status endpoint binds when no port is configured. */
export const DEFAULT_STATUS_ENDPOINT_PORT = 9473;

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

export const DEFAULT_RELAY_CONFIG: HostRelayConfig = {
  mode: "off"
};

export const DEFAULT_INTERFACE_CONFIG: HostInterfaceConfig = {
  tcp: { enabled: false, mode: "client", targetHost: "127.0.0.1", targetPort: 4242, direction: "both", relay: true },
  websocket: { enabled: false, listenHost: "127.0.0.1", listenPort: 9480, direction: "both", relay: true },
  auto: { enabled: true, multicast: true, bonjour: true, direction: "both", relay: true },
  i2p: { enabled: false, direction: "both", relay: true },
  rnode: { enabled: false, baudRate: 115_200, direction: "both", relay: true },
  bluetooth: { enabled: false, direction: "both", relay: true },
  optical: { enabled: false, direction: "both", relay: true },
  acoustic: { enabled: false, direction: "both", relay: true },
  ntfy: { enabled: false, direction: "both", relay: true },
  freenet: { enabled: false, direction: "both", relay: true }
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
    relay: { ...DEFAULT_RELAY_CONFIG, ...overrides.relay },
    interfaces: {
      tcp: { ...baseInterfaces.tcp, ...overrides.interfaces?.tcp },
      websocket: { ...baseInterfaces.websocket, ...overrides.interfaces?.websocket },
      auto: { ...baseInterfaces.auto, ...overrides.interfaces?.auto },
      i2p: { ...baseInterfaces.i2p, ...overrides.interfaces?.i2p },
      rnode: { ...baseInterfaces.rnode, ...overrides.interfaces?.rnode },
      bluetooth: { ...baseInterfaces.bluetooth, ...overrides.interfaces?.bluetooth },
      optical: { ...baseInterfaces.optical, ...overrides.interfaces?.optical },
      acoustic: { ...baseInterfaces.acoustic, ...overrides.interfaces?.acoustic },
      ntfy: { ...baseInterfaces.ntfy, ...overrides.interfaces?.ntfy },
      freenet: { ...baseInterfaces.freenet, ...overrides.interfaces?.freenet }
    },
    quotas: { ...DEFAULT_QUOTAS, ...overrides.quotas },
    statusEndpoint: overrides.statusEndpoint ?? false,
    statusEndpointPort: overrides.statusEndpointPort ?? DEFAULT_STATUS_ENDPOINT_PORT,
    testAgent: overrides.testAgent ?? null,
    ai: overrides.ai ?? null
  };
}

export function defaultWebLeafConfig(overrides: HostConfigOverrides = {}): HostConfig {
  return defaultHostConfig({
    ...overrides,
    roles: { ...DEFAULT_WEB_LEAF_ROLES, ...overrides.roles },
    relay: { mode: "off", ...overrides.relay },
    interfaces: {
      tcp: { enabled: false, mode: "client", ...overrides.interfaces?.tcp },
      websocket: { enabled: false, ...overrides.interfaces?.websocket },
      auto: { enabled: false, multicast: false, bonjour: false, ...overrides.interfaces?.auto },
      i2p: { enabled: false, ...overrides.interfaces?.i2p },
      rnode: { enabled: false, ...overrides.interfaces?.rnode },
      bluetooth: { enabled: false, ...overrides.interfaces?.bluetooth },
      optical: { enabled: false, ...overrides.interfaces?.optical },
      acoustic: { enabled: false, ...overrides.interfaces?.acoustic },
      ntfy: { enabled: false, ...overrides.interfaces?.ntfy },
      freenet: { enabled: false, ...overrides.interfaces?.freenet }
    }
  });
}

export interface InterfaceStatus {
  readonly kind: RelayInterfaceKind;
  readonly name: string;
  readonly enabled: boolean;
  readonly online: boolean;
  readonly direction: InterfaceDirection;
  readonly relay: boolean;
  readonly bitrate: number | null;
  readonly bytesIn: number;
  readonly bytesOut: number;
}

export interface HostStatus {
  readonly running: boolean;
  readonly uptimeMs: number;
  readonly identityHash: string | null;
  readonly transportEnabled: boolean;
  readonly seederEnabled: boolean;
  readonly propagationEnabled: boolean;
  readonly attachRnsd: RnsdAttachConfig | null;
  readonly relayMode: RelayMode;
  readonly linkOnline: boolean;
  readonly announcesSeen: number;
  readonly autoPeers: number;
  readonly onlineInterfaces: number;
  readonly preferredInterface: string | null;
  readonly interfaces: ReadonlyArray<InterfaceStatus>;
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
