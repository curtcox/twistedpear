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
import { canLinkRequest, canUpdateLinkKeepalive } from "./part-3.js";
import type { UpdateLinkKeepaliveAllowAction, UpdateLinkKeepaliveAllowEvent, UpdateLinkKeepaliveAllowState, UpdateLinkKeepaliveAllowStepResult } from "./part-3.js";
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

export function stepLinkAppRequestWithActions(
  state: LinkAppRequestState,
  event: LinkAppRequestEvent
): LinkAppRequestStepResult {
  return stepLinkAppRequestInner(state, event);
}

export function stepLinkAppRequestInner(
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
