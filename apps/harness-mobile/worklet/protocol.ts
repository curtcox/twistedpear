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
  readonly resourceAvailable: boolean;
  readonly receivedAt: number;
}

export interface InstallProgress {
  readonly appId: string;
  readonly phase: "starting" | "downloading" | "verifying" | "complete" | "failed";
  readonly bytesReceived: number;
  readonly totalBytes: number;
  readonly path: string | null;
  readonly verified: boolean;
}

export interface InstalledPackageView {
  readonly appId: string;
  readonly version: string;
  readonly packageHash: string;
  readonly installedAt: number;
}

export interface WorkletStatus {
  readonly running: boolean;
  readonly linkOnline: boolean;
  readonly announcesSeen: number;
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
  readonly catalogEntries: number;
  readonly installedPackages: number;
  readonly storageUsedBytes: number;
}

export interface MulticastNetworkInfo {
  readonly name: string;
  readonly linkLocalAddress: string;
}

export type HostToWorkletMessage =
  | { readonly type: "start"; readonly targetHost: string; readonly targetPort: number }
  | { readonly type: "stop" }
  | { readonly type: "create-identity" }
  | { readonly type: "reset-identity" }
  | {
      readonly type: "set-interfaces";
      readonly tcp: boolean;
      readonly auto: boolean;
      readonly ble: boolean;
      readonly rnode: boolean;
      readonly rnodeDeviceId?: number | null;
      readonly rnodeBaudRate?: number;
    }
  | { readonly type: "list-catalog" }
  | { readonly type: "list-installed" }
  | { readonly type: "install-app"; readonly appId: string; readonly forcePath?: "hyperdrive" | "lan-mirror" | "resource"; readonly archiveHex?: string }
  | { readonly type: "delete-package"; readonly appId: string; readonly version: string }
  | { readonly type: "multicast-packet"; readonly ifname: string; readonly dataHex: string; readonly sourceAddress: string; readonly port: number }
  | { readonly type: "multicast-interfaces"; readonly interfaces: ReadonlyArray<MulticastNetworkInfo> }
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
  | { readonly type: "announce"; readonly entry: AnnounceEntry }
  | { readonly type: "catalog"; readonly entries: ReadonlyArray<CatalogEntryView> }
  | { readonly type: "installed"; readonly packages: ReadonlyArray<InstalledPackageView> }
  | { readonly type: "install-progress"; readonly progress: InstallProgress }
  | { readonly type: "multicast-start" }
  | { readonly type: "multicast-stop" }
  | { readonly type: "multicast-join"; readonly ifname: string; readonly groupAddress: string; readonly port: number }
  | { readonly type: "multicast-bind"; readonly ifname: string; readonly port: number }
  | { readonly type: "multicast-send"; readonly ifname: string; readonly groupAddress: string; readonly port: number; readonly dataHex: string }
  | { readonly type: "multicast-unicast"; readonly ifname: string; readonly targetAddress: string; readonly port: number; readonly dataHex: string }
  | { readonly type: "ble-start"; readonly identityHashHex: string }
  | { readonly type: "ble-stop" }
  | { readonly type: "ble-write"; readonly dataHex: string }
  | { readonly type: "serial-start"; readonly deviceId: number; readonly baudRate: number }
  | { readonly type: "serial-stop" }
  | { readonly type: "serial-write"; readonly dataHex: string };

export function encodeMessage(message: HostToWorkletMessage | WorkletToHostMessage): string {
  return `${JSON.stringify(message)}\n`;
}

export function decodeMessages(buffer: string): { readonly messages: ReadonlyArray<WorkletToHostMessage>; readonly remainder: string } {
  const messages: WorkletToHostMessage[] = [];
  let remainder = buffer;

  while (true) {
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
