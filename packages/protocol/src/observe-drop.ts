/**
 * Closed census of announce-ingress drop decisions (SPEC-EVENTS `observe/drop`).
 * Gates conclude via named actions; adapters record these intents instead of
 * bare-returning. Destination/interface enrichment is optional and applied at
 * the adapter when known.
 */
import type { Intent } from "@twistedpear/effects";
import type { AnnounceValidatePlan } from "./announce-framing/part-2.js";
import type { AnnounceBlockedAction } from "./announce-rate.js";
import type { AcceptParsedAnnounceAction } from "./announce-framing/part-1.js";
import type { IgnoreLocalAnnounceAction } from "./transport-announce/part-2.js";
import type { AddPathEntryAction } from "./path-table/part-4.js";
import type { TransportIngressDispatchAction } from "./transport-ingress/part-3.js";
import type { AnnounceIngressGatesAction } from "./transport-announce/part-3.js";

export type ObserveDropIntent = Extract<
  Intent,
  { readonly kind: "observe/drop" }
>;
export type ObserveDropStage = ObserveDropIntent["stage"];
export type ObserveDropReason = ObserveDropIntent["reason"];

export interface ObserveDropExtras {
  readonly destinationKey?: string;
  readonly ifaceId?: string;
}

export function observeDropIntent(
  stage: ObserveDropStage,
  reason: ObserveDropReason,
  extras: ObserveDropExtras = {},
): ObserveDropIntent {
  return {
    kind: "observe/drop",
    stage,
    reason,
    ...(extras.destinationKey !== undefined
      ? { destinationKey: extras.destinationKey }
      : {}),
    ...(extras.ifaceId !== undefined ? { ifaceId: extras.ifaceId } : {}),
  };
}

export function observeDropsFromIntents(
  intents: readonly Intent[],
): readonly ObserveDropIntent[] {
  return intents.filter(
    (intent): intent is ObserveDropIntent => intent.kind === "observe/drop",
  );
}

export function enrichObserveDrop(
  intent: ObserveDropIntent,
  extras: ObserveDropExtras,
): ObserveDropIntent {
  const destinationKey = extras.destinationKey ?? intent.destinationKey;
  const ifaceId = extras.ifaceId ?? intent.ifaceId;
  return observeDropIntent(intent.stage, intent.reason, {
    ...(destinationKey !== undefined ? { destinationKey } : {}),
    ...(ifaceId !== undefined ? { ifaceId } : {}),
  });
}

/** Rung 3: ingress dispatch concluded `ignore`. */
export function observeDropFromIngressDispatch(
  actions: ReadonlyArray<TransportIngressDispatchAction>,
  extras: ObserveDropExtras = {},
): ObserveDropIntent | null {
  if (!actions.some((action) => action.kind === "ignore")) {
    return null;
  }
  return observeDropIntent("ingress-dispatch", "ignored", extras);
}

/**
 * Rung 4: rate-limit apply ∧ blocked. Composition lives here because neither
 * gate alone means "dropped".
 */
export function observeDropFromAnnounceRateLimit(
  input: {
    readonly applyRateLimit: boolean;
    readonly blocked: boolean;
  } & ObserveDropExtras,
): ObserveDropIntent | null {
  if (!input.applyRateLimit || !input.blocked) {
    return null;
  }
  return observeDropIntent("announce-rate-limit", "rate_limited", input);
}

export function observeDropFromAnnounceRateLimitActions(
  gates: ReadonlyArray<AnnounceIngressGatesAction>,
  blocked: ReadonlyArray<AnnounceBlockedAction>,
  extras: ObserveDropExtras = {},
): ObserveDropIntent | null {
  return observeDropFromAnnounceRateLimit({
    applyRateLimit: gates.some((action) => action.kind === "apply-rate-limit"),
    blocked: blocked.some((action) => action.kind === "blocked"),
    ...extras,
  });
}

const VALIDATE_REJECT_REASONS: Readonly<
  Record<
    Extract<
      AnnounceValidatePlan,
      | "reject-parse"
      | "reject-public-key"
      | "reject-signature"
      | "reject-destination-hash"
    >,
    ObserveDropReason
  >
> = {
  "reject-parse": "reject_parse",
  "reject-public-key": "reject_public_key",
  "reject-signature": "reject_signature",
  "reject-destination-hash": "reject_destination_hash",
};

/** Rung 5: validate concluded a reject-* plan. */
export function observeDropFromAnnounceValidate(
  plan: AnnounceValidatePlan | null,
  extras: ObserveDropExtras = {},
): ObserveDropIntent | null {
  if (plan === null) {
    return null;
  }
  const reason =
    VALIDATE_REJECT_REASONS[plan as keyof typeof VALIDATE_REJECT_REASONS];
  if (reason === undefined) {
    return null;
  }
  return observeDropIntent("announce-validate", reason, extras);
}

/** Rung 6: parsed-announce accept concluded `skip`. */
export function observeDropFromParsedAnnounce(
  actions: ReadonlyArray<AcceptParsedAnnounceAction>,
  extras: ObserveDropExtras = {},
): ObserveDropIntent | null {
  if (!actions.some((action) => action.kind === "skip")) {
    return null;
  }
  return observeDropIntent("announce-parse", "unparseable", extras);
}

/** Rung 7: local-echo ignore concluded `ignore`. */
export function observeDropFromLocalAnnounce(
  actions: ReadonlyArray<IgnoreLocalAnnounceAction>,
  extras: ObserveDropExtras = {},
): ObserveDropIntent | null {
  if (!actions.some((action) => action.kind === "ignore")) {
    return null;
  }
  return observeDropIntent("announce-local-echo", "local_echo", extras);
}

/** Rung 8: path-entry concluded `skip`. */
export function observeDropFromPathEntry(
  actions: ReadonlyArray<AddPathEntryAction>,
  extras: ObserveDropExtras = {},
): ObserveDropIntent | null {
  if (!actions.some((action) => action.kind === "skip")) {
    return null;
  }
  return observeDropIntent("path-entry", "path_not_added", extras);
}
