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
  canSendLinkAppResponse,
  initialInvokeLinkAppRequestHandlerState,
  initialSendLinkAppRequestResponseState,
  initialSendLinkAppResponseAllowState,
  linkAppRequestDispatchPlanFromActions,
  planLinkAppRequestDispatch,
  planLinkAppRequestResponse,
  shouldAllowSendLinkAppResponse,
  shouldForbidLinkAppRequestDispatch,
  shouldIgnoreLinkAppRequestDispatch,
  shouldIgnoreLinkAppRequestResponsePlan,
  shouldInvokeLinkAppRequestDispatch,
  shouldInvokeLinkAppRequestHandler,
  shouldInvokeLinkAppRequestHandlerNow,
  shouldRejectLinkAppRequestResponseTooBigPlan,
  shouldSendLinkAppRequestResponse,
  shouldSendLinkAppRequestResponseNow,
  shouldSendLinkAppRequestResponsePlan,
  stepInvokeLinkAppRequestHandlerWithActions,
  stepSendLinkAppRequestResponseWithActions,
  stepSendLinkAppResponseAllowWithActions,
} from "./part-5.js";
import type {
  InvokeLinkAppRequestHandlerAction,
  LinkAppRequestDispatchAction,
  LinkAppRequestDispatchEvent,
  LinkAppRequestDispatchPlan,
  LinkAppRequestDispatchPlanAction,
  LinkAppRequestDispatchPlanEvent,
  LinkAppRequestInboundAction,
  LinkAppRequestInboundEvent,
  LinkAppRequestResponsePlan,
  LinkAppRequestResponsePlanAction,
  LinkAppRequestResponsePlanEvent,
  SendLinkAppRequestResponseAction,
} from "./part-5.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * App-request dispatch plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequestDispatch` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestDispatchWithActions}.
 */
export type LinkAppRequestDispatchPlanState = Record<string, never>;

export interface LinkAppRequestDispatchPlanStepResult {
  readonly state: LinkAppRequestDispatchPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestDispatchPlanAction[];
}

export function initialLinkAppRequestDispatchPlanState(): LinkAppRequestDispatchPlanState {
  return {};
}

export function stepLinkAppRequestDispatchPlanWithActions(
  state: LinkAppRequestDispatchPlanState,
  event: LinkAppRequestDispatchPlanEvent,
): LinkAppRequestDispatchPlanStepResult {
  if (event.kind === "link/app-request-dispatch-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkAppRequestDispatch({
            plaintextPresent: event.plaintextPresent,
            handlerDestinationPresent: event.handlerDestinationPresent,
            handlerPresent: event.handlerPresent,
            requestAllowed: event.requestAllowed,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIgnoreLinkAppRequestDispatchPlan(
  actions: ReadonlyArray<LinkAppRequestDispatchPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

export function shouldForbidLinkAppRequestDispatchPlan(
  actions: ReadonlyArray<LinkAppRequestDispatchPlanAction>,
): boolean {
  return hasActionOfKind(actions, "forbidden");
}

export function shouldInvokeLinkAppRequestDispatchPlan(
  actions: ReadonlyArray<LinkAppRequestDispatchPlanAction>,
): boolean {
  return hasActionOfKind(actions, "invoke-handler");
}

/**
 * App-request dispatch gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequestDispatch` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestInboundWithActions}.
 * Plan nested via {@link stepLinkAppRequestDispatchPlanWithActions}
 * (`ignore`|`forbidden`|`invoke-handler`).
 */
export type LinkAppRequestDispatchState = Record<string, never>;

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
  event: LinkAppRequestDispatchEvent,
): LinkAppRequestDispatchStepResult {
  if (event.kind === "link/app-request-dispatch-gate") {
    const planActions = stepLinkAppRequestDispatchPlanWithActions(
      initialLinkAppRequestDispatchPlanState(),
      {
        kind: "link/app-request-dispatch-plan-gate",
        plaintextPresent: event.plaintextPresent,
        handlerDestinationPresent: event.handlerDestinationPresent,
        handlerPresent: event.handlerPresent,
        requestAllowed: event.requestAllowed,
      },
    ).actions;
    const plan = linkAppRequestDispatchPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the dispatch plan from actions; null when empty. */
export function linkAppRequestDispatchFromActions(
  actions: ReadonlyArray<LinkAppRequestDispatchAction>,
): LinkAppRequestDispatchPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ignore" ||
      entry.kind === "forbidden" ||
      entry.kind === "invoke-handler",
  );
  return action?.kind ?? null;
}

export function shouldSkipInvokeLinkAppRequestHandler(
  actions: ReadonlyArray<InvokeLinkAppRequestHandlerAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export function shouldSkipSendLinkAppRequestResponse(
  actions: ReadonlyArray<SendLinkAppRequestResponseAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * App-request response plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequestResponse` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestInboundWithActions}.
 */
export type LinkAppRequestResponsePlanState = Record<string, never>;

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
  event: LinkAppRequestResponsePlanEvent,
): LinkAppRequestResponsePlanStepResult {
  if (event.kind === "link/app-request-response-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkAppRequestResponse({
            responsePresent: event.responsePresent,
            responseFitsMdu: event.responseFitsMdu,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the response plan from actions; null when empty. */
export function linkAppRequestResponsePlanFromActions(
  actions: ReadonlyArray<LinkAppRequestResponsePlanAction>,
): LinkAppRequestResponsePlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ignore" ||
      entry.kind === "response-too-big" ||
      entry.kind === "send-response",
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
 * {@link stepLinkAppRequestDispatchWithActions} (plan nested via
 * {@link stepLinkAppRequestDispatchPlanWithActions}:
 * ignore|forbidden|invoke-handler); response plan nested via
 * {@link stepLinkAppRequestResponsePlanWithActions}.
 */
export interface LinkAppRequestInboundState {
  readonly waitingHandler: boolean;
  readonly mdu: number;
}

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
    mdu: input.mdu,
  };
}

export const stepLinkAppRequestInbound: StepFn<LinkAppRequestInboundState> = (
  state,
  event,
) => {
  const result = stepLinkAppRequestInboundInner(
    state,
    event as LinkAppRequestInboundEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkAppRequestInboundWithActions(
  state: LinkAppRequestInboundState,
  event: LinkAppRequestInboundEvent,
): LinkAppRequestInboundStepResult {
  return stepLinkAppRequestInboundInner(state, event);
}

/** Whether step actions include ignore. */
export function shouldIgnoreLinkAppRequestInbound(
  actions: ReadonlyArray<LinkAppRequestInboundAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

/** Whether step actions include forbidden. */
export function shouldForbidLinkAppRequestInbound(
  actions: ReadonlyArray<LinkAppRequestInboundAction>,
): boolean {
  return hasActionOfKind(actions, "forbidden");
}

/** Whether step actions include invoke-handler. */
export function shouldInvokeLinkAppRequestInbound(
  actions: ReadonlyArray<LinkAppRequestInboundAction>,
): boolean {
  return hasActionOfKind(actions, "invoke-handler");
}

/** Whether step actions include send-response. */
export function shouldSendLinkAppRequestInboundResponse(
  actions: ReadonlyArray<LinkAppRequestInboundAction>,
): boolean {
  return hasActionOfKind(actions, "send-response");
}

/** Whether step actions include ignore-response. */
export function shouldIgnoreLinkAppRequestInboundResponse(
  actions: ReadonlyArray<LinkAppRequestInboundAction>,
): boolean {
  return hasActionOfKind(actions, "ignore-response");
}

/** Whether step actions include response-too-big. */
export function shouldRejectLinkAppRequestInboundTooBig(
  actions: ReadonlyArray<LinkAppRequestInboundAction>,
): boolean {
  return hasActionOfKind(actions, "response-too-big");
}

function stepLinkAppRequestInboundInner(
  state: LinkAppRequestInboundState,
  event: LinkAppRequestInboundEvent,
): LinkAppRequestInboundStepResult {
  if (event.kind === "app-request/received") {
    const requestAllowed = shouldAllowDestinationRequest(
      stepDestinationRequestAllowWithActions(
        initialDestinationRequestAllowState(),
        {
          kind: "destination/request-allow-gate",
          allow: event.allow,
          allowedList: event.allowedList,
          remoteIdentityHash: event.remoteIdentityHash,
        },
      ).actions,
    );
    const dispatchActions = stepLinkAppRequestDispatchWithActions(
      initialLinkAppRequestDispatchState(),
      {
        kind: "link/app-request-dispatch-gate",
        plaintextPresent: event.plaintextPresent,
        handlerDestinationPresent: event.handlerDestinationPresent,
        handlerPresent: event.handlerPresent,
        requestAllowed,
      },
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
        handlerPresent: event.handlerPresent,
      },
    );
    if (!shouldInvokeLinkAppRequestHandlerNow(invokeStepped.actions)) {
      return { state, intents: [], actions: [{ kind: "ignore" }] };
    }
    return {
      state: { ...state, waitingHandler: true },
      intents: [],
      actions: [{ kind: "invoke-handler" }],
    };
  }

  if (event.kind === "app-request/handler-result") {
    if (!state.waitingHandler) {
      return { state, intents: [], actions: [] };
    }
    const responseFitsMdu = shouldAllowSendLinkAppResponse(
      stepSendLinkAppResponseAllowWithActions(
        initialSendLinkAppResponseAllowState(),
        {
          kind: "link/send-app-response-allow-gate",
          packedLength: event.packedLength,
          mdu: state.mdu,
        },
      ).actions,
    );
    const responsePlanActions = stepLinkAppRequestResponsePlanWithActions(
      initialLinkAppRequestResponsePlanState(),
      {
        kind: "link/app-request-response-plan-gate",
        responsePresent: event.responsePresent,
        responseFitsMdu,
      },
    ).actions;
    const next = { ...state, waitingHandler: false };
    if (shouldIgnoreLinkAppRequestResponsePlan(responsePlanActions)) {
      return {
        state: next,
        intents: [],
        actions: [{ kind: "ignore-response" }],
      };
    }
    if (shouldRejectLinkAppRequestResponseTooBigPlan(responsePlanActions)) {
      return {
        state: next,
        intents: [],
        actions: [{ kind: "response-too-big" }],
      };
    }
    const sendStepped = stepSendLinkAppRequestResponseWithActions(
      initialSendLinkAppRequestResponseState(),
      {
        kind: "link/send-app-request-response-gate",
        planSend: shouldSendLinkAppRequestResponsePlan(responsePlanActions),
        packedPresent: event.responsePresent,
      },
    );
    if (!shouldSendLinkAppRequestResponseNow(sendStepped.actions)) {
      return {
        state: next,
        intents: [],
        actions: [{ kind: "ignore-response" }],
      };
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
  { readonly kind: "update" } | { readonly kind: "skip" };

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
  event: UpdateLinkLastDataEvent,
): UpdateLinkLastDataStepResult {
  if (event.kind === "link/update-last-data-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldUpdateLinkLastData(event.contextKeepalive)
            ? "update"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUpdateLinkLastDataNow(
  actions: ReadonlyArray<UpdateLinkLastDataAction>,
): boolean {
  return hasActionOfKind(actions, "update");
}

export function shouldSkipLinkLastDataUpdate(
  actions: ReadonlyArray<UpdateLinkLastDataAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
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
