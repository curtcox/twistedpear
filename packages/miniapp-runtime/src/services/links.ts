import type { LinkQuality } from "@twistedpear/protocol";
import type { PeerHandle } from "@twistedpear/peer-discovery";
import { LinkServiceError } from "./links-error.js";

export type { LinkQuality } from "@twistedpear/protocol";
export { LinkServiceError } from "./links-error.js";
export { PeerRouteLinkObservatory } from "./links-observatory.js";

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

export const DEFAULT_LINK_PROBE_BUDGET_BYTES = 8 * 1024;
export const LINK_PROBE_INTERVAL_MS = 60_000;

export class LinkQualityService {
  private readonly lastProbeAt = new Map<string, number>();
  private readonly now: () => number;

  constructor(
    private readonly backend: LinkObservatoryBackend,
    private readonly options: LinkQualityServiceOptions = {},
  ) {
    this.now = options.now ?? (() => 0);
  }

  peers(appId: string): Promise<ReadonlyArray<PeerLinkSummary>> {
    return this.backend.peers(appId);
  }

  watch(appId: string, cursor?: string): Promise<LinkWatchBatch> {
    if (this.backend.watch === undefined) {
      return Promise.reject(
        new LinkServiceError(
          "LINK_UNCONFIGURED",
          "Live link watching is not configured on this host.",
        ),
      );
    }
    return Promise.resolve(this.backend.watch(appId, cursor));
  }

  async probe(
    appId: string,
    peer: PeerHandle,
    options: LinkProbeOptions = {},
  ): Promise<LinkQuality> {
    assertProbePeer(peer);
    const budgetBytes = probeBudgetBytes(options.budgetBytes);
    const at = this.now();
    this.assertProbeInterval(appId, peer, at);
    await this.authorizeProbe(appId, peer, budgetBytes);
    // Reserve the rate slot before the effect so repeated failures cannot be used
    // as an unbounded traffic-generation primitive.
    this.lastProbeAt.set(`${appId}\u0000${peer.id}`, at);
    return this.backend.probe(appId, peer, {
      budgetBytes,
      reservationClass: "control",
      abortOnQueueGrowth: true,
    });
  }

  private assertProbeInterval(
    appId: string,
    peer: PeerHandle,
    at: number,
  ): void {
    const key = `${appId}\u0000${peer.id}`;
    const previous = this.lastProbeAt.get(key);
    if (previous !== undefined && at - previous < LINK_PROBE_INTERVAL_MS) {
      throw new LinkServiceError(
        "LINK_PROBE_RATE_LIMITED",
        "Only one probe per peer per 60 seconds is permitted.",
      );
    }
  }

  private async authorizeProbe(
    appId: string,
    peer: PeerHandle,
    budgetBytes: number,
  ): Promise<void> {
    const policy = (await this.backend.probePolicy?.(appId, peer)) ?? "allowed";
    if (policy === "denied") {
      throw new LinkServiceError(
        "LINK_PROBE_DENIED",
        "The host denied probing on this link.",
      );
    }
    if (policy !== "confirm") {
      return;
    }
    const accepted =
      (await this.options.confirmCostlyProbe?.({
        appId,
        peer,
        budgetBytes,
      })) ?? false;
    if (!accepted) {
      throw new LinkServiceError(
        "LINK_PROBE_DENIED",
        "The user did not approve probing this costly link.",
      );
    }
  }
}

function assertProbePeer(peer: PeerHandle): void {
  if (
    typeof peer.id !== "string" ||
    peer.id.length < 1 ||
    peer.id.length > 256
  ) {
    throw new LinkServiceError(
      "LINK_BAD_REQUEST",
      "A valid opaque peer handle is required.",
    );
  }
}

function probeBudgetBytes(budgetBytes: number | undefined): number {
  const bytes = budgetBytes ?? DEFAULT_LINK_PROBE_BUDGET_BYTES;
  if (
    !Number.isInteger(bytes) ||
    bytes < 256 ||
    bytes > DEFAULT_LINK_PROBE_BUDGET_BYTES
  ) {
    throw new LinkServiceError(
      "LINK_BAD_REQUEST",
      `Probe budget must be 256-${DEFAULT_LINK_PROBE_BUDGET_BYTES} bytes.`,
    );
  }
  return bytes;
}
