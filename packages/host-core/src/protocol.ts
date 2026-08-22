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

export interface MiniappRuntimeView {
  readonly appId: string | null;
  readonly version: string | null;
  readonly state: string;
  readonly widgetTree: unknown | null;
  readonly devBadge?: boolean;
  readonly running?: ReadonlyArray<MiniappRunningView>;
  readonly lastAppError?: {
    readonly phase: string;
    readonly message: string;
    readonly event?: string;
    readonly nodeId?: string;
  } | null;
  readonly diagnostics?: {
    readonly entries: ReadonlyArray<{
      readonly level: string;
      readonly message: string;
      readonly at: number;
    }>;
    readonly dropped: number;
  };
}

interface MiniappRunningView {
  readonly appId: string | null;
  readonly publisherPublicKey: string | null;
  readonly version: string | null;
  readonly state: string;
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
  readonly pathTableCount: number;
  readonly activeLinkCount: number;
  readonly bandwidthBytesIn?: number;
  readonly bandwidthBytesOut?: number;
  readonly transportEnabled: boolean;
  readonly propagationEnabled: boolean;
  /** Desktop Freenet contract client; independent of HDLC Freenet interface. */
  readonly freenetEnabled?: boolean;
  readonly freenetConfigured?: boolean;
  readonly freenetUrl?: string | null;
  readonly freenetInterfaceEnabled?: boolean;
  readonly freenetInterfaceOnline?: boolean;
  readonly freenetRendezvousHex?: string | null;
  readonly propagationStoreBytes: number;
  readonly propagationMessageCount: number;
  readonly catalogEntries: number;
  readonly installedPackages: number;
  readonly storageUsedBytes: number;
  readonly developerMode?: boolean;
  readonly miniappRunning?: boolean;
}

export interface MulticastNetworkInfo {
  readonly name: string;
  readonly linkLocalAddress: string;
}

export type HostToWorkletMessage =
  | {
      readonly type: "start";
      readonly targetHost: string;
      readonly targetPort: number;
      readonly multicastEntitled?: boolean;
      readonly bonjourEnabled?: boolean;
    }
  | { readonly type: "stop" }
  | { readonly type: "suspend-node" }
  | { readonly type: "resume-node" }
  | { readonly type: "network-change" }
  | { readonly type: "join-community-network" }
  | { readonly type: "create-identity" }
  | { readonly type: "reset-identity" }
  | {
      readonly type: "identity-unlock";
      readonly passphrase: string;
      readonly confirmation?: string;
    }
  | {
      readonly type: "identity-export";
      readonly currentPassphrase: string;
      readonly backupPassphrase: string;
    }
  | {
      readonly type: "identity-recovery-show";
      readonly currentPassphrase: string;
    }
  | {
      readonly type: "identity-import";
      readonly backupHex: string;
      readonly backupPassphrase: string;
      readonly vaultPassphrase: string;
    }
  | {
      readonly type: "identity-recovery-import";
      readonly first: string;
      readonly second: string;
      readonly vaultPassphrase: string;
    }
  | {
      readonly type: "identity-change-passphrase";
      readonly currentPassphrase: string;
      readonly nextPassphrase: string;
    }
  | { readonly type: "moderation-list" }
  | {
      readonly type: "moderation-block";
      readonly sourceHash: string;
      readonly label?: string;
    }
  | { readonly type: "moderation-unblock"; readonly sourceHash: string }
  | {
      readonly type: "moderation-mute";
      readonly sourceHash: string;
      readonly label?: string;
    }
  | { readonly type: "moderation-unmute"; readonly sourceHash: string }
  | {
      readonly type: "moderation-report";
      readonly sourceHash: string;
      readonly reason: string;
      readonly note?: string;
      readonly messageHash?: string;
    }
  | { readonly type: "moderation-export-reports" }
  | {
      readonly type: "set-interfaces";
      readonly tcp: boolean;
      readonly auto: boolean;
      readonly ble: boolean;
      readonly rnode: boolean;
      readonly rnodeDeviceId?: number | null;
      readonly rnodePortPath?: string | null;
      readonly rnodeBaudRate?: number;
    }
  | { readonly type: "set-developer-mode"; readonly enabled: boolean }
  | { readonly type: "set-propagation"; readonly enabled: boolean }
  | {
      readonly type: "set-ai-config";
      readonly config: {
        readonly baseUrl: string;
        readonly apiKey: string;
        readonly model: string;
        readonly embeddingModel?: string;
      } | null;
    }
  | {
      readonly type: "set-freenet-config";
      readonly enabled: boolean;
      readonly interfaceEnabled?: boolean;
      readonly url?: string | null;
      readonly authToken?: string;
      readonly rendezvousHex?: string;
      readonly localDirection?: 0 | 1;
    }
  | { readonly type: "list-catalog" }
  | { readonly type: "list-installed" }
  | {
      readonly type: "install-app";
      readonly appId: string;
      readonly forcePath?: "hyperdrive" | "lan-mirror" | "freenet" | "resource";
      readonly archiveHex?: string;
    }
  | {
      readonly type: "delete-package";
      readonly appId: string;
      readonly version: string;
    }
  | { readonly type: "rollback-package"; readonly appId: string }
  | {
      readonly type: "get-grants";
      readonly appId: string;
      readonly publisherPublicKey: string;
      readonly declaredCapabilities: ReadonlyArray<string>;
    }
  | {
      readonly type: "set-grants";
      readonly appId: string;
      readonly publisherPublicKey: string;
      readonly declaredCapabilities: ReadonlyArray<string>;
      readonly grantedCapabilities: ReadonlyArray<string>;
    }
  | {
      readonly type: "revoke-grant";
      readonly appId: string;
      readonly publisherPublicKey: string;
      readonly capability: string;
      readonly declaredCapabilities: ReadonlyArray<string>;
    }
  | { readonly type: "launch-miniapp"; readonly appId: string }
  | {
      readonly type: "switch-miniapp";
      readonly appId: string;
      readonly publisherPublicKey?: string;
    }
  | { readonly type: "stop-miniapp"; readonly reason?: string }
  | { readonly type: "suspend-miniapp" }
  | { readonly type: "resume-miniapp" }
  | {
      readonly type: "miniapp-ui-event";
      readonly nodeId: string;
      readonly event: string;
      readonly value?: unknown;
    }
  | {
      readonly type: "dev-side-load";
      readonly manifest: Record<string, unknown>;
      readonly bundleHex: string;
    }
  | {
      readonly type: "connect-dev-channel";
      readonly host: string;
      readonly port: number;
    }
  | { readonly type: "disconnect-dev-channel" }
  /** Test-only: mounts the peer control agent for `conformance/local-multipeer`. */
  | {
      readonly type: "connect-test-agent";
      readonly host: string;
      readonly port: number;
      readonly label: string;
    }
  | {
      readonly type: "multicast-packet";
      readonly ifname: string;
      readonly dataHex: string;
      readonly sourceAddress: string;
      readonly port: number;
    }
  | {
      readonly type: "multicast-interfaces";
      readonly interfaces: ReadonlyArray<MulticastNetworkInfo>;
    }
  | {
      readonly type: "bonjour-peer";
      readonly ifname: string;
      readonly address: string;
      readonly port: number;
    }
  | {
      readonly type: "bonjour-interfaces";
      readonly interfaces: ReadonlyArray<MulticastNetworkInfo>;
    }
  | { readonly type: "ble-data"; readonly dataHex: string }
  | { readonly type: "ble-connect"; readonly mtu: number }
  | { readonly type: "ble-disconnect" }
  | { readonly type: "ble-error"; readonly message: string }
  | { readonly type: "serial-data"; readonly dataHex: string }
  | { readonly type: "serial-connect"; readonly deviceName: string }
  | { readonly type: "serial-disconnect" }
  | { readonly type: "serial-error"; readonly message: string };

export type WorkletToHostMessage =
  | { readonly type: "status"; readonly status: WorkletStatus }
  | { readonly type: "log"; readonly line: string }
  | {
      readonly type: "identity-locked";
      readonly legacy: boolean;
      readonly creating: boolean;
    }
  | {
      readonly type: "identity-operation";
      readonly operation: string;
      readonly ok: boolean;
      readonly identityHash?: string;
      readonly backupHex?: string;
      readonly first?: string;
      readonly second?: string;
      readonly error?: string;
    }
  | {
      readonly type: "moderation-state";
      readonly blocked: ReadonlyArray<{
        sourceHash: string;
        label: string | null;
        createdAt: number;
      }>;
      readonly muted: ReadonlyArray<{
        sourceHash: string;
        label: string | null;
        createdAt: number;
      }>;
      readonly reports: ReadonlyArray<{
        id: string;
        sourceHash: string;
        reason: string;
        note: string;
        messageHash: string | null;
        createdAt: number;
      }>;
    }
  | { readonly type: "moderation-report-export"; readonly json: string }
  | { readonly type: "announce"; readonly entry: AnnounceEntry }
  | {
      readonly type: "catalog";
      readonly entries: ReadonlyArray<CatalogEntryView>;
    }
  | {
      readonly type: "installed";
      readonly packages: ReadonlyArray<InstalledPackageView>;
    }
  | { readonly type: "install-progress"; readonly progress: InstallProgress }
  | {
      readonly type: "grants";
      readonly appId: string;
      readonly capabilities: ReadonlyArray<CapabilityGrantView>;
    }
  | { readonly type: "miniapp-runtime"; readonly runtime: MiniappRuntimeView }
  | {
      readonly type: "miniapp-log";
      readonly appId: string;
      readonly line: string;
    }
  | {
      readonly type: "dev-channel";
      readonly state: "connected" | "disconnected" | "loaded" | "error";
      readonly detail?: string;
    }
  | { readonly type: "multicast-start" }
  | { readonly type: "multicast-stop" }
  | {
      readonly type: "multicast-join";
      readonly ifname: string;
      readonly groupAddress: string;
      readonly port: number;
    }
  | {
      readonly type: "multicast-bind";
      readonly ifname: string;
      readonly port: number;
    }
  | {
      readonly type: "multicast-send";
      readonly ifname: string;
      readonly groupAddress: string;
      readonly port: number;
      readonly dataHex: string;
    }
  | {
      readonly type: "multicast-unicast";
      readonly ifname: string;
      readonly targetAddress: string;
      readonly port: number;
      readonly dataHex: string;
    }
  | { readonly type: "bonjour-start" }
  | { readonly type: "bonjour-stop" }
  | {
      readonly type: "bonjour-advertise";
      readonly ifname: string;
      readonly address: string;
      readonly port: number;
    }
  | { readonly type: "ble-start"; readonly identityHashHex: string }
  | { readonly type: "ble-stop" }
  | { readonly type: "ble-write"; readonly dataHex: string }
  | {
      readonly type: "serial-start";
      readonly baudRate: number;
      readonly deviceId?: number;
      readonly portPath?: string;
    }
  | { readonly type: "serial-stop" }
  | { readonly type: "serial-write"; readonly dataHex: string };

export function encodeMessage(
  message: HostToWorkletMessage | WorkletToHostMessage,
): string {
  return `${JSON.stringify(message)}\n`;
}

export function decodeMessages(buffer: string): {
  readonly messages: ReadonlyArray<WorkletToHostMessage>;
  readonly remainder: string;
} {
  const messages: WorkletToHostMessage[] = [];
  let remainder = buffer;

  for (;;) {
    const newline = remainder.indexOf("\n");
    if (newline < 0) {
      break;
    }

    const line = remainder.slice(0, newline).trim();
    remainder = remainder.slice(newline + 1);
    if (line.length === 0) {
      continue;
    }

    try {
      messages.push(JSON.parse(line) as WorkletToHostMessage);
    } catch {
      // Ignore malformed lines; the worklet may log raw text during development.
    }
  }

  return { messages, remainder };
}
