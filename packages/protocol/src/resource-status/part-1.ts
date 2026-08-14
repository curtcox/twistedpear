/** Extracted from resource-status.ts; the original module remains the public composition point. */
/**
 * Pure resource transfer status transitions and gates.
 * Crypto, link send, and timers stay at the adapter edge.
 * Continue-transfer / receive-part / request-next / watchdog /
 * prove / advertise / incoming-adv / assemble / proof-accept
 * conclusions leave via machine actions (no ad-hoc plan /
 * `can*` / `should*` / `plan ===` reads beside the step).
 * Assemble, proof-accept, and advertise-phase plans nested via
 * {@link stepResourceAssembleOutcomePlanWithActions} /
 * {@link stepResourceProofAcceptPlanWithActions} /
 * {@link stepResourceAdvertisePhasePlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  ResourceStatus,
  type ResourceStatusValue,
} from "../resource-watchdog.js";
import { hasActionOfKind } from "../action-kind.js";

export interface ResourceStatusState {
  readonly status: ResourceStatusValue;
}

export type ResourceStatusEvent =
  | Event
  | { readonly kind: "resource/queue" }
  | { readonly kind: "resource/advertise" }
  | { readonly kind: "resource/transferring" }
  | { readonly kind: "resource/awaiting-proof" }
  | { readonly kind: "resource/assemble" }
  | { readonly kind: "resource/complete" }
  | { readonly kind: "resource/corrupt" }
  | { readonly kind: "resource/fail" };

export function initialResourceStatusState(
  status: ResourceStatusValue = ResourceStatus.NONE,
): ResourceStatusState {
  return { status };
}

export function isResourceFailed(status: ResourceStatusValue): boolean {
  return status === ResourceStatus.FAILED;
}

export function isResourceComplete(status: ResourceStatusValue): boolean {
  return status === ResourceStatus.COMPLETE;
}

/**
 * Resource complete gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isResourceComplete`
 * reads beside the step).
 */
export type ResourceCompleteState = Record<string, never>;

export type ResourceCompleteEvent =
  | Event
  | {
      readonly kind: "resource/complete-gate";
      readonly status: ResourceStatusValue;
    };

export type ResourceCompleteAction =
  { readonly kind: "complete" } | { readonly kind: "incomplete" };

export interface ResourceCompleteStepResult {
  readonly state: ResourceCompleteState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceCompleteAction[];
}

export function initialResourceCompleteState(): ResourceCompleteState {
  return {};
}

export function stepResourceCompleteWithActions(
  state: ResourceCompleteState,
  event: ResourceCompleteEvent,
): ResourceCompleteStepResult {
  if (event.kind === "resource/complete-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isResourceComplete(event.status) ? "complete" : "incomplete",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatResourceComplete(
  actions: ReadonlyArray<ResourceCompleteAction>,
): boolean {
  return hasActionOfKind(actions, "complete");
}

export function shouldTreatResourceIncomplete(
  actions: ReadonlyArray<ResourceCompleteAction>,
): boolean {
  return hasActionOfKind(actions, "incomplete");
}

export function isResourceTerminal(status: ResourceStatusValue): boolean {
  return status === ResourceStatus.COMPLETE || status === ResourceStatus.FAILED;
}

/** Gate for handleRequest / hashmapUpdate / assemble / requestNext early-out. */
export function canResourceContinueTransfer(
  status: ResourceStatusValue,
): boolean {
  return status !== ResourceStatus.FAILED;
}

/**
 * Resource continue-transfer gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canResourceContinueTransfer`
 * reads beside the step).
 */
export type ResourceContinueTransferState = Record<string, never>;

export type ResourceContinueTransferEvent =
  | Event
  | {
      readonly kind: "resource/continue-transfer-gate";
      readonly status: ResourceStatusValue;
    };

export type ResourceContinueTransferAction =
  { readonly kind: "continue" } | { readonly kind: "stop" };

export interface ResourceContinueTransferStepResult {
  readonly state: ResourceContinueTransferState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceContinueTransferAction[];
}

export function initialResourceContinueTransferState(): ResourceContinueTransferState {
  return {};
}

export function stepResourceContinueTransferWithActions(
  state: ResourceContinueTransferState,
  event: ResourceContinueTransferEvent,
): ResourceContinueTransferStepResult {
  if (event.kind === "resource/continue-transfer-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canResourceContinueTransfer(event.status) ? "continue" : "stop",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldContinueResourceTransfer(
  actions: ReadonlyArray<ResourceContinueTransferAction>,
): boolean {
  return hasActionOfKind(actions, "continue");
}

export function shouldStopResourceTransfer(
  actions: ReadonlyArray<ResourceContinueTransferAction>,
): boolean {
  return hasActionOfKind(actions, "stop");
}

export function canReceiveResourcePart(status: ResourceStatusValue): boolean {
  return status !== ResourceStatus.FAILED && status !== ResourceStatus.COMPLETE;
}

/**
 * Resource receive-part allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canReceiveResourcePart`
 * reads beside the step).
 */
export type ResourceReceivePartAllowState = Record<string, never>;

export type ResourceReceivePartAllowEvent =
  | Event
  | {
      readonly kind: "resource/receive-part-allow-gate";
      readonly status: ResourceStatusValue;
    };

export type ResourceReceivePartAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface ResourceReceivePartAllowStepResult {
  readonly state: ResourceReceivePartAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceReceivePartAllowAction[];
}

export function initialResourceReceivePartAllowState(): ResourceReceivePartAllowState {
  return {};
}

export function stepResourceReceivePartAllowWithActions(
  state: ResourceReceivePartAllowState,
  event: ResourceReceivePartAllowEvent,
): ResourceReceivePartAllowStepResult {
  if (event.kind === "resource/receive-part-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canReceiveResourcePart(event.status) ? "allow" : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowResourceReceivePart(
  actions: ReadonlyArray<ResourceReceivePartAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyResourceReceivePart(
  actions: ReadonlyArray<ResourceReceivePartAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

export function canValidateResourceProof(status: ResourceStatusValue): boolean {
  return status !== ResourceStatus.FAILED;
}

export function canRunResourceWatchdog(status: ResourceStatusValue): boolean {
  return !isResourceTerminal(status);
}

/**
 * Resource watchdog-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRunResourceWatchdog`
 * reads beside the step).
 */
export type ResourceWatchdogAllowState = Record<string, never>;

export type ResourceWatchdogAllowEvent =
  | Event
  | {
      readonly kind: "resource/watchdog-allow-gate";
      readonly status: ResourceStatusValue;
    };

export type ResourceWatchdogAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface ResourceWatchdogAllowStepResult {
  readonly state: ResourceWatchdogAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceWatchdogAllowAction[];
}

export function initialResourceWatchdogAllowState(): ResourceWatchdogAllowState {
  return {};
}

export function stepResourceWatchdogAllowWithActions(
  state: ResourceWatchdogAllowState,
  event: ResourceWatchdogAllowEvent,
): ResourceWatchdogAllowStepResult {
  if (event.kind === "resource/watchdog-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRunResourceWatchdog(event.status) ? "allow" : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowResourceWatchdog(
  actions: ReadonlyArray<ResourceWatchdogAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyResourceWatchdog(
  actions: ReadonlyArray<ResourceWatchdogAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

/** Gate for requestNext early-out (failed status or waiting for hashmap). */
export function canRequestResourceNext(input: {
  readonly status: ResourceStatusValue;
  readonly waitingForHashmap: boolean;
}): boolean {
  return canResourceContinueTransfer(input.status) && !input.waitingForHashmap;
}

/**
 * Resource request-next allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRequestResourceNext`
 * reads beside the step).
 */
export type ResourceRequestNextAllowState = Record<string, never>;

export type ResourceRequestNextAllowEvent =
  | Event
  | {
      readonly kind: "resource/request-next-allow-gate";
      readonly status: ResourceStatusValue;
      readonly waitingForHashmap: boolean;
    };

export type ResourceRequestNextAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface ResourceRequestNextAllowStepResult {
  readonly state: ResourceRequestNextAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceRequestNextAllowAction[];
}

export function initialResourceRequestNextAllowState(): ResourceRequestNextAllowState {
  return {};
}

export function stepResourceRequestNextAllowWithActions(
  state: ResourceRequestNextAllowState,
  event: ResourceRequestNextAllowEvent,
): ResourceRequestNextAllowStepResult {
  if (event.kind === "resource/request-next-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRequestResourceNext({
            status: event.status,
            waitingForHashmap: event.waitingForHashmap,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowResourceRequestNext(
  actions: ReadonlyArray<ResourceRequestNextAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyResourceRequestNext(
  actions: ReadonlyArray<ResourceRequestNextAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

/** Whether an incoming ADV should create a new resource (not already incoming). */
export function shouldAcceptIncomingResourceAdvertisement(
  alreadyIncoming: boolean,
): boolean {
  return !alreadyIncoming;
}

/**
 * Incoming resource ADV accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptIncomingResourceAdvertisement` reads beside the step).
 */
export type AcceptIncomingResourceAdvertisementState = Record<string, never>;

export type AcceptIncomingResourceAdvertisementEvent =
  | Event
  | {
      readonly kind: "resource/accept-incoming-adv-gate";
      readonly alreadyIncoming: boolean;
    };

export type AcceptIncomingResourceAdvertisementAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptIncomingResourceAdvertisementStepResult {
  readonly state: AcceptIncomingResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptIncomingResourceAdvertisementAction[];
}

export function initialAcceptIncomingResourceAdvertisementState(): AcceptIncomingResourceAdvertisementState {
  return {};
}

export function stepAcceptIncomingResourceAdvertisementWithActions(
  state: AcceptIncomingResourceAdvertisementState,
  event: AcceptIncomingResourceAdvertisementEvent,
): AcceptIncomingResourceAdvertisementStepResult {
  if (event.kind === "resource/accept-incoming-adv-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptIncomingResourceAdvertisement(event.alreadyIncoming)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptIncomingResourceAdvertisementNow(
  actions: ReadonlyArray<AcceptIncomingResourceAdvertisementAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipIncomingResourceAdvertisement(
  actions: ReadonlyArray<AcceptIncomingResourceAdvertisementAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Map link readiness to the next advertise-phase status event. */
export function planResourceAdvertisePhase(
  linkReady: boolean,
): "queue" | "advertise" {
  return linkReady ? "advertise" : "queue";
}

export type ResourceAdvertisePhasePlan = "queue" | "advertise";
