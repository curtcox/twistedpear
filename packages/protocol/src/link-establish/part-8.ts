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
import type { Event, Intent } from "@twistedpear/effects";
import {
  linkRegisterListPlanFromActions,
  planLinkRegisterList,
} from "./part-7.js";
import type {
  LinkRegisterListAction,
  LinkRegisterListEvent,
  LinkRegisterListPlanAction,
  LinkRegisterListPlanEvent,
} from "./part-7.js";
import { firstAction, hasActionOfKind } from "../action-kind.js";
/**
 * Link register-list plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRegisterList` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkRegisterListWithActions}.
 */
export type LinkRegisterListPlanState = Record<string, never>;

export interface LinkRegisterListPlanStepResult {
  readonly state: LinkRegisterListPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRegisterListPlanAction[];
}

export function initialLinkRegisterListPlanState(): LinkRegisterListPlanState {
  return {};
}

export function stepLinkRegisterListPlanWithActions(
  state: LinkRegisterListPlanState,
  event: LinkRegisterListPlanEvent,
): LinkRegisterListPlanStepResult {
  if (event.kind === "link/register-list-plan-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planLinkRegisterList(event.initiator) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterLinkPendingPlan(
  actions: ReadonlyArray<LinkRegisterListPlanAction>,
): boolean {
  return hasActionOfKind(actions, "pending");
}

export function shouldRegisterLinkActivePlan(
  actions: ReadonlyArray<LinkRegisterListPlanAction>,
): boolean {
  return hasActionOfKind(actions, "active");
}

/** Whether a transport link list should receive a new member (not already present). */
export function shouldRegisterLinkMember(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
}

/**
 * Link-member register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRegisterLinkMember`
 * reads beside the step).
 */
export type RegisterLinkMemberState = Record<string, never>;

export type RegisterLinkMemberEvent =
  | Event
  | {
      readonly kind: "link/register-member-gate";
      readonly alreadyPresent: boolean;
    };

export type RegisterLinkMemberAction =
  { readonly kind: "register" } | { readonly kind: "skip" };

export interface RegisterLinkMemberStepResult {
  readonly state: RegisterLinkMemberState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterLinkMemberAction[];
}

export function initialRegisterLinkMemberState(): RegisterLinkMemberState {
  return {};
}

export function stepRegisterLinkMemberWithActions(
  state: RegisterLinkMemberState,
  event: RegisterLinkMemberEvent,
): RegisterLinkMemberStepResult {
  if (event.kind === "link/register-member-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterLinkMember(event.alreadyPresent)
            ? "register"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterLinkMemberNow(
  actions: ReadonlyArray<RegisterLinkMemberAction>,
): boolean {
  return hasActionOfKind(actions, "register");
}

export function shouldSkipRegisterLinkMember(
  actions: ReadonlyArray<RegisterLinkMemberAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export type LinkActivateMembershipPlan = {
  readonly removePendingIndex: number | null;
  readonly appendActive: boolean;
};

/**
 * Activate a pending/initiator link: drop from pending (if present), unique-push to active.
 * Splice / push stay at the adapter.
 */
export function planLinkActivateMembership(input: {
  readonly pendingIndex: number;
  readonly alreadyActive: boolean;
}): LinkActivateMembershipPlan {
  return {
    removePendingIndex: input.pendingIndex >= 0 ? input.pendingIndex : null,
    appendActive: !input.alreadyActive,
  };
}

/**
 * Link activate-membership plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkActivateMembership`
 * reads beside the step). Nested under {@link stepLinkActivateMembershipWithActions}.
 */
export type LinkActivateMembershipPlanState = Record<string, never>;

export type LinkActivateMembershipPlanEvent =
  | Event
  | {
      readonly kind: "link/activate-membership-plan-gate";
      readonly pendingIndex: number;
      readonly alreadyActive: boolean;
    };

export type LinkActivateMembershipPlanAction = {
  readonly kind: "plan";
  readonly removePendingIndex: number | null;
  readonly appendActive: boolean;
};

export interface LinkActivateMembershipPlanStepResult {
  readonly state: LinkActivateMembershipPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkActivateMembershipPlanAction[];
}

export function initialLinkActivateMembershipPlanState(): LinkActivateMembershipPlanState {
  return {};
}

export function stepLinkActivateMembershipPlanWithActions(
  state: LinkActivateMembershipPlanState,
  event: LinkActivateMembershipPlanEvent,
): LinkActivateMembershipPlanStepResult {
  if (event.kind === "link/activate-membership-plan-gate") {
    const plan = planLinkActivateMembership({
      pendingIndex: event.pendingIndex,
      alreadyActive: event.alreadyActive,
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "plan",
          removePendingIndex: plan.removePendingIndex,
          appendActive: plan.appendActive,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the activate-membership plan from actions; null when empty. */
export function linkActivateMembershipPlanFromActions(
  actions: ReadonlyArray<LinkActivateMembershipPlanAction>,
): LinkActivateMembershipPlan | null {
  const action = firstAction(actions);
  if (action === undefined) {
    return null;
  }
  return {
    removePendingIndex: action.removePendingIndex,
    appendActive: action.appendActive,
  };
}

/** Whether activate may splice pending after {@link planLinkActivateMembership}. */
export function shouldRemovePendingLinkMembership(
  indexPresent: boolean,
): boolean {
  return indexPresent;
}

/** Whether activate may unique-push to active after {@link planLinkActivateMembership}. */
export function shouldAppendActiveLinkMembership(
  appendActive: boolean,
): boolean {
  return appendActive;
}

export type LinkUnregisterMembershipPlan = {
  readonly removePendingIndex: number | null;
  readonly removeActiveIndex: number | null;
};

/**
 * Unregister from pending and/or active transport link lists.
 * Splice stays at the adapter.
 */
export function planLinkUnregisterMembership(input: {
  readonly pendingIndex: number;
  readonly activeIndex: number;
}): LinkUnregisterMembershipPlan {
  return {
    removePendingIndex: input.pendingIndex >= 0 ? input.pendingIndex : null,
    removeActiveIndex: input.activeIndex >= 0 ? input.activeIndex : null,
  };
}

export type LinkUnregisterMembershipPlanEvent =
  | Event
  | {
      readonly kind: "link/unregister-membership-plan-gate";
      readonly pendingIndex: number;
      readonly activeIndex: number;
    };

export type LinkUnregisterMembershipPlanAction = {
  readonly kind: "plan";
  readonly removePendingIndex: number | null;
  readonly removeActiveIndex: number | null;
};

/** Extract the unregister-membership plan from actions; null when empty. */
export function linkUnregisterMembershipPlanFromActions(
  actions: ReadonlyArray<LinkUnregisterMembershipPlanAction>,
): LinkUnregisterMembershipPlan | null {
  const action = firstAction(actions);
  if (action === undefined) {
    return null;
  }
  return {
    removePendingIndex: action.removePendingIndex,
    removeActiveIndex: action.removeActiveIndex,
  };
}

/**
 * Link register-list choice is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkRegisterListPlanWithActions} (`pending`|`active`).
 */
export type LinkRegisterListState = Record<string, never>;

export interface LinkRegisterListStepResult {
  readonly state: LinkRegisterListState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRegisterListAction[];
}

export function stepLinkRegisterListWithActions(
  state: LinkRegisterListState,
  event: LinkRegisterListEvent,
): LinkRegisterListStepResult {
  return stepLinkRegisterListInner(state, event);
}

export function stepLinkRegisterListInner(
  state: LinkRegisterListState,
  event: LinkRegisterListEvent,
): LinkRegisterListStepResult {
  if (event.kind === "link/register-list-gate") {
    const planActions = stepLinkRegisterListPlanWithActions(
      initialLinkRegisterListPlanState(),
      {
        kind: "link/register-list-plan-gate",
        initiator: event.initiator,
      },
    ).actions;
    const plan = linkRegisterListPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Link activate-membership is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkActivateMembershipPlanWithActions}.
 */
export type LinkActivateMembershipState = Record<string, never>;

export type LinkActivateMembershipEvent =
  | Event
  | {
      readonly kind: "link/activate-membership-gate";
      readonly pendingIndex: number;
      readonly alreadyActive: boolean;
    };

export type LinkActivateMembershipAction =
  | { readonly kind: "remove-pending"; readonly index: number }
  | { readonly kind: "append-active" };

export interface LinkActivateMembershipStepResult {
  readonly state: LinkActivateMembershipState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkActivateMembershipAction[];
}

export function stepLinkActivateMembershipWithActions(
  state: LinkActivateMembershipState,
  event: LinkActivateMembershipEvent,
): LinkActivateMembershipStepResult {
  return stepLinkActivateMembershipInner(state, event);
}

export function stepLinkActivateMembershipInner(
  state: LinkActivateMembershipState,
  event: LinkActivateMembershipEvent,
): LinkActivateMembershipStepResult {
  if (event.kind === "link/activate-membership-gate") {
    const planActions = stepLinkActivateMembershipPlanWithActions(
      initialLinkActivateMembershipPlanState(),
      {
        kind: "link/activate-membership-plan-gate",
        pendingIndex: event.pendingIndex,
        alreadyActive: event.alreadyActive,
      },
    ).actions;
    const plan = linkActivateMembershipPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    const actions: LinkActivateMembershipAction[] = [];
    if (plan.removePendingIndex !== null) {
      actions.push({ kind: "remove-pending", index: plan.removePendingIndex });
    }
    if (plan.appendActive) {
      actions.push({ kind: "append-active" });
    }
    return { state, intents: [], actions };
  }

  return { state, intents: [], actions: [] };
}

export type LinkUnregisterMembershipEvent =
  | Event
  | {
      readonly kind: "link/unregister-membership-gate";
      readonly pendingIndex: number;
      readonly activeIndex: number;
    };

export type LinkUnregisterMembershipAction =
  | { readonly kind: "remove-pending"; readonly index: number }
  | { readonly kind: "remove-active"; readonly index: number };
