/** Newline-delimited JSON messages over bare-kit IPC. */

export interface AnnounceEntry {
  readonly destinationHash: string;
  readonly hops: number;
  readonly receivedAt: number;
  readonly appDataHex: string | null;
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
  readonly cryptoProvider: string;
  readonly autoPeers: number;
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
  | { readonly type: "set-interfaces"; readonly tcp: boolean; readonly auto: boolean; readonly ble: boolean }
  | { readonly type: "multicast-packet"; readonly ifname: string; readonly dataHex: string; readonly sourceAddress: string; readonly port: number }
  | { readonly type: "multicast-interfaces"; readonly interfaces: ReadonlyArray<MulticastNetworkInfo> };

export type WorkletToHostMessage =
  | { readonly type: "status"; readonly status: WorkletStatus }
  | { readonly type: "log"; readonly line: string }
  | { readonly type: "announce"; readonly entry: AnnounceEntry }
  | { readonly type: "multicast-start" }
  | { readonly type: "multicast-stop" }
  | { readonly type: "multicast-join"; readonly ifname: string; readonly groupAddress: string; readonly port: number }
  | { readonly type: "multicast-bind"; readonly ifname: string; readonly port: number }
  | { readonly type: "multicast-send"; readonly ifname: string; readonly groupAddress: string; readonly port: number; readonly dataHex: string }
  | { readonly type: "multicast-unicast"; readonly ifname: string; readonly targetAddress: string; readonly port: number; readonly dataHex: string };

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
