/**
 * Pure web-identity storage framing: salt || iv || ciphertext.
 * PBKDF2 / AES-GCM stay at the WebCrypto adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packWebIdentityRecord` / `splitWebIdentityRecord` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const WEB_IDENTITY_SALT_BYTES = 16;
export const WEB_IDENTITY_IV_BYTES = 12;
/** Minimum AES-GCM auth tag length. */
export const WEB_IDENTITY_MIN_CIPHERTEXT_BYTES = 16;

export interface WebIdentityPackedFields {
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
}

export function packWebIdentityRecord(
  salt: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  if (salt.length !== WEB_IDENTITY_SALT_BYTES) {
    throw new Error(
      `web identity salt must be ${WEB_IDENTITY_SALT_BYTES} bytes`,
    );
  }
  if (iv.length !== WEB_IDENTITY_IV_BYTES) {
    throw new Error(`web identity iv must be ${WEB_IDENTITY_IV_BYTES} bytes`);
  }
  const packed = new Uint8Array(
    WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES + ciphertext.length,
  );
  packed.set(salt, 0);
  packed.set(iv, WEB_IDENTITY_SALT_BYTES);
  packed.set(ciphertext, WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES);
  return packed;
}

export function splitWebIdentityRecord(
  packed: Uint8Array,
): WebIdentityPackedFields {
  if (
    packed.length <
    WEB_IDENTITY_SALT_BYTES +
      WEB_IDENTITY_IV_BYTES +
      WEB_IDENTITY_MIN_CIPHERTEXT_BYTES
  ) {
    throw new Error("Stored web identity record is truncated");
  }
  return {
    salt: packed.subarray(0, WEB_IDENTITY_SALT_BYTES),
    iv: packed.subarray(
      WEB_IDENTITY_SALT_BYTES,
      WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES,
    ),
    ciphertext: packed.subarray(
      WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES,
    ),
  };
}

/**
 * Web-identity pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packWebIdentityRecord`
 * reads beside the step). Invalid salt/iv sizes become `reject`.
 */
export type PackWebIdentityRecordState = Record<string, never>;

export type PackWebIdentityRecordEvent =
  | Event
  | {
      readonly kind: "web-identity/pack-gate";
      readonly salt: Uint8Array;
      readonly iv: Uint8Array;
      readonly ciphertext: Uint8Array;
    };

export type PackWebIdentityRecordAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackWebIdentityRecordStepResult {
  readonly state: PackWebIdentityRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackWebIdentityRecordAction[];
}

export function initialPackWebIdentityRecordState(): PackWebIdentityRecordState {
  return {};
}

export function stepPackWebIdentityRecordWithActions(
  state: PackWebIdentityRecordState,
  event: PackWebIdentityRecordEvent,
): PackWebIdentityRecordStepResult {
  if (event.kind === "web-identity/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packWebIdentityRecord(event.salt, event.iv, event.ciphertext),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackWebIdentityRecord(
  actions: ReadonlyArray<PackWebIdentityRecordAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackWebIdentityRecord(
  actions: ReadonlyArray<PackWebIdentityRecordAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed web-identity record from step actions; null when no `use-raw`. */
export function packWebIdentityRecordRawFromActions(
  actions: ReadonlyArray<PackWebIdentityRecordAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Web-identity split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitWebIdentityRecord`
 * reads beside the step). Truncated records become `reject`.
 */
export type SplitWebIdentityRecordState = Record<string, never>;

export type SplitWebIdentityRecordEvent =
  | Event
  | {
      readonly kind: "web-identity/split-gate";
      readonly packed: Uint8Array;
    };

export type SplitWebIdentityRecordAction =
  | { readonly kind: "use-fields"; readonly fields: WebIdentityPackedFields }
  | { readonly kind: "reject" };

export interface SplitWebIdentityRecordStepResult {
  readonly state: SplitWebIdentityRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitWebIdentityRecordAction[];
}

export function initialSplitWebIdentityRecordState(): SplitWebIdentityRecordState {
  return {};
}

export function stepSplitWebIdentityRecordWithActions(
  state: SplitWebIdentityRecordState,
  event: SplitWebIdentityRecordEvent,
): SplitWebIdentityRecordStepResult {
  if (event.kind === "web-identity/split-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          { kind: "use-fields", fields: splitWebIdentityRecord(event.packed) },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitWebIdentityRecord(
  actions: ReadonlyArray<SplitWebIdentityRecordAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitWebIdentityRecord(
  actions: ReadonlyArray<SplitWebIdentityRecordAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split web-identity fields from step actions; null when no `use-fields`. */
export function webIdentityRecordFieldsFromActions(
  actions: ReadonlyArray<SplitWebIdentityRecordAction>,
): WebIdentityPackedFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
