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
import {
  LinkResourceStrategy,
  type LinkResourceStrategyValue,
} from "../link-watchdog.js";
import { hasActionOfKind } from "../action-kind.js";

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
 * Plan nested via {@link stepLinkResourceAdvertisementPlanWithActions}
 * (`ignore`|`ask-app`|`accept`) and
 * {@link stepLinkResourceAcceptAppResultPlanWithActions} (`accept`|`reject`).
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
    waitingApp: false,
  };
}

export function planLinkResourceAccept(
  strategy: LinkResourceStrategyValue | number,
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

/**
 * Advertisement-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkResourceAdvertisement` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepLinkResourceAdvertisementWithActions}.
 */
export type LinkResourceAdvertisementPlanState = Record<string, never>;

export type LinkResourceAdvertisementPlanEvent =
  | Intent
  | {
      readonly kind: "resource-adv/advertisement-plan-gate";
      readonly isRequest: boolean;
      readonly strategy: LinkResourceStrategyValue | number;
    };

export type LinkResourceAdvertisementPlanAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "ask-app" }
  | { readonly kind: "accept" };

export interface LinkResourceAdvertisementPlanStepResult {
  readonly state: LinkResourceAdvertisementPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceAdvertisementPlanAction[];
}

export function initialLinkResourceAdvertisementPlanState(): LinkResourceAdvertisementPlanState {
  return {};
}

export function stepLinkResourceAdvertisementPlanWithActions(
  state: LinkResourceAdvertisementPlanState,
  event: LinkResourceAdvertisementPlanEvent,
): LinkResourceAdvertisementPlanStepResult {
  if (event.kind === "resource-adv/advertisement-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        planLinkResourceAdvertisement({
          isRequest: event.isRequest,
          strategy: event.strategy,
        }),
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreLinkResourceAdvertisementPlan(
  actions: ReadonlyArray<LinkResourceAdvertisementPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

export function shouldAskAppLinkResourceAdvertisementPlan(
  actions: ReadonlyArray<LinkResourceAdvertisementPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ask-app");
}

export function shouldAcceptLinkResourceAdvertisementPlan(
  actions: ReadonlyArray<LinkResourceAdvertisementPlanAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

/** Extract the advertisement plan from actions; null when empty. */
export function linkResourceAdvertisementPlanFromActions(
  actions: ReadonlyArray<LinkResourceAdvertisementPlanAction>,
): LinkResourceAcceptPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ignore" ||
      entry.kind === "ask-app" ||
      entry.kind === "accept",
  );
  return action ?? null;
}

/** After ask-app, map the app callback result to accept/reject. */
export function planLinkResourceAcceptAppResult(
  appAccepted: boolean,
): "accept" | "reject" {
  return appAccepted ? "accept" : "reject";
}

/**
 * App-result-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkResourceAcceptAppResult` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkResourceAdvertisementWithActions}.
 */
export type LinkResourceAcceptAppResultPlanState = Record<string, never>;

export type LinkResourceAcceptAppResultPlanEvent =
  | Intent
  | {
      readonly kind: "resource-adv/app-result-plan-gate";
      readonly accepted: boolean;
    };

export type LinkResourceAcceptAppResultPlanAction =
  { readonly kind: "accept" } | { readonly kind: "reject" };

export interface LinkResourceAcceptAppResultPlanStepResult {
  readonly state: LinkResourceAcceptAppResultPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceAcceptAppResultPlanAction[];
}

export function initialLinkResourceAcceptAppResultPlanState(): LinkResourceAcceptAppResultPlanState {
  return {};
}

export function stepLinkResourceAcceptAppResultPlanWithActions(
  state: LinkResourceAcceptAppResultPlanState,
  event: LinkResourceAcceptAppResultPlanEvent,
): LinkResourceAcceptAppResultPlanStepResult {
  if (event.kind === "resource-adv/app-result-plan-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planLinkResourceAcceptAppResult(event.accepted) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkResourceAcceptAppResultPlan(
  actions: ReadonlyArray<LinkResourceAcceptAppResultPlanAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldRejectLinkResourceAcceptAppResultPlan(
  actions: ReadonlyArray<LinkResourceAcceptAppResultPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract the app-result plan from actions; null when empty. */
export function linkResourceAcceptAppResultPlanFromActions(
  actions: ReadonlyArray<LinkResourceAcceptAppResultPlanAction>,
): "accept" | "reject" | null {
  const action = actions.find(
    (entry) => entry.kind === "accept" || entry.kind === "reject",
  );
  return action?.kind ?? null;
}

export const stepLinkResourceAdvertisement: StepFn<
  LinkResourceAdvertisementState
> = (state, event) => {
  const result = stepLinkResourceAdvertisementInner(
    state,
    event as LinkResourceAdvertisementEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkResourceAdvertisementWithActions(
  state: LinkResourceAdvertisementState,
  event: LinkResourceAdvertisementEvent,
): LinkResourceAdvertisementStepResult {
  return stepLinkResourceAdvertisementInner(state, event);
}

/** Whether step actions include ignore. */
export function shouldIgnoreLinkResourceAdvertisement(
  actions: ReadonlyArray<LinkResourceAdvertisementAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

/** Whether step actions include ask-app. */
export function shouldAskAppLinkResourceAdvertisement(
  actions: ReadonlyArray<LinkResourceAdvertisementAction>,
): boolean {
  return hasActionOfKind(actions, "ask-app");
}

/** Whether step actions include accept. */
export function shouldAcceptLinkResourceAdvertisement(
  actions: ReadonlyArray<LinkResourceAdvertisementAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

/** Whether step actions include reject. */
export function shouldRejectLinkResourceAdvertisement(
  actions: ReadonlyArray<LinkResourceAdvertisementAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

function stepLinkResourceAdvertisementInner(
  state: LinkResourceAdvertisementState,
  event: LinkResourceAdvertisementEvent,
): LinkResourceAdvertisementStepResult {
  if (event.kind === "resource-adv/received") {
    const planActions = stepLinkResourceAdvertisementPlanWithActions(
      initialLinkResourceAdvertisementPlanState(),
      {
        kind: "resource-adv/advertisement-plan-gate",
        isRequest: event.isRequest,
        strategy: state.strategy,
      },
    ).actions;
    if (shouldIgnoreLinkResourceAdvertisementPlan(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "ignore" }],
      };
    }
    if (shouldAskAppLinkResourceAdvertisementPlan(planActions)) {
      return {
        state: { ...state, waitingApp: true },
        intents: [],
        actions: [{ kind: "ask-app" }],
      };
    }
    if (!shouldAcceptLinkResourceAdvertisementPlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "accept" }],
    };
  }

  if (event.kind === "resource-adv/app-result") {
    if (!state.waitingApp) {
      return { state, intents: [], actions: [] };
    }
    const planActions = stepLinkResourceAcceptAppResultPlanWithActions(
      initialLinkResourceAcceptAppResultPlanState(),
      {
        kind: "resource-adv/app-result-plan-gate",
        accepted: event.accepted,
      },
    ).actions;
    if (shouldRejectLinkResourceAcceptAppResultPlan(planActions)) {
      return {
        state: { ...state, waitingApp: false },
        intents: [],
        actions: [{ kind: "reject" }],
      };
    }
    if (!shouldAcceptLinkResourceAcceptAppResultPlan(planActions)) {
      return {
        state: { ...state, waitingApp: false },
        intents: [],
        actions: [],
      };
    }
    return {
      state: { ...state, waitingApp: false },
      intents: [],
      actions: [{ kind: "accept" }],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether the link may start another outbound resource transfer (no outgoing in flight). */
export function linkReadyForNewResource(outgoingCount: number): boolean {
  return outgoingCount === 0;
}

/**
 * linkReadyForNewResource gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkReadyForNewResource` reads beside
 * the step).
 */
export type LinkReadyForNewResourceState = Record<string, never>;

export type LinkReadyForNewResourceEvent =
  | Event
  | {
      readonly kind: "link/ready-for-new-resource-gate";

      readonly outgoingCount: number;
    };

export type LinkReadyForNewResourceAction =
  { readonly kind: "ready" } | { readonly kind: "busy" };

export interface LinkReadyForNewResourceStepResult {
  readonly state: LinkReadyForNewResourceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkReadyForNewResourceAction[];
}

export function initialLinkReadyForNewResourceState(): LinkReadyForNewResourceState {
  return {};
}

export function stepLinkReadyForNewResourceWithActions(
  state: LinkReadyForNewResourceState,
  event: LinkReadyForNewResourceEvent,
): LinkReadyForNewResourceStepResult {
  if (event.kind === "link/ready-for-new-resource-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: linkReadyForNewResource(event.outgoingCount) ? "ready" : "busy",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldLinkReadyForNewResource(
  actions: ReadonlyArray<LinkReadyForNewResourceAction>,
): boolean {
  return hasActionOfKind(actions, "ready");
}

export function shouldLinkBusyForNewResource(
  actions: ReadonlyArray<LinkReadyForNewResourceAction>,
): boolean {
  return hasActionOfKind(actions, "busy");
}
/** Whether an outgoing resource should handle this RESOURCE_REQ packet. */
export function shouldHandleOutgoingResourceRequest(input: {
  readonly hashMatches: boolean;
  readonly alreadySeen: boolean;
}): boolean {
  return input.hashMatches && !input.alreadySeen;
}

/**
 * shouldHandleOutgoingResourceRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldHandleOutgoingResourceRequest`
 * reads beside the step).
 */
export type HandleOutgoingResourceRequestState = Record<string, never>;

export type HandleOutgoingResourceRequestEvent =
  | Event
  | {
      readonly kind: "link/handle-outgoing-resource-request-gate";
      readonly hashMatches: boolean;
      readonly alreadySeen: boolean;
    };

export type HandleOutgoingResourceRequestAction =
  { readonly kind: "handle" } | { readonly kind: "skip" };

export interface HandleOutgoingResourceRequestStepResult {
  readonly state: HandleOutgoingResourceRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly HandleOutgoingResourceRequestAction[];
}

export function initialHandleOutgoingResourceRequestState(): HandleOutgoingResourceRequestState {
  return {};
}
