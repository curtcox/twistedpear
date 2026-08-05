/** Extracted from identity-ciphertext.ts; the original module remains the public composition point. */
/**
 * Pure RNS Identity encrypt wire layout: ephemeral X25519 public || Token ciphertext.
 * ECDH / Token crypto stay at the adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packIdentityCiphertext` / `splitIdentityCiphertext` reads beside the step).
 * Decrypt / recall / recall-app-data conclusions leave via machine actions (no
 * ad-hoc `planIdentityDecryptOutcome` / `planIdentityRecall` /
 * `planIdentityRecallAppData` / `plan ===` reads beside the step).
 * Ciphertext-frame / decrypt-plaintext accept gates conclude via machine
 * actions (no ad-hoc `shouldAcceptIdentityCiphertextFrame` /
 * `shouldAcceptIdentityDecryptPlaintext` reads beside the step).
 * Hash / private-key / public-key / load-key / ratchet-decrypt-attempt gates
 * conclude via machine actions (no ad-hoc `canIdentityHash` /
 * `canIdentityUsePrivateKey` / `canIdentityUsePublicKey` /
 * `canLoadIdentityKeyMaterial` / `shouldAttemptIdentityRatchetDecrypt`
 * reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE = 32;

export interface IdentityCiphertextFields {
  readonly ephemeralPublicKey: Uint8Array;
  readonly tokenCiphertext: Uint8Array;
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

export function packIdentityCiphertext(
  ephemeralPublicKey: Uint8Array,
  tokenCiphertext: Uint8Array,
): Uint8Array {
  if (ephemeralPublicKey.length !== IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE) {
    throw new Error(
      `ephemeral public key must be ${IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE} bytes`,
    );
  }
  return concatBytes(ephemeralPublicKey, tokenCiphertext);
}

export function splitIdentityCiphertext(
  ciphertextToken: Uint8Array,
): IdentityCiphertextFields | null {
  if (ciphertextToken.length <= IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE) {
    return null;
  }
  return {
    ephemeralPublicKey: ciphertextToken.subarray(
      0,
      IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
    ),
    tokenCiphertext: ciphertextToken.subarray(
      IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
    ),
  };
}

/**
 * Identity-ciphertext pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packIdentityCiphertext` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackIdentityCiphertextState = Record<string, never>;

export type PackIdentityCiphertextEvent =
  | Event
  | {
      readonly kind: "identity-ciphertext/pack-gate";
      readonly ephemeralPublicKey: Uint8Array;
      readonly tokenCiphertext: Uint8Array;
    };

export type PackIdentityCiphertextAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackIdentityCiphertextStepResult {
  readonly state: PackIdentityCiphertextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackIdentityCiphertextAction[];
}

export function initialPackIdentityCiphertextState(): PackIdentityCiphertextState {
  return {};
}

export function stepPackIdentityCiphertextWithActions(
  state: PackIdentityCiphertextState,
  event: PackIdentityCiphertextEvent,
): PackIdentityCiphertextStepResult {
  if (event.kind === "identity-ciphertext/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packIdentityCiphertext(
              event.ephemeralPublicKey,
              event.tokenCiphertext,
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

export function shouldUsePackIdentityCiphertext(
  actions: ReadonlyArray<PackIdentityCiphertextAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackIdentityCiphertext(
  actions: ReadonlyArray<PackIdentityCiphertextAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed identity ciphertext from step actions; null when no `use-raw`. */
export function packIdentityCiphertextRawFromActions(
  actions: ReadonlyArray<PackIdentityCiphertextAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Identity-ciphertext split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitIdentityCiphertext` reads
 * beside the step). Short frames become `reject`.
 */
export type SplitIdentityCiphertextState = Record<string, never>;

export type SplitIdentityCiphertextEvent =
  | Event
  | {
      readonly kind: "identity-ciphertext/split-gate";
      readonly ciphertextToken: Uint8Array;
    };

export type SplitIdentityCiphertextAction =
  | { readonly kind: "use-fields"; readonly fields: IdentityCiphertextFields }
  | { readonly kind: "reject" };

export interface SplitIdentityCiphertextStepResult {
  readonly state: SplitIdentityCiphertextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitIdentityCiphertextAction[];
}

export function initialSplitIdentityCiphertextState(): SplitIdentityCiphertextState {
  return {};
}

export function stepSplitIdentityCiphertextWithActions(
  state: SplitIdentityCiphertextState,
  event: SplitIdentityCiphertextEvent,
): SplitIdentityCiphertextStepResult {
  if (event.kind === "identity-ciphertext/split-gate") {
    const fields = splitIdentityCiphertext(event.ciphertextToken);
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

export function shouldUseSplitIdentityCiphertext(
  actions: ReadonlyArray<SplitIdentityCiphertextAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitIdentityCiphertext(
  actions: ReadonlyArray<SplitIdentityCiphertextAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split identity-ciphertext fields from step actions; null when no `use-fields`. */
export function identityCiphertextFieldsFromActions(
  actions: ReadonlyArray<SplitIdentityCiphertextAction>,
): IdentityCiphertextFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/** Whether identity ciphertext split succeeded and may drive decrypt. */
export function shouldAcceptIdentityCiphertextFrame(splitOk: boolean): boolean {
  return splitOk;
}

/**
 * Identity ciphertext-frame accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptIdentityCiphertextFrame` reads beside the step).
 */
export type AcceptIdentityCiphertextFrameState = Record<string, never>;

export type AcceptIdentityCiphertextFrameEvent =
  | Event
  | {
      readonly kind: "identity-ciphertext/accept-frame-gate";
      readonly splitOk: boolean;
    };

export type AcceptIdentityCiphertextFrameAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptIdentityCiphertextFrameStepResult {
  readonly state: AcceptIdentityCiphertextFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptIdentityCiphertextFrameAction[];
}

export function initialAcceptIdentityCiphertextFrameState(): AcceptIdentityCiphertextFrameState {
  return {};
}

export function stepAcceptIdentityCiphertextFrameWithActions(
  state: AcceptIdentityCiphertextFrameState,
  event: AcceptIdentityCiphertextFrameEvent,
): AcceptIdentityCiphertextFrameStepResult {
  if (event.kind === "identity-ciphertext/accept-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptIdentityCiphertextFrame(event.splitOk)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptIdentityCiphertextFrameNow(
  actions: ReadonlyArray<AcceptIdentityCiphertextFrameAction>,
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipIdentityCiphertextFrameAccept(
  actions: ReadonlyArray<AcceptIdentityCiphertextFrameAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether identity decrypt may return accepted plaintext after plan outcome. */
export function shouldAcceptIdentityDecryptPlaintext(
  planAccept: boolean,
): boolean {
  return planAccept;
}

/**
 * Identity decrypt-plaintext accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptIdentityDecryptPlaintext` reads beside the step).
 */
export type AcceptIdentityDecryptPlaintextState = Record<string, never>;

export type AcceptIdentityDecryptPlaintextEvent =
  | Event
  | {
      readonly kind: "identity-ciphertext/accept-plaintext-gate";
      readonly planAccept: boolean;
    };

export type AcceptIdentityDecryptPlaintextAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptIdentityDecryptPlaintextStepResult {
  readonly state: AcceptIdentityDecryptPlaintextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptIdentityDecryptPlaintextAction[];
}

export function initialAcceptIdentityDecryptPlaintextState(): AcceptIdentityDecryptPlaintextState {
  return {};
}

export function stepAcceptIdentityDecryptPlaintextWithActions(
  state: AcceptIdentityDecryptPlaintextState,
  event: AcceptIdentityDecryptPlaintextEvent,
): AcceptIdentityDecryptPlaintextStepResult {
  if (event.kind === "identity-ciphertext/accept-plaintext-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptIdentityDecryptPlaintext(event.planAccept)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptIdentityDecryptPlaintextNow(
  actions: ReadonlyArray<AcceptIdentityDecryptPlaintextAction>,
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipIdentityDecryptPlaintextAccept(
  actions: ReadonlyArray<AcceptIdentityDecryptPlaintextAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type IdentityDecryptPlan =
  "reject-frame" | "accept" | "reject-enforced" | "try-identity" | "reject";

/**
 * After ciphertext frame split and optional ratchet decrypt attempts.
 * Identity-key ECDH / Token stay at the adapter when the plan is try-identity.
 */
export function planIdentityDecryptOutcome(input: {
  readonly frameOk: boolean;
  readonly ratchetPlaintextPresent: boolean;
  readonly enforceRatchets: boolean;
  readonly identityFallbackDone: boolean;
  readonly identityPlaintextPresent: boolean;
}): IdentityDecryptPlan {
  if (!input.frameOk) {
    return "reject-frame";
  }
  if (input.ratchetPlaintextPresent) {
    return "accept";
  }
  if (input.enforceRatchets) {
    return "reject-enforced";
  }
  if (!input.identityFallbackDone) {
    return "try-identity";
  }
  if (input.identityPlaintextPresent) {
    return "accept";
  }
  return "reject";
}

export type IdentityDecryptOutcomePlanEvent =
  | Event
  | {
      readonly kind: "identity/decrypt-outcome-plan-gate";
      readonly frameOk: boolean;
      readonly ratchetPlaintextPresent: boolean;
      readonly enforceRatchets: boolean;
      readonly identityFallbackDone: boolean;
      readonly identityPlaintextPresent: boolean;
    };

export type IdentityDecryptOutcomePlanAction = {
  readonly kind: IdentityDecryptPlan;
};

/** Extract the decrypt plan from actions; null when empty. */
export function identityDecryptOutcomePlanFromActions(
  actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>,
): IdentityDecryptPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "reject-frame" ||
      entry.kind === "accept" ||
      entry.kind === "reject-enforced" ||
      entry.kind === "try-identity" ||
      entry.kind === "reject",
  );
  return action?.kind ?? null;
}

export type IdentityDecryptEvent =
  | Event
  | {
      readonly kind: "identity/decrypt-gate";
      readonly frameOk: boolean;
      readonly ratchetPlaintextPresent: boolean;
      readonly enforceRatchets: boolean;
      readonly identityFallbackDone: boolean;
      readonly identityPlaintextPresent: boolean;
    };
