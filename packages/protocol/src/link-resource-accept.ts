/**
 * Pure link inbound resource-advertisement acceptance planning.
 * Decrypt / unpack / app callbacks stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  LinkResourceStrategy,
  type LinkResourceStrategyValue
} from "./link-watchdog.js";

export type LinkResourceAcceptPlan =
  | { readonly kind: "ignore" }
  | { readonly kind: "accept" }
  | { readonly kind: "ask-app" };

export interface LinkResourceAdvertisementState {
  readonly strategy: LinkResourceStrategyValue | number;
  readonly waitingApp: boolean;
}

export type LinkResourceAdvertisementEvent =
  | Event
  | { readonly kind: "resource-adv/received"; readonly isRequest: boolean }
  | { readonly kind: "resource-adv/app-result"; readonly accepted: boolean };

/**
 * Adapter applies ignore / ask-app / accept / reject only from these actions.
 */
export type LinkResourceAdvertisementAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "ask-app" }
  | { readonly kind: "accept" }
  | { readonly kind: "reject" };

export interface LinkResourceAdvertisementStepResult {
  readonly state: LinkResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceAdvertisementAction[];
}

export function initialLinkResourceAdvertisementState(input: {
  readonly strategy: LinkResourceStrategyValue | number;
}): LinkResourceAdvertisementState {
  return {
    strategy: input.strategy,
    waitingApp: false
  };
}

export function planLinkResourceAccept(
  strategy: LinkResourceStrategyValue | number
): LinkResourceAcceptPlan {
  if (strategy === LinkResourceStrategy.ACCEPT_NONE) {
    return { kind: "ignore" };
  }
  if (strategy === LinkResourceStrategy.ACCEPT_APP) {
    return { kind: "ask-app" };
  }
  return { kind: "accept" };
}

/**
 * Whether an inbound RESOURCE_ADV should accept / ask-app / ignore.
 * Request advertisements always accept (bypass strategy); strategy applies to offers.
 */
export function planLinkResourceAdvertisement(input: {
  readonly isRequest: boolean;
  readonly strategy: LinkResourceStrategyValue | number;
}): LinkResourceAcceptPlan {
  if (input.isRequest) {
    return { kind: "accept" };
  }
  return planLinkResourceAccept(input.strategy);
}

/** After ask-app, map the app callback result to accept/reject. */
export function planLinkResourceAcceptAppResult(appAccepted: boolean): "accept" | "reject" {
  return appAccepted ? "accept" : "reject";
}

export const stepLinkResourceAdvertisement: StepFn<LinkResourceAdvertisementState> = (
  state,
  event
) => {
  const result = stepLinkResourceAdvertisementInner(
    state,
    event as LinkResourceAdvertisementEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkResourceAdvertisementWithActions(
  state: LinkResourceAdvertisementState,
  event: LinkResourceAdvertisementEvent
): LinkResourceAdvertisementStepResult {
  return stepLinkResourceAdvertisementInner(state, event);
}

/** Whether step actions include ignore. */
export function shouldIgnoreLinkResourceAdvertisement(
  actions: ReadonlyArray<LinkResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

/** Whether step actions include ask-app. */
export function shouldAskAppLinkResourceAdvertisement(
  actions: ReadonlyArray<LinkResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "ask-app");
}

/** Whether step actions include accept. */
export function shouldAcceptLinkResourceAdvertisement(
  actions: ReadonlyArray<LinkResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

/** Whether step actions include reject. */
export function shouldRejectLinkResourceAdvertisement(
  actions: ReadonlyArray<LinkResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

function stepLinkResourceAdvertisementInner(
  state: LinkResourceAdvertisementState,
  event: LinkResourceAdvertisementEvent
): LinkResourceAdvertisementStepResult {
  if (event.kind === "resource-adv/received") {
    const plan = planLinkResourceAdvertisement({
      isRequest: event.isRequest,
      strategy: state.strategy
    });
    if (plan.kind === "ignore") {
      return {
        state,
        intents: [],
        actions: [{ kind: "ignore" }]
      };
    }
    if (plan.kind === "ask-app") {
      return {
        state: { ...state, waitingApp: true },
        intents: [],
        actions: [{ kind: "ask-app" }]
      };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "accept" }]
    };
  }

  if (event.kind === "resource-adv/app-result") {
    if (!state.waitingApp) {
      return { state, intents: [], actions: [] };
    }
    const outcome = planLinkResourceAcceptAppResult(event.accepted);
    return {
      state: { ...state, waitingApp: false },
      intents: [],
      actions: [{ kind: outcome }]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether the link may start another outbound resource transfer (no outgoing in flight). */
export function linkReadyForNewResource(outgoingCount: number): boolean {
  return outgoingCount === 0;
}

/** Whether an outgoing resource should handle this RESOURCE_REQ packet. */
export function shouldHandleOutgoingResourceRequest(input: {
  readonly hashMatches: boolean;
  readonly alreadySeen: boolean;
}): boolean {
  return input.hashMatches && !input.alreadySeen;
}

/** Whether an incoming resource matches a hashmap/cancel/part packet by hash. */
export function shouldHandleIncomingResourceByHash(hashMatches: boolean): boolean {
  return hashMatches;
}

/** Whether a link resource list should receive a new member (not already present). */
export function shouldRegisterLinkResource(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
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
    removeIncomingIndex: input.incomingIndex >= 0 ? input.incomingIndex : null
  };
}

/** Whether resource conclude may splice a list after {@link planLinkResourceConclude}. */
export function shouldRemoveLinkResourceListIndex(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Link resource conclude is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
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

export const stepLinkResourceConclude: StepFn<LinkResourceConcludeState> = (state, event) => {
  const result = stepLinkResourceConcludeInner(state, event as LinkResourceConcludeEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkResourceConcludeWithActions(
  state: LinkResourceConcludeState,
  event: LinkResourceConcludeEvent
): LinkResourceConcludeStepResult {
  return stepLinkResourceConcludeInner(state, event);
}

export function outgoingLinkResourceConcludeIndex(
  actions: ReadonlyArray<LinkResourceConcludeAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove-outgoing");
  return action?.kind === "remove-outgoing" ? action.index : null;
}

export function incomingLinkResourceConcludeIndex(
  actions: ReadonlyArray<LinkResourceConcludeAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove-incoming");
  return action?.kind === "remove-incoming" ? action.index : null;
}

export function shouldRemoveOutgoingLinkResourceConclude(
  actions: ReadonlyArray<LinkResourceConcludeAction>
): boolean {
  return actions.some((action) => action.kind === "remove-outgoing");
}

export function shouldRemoveIncomingLinkResourceConclude(
  actions: ReadonlyArray<LinkResourceConcludeAction>
): boolean {
  return actions.some((action) => action.kind === "remove-incoming");
}

function stepLinkResourceConcludeInner(
  state: LinkResourceConcludeState,
  event: LinkResourceConcludeEvent
): LinkResourceConcludeStepResult {
  if (event.kind === "link/resource-conclude-gate") {
    const plan = planLinkResourceConclude({
      outgoingIndex: event.outgoingIndex,
      incomingIndex: event.incomingIndex
    });
    const actions: LinkResourceConcludeAction[] = [];
    if (plan.removeOutgoingIndex !== null) {
      actions.push({ kind: "remove-outgoing", index: plan.removeOutgoingIndex });
    }
    if (plan.removeIncomingIndex !== null) {
      actions.push({ kind: "remove-incoming", index: plan.removeIncomingIndex });
    }
    return { state, intents: [], actions };
  }

  return { state, intents: [], actions: [] };
}
