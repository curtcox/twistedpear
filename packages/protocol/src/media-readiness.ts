export type BandwidthBucket =
  | "none"
  | "derived"
  | "narrowband"
  | "audio"
  | "sd-video"
  | "hd-video";

export type MediaClassId = "camera" | "microphone" | "screen-capture";

export interface MediaReadinessClass {
  readonly classId: MediaClassId;
  readonly maxRung: string;
  readonly encodings: ReadonlyArray<string>;
}

export interface PeerMediaReadiness {
  readonly hostApi: string;
  readonly accepts: ReadonlyArray<MediaReadinessClass>;
  readonly offers: ReadonlyArray<MediaReadinessClass>;
  readonly downlinkBucket: BandwidthBucket;
  readonly constrained: ReadonlyArray<"metered" | "low-battery" | "thermal" | "foreground-only">;
  readonly consentPosture: "open" | "ask" | "closed";
  readonly expiresAt: number;
}

export type MediaReadinessPhase = "unknown" | "requested" | "ready" | "unreachable";

export interface MediaReadinessState {
  readonly phase: MediaReadinessPhase;
  readonly readiness: PeerMediaReadiness | null;
}

export type MediaReadinessEvent =
  | { readonly kind: "readiness/request" }
  | { readonly kind: "readiness/receive"; readonly at: number; readonly readiness: PeerMediaReadiness }
  | { readonly kind: "readiness/refuse" }
  | { readonly kind: "readiness/unreachable" }
  | { readonly kind: "readiness/ttl"; readonly at: number };

export type MediaCapability = "hd-video" | "sd-video" | "audio" | "narrowband" | "derived" | "unreachable";

const BUCKET_ORDER: ReadonlyArray<BandwidthBucket> = [
  "none",
  "derived",
  "narrowband",
  "audio",
  "sd-video",
  "hd-video"
];

export function initialMediaReadinessState(): MediaReadinessState {
  return { phase: "unknown", readiness: null };
}

/** Refusal and transport failure intentionally collapse to the same state. */
export function stepMediaReadiness(
  state: MediaReadinessState,
  event: MediaReadinessEvent
): MediaReadinessState {
  switch (event.kind) {
    case "readiness/request":
      return { phase: "requested", readiness: null };
    case "readiness/receive":
      if (event.readiness.consentPosture === "closed" || event.at >= event.readiness.expiresAt) {
        return { phase: "unreachable", readiness: null };
      }
      return { phase: "ready", readiness: normalizeMediaReadiness(event.readiness) };
    case "readiness/refuse":
    case "readiness/unreachable":
      return { phase: "unreachable", readiness: null };
    case "readiness/ttl":
      if (state.phase === "ready" && state.readiness !== null && event.at >= state.readiness.expiresAt) {
        // Do not reveal whether a peer refused, disappeared, or merely let its
        // readiness lapse; all three are the same app-visible posture.
        return { phase: "unreachable", readiness: null };
      }
      return state;
  }
}

export function minimumBandwidthBucket(left: BandwidthBucket, right: BandwidthBucket): BandwidthBucket {
  return BUCKET_ORDER[Math.min(BUCKET_ORDER.indexOf(left), BUCKET_ORDER.indexOf(right))] ?? "none";
}

export function decideMediaCapability(input: {
  readonly classId: MediaClassId;
  readonly localSupply: BandwidthBucket;
  readonly peer: PeerMediaReadiness | null;
  readonly at: number;
  readonly sharePermitted: boolean;
}): MediaCapability {
  if (!input.sharePermitted || input.peer === null || input.at >= input.peer.expiresAt || input.peer.consentPosture === "closed") {
    return "unreachable";
  }
  const accepted = input.peer.accepts.find((entry) => entry.classId === input.classId);
  if (accepted === undefined) return "unreachable";
  const bucket = minimumBandwidthBucket(input.localSupply, input.peer.downlinkBucket);
  if (input.classId === "microphone") {
    if (bucket === "hd-video" || bucket === "sd-video" || bucket === "audio") return "audio";
    if (bucket === "narrowband") return "narrowband";
    return bucket === "derived" ? "derived" : "unreachable";
  }
  if (bucket === "hd-video") return "hd-video";
  if (bucket === "sd-video") return "sd-video";
  if (bucket === "audio" || bucket === "narrowband" || bucket === "derived") return "derived";
  return "unreachable";
}

export function normalizeMediaReadiness(readiness: PeerMediaReadiness): PeerMediaReadiness {
  return {
    ...readiness,
    accepts: normalizeClasses(readiness.accepts),
    offers: normalizeClasses(readiness.offers),
    constrained: [...new Set(readiness.constrained)].sort()
  };
}

export function negotiateMediaEncoding(
  localPreference: ReadonlyArray<string>,
  remote: MediaReadinessClass
): string | null {
  const remoteSet = new Set(remote.encodings);
  return localPreference.find((encoding) => remoteSet.has(encoding)) ?? null;
}

function normalizeClasses(classes: ReadonlyArray<MediaReadinessClass>): ReadonlyArray<MediaReadinessClass> {
  return [...classes]
    .filter((entry) => entry.encodings.length > 0)
    .map((entry) => ({ ...entry, encodings: [...new Set(entry.encodings)].sort() }))
    .sort((left, right) => left.classId.localeCompare(right.classId));
}
