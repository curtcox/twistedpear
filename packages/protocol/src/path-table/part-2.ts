/** Extracted from path-table.ts; the original module remains the public composition point. */
/**
 * Pure path-table / pathfinder decisions for announce ingress and path requests.
 * No IO — time and bytes arrive only as event/parameters.
 * Path-request ingress / discovery fulfill / outbound / entry-lookup conclusions
 * leave via machine actions (no ad-hoc plan reads beside the step). Plans nested via
 * {@link stepPathRequestIngressPlanWithActions} /
 * {@link stepPathOutboundPlanWithActions} /
 * {@link stepDiscoveryPathRequestFulfillPlanWithActions} /
 * {@link stepPathEntryLookupPlanWithActions}.
 * Path random-blob append / expiry conclusions leave via machine actions (no
 * ad-hoc `appendPathRandomBlob` / `computePathExpiry` reads beside the step).
 * Path-request emit / discovery-expired / begin-discovery / path-entry expired /
 * add-entry conclusions leave via machine actions (no ad-hoc
 * `shouldEmitPathRequest` / `isDiscoveryPathRequestExpired` /
 * `shouldBeginPathDiscovery` / `isPathEntryExpired` / `shouldAddPathEntry`
 * reads beside the step). Answer-local / remember-tag / clear-expired-discovery /
 * use-path-for-outbound / answer-path-with-entry / touch-path-entry conclusions
 * leave via machine actions (no ad-hoc `canAnswerLocalPathRequest` /
 * `shouldRememberPathRequestTag` / `shouldClearExpiredDiscoveryPathRequest` /
 * `shouldUsePathForOutbound` / `shouldAnswerPathWithEntry` /
 * `shouldTouchPathEntry` / `shouldAnswerPathRequest` /
 * `shouldFulfillDiscoveryPending` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { TRUNCATED_HASH_BYTES } from "../hash-truncate.js";
import {
  PACKET_DEST_TYPE_GROUP,
  PACKET_DEST_TYPE_PLAIN,
  PACKET_HEADER_1,
  PACKET_TYPE_ANNOUNCE
} from "../packet-header.js";
import { canAnswerLocalPathRequest } from "./part-1.js";
import type { AnswerLocalPathRequestEvent, AnswerLocalPathRequestState } from "./part-1.js";
export type AnswerLocalPathRequestAction =
  | { readonly kind: "answer" }
  | { readonly kind: "skip" };

export interface AnswerLocalPathRequestStepResult {
  readonly state: AnswerLocalPathRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnswerLocalPathRequestAction[];
}

export function initialAnswerLocalPathRequestState(): AnswerLocalPathRequestState {
  return {};
}

export function stepAnswerLocalPathRequestWithActions(
  state: AnswerLocalPathRequestState,
  event: AnswerLocalPathRequestEvent
): AnswerLocalPathRequestStepResult {
  if (event.kind === "path-request/answer-local-handler-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAnswerLocalPathRequest(event.handlerPresent) ? "answer" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAnswerLocalPathRequestNow(
  actions: ReadonlyArray<AnswerLocalPathRequestAction>
): boolean {
  return actions.some((action) => action.kind === "answer");
}

export function shouldSkipAnswerLocalPathRequest(
  actions: ReadonlyArray<AnswerLocalPathRequestAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether start-discovery may record a pending request and flood peers.
 * Tag / destination-key extraction stays at the adapter edge as booleans.
 */
export function shouldBeginPathDiscovery(input: {
  readonly parsedOk: boolean;
  readonly tagPresent: boolean;
  readonly destinationKeyPresent: boolean;
}): boolean {
  return input.parsedOk && input.tagPresent && input.destinationKeyPresent;
}

/**
 * shouldBeginPathDiscovery gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldBeginPathDiscovery`
 * reads beside the step).
 */
export type BeginPathDiscoveryState = Record<string, never>;

export type BeginPathDiscoveryEvent =
  | Event
  | {
      readonly kind: "path-request/begin-discovery-gate";
      readonly parsedOk: boolean;
      readonly tagPresent: boolean;
      readonly destinationKeyPresent: boolean;
    };

export type BeginPathDiscoveryAction =
  | { readonly kind: "begin" }
  | { readonly kind: "skip" };

export interface BeginPathDiscoveryStepResult {
  readonly state: BeginPathDiscoveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly BeginPathDiscoveryAction[];
}

export function initialBeginPathDiscoveryState(): BeginPathDiscoveryState {
  return {};
}

export function stepBeginPathDiscoveryWithActions(
  state: BeginPathDiscoveryState,
  event: BeginPathDiscoveryEvent
): BeginPathDiscoveryStepResult {
  if (event.kind === "path-request/begin-discovery-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldBeginPathDiscovery({
            parsedOk: event.parsedOk,
            tagPresent: event.tagPresent,
            destinationKeyPresent: event.destinationKeyPresent
          })
            ? "begin"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldBeginPathDiscoveryNow(
  actions: ReadonlyArray<BeginPathDiscoveryAction>
): boolean {
  return actions.some((action) => action.kind === "begin");
}

export function shouldSkipBeginPathDiscovery(
  actions: ReadonlyArray<BeginPathDiscoveryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether an expired discovery path-request entry should be cleared before reinsert. */
export function shouldClearExpiredDiscoveryPathRequest(discoveryExpired: boolean): boolean {
  return discoveryExpired;
}

/**
 * shouldClearExpiredDiscoveryPathRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldClearExpiredDiscoveryPathRequest` reads beside the step).
 */
export type ClearExpiredDiscoveryPathRequestState = Record<string, never>;

export type ClearExpiredDiscoveryPathRequestEvent =
  | Event
  | {
      readonly kind: "path-request/clear-expired-discovery-gate";
      readonly discoveryExpired: boolean;
    };

export type ClearExpiredDiscoveryPathRequestAction =
  | { readonly kind: "clear" }
  | { readonly kind: "skip" };

export interface ClearExpiredDiscoveryPathRequestStepResult {
  readonly state: ClearExpiredDiscoveryPathRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClearExpiredDiscoveryPathRequestAction[];
}

export function initialClearExpiredDiscoveryPathRequestState(): ClearExpiredDiscoveryPathRequestState {
  return {};
}

export function stepClearExpiredDiscoveryPathRequestWithActions(
  state: ClearExpiredDiscoveryPathRequestState,
  event: ClearExpiredDiscoveryPathRequestEvent
): ClearExpiredDiscoveryPathRequestStepResult {
  if (event.kind === "path-request/clear-expired-discovery-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldClearExpiredDiscoveryPathRequest(event.discoveryExpired)
            ? "clear"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClearExpiredDiscoveryPathRequestNow(
  actions: ReadonlyArray<ClearExpiredDiscoveryPathRequestAction>
): boolean {
  return actions.some((action) => action.kind === "clear");
}

export function shouldSkipClearExpiredDiscoveryPathRequest(
  actions: ReadonlyArray<ClearExpiredDiscoveryPathRequestAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a path-request tag key should be remembered in the seen-tag set. */
export function shouldRememberPathRequestTag(tagKeyPresent: boolean): boolean {
  return tagKeyPresent;
}

/**
 * shouldRememberPathRequestTag gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRememberPathRequestTag`
 * reads beside the step).
 */
export type RememberPathRequestTagState = Record<string, never>;

export type RememberPathRequestTagEvent =
  | Event
  | {
      readonly kind: "path-request/remember-tag-gate";
      readonly tagKeyPresent: boolean;
    };

export type RememberPathRequestTagAction =
  | { readonly kind: "remember" }
  | { readonly kind: "skip" };

export interface RememberPathRequestTagStepResult {
  readonly state: RememberPathRequestTagState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RememberPathRequestTagAction[];
}

export function initialRememberPathRequestTagState(): RememberPathRequestTagState {
  return {};
}

export function stepRememberPathRequestTagWithActions(
  state: RememberPathRequestTagState,
  event: RememberPathRequestTagEvent
): RememberPathRequestTagStepResult {
  if (event.kind === "path-request/remember-tag-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRememberPathRequestTag(event.tagKeyPresent) ? "remember" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRememberPathRequestTagNow(
  actions: ReadonlyArray<RememberPathRequestTagAction>
): boolean {
  return actions.some((action) => action.kind === "remember");
}

export function shouldSkipRememberPathRequestTag(
  actions: ReadonlyArray<RememberPathRequestTagAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether wrap/direct outbound may use a resolved path-table entry. */
export function shouldUsePathForOutbound(pathPresent: boolean): boolean {
  return pathPresent;
}

/**
 * shouldUsePathForOutbound gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldUsePathForOutbound`
 * reads beside the step).
 */
export type UsePathForOutboundState = Record<string, never>;

export type UsePathForOutboundEvent =
  | Event
  | {
      readonly kind: "path/use-for-outbound-gate";
      readonly pathPresent: boolean;
    };

export type UsePathForOutboundAction =
  | { readonly kind: "use" }
  | { readonly kind: "skip" };

export interface UsePathForOutboundStepResult {
  readonly state: UsePathForOutboundState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UsePathForOutboundAction[];
}

export function initialUsePathForOutboundState(): UsePathForOutboundState {
  return {};
}

export function stepUsePathForOutboundWithActions(
  state: UsePathForOutboundState,
  event: UsePathForOutboundEvent
): UsePathForOutboundStepResult {
  if (event.kind === "path/use-for-outbound-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldUsePathForOutbound(event.pathPresent) ? "use" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePathForOutboundNow(
  actions: ReadonlyArray<UsePathForOutboundAction>
): boolean {
  return actions.some((action) => action.kind === "use");
}

export function shouldSkipUsePathForOutbound(
  actions: ReadonlyArray<UsePathForOutboundAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether answer-path may send a response for a resolved path-table entry. */
export function shouldAnswerPathWithEntry(pathPresent: boolean): boolean {
  return pathPresent;
}

/**
 * shouldAnswerPathWithEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAnswerPathWithEntry`
 * reads beside the step).
 */
export type AnswerPathWithEntryState = Record<string, never>;

export type AnswerPathWithEntryEvent =
  | Event
  | {
      readonly kind: "path-request/answer-path-entry-gate";
      readonly pathPresent: boolean;
    };

export type AnswerPathWithEntryAction =
  | { readonly kind: "answer" }
  | { readonly kind: "skip" };

export interface AnswerPathWithEntryStepResult {
  readonly state: AnswerPathWithEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnswerPathWithEntryAction[];
}

export function initialAnswerPathWithEntryState(): AnswerPathWithEntryState {
  return {};
}

export function stepAnswerPathWithEntryWithActions(
  state: AnswerPathWithEntryState,
  event: AnswerPathWithEntryEvent
): AnswerPathWithEntryStepResult {
  if (event.kind === "path-request/answer-path-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAnswerPathWithEntry(event.pathPresent) ? "answer" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAnswerPathWithEntryNow(
  actions: ReadonlyArray<AnswerPathWithEntryAction>
): boolean {
  return actions.some((action) => action.kind === "answer");
}

export function shouldSkipAnswerPathWithEntry(
  actions: ReadonlyArray<AnswerPathWithEntryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether path-table touch may refresh a resolved entry's timestamp. */
export function shouldTouchPathEntry(pathPresent: boolean): boolean {
  return pathPresent;
}

/**
 * shouldTouchPathEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTouchPathEntry`
 * reads beside the step).
 */
export type TouchPathEntryState = Record<string, never>;

export type TouchPathEntryEvent =
  | Event
  | {
      readonly kind: "path/touch-entry-gate";
      readonly pathPresent: boolean;
    };

export type TouchPathEntryAction =
  | { readonly kind: "touch" }
  | { readonly kind: "skip" };

export interface TouchPathEntryStepResult {
  readonly state: TouchPathEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TouchPathEntryAction[];
}

export function initialTouchPathEntryState(): TouchPathEntryState {
  return {};
}

export function stepTouchPathEntryWithActions(
  state: TouchPathEntryState,
  event: TouchPathEntryEvent
): TouchPathEntryStepResult {
  if (event.kind === "path/touch-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldTouchPathEntry(event.pathPresent) ? "touch" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTouchPathEntryNow(
  actions: ReadonlyArray<TouchPathEntryAction>
): boolean {
  return actions.some((action) => action.kind === "touch");
}
