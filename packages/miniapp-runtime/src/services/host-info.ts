export type HostPlatformId = "android" | "ios" | "desktop" | "web" | "node";

export interface HostRolesInfo {
  readonly transport: boolean;
  readonly seeder: boolean;
  readonly propagation: boolean;
}

export interface HostQuotaSnapshot {
  readonly kvQuotaBytes: number | null;
  readonly seedStorageUsedBytes: number | null;
  readonly seedStorageQuotaBytes: number | null;
  readonly memoryBytes: number | null;
}

export interface HostInfo {
  readonly platform: HostPlatformId;
  readonly hostVersion: string;
  readonly hostApiVersion: string;
  readonly roles: HostRolesInfo;
  readonly interfaceTypes: ReadonlyArray<string>;
  readonly quotas: HostQuotaSnapshot;
  /** Capabilities granted to the calling app at install (HOST_API 0.4.0+). */
  readonly grantedCapabilities?: ReadonlyArray<string>;
  /** Device-class inventory for this host (HOST_API 0.10.0+). */
  readonly devices?: ReadonlyArray<{
    readonly class: string;
    readonly availability: string;
    readonly tiers: ReadonlyArray<string>;
  }>;
  /**
   * Announce-ingress drop census (SPEC-EVENTS observe/drop), when the host
   * surfaces it. Optional so older hosts stay compatible.
   */
  readonly dropCensus?: {
    readonly byReason: Readonly<Record<string, number>>;
    readonly byPeer: Readonly<Record<string, Readonly<Record<string, number>>>>;
  };
}

export interface HostInfoBackend {
  info(): Promise<HostInfo>;
}

export class HostInfoService {
  constructor(private readonly backend: HostInfoBackend) {}

  async info(): Promise<HostInfo> {
    return this.backend.info();
  }
}

/** Static fallback when a host does not provide a HostInfoBackend. */
export function defaultHostInfo(overrides: Partial<HostInfo> = {}): HostInfo {
  return {
    platform: overrides.platform ?? "node",
    hostVersion: overrides.hostVersion ?? "0.0.0",
    hostApiVersion: overrides.hostApiVersion ?? "0.0.0",
    roles: overrides.roles ?? {
      transport: false,
      seeder: false,
      propagation: false,
    },
    interfaceTypes: overrides.interfaceTypes ?? [],
    quotas: overrides.quotas ?? {
      kvQuotaBytes: null,
      seedStorageUsedBytes: null,
      seedStorageQuotaBytes: null,
      memoryBytes: null,
    },
  };
}
