/** Extracted from link-resource-accept.ts; the original module remains the public composition point. */
/**
 * Pure link inbound resource-advertisement acceptance planning.
 * Decrypt / unpack / app callbacks stay at the adapter edge.
 * Advertisement-plan / app-result-plan / acceptance conclusions leave via
 * machine actions (no ad-hoc `planLinkResourceAdvertisement` /
 * `planLinkResourceAcceptAppResult` / `plan.kind` / `outcome ===` reads beside
 * the step).
 * Resource register membership concludes via machine actions (no ad-hoc
 * `shouldRegisterLinkResource` reads beside the step).
 * Outgoing RESOURCE_REQ match and incoming-by-hash match conclude via machine
 * actions (no ad-hoc `shouldHandleOutgoingResourceRequest` /
 * `shouldHandleIncomingResourceByHash` reads beside the step).
 * Resource-conclude plan nested via {@link stepLinkResourceConcludePlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { shouldHandleOutgoingResourceRequest } from "./part-1.js";
import type {
  HandleOutgoingResourceRequestAction,
  HandleOutgoingResourceRequestEvent,
  HandleOutgoingResourceRequestState,
  HandleOutgoingResourceRequestStepResult,
} from "./part-1.js";
import {
  firstAction,
  firstActionOfKind,
  hasActionOfKind,
} from "../action-kind.js";
export function stepHandleOutgoingResourceRequestWithActions(
  state: HandleOutgoingResourceRequestState,
  event: HandleOutgoingResourceRequestEvent,
): HandleOutgoingResourceRequestStepResult {
  if (event.kind === "link/handle-outgoing-resource-request-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldHandleOutgoingResourceRequest({
            hashMatches: event.hashMatches,
            alreadySeen: event.alreadySeen,
          })
            ? "handle"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldHandleOutgoingResourceRequestNow(
  actions: ReadonlyArray<HandleOutgoingResourceRequestAction>,
): boolean {
  return hasActionOfKind(actions, "handle");
}

export function shouldSkipHandleOutgoingResourceRequest(
  actions: ReadonlyArray<HandleOutgoingResourceRequestAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether an incoming resource matches a hashmap/cancel/part packet by hash. */
export function shouldHandleIncomingResourceByHash(
  hashMatches: boolean,
): boolean {
  return hashMatches;
}

/**
 * shouldHandleIncomingResourceByHash gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldHandleIncomingResourceByHash`
 * reads beside the step).
 */
export type HandleIncomingResourceByHashState = Record<string, never>;

export type HandleIncomingResourceByHashEvent =
  | Event
  | {
      readonly kind: "link/handle-incoming-resource-by-hash-gate";
      readonly hashMatches: boolean;
    };

export type HandleIncomingResourceByHashAction =
  { readonly kind: "handle" } | { readonly kind: "skip" };

export interface HandleIncomingResourceByHashStepResult {
  readonly state: HandleIncomingResourceByHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly HandleIncomingResourceByHashAction[];
}

export function initialHandleIncomingResourceByHashState(): HandleIncomingResourceByHashState {
  return {};
}

export function stepHandleIncomingResourceByHashWithActions(
  state: HandleIncomingResourceByHashState,
  event: HandleIncomingResourceByHashEvent,
): HandleIncomingResourceByHashStepResult {
  if (event.kind === "link/handle-incoming-resource-by-hash-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldHandleIncomingResourceByHash(event.hashMatches)
            ? "handle"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldHandleIncomingResourceByHashNow(
  actions: ReadonlyArray<HandleIncomingResourceByHashAction>,
): boolean {
  return hasActionOfKind(actions, "handle");
}

export function shouldSkipHandleIncomingResourceByHash(
  actions: ReadonlyArray<HandleIncomingResourceByHashAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether a link resource list should receive a new member (not already present). */
export function shouldRegisterLinkResource(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
}

/**
 * shouldRegisterLinkResource gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRegisterLinkResource` reads beside
 * the step).
 */
export type RegisterLinkResourceState = Record<string, never>;

export type RegisterLinkResourceEvent =
  | Event
  | {
      readonly kind: "link/register-resource-gate";
      readonly alreadyPresent: boolean;
    };

export type RegisterLinkResourceAction =
  { readonly kind: "register" } | { readonly kind: "skip" };

export interface RegisterLinkResourceStepResult {
  readonly state: RegisterLinkResourceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterLinkResourceAction[];
}

export function initialRegisterLinkResourceState(): RegisterLinkResourceState {
  return {};
}

export function stepRegisterLinkResourceWithActions(
  state: RegisterLinkResourceState,
  event: RegisterLinkResourceEvent,
): RegisterLinkResourceStepResult {
  if (event.kind === "link/register-resource-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterLinkResource(event.alreadyPresent)
            ? "register"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterLinkResourceNow(
  actions: ReadonlyArray<RegisterLinkResourceAction>,
): boolean {
  return hasActionOfKind(actions, "register");
}

export function shouldSkipRegisterLinkResource(
  actions: ReadonlyArray<RegisterLinkResourceAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export type LinkResourceConcludePlan = {
  readonly removeOutgoingIndex: number | null;
  readonly removeIncomingIndex: number | null;
};

/**
 * Resource conclude: drop from outgoing and/or incoming lists.
 * Splice stays at the adapter.
 */
export function planLinkResourceConclude(input: {
  readonly outgoingIndex: number;
  readonly incomingIndex: number;
}): LinkResourceConcludePlan {
  return {
    removeOutgoingIndex: input.outgoingIndex >= 0 ? input.outgoingIndex : null,
    removeIncomingIndex: input.incomingIndex >= 0 ? input.incomingIndex : null,
  };
}

/**
 * Link resource-conclude plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkResourceConclude`
 * reads beside the step). Nested under {@link stepLinkResourceConcludeWithActions}.
 */
export type LinkResourceConcludePlanState = Record<string, never>;

export type LinkResourceConcludePlanEvent =
  | Intent
  | {
      readonly kind: "link/resource-conclude-plan-gate";
      readonly outgoingIndex: number;
      readonly incomingIndex: number;
    };

export type LinkResourceConcludePlanAction = {
  readonly kind: "plan";
  readonly removeOutgoingIndex: number | null;
  readonly removeIncomingIndex: number | null;
};

export interface LinkResourceConcludePlanStepResult {
  readonly state: LinkResourceConcludePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceConcludePlanAction[];
}

export function initialLinkResourceConcludePlanState(): LinkResourceConcludePlanState {
  return {};
}

export function stepLinkResourceConcludePlanWithActions(
  state: LinkResourceConcludePlanState,
  event: LinkResourceConcludePlanEvent,
): LinkResourceConcludePlanStepResult {
  if (event.kind === "link/resource-conclude-plan-gate") {
    const plan = planLinkResourceConclude({
      outgoingIndex: event.outgoingIndex,
      incomingIndex: event.incomingIndex,
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "plan",
          removeOutgoingIndex: plan.removeOutgoingIndex,
          removeIncomingIndex: plan.removeIncomingIndex,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the resource-conclude plan from actions; null when empty. */
export function linkResourceConcludePlanFromActions(
  actions: ReadonlyArray<LinkResourceConcludePlanAction>,
): LinkResourceConcludePlan | null {
  const action = firstAction(actions);
  if (action === undefined) {
    return null;
  }
  return {
    removeOutgoingIndex: action.removeOutgoingIndex,
    removeIncomingIndex: action.removeIncomingIndex,
  };
}

/** Whether resource conclude may splice a list after {@link planLinkResourceConclude}. */
export function shouldRemoveLinkResourceListIndex(
  indexPresent: boolean,
): boolean {
  return indexPresent;
}

/**
 * Link resource conclude is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkResourceConcludePlanWithActions}.
 */
export type LinkResourceConcludeState = Record<string, never>;

export type LinkResourceConcludeEvent =
  | Event
  | {
      readonly kind: "link/resource-conclude-gate";
      readonly outgoingIndex: number;
      readonly incomingIndex: number;
    };

export type LinkResourceConcludeAction =
  | { readonly kind: "remove-outgoing"; readonly index: number }
  | { readonly kind: "remove-incoming"; readonly index: number };

export interface LinkResourceConcludeStepResult {
  readonly state: LinkResourceConcludeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceConcludeAction[];
}

export function initialLinkResourceConcludeState(): LinkResourceConcludeState {
  return {};
}

export const stepLinkResourceConclude: StepFn<LinkResourceConcludeState> = (
  state,
  event,
) => {
  const result = stepLinkResourceConcludeInner(
    state,
    event as LinkResourceConcludeEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkResourceConcludeWithActions(
  state: LinkResourceConcludeState,
  event: LinkResourceConcludeEvent,
): LinkResourceConcludeStepResult {
  return stepLinkResourceConcludeInner(state, event);
}

export function outgoingLinkResourceConcludeIndex(
  actions: ReadonlyArray<LinkResourceConcludeAction>,
): number | null {
  return firstActionOfKind(actions, "remove-outgoing")?.index ?? null;
}

export function incomingLinkResourceConcludeIndex(
  actions: ReadonlyArray<LinkResourceConcludeAction>,
): number | null {
  return firstActionOfKind(actions, "remove-incoming")?.index ?? null;
}

export function shouldRemoveOutgoingLinkResourceConclude(
  actions: ReadonlyArray<LinkResourceConcludeAction>,
): boolean {
  return hasActionOfKind(actions, "remove-outgoing");
}

export function shouldRemoveIncomingLinkResourceConclude(
  actions: ReadonlyArray<LinkResourceConcludeAction>,
): boolean {
  return hasActionOfKind(actions, "remove-incoming");
}

function stepLinkResourceConcludeInner(
  state: LinkResourceConcludeState,
  event: LinkResourceConcludeEvent,
): LinkResourceConcludeStepResult {
  if (event.kind === "link/resource-conclude-gate") {
    const planActions = stepLinkResourceConcludePlanWithActions(
      initialLinkResourceConcludePlanState(),
      {
        kind: "link/resource-conclude-plan-gate",
        outgoingIndex: event.outgoingIndex,
        incomingIndex: event.incomingIndex,
      },
    ).actions;
    const plan = linkResourceConcludePlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    const actions: LinkResourceConcludeAction[] = [];
    if (plan.removeOutgoingIndex !== null) {
      actions.push({
        kind: "remove-outgoing",
        index: plan.removeOutgoingIndex,
      });
    }
    if (plan.removeIncomingIndex !== null) {
      actions.push({
        kind: "remove-incoming",
        index: plan.removeIncomingIndex,
      });
    }
    return { state, intents: [], actions };
  }

  return { state, intents: [], actions: [] };
}
