/**
 * Pure Identity ratchet persistence record (JSON over UTF-8).
 * Store IO and expiry clock stay at the adapter edge.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeIdentityRatchetRecord` / `decodeIdentityRatchetRecord` reads beside the step).
 * Lookup conclusions leave via machine actions (no ad-hoc
 * `planIdentityRatchetLookup` / `plan ===` reads beside the step).
 * Persist-to-store gate conclusions leave via machine actions (no ad-hoc
 * `shouldPersistIdentityRatchet` reads beside the step).
 * Usability gate conclusions leave via machine actions (no ad-hoc
 * `isIdentityRatchetRecordUsable` reads beside the step).
 * Commit-restored-ratchet apply gate conclusions leave via machine actions
 * (no ad-hoc `shouldRestoreIdentityRatchetRecord` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { bytesToHexLower, hexToBytesLower } from "./destination-name.js";
import { utf8Decode, utf8Encode } from "./utf8.js";
import { firstActionOfKind, hasActionOfKind } from "./action-kind.js";

/** RATCHET_SIZE (256 bits) / 8 */
export const IDENTITY_RATCHET_BYTES = 32;
/** Mirrors RNS Identity.RATCHET_EXPIRY */
export const IDENTITY_RATCHET_EXPIRY_SECONDS = 60 * 60 * 24 * 30;

export interface IdentityRatchetRecord {
  readonly ratchet: Uint8Array;
  readonly received: number;
}

export function identityRatchetStoreKey(destinationHashHex: string): string {
  return `ratchets/${destinationHashHex}`;
}

export function encodeIdentityRatchetRecord(
  record: IdentityRatchetRecord,
): Uint8Array {
  const json = JSON.stringify({
    ratchet: bytesToHexLower(record.ratchet),
    received: record.received,
  });
  return utf8Encode(json);
}

export function decodeIdentityRatchetRecord(
  bytes: Uint8Array,
): IdentityRatchetRecord {
  const parsed = JSON.parse(utf8Decode(bytes)) as {
    ratchet: string;
    received: number;
  };
  return {
    ratchet: hexToBytesLower(parsed.ratchet),
    received: parsed.received,
  };
}

/**
 * Identity-ratchet encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeIdentityRatchetRecord`
 * reads beside the step). Encode failures become `reject`.
 */
export type EncodeIdentityRatchetRecordState = Record<string, never>;

export type EncodeIdentityRatchetRecordEvent =
  | Event
  | {
      readonly kind: "identity-ratchet/encode-gate";
      readonly record: IdentityRatchetRecord;
    };

export type EncodeIdentityRatchetRecordAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface EncodeIdentityRatchetRecordStepResult {
  readonly state: EncodeIdentityRatchetRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeIdentityRatchetRecordAction[];
}

export function initialEncodeIdentityRatchetRecordState(): EncodeIdentityRatchetRecordState {
  return {};
}

export function stepEncodeIdentityRatchetRecordWithActions(
  state: EncodeIdentityRatchetRecordState,
  event: EncodeIdentityRatchetRecordEvent,
): EncodeIdentityRatchetRecordStepResult {
  if (event.kind === "identity-ratchet/encode-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: encodeIdentityRatchetRecord(event.record),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeIdentityRatchetRecord(
  actions: ReadonlyArray<EncodeIdentityRatchetRecordAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectEncodeIdentityRatchetRecord(
  actions: ReadonlyArray<EncodeIdentityRatchetRecordAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract encoded identity ratchet record from step actions; null when no `use-raw`. */
export function encodeIdentityRatchetRecordRawFromActions(
  actions: ReadonlyArray<EncodeIdentityRatchetRecordAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Identity-ratchet decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeIdentityRatchetRecord`
 * reads beside the step). Invalid JSON / hex become `reject`.
 */
export type DecodeIdentityRatchetRecordState = Record<string, never>;

export type DecodeIdentityRatchetRecordEvent =
  | Event
  | {
      readonly kind: "identity-ratchet/decode-gate";
      readonly bytes: Uint8Array;
    };

export type DecodeIdentityRatchetRecordAction =
  | { readonly kind: "use-fields"; readonly fields: IdentityRatchetRecord }
  | { readonly kind: "reject" };

export interface DecodeIdentityRatchetRecordStepResult {
  readonly state: DecodeIdentityRatchetRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeIdentityRatchetRecordAction[];
}

export function initialDecodeIdentityRatchetRecordState(): DecodeIdentityRatchetRecordState {
  return {};
}

export function stepDecodeIdentityRatchetRecordWithActions(
  state: DecodeIdentityRatchetRecordState,
  event: DecodeIdentityRatchetRecordEvent,
): DecodeIdentityRatchetRecordStepResult {
  if (event.kind === "identity-ratchet/decode-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-fields",
            fields: decodeIdentityRatchetRecord(event.bytes),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodeIdentityRatchetRecord(
  actions: ReadonlyArray<DecodeIdentityRatchetRecordAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectDecodeIdentityRatchetRecord(
  actions: ReadonlyArray<DecodeIdentityRatchetRecordAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract decoded identity ratchet record from step actions; null when no `use-fields`. */
export function identityRatchetRecordFromActions(
  actions: ReadonlyArray<DecodeIdentityRatchetRecordAction>,
): IdentityRatchetRecord | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}

export function isIdentityRatchetRecordUsable(
  record: IdentityRatchetRecord,
  nowSeconds: number,
  options: {
    readonly expirySeconds?: number;
    readonly ratchetBytes?: number;
  } = {},
): boolean {
  const expirySeconds =
    options.expirySeconds ?? IDENTITY_RATCHET_EXPIRY_SECONDS;
  const ratchetBytes = options.ratchetBytes ?? IDENTITY_RATCHET_BYTES;
  if (record.ratchet.length !== ratchetBytes) {
    return false;
  }
  return nowSeconds < record.received + expirySeconds;
}

/**
 * Identity-ratchet usability gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isIdentityRatchetRecordUsable`
 * reads beside the step).
 */
export type IdentityRatchetRecordUsableState = Record<string, never>;

export type IdentityRatchetRecordUsableEvent =
  | Event
  | {
      readonly kind: "identity-ratchet/usable-gate";
      readonly record: IdentityRatchetRecord;
      readonly nowSeconds: number;
      readonly expirySeconds?: number;
      readonly ratchetBytes?: number;
    };

export type IdentityRatchetRecordUsableAction =
  { readonly kind: "usable" } | { readonly kind: "unusable" };

export interface IdentityRatchetRecordUsableStepResult {
  readonly state: IdentityRatchetRecordUsableState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRatchetRecordUsableAction[];
}

export function initialIdentityRatchetRecordUsableState(): IdentityRatchetRecordUsableState {
  return {};
}

export function stepIdentityRatchetRecordUsableWithActions(
  state: IdentityRatchetRecordUsableState,
  event: IdentityRatchetRecordUsableEvent,
): IdentityRatchetRecordUsableStepResult {
  if (event.kind === "identity-ratchet/usable-gate") {
    const options =
      event.expirySeconds === undefined && event.ratchetBytes === undefined
        ? undefined
        : {
            ...(event.expirySeconds !== undefined
              ? { expirySeconds: event.expirySeconds }
              : {}),
            ...(event.ratchetBytes !== undefined
              ? { ratchetBytes: event.ratchetBytes }
              : {}),
          };
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isIdentityRatchetRecordUsable(
            event.record,
            event.nowSeconds,
            options ?? {},
          )
            ? "usable"
            : "unusable",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatIdentityRatchetRecordUsable(
  actions: ReadonlyArray<IdentityRatchetRecordUsableAction>,
): boolean {
  return hasActionOfKind(actions, "usable");
}

export function shouldTreatIdentityRatchetRecordUnusable(
  actions: ReadonlyArray<IdentityRatchetRecordUsableAction>,
): boolean {
  return hasActionOfKind(actions, "unusable");
}

export type IdentityRatchetLookupPlan =
  "use-cache" | "miss-no-store" | "miss-store" | "reject-unusable" | "restore";

/**
 * Ratchet lookup: cache hit, store absence/miss, unusable record, or restore.
 * Store get / Map set stay at the adapter (call again after store read).
 */
export function planIdentityRatchetLookup(input: {
  readonly cachedPresent: boolean;
  readonly storePresent: boolean;
  readonly storedPresent: boolean;
  readonly usable: boolean;
}): IdentityRatchetLookupPlan {
  if (input.cachedPresent) {
    return "use-cache";
  }
  if (!input.storePresent) {
    return "miss-no-store";
  }
  if (!input.storedPresent) {
    return "miss-store";
  }
  if (!input.usable) {
    return "reject-unusable";
  }
  return "restore";
}

/**
 * Identity-ratchet-lookup-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planIdentityRatchetLookup`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepIdentityRatchetLookupWithActions}.
 */
export type IdentityRatchetLookupPlanState = Record<string, never>;

export type IdentityRatchetLookupPlanEvent =
  | Event
  | {
      readonly kind: "identity/ratchet-lookup-plan-gate";
      readonly cachedPresent: boolean;
      readonly storePresent: boolean;
      readonly storedPresent: boolean;
      readonly usable: boolean;
    };

export type IdentityRatchetLookupPlanAction = {
  readonly kind: IdentityRatchetLookupPlan;
};

export interface IdentityRatchetLookupPlanStepResult {
  readonly state: IdentityRatchetLookupPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRatchetLookupPlanAction[];
}

export function initialIdentityRatchetLookupPlanState(): IdentityRatchetLookupPlanState {
  return {};
}

export function stepIdentityRatchetLookupPlanWithActions(
  state: IdentityRatchetLookupPlanState,
  event: IdentityRatchetLookupPlanEvent,
): IdentityRatchetLookupPlanStepResult {
  if (event.kind === "identity/ratchet-lookup-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planIdentityRatchetLookup({
            cachedPresent: event.cachedPresent,
            storePresent: event.storePresent,
            storedPresent: event.storedPresent,
            usable: event.usable,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the ratchet-lookup plan from actions; null when empty. */
export function identityRatchetLookupPlanFromActions(
  actions: ReadonlyArray<IdentityRatchetLookupPlanAction>,
): IdentityRatchetLookupPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "use-cache" ||
      entry.kind === "miss-no-store" ||
      entry.kind === "miss-store" ||
      entry.kind === "reject-unusable" ||
      entry.kind === "restore",
  );
  return action?.kind ?? null;
}

export function shouldUseCachedIdentityRatchetLookupPlan(
  actions: ReadonlyArray<IdentityRatchetLookupPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-cache");
}

export function shouldMissIdentityRatchetLookupPlanNoStore(
  actions: ReadonlyArray<IdentityRatchetLookupPlanAction>,
): boolean {
  return hasActionOfKind(actions, "miss-no-store");
}

export function shouldMissIdentityRatchetLookupPlanStore(
  actions: ReadonlyArray<IdentityRatchetLookupPlanAction>,
): boolean {
  return hasActionOfKind(actions, "miss-store");
}

export function shouldRejectIdentityRatchetLookupPlanUnusable(
  actions: ReadonlyArray<IdentityRatchetLookupPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unusable");
}

export function shouldRestoreIdentityRatchetLookupPlan(
  actions: ReadonlyArray<IdentityRatchetLookupPlanAction>,
): boolean {
  return hasActionOfKind(actions, "restore");
}

/**
 * Identity ratchet lookup gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepIdentityRatchetLookupPlanWithActions}
 * (`use-cache`|`miss-no-store`|`miss-store`|`reject-unusable`|`restore`).
 */
export type IdentityRatchetLookupState = Record<string, never>;

export type IdentityRatchetLookupEvent =
  | Event
  | {
      readonly kind: "identity/ratchet-lookup-gate";
      readonly cachedPresent: boolean;
      readonly storePresent: boolean;
      readonly storedPresent: boolean;
      readonly usable: boolean;
    };

/**
 * Adapter applies cache/store outcomes only from these actions.
 * Plan nested via {@link stepIdentityRatchetLookupPlanWithActions}
 * (`use-cache`|`miss-no-store`|`miss-store`|`reject-unusable`|`restore`).
 */
export type IdentityRatchetLookupAction = {
  readonly kind: IdentityRatchetLookupPlan;
};

export interface IdentityRatchetLookupStepResult {
  readonly state: IdentityRatchetLookupState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRatchetLookupAction[];
}

export function initialIdentityRatchetLookupState(): IdentityRatchetLookupState {
  return {};
}

export const stepIdentityRatchetLookup: StepFn<IdentityRatchetLookupState> = (
  state,
  event,
) => {
  const result = stepIdentityRatchetLookupInner(
    state,
    event as IdentityRatchetLookupEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepIdentityRatchetLookupWithActions(
  state: IdentityRatchetLookupState,
  event: IdentityRatchetLookupEvent,
): IdentityRatchetLookupStepResult {
  return stepIdentityRatchetLookupInner(state, event);
}

export function shouldUseCachedIdentityRatchet(
  actions: ReadonlyArray<IdentityRatchetLookupAction>,
): boolean {
  return hasActionOfKind(actions, "use-cache");
}

export function shouldMissIdentityRatchetNoStore(
  actions: ReadonlyArray<IdentityRatchetLookupAction>,
): boolean {
  return hasActionOfKind(actions, "miss-no-store");
}

export function shouldMissIdentityRatchetStore(
  actions: ReadonlyArray<IdentityRatchetLookupAction>,
): boolean {
  return hasActionOfKind(actions, "miss-store");
}

export function shouldRejectIdentityRatchetUnusable(
  actions: ReadonlyArray<IdentityRatchetLookupAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unusable");
}

export function shouldRestoreIdentityRatchetLookup(
  actions: ReadonlyArray<IdentityRatchetLookupAction>,
): boolean {
  return hasActionOfKind(actions, "restore");
}

function stepIdentityRatchetLookupInner(
  state: IdentityRatchetLookupState,
  event: IdentityRatchetLookupEvent,
): IdentityRatchetLookupStepResult {
  if (event.kind === "identity/ratchet-lookup-gate") {
    const planActions = stepIdentityRatchetLookupPlanWithActions(
      initialIdentityRatchetLookupPlanState(),
      {
        kind: "identity/ratchet-lookup-plan-gate",
        cachedPresent: event.cachedPresent,
        storePresent: event.storePresent,
        storedPresent: event.storedPresent,
        usable: event.usable,
      },
    ).actions;
    const plan = identityRatchetLookupPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether rememberRatchet should persist the record to an injected store. */
export function shouldPersistIdentityRatchet(storePresent: boolean): boolean {
  return storePresent;
}

/**
 * Identity ratchet persist-to-store gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldPersistIdentityRatchet` reads beside the step).
 */
export type PersistIdentityRatchetState = Record<string, never>;

export type PersistIdentityRatchetEvent =
  | Event
  | {
      readonly kind: "identity/persist-ratchet-gate";
      readonly storePresent: boolean;
    };

export type PersistIdentityRatchetAction =
  { readonly kind: "persist" } | { readonly kind: "skip" };

export interface PersistIdentityRatchetStepResult {
  readonly state: PersistIdentityRatchetState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PersistIdentityRatchetAction[];
}

export function initialPersistIdentityRatchetState(): PersistIdentityRatchetState {
  return {};
}

export function stepPersistIdentityRatchetWithActions(
  state: PersistIdentityRatchetState,
  event: PersistIdentityRatchetEvent,
): PersistIdentityRatchetStepResult {
  if (event.kind === "identity/persist-ratchet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldPersistIdentityRatchet(event.storePresent)
            ? "persist"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldPersistIdentityRatchetNow(
  actions: ReadonlyArray<PersistIdentityRatchetAction>,
): boolean {
  return hasActionOfKind(actions, "persist");
}

export function shouldSkipPersistIdentityRatchet(
  actions: ReadonlyArray<PersistIdentityRatchetAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Whether ratchet lookup may restore after restore actions and decoded
 * record bytes remain present.
 */
export function shouldRestoreIdentityRatchetRecord(input: {
  readonly planRestore: boolean;
  readonly recordPresent: boolean;
}): boolean {
  return input.planRestore && input.recordPresent;
}

/**
 * Commit-restored identity-ratchet apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldRestoreIdentityRatchetRecord` reads beside the step).
 */
export type CommitRestoredIdentityRatchetState = Record<string, never>;

export type CommitRestoredIdentityRatchetEvent =
  | Event
  | {
      readonly kind: "identity/commit-restored-ratchet-gate";
      readonly planRestore: boolean;
      readonly recordPresent: boolean;
    };

export type CommitRestoredIdentityRatchetAction =
  { readonly kind: "commit" } | { readonly kind: "skip" };

export interface CommitRestoredIdentityRatchetStepResult {
  readonly state: CommitRestoredIdentityRatchetState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitRestoredIdentityRatchetAction[];
}

export function initialCommitRestoredIdentityRatchetState(): CommitRestoredIdentityRatchetState {
  return {};
}

export function stepCommitRestoredIdentityRatchetWithActions(
  state: CommitRestoredIdentityRatchetState,
  event: CommitRestoredIdentityRatchetEvent,
): CommitRestoredIdentityRatchetStepResult {
  if (event.kind === "identity/commit-restored-ratchet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRestoreIdentityRatchetRecord({
            planRestore: event.planRestore,
            recordPresent: event.recordPresent,
          })
            ? "commit"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCommitRestoredIdentityRatchetNow(
  actions: ReadonlyArray<CommitRestoredIdentityRatchetAction>,
): boolean {
  return hasActionOfKind(actions, "commit");
}

export function shouldSkipCommitRestoredIdentityRatchet(
  actions: ReadonlyArray<CommitRestoredIdentityRatchetAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}
