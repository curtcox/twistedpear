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
      return offer;
    }
  }
  throw new EgressDeniedError();
}
