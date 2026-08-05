/**
 * Pure Identity private-key material extraction from injected entropy.
 * Public-key derivation stays at the crypto adapter edge.
 * Entropy-split and pack / split conclusions leave via machine actions (no
 * ad-hoc `splitIdentityEntropy` / `packIdentityPrivateKey` /
 * `packIdentityPublicKey` / `splitIdentityPrivateKey` /
 * `splitIdentityPublicKey` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const IDENTITY_HALF_KEY_SIZE = 32;
export const IDENTITY_KEY_SIZE = IDENTITY_HALF_KEY_SIZE * 2;
export const IDENTITY_KEY_ENTROPY_SIZE = IDENTITY_KEY_SIZE;

export interface IdentityKeyMaterial {
  readonly privateKey: Uint8Array;
  readonly signaturePrivateKey: Uint8Array;
}

export interface IdentityPublicKeyMaterial {
  readonly publicKey: Uint8Array;
  readonly signaturePublicKey: Uint8Array;
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function splitIdentityEntropy(entropy: Uint8Array): IdentityKeyMaterial {
  if (entropy.length < IDENTITY_KEY_ENTROPY_SIZE) {
    throw new Error(
      `Identity key entropy must be at least ${IDENTITY_KEY_ENTROPY_SIZE} bytes`,
    );
  }
  return {
    privateKey: Uint8Array.from(entropy.subarray(0, IDENTITY_HALF_KEY_SIZE)),
    signaturePrivateKey: Uint8Array.from(
      entropy.subarray(IDENTITY_HALF_KEY_SIZE, IDENTITY_KEY_ENTROPY_SIZE),
    ),
  };
}

/**
 * Identity keygen entropy split is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitIdentityEntropy`
 * reads beside the step). Undersized entropy becomes `reject`.
 */
export type SplitIdentityEntropyState = Record<string, never>;

export type SplitIdentityEntropyEvent =
  | Event
  | {
      readonly kind: "identity-key/split-entropy-gate";
      readonly entropy: Uint8Array;
    };

export type SplitIdentityEntropyAction =
  | { readonly kind: "use-fields"; readonly fields: IdentityKeyMaterial }
  | { readonly kind: "reject" };

export interface SplitIdentityEntropyStepResult {
  readonly state: SplitIdentityEntropyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitIdentityEntropyAction[];
}

export function initialSplitIdentityEntropyState(): SplitIdentityEntropyState {
  return {};
}

export function stepSplitIdentityEntropyWithActions(
  state: SplitIdentityEntropyState,
  event: SplitIdentityEntropyEvent,
): SplitIdentityEntropyStepResult {
  if (event.kind === "identity-key/split-entropy-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          { kind: "use-fields", fields: splitIdentityEntropy(event.entropy) },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitIdentityEntropy(
  actions: ReadonlyArray<SplitIdentityEntropyAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitIdentityEntropy(
  actions: ReadonlyArray<SplitIdentityEntropyAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract identity key material from step actions; null when no `use-fields`. */
export function identityEntropyFieldsFromActions(
  actions: ReadonlyArray<SplitIdentityEntropyAction>,
): IdentityKeyMaterial | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

export function packIdentityPrivateKey(
  privateKey: Uint8Array,
  signaturePrivateKey: Uint8Array,
): Uint8Array {
  if (privateKey.length !== IDENTITY_HALF_KEY_SIZE) {
    throw new Error(
      `identity private key must be ${IDENTITY_HALF_KEY_SIZE} bytes`,
    );
  }
  if (signaturePrivateKey.length !== IDENTITY_HALF_KEY_SIZE) {
    throw new Error(
      `identity signature private key must be ${IDENTITY_HALF_KEY_SIZE} bytes`,
    );
  }
  return concatBytes(privateKey, signaturePrivateKey);
}

export function splitIdentityPrivateKey(
  privateKeyBytes: Uint8Array,
): IdentityKeyMaterial | null {
  if (privateKeyBytes.length !== IDENTITY_KEY_SIZE) {
    return null;
  }
  return {
    privateKey: privateKeyBytes.subarray(0, IDENTITY_HALF_KEY_SIZE),
    signaturePrivateKey: privateKeyBytes.subarray(IDENTITY_HALF_KEY_SIZE),
  };
}

export function packIdentityPublicKey(
  publicKey: Uint8Array,
  signaturePublicKey: Uint8Array,
): Uint8Array {
  if (publicKey.length !== IDENTITY_HALF_KEY_SIZE) {
    throw new Error(
      `identity public key must be ${IDENTITY_HALF_KEY_SIZE} bytes`,
    );
  }
  if (signaturePublicKey.length !== IDENTITY_HALF_KEY_SIZE) {
    throw new Error(
      `identity signature public key must be ${IDENTITY_HALF_KEY_SIZE} bytes`,
    );
  }
  return concatBytes(publicKey, signaturePublicKey);
}

export function splitIdentityPublicKey(
  publicKeyBytes: Uint8Array,
): IdentityPublicKeyMaterial | null {
  if (publicKeyBytes.length !== IDENTITY_KEY_SIZE) {
    return null;
  }
  return {
    publicKey: publicKeyBytes.subarray(0, IDENTITY_HALF_KEY_SIZE),
    signaturePublicKey: publicKeyBytes.subarray(IDENTITY_HALF_KEY_SIZE),
  };
}

/**
 * Identity private-key pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packIdentityPrivateKey` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackIdentityPrivateKeyState = Record<string, never>;

export type PackIdentityPrivateKeyEvent =
  | Event
  | {
      readonly kind: "identity-key/pack-private-gate";
      readonly privateKey: Uint8Array;
      readonly signaturePrivateKey: Uint8Array;
    };

export type PackIdentityPrivateKeyAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackIdentityPrivateKeyStepResult {
  readonly state: PackIdentityPrivateKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackIdentityPrivateKeyAction[];
}

export function initialPackIdentityPrivateKeyState(): PackIdentityPrivateKeyState {
  return {};
}

export function stepPackIdentityPrivateKeyWithActions(
  state: PackIdentityPrivateKeyState,
  event: PackIdentityPrivateKeyEvent,
): PackIdentityPrivateKeyStepResult {
  if (event.kind === "identity-key/pack-private-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packIdentityPrivateKey(
              event.privateKey,
              event.signaturePrivateKey,
            ),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackIdentityPrivateKey(
  actions: ReadonlyArray<PackIdentityPrivateKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackIdentityPrivateKey(
  actions: ReadonlyArray<PackIdentityPrivateKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed identity private key from step actions; null when no `use-raw`. */
export function packIdentityPrivateKeyRawFromActions(
  actions: ReadonlyArray<PackIdentityPrivateKeyAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Identity private-key split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitIdentityPrivateKey` reads
 * beside the step). Wrong lengths become `reject`.
 */
export type SplitIdentityPrivateKeyState = Record<string, never>;

export type SplitIdentityPrivateKeyEvent =
  | Event
  | {
      readonly kind: "identity-key/split-private-gate";
      readonly privateKeyBytes: Uint8Array;
    };

export type SplitIdentityPrivateKeyAction =
  | { readonly kind: "use-fields"; readonly fields: IdentityKeyMaterial }
  | { readonly kind: "reject" };

export interface SplitIdentityPrivateKeyStepResult {
  readonly state: SplitIdentityPrivateKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitIdentityPrivateKeyAction[];
}

export function initialSplitIdentityPrivateKeyState(): SplitIdentityPrivateKeyState {
  return {};
}

export function stepSplitIdentityPrivateKeyWithActions(
  state: SplitIdentityPrivateKeyState,
  event: SplitIdentityPrivateKeyEvent,
): SplitIdentityPrivateKeyStepResult {
  if (event.kind === "identity-key/split-private-gate") {
    const fields = splitIdentityPrivateKey(event.privateKeyBytes);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitIdentityPrivateKey(
  actions: ReadonlyArray<SplitIdentityPrivateKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitIdentityPrivateKey(
  actions: ReadonlyArray<SplitIdentityPrivateKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split identity private-key fields from step actions; null when no `use-fields`. */
export function identityPrivateKeyFieldsFromActions(
  actions: ReadonlyArray<SplitIdentityPrivateKeyAction>,
): IdentityKeyMaterial | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Identity public-key pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packIdentityPublicKey` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackIdentityPublicKeyState = Record<string, never>;

export type PackIdentityPublicKeyEvent =
  | Event
  | {
      readonly kind: "identity-key/pack-public-gate";
      readonly publicKey: Uint8Array;
      readonly signaturePublicKey: Uint8Array;
    };

export type PackIdentityPublicKeyAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackIdentityPublicKeyStepResult {
  readonly state: PackIdentityPublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackIdentityPublicKeyAction[];
}

export function initialPackIdentityPublicKeyState(): PackIdentityPublicKeyState {
  return {};
}

export function stepPackIdentityPublicKeyWithActions(
  state: PackIdentityPublicKeyState,
  event: PackIdentityPublicKeyEvent,
): PackIdentityPublicKeyStepResult {
  if (event.kind === "identity-key/pack-public-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packIdentityPublicKey(
              event.publicKey,
              event.signaturePublicKey,
            ),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackIdentityPublicKey(
  actions: ReadonlyArray<PackIdentityPublicKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackIdentityPublicKey(
  actions: ReadonlyArray<PackIdentityPublicKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed identity public key from step actions; null when no `use-raw`. */
export function packIdentityPublicKeyRawFromActions(
  actions: ReadonlyArray<PackIdentityPublicKeyAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Identity public-key split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitIdentityPublicKey` reads
 * beside the step). Wrong lengths become `reject`.
 */
export type SplitIdentityPublicKeyState = Record<string, never>;

export type SplitIdentityPublicKeyEvent =
  | Event
  | {
      readonly kind: "identity-key/split-public-gate";
      readonly publicKeyBytes: Uint8Array;
    };

export type SplitIdentityPublicKeyAction =
  | { readonly kind: "use-fields"; readonly fields: IdentityPublicKeyMaterial }
  | { readonly kind: "reject" };

export interface SplitIdentityPublicKeyStepResult {
  readonly state: SplitIdentityPublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitIdentityPublicKeyAction[];
}

export function initialSplitIdentityPublicKeyState(): SplitIdentityPublicKeyState {
  return {};
}

export function stepSplitIdentityPublicKeyWithActions(
  state: SplitIdentityPublicKeyState,
  event: SplitIdentityPublicKeyEvent,
): SplitIdentityPublicKeyStepResult {
  if (event.kind === "identity-key/split-public-gate") {
    const fields = splitIdentityPublicKey(event.publicKeyBytes);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitIdentityPublicKey(
  actions: ReadonlyArray<SplitIdentityPublicKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitIdentityPublicKey(
  actions: ReadonlyArray<SplitIdentityPublicKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split identity public-key fields from step actions; null when no `use-fields`. */
export function identityPublicKeyFieldsFromActions(
  actions: ReadonlyArray<SplitIdentityPublicKeyAction>,
): IdentityPublicKeyMaterial | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
