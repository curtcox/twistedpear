import type { LinkQuality } from "@twistedpear/protocol";
import type { PeerHandle } from "@twistedpear/peer-discovery";

export type LinkReachability =
  "direct" | "mesh" | "store-and-forward" | "unreachable";
export type LinkFreshness = "live" | "recent" | "stale";

export interface PeerLinkSummary {
  readonly peer: PeerHandle;
  readonly displayLabel: string;
  readonly plane: import("@twistedpear/protocol").StreamPlane;
  readonly reachability: LinkReachability;
  readonly quality: LinkQuality;
  readonly readiness: import("@twistedpear/protocol").PeerMediaReadiness | null;
  readonly observedAt: number;
  readonly freshness: LinkFreshness;
}

export type PeerLinkEvent =
  | { readonly kind: "added" | "updated"; readonly peer: PeerLinkSummary }
  | { readonly kind: "removed"; readonly peer: PeerHandle };

export interface LinkWatchBatch {
  readonly cursor: string;
  readonly events: ReadonlyArray<PeerLinkEvent>;
}

export interface LinkProbeOptions {
  readonly budgetBytes?: number;
}

export interface HostLinkProbeRequest {
  readonly budgetBytes: number;
  readonly reservationClass: "control";
  readonly abortOnQueueGrowth: true;
}

export interface LinkObservatoryBackend {
  /** Returns only peers in this app's relationship/announce namespace. */
  peers(appId: string): Promise<ReadonlyArray<PeerLinkSummary>>;
  watch?(appId: string, cursor?: string): Promise<LinkWatchBatch>;
  probePolicy?(
    appId: string,
    peer: PeerHandle,
  ): Promise<"allowed" | "confirm" | "denied">;
  /** Probe implementation must honor this request on the shared host limiter. */
  probe(
    appId: string,
    peer: PeerHandle,
    request: HostLinkProbeRequest,
  ): Promise<LinkQuality>;
}

export interface LinkQualityServiceOptions {
  readonly now?: () => number;
  readonly confirmCostlyProbe?: (input: {
    readonly appId: string;
    readonly peer: PeerHandle;
    readonly budgetBytes: number;
  }) => Promise<boolean>;
}

export interface AppPeerDirectory {
  list(appId: string): ReadonlyArray<{
    readonly handle: PeerHandle;
    readonly displayLabel: string;
    readonly dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth";
    readonly connectedAt: number;
  }>;
}

export interface PeerRouteLinkObservatoryOptions {
  readonly now?: () => number;
  readonly probe?: LinkObservatoryBackend["probe"];
  readonly probePolicy?: LinkObservatoryBackend["probePolicy"];
  readonly localReadiness?: (
    appId: string,
    peer: PeerHandle,
  ) => import("@twistedpear/protocol").PeerMediaReadiness | null;
  readonly controlReservations?: {
    reserveControl(
      bytesPerSecond: number,
    ): null | { consume(bytes: number): Promise<void>; release(): void };
  };
}
