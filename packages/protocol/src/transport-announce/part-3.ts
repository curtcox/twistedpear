/** Extracted from transport-announce.ts; the original module remains the public composition point. */
/**
 * Pure transport announce / path-response / hop-clone field planning.
 * Packet construction and identity hashing stay at the adapter edge.
 * Announce ingress gate conclusions leave via machine actions (no ad-hoc
 * `planAnnounceIngressGates` reads beside the step). Hop-clone / transport
 * announce / path-response field conclusions leave via machine actions
 * (no ad-hoc `planClonePacketWithHops` / `planTransportAnnounceFields` /
 * `planPathResponseAnnounceFields` reads beside the step). Hop-clone /
 * transport-announce plans nest via
 * {@link stepClonePacketWithHopsPlanWithActions} /
 * {@link stepTransportAnnounceFieldsPlanWithActions} /
 * {@link stepPathResponseAnnounceFieldsPlanWithActions} (`use-fields`).
 * Announce ingress plan nested via
 * {@link stepAnnounceIngressGatesPlanWithActions} (`use-gates`).
 * Local-announce
 * ignore / handler dispatch / PATH_RESPONSE receive / aspect-filter match
 * conclusions leave via machine actions (no ad-hoc
 * `shouldIgnoreLocalAnnounce` / `canDispatchAnnounceHandlers` /
 * `shouldReceiveAnnouncePathResponse` / `shouldMatchAnnounceAspect` /
 * `shouldAcceptCachedPathResponsePacket` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
import {
  PACKET_CONTEXT_PATH_RESPONSE,
  PACKET_CONTEXT_NONE,
} from "../packet-context.js";
import {
  PACKET_HEADER_2,
  PACKET_TYPE_ANNOUNCE,
  type PacketHeaderFields,
} from "../packet-header.js";
import { TRANSPORT_TRANSPORT } from "../transport-framing.js";
import { shouldMatchAnnounceAspect } from "./part-2.js";
import type {
  MatchAnnounceAspectAction,
  MatchAnnounceAspectEvent,
  MatchAnnounceAspectState,
  MatchAnnounceAspectStepResult,
} from "./part-2.js";
export function stepMatchAnnounceAspectWithActions(
  state: MatchAnnounceAspectState,
  event: MatchAnnounceAspectEvent,
): MatchAnnounceAspectStepResult {
  if (event.kind === "announce/match-aspect-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldMatchAnnounceAspect({
            hasFilter: event.hasFilter,
            filterParsed: event.filterParsed,
            hashMatches: event.hashMatches,
          })
            ? "match"
            : "mismatch",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchAnnounceAspectNow(
  actions: ReadonlyArray<MatchAnnounceAspectAction>,
): boolean {
  return hasActionOfKind(actions, "match");
}

export function shouldMismatchAnnounceAspect(
  actions: ReadonlyArray<MatchAnnounceAspectAction>,
): boolean {
  return hasActionOfKind(actions, "mismatch");
}

export interface AnnounceIngressGates {
  readonly applyRateLimit: boolean;
  readonly recordRate: boolean;
  readonly rebroadcast: boolean;
}

/**
 * PATH_RESPONSE announces skip rate-limit / rate-record / rebroadcast.
 * Non-path-response announces enable all three.
 */
export function planAnnounceIngressGates(
  context: number,
): AnnounceIngressGates {
  const allow = context !== PACKET_CONTEXT_PATH_RESPONSE;
  return {
    applyRateLimit: allow,
    recordRate: allow,
    rebroadcast: allow,
  };
}

/**
 * Announce ingress gates plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planAnnounceIngressGates`
 * reads beside the step). Nested under {@link stepAnnounceIngressGatesWithActions}.
 */
export type AnnounceIngressGatesPlanState = Record<string, never>;

export type AnnounceIngressGatesPlanEvent =
  | Event
  | {
      readonly kind: "announce/ingress-gates-plan-gate";
      readonly context: number;
    };

export type AnnounceIngressGatesPlanAction = {
  readonly kind: "use-gates";
  readonly applyRateLimit: boolean;
  readonly recordRate: boolean;
  readonly rebroadcast: boolean;
};

export interface AnnounceIngressGatesPlanStepResult {
  readonly state: AnnounceIngressGatesPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceIngressGatesPlanAction[];
}

export function initialAnnounceIngressGatesPlanState(): AnnounceIngressGatesPlanState {
  return {};
}

export function stepAnnounceIngressGatesPlanWithActions(
  state: AnnounceIngressGatesPlanState,
  event: AnnounceIngressGatesPlanEvent,
): AnnounceIngressGatesPlanStepResult {
  if (event.kind === "announce/ingress-gates-plan-gate") {
    const gates = planAnnounceIngressGates(event.context);
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-gates",
          applyRateLimit: gates.applyRateLimit,
          recordRate: gates.recordRate,
          rebroadcast: gates.rebroadcast,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAnnounceIngressGatesPlan(
  actions: ReadonlyArray<AnnounceIngressGatesPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-gates");
}

/** Extract announce ingress gates from plan actions; null when no `use-gates`. */
export function announceIngressGatesPlanFromActions(
  actions: ReadonlyArray<AnnounceIngressGatesPlanAction>,
): AnnounceIngressGates | null {
  const action = firstActionOfKind(actions, "use-gates");
  return action === undefined
    ? null
    : {
        applyRateLimit: action.applyRateLimit,
        recordRate: action.recordRate,
        rebroadcast: action.rebroadcast,
      };
}

/**
 * Announce ingress gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepAnnounceIngressGatesPlanWithActions} (`use-gates`).
 */
export type AnnounceIngressGatesState = Record<string, never>;

export type AnnounceIngressGatesEvent =
  | Event
  | {
      readonly kind: "announce/ingress-gates";
      readonly context: number;
    };

export type AnnounceIngressGatesAction =
  | { readonly kind: "apply-rate-limit" }
  | { readonly kind: "record-rate" }
  | { readonly kind: "rebroadcast" };

export interface AnnounceIngressGatesStepResult {
  readonly state: AnnounceIngressGatesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceIngressGatesAction[];
}

export function initialAnnounceIngressGatesState(): AnnounceIngressGatesState {
  return {};
}

export const stepAnnounceIngressGates: StepFn<AnnounceIngressGatesState> = (
  state,
  event,
) => {
  const result = stepAnnounceIngressGatesInner(
    state,
    event as AnnounceIngressGatesEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepAnnounceIngressGatesWithActions(
  state: AnnounceIngressGatesState,
  event: AnnounceIngressGatesEvent,
): AnnounceIngressGatesStepResult {
  return stepAnnounceIngressGatesInner(state, event);
}

export function shouldApplyAnnounceRateLimit(
  actions: ReadonlyArray<AnnounceIngressGatesAction>,
): boolean {
  return hasActionOfKind(actions, "apply-rate-limit");
}

export function shouldRecordAnnounceRate(
  actions: ReadonlyArray<AnnounceIngressGatesAction>,
): boolean {
  return hasActionOfKind(actions, "record-rate");
}

export function shouldRebroadcastAnnounce(
  actions: ReadonlyArray<AnnounceIngressGatesAction>,
): boolean {
  return hasActionOfKind(actions, "rebroadcast");
}

function stepAnnounceIngressGatesInner(
  state: AnnounceIngressGatesState,
  event: AnnounceIngressGatesEvent,
): AnnounceIngressGatesStepResult {
  if (event.kind === "announce/ingress-gates") {
    const planActions = stepAnnounceIngressGatesPlanWithActions(
      initialAnnounceIngressGatesPlanState(),
      {
        kind: "announce/ingress-gates-plan-gate",
        context: event.context,
      },
    ).actions;
    const plan = announceIngressGatesPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    const actions: AnnounceIngressGatesAction[] = [];
    if (plan.applyRateLimit) {
      actions.push({ kind: "apply-rate-limit" });
    }
    if (plan.recordRate) {
      actions.push({ kind: "record-rate" });
    }
    if (plan.rebroadcast) {
      actions.push({ kind: "rebroadcast" });
    }
    return { state, intents: [], actions };
  }

  return { state, intents: [], actions: [] };
}
