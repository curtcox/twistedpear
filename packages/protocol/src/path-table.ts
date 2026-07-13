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

  if (nowSeconds >= existing.expires) {
    return !existing.randomBlobs.some((blob) => equalByteArrays(blob, randomBlob));
  }

  return false;
}

export function computePathExpiry(nowSeconds: number): number {
  return nowSeconds + PATHFINDER_EXPIRY_SECONDS;
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
