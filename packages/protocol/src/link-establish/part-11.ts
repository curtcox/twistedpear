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
import { mergeLinkRtt, stepLinkEstablishInner } from "./part-10.js";
import type { LinkEstablishAction, LinkEstablishEvent, LinkEstablishState } from "./part-1.js";
import type { MergeLinkRttAction, MergeLinkRttEvent, MergeLinkRttState } from "./part-10.js";
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
