import { callHost, MiniappHostError } from "./rpc.js";

export type RelayMode = "off" | "bridge" | "transport-node";
export type RelayInterfaceKind =
  | "tcp"
  | "websocket"
  | "auto"
  | "i2p"
  | "rnode"
  | "bluetooth"
  | "optical"
  | "acoustic"
  | "ntfy";
export type InterfaceDirection = "tx" | "rx" | "both";

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

export type InterfaceDiagnosticState =
  | "available"
  | "permission-required"
  | "unsupported"
  | "offline"
  | "policy-disabled";

export interface InterfaceDiagnostic {
  readonly kind: RelayInterfaceKind;
  readonly state: InterfaceDiagnosticState;
  readonly reason?: string;
}

export interface RelayStatus {
  readonly mode: RelayMode;
  readonly interfaces: ReadonlyArray<InterfaceStatus>;
  readonly onlineCount: number;
}

export interface RelayPolicyMatrix {
  readonly allow?: {
    readonly [From in RelayInterfaceKind]?: {
      readonly [To in RelayInterfaceKind]?: boolean;
    };
  };
}

export class RelayError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "RelayError";
  }
}

async function relayCall<T>(method: string, payload: unknown, capability?: string): Promise<T> {
  try {
    return (await callHost("relay", method, payload, capability)) as T;
  } catch (error) {
    if (error instanceof MiniappHostError) {
      throw new RelayError(error.code, error.message);
    }
    throw error;
  }
}

export async function setMode(mode: RelayMode): Promise<void> {
  await relayCall("setMode", { mode }, "relay:configure");
}

export async function enable(
  kind: RelayInterfaceKind,
  options?: Record<string, unknown>
): Promise<void> {
  await relayCall("enable", { kind, options }, "relay:configure");
}

export async function disable(kind: RelayInterfaceKind): Promise<void> {
  await relayCall("disable", { kind }, "relay:configure");
}

export async function setDirection(
  kind: RelayInterfaceKind,
  direction: InterfaceDirection
): Promise<void> {
  await relayCall("setDirection", { kind, direction }, "relay:configure");
}

export async function configure(
  kind: RelayInterfaceKind,
  patch: Record<string, unknown>
): Promise<void> {
  await relayCall("configure", { kind, patch }, "relay:configure");
}

export async function setPolicy(policy: RelayPolicyMatrix): Promise<void> {
  await relayCall("setPolicy", { policy }, "relay:configure");
}

export async function list(): Promise<ReadonlyArray<InterfaceStatus>> {
  return relayCall("list", {}, "relay:read");
}

export async function status(): Promise<RelayStatus> {
  return relayCall("status", {}, "relay:read");
}

export async function diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>> {
  return relayCall("diagnostics", {}, "relay:read");
}
