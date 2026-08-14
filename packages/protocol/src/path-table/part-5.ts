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
import {
  computePathExpiry,
  equalByteArrays,
  pathEntryLookupPlanFromActions,
  planPathEntryLookup,
  shouldAddPathEntry,
} from "./part-4.js";
import type {
  PathEntryLookupAction,
  PathEntryLookupEvent,
  PathEntryLookupPlan,
  PathEntryLookupPlanAction,
  PathEntryLookupPlanEvent,
  PathTableEntryView,
} from "./part-4.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
/**
 * Path-entry lookup plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPathEntryLookup` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPathEntryLookupWithActions}.
 */
export type PathEntryLookupPlanState = Record<string, never>;

export interface PathEntryLookupPlanStepResult {
  readonly state: PathEntryLookupPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathEntryLookupPlanAction[];
}

export function initialPathEntryLookupPlanState(): PathEntryLookupPlanState {
  return {};
}

export function stepPathEntryLookupPlanWithActions(
  state: PathEntryLookupPlanState,
  event: PathEntryLookupPlanEvent,
): PathEntryLookupPlanStepResult {
  if (event.kind === "path/entry-lookup-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planPathEntryLookup({
            entryPresent: event.entryPresent,
            expired: event.expired,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMissPathEntryLookupPlan(
  actions: ReadonlyArray<PathEntryLookupPlanAction>,
): boolean {
  return hasActionOfKind(actions, "miss");
}

export function shouldExpirePathEntryLookupPlan(
  actions: ReadonlyArray<PathEntryLookupPlanAction>,
): boolean {
  return hasActionOfKind(actions, "expired");
}

export function shouldHitPathEntryLookupPlan(
  actions: ReadonlyArray<PathEntryLookupPlanAction>,
): boolean {
  return hasActionOfKind(actions, "hit");
}

/**
 * Path-entry lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPathEntryLookupPlanWithActions}
 * (`miss`|`expired`|`hit`).
 */
export type PathEntryLookupState = Record<string, never>;

export interface PathEntryLookupStepResult {
  readonly state: PathEntryLookupState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathEntryLookupAction[];
}

export function initialPathEntryLookupState(): PathEntryLookupState {
  return {};
}

export const stepPathEntryLookup: StepFn<PathEntryLookupState> = (
  state,
  event,
) => {
  const result = stepPathEntryLookupInner(state, event as PathEntryLookupEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPathEntryLookupWithActions(
  state: PathEntryLookupState,
  event: PathEntryLookupEvent,
): PathEntryLookupStepResult {
  return stepPathEntryLookupInner(state, event);
}

export function pathEntryLookupFromActions(
  actions: ReadonlyArray<PathEntryLookupAction>,
): PathEntryLookupPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldMissPathEntryLookup(
  actions: ReadonlyArray<PathEntryLookupAction>,
): boolean {
  return hasActionOfKind(actions, "miss");
}

export function shouldExpirePathEntryLookup(
  actions: ReadonlyArray<PathEntryLookupAction>,
): boolean {
  return hasActionOfKind(actions, "expired");
}

export function shouldHitPathEntryLookup(
  actions: ReadonlyArray<PathEntryLookupAction>,
): boolean {
  return hasActionOfKind(actions, "hit");
}

function stepPathEntryLookupInner(
  state: PathEntryLookupState,
  event: PathEntryLookupEvent,
): PathEntryLookupStepResult {
  if (event.kind === "path/entry-lookup-gate") {
    const planActions = stepPathEntryLookupPlanWithActions(
      initialPathEntryLookupPlanState(),
      {
        kind: "path/entry-lookup-plan-gate",
        entryPresent: event.entryPresent,
        expired: event.expired,
      },
    ).actions;
    const plan = pathEntryLookupPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
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
  if (
    input.randomBlobs.some((blob) => equalByteArrays(blob, input.randomBlob))
  ) {
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
  event: AppendPathRandomBlobEvent,
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
            randomBlob: event.randomBlob,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAppendPathRandomBlob(
  actions: ReadonlyArray<AppendPathRandomBlobAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/** Extract appended random-blob list from step actions; null when no `use-fields`. */
export function appendPathRandomBlobFieldsFromActions(
  actions: ReadonlyArray<AppendPathRandomBlobAction>,
): readonly Uint8Array[] | null {
  return firstActionOfKind(actions, "use-fields")?.randomBlobs ?? null;
}

/** Lightweight path-table step for sim: tracks hops per destination key. */
export interface PathTableState {
  readonly entries: ReadonlyMap<
    string,
    {
      readonly hops: number;
      readonly expires: number;
      readonly blobHex: string;
    }
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
  event: PathTableEvent,
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
          randomBlobs: [hexToBytes(existingEntry.blobHex)],
        };

  const shouldAdd = shouldAddPathEntry({
    hops: event.hops,
    randomBlob: event.randomBlob,
    nowSeconds: event.at,
    existing,
  });

  if (!shouldAdd) {
    return { state: { ...state, lastAdded: false }, intents: [] };
  }

  const entries = new Map(state.entries);
  entries.set(event.destinationKey, {
    hops: event.hops,
    expires: computePathExpiry(event.at),
    blobHex: bytesToHex(event.randomBlob),
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
