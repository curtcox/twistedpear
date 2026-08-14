/**
 * Pure PKCS#7 padding (RNS Token / AES-CBC).
 * Pad / unpad conclusions leave via machine actions (no ad-hoc
 * `pkcs7Pad` / `pkcs7Unpad` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { firstActionOfKind, hasActionOfKind } from "./action-kind.js";

export const PKCS7_BLOCK_SIZE = 16;

export function pkcs7Pad(
  data: Uint8Array,
  blockSize: number = PKCS7_BLOCK_SIZE,
): Uint8Array {
  const remainder = data.length % blockSize;
  const paddingLength = blockSize - remainder;
  const padded = new Uint8Array(data.length + paddingLength);
  padded.set(data);
  padded.fill(paddingLength, data.length);
  return padded;
}

export function pkcs7Unpad(
  data: Uint8Array,
  blockSize: number = PKCS7_BLOCK_SIZE,
): Uint8Array {
  if (data.length === 0) {
    throw new Error("Cannot unpad empty data");
  }

  const paddingLength = data[data.length - 1]!;
  if (paddingLength > blockSize || paddingLength === 0) {
    throw new Error(
      `Cannot unpad, invalid padding length of ${paddingLength} bytes`,
    );
  }

  return data.subarray(0, data.length - paddingLength);
}

/**
 * PKCS#7 pad framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `pkcs7Pad` reads
 * beside the step).
 */
export type PackPkcs7State = Record<string, never>;

export type PackPkcs7Event =
  | Event
  | {
      readonly kind: "pkcs7/pad-gate";
      readonly data: Uint8Array;
      readonly blockSize?: number;
    };

export type PackPkcs7Action = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackPkcs7StepResult {
  readonly state: PackPkcs7State;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPkcs7Action[];
}

export function initialPackPkcs7State(): PackPkcs7State {
  return {};
}

export function stepPkcs7PadWithActions(
  state: PackPkcs7State,
  event: PackPkcs7Event,
): PackPkcs7StepResult {
  if (event.kind === "pkcs7/pad-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: pkcs7Pad(event.data, event.blockSize ?? PKCS7_BLOCK_SIZE),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePkcs7Pad(
  actions: ReadonlyArray<PackPkcs7Action>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract padded bytes from step actions; null when no `use-raw`. */
export function pkcs7PadRawFromActions(
  actions: ReadonlyArray<PackPkcs7Action>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * PKCS#7 unpad framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `pkcs7Unpad` reads
 * beside the step). Empty / invalid padding become `reject`.
 */
export type UnpackPkcs7State = Record<string, never>;

export type UnpackPkcs7Event =
  | Event
  | {
      readonly kind: "pkcs7/unpad-gate";
      readonly data: Uint8Array;
      readonly blockSize?: number;
    };

export type UnpackPkcs7Action =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface UnpackPkcs7StepResult {
  readonly state: UnpackPkcs7State;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackPkcs7Action[];
}

export function initialUnpackPkcs7State(): UnpackPkcs7State {
  return {};
}

export function stepPkcs7UnpadWithActions(
  state: UnpackPkcs7State,
  event: UnpackPkcs7Event,
): UnpackPkcs7StepResult {
  if (event.kind === "pkcs7/unpad-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: pkcs7Unpad(event.data, event.blockSize ?? PKCS7_BLOCK_SIZE),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePkcs7Unpad(
  actions: ReadonlyArray<UnpackPkcs7Action>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectPkcs7Unpad(
  actions: ReadonlyArray<UnpackPkcs7Action>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract unpadded bytes from step actions; null when no `use-raw`. */
export function pkcs7UnpadRawFromActions(
  actions: ReadonlyArray<UnpackPkcs7Action>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}
