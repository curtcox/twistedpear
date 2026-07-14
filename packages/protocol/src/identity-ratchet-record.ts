/**
 * Pure Identity ratchet persistence record (JSON over UTF-8).
 * Store IO and expiry clock stay at the adapter edge.
 * Lookup conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { bytesToHexLower, hexToBytesLower } from "./destination-name.js";
import { utf8Decode, utf8Encode } from "./utf8.js";

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

export function encodeIdentityRatchetRecord(record: IdentityRatchetRecord): Uint8Array {
  const json = JSON.stringify({
    ratchet: bytesToHexLower(record.ratchet),
    received: record.received
  });
  return utf8Encode(json);
}

export function decodeIdentityRatchetRecord(bytes: Uint8Array): IdentityRatchetRecord {
  const parsed = JSON.parse(utf8Decode(bytes)) as {
    ratchet: string;
    received: number;
  };
  return {
    ratchet: hexToBytesLower(parsed.ratchet),
    received: parsed.received
  };
}

export function isIdentityRatchetRecordUsable(
  record: IdentityRatchetRecord,
  nowSeconds: number,
  options: {
    readonly expirySeconds?: number;
    readonly ratchetBytes?: number;
  } = {}
): boolean {
  const expirySeconds = options.expirySeconds ?? IDENTITY_RATCHET_EXPIRY_SECONDS;
  const ratchetBytes = options.ratchetBytes ?? IDENTITY_RATCHET_BYTES;
  if (record.ratchet.length !== ratchetBytes) {
    return false;
  }
  return nowSeconds < record.received + expirySeconds;
}

export type IdentityRatchetLookupPlan =
  | "use-cache"
  | "miss-no-store"
  | "miss-store"
  | "reject-unusable"
  | "restore";

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
 * Identity ratchet lookup gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
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

export type IdentityRatchetLookupAction = { readonly kind: IdentityRatchetLookupPlan };

export interface IdentityRatchetLookupStepResult {
  readonly state: IdentityRatchetLookupState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRatchetLookupAction[];
}

export function initialIdentityRatchetLookupState(): IdentityRatchetLookupState {
  return {};
}

export const stepIdentityRatchetLookup: StepFn<IdentityRatchetLookupState> = (state, event) => {
  const result = stepIdentityRatchetLookupInner(state, event as IdentityRatchetLookupEvent);
  return { state: result.state, intents: result.intents };
};

export function stepIdentityRatchetLookupWithActions(
  state: IdentityRatchetLookupState,
  event: IdentityRatchetLookupEvent
): IdentityRatchetLookupStepResult {
  return stepIdentityRatchetLookupInner(state, event);
}

export function shouldUseCachedIdentityRatchet(
  actions: ReadonlyArray<IdentityRatchetLookupAction>
): boolean {
  return actions.some((action) => action.kind === "use-cache");
}

export function shouldMissIdentityRatchetNoStore(
  actions: ReadonlyArray<IdentityRatchetLookupAction>
): boolean {
  return actions.some((action) => action.kind === "miss-no-store");
}

export function shouldMissIdentityRatchetStore(
  actions: ReadonlyArray<IdentityRatchetLookupAction>
): boolean {
  return actions.some((action) => action.kind === "miss-store");
}

export function shouldRejectIdentityRatchetUnusable(
  actions: ReadonlyArray<IdentityRatchetLookupAction>
): boolean {
  return actions.some((action) => action.kind === "reject-unusable");
}

export function shouldRestoreIdentityRatchetLookup(
  actions: ReadonlyArray<IdentityRatchetLookupAction>
): boolean {
  return actions.some((action) => action.kind === "restore");
}

function stepIdentityRatchetLookupInner(
  state: IdentityRatchetLookupState,
  event: IdentityRatchetLookupEvent
): IdentityRatchetLookupStepResult {
  if (event.kind === "identity/ratchet-lookup-gate") {
    const plan = planIdentityRatchetLookup({
      cachedPresent: event.cachedPresent,
      storePresent: event.storePresent,
      storedPresent: event.storedPresent,
      usable: event.usable
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether rememberRatchet should persist the record to an injected store. */
export function shouldPersistIdentityRatchet(storePresent: boolean): boolean {
  return storePresent;
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

/** Whether restore actions may apply when decoded record bytes remain present. */
export function shouldCommitRestoredIdentityRatchet(
  actions: ReadonlyArray<IdentityRatchetLookupAction>,
  recordPresent: boolean
): boolean {
  return shouldRestoreIdentityRatchetRecord({
    planRestore: shouldRestoreIdentityRatchetLookup(actions),
    recordPresent
  });
}
