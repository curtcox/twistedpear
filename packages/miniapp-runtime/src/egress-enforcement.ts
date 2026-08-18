/** Destination check each scoped service runs after assertCapabilityAllowed. */

import {
  egressOfferPermits,
  type EgressOffer,
  type EgressTargetKind,
} from "@twistedpear/protocol";

/**
 * Capabilities whose service names a destination and must present a live
 * host-authored offer. Announce stays on own-namespace (Phase 0). share:cas is
 * content-addressed. peer:connect is already authored in host chrome.
 * freenet:contract keeps confirmation plus the read allowlist.
 */
export const EGRESS_OFFER_CAPABILITIES = [
  "lxmf:send",
  "link:probe",
  "device:stream",
] as const;

export class EgressDeniedError extends Error {
  readonly code = "EGRESS_DENIED";
  constructor(
    message = "Host egress policy does not permit this destination.",
  ) {
    super(message);
    this.name = "EgressDeniedError";
  }
}

const DAY_MS = 86_400_000;

interface BudgetWindow {
  windowStart: number;
  bytes: number;
}

/** Rolling 24-hour byte counters keyed by offer id. */
export class EgressBudgetLedger {
  private readonly used = new Map<string, BudgetWindow>();

  consume(offer: EgressOffer, bytes: number, at: number): void {
    const max = offer.constraints.maxBytesPerDay;
    if (max === undefined) return;
    const requestBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
    const current = this.used.get(offer.id);
    const windowStart =
      current === undefined || at - current.windowStart >= DAY_MS
        ? at
        : current.windowStart;
    const already = windowStart === current?.windowStart ? current.bytes : 0;
    if (already + requestBytes > max) {
      throw new EgressDeniedError(
        "Host egress budget for this destination is exhausted.",
      );
    }
    this.used.set(offer.id, {
      windowStart,
      bytes: already + requestBytes,
    });
  }
}

export function assertEgressAllowed(input: {
  readonly offers: ReadonlyMap<string, EgressOffer>;
  readonly appId: string;
  readonly capability: string;
  readonly targetKind: EgressTargetKind;
  readonly targetId: string;
  readonly at: number;
  readonly tierId?: string;
  readonly maxRung?: string;
  readonly classId?: string;
  readonly bytes?: number;
  readonly ledger?: EgressBudgetLedger;
}): EgressOffer {
  for (const offer of input.offers.values()) {
    if (
      egressOfferPermits(offer, {
        appId: input.appId,
        capability: input.capability,
        targetKind: input.targetKind,
        targetId: input.targetId,
        at: input.at,
        ...(input.tierId === undefined ? {} : { tierId: input.tierId }),
        ...(input.maxRung === undefined ? {} : { maxRung: input.maxRung }),
        ...(input.classId === undefined ? {} : { classId: input.classId }),
      })
    ) {
      input.ledger?.consume(offer, input.bytes ?? 0, input.at);
      return offer;
    }
  }
  throw new EgressDeniedError();
}
