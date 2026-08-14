/** Extracted from path-table.ts; the original module remains the public composition point. */
/**
 * Pure path-table / pathfinder decisions for announce ingress and path requests.
 * No IO — time and bytes arrive only as event/parameters.
 * Path-request ingress / discovery fulfill / outbound / entry-lookup conclusions
 * leave via machine actions (no ad-hoc plan reads beside the step). Plans nested via
 * {@link stepPathRequestIngressPlanWithActions} /
 * {@link stepPathOutboundPlanWithActions} /
 * {@link stepDiscoveryPathRequestFulfillPlanWithActions} /
 * {@link stepPathEntryLookupPlanWithActions}.
 * Path random-blob append / expiry conclusions leave via machine actions (no
 * ad-hoc `appendPathRandomBlob` / `computePathExpiry` reads beside the step).
 * Path-request emit / discovery-expired / begin-discovery / path-entry expired /
 * add-entry conclusions leave via machine actions (no ad-hoc
 * `shouldEmitPathRequest` / `isDiscoveryPathRequestExpired` /
 * `shouldBeginPathDiscovery` / `isPathEntryExpired` / `shouldAddPathEntry`
 * reads beside the step). Answer-local / remember-tag / clear-expired-discovery /
 * use-path-for-outbound / answer-path-with-entry / touch-path-entry conclusions
 * leave via machine actions (no ad-hoc `canAnswerLocalPathRequest` /
 * `shouldRememberPathRequestTag` / `shouldClearExpiredDiscoveryPathRequest` /
 * `shouldUsePathForOutbound` / `shouldAnswerPathWithEntry` /
 * `shouldTouchPathEntry` / `shouldAnswerPathRequest` /
 * `shouldFulfillDiscoveryPending` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { TRUNCATED_HASH_BYTES } from "../hash-truncate.js";
import {
  PACKET_DEST_TYPE_GROUP,
  PACKET_DEST_TYPE_PLAIN,
  PACKET_HEADER_1,
  PACKET_TYPE_ANNOUNCE,
} from "../packet-header.js";
import type { TouchPathEntryAction } from "./part-2.js";
import { hasActionOfKind } from "../action-kind.js";
export function shouldSkipTouchPathEntry(
  actions: ReadonlyArray<TouchPathEntryAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether a pending discovery path-request should be fulfilled by an announce. */
export type DiscoveryPathRequestFulfillPlan =
  "ignore" | "drop-expired" | "fulfill";

export function planDiscoveryPathRequestFulfill(input: {
  readonly hasPending: boolean;
  readonly expired: boolean;
}): DiscoveryPathRequestFulfillPlan {
  if (!input.hasPending) {
    return "ignore";
  }
  if (input.expired) {
    return "drop-expired";
  }
  return "fulfill";
}

/**
 * Discovery path-request fulfill plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDiscoveryPathRequestFulfill` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepDiscoveryPathRequestFulfillWithActions}.
 */
export type DiscoveryPathRequestFulfillPlanState = Record<string, never>;

export type DiscoveryPathRequestFulfillPlanEvent =
  | Event
  | {
      readonly kind: "path-request/discovery-fulfill-plan-gate";
      readonly hasPending: boolean;
      readonly expired: boolean;
    };

export type DiscoveryPathRequestFulfillPlanAction = {
  readonly kind: DiscoveryPathRequestFulfillPlan;
};

export interface DiscoveryPathRequestFulfillPlanStepResult {
  readonly state: DiscoveryPathRequestFulfillPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DiscoveryPathRequestFulfillPlanAction[];
}

export function initialDiscoveryPathRequestFulfillPlanState(): DiscoveryPathRequestFulfillPlanState {
  return {};
}

export function stepDiscoveryPathRequestFulfillPlanWithActions(
  state: DiscoveryPathRequestFulfillPlanState,
  event: DiscoveryPathRequestFulfillPlanEvent,
): DiscoveryPathRequestFulfillPlanStepResult {
  if (event.kind === "path-request/discovery-fulfill-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planDiscoveryPathRequestFulfill({
            hasPending: event.hasPending,
            expired: event.expired,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the discovery path-request fulfill plan from actions; null when empty. */
export function discoveryPathRequestFulfillPlanFromActions(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillPlanAction>,
): DiscoveryPathRequestFulfillPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ignore" ||
      entry.kind === "drop-expired" ||
      entry.kind === "fulfill",
  );
  return action?.kind ?? null;
}

export function shouldIgnoreDiscoveryPathFulfillPlan(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

export function shouldDropExpiredDiscoveryPathRequestPlan(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillPlanAction>,
): boolean {
  return hasActionOfKind(actions, "drop-expired");
}

export function shouldFulfillDiscoveryPathRequestPlan(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillPlanAction>,
): boolean {
  return hasActionOfKind(actions, "fulfill");
}

/**
 * Discovery path-request fulfill is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepDiscoveryPathRequestFulfillPlanWithActions}
 * (`ignore`|`drop-expired`|`fulfill`).
 */
export type DiscoveryPathRequestFulfillState = Record<string, never>;

export type DiscoveryPathRequestFulfillEvent =
  | Event
  | {
      readonly kind: "path-request/discovery-fulfill-gate";
      readonly hasPending: boolean;
      readonly expired: boolean;
    };

export type DiscoveryPathRequestFulfillAction = {
  readonly kind: DiscoveryPathRequestFulfillPlan;
};

export interface DiscoveryPathRequestFulfillStepResult {
  readonly state: DiscoveryPathRequestFulfillState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DiscoveryPathRequestFulfillAction[];
}

export function initialDiscoveryPathRequestFulfillState(): DiscoveryPathRequestFulfillState {
  return {};
}

export const stepDiscoveryPathRequestFulfill: StepFn<
  DiscoveryPathRequestFulfillState
> = (state, event) => {
  const result = stepDiscoveryPathRequestFulfillInner(
    state,
    event as DiscoveryPathRequestFulfillEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepDiscoveryPathRequestFulfillWithActions(
  state: DiscoveryPathRequestFulfillState,
  event: DiscoveryPathRequestFulfillEvent,
): DiscoveryPathRequestFulfillStepResult {
  return stepDiscoveryPathRequestFulfillInner(state, event);
}

export function discoveryPathRequestFulfillFromActions(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>,
): DiscoveryPathRequestFulfillPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldIgnoreDiscoveryPathFulfillActions(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

export function shouldDropExpiredDiscoveryPathRequest(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>,
): boolean {
  return hasActionOfKind(actions, "drop-expired");
}

export function shouldFulfillDiscoveryPathRequest(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>,
): boolean {
  return hasActionOfKind(actions, "fulfill");
}

function stepDiscoveryPathRequestFulfillInner(
  state: DiscoveryPathRequestFulfillState,
  event: DiscoveryPathRequestFulfillEvent,
): DiscoveryPathRequestFulfillStepResult {
  if (event.kind === "path-request/discovery-fulfill-gate") {
    const planActions = stepDiscoveryPathRequestFulfillPlanWithActions(
      initialDiscoveryPathRequestFulfillPlanState(),
      {
        kind: "path-request/discovery-fulfill-plan-gate",
        hasPending: event.hasPending,
        expired: event.expired,
      },
    ).actions;
    const plan = discoveryPathRequestFulfillPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Whether discovery fulfill may transmit a path response (fulfill plan + pending present).
 * Pending map delete stays at the adapter edge.
 */
export function shouldFulfillDiscoveryPending(input: {
  readonly fulfillOk: boolean;
  readonly pendingPresent: boolean;
}): boolean {
  return input.fulfillOk && input.pendingPresent;
}

/**
 * shouldFulfillDiscoveryPending gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldFulfillDiscoveryPending`
 * reads beside the step).
 */
export type FulfillDiscoveryPendingState = Record<string, never>;

export type FulfillDiscoveryPendingEvent =
  | Event
  | {
      readonly kind: "path-request/fulfill-pending-gate";
      readonly fulfillOk: boolean;
      readonly pendingPresent: boolean;
    };

export type FulfillDiscoveryPendingAction =
  { readonly kind: "fulfill" } | { readonly kind: "skip" };

export interface FulfillDiscoveryPendingStepResult {
  readonly state: FulfillDiscoveryPendingState;
  readonly intents: readonly Intent[];
  readonly actions: readonly FulfillDiscoveryPendingAction[];
}

export function initialFulfillDiscoveryPendingState(): FulfillDiscoveryPendingState {
  return {};
}

export function stepFulfillDiscoveryPendingWithActions(
  state: FulfillDiscoveryPendingState,
  event: FulfillDiscoveryPendingEvent,
): FulfillDiscoveryPendingStepResult {
  if (event.kind === "path-request/fulfill-pending-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldFulfillDiscoveryPending({
            fulfillOk: event.fulfillOk,
            pendingPresent: event.pendingPresent,
          })
            ? "fulfill"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldFulfillDiscoveryPendingNow(
  actions: ReadonlyArray<FulfillDiscoveryPendingAction>,
): boolean {
  return hasActionOfKind(actions, "fulfill");
}

export function shouldSkipFulfillDiscoveryPending(
  actions: ReadonlyArray<FulfillDiscoveryPendingAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether discovery fulfill should early-out with no pending map mutation. */
export function shouldIgnoreDiscoveryPathFulfill(ignore: boolean): boolean {
  return ignore;
}

/** How LeafTransport should send a packet given path-table state. */
export type PathOutboundKind = "wrap" | "direct" | "flood";

/**
 * Plan outbound routing: transport-wrap, single-hop direct, or flood.
 * Transmit / wrap bytes stay at the adapter edge.
 */
export function planPathOutbound(input: {
  readonly packetType: number;
  readonly destinationType: number;
  readonly headerType: number;
  readonly hasPath: boolean;
  readonly pathHops: number;
}): PathOutboundKind {
  const pathEligible =
    input.packetType !== PACKET_TYPE_ANNOUNCE &&
    input.destinationType !== PACKET_DEST_TYPE_PLAIN &&
    input.destinationType !== PACKET_DEST_TYPE_GROUP &&
    input.hasPath;

  if (pathEligible) {
    if (input.pathHops > 1 && input.headerType === PACKET_HEADER_1) {
      return "wrap";
    }
    if (input.pathHops <= 1) {
      return "direct";
    }
  }
  return "flood";
}

/**
 * Path-outbound plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPathOutbound` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPathOutboundWithActions}.
 */
export type PathOutboundPlanState = Record<string, never>;

export type PathOutboundPlanEvent =
  | Event
  | {
      readonly kind: "path/outbound-plan-gate";
      readonly packetType: number;
      readonly destinationType: number;
      readonly headerType: number;
      readonly hasPath: boolean;
      readonly pathHops: number;
    };

export type PathOutboundPlanAction = { readonly kind: PathOutboundKind };

export interface PathOutboundPlanStepResult {
  readonly state: PathOutboundPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathOutboundPlanAction[];
}

export function initialPathOutboundPlanState(): PathOutboundPlanState {
  return {};
}

export function stepPathOutboundPlanWithActions(
  state: PathOutboundPlanState,
  event: PathOutboundPlanEvent,
): PathOutboundPlanStepResult {
  if (event.kind === "path/outbound-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planPathOutbound({
            packetType: event.packetType,
            destinationType: event.destinationType,
            headerType: event.headerType,
            hasPath: event.hasPath,
            pathHops: event.pathHops,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the path-outbound plan from actions; null when empty. */
export function pathOutboundPlanFromActions(
  actions: ReadonlyArray<PathOutboundPlanAction>,
): PathOutboundKind | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "wrap" ||
      entry.kind === "direct" ||
      entry.kind === "flood",
  );
  return action?.kind ?? null;
}

export function shouldWrapPathOutboundPlan(
  actions: ReadonlyArray<PathOutboundPlanAction>,
): boolean {
  return hasActionOfKind(actions, "wrap");
}

export function shouldDirectPathOutboundPlan(
  actions: ReadonlyArray<PathOutboundPlanAction>,
): boolean {
  return hasActionOfKind(actions, "direct");
}

/**
 * Path outbound routing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPathOutboundPlanWithActions}
 * (`wrap`|`direct`|`flood`).
 */
export type PathOutboundState = Record<string, never>;

export type PathOutboundEvent =
  | Event
  | {
      readonly kind: "path/outbound-gate";
      readonly packetType: number;
      readonly destinationType: number;
      readonly headerType: number;
      readonly hasPath: boolean;
      readonly pathHops: number;
    };

export type PathOutboundAction = {
  readonly kind: PathOutboundKind;
};

export interface PathOutboundStepResult {
  readonly state: PathOutboundState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathOutboundAction[];
}

export function stepPathOutboundWithActions(
  state: PathOutboundState,
  event: PathOutboundEvent,
): PathOutboundStepResult {
  return stepPathOutboundInner(state, event);
}

export function stepPathOutboundInner(
  state: PathOutboundState,
  event: PathOutboundEvent,
): PathOutboundStepResult {
  if (event.kind === "path/outbound-gate") {
    const planActions = stepPathOutboundPlanWithActions(
      initialPathOutboundPlanState(),
      {
        kind: "path/outbound-plan-gate",
        packetType: event.packetType,
        destinationType: event.destinationType,
        headerType: event.headerType,
        hasPath: event.hasPath,
        pathHops: event.pathHops,
      },
    ).actions;
    const plan = pathOutboundPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
