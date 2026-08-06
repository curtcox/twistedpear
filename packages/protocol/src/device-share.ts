/** Host-owned outbound media share policy (Sans-IO). */

export type ShareOfferPhase = "active" | "expired" | "revoked";
export type ShareTargetKind = "peer" | "group";

export interface ShareOffer {
  readonly id: string;
  readonly appId: string;
  readonly targetKind: ShareTargetKind;
  readonly targetId: string;
  readonly displayLabel: string;
  readonly classId: "camera" | "microphone" | "screen-capture";
  readonly tierId: string;
  readonly maxRung: string;
  readonly direction: "send";
  readonly grantedAt: number;
  readonly expiresAt: number;
  readonly phase: ShareOfferPhase;
  readonly revokedAt: number | null;
}

export type ShareOfferEvent =
  | {
      readonly kind: "share/grant";
      readonly offer: Omit<
        ShareOffer,
        "direction" | "phase" | "revokedAt" | "expiresAt"
      >;
      readonly ttlMs: number;
    }
  | { readonly kind: "share/revoke"; readonly id: string; readonly at: number }
  | { readonly kind: "share/ttl"; readonly id: string; readonly at: number }
  | { readonly kind: "share/clear-sensitive"; readonly at: number };

export function initialShareOfferStore(): ReadonlyMap<string, ShareOffer> {
  return new Map();
}

export function stepShareOfferStore(
  store: ReadonlyMap<string, ShareOffer>,
  event: ShareOfferEvent,
): ReadonlyMap<string, ShareOffer> {
  if (event.kind === "share/clear-sensitive") return new Map();
  const next = new Map(store);
  if (event.kind === "share/grant") {
    next.set(event.offer.id, {
      ...event.offer,
      direction: "send",
      expiresAt: event.offer.grantedAt + Math.max(0, event.ttlMs),
      phase: "active",
      revokedAt: null,
    });
    return next;
  }
  const current = next.get(event.id);
  if (current === undefined || current.phase !== "active") return next;
  if (event.kind === "share/revoke") {
    next.set(event.id, { ...current, phase: "revoked", revokedAt: event.at });
  } else if (event.at >= current.expiresAt) {
    next.set(event.id, { ...current, phase: "expired" });
  }
  return next;
}

export function isShareOfferLive(
  offer: ShareOffer | undefined,
  at: number,
): boolean {
  return (
    offer !== undefined && offer.phase === "active" && at < offer.expiresAt
  );
}

export function shareOfferPermits(
  offer: ShareOffer | undefined,
  input: {
    readonly appId: string;
    readonly targetId: string;
    readonly classId: string;
    readonly tierId: string;
    readonly at: number;
  },
): boolean {
  return (
    isShareOfferLive(offer, input.at) &&
    offer?.appId === input.appId &&
    offer.targetId === input.targetId &&
    offer.classId === input.classId &&
    offer.tierId === input.tierId
  );
}
