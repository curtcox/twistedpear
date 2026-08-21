/** Host-authored destination-scoped authority (Sans-IO). */

import { interpret, type EventClass, type Machine } from "@twistedpear/effects";

export type EgressOfferPhase = "absent" | "active" | "expired" | "revoked";
export type EgressTargetKind =
  "peer" | "group" | "namespace" | "key-prefix" | "cas-id" | "address";

export interface EgressOfferConstraints {
  readonly tierId?: string;
  readonly maxRung?: string;
  readonly maxBytesPerDay?: number;
  /** Media specialization: device class the offer is bound to. */
  readonly classId?: string;
}

export interface EgressOfferFields {
  readonly id: string;
  readonly appId: string;
  readonly capability: string;
  readonly targetKind: EgressTargetKind;
  readonly targetId: string;
  readonly displayLabel: string;
  readonly constraints: EgressOfferConstraints;
  readonly grantedAt: number;
}

export interface EgressOfferState extends EgressOfferFields {
  readonly phase: EgressOfferPhase;
  readonly expiresAt: number | null;
  readonly revokedAt: number | null;
}

/** A stored offer is never \`absent\` — missing from the map means absent. */
export type EgressOffer = Omit<EgressOfferState, "phase" | "expiresAt"> & {
  readonly phase: Exclude<EgressOfferPhase, "absent">;
  readonly expiresAt: number;
};

export type EgressOfferEvent =
  | {
      readonly kind: "egress/grant";
      readonly offer: EgressOfferFields;
      readonly ttlMs: number;
    }
  | { readonly kind: "egress/revoke"; readonly id: string; readonly at: number }
  | { readonly kind: "egress/ttl"; readonly id: string; readonly at: number }
  | { readonly kind: "egress/clear-sensitive"; readonly at: number };

const EMPTY_FIELDS: EgressOfferFields = {
  id: "",
  appId: "",
  capability: "",
  targetKind: "peer",
  targetId: "",
  displayLabel: "",
  constraints: {},
  grantedAt: 0,
};

export function initialEgressOfferState(): EgressOfferState {
  return {
    ...EMPTY_FIELDS,
    phase: "absent",
    expiresAt: null,
    revokedAt: null,
  };
}

function applyGrant(
  state: EgressOfferState,
  event: EgressOfferEvent,
): EgressOfferState {
  if (event.kind !== "egress/grant") return state;
  return {
    ...state,
    ...event.offer,
    expiresAt: event.offer.grantedAt + Math.max(0, event.ttlMs),
    revokedAt: null,
  };
}

const grant: EventClass<EgressOfferEvent> = {
  name: "grant",
  matches: (event) => event.kind === "egress/grant",
};
const ttlExpired: EventClass<EgressOfferEvent> = {
  name: "ttl/expired",
  matches: (event) => event.kind === "egress/ttl",
};
const revoke: EventClass<EgressOfferEvent> = {
  name: "revoke",
  matches: (event) => event.kind === "egress/revoke",
};

export const egressOfferMachine: Machine<EgressOfferState, EgressOfferEvent> = {
  states: ["absent", "active", "expired", "revoked"],
  events: [grant, ttlExpired, revoke],
  initial: "absent",
  stateOf: (state) => state.phase,
  withState: (state, phase) => ({
    ...state,
    phase: phase as EgressOfferPhase,
  }),
  table: [
    { from: "absent", on: grant, to: "active", reduce: applyGrant },
    { from: "active", on: grant, to: "active", reduce: applyGrant },
    { from: "expired", on: grant, to: "active", reduce: applyGrant },
    { from: "revoked", on: grant, to: "active", reduce: applyGrant },
    {
      from: "active",
      on: ttlExpired,
      to: "expired",
      guard: (state, event) =>
        event.kind === "egress/ttl" &&
        state.expiresAt !== null &&
        event.at >= state.expiresAt,
    },
    {
      from: "active",
      on: revoke,
      to: "revoked",
      reduce: (state, event) =>
        event.kind === "egress/revoke"
          ? { ...state, revokedAt: event.at }
          : state,
    },
  ],
};

export const stepEgressOffer = interpret(egressOfferMachine);

export function initialEgressOfferStore(): ReadonlyMap<string, EgressOffer> {
  return new Map();
}

function asStored(state: EgressOfferState): EgressOffer | undefined {
  if (state.phase === "absent" || state.expiresAt === null) return undefined;
  return { ...state, phase: state.phase, expiresAt: state.expiresAt };
}

function asState(offer: EgressOffer): EgressOfferState {
  return offer;
}

export function stepEgressOfferStore(
  store: ReadonlyMap<string, EgressOffer>,
  event: EgressOfferEvent,
): ReadonlyMap<string, EgressOffer> {
  if (event.kind === "egress/clear-sensitive") return new Map();
  const next = new Map(store);
  if (event.kind === "egress/grant") {
    const current = next.get(event.offer.id);
    const { state } = stepEgressOffer(
      current === undefined ? initialEgressOfferState() : asState(current),
      event,
    );
    const stored = asStored(state);
    if (stored !== undefined) next.set(event.offer.id, stored);
    return next;
  }
  const current = next.get(event.id);
  if (current === undefined) return next;
  const stored = asStored(stepEgressOffer(asState(current), event).state);
  if (stored !== undefined) next.set(event.id, stored);
  return next;
}

export function isEgressOfferLive(
  offer: EgressOffer | undefined,
  at: number,
): offer is EgressOffer {
  return (
    offer !== undefined && offer.phase === "active" && at < offer.expiresAt
  );
}

export function egressOfferPermits(
  offer: EgressOffer | undefined,
  input: {
    readonly appId: string;
    readonly capability: string;
    readonly targetKind: EgressTargetKind;
    readonly targetId: string;
    readonly at: number;
    readonly tierId?: string;
    readonly maxRung?: string;
    readonly classId?: string;
  },
): boolean {
  if (!isEgressOfferLive(offer, input.at)) return false;
  if (
    offer.appId !== input.appId ||
    offer.capability !== input.capability ||
    offer.targetKind !== input.targetKind ||
    offer.targetId !== input.targetId
  ) {
    return false;
  }
  if (
    offer.constraints.tierId !== undefined &&
    offer.constraints.tierId !== input.tierId
  ) {
    return false;
  }
  if (
    offer.constraints.maxRung !== undefined &&
    offer.constraints.maxRung !== input.maxRung
  ) {
    return false;
  }
  if (
    offer.constraints.classId !== undefined &&
    offer.constraints.classId !== input.classId
  ) {
    return false;
  }
  return true;
}
