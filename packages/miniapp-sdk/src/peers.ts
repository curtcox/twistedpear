import { callHost, MiniappHostError } from "./rpc.js";
export type PeerDiscoveryKind =
  | "reticulum"
  | "qr"
  | "manual"
  | "audio"
  | "bluetooth"
  | "ntfy"
  | "local-peer-to-peer";
export interface PeerRequest {
  readonly service?: string;
  readonly purpose: string;
  readonly mechanisms?: ReadonlyArray<PeerDiscoveryKind> | "any";
  readonly timeoutMs?: number;
}
export interface PeerHandle {
  readonly id: string;
}
export interface PeerSummary {
  readonly fingerprint: string;
  readonly displayLabel: string;
  readonly state: "connected" | "closed";
  readonly rendezvous: PeerDiscoveryKind;
  readonly dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth";
}
export interface PeerDiagnostic {
  readonly kind: PeerDiscoveryKind;
  readonly availability: {
    readonly state:
      | "available"
      | "permission-required"
      | "unsupported"
      | "offline"
      | "policy-disabled";
    readonly reason?: string;
  };
}
export class PeerError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PeerError";
  }
}
async function peerCall<T>(method: string, payload: unknown): Promise<T> {
  try {
    return (await callHost("peers", method, payload, "peer:connect")) as T;
  } catch (error) {
    if (error instanceof MiniappHostError)
      throw new PeerError(error.code, error.message);
    throw error;
  }
}
export async function request(options: PeerRequest): Promise<PeerHandle> {
  return peerCall("request", options);
}
export async function listen(options: PeerRequest): Promise<PeerHandle> {
  return peerCall("listen", options);
}
export async function diagnostics(): Promise<ReadonlyArray<PeerDiagnostic>> {
  return peerCall("diagnostics", {});
}
export async function info(handle: PeerHandle): Promise<PeerSummary> {
  return peerCall("info", { handle });
}
export async function close(handle: PeerHandle): Promise<void> {
  await peerCall("close", { handle });
}
