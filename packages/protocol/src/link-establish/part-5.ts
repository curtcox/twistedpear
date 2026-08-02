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

export type LinkAppRequestDispatchPlanEvent =
  | Event
  | {
      readonly kind: "link/app-request-dispatch-plan-gate";
      readonly plaintextPresent: boolean;
      readonly handlerDestinationPresent: boolean;
      readonly handlerPresent: boolean;
      readonly requestAllowed: boolean;
    };

export type LinkAppRequestDispatchPlanAction =
  | { readonly kind: "ignore" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "invoke-handler" };

/** Extract the dispatch plan from actions; null when empty. */
export function linkAppRequestDispatchPlanFromActions(
  actions: ReadonlyArray<LinkAppRequestDispatchPlanAction>
): LinkAppRequestDispatchPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ignore" ||
      entry.kind === "forbidden" ||
      entry.kind === "invoke-handler"
  );
  return action?.kind ?? null;
}

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
