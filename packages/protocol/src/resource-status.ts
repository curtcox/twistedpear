/**
 * Pure resource transfer status transitions and gates.
 * Crypto, link send, and timers stay at the adapter edge.
 * Continue-transfer / receive-part / request-next / watchdog /
 * prove / advertise / incoming-adv / assemble / proof-accept
 * conclusions leave via machine actions (no ad-hoc plan /
 * `can*` / `should*` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { ResourceStatus, type ResourceStatusValue } from "./resource-watchdog.js";

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
  status: ResourceStatusValue = ResourceStatus.NONE
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
  | { readonly kind: "complete" }
  | { readonly kind: "incomplete" };

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
  event: ResourceCompleteEvent
): ResourceCompleteStepResult {
  if (event.kind === "resource/complete-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isResourceComplete(event.status) ? "complete" : "incomplete"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatResourceComplete(
  actions: ReadonlyArray<ResourceCompleteAction>
): boolean {
  return actions.some((action) => action.kind === "complete");
}

export function shouldTreatResourceIncomplete(
  actions: ReadonlyArray<ResourceCompleteAction>
): boolean {
  return actions.some((action) => action.kind === "incomplete");
}

export function isResourceTerminal(status: ResourceStatusValue): boolean {
  return status === ResourceStatus.COMPLETE || status === ResourceStatus.FAILED;
}

/** Gate for handleRequest / hashmapUpdate / assemble / requestNext early-out. */
export function canResourceContinueTransfer(status: ResourceStatusValue): boolean {
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
  | { readonly kind: "continue" }
  | { readonly kind: "stop" };

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
  event: ResourceContinueTransferEvent
): ResourceContinueTransferStepResult {
  if (event.kind === "resource/continue-transfer-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canResourceContinueTransfer(event.status) ? "continue" : "stop"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldContinueResourceTransfer(
  actions: ReadonlyArray<ResourceContinueTransferAction>
): boolean {
  return actions.some((action) => action.kind === "continue");
}

export function shouldStopResourceTransfer(
  actions: ReadonlyArray<ResourceContinueTransferAction>
): boolean {
  return actions.some((action) => action.kind === "stop");
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: ResourceReceivePartAllowEvent
): ResourceReceivePartAllowStepResult {
  if (event.kind === "resource/receive-part-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canReceiveResourcePart(event.status) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowResourceReceivePart(
  actions: ReadonlyArray<ResourceReceivePartAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyResourceReceivePart(
  actions: ReadonlyArray<ResourceReceivePartAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: ResourceWatchdogAllowEvent
): ResourceWatchdogAllowStepResult {
  if (event.kind === "resource/watchdog-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRunResourceWatchdog(event.status) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowResourceWatchdog(
  actions: ReadonlyArray<ResourceWatchdogAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyResourceWatchdog(
  actions: ReadonlyArray<ResourceWatchdogAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: ResourceRequestNextAllowEvent
): ResourceRequestNextAllowStepResult {
  if (event.kind === "resource/request-next-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRequestResourceNext({
            status: event.status,
            waitingForHashmap: event.waitingForHashmap
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowResourceRequestNext(
  actions: ReadonlyArray<ResourceRequestNextAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyResourceRequestNext(
  actions: ReadonlyArray<ResourceRequestNextAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether an incoming ADV should create a new resource (not already incoming). */
export function shouldAcceptIncomingResourceAdvertisement(alreadyIncoming: boolean): boolean {
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
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

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
  event: AcceptIncomingResourceAdvertisementEvent
): AcceptIncomingResourceAdvertisementStepResult {
  if (event.kind === "resource/accept-incoming-adv-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptIncomingResourceAdvertisement(event.alreadyIncoming)
            ? "accept"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptIncomingResourceAdvertisementNow(
  actions: ReadonlyArray<AcceptIncomingResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipIncomingResourceAdvertisement(
  actions: ReadonlyArray<AcceptIncomingResourceAdvertisementAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Map link readiness to the next advertise-phase status event. */
export function planResourceAdvertisePhase(linkReady: boolean): "queue" | "advertise" {
  return linkReady ? "advertise" : "queue";
}

/** Whether Resource.prove may build and send a proof (assembled data present). */
export function canProveResource(dataPresent: boolean): boolean {
  return dataPresent;
}

/**
 * Resource prove-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canProveResource` reads
 * beside the step).
 */
export type ProveResourceAllowState = Record<string, never>;

export type ProveResourceAllowEvent =
  | Event
  | {
      readonly kind: "resource/prove-allow-gate";
      readonly dataPresent: boolean;
    };

export type ProveResourceAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface ProveResourceAllowStepResult {
  readonly state: ProveResourceAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ProveResourceAllowAction[];
}

export function initialProveResourceAllowState(): ProveResourceAllowState {
  return {};
}

export function stepProveResourceAllowWithActions(
  state: ProveResourceAllowState,
  event: ProveResourceAllowEvent
): ProveResourceAllowStepResult {
  if (event.kind === "resource/prove-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canProveResource(event.dataPresent) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowProveResource(
  actions: ReadonlyArray<ProveResourceAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyProveResource(
  actions: ReadonlyArray<ProveResourceAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/**
 * Whether Resource.send should auto-advertise after construction.
 * Default true when the option is omitted (`advertise !== false`).
 */
export function shouldAdvertiseResource(advertiseOption: boolean | undefined): boolean {
  return advertiseOption !== false;
}

/**
 * Resource advertise-option gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAdvertiseResource`
 * reads beside the step).
 */
export type AdvertiseResourceState = Record<string, never>;

export type AdvertiseResourceEvent =
  | Event
  | {
      readonly kind: "resource/advertise-option-gate";
      readonly advertiseOption: boolean | undefined;
    };

export type AdvertiseResourceAction =
  | { readonly kind: "advertise" }
  | { readonly kind: "skip" };

export interface AdvertiseResourceStepResult {
  readonly state: AdvertiseResourceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AdvertiseResourceAction[];
}

export function initialAdvertiseResourceState(): AdvertiseResourceState {
  return {};
}

export function stepAdvertiseResourceWithActions(
  state: AdvertiseResourceState,
  event: AdvertiseResourceEvent
): AdvertiseResourceStepResult {
  if (event.kind === "resource/advertise-option-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAdvertiseResource(event.advertiseOption) ? "advertise" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAdvertiseResourceNow(
  actions: ReadonlyArray<AdvertiseResourceAction>
): boolean {
  return actions.some((action) => action.kind === "advertise");
}

export function shouldSkipAdvertiseResource(
  actions: ReadonlyArray<AdvertiseResourceAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Assemble validation outcome from crypto-edge booleans
 * (decrypt / payload split / hash match).
 */
export type ResourceAssembleOutcome = "complete" | "corrupt";

export function planResourceAssembleOutcome(input: {
  readonly decryptedPresent: boolean;
  readonly payloadPresent: boolean;
  readonly hashMatches: boolean;
}): ResourceAssembleOutcome {
  if (!input.decryptedPresent || !input.payloadPresent || !input.hashMatches) {
    return "corrupt";
  }
  return "complete";
}

/**
 * Resource assemble gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceAssembleState = Record<string, never>;

export type ResourceAssembleEvent =
  | Event
  | {
      readonly kind: "resource/assemble-gate";
      readonly decryptedPresent: boolean;
      readonly payloadPresent: boolean;
      readonly hashMatches: boolean;
    };

export type ResourceAssembleAction = { readonly kind: ResourceAssembleOutcome };

export interface ResourceAssembleStepResult {
  readonly state: ResourceAssembleState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAssembleAction[];
}

export function initialResourceAssembleState(): ResourceAssembleState {
  return {};
}

export const stepResourceAssemble: StepFn<ResourceAssembleState> = (state, event) => {
  const result = stepResourceAssembleInner(state, event as ResourceAssembleEvent);
  return { state: result.state, intents: result.intents };
};

export function stepResourceAssembleWithActions(
  state: ResourceAssembleState,
  event: ResourceAssembleEvent
): ResourceAssembleStepResult {
  return stepResourceAssembleInner(state, event);
}

export function shouldCompleteResourceAssemble(
  actions: ReadonlyArray<ResourceAssembleAction>
): boolean {
  return actions.some((action) => action.kind === "complete");
}

export function shouldCorruptResourceAssemble(
  actions: ReadonlyArray<ResourceAssembleAction>
): boolean {
  return actions.some((action) => action.kind === "corrupt");
}

function stepResourceAssembleInner(
  state: ResourceAssembleState,
  event: ResourceAssembleEvent
): ResourceAssembleStepResult {
  if (event.kind === "resource/assemble-gate") {
    const plan = planResourceAssembleOutcome({
      decryptedPresent: event.decryptedPresent,
      payloadPresent: event.payloadPresent,
      hashMatches: event.hashMatches
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Whether assemble may commit payload after {@link planResourceAssembleOutcome}
 * returns complete and split payload bytes remain present.
 */
export function shouldCommitResourceAssemblePayload(input: {
  readonly outcomeComplete: boolean;
  readonly payloadPresent: boolean;
}): boolean {
  return input.outcomeComplete && input.payloadPresent;
}

/**
 * Resource assemble payload-commit gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldCommitResourceAssemblePayload` reads beside the step).
 */
export type CommitResourceAssemblePayloadState = Record<string, never>;

export type CommitResourceAssemblePayloadEvent =
  | Event
  | {
      readonly kind: "resource/commit-assemble-payload-gate";
      readonly outcomeComplete: boolean;
      readonly payloadPresent: boolean;
    };

export type CommitResourceAssemblePayloadAction =
  | { readonly kind: "commit" }
  | { readonly kind: "skip" };

export interface CommitResourceAssemblePayloadStepResult {
  readonly state: CommitResourceAssemblePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitResourceAssemblePayloadAction[];
}

export function initialCommitResourceAssemblePayloadState(): CommitResourceAssemblePayloadState {
  return {};
}

export function stepCommitResourceAssemblePayloadWithActions(
  state: CommitResourceAssemblePayloadState,
  event: CommitResourceAssemblePayloadEvent
): CommitResourceAssemblePayloadStepResult {
  if (event.kind === "resource/commit-assemble-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCommitResourceAssemblePayload({
            outcomeComplete: event.outcomeComplete,
            payloadPresent: event.payloadPresent
          })
            ? "commit"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCommitResourceAssemblePayloadNow(
  actions: ReadonlyArray<CommitResourceAssemblePayloadAction>
): boolean {
  return actions.some((action) => action.kind === "commit");
}

export function shouldSkipCommitResourceAssemblePayload(
  actions: ReadonlyArray<CommitResourceAssemblePayloadAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Sender proof validation → complete vs ignore. */
export type ResourceProofAcceptPlan = "complete" | "ignore";

export function planResourceProofAccept(input: {
  readonly status: ResourceStatusValue;
  readonly proofValid: boolean;
}): ResourceProofAcceptPlan {
  if (!canValidateResourceProof(input.status) || !input.proofValid) {
    return "ignore";
  }
  return "complete";
}

/**
 * Resource proof-accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceProofAcceptState = Record<string, never>;

export type ResourceProofAcceptEvent =
  | Event
  | {
      readonly kind: "resource/proof-accept-gate";
      readonly status: ResourceStatusValue;
      readonly proofValid: boolean;
    };

export type ResourceProofAcceptAction = { readonly kind: ResourceProofAcceptPlan };

export interface ResourceProofAcceptStepResult {
  readonly state: ResourceProofAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceProofAcceptAction[];
}

export function initialResourceProofAcceptState(): ResourceProofAcceptState {
  return {};
}

export const stepResourceProofAccept: StepFn<ResourceProofAcceptState> = (state, event) => {
  const result = stepResourceProofAcceptInner(state, event as ResourceProofAcceptEvent);
  return { state: result.state, intents: result.intents };
};

export function stepResourceProofAcceptWithActions(
  state: ResourceProofAcceptState,
  event: ResourceProofAcceptEvent
): ResourceProofAcceptStepResult {
  return stepResourceProofAcceptInner(state, event);
}

export function shouldCompleteResourceProofAccept(
  actions: ReadonlyArray<ResourceProofAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "complete");
}

export function shouldIgnoreResourceProofAccept(
  actions: ReadonlyArray<ResourceProofAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepResourceProofAcceptInner(
  state: ResourceProofAcceptState,
  event: ResourceProofAcceptEvent
): ResourceProofAcceptStepResult {
  if (event.kind === "resource/proof-accept-gate") {
    const plan = planResourceProofAccept({
      status: event.status,
      proofValid: event.proofValid
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function applyResourceStatusEvent(
  state: ResourceStatusState,
  event: ResourceStatusEvent
): ResourceStatusState {
  return stepResourceStatusInner(state, event).state;
}

export const stepResourceStatus: StepFn<ResourceStatusState> = (state, event) =>
  stepResourceStatusInner(state, event as ResourceStatusEvent);

function stepResourceStatusInner(
  state: ResourceStatusState,
  event: ResourceStatusEvent
): { state: ResourceStatusState; intents: Intent[] } {
  if (event.kind === "resource/queue") {
    return { state: { status: ResourceStatus.QUEUED }, intents: [] };
  }
  if (event.kind === "resource/advertise") {
    return { state: { status: ResourceStatus.ADVERTISED }, intents: [] };
  }
  if (event.kind === "resource/transferring") {
    return { state: { status: ResourceStatus.TRANSFERRING }, intents: [] };
  }
  if (event.kind === "resource/awaiting-proof") {
    return { state: { status: ResourceStatus.AWAITING_PROOF }, intents: [] };
  }
  if (event.kind === "resource/assemble") {
    return { state: { status: ResourceStatus.ASSEMBLING }, intents: [] };
  }
  if (event.kind === "resource/complete") {
    return { state: { status: ResourceStatus.COMPLETE }, intents: [] };
  }
  if (event.kind === "resource/corrupt") {
    return { state: { status: ResourceStatus.CORRUPT }, intents: [] };
  }
  if (event.kind === "resource/fail") {
    return { state: { status: ResourceStatus.FAILED }, intents: [] };
  }
  return { state, intents: [] };
}
