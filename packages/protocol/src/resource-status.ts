/**
 * Pure resource transfer status transitions and gates.
 * Crypto, link send, and timers stay at the adapter edge.
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

export function isResourceTerminal(status: ResourceStatusValue): boolean {
  return status === ResourceStatus.COMPLETE || status === ResourceStatus.FAILED;
}

/** Gate for handleRequest / hashmapUpdate / assemble / requestNext early-out. */
export function canResourceContinueTransfer(status: ResourceStatusValue): boolean {
  return status !== ResourceStatus.FAILED;
}

export function canReceiveResourcePart(status: ResourceStatusValue): boolean {
  return status !== ResourceStatus.FAILED && status !== ResourceStatus.COMPLETE;
}

export function canValidateResourceProof(status: ResourceStatusValue): boolean {
  return status !== ResourceStatus.FAILED;
}

export function canRunResourceWatchdog(status: ResourceStatusValue): boolean {
  return !isResourceTerminal(status);
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
