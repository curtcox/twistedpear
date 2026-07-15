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
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  initialDestinationRequestAllowState,
  shouldAllowDestinationRequest,
  stepDestinationRequestAllowWithActions
} from "./destination-allow.js";
import { linkPayloadFitsMdu } from "./link-metrics.js";
import { PacketTypeCode } from "./packet-header.js";
import { LinkStatus, type LinkStatusValue } from "./link-watchdog.js";

export interface LinkEstablishState {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly rtt: number | null;
  readonly activatedAt: number | null;
}

export type LinkEstablishEvent =
  | Event
  | { readonly kind: "establish/handshake" }
  | {
      readonly kind: "establish/activated";
      readonly atSeconds: number;
      readonly rtt: number;
    }
  | { readonly kind: "establish/failed" }
  | { readonly kind: "establish/rtt"; readonly plaintextPresent: boolean }
  | { readonly kind: "establish/rtt-failed" };

/**
 * Adapter applies handshake / activate / fail / RTT gate only from these actions.
 * Initiator activation also drives membership + LRRTT send flags.
 * Responder LRRTT: ignore / accept-rtt (unpack then activated) / teardown.
 */
export type LinkEstablishAction =
  | { readonly kind: "enter-handshake" }
  | {
      readonly kind: "activated";
      readonly rtt: number;
      readonly activatedAt: number;
      readonly sendRtt: boolean;
      readonly activateMembership: boolean;
    }
  | { readonly kind: "failed" }
  | { readonly kind: "ignore" }
  | { readonly kind: "accept-rtt" }
  | { readonly kind: "teardown" };

export interface LinkEstablishStepResult {
  readonly state: LinkEstablishState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkEstablishAction[];
}

export function initialLinkEstablishState(options: {
  readonly initiator: boolean;
  readonly status?: LinkStatusValue;
}): LinkEstablishState {
  return {
    status: options.status ?? LinkStatus.PENDING,
    initiator: options.initiator,
    rtt: null,
    activatedAt: null
  };
}

export function canLinkHandshake(status: LinkStatusValue): boolean {
  return status === LinkStatus.PENDING;
}

/** Whether handshake may run (PENDING + local private key + peer public key). */
export function canPerformLinkHandshake(input: {
  readonly status: LinkStatusValue;
  readonly privateKeyPresent: boolean;
  readonly peerPublicKeyPresent: boolean;
}): boolean {
  return (
    canLinkHandshake(input.status) &&
    input.privateKeyPresent &&
    input.peerPublicKeyPresent
  );
}


/**
 * canPerformLinkHandshake gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canPerformLinkHandshake` reads beside
 * the step).
 */
export type PerformLinkHandshakeAllowState = Record<string, never>;

export type PerformLinkHandshakeAllowEvent =
  | Event
  | {
      readonly kind: "link/perform-handshake-allow-gate";
      readonly status: LinkStatusValue;
      readonly privateKeyPresent: boolean;
      readonly peerPublicKeyPresent: boolean;
    };

export type PerformLinkHandshakeAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface PerformLinkHandshakeAllowStepResult {
  readonly state: PerformLinkHandshakeAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PerformLinkHandshakeAllowAction[];
}

export function initialPerformLinkHandshakeAllowState(): PerformLinkHandshakeAllowState {
  return {};
}

export function stepPerformLinkHandshakeAllowWithActions(
  state: PerformLinkHandshakeAllowState,
  event: PerformLinkHandshakeAllowEvent
): PerformLinkHandshakeAllowStepResult {
  if (event.kind === "link/perform-handshake-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canPerformLinkHandshake({ status: event.status, privateKeyPresent: event.privateKeyPresent, peerPublicKeyPresent: event.peerPublicKeyPresent }) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowPerformLinkHandshake(
  actions: ReadonlyArray<PerformLinkHandshakeAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyPerformLinkHandshake(
  actions: ReadonlyArray<PerformLinkHandshakeAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether a responder may issue a link request proof. */
export function canProveLink(input: {
  readonly ownerPresent: boolean;
  readonly publicKeyPresent: boolean;
  readonly ownerIdentityPresent: boolean;
}): boolean {
  return input.ownerPresent && input.publicKeyPresent && input.ownerIdentityPresent;
}


/**
 * canProveLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canProveLink` reads beside
 * the step).
 */
export type ProveLinkAllowState = Record<string, never>;

export type ProveLinkAllowEvent =
  | Event
  | {
      readonly kind: "link/prove-allow-gate";
      readonly ownerPresent: boolean;
      readonly publicKeyPresent: boolean;
      readonly ownerIdentityPresent: boolean;
    };

export type ProveLinkAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface ProveLinkAllowStepResult {
  readonly state: ProveLinkAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ProveLinkAllowAction[];
}

export function initialProveLinkAllowState(): ProveLinkAllowState {
  return {};
}

export function stepProveLinkAllowWithActions(
  state: ProveLinkAllowState,
  event: ProveLinkAllowEvent
): ProveLinkAllowStepResult {
  if (event.kind === "link/prove-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canProveLink({ ownerPresent: event.ownerPresent, publicKeyPresent: event.publicKeyPresent, ownerIdentityPresent: event.ownerIdentityPresent }) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowProveLink(
  actions: ReadonlyArray<ProveLinkAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyProveLink(
  actions: ReadonlyArray<ProveLinkAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether owner public-key bytes split into Ed25519/X25519 halves for prove. */
export function canAcceptLinkOwnerPublicKey(splitOk: boolean): boolean {
  return splitOk;
}


/**
 * canAcceptLinkOwnerPublicKey gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkOwnerPublicKey` reads beside
 * the step).
 */
export type AcceptLinkOwnerPublicKeyState = Record<string, never>;

export type AcceptLinkOwnerPublicKeyEvent =
  | Event
  | {
      readonly kind: "link/accept-owner-public-key-gate";
      readonly splitOk: boolean;
    };

export type AcceptLinkOwnerPublicKeyAction =
  | { readonly kind: "accept" }
  | { readonly kind: "reject" };

export interface AcceptLinkOwnerPublicKeyStepResult {
  readonly state: AcceptLinkOwnerPublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkOwnerPublicKeyAction[];
}

export function initialAcceptLinkOwnerPublicKeyState(): AcceptLinkOwnerPublicKeyState {
  return {};
}

export function stepAcceptLinkOwnerPublicKeyWithActions(
  state: AcceptLinkOwnerPublicKeyState,
  event: AcceptLinkOwnerPublicKeyEvent
): AcceptLinkOwnerPublicKeyStepResult {
  if (event.kind === "link/accept-owner-public-key-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLinkOwnerPublicKey(event.splitOk) ? "accept" : "reject"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkOwnerPublicKeyNow(
  actions: ReadonlyArray<AcceptLinkOwnerPublicKeyAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLinkOwnerPublicKey(
  actions: ReadonlyArray<AcceptLinkOwnerPublicKeyAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Whether an inbound link request destination has identity material. */
export function canAcceptLinkRequestOwner(identityPresent: boolean): boolean {
  return identityPresent;
}

/**
 * canAcceptLinkRequestOwner gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkRequestOwner`
 * reads beside the step).
 */
export type AcceptLinkRequestOwnerState = Record<string, never>;

export type AcceptLinkRequestOwnerEvent =
  | Event
  | {
      readonly kind: "link/accept-request-owner-gate";
      readonly identityPresent: boolean;
    };

export type AcceptLinkRequestOwnerAction =
  | { readonly kind: "accept" }
  | { readonly kind: "reject" };

export interface AcceptLinkRequestOwnerStepResult {
  readonly state: AcceptLinkRequestOwnerState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkRequestOwnerAction[];
}

export function initialAcceptLinkRequestOwnerState(): AcceptLinkRequestOwnerState {
  return {};
}

export function stepAcceptLinkRequestOwnerWithActions(
  state: AcceptLinkRequestOwnerState,
  event: AcceptLinkRequestOwnerEvent
): AcceptLinkRequestOwnerStepResult {
  if (event.kind === "link/accept-request-owner-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLinkRequestOwner(event.identityPresent)
            ? "accept"
            : "reject"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkRequestOwnerNow(
  actions: ReadonlyArray<AcceptLinkRequestOwnerAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLinkRequestOwner(
  actions: ReadonlyArray<AcceptLinkRequestOwnerAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

export type LinkValidateRequestPlan =
  | "ok"
  | "bad-request"
  | "owner-missing-identity"
  | "mode-disabled";

/**
 * Whether validateRequest may proceed (parsed request + owner + enabled mode).
 * Pass `ownerIdentityAccepted` from {@link stepAcceptLinkRequestOwnerWithActions}
 * (`shouldAcceptLinkRequestOwnerNow`); do not re-read `canAcceptLinkRequestOwner`
 * beside the step.
 */
export function planLinkValidateRequest(input: {
  readonly requestPresent: boolean;
  readonly ownerIdentityAccepted: boolean;
  readonly modeEnabled: boolean;
}): LinkValidateRequestPlan {
  if (!input.requestPresent) {
    return "bad-request";
  }
  if (!input.ownerIdentityAccepted) {
    return "owner-missing-identity";
  }
  if (!input.modeEnabled) {
    return "mode-disabled";
  }
  return "ok";
}

/**
 * Validate-request plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkValidateRequest` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkValidateRequestWithActions}.
 */
export type LinkValidateRequestPlanState = Record<string, never>;

export type LinkValidateRequestPlanEvent =
  | Event
  | {
      readonly kind: "validate-request/plan-gate";
      readonly requestPresent: boolean;
      readonly ownerIdentityAccepted: boolean;
      readonly modeEnabled: boolean;
    };

export type LinkValidateRequestPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "bad-request" }
  | { readonly kind: "owner-missing-identity" }
  | { readonly kind: "mode-disabled" };

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
  event: LinkValidateRequestPlanEvent
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
            modeEnabled: event.modeEnabled
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldOkLinkValidateRequestPlan(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldBadRequestLinkValidateRequestPlan(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>
): boolean {
  return actions.some((action) => action.kind === "bad-request");
}

export function shouldOwnerMissingIdentityLinkValidateRequestPlan(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>
): boolean {
  return actions.some((action) => action.kind === "owner-missing-identity");
}

export function shouldModeDisabledLinkValidateRequestPlan(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>
): boolean {
  return actions.some((action) => action.kind === "mode-disabled");
}

/** Extract the plan from actions; null when empty. */
export function linkValidateRequestPlanFromActions(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>
): LinkValidateRequestPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "bad-request" ||
      entry.kind === "owner-missing-identity" ||
      entry.kind === "mode-disabled"
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

export type LinkValidateRequestEvent =
  | Event
  | {
      readonly kind: "validate-request/gate";
      readonly requestPresent: boolean;
      readonly ownerIdentityPresent: boolean;
      readonly modeEnabled: boolean;
    };

export type LinkValidateRequestAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-bad-request" }
  | { readonly kind: "reject-owner-missing-identity" }
  | { readonly kind: "reject-mode-disabled" };

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
  event
) => {
  const result = stepLinkValidateRequestInner(
    state,
    event as LinkValidateRequestEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkValidateRequestWithActions(
  state: LinkValidateRequestState,
  event: LinkValidateRequestEvent
): LinkValidateRequestStepResult {
  return stepLinkValidateRequestInner(state, event);
}

export function shouldProceedLinkValidateRequest(
  actions: ReadonlyArray<LinkValidateRequestAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLinkValidateBadRequest(
  actions: ReadonlyArray<LinkValidateRequestAction>
): boolean {
  return actions.some((action) => action.kind === "reject-bad-request");
}

export function shouldRejectLinkValidateOwnerMissingIdentity(
  actions: ReadonlyArray<LinkValidateRequestAction>
): boolean {
  return actions.some((action) => action.kind === "reject-owner-missing-identity");
}

export function shouldRejectLinkValidateModeDisabled(
  actions: ReadonlyArray<LinkValidateRequestAction>
): boolean {
  return actions.some((action) => action.kind === "reject-mode-disabled");
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
  | { readonly kind: "continue" }
  | { readonly kind: "skip" };

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
  event: ContinueLinkValidateRequestEvent
): ContinueLinkValidateRequestStepResult {
  if (event.kind === "validate-request/continue-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldContinueLinkValidateRequest({
            planProceed: event.planProceed,
            requestPresent: event.requestPresent
          })
            ? "continue"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldContinueLinkValidateRequestNow(
  actions: ReadonlyArray<ContinueLinkValidateRequestAction>
): boolean {
  return actions.some((action) => action.kind === "continue");
}

export function shouldSkipContinueLinkValidateRequest(
  actions: ReadonlyArray<ContinueLinkValidateRequestAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

function stepLinkValidateRequestInner(
  state: LinkValidateRequestState,
  event: LinkValidateRequestEvent
): LinkValidateRequestStepResult {
  if (event.kind === "validate-request/gate") {
    const ownerIdentityAccepted = shouldAcceptLinkRequestOwnerNow(
      stepAcceptLinkRequestOwnerWithActions(initialAcceptLinkRequestOwnerState(), {
        kind: "link/accept-request-owner-gate",
        identityPresent: event.ownerIdentityPresent
      }).actions
    );
    const planActions = stepLinkValidateRequestPlanWithActions(
      initialLinkValidateRequestPlanState(),
      {
        kind: "validate-request/plan-gate",
        requestPresent: event.requestPresent,
        ownerIdentityAccepted,
        modeEnabled: event.modeEnabled
      }
    ).actions;
    if (shouldBadRequestLinkValidateRequestPlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-bad-request" }] };
    }
    if (shouldOwnerMissingIdentityLinkValidateRequestPlan(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-owner-missing-identity" }]
      };
    }
    if (shouldModeDisabledLinkValidateRequestPlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-mode-disabled" }] };
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: ValidateLinkProofAllowEvent
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
              : {})
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowValidateLinkProof(
  actions: ReadonlyArray<ValidateLinkProofAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyValidateLinkProof(
  actions: ReadonlyArray<ValidateLinkProofAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
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

/**
 * Proof-validate outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkProofValidateOutcome` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkProofValidateWithActions}.
 */
export type LinkProofValidateOutcomePlanState = Record<string, never>;

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
  | { readonly kind: "accept" }
  | { readonly kind: "reject" };

export interface LinkProofValidateOutcomePlanStepResult {
  readonly state: LinkProofValidateOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkProofValidateOutcomePlanAction[];
}

export function initialLinkProofValidateOutcomePlanState(): LinkProofValidateOutcomePlanState {
  return {};
}

export function stepLinkProofValidateOutcomePlanWithActions(
  state: LinkProofValidateOutcomePlanState,
  event: LinkProofValidateOutcomePlanEvent
): LinkProofValidateOutcomePlanStepResult {
  if (event.kind === "proof/validate-outcome-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkProofValidateOutcome({
            canValidate: event.canValidate,
            modeMatches: event.modeMatches,
            layoutValid: event.layoutValid,
            bodyPresent: event.bodyPresent,
            peerPublicPresent: event.peerPublicPresent,
            signatureValid: event.signatureValid
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkProofValidateOutcomePlan(
  actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLinkProofValidateOutcomePlan(
  actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract the proof-validate outcome plan from actions; null when empty. */
export function linkProofValidateOutcomePlanFromActions(
  actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>
): LinkProofValidateOutcome | null {
  const action = actions.find(
    (entry) => entry.kind === "accept" || entry.kind === "reject"
  );
  return action?.kind ?? null;
}

/**
 * Link proof validate gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkProofValidateOutcomePlanWithActions}
 * (`accept`|`reject`).
 */
export type LinkProofValidateState = Record<string, never>;

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
  | { readonly kind: "accept" }
  | { readonly kind: "reject" };

export interface LinkProofValidateStepResult {
  readonly state: LinkProofValidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkProofValidateAction[];
}

export function initialLinkProofValidateState(): LinkProofValidateState {
  return {};
}

export const stepLinkProofValidate: StepFn<LinkProofValidateState> = (state, event) => {
  const result = stepLinkProofValidateInner(state, event as LinkProofValidateEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkProofValidateWithActions(
  state: LinkProofValidateState,
  event: LinkProofValidateEvent
): LinkProofValidateStepResult {
  return stepLinkProofValidateInner(state, event);
}

export function shouldAcceptLinkProofValidate(
  actions: ReadonlyArray<LinkProofValidateAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLinkProofValidate(
  actions: ReadonlyArray<LinkProofValidateAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

function stepLinkProofValidateInner(
  state: LinkProofValidateState,
  event: LinkProofValidateEvent
): LinkProofValidateStepResult {
  if (event.kind === "proof/validate-gate") {
    const planActions = stepLinkProofValidateOutcomePlanWithActions(
      initialLinkProofValidateOutcomePlanState(),
      {
        kind: "proof/validate-outcome-plan-gate",
        canValidate: event.canValidate,
        modeMatches: event.modeMatches,
        layoutValid: event.layoutValid,
        bodyPresent: event.bodyPresent,
        peerPublicPresent: event.peerPublicPresent,
        signatureValid: event.signatureValid
      }
    ).actions;
    if (shouldRejectLinkProofValidateOutcomePlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    if (!shouldAcceptLinkProofValidateOutcomePlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "accept" }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether loadPeer/handshake/signature verify may run for a link proof. */
export function shouldAttemptLinkProofCrypto(input: {
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
}): boolean {
  return (
    input.modeMatches &&
    input.layoutValid &&
    input.bodyPresent &&
    input.peerPublicPresent
  );
}


/**
 * shouldAttemptLinkProofCrypto gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAttemptLinkProofCrypto` reads beside
 * the step).
 */
export type AttemptLinkProofCryptoState = Record<string, never>;

export type AttemptLinkProofCryptoEvent =
  | Event
  | {
      readonly kind: "link/attempt-proof-crypto-gate";
      readonly modeMatches: boolean;
      readonly layoutValid: boolean;
      readonly bodyPresent: boolean;
      readonly peerPublicPresent: boolean;
    };

export type AttemptLinkProofCryptoAction =
  | { readonly kind: "attempt" }
  | { readonly kind: "skip" };

export interface AttemptLinkProofCryptoStepResult {
  readonly state: AttemptLinkProofCryptoState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttemptLinkProofCryptoAction[];
}

export function initialAttemptLinkProofCryptoState(): AttemptLinkProofCryptoState {
  return {};
}

export function stepAttemptLinkProofCryptoWithActions(
  state: AttemptLinkProofCryptoState,
  event: AttemptLinkProofCryptoEvent
): AttemptLinkProofCryptoStepResult {
  if (event.kind === "link/attempt-proof-crypto-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAttemptLinkProofCrypto({ modeMatches: event.modeMatches, layoutValid: event.layoutValid, bodyPresent: event.bodyPresent, peerPublicPresent: event.peerPublicPresent }) ? "attempt" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAttemptLinkProofCryptoNow(
  actions: ReadonlyArray<AttemptLinkProofCryptoAction>
): boolean {
  return actions.some((action) => action.kind === "attempt");
}

export function shouldSkipLinkProofCrypto(
  actions: ReadonlyArray<AttemptLinkProofCryptoAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export function canAcceptLinkRtt(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
  return !input.initiator && !isLinkClosed(input.status);
}


/**
 * canAcceptLinkRtt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkRtt` reads beside
 * the step).
 */
export type AcceptLinkRttState = Record<string, never>;

export type AcceptLinkRttEvent =
  | Event
  | {
      readonly kind: "link/accept-rtt-gate";
      readonly status: LinkStatusValue;
      readonly initiator: boolean;
    };

export type AcceptLinkRttAction =
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptLinkRttStepResult {
  readonly state: AcceptLinkRttState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkRttAction[];
}

export function initialAcceptLinkRttState(): AcceptLinkRttState {
  return {};
}

export function stepAcceptLinkRttWithActions(
  state: AcceptLinkRttState,
  event: AcceptLinkRttEvent
): AcceptLinkRttStepResult {
  if (event.kind === "link/accept-rtt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLinkRtt({ status: event.status, initiator: event.initiator }) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkRttNow(
  actions: ReadonlyArray<AcceptLinkRttAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipLinkRttAccept(
  actions: ReadonlyArray<AcceptLinkRttAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export function canIdentifyOnLink(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
  return input.initiator && input.status === LinkStatus.ACTIVE;
}


/**
 * canIdentifyOnLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canIdentifyOnLink` reads beside
 * the step).
 */
export type IdentifyOnLinkAllowState = Record<string, never>;

export type IdentifyOnLinkAllowEvent =
  | Event
  | {
      readonly kind: "link/identify-allow-gate";
      readonly status: LinkStatusValue;
      readonly initiator: boolean;
    };

export type IdentifyOnLinkAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface IdentifyOnLinkAllowStepResult {
  readonly state: IdentifyOnLinkAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentifyOnLinkAllowAction[];
}

export function initialIdentifyOnLinkAllowState(): IdentifyOnLinkAllowState {
  return {};
}

export function stepIdentifyOnLinkAllowWithActions(
  state: IdentifyOnLinkAllowState,
  event: IdentifyOnLinkAllowEvent
): IdentifyOnLinkAllowStepResult {
  if (event.kind === "link/identify-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canIdentifyOnLink({ status: event.status, initiator: event.initiator }) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowIdentifyOnLink(
  actions: ReadonlyArray<IdentifyOnLinkAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyIdentifyOnLink(
  actions: ReadonlyArray<IdentifyOnLinkAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether the link may issue an application request (ACTIVE with measured RTT). */
export function canLinkRequest(input: {
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
}): boolean {
  return input.status === LinkStatus.ACTIVE && input.rtt !== null;
}


/**
 * canLinkRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLinkRequest` reads beside
 * the step).
 */
export type LinkRequestAllowState = Record<string, never>;

export type LinkRequestAllowEvent =
  | Event
  | {
      readonly kind: "link/request-allow-gate";

      readonly status: LinkStatusValue;
      readonly rtt: number | null;
    };

export type LinkRequestAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface LinkRequestAllowStepResult {
  readonly state: LinkRequestAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestAllowAction[];
}

export function initialLinkRequestAllowState(): LinkRequestAllowState {
  return {};
}

export function stepLinkRequestAllowWithActions(
  state: LinkRequestAllowState,
  event: LinkRequestAllowEvent
): LinkRequestAllowStepResult {
  if (event.kind === "link/request-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canLinkRequest({ status: event.status, rtt: event.rtt }) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowLinkRequest(
  actions: ReadonlyArray<LinkRequestAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyLinkRequest(
  actions: ReadonlyArray<LinkRequestAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}
/** Whether keepalive timing may be updated from a measured RTT. */
export function canUpdateLinkKeepalive(rttPresent: boolean): boolean {
  return rttPresent;
}


/**
 * canUpdateLinkKeepalive gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canUpdateLinkKeepalive` reads beside
 * the step).
 */
export type UpdateLinkKeepaliveAllowState = Record<string, never>;

export type UpdateLinkKeepaliveAllowEvent =
  | Event
  | {
      readonly kind: "link/update-keepalive-allow-gate";

      readonly rttPresent: boolean;
    };

export type UpdateLinkKeepaliveAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface UpdateLinkKeepaliveAllowStepResult {
  readonly state: UpdateLinkKeepaliveAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UpdateLinkKeepaliveAllowAction[];
}

export function initialUpdateLinkKeepaliveAllowState(): UpdateLinkKeepaliveAllowState {
  return {};
}

export function stepUpdateLinkKeepaliveAllowWithActions(
  state: UpdateLinkKeepaliveAllowState,
  event: UpdateLinkKeepaliveAllowEvent
): UpdateLinkKeepaliveAllowStepResult {
  if (event.kind === "link/update-keepalive-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canUpdateLinkKeepalive(event.rttPresent) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowUpdateLinkKeepalive(
  actions: ReadonlyArray<UpdateLinkKeepaliveAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyUpdateLinkKeepalive(
  actions: ReadonlyArray<UpdateLinkKeepaliveAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}
/** Whether getChannel should construct a lazy Channel outlet. */
export function shouldCreateLinkChannel(channelPresent: boolean): boolean {
  return !channelPresent;
}


/**
 * shouldCreateLinkChannel gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldCreateLinkChannel` reads beside
 * the step).
 */
export type CreateLinkChannelState = Record<string, never>;

export type CreateLinkChannelEvent =
  | Event
  | {
      readonly kind: "link/create-channel-gate";

      readonly channelPresent: boolean;
    };

export type CreateLinkChannelAction =
  | { readonly kind: "create" }
  | { readonly kind: "reuse" };

export interface CreateLinkChannelStepResult {
  readonly state: CreateLinkChannelState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CreateLinkChannelAction[];
}

export function initialCreateLinkChannelState(): CreateLinkChannelState {
  return {};
}

export function stepCreateLinkChannelWithActions(
  state: CreateLinkChannelState,
  event: CreateLinkChannelEvent
): CreateLinkChannelStepResult {
  if (event.kind === "link/create-channel-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCreateLinkChannel(event.channelPresent) ? "create" : "reuse"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCreateLinkChannelNow(
  actions: ReadonlyArray<CreateLinkChannelAction>
): boolean {
  return actions.some((action) => action.kind === "create");
}

export function shouldReuseLinkChannel(
  actions: ReadonlyArray<CreateLinkChannelAction>
): boolean {
  return actions.some((action) => action.kind === "reuse");
}
export type LinkTokenAccessPlan = "reject-no-key" | "create" | "reuse";

/**
 * Token access for encrypt/decrypt: reject without derived key, create, or reuse.
 * Token construction stays at the adapter when the plan is create.
 */
export function planLinkTokenAccess(input: {
  readonly derivedKeyPresent: boolean;
  readonly tokenPresent: boolean;
}): LinkTokenAccessPlan {
  if (!input.derivedKeyPresent) {
    return "reject-no-key";
  }
  if (!input.tokenPresent) {
    return "create";
  }
  return "reuse";
}

/**
 * Token-access plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkTokenAccess` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkTokenAccessWithActions}.
 */
export type LinkTokenAccessPlanState = Record<string, never>;

export type LinkTokenAccessPlanEvent =
  | Event
  | {
      readonly kind: "token/access-plan-gate";
      readonly derivedKeyPresent: boolean;
      readonly tokenPresent: boolean;
    };

export type LinkTokenAccessPlanAction =
  | { readonly kind: "reject-no-key" }
  | { readonly kind: "create" }
  | { readonly kind: "reuse" };

export interface LinkTokenAccessPlanStepResult {
  readonly state: LinkTokenAccessPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTokenAccessPlanAction[];
}

export function initialLinkTokenAccessPlanState(): LinkTokenAccessPlanState {
  return {};
}

export function stepLinkTokenAccessPlanWithActions(
  state: LinkTokenAccessPlanState,
  event: LinkTokenAccessPlanEvent
): LinkTokenAccessPlanStepResult {
  if (event.kind === "token/access-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkTokenAccess({
            derivedKeyPresent: event.derivedKeyPresent,
            tokenPresent: event.tokenPresent
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRejectNoKeyLinkTokenAccessPlan(
  actions: ReadonlyArray<LinkTokenAccessPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-no-key");
}

export function shouldCreateLinkTokenAccessPlan(
  actions: ReadonlyArray<LinkTokenAccessPlanAction>
): boolean {
  return actions.some((action) => action.kind === "create");
}

export function shouldReuseLinkTokenAccessPlan(
  actions: ReadonlyArray<LinkTokenAccessPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reuse");
}

/** Extract the token-access plan from actions; null when empty. */
export function linkTokenAccessPlanFromActions(
  actions: ReadonlyArray<LinkTokenAccessPlanAction>
): LinkTokenAccessPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "reject-no-key" ||
      entry.kind === "create" ||
      entry.kind === "reuse"
  );
  return action?.kind ?? null;
}

/**
 * Token access gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkTokenAccessPlanWithActions}
 * (`reject-no-key`|`create`|`reuse`).
 */
export type LinkTokenAccessState = Record<string, never>;

export type LinkTokenAccessEvent =
  | Event
  | {
      readonly kind: "token/access-gate";
      readonly derivedKeyPresent: boolean;
      readonly tokenPresent: boolean;
    };

export type LinkTokenAccessAction =
  | { readonly kind: "reject-no-key" }
  | { readonly kind: "create" }
  | { readonly kind: "reuse" };

export interface LinkTokenAccessStepResult {
  readonly state: LinkTokenAccessState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTokenAccessAction[];
}

export function initialLinkTokenAccessState(): LinkTokenAccessState {
  return {};
}

export const stepLinkTokenAccess: StepFn<LinkTokenAccessState> = (state, event) => {
  const result = stepLinkTokenAccessInner(state, event as LinkTokenAccessEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkTokenAccessWithActions(
  state: LinkTokenAccessState,
  event: LinkTokenAccessEvent
): LinkTokenAccessStepResult {
  return stepLinkTokenAccessInner(state, event);
}

export function shouldRejectLinkTokenNoKey(
  actions: ReadonlyArray<LinkTokenAccessAction>
): boolean {
  return actions.some((action) => action.kind === "reject-no-key");
}

export function shouldCreateLinkToken(
  actions: ReadonlyArray<LinkTokenAccessAction>
): boolean {
  return actions.some((action) => action.kind === "create");
}

export function shouldReuseLinkToken(
  actions: ReadonlyArray<LinkTokenAccessAction>
): boolean {
  return actions.some((action) => action.kind === "reuse");
}

function stepLinkTokenAccessInner(
  state: LinkTokenAccessState,
  event: LinkTokenAccessEvent
): LinkTokenAccessStepResult {
  if (event.kind === "token/access-gate") {
    const planActions = stepLinkTokenAccessPlanWithActions(initialLinkTokenAccessPlanState(), {
      kind: "token/access-plan-gate",
      derivedKeyPresent: event.derivedKeyPresent,
      tokenPresent: event.tokenPresent
    }).actions;
    if (shouldRejectNoKeyLinkTokenAccessPlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-no-key" }] };
    }
    if (shouldCreateLinkTokenAccessPlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "create" }] };
    }
    if (!shouldReuseLinkTokenAccessPlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "reuse" }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Whether a packed application request may be sent (request gate + MDU fit).
 * Path hashing / encrypt / packet IO stay at the adapter edge.
 */
export type LinkAppRequestPlan = "send" | "reject";

export function planLinkAppRequest(input: {
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
  readonly packedLength: number;
  readonly mdu: number;
}): LinkAppRequestPlan {
  if (!canLinkRequest({ status: input.status, rtt: input.rtt })) {
    return "reject";
  }
  if (!linkPayloadFitsMdu(input.packedLength, input.mdu)) {
    return "reject";
  }
  return "send";
}

/**
 * App-request send plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequest` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestWithActions}.
 */
export type LinkAppRequestPlanState = Record<string, never>;

export type LinkAppRequestPlanEvent =
  | Event
  | {
      readonly kind: "link/app-request-plan-gate";
      readonly status: LinkStatusValue;
      readonly rtt: number | null;
      readonly packedLength: number;
      readonly mdu: number;
    };

export type LinkAppRequestPlanAction = { readonly kind: LinkAppRequestPlan };

export interface LinkAppRequestPlanStepResult {
  readonly state: LinkAppRequestPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestPlanAction[];
}

export function initialLinkAppRequestPlanState(): LinkAppRequestPlanState {
  return {};
}

export function stepLinkAppRequestPlanWithActions(
  state: LinkAppRequestPlanState,
  event: LinkAppRequestPlanEvent
): LinkAppRequestPlanStepResult {
  if (event.kind === "link/app-request-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkAppRequest({
            status: event.status,
            rtt: event.rtt,
            packedLength: event.packedLength,
            mdu: event.mdu
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the app-request plan from actions; null when empty. */
export function linkAppRequestPlanFromActions(
  actions: ReadonlyArray<LinkAppRequestPlanAction>
): LinkAppRequestPlan | null {
  const action = actions.find((entry) => entry.kind === "send" || entry.kind === "reject");
  return action?.kind ?? null;
}

export function shouldSendLinkAppRequestPlan(
  actions: ReadonlyArray<LinkAppRequestPlanAction>
): boolean {
  return actions.some((action) => action.kind === "send");
}

export function shouldRejectLinkAppRequestPlan(
  actions: ReadonlyArray<LinkAppRequestPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Whether a packed application response fits the link MDU. */
export function canSendLinkAppResponse(input: {
  readonly packedLength: number;
  readonly mdu: number;
}): boolean {
  return linkPayloadFitsMdu(input.packedLength, input.mdu);
}

/**
 * canSendLinkAppResponse gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canSendLinkAppResponse`
 * reads beside the step).
 */
export type SendLinkAppResponseAllowState = Record<string, never>;

export type SendLinkAppResponseAllowEvent =
  | Event
  | {
      readonly kind: "link/send-app-response-allow-gate";
      readonly packedLength: number;
      readonly mdu: number;
    };

export type SendLinkAppResponseAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface SendLinkAppResponseAllowStepResult {
  readonly state: SendLinkAppResponseAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SendLinkAppResponseAllowAction[];
}

export function initialSendLinkAppResponseAllowState(): SendLinkAppResponseAllowState {
  return {};
}

export function stepSendLinkAppResponseAllowWithActions(
  state: SendLinkAppResponseAllowState,
  event: SendLinkAppResponseAllowEvent
): SendLinkAppResponseAllowStepResult {
  if (event.kind === "link/send-app-response-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canSendLinkAppResponse({
            packedLength: event.packedLength,
            mdu: event.mdu
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowSendLinkAppResponse(
  actions: ReadonlyArray<SendLinkAppResponseAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenySendLinkAppResponse(
  actions: ReadonlyArray<SendLinkAppResponseAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

export type LinkAppRequestDispatchPlan = "ignore" | "forbidden" | "invoke-handler";

/**
 * Whether an inbound application request may invoke the destination handler.
 * Decrypt / unpack / responseGenerator / encrypt stay at the adapter edge.
 * Allow-policy is supplied via {@link stepDestinationRequestAllowWithActions}
 * (`requestAllowed`); do not re-read `planDestinationRequestAllow` beside the step.
 */
export function planLinkAppRequestDispatch(input: {
  readonly plaintextPresent: boolean;
  readonly handlerDestinationPresent: boolean;
  readonly handlerPresent: boolean;
  readonly requestAllowed: boolean;
}): LinkAppRequestDispatchPlan {
  if (
    !input.plaintextPresent ||
    !input.handlerDestinationPresent ||
    !input.handlerPresent
  ) {
    return "ignore";
  }
  if (!input.requestAllowed) {
    return "forbidden";
  }
  return "invoke-handler";
}

/**
 * App-request dispatch plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequestDispatch` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestInboundWithActions}.
 */
export type LinkAppRequestDispatchState = Record<string, never>;

export type LinkAppRequestDispatchEvent =
  | Event
  | {
      readonly kind: "link/app-request-dispatch-gate";
      readonly plaintextPresent: boolean;
      readonly handlerDestinationPresent: boolean;
      readonly handlerPresent: boolean;
      readonly requestAllowed: boolean;
    };

export type LinkAppRequestDispatchAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "invoke-handler" };

export interface LinkAppRequestDispatchStepResult {
  readonly state: LinkAppRequestDispatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestDispatchAction[];
}

export function initialLinkAppRequestDispatchState(): LinkAppRequestDispatchState {
  return {};
}

export function stepLinkAppRequestDispatchWithActions(
  state: LinkAppRequestDispatchState,
  event: LinkAppRequestDispatchEvent
): LinkAppRequestDispatchStepResult {
  if (event.kind === "link/app-request-dispatch-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkAppRequestDispatch({
            plaintextPresent: event.plaintextPresent,
            handlerDestinationPresent: event.handlerDestinationPresent,
            handlerPresent: event.handlerPresent,
            requestAllowed: event.requestAllowed
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreLinkAppRequestDispatch(
  actions: ReadonlyArray<LinkAppRequestDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

export function shouldForbidLinkAppRequestDispatch(
  actions: ReadonlyArray<LinkAppRequestDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "forbidden");
}

export function shouldInvokeLinkAppRequestDispatch(
  actions: ReadonlyArray<LinkAppRequestDispatchAction>
): boolean {
  return actions.some((action) => action.kind === "invoke-handler");
}

/** Extract the dispatch plan from actions; null when empty. */
export function linkAppRequestDispatchFromActions(
  actions: ReadonlyArray<LinkAppRequestDispatchAction>
): LinkAppRequestDispatchPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ignore" ||
      entry.kind === "forbidden" ||
      entry.kind === "invoke-handler"
  );
  return action?.kind ?? null;
}

export type LinkAppRequestResponsePlan = "ignore" | "response-too-big" | "send-response";

/**
 * Whether inbound app-request handling may invoke the destination handler after
 * {@link planLinkAppRequestDispatch} returns invoke-handler.
 */
export function shouldInvokeLinkAppRequestHandler(input: {
  readonly dispatchInvoke: boolean;
  readonly unpackedPresent: boolean;
  readonly handlerPresent: boolean;
}): boolean {
  return input.dispatchInvoke && input.unpackedPresent && input.handlerPresent;
}

/**
 * Link app-request invoke-handler apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeLinkAppRequestHandler` reads beside the step).
 */
export type InvokeLinkAppRequestHandlerState = Record<string, never>;

export type InvokeLinkAppRequestHandlerEvent =
  | Event
  | {
      readonly kind: "link/invoke-app-request-handler-gate";
      readonly dispatchInvoke: boolean;
      readonly unpackedPresent: boolean;
      readonly handlerPresent: boolean;
    };

export type InvokeLinkAppRequestHandlerAction =
  | { readonly kind: "invoke" }
  | { readonly kind: "skip" };

export interface InvokeLinkAppRequestHandlerStepResult {
  readonly state: InvokeLinkAppRequestHandlerState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InvokeLinkAppRequestHandlerAction[];
}

export function initialInvokeLinkAppRequestHandlerState(): InvokeLinkAppRequestHandlerState {
  return {};
}

export function stepInvokeLinkAppRequestHandlerWithActions(
  state: InvokeLinkAppRequestHandlerState,
  event: InvokeLinkAppRequestHandlerEvent
): InvokeLinkAppRequestHandlerStepResult {
  if (event.kind === "link/invoke-app-request-handler-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldInvokeLinkAppRequestHandler({
            dispatchInvoke: event.dispatchInvoke,
            unpackedPresent: event.unpackedPresent,
            handlerPresent: event.handlerPresent
          })
            ? "invoke"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInvokeLinkAppRequestHandlerNow(
  actions: ReadonlyArray<InvokeLinkAppRequestHandlerAction>
): boolean {
  return actions.some((action) => action.kind === "invoke");
}

export function shouldSkipInvokeLinkAppRequestHandler(
  actions: ReadonlyArray<InvokeLinkAppRequestHandlerAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether a packed app-request response may be transmitted after
 * {@link planLinkAppRequestResponse} returns send-response.
 */
export function shouldSendLinkAppRequestResponse(input: {
  readonly planSend: boolean;
  readonly packedPresent: boolean;
}): boolean {
  return input.planSend && input.packedPresent;
}

/**
 * Link app-request send-response apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldSendLinkAppRequestResponse` reads beside the step).
 */
export type SendLinkAppRequestResponseState = Record<string, never>;

export type SendLinkAppRequestResponseEvent =
  | Event
  | {
      readonly kind: "link/send-app-request-response-gate";
      readonly planSend: boolean;
      readonly packedPresent: boolean;
    };

export type SendLinkAppRequestResponseAction =
  | { readonly kind: "send" }
  | { readonly kind: "skip" };

export interface SendLinkAppRequestResponseStepResult {
  readonly state: SendLinkAppRequestResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SendLinkAppRequestResponseAction[];
}

export function initialSendLinkAppRequestResponseState(): SendLinkAppRequestResponseState {
  return {};
}

export function stepSendLinkAppRequestResponseWithActions(
  state: SendLinkAppRequestResponseState,
  event: SendLinkAppRequestResponseEvent
): SendLinkAppRequestResponseStepResult {
  if (event.kind === "link/send-app-request-response-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldSendLinkAppRequestResponse({
            planSend: event.planSend,
            packedPresent: event.packedPresent
          })
            ? "send"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldSendLinkAppRequestResponseNow(
  actions: ReadonlyArray<SendLinkAppRequestResponseAction>
): boolean {
  return actions.some((action) => action.kind === "send");
}

export function shouldSkipSendLinkAppRequestResponse(
  actions: ReadonlyArray<SendLinkAppRequestResponseAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether a packed application response may be sent after the handler returns.
 * Pass `responseFitsMdu` from {@link stepSendLinkAppResponseAllowWithActions}
 * (`shouldAllowSendLinkAppResponse`); do not re-read `canSendLinkAppResponse`
 * beside the step.
 */
export function planLinkAppRequestResponse(input: {
  readonly responsePresent: boolean;
  readonly responseFitsMdu: boolean;
}): LinkAppRequestResponsePlan {
  if (!input.responsePresent) {
    return "ignore";
  }
  if (!input.responseFitsMdu) {
    return "response-too-big";
  }
  return "send-response";
}

/**
 * App-request response plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequestResponse` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestInboundWithActions}.
 */
export type LinkAppRequestResponsePlanState = Record<string, never>;

export type LinkAppRequestResponsePlanEvent =
  | Event
  | {
      readonly kind: "link/app-request-response-plan-gate";
      readonly responsePresent: boolean;
      readonly responseFitsMdu: boolean;
    };

export type LinkAppRequestResponsePlanAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "response-too-big" }
  | { readonly kind: "send-response" };

export interface LinkAppRequestResponsePlanStepResult {
  readonly state: LinkAppRequestResponsePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestResponsePlanAction[];
}

export function initialLinkAppRequestResponsePlanState(): LinkAppRequestResponsePlanState {
  return {};
}

export function stepLinkAppRequestResponsePlanWithActions(
  state: LinkAppRequestResponsePlanState,
  event: LinkAppRequestResponsePlanEvent
): LinkAppRequestResponsePlanStepResult {
  if (event.kind === "link/app-request-response-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkAppRequestResponse({
            responsePresent: event.responsePresent,
            responseFitsMdu: event.responseFitsMdu
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreLinkAppRequestResponsePlan(
  actions: ReadonlyArray<LinkAppRequestResponsePlanAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

export function shouldRejectLinkAppRequestResponseTooBigPlan(
  actions: ReadonlyArray<LinkAppRequestResponsePlanAction>
): boolean {
  return actions.some((action) => action.kind === "response-too-big");
}

export function shouldSendLinkAppRequestResponsePlan(
  actions: ReadonlyArray<LinkAppRequestResponsePlanAction>
): boolean {
  return actions.some((action) => action.kind === "send-response");
}

/** Extract the response plan from actions; null when empty. */
export function linkAppRequestResponsePlanFromActions(
  actions: ReadonlyArray<LinkAppRequestResponsePlanAction>
): LinkAppRequestResponsePlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ignore" ||
      entry.kind === "response-too-big" ||
      entry.kind === "send-response"
  );
  return action?.kind ?? null;
}

/**
 * Pure inbound link application-request dispatch (handler invoke → response send).
 * Decrypt / unpack / responseGenerator / encrypt stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc plan outcome /
 * `planDestinationRequestAllow` / `canSendLinkAppResponse` /
 * `shouldInvokeLinkAppRequestHandler` /
 * `shouldSendLinkAppRequestResponse` /
 * `planLinkAppRequestDispatch` / `planLinkAppRequestResponse` / `plan ===`
 * reads beside the step). Dispatch nested via
 * {@link stepLinkAppRequestDispatchWithActions}; response plan nested via
 * {@link stepLinkAppRequestResponsePlanWithActions}.
 */
export interface LinkAppRequestInboundState {
  readonly waitingHandler: boolean;
  readonly mdu: number;
}

export type LinkAppRequestInboundEvent =
  | Event
  | {
      readonly kind: "app-request/received";
      readonly plaintextPresent: boolean;
      readonly handlerDestinationPresent: boolean;
      readonly handlerPresent: boolean;
      readonly allow: number;
      readonly allowedList: ReadonlyArray<Uint8Array>;
      readonly remoteIdentityHash: Uint8Array | null;
      readonly unpackedPresent: boolean;
    }
  | {
      readonly kind: "app-request/handler-result";
      readonly responsePresent: boolean;
      readonly packedLength: number;
    };

/**
 * Adapter applies ignore / forbidden / invoke-handler / response outcomes only from these.
 */
export type LinkAppRequestInboundAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "invoke-handler" }
  | { readonly kind: "send-response" }
  | { readonly kind: "ignore-response" }
  | { readonly kind: "response-too-big" };

export interface LinkAppRequestInboundStepResult {
  readonly state: LinkAppRequestInboundState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestInboundAction[];
}

export function initialLinkAppRequestInboundState(input: {
  readonly mdu: number;
}): LinkAppRequestInboundState {
  return {
    waitingHandler: false,
    mdu: input.mdu
  };
}

export const stepLinkAppRequestInbound: StepFn<LinkAppRequestInboundState> = (
  state,
  event
) => {
  const result = stepLinkAppRequestInboundInner(
    state,
    event as LinkAppRequestInboundEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkAppRequestInboundWithActions(
  state: LinkAppRequestInboundState,
  event: LinkAppRequestInboundEvent
): LinkAppRequestInboundStepResult {
  return stepLinkAppRequestInboundInner(state, event);
}

/** Whether step actions include ignore. */
export function shouldIgnoreLinkAppRequestInbound(
  actions: ReadonlyArray<LinkAppRequestInboundAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

/** Whether step actions include forbidden. */
export function shouldForbidLinkAppRequestInbound(
  actions: ReadonlyArray<LinkAppRequestInboundAction>
): boolean {
  return actions.some((action) => action.kind === "forbidden");
}

/** Whether step actions include invoke-handler. */
export function shouldInvokeLinkAppRequestInbound(
  actions: ReadonlyArray<LinkAppRequestInboundAction>
): boolean {
  return actions.some((action) => action.kind === "invoke-handler");
}

/** Whether step actions include send-response. */
export function shouldSendLinkAppRequestInboundResponse(
  actions: ReadonlyArray<LinkAppRequestInboundAction>
): boolean {
  return actions.some((action) => action.kind === "send-response");
}

/** Whether step actions include ignore-response. */
export function shouldIgnoreLinkAppRequestInboundResponse(
  actions: ReadonlyArray<LinkAppRequestInboundAction>
): boolean {
  return actions.some((action) => action.kind === "ignore-response");
}

/** Whether step actions include response-too-big. */
export function shouldRejectLinkAppRequestInboundTooBig(
  actions: ReadonlyArray<LinkAppRequestInboundAction>
): boolean {
  return actions.some((action) => action.kind === "response-too-big");
}

function stepLinkAppRequestInboundInner(
  state: LinkAppRequestInboundState,
  event: LinkAppRequestInboundEvent
): LinkAppRequestInboundStepResult {
  if (event.kind === "app-request/received") {
    const requestAllowed = shouldAllowDestinationRequest(
      stepDestinationRequestAllowWithActions(initialDestinationRequestAllowState(), {
        kind: "destination/request-allow-gate",
        allow: event.allow,
        allowedList: event.allowedList,
        remoteIdentityHash: event.remoteIdentityHash
      }).actions
    );
    const dispatchActions = stepLinkAppRequestDispatchWithActions(
      initialLinkAppRequestDispatchState(),
      {
        kind: "link/app-request-dispatch-gate",
        plaintextPresent: event.plaintextPresent,
        handlerDestinationPresent: event.handlerDestinationPresent,
        handlerPresent: event.handlerPresent,
        requestAllowed
      }
    ).actions;
    if (shouldIgnoreLinkAppRequestDispatch(dispatchActions)) {
      return { state, intents: [], actions: [{ kind: "ignore" }] };
    }
    if (shouldForbidLinkAppRequestDispatch(dispatchActions)) {
      return { state, intents: [], actions: [{ kind: "forbidden" }] };
    }
    const invokeStepped = stepInvokeLinkAppRequestHandlerWithActions(
      initialInvokeLinkAppRequestHandlerState(),
      {
        kind: "link/invoke-app-request-handler-gate",
        dispatchInvoke: shouldInvokeLinkAppRequestDispatch(dispatchActions),
        unpackedPresent: event.unpackedPresent,
        handlerPresent: event.handlerPresent
      }
    );
    if (!shouldInvokeLinkAppRequestHandlerNow(invokeStepped.actions)) {
      return { state, intents: [], actions: [{ kind: "ignore" }] };
    }
    return {
      state: { ...state, waitingHandler: true },
      intents: [],
      actions: [{ kind: "invoke-handler" }]
    };
  }

  if (event.kind === "app-request/handler-result") {
    if (!state.waitingHandler) {
      return { state, intents: [], actions: [] };
    }
    const responseFitsMdu = shouldAllowSendLinkAppResponse(
      stepSendLinkAppResponseAllowWithActions(initialSendLinkAppResponseAllowState(), {
        kind: "link/send-app-response-allow-gate",
        packedLength: event.packedLength,
        mdu: state.mdu
      }).actions
    );
    const responsePlanActions = stepLinkAppRequestResponsePlanWithActions(
      initialLinkAppRequestResponsePlanState(),
      {
        kind: "link/app-request-response-plan-gate",
        responsePresent: event.responsePresent,
        responseFitsMdu
      }
    ).actions;
    const next = { ...state, waitingHandler: false };
    if (shouldIgnoreLinkAppRequestResponsePlan(responsePlanActions)) {
      return { state: next, intents: [], actions: [{ kind: "ignore-response" }] };
    }
    if (shouldRejectLinkAppRequestResponseTooBigPlan(responsePlanActions)) {
      return { state: next, intents: [], actions: [{ kind: "response-too-big" }] };
    }
    const sendStepped = stepSendLinkAppRequestResponseWithActions(
      initialSendLinkAppRequestResponseState(),
      {
        kind: "link/send-app-request-response-gate",
        planSend: shouldSendLinkAppRequestResponsePlan(responsePlanActions),
        packedPresent: event.responsePresent
      }
    );
    if (!shouldSendLinkAppRequestResponseNow(sendStepped.actions)) {
      return { state: next, intents: [], actions: [{ kind: "ignore-response" }] };
    }
    return { state: next, intents: [], actions: [{ kind: "send-response" }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether inbound traffic (non-keepalive) should refresh lastData. */
export function shouldUpdateLinkLastData(contextKeepalive: boolean): boolean {
  return !contextKeepalive;
}


/**
 * shouldUpdateLinkLastData gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldUpdateLinkLastData` reads beside
 * the step).
 */
export type UpdateLinkLastDataState = Record<string, never>;

export type UpdateLinkLastDataEvent =
  | Event
  | {
      readonly kind: "link/update-last-data-gate";

      readonly contextKeepalive: boolean;
    };

export type UpdateLinkLastDataAction =
  | { readonly kind: "update" }
  | { readonly kind: "skip" };

export interface UpdateLinkLastDataStepResult {
  readonly state: UpdateLinkLastDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UpdateLinkLastDataAction[];
}

export function initialUpdateLinkLastDataState(): UpdateLinkLastDataState {
  return {};
}

export function stepUpdateLinkLastDataWithActions(
  state: UpdateLinkLastDataState,
  event: UpdateLinkLastDataEvent
): UpdateLinkLastDataStepResult {
  if (event.kind === "link/update-last-data-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldUpdateLinkLastData(event.contextKeepalive) ? "update" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUpdateLinkLastDataNow(
  actions: ReadonlyArray<UpdateLinkLastDataAction>
): boolean {
  return actions.some((action) => action.kind === "update");
}

export function shouldSkipLinkLastDataUpdate(
  actions: ReadonlyArray<UpdateLinkLastDataAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}
/** Whether inbound link receive should dispatch DATA context handlers. */
export function isLinkInboundDataPacket(packetType: number): boolean {
  return packetType === PacketTypeCode.DATA;
}


/**
 * isLinkInboundDataPacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkInboundDataPacket` reads beside
 * the step).
 */
export type LinkInboundDataPacketState = Record<string, never>;

export type LinkInboundDataPacketEvent =
  | Event
  | {
      readonly kind: "link/inbound-data-packet-gate";

      readonly packetType: number;
    };

export type LinkInboundDataPacketAction =
  | { readonly kind: "data" }
  | { readonly kind: "other" };

export interface LinkInboundDataPacketStepResult {
  readonly state: LinkInboundDataPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkInboundDataPacketAction[];
}

export function initialLinkInboundDataPacketState(): LinkInboundDataPacketState {
  return {};
}

export function stepLinkInboundDataPacketWithActions(
  state: LinkInboundDataPacketState,
  event: LinkInboundDataPacketEvent
): LinkInboundDataPacketStepResult {
  if (event.kind === "link/inbound-data-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isLinkInboundDataPacket(event.packetType) ? "data" : "other"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDispatchLinkInboundData(
  actions: ReadonlyArray<LinkInboundDataPacketAction>
): boolean {
  return actions.some((action) => action.kind === "data");
}

export function shouldIgnoreLinkInboundNonData(
  actions: ReadonlyArray<LinkInboundDataPacketAction>
): boolean {
  return actions.some((action) => action.kind === "other");
}
/** Whether the link may send application/context data (ACTIVE). */
export function canLinkSend(status: LinkStatusValue): boolean {
  return status === LinkStatus.ACTIVE;
}


/**
 * canLinkSend gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLinkSend` reads beside
 * the step).
 */
export type LinkSendAllowState = Record<string, never>;

export type LinkSendAllowEvent =
  | Event
  | {
      readonly kind: "link/send-allow-gate";

      readonly status: LinkStatusValue;
    };

export type LinkSendAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface LinkSendAllowStepResult {
  readonly state: LinkSendAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkSendAllowAction[];
}

export function initialLinkSendAllowState(): LinkSendAllowState {
  return {};
}

export function stepLinkSendAllowWithActions(
  state: LinkSendAllowState,
  event: LinkSendAllowEvent
): LinkSendAllowStepResult {
  if (event.kind === "link/send-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canLinkSend(event.status) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowLinkSend(
  actions: ReadonlyArray<LinkSendAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyLinkSend(
  actions: ReadonlyArray<LinkSendAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}
/** Whether an existing link may be reused for outbound send (present + ACTIVE). */
export function shouldReuseActiveLink(input: {
  readonly linkPresent: boolean;
  readonly status: LinkStatusValue;
}): boolean {
  return input.linkPresent && canLinkSend(input.status);
}


/**
 * shouldReuseActiveLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReuseActiveLink` reads beside
 * the step).
 */
export type ReuseActiveLinkState = Record<string, never>;

export type ReuseActiveLinkEvent =
  | Event
  | {
      readonly kind: "link/reuse-active-gate";

      readonly linkPresent: boolean;
      readonly status: LinkStatusValue;
    };

export type ReuseActiveLinkAction =
  | { readonly kind: "reuse" }
  | { readonly kind: "skip" };

export interface ReuseActiveLinkStepResult {
  readonly state: ReuseActiveLinkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReuseActiveLinkAction[];
}

export function initialReuseActiveLinkState(): ReuseActiveLinkState {
  return {};
}

export function stepReuseActiveLinkWithActions(
  state: ReuseActiveLinkState,
  event: ReuseActiveLinkEvent
): ReuseActiveLinkStepResult {
  if (event.kind === "link/reuse-active-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldReuseActiveLink({ linkPresent: event.linkPresent, status: event.status }) ? "reuse" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldReuseActiveLinkNow(
  actions: ReadonlyArray<ReuseActiveLinkAction>
): boolean {
  return actions.some((action) => action.kind === "reuse");
}

export function shouldSkipReuseActiveLink(
  actions: ReadonlyArray<ReuseActiveLinkAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}
/** Whether inbound link traffic should be accepted from this interface attachment. */
export function shouldAcceptLinkPacketInterface(input: {
  readonly hasAttachedInterface: boolean;
  readonly sameInterface: boolean;
}): boolean {
  return !input.hasAttachedInterface || input.sameInterface;
}


/**
 * shouldAcceptLinkPacketInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptLinkPacketInterface` reads beside
 * the step).
 */
export type AcceptLinkPacketInterfaceState = Record<string, never>;

export type AcceptLinkPacketInterfaceEvent =
  | Event
  | {
      readonly kind: "link/accept-packet-interface-gate";

      readonly hasAttachedInterface: boolean;
      readonly sameInterface: boolean;
    };

export type AcceptLinkPacketInterfaceAction =
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptLinkPacketInterfaceStepResult {
  readonly state: AcceptLinkPacketInterfaceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkPacketInterfaceAction[];
}

export function initialAcceptLinkPacketInterfaceState(): AcceptLinkPacketInterfaceState {
  return {};
}

export function stepAcceptLinkPacketInterfaceWithActions(
  state: AcceptLinkPacketInterfaceState,
  event: AcceptLinkPacketInterfaceEvent
): AcceptLinkPacketInterfaceStepResult {
  if (event.kind === "link/accept-packet-interface-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptLinkPacketInterface({ hasAttachedInterface: event.hasAttachedInterface, sameInterface: event.sameInterface }) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkPacketInterfaceNow(
  actions: ReadonlyArray<AcceptLinkPacketInterfaceAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipLinkPacketInterface(
  actions: ReadonlyArray<AcceptLinkPacketInterfaceAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}
/** Whether link sendContext should encrypt the payload (default yes unless encrypt:false). */
export function shouldEncryptLinkPayload(encryptOption: boolean | undefined): boolean {
  return encryptOption !== false;
}


/**
 * shouldEncryptLinkPayload gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEncryptLinkPayload` reads beside
 * the step).
 */
export type EncryptLinkPayloadState = Record<string, never>;

export type EncryptLinkPayloadEvent =
  | Event
  | {
      readonly kind: "link/encrypt-payload-gate";

      readonly encryptOption: boolean | undefined;
    };

export type EncryptLinkPayloadAction =
  | { readonly kind: "encrypt" }
  | { readonly kind: "plaintext" };

export interface EncryptLinkPayloadStepResult {
  readonly state: EncryptLinkPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncryptLinkPayloadAction[];
}

export function initialEncryptLinkPayloadState(): EncryptLinkPayloadState {
  return {};
}

export function stepEncryptLinkPayloadWithActions(
  state: EncryptLinkPayloadState,
  event: EncryptLinkPayloadEvent
): EncryptLinkPayloadStepResult {
  if (event.kind === "link/encrypt-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEncryptLinkPayload(event.encryptOption) ? "encrypt" : "plaintext"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEncryptLinkPayloadNow(
  actions: ReadonlyArray<EncryptLinkPayloadAction>
): boolean {
  return actions.some((action) => action.kind === "encrypt");
}

export function shouldSendLinkPayloadPlaintext(
  actions: ReadonlyArray<EncryptLinkPayloadAction>
): boolean {
  return actions.some((action) => action.kind === "plaintext");
}
/** Whether the link is closed (no further receive / watchdog work). */
export function isLinkClosed(status: LinkStatusValue): boolean {
  return status === LinkStatus.CLOSED;
}


/**
 * isLinkClosed gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkClosed` reads beside
 * the step).
 */
export type LinkClosedState = Record<string, never>;

export type LinkClosedEvent =
  | Event
  | {
      readonly kind: "link/closed-gate";

      readonly status: LinkStatusValue;
    };

export type LinkClosedAction =
  | { readonly kind: "closed" }
  | { readonly kind: "open" };

export interface LinkClosedStepResult {
  readonly state: LinkClosedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkClosedAction[];
}

export function initialLinkClosedState(): LinkClosedState {
  return {};
}

export function stepLinkClosedWithActions(
  state: LinkClosedState,
  event: LinkClosedEvent
): LinkClosedStepResult {
  if (event.kind === "link/closed-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isLinkClosed(event.status) ? "closed" : "open"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatLinkClosed(
  actions: ReadonlyArray<LinkClosedAction>
): boolean {
  return actions.some((action) => action.kind === "closed");
}

export function shouldTreatLinkOpen(
  actions: ReadonlyArray<LinkClosedAction>
): boolean {
  return actions.some((action) => action.kind === "open");
}
export type LinkRegisterList = "pending" | "active";

/** Which transport link list should receive a newly registered link. */
export function planLinkRegisterList(initiator: boolean): LinkRegisterList {
  return initiator ? "pending" : "active";
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
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

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
  event: RegisterLinkMemberEvent
): RegisterLinkMemberStepResult {
  if (event.kind === "link/register-member-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterLinkMember(event.alreadyPresent) ? "register" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterLinkMemberNow(
  actions: ReadonlyArray<RegisterLinkMemberAction>
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipRegisterLinkMember(
  actions: ReadonlyArray<RegisterLinkMemberAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
    appendActive: !input.alreadyActive
  };
}

/** Whether activate may splice pending after {@link planLinkActivateMembership}. */
export function shouldRemovePendingLinkMembership(indexPresent: boolean): boolean {
  return indexPresent;
}

/** Whether activate may unique-push to active after {@link planLinkActivateMembership}. */
export function shouldAppendActiveLinkMembership(appendActive: boolean): boolean {
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
    removeActiveIndex: input.activeIndex >= 0 ? input.activeIndex : null
  };
}

/** Whether unregister may splice active after {@link planLinkUnregisterMembership}. */
export function shouldRemoveActiveLinkMembership(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Link register-list choice is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LinkRegisterListState = Record<string, never>;

export type LinkRegisterListEvent =
  | Event
  | {
      readonly kind: "link/register-list-gate";
      readonly initiator: boolean;
    };

export type LinkRegisterListAction = {
  readonly kind: LinkRegisterList;
};

export interface LinkRegisterListStepResult {
  readonly state: LinkRegisterListState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRegisterListAction[];
}

export function initialLinkRegisterListState(): LinkRegisterListState {
  return {};
}

export const stepLinkRegisterList: StepFn<LinkRegisterListState> = (state, event) => {
  const result = stepLinkRegisterListInner(state, event as LinkRegisterListEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkRegisterListWithActions(
  state: LinkRegisterListState,
  event: LinkRegisterListEvent
): LinkRegisterListStepResult {
  return stepLinkRegisterListInner(state, event);
}

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

function stepLinkRegisterListInner(
  state: LinkRegisterListState,
  event: LinkRegisterListEvent
): LinkRegisterListStepResult {
  if (event.kind === "link/register-list-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planLinkRegisterList(event.initiator) }]
    };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Link activate-membership is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
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

export function initialLinkActivateMembershipState(): LinkActivateMembershipState {
  return {};
}

export const stepLinkActivateMembership: StepFn<LinkActivateMembershipState> = (state, event) => {
  const result = stepLinkActivateMembershipInner(state, event as LinkActivateMembershipEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkActivateMembershipWithActions(
  state: LinkActivateMembershipState,
  event: LinkActivateMembershipEvent
): LinkActivateMembershipStepResult {
  return stepLinkActivateMembershipInner(state, event);
}

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

function stepLinkActivateMembershipInner(
  state: LinkActivateMembershipState,
  event: LinkActivateMembershipEvent
): LinkActivateMembershipStepResult {
  if (event.kind === "link/activate-membership-gate") {
    const plan = planLinkActivateMembership({
      pendingIndex: event.pendingIndex,
      alreadyActive: event.alreadyActive
    });
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

/**
 * Link unregister-membership is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LinkUnregisterMembershipState = Record<string, never>;

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
    const plan = planLinkUnregisterMembership({
      pendingIndex: event.pendingIndex,
      activeIndex: event.activeIndex
    });
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

/**
 * Link app-request send gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkAppRequestPlanWithActions} (`send`|`reject`).
 */
export type LinkAppRequestState = Record<string, never>;

export type LinkAppRequestEvent =
  | Event
  | {
      readonly kind: "link/app-request-gate";
      readonly status: LinkStatusValue;
      readonly rtt: number | null;
      readonly packedLength: number;
      readonly mdu: number;
    };

export type LinkAppRequestAction = {
  readonly kind: LinkAppRequestPlan;
};

export interface LinkAppRequestStepResult {
  readonly state: LinkAppRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestAction[];
}

export function initialLinkAppRequestState(): LinkAppRequestState {
  return {};
}

export const stepLinkAppRequest: StepFn<LinkAppRequestState> = (state, event) => {
  const result = stepLinkAppRequestInner(state, event as LinkAppRequestEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkAppRequestWithActions(
  state: LinkAppRequestState,
  event: LinkAppRequestEvent
): LinkAppRequestStepResult {
  return stepLinkAppRequestInner(state, event);
}

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

function stepLinkAppRequestInner(
  state: LinkAppRequestState,
  event: LinkAppRequestEvent
): LinkAppRequestStepResult {
  if (event.kind === "link/app-request-gate") {
    const planActions = stepLinkAppRequestPlanWithActions(initialLinkAppRequestPlanState(), {
      kind: "link/app-request-plan-gate",
      status: event.status,
      rtt: event.rtt,
      packedLength: event.packedLength,
      mdu: event.mdu
    }).actions;
    const plan = linkAppRequestPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
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

/**
 * LRRTT outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRttOutcome` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkEstablishWithActions} (`establish/rtt`).
 */
export type LinkRttOutcomePlanState = Record<string, never>;

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

export interface LinkRttOutcomePlanStepResult {
  readonly state: LinkRttOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRttOutcomePlanAction[];
}

export function initialLinkRttOutcomePlanState(): LinkRttOutcomePlanState {
  return {};
}

export function stepLinkRttOutcomePlanWithActions(
  state: LinkRttOutcomePlanState,
  event: LinkRttOutcomePlanEvent
): LinkRttOutcomePlanStepResult {
  if (event.kind === "rtt/outcome-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkRttOutcome({
            canAccept: event.canAccept,
            plaintextPresent: event.plaintextPresent
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

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

/** Extract the LRRTT outcome plan from actions; null when empty. */
export function linkRttOutcomePlanFromActions(
  actions: ReadonlyArray<LinkRttOutcomePlanAction>
): LinkRttOutcome | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ignore" ||
      entry.kind === "activate" ||
      entry.kind === "teardown"
  );
  return action?.kind ?? null;
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

export type TeardownLinkFromRttEvent =
  | Event
  | {
      readonly kind: "link/teardown-from-rtt-gate";
      readonly outcomeTeardown: boolean;
      readonly plaintextPresent: boolean;
    };

export type TeardownLinkFromRttAction =
  | { readonly kind: "teardown" }
  | { readonly kind: "skip" };

export interface TeardownLinkFromRttStepResult {
  readonly state: TeardownLinkFromRttState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TeardownLinkFromRttAction[];
}

export function initialTeardownLinkFromRttState(): TeardownLinkFromRttState {
  return {};
}

export function stepTeardownLinkFromRttWithActions(
  state: TeardownLinkFromRttState,
  event: TeardownLinkFromRttEvent
): TeardownLinkFromRttStepResult {
  if (event.kind === "link/teardown-from-rtt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldTeardownLinkFromRtt({
            outcomeTeardown: event.outcomeTeardown,
            plaintextPresent: event.plaintextPresent
          })
            ? "teardown"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTeardownLinkFromRttNow(
  actions: ReadonlyArray<TeardownLinkFromRttAction>
): boolean {
  return actions.some((action) => action.kind === "teardown");
}

export function shouldSkipTeardownLinkFromRtt(
  actions: ReadonlyArray<TeardownLinkFromRttAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether link plaintext DATA callback may fire after decrypt. */
export function shouldDispatchLinkPlaintext(plaintextPresent: boolean): boolean {
  return plaintextPresent;
}


/**
 * shouldDispatchLinkPlaintext gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldDispatchLinkPlaintext` reads beside
 * the step).
 */
export type DispatchLinkPlaintextState = Record<string, never>;

export type DispatchLinkPlaintextEvent =
  | Event
  | {
      readonly kind: "link/dispatch-plaintext-gate";
      readonly plaintextPresent: boolean;
    };

export type DispatchLinkPlaintextAction =
  | { readonly kind: "dispatch" }
  | { readonly kind: "skip" };

export interface DispatchLinkPlaintextStepResult {
  readonly state: DispatchLinkPlaintextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DispatchLinkPlaintextAction[];
}

export function initialDispatchLinkPlaintextState(): DispatchLinkPlaintextState {
  return {};
}

export function stepDispatchLinkPlaintextWithActions(
  state: DispatchLinkPlaintextState,
  event: DispatchLinkPlaintextEvent
): DispatchLinkPlaintextStepResult {
  if (event.kind === "link/dispatch-plaintext-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDispatchLinkPlaintext(event.plaintextPresent) ? "dispatch" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDispatchLinkPlaintextNow(
  actions: ReadonlyArray<DispatchLinkPlaintextAction>
): boolean {
  return actions.some((action) => action.kind === "dispatch");
}

export function shouldSkipLinkPlaintextDispatch(
  actions: ReadonlyArray<DispatchLinkPlaintextAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether resendPacket may transmit (decoded + attached interface). */
export function canResendLinkPacket(input: {
  readonly packetDecoded: boolean;
  readonly attachedInterfacePresent: boolean;
}): boolean {
  return input.packetDecoded && input.attachedInterfacePresent;
}


/**
 * canResendLinkPacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canResendLinkPacket` reads beside
 * the step).
 */
export type ResendLinkPacketAllowState = Record<string, never>;

export type ResendLinkPacketAllowEvent =
  | Event
  | {
      readonly kind: "link/resend-packet-allow-gate";
      readonly packetDecoded: boolean;
      readonly attachedInterfacePresent: boolean;
    };

export type ResendLinkPacketAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface ResendLinkPacketAllowStepResult {
  readonly state: ResendLinkPacketAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResendLinkPacketAllowAction[];
}

export function initialResendLinkPacketAllowState(): ResendLinkPacketAllowState {
  return {};
}

export function stepResendLinkPacketAllowWithActions(
  state: ResendLinkPacketAllowState,
  event: ResendLinkPacketAllowEvent
): ResendLinkPacketAllowStepResult {
  if (event.kind === "link/resend-packet-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canResendLinkPacket({ packetDecoded: event.packetDecoded, attachedInterfacePresent: event.attachedInterfacePresent }) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowResendLinkPacket(
  actions: ReadonlyArray<ResendLinkPacketAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyResendLinkPacket(
  actions: ReadonlyArray<ResendLinkPacketAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
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

export function shouldKeepPendingLinkAppRequestTransmitOutcomePlan(
  actions: ReadonlyArray<LinkAppRequestTransmitOutcomePlanAction>
): boolean {
  return actions.some((action) => action.kind === "keep-pending");
}

export function shouldUnregisterLinkAppRequestTransmitOutcomePlan(
  actions: ReadonlyArray<LinkAppRequestTransmitOutcomePlanAction>
): boolean {
  return actions.some((action) => action.kind === "unregister");
}

export function computeLinkRttSeconds(nowSeconds: number, requestTimeSeconds: number): number {
  return nowSeconds - requestTimeSeconds;
}

export function mergeLinkRtt(measuredSeconds: number, remoteSeconds: number): number {
  return Math.max(measuredSeconds, remoteSeconds);
}

/**
 * Link RTT-seconds computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeLinkRttSeconds`
 * reads beside the step).
 */
export type ComputeLinkRttSecondsState = Record<string, never>;

export type ComputeLinkRttSecondsEvent =
  | Event
  | {
      readonly kind: "link/rtt-seconds-gate";
      readonly nowSeconds: number;
      readonly requestTimeSeconds: number;
    };

export type ComputeLinkRttSecondsAction = {
  readonly kind: "use-rtt";
  readonly rtt: number;
};

export interface ComputeLinkRttSecondsStepResult {
  readonly state: ComputeLinkRttSecondsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeLinkRttSecondsAction[];
}

export function initialComputeLinkRttSecondsState(): ComputeLinkRttSecondsState {
  return {};
}

export function stepComputeLinkRttSecondsWithActions(
  state: ComputeLinkRttSecondsState,
  event: ComputeLinkRttSecondsEvent
): ComputeLinkRttSecondsStepResult {
  if (event.kind === "link/rtt-seconds-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-rtt",
          rtt: computeLinkRttSeconds(event.nowSeconds, event.requestTimeSeconds)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkRttSeconds(
  actions: ReadonlyArray<ComputeLinkRttSecondsAction>
): boolean {
  return actions.some((action) => action.kind === "use-rtt");
}

/** Extract RTT seconds from step actions; null when no `use-rtt`. */
export function linkRttSecondsFromActions(
  actions: ReadonlyArray<ComputeLinkRttSecondsAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-rtt");
  return action?.kind === "use-rtt" ? action.rtt : null;
}

/**
 * Link RTT merge is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `mergeLinkRtt` reads
 * beside the step).
 */
export type MergeLinkRttState = Record<string, never>;

export type MergeLinkRttEvent =
  | Event
  | {
      readonly kind: "link/merge-rtt-gate";
      readonly measuredSeconds: number;
      readonly remoteSeconds: number;
    };

export type MergeLinkRttAction = {
  readonly kind: "use-rtt";
  readonly rtt: number;
};

export interface MergeLinkRttStepResult {
  readonly state: MergeLinkRttState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MergeLinkRttAction[];
}

export function initialMergeLinkRttState(): MergeLinkRttState {
  return {};
}

export function stepMergeLinkRttWithActions(
  state: MergeLinkRttState,
  event: MergeLinkRttEvent
): MergeLinkRttStepResult {
  if (event.kind === "link/merge-rtt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-rtt",
          rtt: mergeLinkRtt(event.measuredSeconds, event.remoteSeconds)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseMergeLinkRtt(actions: ReadonlyArray<MergeLinkRttAction>): boolean {
  return actions.some((action) => action.kind === "use-rtt");
}

/** Extract merged RTT from step actions; null when no `use-rtt`. */
export function mergeLinkRttFromActions(
  actions: ReadonlyArray<MergeLinkRttAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-rtt");
  return action?.kind === "use-rtt" ? action.rtt : null;
}

export function applyLinkEstablishEvent(
  state: LinkEstablishState,
  event: LinkEstablishEvent
): LinkEstablishState {
  return stepLinkEstablishInner(state, event).state;
}

export const stepLinkEstablish: StepFn<LinkEstablishState> = (state, event) => {
  const result = stepLinkEstablishInner(state, event as LinkEstablishEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkEstablishWithActions(
  state: LinkEstablishState,
  event: LinkEstablishEvent
): LinkEstablishStepResult {
  return stepLinkEstablishInner(state, event);
}

/** Whether step actions include enter-handshake. */
export function shouldEnterLinkHandshake(
  actions: ReadonlyArray<LinkEstablishAction>
): boolean {
  return actions.some((action) => action.kind === "enter-handshake");
}

/** Whether step actions include activated. */
export function shouldActivateLinkEstablish(
  actions: ReadonlyArray<LinkEstablishAction>
): boolean {
  return actions.some((action) => action.kind === "activated");
}

/** Whether step actions include failed. */
export function shouldFailLinkEstablish(
  actions: ReadonlyArray<LinkEstablishAction>
): boolean {
  return actions.some((action) => action.kind === "failed");
}

/** Whether step actions include ignore (LRRTT gate). */
export function shouldIgnoreLinkEstablishRtt(
  actions: ReadonlyArray<LinkEstablishAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

/** Whether step actions include accept-rtt (proceed to unpack / activate). */
export function shouldAcceptLinkEstablishRtt(
  actions: ReadonlyArray<LinkEstablishAction>
): boolean {
  return actions.some((action) => action.kind === "accept-rtt");
}

/** Whether step actions include teardown (full link close after LRRTT failure). */
export function shouldTeardownLinkEstablish(
  actions: ReadonlyArray<LinkEstablishAction>
): boolean {
  return actions.some((action) => action.kind === "teardown");
}

/** Extract the activated action from an establish step, if any. */
export function linkEstablishActivatedAction(
  actions: ReadonlyArray<LinkEstablishAction>
): Extract<LinkEstablishAction, { kind: "activated" }> | null {
  for (const action of actions) {
    if (action.kind === "activated") {
      return action;
    }
  }
  return null;
}

function stepLinkEstablishInner(
  state: LinkEstablishState,
  event: LinkEstablishEvent
): LinkEstablishStepResult {
  if (event.kind === "establish/handshake") {
    if (!canLinkHandshake(state.status)) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: { ...state, status: LinkStatus.HANDSHAKE },
      intents: [],
      actions: [{ kind: "enter-handshake" }]
    };
  }

  if (event.kind === "establish/activated") {
    return {
      state: {
        ...state,
        status: LinkStatus.ACTIVE,
        rtt: event.rtt,
        activatedAt: event.atSeconds
      },
      intents: [],
      actions: [
        {
          kind: "activated",
          rtt: event.rtt,
          activatedAt: event.atSeconds,
          sendRtt: state.initiator,
          activateMembership: state.initiator
        }
      ]
    };
  }

  if (event.kind === "establish/failed") {
    return {
      state: {
        ...state,
        status: LinkStatus.CLOSED,
        rtt: null,
        activatedAt: null
      },
      intents: [],
      actions: [{ kind: "failed" }]
    };
  }

  if (event.kind === "establish/rtt") {
    const canAccept = shouldAcceptLinkRttNow(
      stepAcceptLinkRttWithActions(initialAcceptLinkRttState(), {
        kind: "link/accept-rtt-gate",
        status: state.status,
        initiator: state.initiator
      }).actions
    );
    const planActions = stepLinkRttOutcomePlanWithActions(initialLinkRttOutcomePlanState(), {
      kind: "rtt/outcome-plan-gate",
      canAccept,
      plaintextPresent: event.plaintextPresent
    }).actions;
    if (shouldIgnoreLinkRttOutcomePlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "ignore" }] };
    }
    if (
      shouldTeardownLinkFromRttNow(
        stepTeardownLinkFromRttWithActions(initialTeardownLinkFromRttState(), {
          kind: "link/teardown-from-rtt-gate",
          outcomeTeardown: shouldTeardownLinkRttOutcomePlan(planActions),
          plaintextPresent: event.plaintextPresent
        }).actions
      )
    ) {
      return { state, intents: [], actions: [{ kind: "teardown" }] };
    }
    if (!shouldActivateLinkRttOutcomePlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "accept-rtt" }] };
  }

  if (event.kind === "establish/rtt-failed") {
    return {
      state: {
        ...state,
        status: LinkStatus.CLOSED,
        rtt: null,
        activatedAt: null
      },
      intents: [],
      actions: [{ kind: "teardown" }]
    };
  }

  return { state, intents: [], actions: [] };
}
