/** Extracted from lxmf-delivery.ts; the original module remains the public composition point. */
/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLxmfDelivery` /
 * `canAcceptLxmfPropagationLocalDelivery` /
 * `canUnpackLxmfPropagationLocalIngress` /
 * `shouldAwaitLxmfDeliveryReceipt` / `shouldInvokeLxmfDeliveryCallback`
 * reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  LxmfUnverifiedReason,
  type LxmfUnverifiedReasonValue,
} from "../lxmf-fields.js";
import { planLxMessagePack } from "./part-1.js";
import type { LxMessagePackGate, LxMessagePackPlanEvent } from "./part-1.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Static LXMessage.pack-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxMessagePack` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxMessagePackWithActions}.
 */
export type LxMessagePackPlanState = Record<string, never>;

export type LxMessagePackPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "bad-destination" }
  | { readonly kind: "bad-source" };

export interface LxMessagePackPlanStepResult {
  readonly state: LxMessagePackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessagePackPlanAction[];
}

export function initialLxMessagePackPlanState(): LxMessagePackPlanState {
  return {};
}

export function stepLxMessagePackPlanWithActions(
  state: LxMessagePackPlanState,
  event: LxMessagePackPlanEvent,
): LxMessagePackPlanStepResult {
  if (event.kind === "lxmessage-pack/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxMessagePack({
            destinationDirectionOut: event.destinationDirectionOut,
            sourceDirectionIn: event.sourceDirectionIn,
            sourceIdentityPresent: event.sourceIdentityPresent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether pack-plan actions allow LXMessage.pack to proceed. */
export function shouldPlanLxMessagePackOk(
  actions: ReadonlyArray<LxMessagePackPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ok");
}

/** Whether pack-plan actions reject a bad destination direction. */
export function shouldRejectLxMessagePackPlanBadDestination(
  actions: ReadonlyArray<LxMessagePackPlanAction>,
): boolean {
  return hasActionOfKind(actions, "bad-destination");
}

/** Whether pack-plan actions reject a bad source direction / identity. */
export function shouldRejectLxMessagePackPlanBadSource(
  actions: ReadonlyArray<LxMessagePackPlanAction>,
): boolean {
  return hasActionOfKind(actions, "bad-source");
}

/** Extract the LXMessage.pack plan from actions; null when empty. */
export function lxMessagePackPlanFromActions(
  actions: ReadonlyArray<LxMessagePackPlanAction>,
): LxMessagePackGate | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "bad-destination" ||
      entry.kind === "bad-source",
  );
  return action?.kind ?? null;
}

/**
 * Static LXMessage.pack destination/source gates are event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc plan reads
 * beside the step).
 * Plan nested via {@link stepLxMessagePackPlanWithActions}
 * (`ok`|`bad-destination`|`bad-source`).
 */
export type LxMessagePackState = Record<string, never>;

export type LxMessagePackEvent =
  | Event
  | {
      readonly kind: "lxmessage-pack/gate";
      readonly destinationDirectionOut: boolean;
      readonly sourceDirectionIn: boolean;
      readonly sourceIdentityPresent: boolean;
    };

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxMessagePackPlanWithActions}
 * (`ok`|`bad-destination`|`bad-source`).
 */
export type LxMessagePackAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-bad-destination" }
  | { readonly kind: "reject-bad-source" };

export interface LxMessagePackStepResult {
  readonly state: LxMessagePackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessagePackAction[];
}

export function initialLxMessagePackState(): LxMessagePackState {
  return {};
}

export const stepLxMessagePack: StepFn<LxMessagePackState> = (state, event) => {
  const result = stepLxMessagePackInner(state, event as LxMessagePackEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxMessagePackWithActions(
  state: LxMessagePackState,
  event: LxMessagePackEvent,
): LxMessagePackStepResult {
  return stepLxMessagePackInner(state, event);
}

export function shouldProceedLxMessagePack(
  actions: ReadonlyArray<LxMessagePackAction>,
): boolean {
  return hasActionOfKind(actions, "proceed");
}

export function shouldRejectLxMessagePackBadDestination(
  actions: ReadonlyArray<LxMessagePackAction>,
): boolean {
  return hasActionOfKind(actions, "reject-bad-destination");
}

export function shouldRejectLxMessagePackBadSource(
  actions: ReadonlyArray<LxMessagePackAction>,
): boolean {
  return hasActionOfKind(actions, "reject-bad-source");
}

function stepLxMessagePackInner(
  state: LxMessagePackState,
  event: LxMessagePackEvent,
): LxMessagePackStepResult {
  if (event.kind === "lxmessage-pack/gate") {
    const planActions = stepLxMessagePackPlanWithActions(
      initialLxMessagePackPlanState(),
      {
        kind: "lxmessage-pack/plan-gate",
        destinationDirectionOut: event.destinationDirectionOut,
        sourceDirectionIn: event.sourceDirectionIn,
        sourceIdentityPresent: event.sourceIdentityPresent,
      },
    ).actions;
    if (shouldRejectLxMessagePackPlanBadDestination(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-bad-destination" }],
      };
    }
    if (shouldRejectLxMessagePackPlanBadSource(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-bad-source" }] };
    }
    if (!shouldPlanLxMessagePackOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfPackTimestampPlan = "use-timestamp" | "use-now" | "reject";

/** How LXMessage.pack should obtain its timestamp (explicit / injected now / reject). */
export function planLxmfPackTimestamp(input: {
  readonly hasTimestamp: boolean;
  readonly hasNow: boolean;
}): LxmfPackTimestampPlan {
  if (input.hasTimestamp) {
    return "use-timestamp";
  }
  if (input.hasNow) {
    return "use-now";
  }
  return "reject";
}

/**
 * Pack-timestamp-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPackTimestamp` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPackTimestampWithActions}.
 */
export type LxmfPackTimestampPlanState = Record<string, never>;

export type LxmfPackTimestampPlanEvent =
  | Event
  | {
      readonly kind: "pack-timestamp/plan-gate";
      readonly hasTimestamp: boolean;
      readonly hasNow: boolean;
    };

export type LxmfPackTimestampPlanAction =
  | { readonly kind: "use-timestamp" }
  | { readonly kind: "use-now" }
  | { readonly kind: "reject" };

export interface LxmfPackTimestampPlanStepResult {
  readonly state: LxmfPackTimestampPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPackTimestampPlanAction[];
}

export function initialLxmfPackTimestampPlanState(): LxmfPackTimestampPlanState {
  return {};
}

export function stepLxmfPackTimestampPlanWithActions(
  state: LxmfPackTimestampPlanState,
  event: LxmfPackTimestampPlanEvent,
): LxmfPackTimestampPlanStepResult {
  if (event.kind === "pack-timestamp/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfPackTimestamp({
            hasTimestamp: event.hasTimestamp,
            hasNow: event.hasNow,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions select an explicit timestamp. */
export function shouldPlanLxmfPackTimestampUseTimestamp(
  actions: ReadonlyArray<LxmfPackTimestampPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-timestamp");
}

/** Whether plan actions select injected now. */
export function shouldPlanLxmfPackTimestampUseNow(
  actions: ReadonlyArray<LxmfPackTimestampPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-now");
}

/** Whether plan actions reject timestamp selection. */
export function shouldRejectLxmfPackTimestampPlan(
  actions: ReadonlyArray<LxmfPackTimestampPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract the pack-timestamp plan from actions; null when empty. */
export function lxmfPackTimestampPlanFromActions(
  actions: ReadonlyArray<LxmfPackTimestampPlanAction>,
): LxmfPackTimestampPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "use-timestamp" ||
      entry.kind === "use-now" ||
      entry.kind === "reject",
  );
  return action?.kind ?? null;
}

/**
 * LXMessage.pack timestamp selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPackTimestampPlanWithActions}
 * (`use-timestamp`|`use-now`|`reject`).
 */
export type LxmfPackTimestampState = Record<string, never>;

export type LxmfPackTimestampEvent =
  | Event
  | {
      readonly kind: "pack-timestamp/select";
      readonly hasTimestamp: boolean;
      readonly hasNow: boolean;
    };

/**
 * Adapter applies use-timestamp / use-now / reject only from these actions.
 * Plan nested via {@link stepLxmfPackTimestampPlanWithActions}
 * (`use-timestamp`|`use-now`|`reject`).
 */
export type LxmfPackTimestampAction =
  | { readonly kind: "use-timestamp" }
  | { readonly kind: "use-now" }
  | { readonly kind: "reject" };

export interface LxmfPackTimestampStepResult {
  readonly state: LxmfPackTimestampState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPackTimestampAction[];
}

export function initialLxmfPackTimestampState(): LxmfPackTimestampState {
  return {};
}

export const stepLxmfPackTimestamp: StepFn<LxmfPackTimestampState> = (
  state,
  event,
) => {
  const result = stepLxmfPackTimestampInner(
    state,
    event as LxmfPackTimestampEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPackTimestampWithActions(
  state: LxmfPackTimestampState,
  event: LxmfPackTimestampEvent,
): LxmfPackTimestampStepResult {
  return stepLxmfPackTimestampInner(state, event);
}

export function shouldUseLxmfPackTimestamp(
  actions: ReadonlyArray<LxmfPackTimestampAction>,
): boolean {
  return hasActionOfKind(actions, "use-timestamp");
}

export function shouldUseLxmfPackNow(
  actions: ReadonlyArray<LxmfPackTimestampAction>,
): boolean {
  return hasActionOfKind(actions, "use-now");
}

export function shouldRejectLxmfPackTimestampSelect(
  actions: ReadonlyArray<LxmfPackTimestampAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

function stepLxmfPackTimestampInner(
  state: LxmfPackTimestampState,
  event: LxmfPackTimestampEvent,
): LxmfPackTimestampStepResult {
  if (event.kind === "pack-timestamp/select") {
    const planActions = stepLxmfPackTimestampPlanWithActions(
      initialLxmfPackTimestampPlanState(),
      {
        kind: "pack-timestamp/plan-gate",
        hasTimestamp: event.hasTimestamp,
        hasNow: event.hasNow,
      },
    ).actions;
    if (shouldPlanLxmfPackTimestampUseTimestamp(planActions)) {
      return { state, intents: [], actions: [{ kind: "use-timestamp" }] };
    }
    if (shouldPlanLxmfPackTimestampUseNow(planActions)) {
      return { state, intents: [], actions: [{ kind: "use-now" }] };
    }
    if (shouldRejectLxmfPackTimestampPlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return { state, intents: [], actions: [] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether packing should include a stamp field (omit when deferStamp is true). */
export function shouldIncludeLxmfStamp(
  deferStamp: boolean | undefined,
): boolean {
  return deferStamp !== true;
}

/**
 * shouldIncludeLxmfStamp gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldIncludeLxmfStamp`
 * reads beside the step).
 */
export type IncludeLxmfStampState = Record<string, never>;

export type IncludeLxmfStampEvent =
  | Event
  | {
      readonly kind: "lxmf/include-stamp-gate";
      readonly deferStamp: boolean | undefined;
    };

export type IncludeLxmfStampAction =
  { readonly kind: "include" } | { readonly kind: "skip" };

export interface IncludeLxmfStampStepResult {
  readonly state: IncludeLxmfStampState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IncludeLxmfStampAction[];
}

export function initialIncludeLxmfStampState(): IncludeLxmfStampState {
  return {};
}

export function stepIncludeLxmfStampWithActions(
  state: IncludeLxmfStampState,
  event: IncludeLxmfStampEvent,
): IncludeLxmfStampStepResult {
  if (event.kind === "lxmf/include-stamp-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldIncludeLxmfStamp(event.deferStamp) ? "include" : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIncludeLxmfStampNow(
  actions: ReadonlyArray<IncludeLxmfStampAction>,
): boolean {
  return hasActionOfKind(actions, "include");
}

export function shouldSkipIncludeLxmfStamp(
  actions: ReadonlyArray<IncludeLxmfStampAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export type LxmfDeliverableAcceptPlan =
  "accept" | "reject-unsigned" | "reject-seen";
