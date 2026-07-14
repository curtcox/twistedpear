/**
 * Pure path-table / pathfinder decisions for announce ingress and path requests.
 * No IO — time and bytes arrive only as event/parameters.
 */
import type { Event, StepFn } from "@twistedpear/effects";
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
 * Whether discovery fulfill may transmit a path response (fulfill plan + pending present).
 * Pending map delete stays at the adapter edge.
 */
export function shouldFulfillDiscoveryPending(input: {
  readonly fulfillOk: boolean;
  readonly pendingPresent: boolean;
}): boolean {
  return input.fulfillOk && input.pendingPresent;
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
