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
  stepDestinationRequestAllowWithActions,
} from "../destination-allow.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { PacketTypeCode } from "../packet-header.js";
import { LinkStatus, type LinkStatusValue } from "../link-watchdog.js";
import {
  initialAcceptLinkRequestOwnerState,
  planLinkValidateRequest,
  shouldAcceptLinkRequestOwnerNow,
  shouldBadRequestLinkValidateRequestPlan,
  shouldModeDisabledLinkValidateRequestPlan,
  shouldOkLinkValidateRequestPlan,
  shouldOwnerMissingIdentityLinkValidateRequestPlan,
  stepAcceptLinkRequestOwnerWithActions,
} from "./part-1.js";
import type {
  LinkValidateRequestAction,
  LinkValidateRequestEvent,
  LinkValidateRequestPlan,
  LinkValidateRequestPlanAction,
  LinkValidateRequestPlanEvent,
} from "./part-1.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Validate-request plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkValidateRequest` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkValidateRequestWithActions}.
 */
export type LinkValidateRequestPlanState = Record<string, never>;

export interface LinkValidateRequestPlanStepResult {
  readonly state: LinkValidateRequestPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkValidateRequestPlanAction[];
}

export function initialLinkValidateRequestPlanState(): LinkValidateRequestPlanState {
  return {};
}

export function stepLinkValidateRequestPlanWithActions(
  state: LinkValidateRequestPlanState,
  event: LinkValidateRequestPlanEvent,
): LinkValidateRequestPlanStepResult {
  if (event.kind === "validate-request/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkValidateRequest({
            requestPresent: event.requestPresent,
            ownerIdentityAccepted: event.ownerIdentityAccepted,
            modeEnabled: event.modeEnabled,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the plan from actions; null when empty. */
export function linkValidateRequestPlanFromActions(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>,
): LinkValidateRequestPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "bad-request" ||
      entry.kind === "owner-missing-identity" ||
      entry.kind === "mode-disabled",
  );
  return action?.kind ?? null;
}

/**
 * Validate-request gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkValidateRequestPlanWithActions}
 * (`ok`|`bad-request`|`owner-missing-identity`|`mode-disabled`).
 */
export type LinkValidateRequestState = Record<string, never>;

export interface LinkValidateRequestStepResult {
  readonly state: LinkValidateRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkValidateRequestAction[];
}

export function initialLinkValidateRequestState(): LinkValidateRequestState {
  return {};
}

export const stepLinkValidateRequest: StepFn<LinkValidateRequestState> = (
  state,
  event,
) => {
  const result = stepLinkValidateRequestInner(
    state,
    event as LinkValidateRequestEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkValidateRequestWithActions(
  state: LinkValidateRequestState,
  event: LinkValidateRequestEvent,
): LinkValidateRequestStepResult {
  return stepLinkValidateRequestInner(state, event);
}

export function shouldProceedLinkValidateRequest(
  actions: ReadonlyArray<LinkValidateRequestAction>,
): boolean {
  return hasActionOfKind(actions, "proceed");
}

export function shouldRejectLinkValidateBadRequest(
  actions: ReadonlyArray<LinkValidateRequestAction>,
): boolean {
  return hasActionOfKind(actions, "reject-bad-request");
}

export function shouldRejectLinkValidateOwnerMissingIdentity(
  actions: ReadonlyArray<LinkValidateRequestAction>,
): boolean {
  return actions.some(
    (action) => action.kind === "reject-owner-missing-identity",
  );
}

export function shouldRejectLinkValidateModeDisabled(
  actions: ReadonlyArray<LinkValidateRequestAction>,
): boolean {
  return hasActionOfKind(actions, "reject-mode-disabled");
}

/**
 * Whether validateRequest may continue after validate actions say proceed
 * and the parsed request remains present for narrowing.
 */
export function shouldContinueLinkValidateRequest(input: {
  readonly planProceed: boolean;
  readonly requestPresent: boolean;
}): boolean {
  return input.planProceed && input.requestPresent;
}

/**
 * Continue-validate-request apply gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldContinueLinkValidateRequest` reads beside the step).
 */
export type ContinueLinkValidateRequestState = Record<string, never>;

export type ContinueLinkValidateRequestEvent =
  | Event
  | {
      readonly kind: "validate-request/continue-gate";
      readonly planProceed: boolean;
      readonly requestPresent: boolean;
    };

export type ContinueLinkValidateRequestAction =
  { readonly kind: "continue" } | { readonly kind: "skip" };

export interface ContinueLinkValidateRequestStepResult {
  readonly state: ContinueLinkValidateRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ContinueLinkValidateRequestAction[];
}

export function initialContinueLinkValidateRequestState(): ContinueLinkValidateRequestState {
  return {};
}

export function stepContinueLinkValidateRequestWithActions(
  state: ContinueLinkValidateRequestState,
  event: ContinueLinkValidateRequestEvent,
): ContinueLinkValidateRequestStepResult {
  if (event.kind === "validate-request/continue-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldContinueLinkValidateRequest({
            planProceed: event.planProceed,
            requestPresent: event.requestPresent,
          })
            ? "continue"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldContinueLinkValidateRequestNow(
  actions: ReadonlyArray<ContinueLinkValidateRequestAction>,
): boolean {
  return hasActionOfKind(actions, "continue");
}

export function shouldSkipContinueLinkValidateRequest(
  actions: ReadonlyArray<ContinueLinkValidateRequestAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

function stepLinkValidateRequestInner(
  state: LinkValidateRequestState,
  event: LinkValidateRequestEvent,
): LinkValidateRequestStepResult {
  if (event.kind === "validate-request/gate") {
    const ownerIdentityAccepted = shouldAcceptLinkRequestOwnerNow(
      stepAcceptLinkRequestOwnerWithActions(
        initialAcceptLinkRequestOwnerState(),
        {
          kind: "link/accept-request-owner-gate",
          identityPresent: event.ownerIdentityPresent,
        },
      ).actions,
    );
    const planActions = stepLinkValidateRequestPlanWithActions(
      initialLinkValidateRequestPlanState(),
      {
        kind: "validate-request/plan-gate",
        requestPresent: event.requestPresent,
        ownerIdentityAccepted,
        modeEnabled: event.modeEnabled,
      },
    ).actions;
    if (shouldBadRequestLinkValidateRequestPlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-bad-request" }] };
    }
    if (shouldOwnerMissingIdentityLinkValidateRequestPlan(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-owner-missing-identity" }],
      };
    }
    if (shouldModeDisabledLinkValidateRequestPlan(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-mode-disabled" }],
      };
    }
    if (!shouldOkLinkValidateRequestPlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

export function canValidateLinkProof(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly destinationPresent?: boolean;
}): boolean {
  if (input.destinationPresent === false) {
    return false;
  }
  return input.status === LinkStatus.PENDING && input.initiator;
}

/**
 * canValidateLinkProof gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canValidateLinkProof` reads beside
 * the step).
 */
export type ValidateLinkProofAllowState = Record<string, never>;

export type ValidateLinkProofAllowEvent =
  | Event
  | {
      readonly kind: "link/validate-proof-allow-gate";
      readonly status: LinkStatusValue;
      readonly initiator: boolean;
      readonly destinationPresent?: boolean;
    };

export type ValidateLinkProofAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface ValidateLinkProofAllowStepResult {
  readonly state: ValidateLinkProofAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ValidateLinkProofAllowAction[];
}

export function initialValidateLinkProofAllowState(): ValidateLinkProofAllowState {
  return {};
}

export function stepValidateLinkProofAllowWithActions(
  state: ValidateLinkProofAllowState,
  event: ValidateLinkProofAllowEvent,
): ValidateLinkProofAllowStepResult {
  if (event.kind === "link/validate-proof-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canValidateLinkProof({
            status: event.status,
            initiator: event.initiator,
            ...(event.destinationPresent !== undefined
              ? { destinationPresent: event.destinationPresent }
              : {}),
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowValidateLinkProof(
  actions: ReadonlyArray<ValidateLinkProofAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyValidateLinkProof(
  actions: ReadonlyArray<ValidateLinkProofAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

export type LinkProofValidateOutcome = "accept" | "reject";

/**
 * Whether inbound link-request proof crypto gates allow ACTIVATED.
 * ECDH / signature verify / MTU strip stay at the adapter edge.
 */
export function planLinkProofValidateOutcome(input: {
  readonly canValidate: boolean;
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
  readonly signatureValid: boolean;
}): LinkProofValidateOutcome {
  if (
    !input.canValidate ||
    !input.modeMatches ||
    !input.layoutValid ||
    !input.bodyPresent ||
    !input.peerPublicPresent ||
    !input.signatureValid
  ) {
    return "reject";
  }
  return "accept";
}

export type LinkProofValidateOutcomePlanEvent =
  | Intent
  | {
      readonly kind: "proof/validate-outcome-plan-gate";
      readonly canValidate: boolean;
      readonly modeMatches: boolean;
      readonly layoutValid: boolean;
      readonly bodyPresent: boolean;
      readonly peerPublicPresent: boolean;
      readonly signatureValid: boolean;
    };

export type LinkProofValidateOutcomePlanAction =
  { readonly kind: "accept" } | { readonly kind: "reject" };

export function shouldAcceptLinkProofValidateOutcomePlan(
  actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldRejectLinkProofValidateOutcomePlan(
  actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

export type LinkProofValidateEvent =
  | Event
  | {
      readonly kind: "proof/validate-gate";
      readonly canValidate: boolean;
      readonly modeMatches: boolean;
      readonly layoutValid: boolean;
      readonly bodyPresent: boolean;
      readonly peerPublicPresent: boolean;
      readonly signatureValid: boolean;
    };

export type LinkProofValidateAction =
  { readonly kind: "accept" } | { readonly kind: "reject" };
