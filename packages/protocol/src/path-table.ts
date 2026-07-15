/**
 * Pure path-table / pathfinder decisions for announce ingress and path requests.
 * No IO — time and bytes arrive only as event/parameters.
 * Path-request ingress / discovery fulfill / outbound / entry-lookup conclusions
 * leave via machine actions (no ad-hoc plan reads beside the step).
 * Path random-blob append / expiry conclusions leave via machine actions (no
 * ad-hoc `appendPathRandomBlob` / `computePathExpiry` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { TRUNCATED_HASH_BYTES } from "./hash-truncate.js";
import {
  PACKET_DEST_TYPE_GROUP,
  PACKET_DEST_TYPE_PLAIN,
  PACKET_HEADER_1,
  PACKET_TYPE_ANNOUNCE
} from "./packet-header.js";

export { TRUNCATED_HASH_BYTES };

export const PATHFINDER_MAX_HOPS = 128;
export const PATHFINDER_EXPIRY_SECONDS = 60 * 60 * 24 * 7;
export const PATH_REQUEST_TIMEOUT_SECONDS = 15;
export const PATH_REQUEST_GRACE_MS = 400;
export const PATH_REQUEST_MIN_INTERVAL = 20;

/** Whether enough time has passed to emit another path request for a destination. */
export function shouldEmitPathRequest(input: {
  readonly lastRequestAt: number;
  readonly nowSeconds: number;
  readonly minIntervalSeconds?: number;
}): boolean {
  const minInterval = input.minIntervalSeconds ?? PATH_REQUEST_MIN_INTERVAL;
  return input.nowSeconds - input.lastRequestAt >= minInterval;
}

/** True when a discovery path-request entry is past its absolute deadline. */
export function isDiscoveryPathRequestExpired(input: {
  readonly timeoutAt: number;
  readonly nowSeconds: number;
}): boolean {
  return input.nowSeconds > input.timeoutAt;
}

/**
 * Path-request ingress outcome after parse / tag / local / path / discovery gates.
 * Tag recording and transmit stay at the adapter edge.
 */
export type PathRequestIngressPlan =
  | "ignore-unparsed"
  | "ignore-seen-tag"
  | "answer-local"
  | "answer-path"
  | "ignore"
  | "ignore-in-flight-discovery"
  | "start-discovery";

/**
 * Plan inbound path-request handling for leaf and transport-enabled nodes.
 * Pass `allowDiscovery: true` on TransportNode (missing path may forward);
 * leaf transport keeps the default (`false`) and ignores when no answerable path.
 */
export function planPathRequestIngress(input: {
  readonly parsedOk: boolean;
  readonly hasTag: boolean;
  readonly tagAlreadySeen: boolean;
  readonly hasLocalAnswerer: boolean;
  readonly transportEnabled: boolean;
  readonly hasPath: boolean;
  readonly shouldAnswerPath: boolean;
  readonly discoveryPresent: boolean;
  readonly discoveryExpired: boolean;
  readonly allowDiscovery?: boolean;
}): PathRequestIngressPlan {
  if (!input.parsedOk || !input.hasTag) {
    return "ignore-unparsed";
  }
  if (input.tagAlreadySeen) {
    return "ignore-seen-tag";
  }
  if (input.hasLocalAnswerer) {
    return "answer-local";
  }
  if (!input.transportEnabled) {
    return "ignore";
  }
  if (input.hasPath) {
    return input.shouldAnswerPath ? "answer-path" : "ignore";
  }
  if (input.allowDiscovery !== true) {
    return "ignore";
  }
  if (input.discoveryPresent && !input.discoveryExpired) {
    return "ignore-in-flight-discovery";
  }
  return "start-discovery";
}

/**
 * Path-request ingress is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type PathRequestIngressState = Record<string, never>;

export type PathRequestIngressEvent =
  | Event
  | {
      readonly kind: "path-request/ingress-gate";
      readonly parsedOk: boolean;
      readonly hasTag: boolean;
      readonly tagAlreadySeen: boolean;
      readonly hasLocalAnswerer: boolean;
      readonly transportEnabled: boolean;
      readonly hasPath: boolean;
      readonly shouldAnswerPath: boolean;
      readonly discoveryPresent: boolean;
      readonly discoveryExpired: boolean;
      readonly allowDiscovery?: boolean;
    };

export type PathRequestIngressAction = {
  readonly kind: PathRequestIngressPlan;
};

export interface PathRequestIngressStepResult {
  readonly state: PathRequestIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathRequestIngressAction[];
}

export function initialPathRequestIngressState(): PathRequestIngressState {
  return {};
}

export const stepPathRequestIngress: StepFn<PathRequestIngressState> = (state, event) => {
  const result = stepPathRequestIngressInner(state, event as PathRequestIngressEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPathRequestIngressWithActions(
  state: PathRequestIngressState,
  event: PathRequestIngressEvent
): PathRequestIngressStepResult {
  return stepPathRequestIngressInner(state, event);
}

export function pathRequestIngressFromActions(
  actions: ReadonlyArray<PathRequestIngressAction>
): PathRequestIngressPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldIgnorePathRequestUnparsed(
  actions: ReadonlyArray<PathRequestIngressAction>
): boolean {
  return actions.some((action) => action.kind === "ignore-unparsed");
}

export function shouldIgnorePathRequestSeenTag(
  actions: ReadonlyArray<PathRequestIngressAction>
): boolean {
  return actions.some((action) => action.kind === "ignore-seen-tag");
}

export function shouldAnswerPathRequestLocal(
  actions: ReadonlyArray<PathRequestIngressAction>
): boolean {
  return actions.some((action) => action.kind === "answer-local");
}

export function shouldAnswerPathRequestPath(
  actions: ReadonlyArray<PathRequestIngressAction>
): boolean {
  return actions.some((action) => action.kind === "answer-path");
}

export function shouldIgnorePathRequestIngress(
  actions: ReadonlyArray<PathRequestIngressAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

export function shouldIgnorePathRequestInFlightDiscovery(
  actions: ReadonlyArray<PathRequestIngressAction>
): boolean {
  return actions.some((action) => action.kind === "ignore-in-flight-discovery");
}

export function shouldStartPathRequestDiscovery(
  actions: ReadonlyArray<PathRequestIngressAction>
): boolean {
  return actions.some((action) => action.kind === "start-discovery");
}

function stepPathRequestIngressInner(
  state: PathRequestIngressState,
  event: PathRequestIngressEvent
): PathRequestIngressStepResult {
  if (event.kind === "path-request/ingress-gate") {
    const plan = planPathRequestIngress({
      parsedOk: event.parsedOk,
      hasTag: event.hasTag,
      tagAlreadySeen: event.tagAlreadySeen,
      hasLocalAnswerer: event.hasLocalAnswerer,
      transportEnabled: event.transportEnabled,
      hasPath: event.hasPath,
      shouldAnswerPath: event.shouldAnswerPath,
      discoveryPresent: event.discoveryPresent,
      discoveryExpired: event.discoveryExpired,
      ...(event.allowDiscovery !== undefined ? { allowDiscovery: event.allowDiscovery } : {})
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether answer-local may invoke the local destination path-request handler. */
export function canAnswerLocalPathRequest(handlerPresent: boolean): boolean {
  return handlerPresent;
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

/** Whether an expired discovery path-request entry should be cleared before reinsert. */
export function shouldClearExpiredDiscoveryPathRequest(discoveryExpired: boolean): boolean {
  return discoveryExpired;
}

/** Whether a path-request tag key should be remembered in the seen-tag set. */
export function shouldRememberPathRequestTag(tagKeyPresent: boolean): boolean {
  return tagKeyPresent;
}

/** Whether wrap/direct outbound may use a resolved path-table entry. */
export function shouldUsePathForOutbound(pathPresent: boolean): boolean {
  return pathPresent;
}

/** Whether answer-path may send a response for a resolved path-table entry. */
export function shouldAnswerPathWithEntry(pathPresent: boolean): boolean {
  return pathPresent;
}

/** Whether path-table touch may refresh a resolved entry's timestamp. */
export function shouldTouchPathEntry(pathPresent: boolean): boolean {
  return pathPresent;
}

/** Whether a pending discovery path-request should be fulfilled by an announce. */
export type DiscoveryPathRequestFulfillPlan = "ignore" | "drop-expired" | "fulfill";

export function planDiscoveryPathRequestFulfill(input: {
  readonly hasPending: boolean;
  readonly expired: boolean;
}): DiscoveryPathRequestFulfillPlan {
  if (!input.hasPending) {
    return "ignore";
  }
  if (input.expired) {
    return "drop-expired";
  }
  return "fulfill";
}

/**
 * Discovery path-request fulfill is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type DiscoveryPathRequestFulfillState = Record<string, never>;

export type DiscoveryPathRequestFulfillEvent =
  | Event
  | {
      readonly kind: "path-request/discovery-fulfill-gate";
      readonly hasPending: boolean;
      readonly expired: boolean;
    };

export type DiscoveryPathRequestFulfillAction = {
  readonly kind: DiscoveryPathRequestFulfillPlan;
};

export interface DiscoveryPathRequestFulfillStepResult {
  readonly state: DiscoveryPathRequestFulfillState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DiscoveryPathRequestFulfillAction[];
}

export function initialDiscoveryPathRequestFulfillState(): DiscoveryPathRequestFulfillState {
  return {};
}

export const stepDiscoveryPathRequestFulfill: StepFn<DiscoveryPathRequestFulfillState> = (
  state,
  event
) => {
  const result = stepDiscoveryPathRequestFulfillInner(
    state,
    event as DiscoveryPathRequestFulfillEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepDiscoveryPathRequestFulfillWithActions(
  state: DiscoveryPathRequestFulfillState,
  event: DiscoveryPathRequestFulfillEvent
): DiscoveryPathRequestFulfillStepResult {
  return stepDiscoveryPathRequestFulfillInner(state, event);
}

export function discoveryPathRequestFulfillFromActions(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>
): DiscoveryPathRequestFulfillPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldIgnoreDiscoveryPathFulfillActions(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

export function shouldDropExpiredDiscoveryPathRequest(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>
): boolean {
  return actions.some((action) => action.kind === "drop-expired");
}

export function shouldFulfillDiscoveryPathRequest(
  actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>
): boolean {
  return actions.some((action) => action.kind === "fulfill");
}

function stepDiscoveryPathRequestFulfillInner(
  state: DiscoveryPathRequestFulfillState,
  event: DiscoveryPathRequestFulfillEvent
): DiscoveryPathRequestFulfillStepResult {
  if (event.kind === "path-request/discovery-fulfill-gate") {
    const plan = planDiscoveryPathRequestFulfill({
      hasPending: event.hasPending,
      expired: event.expired
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Whether discovery fulfill may transmit a path response (fulfill plan + pending present).
 * Pending map delete stays at the adapter edge.
 */
export function shouldFulfillDiscoveryPending(input: {
  readonly fulfillOk: boolean;
  readonly pendingPresent: boolean;
}): boolean {
  return input.fulfillOk && input.pendingPresent;
}

/** Whether discovery fulfill should early-out with no pending map mutation. */
export function shouldIgnoreDiscoveryPathFulfill(ignore: boolean): boolean {
  return ignore;
}

/** How LeafTransport should send a packet given path-table state. */
export type PathOutboundKind = "wrap" | "direct" | "flood";

/**
 * Plan outbound routing: transport-wrap, single-hop direct, or flood.
 * Transmit / wrap bytes stay at the adapter edge.
 */
export function planPathOutbound(input: {
  readonly packetType: number;
  readonly destinationType: number;
  readonly headerType: number;
  readonly hasPath: boolean;
  readonly pathHops: number;
}): PathOutboundKind {
  const pathEligible =
    input.packetType !== PACKET_TYPE_ANNOUNCE &&
    input.destinationType !== PACKET_DEST_TYPE_PLAIN &&
    input.destinationType !== PACKET_DEST_TYPE_GROUP &&
    input.hasPath;

  if (pathEligible) {
    if (input.pathHops > 1 && input.headerType === PACKET_HEADER_1) {
      return "wrap";
    }
    if (input.pathHops <= 1) {
      return "direct";
    }
  }
  return "flood";
}

/**
 * Path outbound routing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type PathOutboundState = Record<string, never>;

export type PathOutboundEvent =
  | Event
  | {
      readonly kind: "path/outbound-gate";
      readonly packetType: number;
      readonly destinationType: number;
      readonly headerType: number;
      readonly hasPath: boolean;
      readonly pathHops: number;
    };

export type PathOutboundAction = {
  readonly kind: PathOutboundKind;
};

export interface PathOutboundStepResult {
  readonly state: PathOutboundState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathOutboundAction[];
}

export function initialPathOutboundState(): PathOutboundState {
  return {};
}

export const stepPathOutbound: StepFn<PathOutboundState> = (state, event) => {
  const result = stepPathOutboundInner(state, event as PathOutboundEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPathOutboundWithActions(
  state: PathOutboundState,
  event: PathOutboundEvent
): PathOutboundStepResult {
  return stepPathOutboundInner(state, event);
}

export function pathOutboundFromActions(
  actions: ReadonlyArray<PathOutboundAction>
): PathOutboundKind | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldWrapPathOutbound(actions: ReadonlyArray<PathOutboundAction>): boolean {
  return actions.some((action) => action.kind === "wrap");
}

export function shouldDirectPathOutbound(actions: ReadonlyArray<PathOutboundAction>): boolean {
  return actions.some((action) => action.kind === "direct");
}

export function shouldFloodPathOutbound(actions: ReadonlyArray<PathOutboundAction>): boolean {
  return actions.some((action) => action.kind === "flood");
}

function stepPathOutboundInner(
  state: PathOutboundState,
  event: PathOutboundEvent
): PathOutboundStepResult {
  if (event.kind === "path/outbound-gate") {
    const plan = planPathOutbound({
      packetType: event.packetType,
      destinationType: event.destinationType,
      headerType: event.headerType,
      hasPath: event.hasPath,
      pathHops: event.pathHops
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
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

export function timebaseFromRandomBlobs(randomBlobs: ReadonlyArray<Uint8Array>): number {
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
  requestorTransportId: Uint8Array | null
): boolean {
  if (requestorTransportId === null) {
    return true;
  }
  return !equalByteArrays(nextHop, requestorTransportId);
}

/**
 * Decide whether an announce should replace/update the path table entry.
 * Mirrors TransportNode announce path-table update predicates.
 */
export function shouldAddPathEntry(input: PathAddDecisionInput): boolean {
  const { hops, randomBlob, nowSeconds, existing } = input;

  if (existing === null) {
    return hops < PATHFINDER_MAX_HOPS + 1;
  }

  if (hops <= existing.hops) {
    const pathTimebase = timebaseFromRandomBlobs(existing.randomBlobs);
    const announceEmitted = announceEmittedFromRandomBlob(randomBlob);
    const seen = existing.randomBlobs.some((blob) => equalByteArrays(blob, randomBlob));
    return !seen && announceEmitted > pathTimebase;
  }

  if (isPathEntryExpired({ expires: existing.expires, nowSeconds })) {
    return !existing.randomBlobs.some((blob) => equalByteArrays(blob, randomBlob));
  }

  return false;
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
  event: ComputePathExpiryEvent
): ComputePathExpiryStepResult {
  if (event.kind === "path/expiry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-expiry",
          expires: computePathExpiry(event.nowSeconds)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePathExpiry(
  actions: ReadonlyArray<ComputePathExpiryAction>
): boolean {
  return actions.some((action) => action.kind === "use-expiry");
}

/** Extract path expiry instant from step actions; null when no `use-expiry`. */
export function pathExpiryFromActions(
  actions: ReadonlyArray<ComputePathExpiryAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-expiry");
  return action?.kind === "use-expiry" ? action.expires : null;
}

/** True when a path-table entry is past its expiry instant. */
export function isPathEntryExpired(input: {
  readonly expires: number;
  readonly nowSeconds: number;
}): boolean {
  return input.nowSeconds >= input.expires;
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

/**
 * Path-entry lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type PathEntryLookupState = Record<string, never>;

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

export interface PathEntryLookupStepResult {
  readonly state: PathEntryLookupState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathEntryLookupAction[];
}

export function initialPathEntryLookupState(): PathEntryLookupState {
  return {};
}

export const stepPathEntryLookup: StepFn<PathEntryLookupState> = (state, event) => {
  const result = stepPathEntryLookupInner(state, event as PathEntryLookupEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPathEntryLookupWithActions(
  state: PathEntryLookupState,
  event: PathEntryLookupEvent
): PathEntryLookupStepResult {
  return stepPathEntryLookupInner(state, event);
}

export function pathEntryLookupFromActions(
  actions: ReadonlyArray<PathEntryLookupAction>
): PathEntryLookupPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldMissPathEntryLookup(
  actions: ReadonlyArray<PathEntryLookupAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

export function shouldExpirePathEntryLookup(
  actions: ReadonlyArray<PathEntryLookupAction>
): boolean {
  return actions.some((action) => action.kind === "expired");
}

export function shouldHitPathEntryLookup(
  actions: ReadonlyArray<PathEntryLookupAction>
): boolean {
  return actions.some((action) => action.kind === "hit");
}

function stepPathEntryLookupInner(
  state: PathEntryLookupState,
  event: PathEntryLookupEvent
): PathEntryLookupStepResult {
  if (event.kind === "path/entry-lookup-gate") {
    const plan = planPathEntryLookup({
      entryPresent: event.entryPresent,
      expired: event.expired
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Dedupe-append a path announce random blob onto the entry's blob list.
 */
export function appendPathRandomBlob(input: {
  readonly randomBlobs: ReadonlyArray<Uint8Array>;
  readonly randomBlob: Uint8Array;
}): readonly Uint8Array[] {
  if (input.randomBlobs.some((blob) => equalByteArrays(blob, input.randomBlob))) {
    return input.randomBlobs;
  }
  return [...input.randomBlobs, input.randomBlob];
}

/**
 * Path random-blob append is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `appendPathRandomBlob`
 * reads beside the step).
 */
export type AppendPathRandomBlobState = Record<string, never>;

export type AppendPathRandomBlobEvent =
  | Event
  | {
      readonly kind: "path/append-random-blob-gate";
      readonly randomBlobs: ReadonlyArray<Uint8Array>;
      readonly randomBlob: Uint8Array;
    };

export type AppendPathRandomBlobAction = {
  readonly kind: "use-fields";
  readonly randomBlobs: readonly Uint8Array[];
};

export interface AppendPathRandomBlobStepResult {
  readonly state: AppendPathRandomBlobState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AppendPathRandomBlobAction[];
}

export function initialAppendPathRandomBlobState(): AppendPathRandomBlobState {
  return {};
}

export function stepAppendPathRandomBlobWithActions(
  state: AppendPathRandomBlobState,
  event: AppendPathRandomBlobEvent
): AppendPathRandomBlobStepResult {
  if (event.kind === "path/append-random-blob-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          randomBlobs: appendPathRandomBlob({
            randomBlobs: event.randomBlobs,
            randomBlob: event.randomBlob
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAppendPathRandomBlob(
  actions: ReadonlyArray<AppendPathRandomBlobAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract appended random-blob list from step actions; null when no `use-fields`. */
export function appendPathRandomBlobFieldsFromActions(
  actions: ReadonlyArray<AppendPathRandomBlobAction>
): readonly Uint8Array[] | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.randomBlobs : null;
}

/** Lightweight path-table step for sim: tracks hops per destination key. */
export interface PathTableState {
  readonly entries: ReadonlyMap<
    string,
    { readonly hops: number; readonly expires: number; readonly blobHex: string }
  >;
  readonly lastAdded: boolean;
}

export type PathTableEvent =
  | Event
  | {
      readonly kind: "path/announce";
      readonly destinationKey: string;
      readonly hops: number;
      readonly randomBlob: Uint8Array;
      readonly at: number;
    };

export function initialPathTableState(): PathTableState {
  return { entries: new Map(), lastAdded: false };
}

export const stepPathTable: StepFn<PathTableState> = (state, event) =>
  stepPathTableInner(state, event as PathTableEvent);

function stepPathTableInner(
  state: PathTableState,
  event: PathTableEvent
): { state: PathTableState; intents: [] } {
  if (event.kind !== "path/announce") {
    return { state, intents: [] };
  }

  const existingEntry = state.entries.get(event.destinationKey);
  const existing: PathTableEntryView | null =
    existingEntry === undefined
      ? null
      : {
          hops: existingEntry.hops,
          expires: existingEntry.expires,
          randomBlobs: [hexToBytes(existingEntry.blobHex)]
        };

  const shouldAdd = shouldAddPathEntry({
    hops: event.hops,
    randomBlob: event.randomBlob,
    nowSeconds: event.at,
    existing
  });

  if (!shouldAdd) {
    return { state: { ...state, lastAdded: false }, intents: [] };
  }

  const entries = new Map(state.entries);
  entries.set(event.destinationKey, {
    hops: event.hops,
    expires: computePathExpiry(event.at),
    blobHex: bytesToHex(event.randomBlob)
  });
  return { state: { entries, lastAdded: true }, intents: [] };
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
