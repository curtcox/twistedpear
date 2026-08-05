import type { PeerConnectRequest, PeerDiscoveryKind, PeerHandle, PeerSessionManager, PeerSummary } from "@twistedpear/peer-discovery";

export const DEFAULT_PEER_TIMEOUT_MS = 120_000;
export const MAX_PEER_TIMEOUT_MS = 300_000;
export const MAX_PEER_PURPOSE_LENGTH = 160;

export interface PeerRequestPayload {
  readonly service?: string;
  readonly purpose: string;
  readonly mechanisms?: ReadonlyArray<PeerDiscoveryKind> | "any";
  readonly timeoutMs?: number;
}

export class PeerServiceError extends Error {
  constructor(readonly code: "PEERS_UNCONFIGURED" | "PEERS_BAD_REQUEST" | "PEERS_CROSS_APP_SCOPE", message: string) { super(message); this.name = "PeerServiceError"; }
}

export class PeerBrokerService {
  constructor(private readonly manager: PeerSessionManager) {}
  async request(appId: string, runtimeId: string, payload: PeerRequestPayload): Promise<PeerHandle> { return this.manager.request(appId, runtimeId, this.validate(appId, payload)); }
  async listen(appId: string, runtimeId: string, payload: PeerRequestPayload): Promise<PeerHandle> { return this.manager.listen(appId, runtimeId, this.validate(appId, payload)); }
  info(appId: string, runtimeId: string, handle: PeerHandle): PeerSummary { return this.manager.info(appId, runtimeId, handle); }
  close(appId: string, runtimeId: string, handle: PeerHandle): Promise<void> { return this.manager.close(appId, runtimeId, handle); }
  closeRuntime(appId: string, runtimeId: string): Promise<void> { return this.manager.closeRuntime(appId, runtimeId); }
  diagnostics(): ReturnType<PeerSessionManager["diagnostics"]> { return this.manager.diagnostics(); }
  private validate(appId: string, payload: PeerRequestPayload): PeerConnectRequest {
    if (typeof payload?.purpose !== "string" || payload.purpose.length < 1 || payload.purpose.length > MAX_PEER_PURPOSE_LENGTH || [...payload.purpose].some((character) => { const code = character.codePointAt(0) ?? 0; return code < 32 || code === 127; })) throw new PeerServiceError("PEERS_BAD_REQUEST", "A bounded, printable peer connection purpose is required");
    const service = payload.service ?? appId;
    if (service !== appId) throw new PeerServiceError("PEERS_CROSS_APP_SCOPE", "Cross-app peer service names are not permitted");
    const timeoutMs = payload.timeoutMs ?? DEFAULT_PEER_TIMEOUT_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > MAX_PEER_TIMEOUT_MS) throw new PeerServiceError("PEERS_BAD_REQUEST", "Peer timeout is outside the allowed range");
    const mechanisms = payload.mechanisms ?? "any";
    if (mechanisms !== "any" && (!Array.isArray(mechanisms) || mechanisms.length === 0 || mechanisms.length > 7)) throw new PeerServiceError("PEERS_BAD_REQUEST", "Invalid peer discovery mechanisms");
    return { service, purpose: payload.purpose, mechanisms, timeoutMs: Math.floor(timeoutMs) };
  }
}
