export interface LeafRoleConfig {
  readonly transport: boolean;
  readonly seeder: boolean;
  readonly propagation: boolean;
  readonly attachRnsd: { readonly host: string; readonly port: number } | null;
}

export const DEFAULT_WEB_LEAF_ROLES: LeafRoleConfig = {
  transport: false,
  seeder: false,
  propagation: false,
  attachRnsd: null
};

export function assertWebLeafRoles(roles: LeafRoleConfig): void {
  if (roles.transport || roles.seeder || roles.propagation || roles.attachRnsd !== null) {
    throw new Error("Web host roles must be leaf-only (no transport, seeder, propagation, or rnsd attach)");
  }
}

export interface WebLeafHostStatus {
  readonly running: boolean;
  readonly uptimeMs: number;
  readonly identityHash: string;
  readonly identityPersisted: boolean;
  readonly gatewayUrl: string;
  readonly linkOnline: boolean;
  readonly onlineInterfaces: number;
  readonly pathTableCount: number;
  readonly activeLinkCount: number;
  readonly bandwidthBytesOut: number;
  readonly bandwidthBytesIn: number;
}
