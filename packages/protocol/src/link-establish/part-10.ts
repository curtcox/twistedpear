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
import { canLinkHandshake } from "./part-1.js";
import { initialAcceptLinkRttState, shouldAcceptLinkRttNow, stepAcceptLinkRttWithActions } from "./part-3.js";
import { initialTeardownLinkFromRttState, planLinkRttOutcome, shouldActivateLinkRttOutcomePlan, shouldIgnoreLinkRttOutcomePlan, shouldTeardownLinkFromRtt, shouldTeardownLinkRttOutcomePlan } from "./part-9.js";
import type { LinkEstablishEvent, LinkEstablishState, LinkEstablishStepResult } from "./part-1.js";
import type { LinkAppRequestTransmitOutcomePlanAction, LinkRttOutcome, LinkRttOutcomePlanAction, LinkRttOutcomePlanEvent, TeardownLinkFromRttState } from "./part-9.js";
/**
 * LRRTT outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRttOutcome` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkEstablishWithActions} (`establish/rtt`).
 */
export type LinkRttOutcomePlanState = Record<string, never>;

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

export function stepLinkEstablishWithActions(
  state: LinkEstablishState,
  event: LinkEstablishEvent
): LinkEstablishStepResult {
  return stepLinkEstablishInner(state, event);
}

export function stepLinkEstablishInner(
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
