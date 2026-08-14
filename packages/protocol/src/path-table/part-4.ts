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
  PACKET_TYPE_ANNOUNCE,
} from "../packet-header.js";
import { PATHFINDER_EXPIRY_SECONDS, PATHFINDER_MAX_HOPS } from "./part-1.js";
import { stepPathOutboundInner } from "./part-3.js";
import type {
  PathOutboundAction,
  PathOutboundEvent,
  PathOutboundKind,
  PathOutboundPlanAction,
  PathOutboundState,
} from "./part-3.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
export function shouldFloodPathOutboundPlan(
  actions: ReadonlyArray<PathOutboundPlanAction>,
): boolean {
  return hasActionOfKind(actions, "flood");
}

export function initialPathOutboundState(): PathOutboundState {
  return {};
}

export const stepPathOutbound: StepFn<PathOutboundState> = (state, event) => {
  const result = stepPathOutboundInner(state, event as PathOutboundEvent);
  return { state: result.state, intents: result.intents };
};

export function pathOutboundFromActions(
  actions: ReadonlyArray<PathOutboundAction>,
): PathOutboundKind | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldWrapPathOutbound(
  actions: ReadonlyArray<PathOutboundAction>,
): boolean {
  return hasActionOfKind(actions, "wrap");
}

export function shouldDirectPathOutbound(
  actions: ReadonlyArray<PathOutboundAction>,
): boolean {
  return hasActionOfKind(actions, "direct");
}

export function shouldFloodPathOutbound(
  actions: ReadonlyArray<PathOutboundAction>,
): boolean {
  return hasActionOfKind(actions, "flood");
}

export interface PathTableEntryView {
  readonly hops: number;
  readonly expires: number;
  readonly randomBlobs: readonly Uint8Array[];
}

export interface PathAddDecisionInput {
  readonly hops: number;
  readonly randomBlob: Uint8Array;
  readonly nowSeconds: number;
  readonly existing: PathTableEntryView | null;
}

/** Mirrors RNS announce random-blob timestamp decode (bytes 5..9). */
export function announceEmittedFromRandomBlob(randomBlob: Uint8Array): number {
  if (randomBlob.length < 10) {
    return 0;
  }

  let value = 0;
  for (let index = 5; index < 10; index += 1) {
    value = (value << 8) | (randomBlob[index] ?? 0);
  }

  return value;
}

export function timebaseFromRandomBlobs(
  randomBlobs: ReadonlyArray<Uint8Array>,
): number {
  let latest = 0;
  for (const blob of randomBlobs) {
    latest = Math.max(latest, announceEmittedFromRandomBlob(blob));
  }
  return latest;
}

export function equalByteArrays(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }
  return true;
}

export function shouldAnswerPathRequest(
  nextHop: Uint8Array,
  requestorTransportId: Uint8Array | null,
): boolean {
  if (requestorTransportId === null) {
    return true;
  }
  return !equalByteArrays(nextHop, requestorTransportId);
}

/**
 * shouldAnswerPathRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAnswerPathRequest`
 * reads beside the step).
 */
export type AnswerPathRequestState = Record<string, never>;

export type AnswerPathRequestEvent =
  | Event
  | {
      readonly kind: "path-request/answer-path-gate";
      readonly nextHop: Uint8Array;
      readonly requestorTransportId: Uint8Array | null;
    };

export type AnswerPathRequestAction =
  { readonly kind: "answer" } | { readonly kind: "skip" };

export interface AnswerPathRequestStepResult {
  readonly state: AnswerPathRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnswerPathRequestAction[];
}

export function initialAnswerPathRequestState(): AnswerPathRequestState {
  return {};
}

export function stepAnswerPathRequestWithActions(
  state: AnswerPathRequestState,
  event: AnswerPathRequestEvent,
): AnswerPathRequestStepResult {
  if (event.kind === "path-request/answer-path-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAnswerPathRequest(
            event.nextHop,
            event.requestorTransportId,
          )
            ? "answer"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAnswerPathRequestNow(
  actions: ReadonlyArray<AnswerPathRequestAction>,
): boolean {
  return hasActionOfKind(actions, "answer");
}

export function shouldSkipAnswerPathRequest(
  actions: ReadonlyArray<AnswerPathRequestAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Decide whether an announce should replace/update the path table entry.
 * Mirrors TransportNode announce path-table update predicates.
 */
export function shouldAddPathEntry(input: PathAddDecisionInput): boolean {
  const { hops, randomBlob, nowSeconds, existing } = input;

  // The hop ceiling applies to every announce, not just the first one for a
  // destination: an expired entry must not be replaced by an over-hop path.
  if (hops > PATHFINDER_MAX_HOPS) {
    return false;
  }

  if (existing === null) {
    return true;
  }

  if (hops <= existing.hops) {
    const pathTimebase = timebaseFromRandomBlobs(existing.randomBlobs);
    const announceEmitted = announceEmittedFromRandomBlob(randomBlob);
    const seen = existing.randomBlobs.some((blob) =>
      equalByteArrays(blob, randomBlob),
    );
    return !seen && announceEmitted > pathTimebase;
  }

  if (isPathEntryExpired({ expires: existing.expires, nowSeconds })) {
    return !existing.randomBlobs.some((blob) =>
      equalByteArrays(blob, randomBlob),
    );
  }

  return false;
}

/**
 * shouldAddPathEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAddPathEntry` reads
 * beside the step).
 */
export type AddPathEntryState = Record<string, never>;

export type AddPathEntryEvent =
  | Event
  | {
      readonly kind: "path/add-entry-gate";
      readonly hops: number;
      readonly randomBlob: Uint8Array;
      readonly nowSeconds: number;
      readonly existing: PathTableEntryView | null;
    };

export type AddPathEntryAction =
  { readonly kind: "add" } | { readonly kind: "skip" };

export interface AddPathEntryStepResult {
  readonly state: AddPathEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AddPathEntryAction[];
}

export function initialAddPathEntryState(): AddPathEntryState {
  return {};
}

export function stepAddPathEntryWithActions(
  state: AddPathEntryState,
  event: AddPathEntryEvent,
): AddPathEntryStepResult {
  if (event.kind === "path/add-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAddPathEntry({
            hops: event.hops,
            randomBlob: event.randomBlob,
            nowSeconds: event.nowSeconds,
            existing: event.existing,
          })
            ? "add"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAddPathEntryNow(
  actions: ReadonlyArray<AddPathEntryAction>,
): boolean {
  return hasActionOfKind(actions, "add");
}

export function shouldSkipAddPathEntry(
  actions: ReadonlyArray<AddPathEntryAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export function computePathExpiry(nowSeconds: number): number {
  return nowSeconds + PATHFINDER_EXPIRY_SECONDS;
}

/**
 * Path expiry computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computePathExpiry`
 * reads beside the step).
 */
export type ComputePathExpiryState = Record<string, never>;

export type ComputePathExpiryEvent =
  | Event
  | {
      readonly kind: "path/expiry-gate";
      readonly nowSeconds: number;
    };

export type ComputePathExpiryAction = {
  readonly kind: "use-expiry";
  readonly expires: number;
};

export interface ComputePathExpiryStepResult {
  readonly state: ComputePathExpiryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputePathExpiryAction[];
}

export function initialComputePathExpiryState(): ComputePathExpiryState {
  return {};
}

export function stepComputePathExpiryWithActions(
  state: ComputePathExpiryState,
  event: ComputePathExpiryEvent,
): ComputePathExpiryStepResult {
  if (event.kind === "path/expiry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-expiry",
          expires: computePathExpiry(event.nowSeconds),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePathExpiry(
  actions: ReadonlyArray<ComputePathExpiryAction>,
): boolean {
  return hasActionOfKind(actions, "use-expiry");
}

/** Extract path expiry instant from step actions; null when no `use-expiry`. */
export function pathExpiryFromActions(
  actions: ReadonlyArray<ComputePathExpiryAction>,
): number | null {
  return firstActionOfKind(actions, "use-expiry")?.expires ?? null;
}

/** True when a path-table entry is past its expiry instant. */
export function isPathEntryExpired(input: {
  readonly expires: number;
  readonly nowSeconds: number;
}): boolean {
  return input.nowSeconds >= input.expires;
}

/**
 * isPathEntryExpired gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isPathEntryExpired`
 * reads beside the step).
 */
export type PathEntryExpiredState = Record<string, never>;

export type PathEntryExpiredEvent =
  | Event
  | {
      readonly kind: "path/entry-expired-gate";
      readonly expires: number;
      readonly nowSeconds: number;
    };

export type PathEntryExpiredAction =
  { readonly kind: "expired" } | { readonly kind: "live" };

export interface PathEntryExpiredStepResult {
  readonly state: PathEntryExpiredState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathEntryExpiredAction[];
}

export function initialPathEntryExpiredState(): PathEntryExpiredState {
  return {};
}

export function stepPathEntryExpiredWithActions(
  state: PathEntryExpiredState,
  event: PathEntryExpiredEvent,
): PathEntryExpiredStepResult {
  if (event.kind === "path/entry-expired-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isPathEntryExpired({
            expires: event.expires,
            nowSeconds: event.nowSeconds,
          })
            ? "expired"
            : "live",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatPathEntryExpired(
  actions: ReadonlyArray<PathEntryExpiredAction>,
): boolean {
  return hasActionOfKind(actions, "expired");
}

export function shouldTreatPathEntryLive(
  actions: ReadonlyArray<PathEntryExpiredAction>,
): boolean {
  return hasActionOfKind(actions, "live");
}

export type PathEntryLookupPlan = "miss" | "expired" | "hit";

/**
 * Path-table get: miss, expired (adapter deletes), or hit.
 * Map delete stays at the adapter.
 */
export function planPathEntryLookup(input: {
  readonly entryPresent: boolean;
  readonly expired: boolean;
}): PathEntryLookupPlan {
  if (!input.entryPresent) {
    return "miss";
  }
  if (input.expired) {
    return "expired";
  }
  return "hit";
}

export type PathEntryLookupPlanEvent =
  | Event
  | {
      readonly kind: "path/entry-lookup-plan-gate";
      readonly entryPresent: boolean;
      readonly expired: boolean;
    };

export type PathEntryLookupPlanAction = { readonly kind: PathEntryLookupPlan };

/** Extract the path-entry lookup plan from actions; null when empty. */
export function pathEntryLookupPlanFromActions(
  actions: ReadonlyArray<PathEntryLookupPlanAction>,
): PathEntryLookupPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "miss" || entry.kind === "expired" || entry.kind === "hit",
  );
  return action?.kind ?? null;
}

export type PathEntryLookupEvent =
  | Event
  | {
      readonly kind: "path/entry-lookup-gate";
      readonly entryPresent: boolean;
      readonly expired: boolean;
    };

export type PathEntryLookupAction = {
  readonly kind: PathEntryLookupPlan;
};
