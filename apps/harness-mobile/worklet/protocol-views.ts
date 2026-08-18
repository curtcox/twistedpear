/** Newline-delimited JSON messages over bare-kit IPC. */

export interface AnnounceEntry {
  readonly destinationHash: string;
  readonly hops: number;
  readonly receivedAt: number;
  readonly appDataHex: string | null;
}

export interface CatalogEntryView {
  readonly appId: string;
  readonly name: string;
  readonly version: string;
  readonly publisherPublicKey: string;
  readonly packageSize: number;
  readonly packageHash: string;
  readonly driveKey: string;
  readonly resourceAvailable: boolean;
  readonly receivedAt: number;
}

export interface InstallProgress {
  readonly appId: string;
  readonly phase:
    "starting" | "downloading" | "verifying" | "complete" | "failed";
  readonly bytesReceived: number;
  readonly totalBytes: number;
  readonly path: string | null;
  readonly verified: boolean;
}

export interface InstalledPackageView {
  readonly appId: string;
  readonly version: string;
  readonly activeVersion: string;
  readonly packageHash: string;
  readonly installedAt: number;
  readonly rollbackAvailable: boolean;
  readonly capabilities?: ReadonlyArray<string>;
  readonly publisherPublicKey?: string;
}

export interface CapabilityGrantView {
  readonly id: string;
  readonly description: string;
  readonly declared: boolean;
  readonly granted: boolean;
}

export type ConfirmationKind =
  | "package"
  | "publish"
  | "install"
  | "preview"
  | "trust-import"
  | "device-session"
  | "device-stream"
  | "device-remote-grant"
  | "device-share-offer"
  | "device-share-revoke"
  | "link-probe"
  | "freenet-update"
  | "app-channel";

export interface HostConfirmationRequestView {
  readonly token: string;
  readonly kind: ConfirmationKind;
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly summary: Readonly<Record<string, string>>;
}

export interface LaunchReviewCapabilityView {
  readonly id: string;
  readonly description: string;
  readonly granted: boolean;
  readonly expiresAt: number | null;
}

export interface LaunchReviewRequestView {
  readonly token: string;
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly version: string;
  readonly capabilities: ReadonlyArray<LaunchReviewCapabilityView>;
}

export interface InstallReviewRequestView {
  readonly token: string;
  readonly appId: string;
  readonly version: string;
  readonly publisherPublicKey: string;
  readonly trusted: boolean;
  readonly trustedLabel: string | null;
  readonly capabilities: ReadonlyArray<LaunchReviewCapabilityView>;
}

export interface Install256tResultView {
  readonly ok: boolean;
  readonly appId?: string;
  readonly version?: string;
  readonly trusted?: boolean;
  readonly error?: string;
}

export interface TrustedPublisherView {
  readonly publisherPublicKey: string;
  readonly label: string;
  readonly addedAt: number;
  readonly source: "qr" | "paste" | "manual";
}

export interface MiniappRuntimeView {
  readonly appId: string | null;
  readonly version: string | null;
  readonly state: string;
  readonly widgetTree: unknown | null;
  readonly devBadge?: boolean;
  readonly running?: ReadonlyArray<MiniappRunningView>;
}

interface MiniappRunningView {
  readonly appId: string | null;
  readonly publisherPublicKey: string | null;
  readonly version: string | null;
  readonly state: string;
}

export interface MiniappBenchmarkResult {
  readonly backend: string;
  readonly runtime: "bare";
  readonly wasmExecuted: boolean;
  readonly iterations: number;
  readonly spawnMs: number;
  readonly killMs: number;
  readonly busyLoopKillMs: number | null;
  readonly busyLoopKilled: boolean;
}

export interface DeviceDescriptorView {
  readonly class: string;
  readonly tiers: ReadonlyArray<string>;
  readonly availability: string;
  readonly maxRateHz: number;
  readonly streamable: boolean;
  readonly remoteEligible: boolean;
}

export interface DeviceDiagnosticView {
  readonly class: string;
  readonly availability: string;
  readonly reason?: string;
  readonly holder?: string;
}

export interface DeviceChromeSessionView {
  readonly handle: string;
  readonly phase: string;
  readonly classId: string;
  readonly tierId: string;
  readonly appId: string;
  readonly purpose: string;
  readonly consentClass: string;
  readonly openedAt: number;
  readonly expiresAt: number | null;
  readonly destination: string;
  readonly remotePeerId: string | null;
}

export interface DeviceActiveIndicatorView {
  readonly handle: string;
  readonly appId: string;
  readonly class: string;
  readonly tier: string;
  readonly consentClass: string;
  readonly purpose: string;
  readonly destination: string;
}

export interface DeviceStateView {
  readonly inventory: ReadonlyArray<DeviceDescriptorView>;
  readonly diagnostics: ReadonlyArray<DeviceDiagnosticView>;
  readonly sessions: ReadonlyArray<DeviceChromeSessionView>;
  readonly indicators: ReadonlyArray<DeviceActiveIndicatorView>;
  readonly disabledClasses: ReadonlyArray<string>;
  readonly remoteAcquisitionEnabled: boolean;
  readonly shareOffers: ReadonlyArray<{
    readonly id: string;
    readonly appId: string;
    readonly displayLabel: string;
    readonly classId: string;
    readonly tierId: string;
    readonly maxRung: string;
    readonly expiresAt: number;
  }>;
}

/** Host-delivered call invitation; no mini-app code runs while it is pending. */
export interface SessionInviteView {
  readonly id: string;
  readonly appId: string;
  readonly peer: { readonly id: string };
  readonly verifiedPeerLabel: string;
  readonly requestedClasses: ReadonlyArray<
    "camera" | "microphone" | "screen-capture"
  >;
  readonly receivedAt: number;
  readonly expiresAt: number;
  readonly phase: "pending" | "accepted" | "declined" | "expired";
}

export interface WebStorageQuotaView {
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  readonly persisted: boolean;
  readonly packageUsedBytes: number;
  readonly packageQuotaBytes: number;
  readonly archiveBackend: "opfs" | "indexeddb";
}

export interface WorkletStatus {
  readonly running: boolean;
  readonly linkOnline: boolean;
  readonly announcesSeen: number;
  readonly dropCensus?: {
    readonly byReason: Readonly<Record<string, number>>;
    readonly byPeer: Readonly<Record<string, Readonly<Record<string, number>>>>;
  };
  readonly identityHash: string | null;
  readonly identityPersisted: boolean;
  readonly tcpEnabled: boolean;
  readonly autoEnabled: boolean;
  readonly bleEnabled: boolean;
  readonly bleConnected: boolean;
  readonly rnodeEnabled: boolean;
  readonly rnodeConnected: boolean;
  readonly rnodeDeviceName: string | null;
  readonly cryptoProvider: string;
  readonly autoPeers: number;
  readonly preferredInterface: string | null;
  readonly onlineInterfaces: number;
  readonly relayMode?: "off" | "bridge" | "transport-node";
  readonly relayDirections?: Readonly<
    Partial<
      Record<"tcp" | "auto" | "bluetooth" | "rnode", "tx" | "rx" | "both">
    >
  >;
  readonly relayInterfaces?: ReadonlyArray<{
    readonly kind: string;
    readonly enabled: boolean;
    readonly online: boolean;
    readonly direction: "tx" | "rx" | "both";
    readonly bitrate: number | null;
    readonly bytesIn: number;
    readonly bytesOut: number;
    readonly supported: boolean;
  }>;
  readonly catalogEntries: number;
  readonly installedPackages: number;
  readonly storageUsedBytes: number;
  readonly developerMode?: boolean;
  readonly miniappRunning?: boolean;
  readonly wsEnabled?: boolean;
  readonly gatewayUrl?: string | null;
  /** Host LXMF delivery destination hash when the leaf session is up. */
  readonly lxmfAddress?: string | null;
  readonly freenetEnabled?: boolean;
  readonly freenetConfigured?: boolean;
  readonly freenetUrl?: string | null;
  readonly freenetContractReads?: boolean;
  readonly freenetContractWrites?: boolean;
  readonly freenetPacketTunnel?: boolean;
  readonly freenetPropagation?: boolean;
  readonly freenetInterfaceOnline?: boolean;
  readonly freenetPropagationAttached?: boolean;
  /** True when LXMF PropagationServer is running with the Freenet remote mirror. */
  readonly freenetPropagationRole?: boolean;
  readonly freenetRendezvousHex?: string | null;
  readonly propagationEnabled?: boolean;
  readonly propagationStoreBytes?: number;
  readonly propagationMessageCount?: number;
}

export interface MulticastNetworkInfo {
  readonly name: string;
  readonly linkLocalAddress: string;
}
