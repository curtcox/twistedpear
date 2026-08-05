/** Extracted from link-establish.ts; the original module remains the public composition point. */
/**
 * Pure link establishment status transitions (handshake → proof/RTT → ACTIVE)
 * and inbound application-request dispatch (handler invoke → response send).
 * Crypto verification and packet IO stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc status / plan.kind reads
 * beside the step). RTT compute / merge conclusions leave via machine actions
 * (no ad-hoc `computeLinkRttSeconds` / `mergeLinkRtt` reads beside the step).
 * Send / closed / reuse / packet-interface / encrypt / request-allow /
 * last-data / inbound-DATA / keepalive-update / create-channel /
 * handshake / prove / owner-public-key / validate-proof / proof-crypto /
 * accept-RTT / identify / plaintext-dispatch / resend gates conclude
 * via machine actions (no ad-hoc `canLinkSend` / `isLinkClosed` /
 * `shouldReuseActiveLink` / `shouldAcceptLinkPacketInterface` /
 * `shouldEncryptLinkPayload` / `canLinkRequest` / `shouldUpdateLinkLastData` /
 * `isLinkInboundDataPacket` / `canUpdateLinkKeepalive` /
 * `shouldCreateLinkChannel` / `canPerformLinkHandshake` / `canProveLink` /
 * `canAcceptLinkOwnerPublicKey` / `canAcceptLinkRequestOwner` /
 * `canValidateLinkProof` /
 * `shouldAttemptLinkProofCrypto` / `canAcceptLinkRtt` /
 * `shouldTeardownLinkFromRtt` / `canIdentifyOnLink` /
 * `shouldDispatchLinkPlaintext` / `canResendLinkPacket` reads beside the step).
 * Link-member register / invoke-app-request-handler / send-app-request-response
 * gates conclude via machine actions (no ad-hoc `shouldRegisterLinkMember` /
 * `shouldInvokeLinkAppRequestHandler` / `shouldSendLinkAppRequestResponse`
 * reads beside the step).
 * Continue-validate-request apply gate conclusions leave via machine actions
 * (no ad-hoc `shouldContinueLinkValidateRequest` reads beside the step).
 * Destination request-allow conclusions leave via machine actions (no ad-hoc
 * `planDestinationRequestAllow` reads beside the step).
 * Accept-link-request-owner conclusions leave via machine actions (no ad-hoc
 * `canAcceptLinkRequestOwner` reads beside the step).
 * Send-link-app-response-allow conclusions leave via machine actions (no ad-hoc
 * `canSendLinkAppResponse` reads beside the step).
 * Validate-request / app-request / app-request-dispatch / app-request-response /
 * app-request-transmit-outcome / token-access plan leaves conclude via machine
 * actions (no ad-hoc `planLinkValidateRequest` / `planLinkAppRequest` /
 * `planLinkAppRequestDispatch` / `planLinkAppRequestResponse` /
 * `planLinkAppRequestTransmitOutcome` / `planLinkTokenAccess` / `plan ===`
 * reads beside the parent step).
 * Link register-list / activate-membership / unregister-membership plans nested via
 * {@link stepLinkRegisterListPlanWithActions} /
 * {@link stepLinkActivateMembershipPlanWithActions} /
 * {@link stepLinkUnregisterMembershipPlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  initialDestinationRequestAllowState,
  shouldAllowDestinationRequest,
  stepDestinationRequestAllowWithActions
} from "../destination-allow.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { PacketTypeCode } from "../packet-header.js";
import { LinkStatus, type LinkStatusValue } from "../link-watchdog.js";
import { stepLinkAppRequestInner } from "./part-4.js";
import { linkUnregisterMembershipPlanFromActions, planLinkUnregisterMembership, stepLinkActivateMembershipInner, stepLinkRegisterListInner } from "./part-8.js";
import type { LinkAppRequestAction, LinkAppRequestEvent, LinkAppRequestPlan, LinkAppRequestState } from "./part-4.js";
import type { LinkRegisterList, LinkRegisterListAction, LinkRegisterListEvent } from "./part-7.js";
import type { LinkActivateMembershipAction, LinkActivateMembershipEvent, LinkActivateMembershipState, LinkRegisterListState, LinkUnregisterMembershipAction, LinkUnregisterMembershipEvent, LinkUnregisterMembershipPlanAction, LinkUnregisterMembershipPlanEvent } from "./part-8.js";
/**
 * Link unregister-membership plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkUnregisterMembership`
 * reads beside the step). Nested under {@link stepLinkUnregisterMembershipWithActions}.
 */
export type LinkUnregisterMembershipPlanState = Record<string, never>;

export interface LinkUnregisterMembershipPlanStepResult {
  readonly state: LinkUnregisterMembershipPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkUnregisterMembershipPlanAction[];
}

export function initialLinkUnregisterMembershipPlanState(): LinkUnregisterMembershipPlanState {
  return {};
}

export function stepLinkUnregisterMembershipPlanWithActions(
  state: LinkUnregisterMembershipPlanState,
  event: LinkUnregisterMembershipPlanEvent
): LinkUnregisterMembershipPlanStepResult {
  if (event.kind === "link/unregister-membership-plan-gate") {
    const plan = planLinkUnregisterMembership({
      pendingIndex: event.pendingIndex,
      activeIndex: event.activeIndex
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "plan",
          removePendingIndex: plan.removePendingIndex,
          removeActiveIndex: plan.removeActiveIndex
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether unregister may splice active after {@link planLinkUnregisterMembership}. */
export function shouldRemoveActiveLinkMembership(indexPresent: boolean): boolean {
  return indexPresent;
}

export function initialLinkRegisterListState(): LinkRegisterListState {
  return {};
}

export const stepLinkRegisterList: StepFn<LinkRegisterListState> = (state, event) => {
  const result = stepLinkRegisterListInner(state, event as LinkRegisterListEvent);
  return { state: result.state, intents: result.intents };
};

export function linkRegisterListFromActions(
  actions: ReadonlyArray<LinkRegisterListAction>
): LinkRegisterList | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldRegisterLinkPending(
  actions: ReadonlyArray<LinkRegisterListAction>
): boolean {
  return actions.some((action) => action.kind === "pending");
}

export function shouldRegisterLinkActive(
  actions: ReadonlyArray<LinkRegisterListAction>
): boolean {
  return actions.some((action) => action.kind === "active");
}

export function initialLinkActivateMembershipState(): LinkActivateMembershipState {
  return {};
}

export const stepLinkActivateMembership: StepFn<LinkActivateMembershipState> = (state, event) => {
  const result = stepLinkActivateMembershipInner(state, event as LinkActivateMembershipEvent);
  return { state: result.state, intents: result.intents };
};

export function shouldRemovePendingLinkMembershipActions(
  actions: ReadonlyArray<LinkActivateMembershipAction>
): boolean {
  return actions.some((action) => action.kind === "remove-pending");
}

export function pendingLinkMembershipRemoveIndex(
  actions: ReadonlyArray<LinkActivateMembershipAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove-pending");
  return action?.kind === "remove-pending" ? action.index : null;
}

export function shouldAppendActiveLinkMembershipActions(
  actions: ReadonlyArray<LinkActivateMembershipAction>
): boolean {
  return actions.some((action) => action.kind === "append-active");
}

/**
 * Link unregister-membership is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkUnregisterMembershipPlanWithActions}.
 */
export type LinkUnregisterMembershipState = Record<string, never>;

export interface LinkUnregisterMembershipStepResult {
  readonly state: LinkUnregisterMembershipState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkUnregisterMembershipAction[];
}

export function initialLinkUnregisterMembershipState(): LinkUnregisterMembershipState {
  return {};
}

export const stepLinkUnregisterMembership: StepFn<LinkUnregisterMembershipState> = (
  state,
  event
) => {
  const result = stepLinkUnregisterMembershipInner(
    state,
    event as LinkUnregisterMembershipEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkUnregisterMembershipWithActions(
  state: LinkUnregisterMembershipState,
  event: LinkUnregisterMembershipEvent
): LinkUnregisterMembershipStepResult {
  return stepLinkUnregisterMembershipInner(state, event);
}

export function pendingLinkUnregisterRemoveIndex(
  actions: ReadonlyArray<LinkUnregisterMembershipAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove-pending");
  return action?.kind === "remove-pending" ? action.index : null;
}

export function activeLinkUnregisterRemoveIndex(
  actions: ReadonlyArray<LinkUnregisterMembershipAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove-active");
  return action?.kind === "remove-active" ? action.index : null;
}

export function shouldRemovePendingLinkUnregisterActions(
  actions: ReadonlyArray<LinkUnregisterMembershipAction>
): boolean {
  return actions.some((action) => action.kind === "remove-pending");
}

export function shouldRemoveActiveLinkUnregisterActions(
  actions: ReadonlyArray<LinkUnregisterMembershipAction>
): boolean {
  return actions.some((action) => action.kind === "remove-active");
}

function stepLinkUnregisterMembershipInner(
  state: LinkUnregisterMembershipState,
  event: LinkUnregisterMembershipEvent
): LinkUnregisterMembershipStepResult {
  if (event.kind === "link/unregister-membership-gate") {
    const planActions = stepLinkUnregisterMembershipPlanWithActions(
      initialLinkUnregisterMembershipPlanState(),
      {
        kind: "link/unregister-membership-plan-gate",
        pendingIndex: event.pendingIndex,
        activeIndex: event.activeIndex
      }
    ).actions;
    const plan = linkUnregisterMembershipPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    const actions: LinkUnregisterMembershipAction[] = [];
    if (plan.removePendingIndex !== null) {
      actions.push({ kind: "remove-pending", index: plan.removePendingIndex });
    }
    if (plan.removeActiveIndex !== null) {
      actions.push({ kind: "remove-active", index: plan.removeActiveIndex });
    }
    return { state, intents: [], actions };
  }

  return { state, intents: [], actions: [] };
}

export function initialLinkAppRequestState(): LinkAppRequestState {
  return {};
}

export const stepLinkAppRequest: StepFn<LinkAppRequestState> = (state, event) => {
  const result = stepLinkAppRequestInner(state, event as LinkAppRequestEvent);
  return { state: result.state, intents: result.intents };
};

export function linkAppRequestFromActions(
  actions: ReadonlyArray<LinkAppRequestAction>
): LinkAppRequestPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldSendLinkAppRequest(
  actions: ReadonlyArray<LinkAppRequestAction>
): boolean {
  return actions.some((action) => action.kind === "send");
}

export function shouldRejectLinkAppRequest(
  actions: ReadonlyArray<LinkAppRequestAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/**
 * Link app-request transmit outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkAppRequestTransmitOutcomePlanWithActions}
 * (`keep-pending`|`unregister`).
 */
export type LinkAppRequestTransmitState = Record<string, never>;

export type LinkAppRequestTransmitEvent =
  | Event
  | {
      readonly kind: "link/app-request-transmit-gate";
      readonly receiptPresent: boolean;
    };

export type LinkAppRequestTransmitAction = {
  readonly kind: LinkAppRequestTransmitOutcome;
};

export interface LinkAppRequestTransmitStepResult {
  readonly state: LinkAppRequestTransmitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestTransmitAction[];
}

export function initialLinkAppRequestTransmitState(): LinkAppRequestTransmitState {
  return {};
}

export const stepLinkAppRequestTransmit: StepFn<LinkAppRequestTransmitState> = (state, event) => {
  const result = stepLinkAppRequestTransmitInner(state, event as LinkAppRequestTransmitEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkAppRequestTransmitWithActions(
  state: LinkAppRequestTransmitState,
  event: LinkAppRequestTransmitEvent
): LinkAppRequestTransmitStepResult {
  return stepLinkAppRequestTransmitInner(state, event);
}

export function linkAppRequestTransmitFromActions(
  actions: ReadonlyArray<LinkAppRequestTransmitAction>
): LinkAppRequestTransmitOutcome | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldKeepPendingLinkAppRequestTransmit(
  actions: ReadonlyArray<LinkAppRequestTransmitAction>
): boolean {
  return actions.some((action) => action.kind === "keep-pending");
}

export function shouldUnregisterLinkAppRequestTransmit(
  actions: ReadonlyArray<LinkAppRequestTransmitAction>
): boolean {
  return actions.some((action) => action.kind === "unregister");
}

function stepLinkAppRequestTransmitInner(
  state: LinkAppRequestTransmitState,
  event: LinkAppRequestTransmitEvent
): LinkAppRequestTransmitStepResult {
  if (event.kind === "link/app-request-transmit-gate") {
    const planActions = stepLinkAppRequestTransmitOutcomePlanWithActions(
      initialLinkAppRequestTransmitOutcomePlanState(),
      {
        kind: "link/app-request-transmit-outcome-plan-gate",
        receiptPresent: event.receiptPresent
      }
    ).actions;
    const plan = linkAppRequestTransmitOutcomePlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type LinkRttOutcome = "ignore" | "activate" | "teardown";

/**
 * Responder LRRTT handling: accept gate × decrypt presence.
 * Unpack / merge / establish-activate stay at the adapter after `"activate"`.
 */
export function planLinkRttOutcome(input: {
  readonly canAccept: boolean;
  readonly plaintextPresent: boolean;
}): LinkRttOutcome {
  if (!input.canAccept) {
    return "ignore";
  }
  if (!input.plaintextPresent) {
    return "teardown";
  }
  return "activate";
}

export type LinkRttOutcomePlanEvent =
  | Event
  | {
      readonly kind: "rtt/outcome-plan-gate";
      readonly canAccept: boolean;
      readonly plaintextPresent: boolean;
    };

export type LinkRttOutcomePlanAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "activate" }
  | { readonly kind: "teardown" };

export function shouldIgnoreLinkRttOutcomePlan(
  actions: ReadonlyArray<LinkRttOutcomePlanAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

export function shouldActivateLinkRttOutcomePlan(
  actions: ReadonlyArray<LinkRttOutcomePlanAction>
): boolean {
  return actions.some((action) => action.kind === "activate");
}

export function shouldTeardownLinkRttOutcomePlan(
  actions: ReadonlyArray<LinkRttOutcomePlanAction>
): boolean {
  return actions.some((action) => action.kind === "teardown");
}

/**
 * Whether LRRTT handling should teardown after {@link planLinkRttOutcome}
 * (explicit teardown or missing plaintext for narrowing).
 */
export function shouldTeardownLinkFromRtt(input: {
  readonly outcomeTeardown: boolean;
  readonly plaintextPresent: boolean;
}): boolean {
  return input.outcomeTeardown || !input.plaintextPresent;
}

/**
 * shouldTeardownLinkFromRtt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTeardownLinkFromRtt` reads beside
 * the step).
 */
export type TeardownLinkFromRttState = Record<string, never>;

export function initialTeardownLinkFromRttState(): TeardownLinkFromRttState {
  return {};
}

export type LinkAppRequestTransmitOutcome = "keep-pending" | "unregister";

/** After app-request sendPacket: attach receipt or unregister the pending request. */
export function planLinkAppRequestTransmitOutcome(
  receiptPresent: boolean
): LinkAppRequestTransmitOutcome {
  return receiptPresent ? "keep-pending" : "unregister";
}

/**
 * App-request transmit-outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planLinkAppRequestTransmitOutcome` / `plan ===` reads beside the step). Nested
 * under {@link stepLinkAppRequestTransmitWithActions}.
 */
export type LinkAppRequestTransmitOutcomePlanState = Record<string, never>;

export type LinkAppRequestTransmitOutcomePlanEvent =
  | Event
  | {
      readonly kind: "link/app-request-transmit-outcome-plan-gate";
      readonly receiptPresent: boolean;
    };

export type LinkAppRequestTransmitOutcomePlanAction = {
  readonly kind: LinkAppRequestTransmitOutcome;
};

export interface LinkAppRequestTransmitOutcomePlanStepResult {
  readonly state: LinkAppRequestTransmitOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestTransmitOutcomePlanAction[];
}

export function initialLinkAppRequestTransmitOutcomePlanState(): LinkAppRequestTransmitOutcomePlanState {
  return {};
}

export function stepLinkAppRequestTransmitOutcomePlanWithActions(
  state: LinkAppRequestTransmitOutcomePlanState,
  event: LinkAppRequestTransmitOutcomePlanEvent
): LinkAppRequestTransmitOutcomePlanStepResult {
  if (event.kind === "link/app-request-transmit-outcome-plan-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planLinkAppRequestTransmitOutcome(event.receiptPresent) }]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the transmit-outcome plan from actions; null when empty. */
export function linkAppRequestTransmitOutcomePlanFromActions(
  actions: ReadonlyArray<LinkAppRequestTransmitOutcomePlanAction>
): LinkAppRequestTransmitOutcome | null {
  const action = actions.find(
    (entry) => entry.kind === "keep-pending" || entry.kind === "unregister"
  );
  return action?.kind ?? null;
}
