/**
 * Pure RNS Identity encrypt wire layout: ephemeral X25519 public || Token ciphertext.
 * ECDH / Token crypto stay at the adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packIdentityCiphertext` / `splitIdentityCiphertext` reads beside the step).
 * Decrypt conclusions leave via machine actions (no ad-hoc plan reads beside the step).
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
  tokenCiphertext: Uint8Array
): Uint8Array {
  if (ephemeralPublicKey.length !== IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE) {
    throw new Error(
      `ephemeral public key must be ${IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE} bytes`
    );
  }
  return concatBytes(ephemeralPublicKey, tokenCiphertext);
}

export function splitIdentityCiphertext(
  ciphertextToken: Uint8Array
): IdentityCiphertextFields | null {
  if (ciphertextToken.length <= IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE) {
    return null;
  }
  return {
    ephemeralPublicKey: ciphertextToken.subarray(0, IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE),
    tokenCiphertext: ciphertextToken.subarray(IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE)
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
  event: PackIdentityCiphertextEvent
): PackIdentityCiphertextStepResult {
  if (event.kind === "identity-ciphertext/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packIdentityCiphertext(event.ephemeralPublicKey, event.tokenCiphertext)
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackIdentityCiphertext(
  actions: ReadonlyArray<PackIdentityCiphertextAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackIdentityCiphertext(
  actions: ReadonlyArray<PackIdentityCiphertextAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed identity ciphertext from step actions; null when no `use-raw`. */
export function packIdentityCiphertextRawFromActions(
  actions: ReadonlyArray<PackIdentityCiphertextAction>
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
  event: SplitIdentityCiphertextEvent
): SplitIdentityCiphertextStepResult {
  if (event.kind === "identity-ciphertext/split-gate") {
    const fields = splitIdentityCiphertext(event.ciphertextToken);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitIdentityCiphertext(
  actions: ReadonlyArray<SplitIdentityCiphertextAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitIdentityCiphertext(
  actions: ReadonlyArray<SplitIdentityCiphertextAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split identity-ciphertext fields from step actions; null when no `use-fields`. */
export function identityCiphertextFieldsFromActions(
  actions: ReadonlyArray<SplitIdentityCiphertextAction>
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
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

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
  event: AcceptIdentityCiphertextFrameEvent
): AcceptIdentityCiphertextFrameStepResult {
  if (event.kind === "identity-ciphertext/accept-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptIdentityCiphertextFrame(event.splitOk) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptIdentityCiphertextFrameNow(
  actions: ReadonlyArray<AcceptIdentityCiphertextFrameAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipIdentityCiphertextFrameAccept(
  actions: ReadonlyArray<AcceptIdentityCiphertextFrameAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether identity decrypt may return accepted plaintext after plan outcome. */
export function shouldAcceptIdentityDecryptPlaintext(planAccept: boolean): boolean {
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
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

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
  event: AcceptIdentityDecryptPlaintextEvent
): AcceptIdentityDecryptPlaintextStepResult {
  if (event.kind === "identity-ciphertext/accept-plaintext-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptIdentityDecryptPlaintext(event.planAccept) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptIdentityDecryptPlaintextNow(
  actions: ReadonlyArray<AcceptIdentityDecryptPlaintextAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipIdentityDecryptPlaintextAccept(
  actions: ReadonlyArray<AcceptIdentityDecryptPlaintextAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type IdentityDecryptPlan =
  | "reject-frame"
  | "accept"
  | "reject-enforced"
  | "try-identity"
  | "reject";

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

/**
 * Identity decrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type IdentityDecryptState = Record<string, never>;

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

export type IdentityDecryptAction = { readonly kind: IdentityDecryptPlan };

export interface IdentityDecryptStepResult {
  readonly state: IdentityDecryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityDecryptAction[];
}

export function initialIdentityDecryptState(): IdentityDecryptState {
  return {};
}

export const stepIdentityDecrypt: StepFn<IdentityDecryptState> = (state, event) => {
  const result = stepIdentityDecryptInner(state, event as IdentityDecryptEvent);
  return { state: result.state, intents: result.intents };
};

export function stepIdentityDecryptWithActions(
  state: IdentityDecryptState,
  event: IdentityDecryptEvent
): IdentityDecryptStepResult {
  return stepIdentityDecryptInner(state, event);
}

export function shouldRejectIdentityDecryptFrame(
  actions: ReadonlyArray<IdentityDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "reject-frame");
}

export function shouldRejectIdentityDecryptEnforced(
  actions: ReadonlyArray<IdentityDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "reject-enforced");
}

export function shouldAcceptIdentityDecrypt(
  actions: ReadonlyArray<IdentityDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldTryIdentityDecrypt(
  actions: ReadonlyArray<IdentityDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "try-identity");
}

export function shouldRejectIdentityDecrypt(
  actions: ReadonlyArray<IdentityDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

function stepIdentityDecryptInner(
  state: IdentityDecryptState,
  event: IdentityDecryptEvent
): IdentityDecryptStepResult {
  if (event.kind === "identity/decrypt-gate") {
    const plan = planIdentityDecryptOutcome({
      frameOk: event.frameOk,
      ratchetPlaintextPresent: event.ratchetPlaintextPresent,
      enforceRatchets: event.enforceRatchets,
      identityFallbackDone: event.identityFallbackDone,
      identityPlaintextPresent: event.identityPlaintextPresent
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type IdentityRecallPlan = "miss" | "reject-key" | "hit";

/**
 * Known-destination recall: miss, public-key load failure, or hit.
 * Identity construction / loadPublicKey stay at the adapter.
 */
export function planIdentityRecall(input: {
  readonly recordPresent: boolean;
  readonly publicKeyLoaded: boolean;
}): IdentityRecallPlan {
  if (!input.recordPresent) {
    return "miss";
  }
  if (!input.publicKeyLoaded) {
    return "reject-key";
  }
  return "hit";
}

/**
 * Identity recall gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type IdentityRecallState = Record<string, never>;

export type IdentityRecallEvent =
  | Event
  | {
      readonly kind: "identity/recall-gate";
      readonly recordPresent: boolean;
      readonly publicKeyLoaded: boolean;
    };

export type IdentityRecallAction = { readonly kind: IdentityRecallPlan };

export interface IdentityRecallStepResult {
  readonly state: IdentityRecallState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallAction[];
}

export function initialIdentityRecallState(): IdentityRecallState {
  return {};
}

export const stepIdentityRecall: StepFn<IdentityRecallState> = (state, event) => {
  const result = stepIdentityRecallInner(state, event as IdentityRecallEvent);
  return { state: result.state, intents: result.intents };
};

export function stepIdentityRecallWithActions(
  state: IdentityRecallState,
  event: IdentityRecallEvent
): IdentityRecallStepResult {
  return stepIdentityRecallInner(state, event);
}

export function shouldHitIdentityRecall(
  actions: ReadonlyArray<IdentityRecallAction>
): boolean {
  return actions.some((action) => action.kind === "hit");
}

export function shouldMissIdentityRecall(
  actions: ReadonlyArray<IdentityRecallAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

export function shouldRejectIdentityRecallKey(
  actions: ReadonlyArray<IdentityRecallAction>
): boolean {
  return actions.some((action) => action.kind === "reject-key");
}

function stepIdentityRecallInner(
  state: IdentityRecallState,
  event: IdentityRecallEvent
): IdentityRecallStepResult {
  if (event.kind === "identity/recall-gate") {
    const plan = planIdentityRecall({
      recordPresent: event.recordPresent,
      publicKeyLoaded: event.publicKeyLoaded
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type IdentityRecallAppDataPlan = "hit" | "miss";

/** Known-destination app-data recall: hit when record holds appData. */
export function planIdentityRecallAppData(input: {
  readonly recordPresent: boolean;
  readonly appDataPresent: boolean;
}): IdentityRecallAppDataPlan {
  if (!input.recordPresent || !input.appDataPresent) {
    return "miss";
  }
  return "hit";
}

/**
 * Identity app-data recall gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type IdentityRecallAppDataState = Record<string, never>;

export type IdentityRecallAppDataEvent =
  | Event
  | {
      readonly kind: "identity/recall-app-data-gate";
      readonly recordPresent: boolean;
      readonly appDataPresent: boolean;
    };

export type IdentityRecallAppDataAction = { readonly kind: IdentityRecallAppDataPlan };

export interface IdentityRecallAppDataStepResult {
  readonly state: IdentityRecallAppDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallAppDataAction[];
}

export function initialIdentityRecallAppDataState(): IdentityRecallAppDataState {
  return {};
}

export const stepIdentityRecallAppData: StepFn<IdentityRecallAppDataState> = (state, event) => {
  const result = stepIdentityRecallAppDataInner(state, event as IdentityRecallAppDataEvent);
  return { state: result.state, intents: result.intents };
};

export function stepIdentityRecallAppDataWithActions(
  state: IdentityRecallAppDataState,
  event: IdentityRecallAppDataEvent
): IdentityRecallAppDataStepResult {
  return stepIdentityRecallAppDataInner(state, event);
}

export function shouldHitIdentityRecallAppData(
  actions: ReadonlyArray<IdentityRecallAppDataAction>
): boolean {
  return actions.some((action) => action.kind === "hit");
}

export function shouldMissIdentityRecallAppData(
  actions: ReadonlyArray<IdentityRecallAppDataAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

function stepIdentityRecallAppDataInner(
  state: IdentityRecallAppDataState,
  event: IdentityRecallAppDataEvent
): IdentityRecallAppDataStepResult {
  if (event.kind === "identity/recall-app-data-gate") {
    const plan = planIdentityRecallAppData({
      recordPresent: event.recordPresent,
      appDataPresent: event.appDataPresent
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether decrypt should attempt ratchet keys before identity-key fallback. */
export function shouldAttemptIdentityRatchetDecrypt(ratchetsPresent: boolean): boolean {
  return ratchetsPresent;
}

/**
 * Identity ratchet-decrypt attempt gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAttemptIdentityRatchetDecrypt` reads beside the step).
 */
export type AttemptIdentityRatchetDecryptState = Record<string, never>;

export type AttemptIdentityRatchetDecryptEvent =
  | Event
  | {
      readonly kind: "identity/attempt-ratchet-decrypt-gate";
      readonly ratchetsPresent: boolean;
    };

export type AttemptIdentityRatchetDecryptAction =
  | { readonly kind: "attempt" }
  | { readonly kind: "skip" };

export interface AttemptIdentityRatchetDecryptStepResult {
  readonly state: AttemptIdentityRatchetDecryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttemptIdentityRatchetDecryptAction[];
}

export function initialAttemptIdentityRatchetDecryptState(): AttemptIdentityRatchetDecryptState {
  return {};
}

export function stepAttemptIdentityRatchetDecryptWithActions(
  state: AttemptIdentityRatchetDecryptState,
  event: AttemptIdentityRatchetDecryptEvent
): AttemptIdentityRatchetDecryptStepResult {
  if (event.kind === "identity/attempt-ratchet-decrypt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAttemptIdentityRatchetDecrypt(event.ratchetsPresent)
            ? "attempt"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAttemptIdentityRatchetDecryptNow(
  actions: ReadonlyArray<AttemptIdentityRatchetDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "attempt");
}

export function shouldSkipIdentityRatchetDecrypt(
  actions: ReadonlyArray<AttemptIdentityRatchetDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether Identity.hash may be read (key material loaded). */
export function canIdentityHash(identityHashPresent: boolean): boolean {
  return identityHashPresent;
}

/**
 * Identity hash-read allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canIdentityHash` reads
 * beside the step).
 */
export type IdentityHashAllowState = Record<string, never>;

export type IdentityHashAllowEvent =
  | Event
  | {
      readonly kind: "identity/hash-allow-gate";
      readonly identityHashPresent: boolean;
    };

export type IdentityHashAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface IdentityHashAllowStepResult {
  readonly state: IdentityHashAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityHashAllowAction[];
}

export function initialIdentityHashAllowState(): IdentityHashAllowState {
  return {};
}

export function stepIdentityHashAllowWithActions(
  state: IdentityHashAllowState,
  event: IdentityHashAllowEvent
): IdentityHashAllowStepResult {
  if (event.kind === "identity/hash-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canIdentityHash(event.identityHashPresent) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowIdentityHash(
  actions: ReadonlyArray<IdentityHashAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyIdentityHash(
  actions: ReadonlyArray<IdentityHashAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether private-key ops (sign / decrypt / getPrivateKey) may proceed. */
export function canIdentityUsePrivateKey(input: {
  readonly privateKeyPresent: boolean;
  readonly signaturePrivatePresent: boolean;
}): boolean {
  return input.privateKeyPresent && input.signaturePrivatePresent;
}

/**
 * Identity private-key use allow gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canIdentityUsePrivateKey` reads beside the step).
 */
export type IdentityUsePrivateKeyState = Record<string, never>;

export type IdentityUsePrivateKeyEvent =
  | Event
  | {
      readonly kind: "identity/use-private-key-gate";
      readonly privateKeyPresent: boolean;
      readonly signaturePrivatePresent: boolean;
    };

export type IdentityUsePrivateKeyAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface IdentityUsePrivateKeyStepResult {
  readonly state: IdentityUsePrivateKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityUsePrivateKeyAction[];
}

export function initialIdentityUsePrivateKeyState(): IdentityUsePrivateKeyState {
  return {};
}

export function stepIdentityUsePrivateKeyWithActions(
  state: IdentityUsePrivateKeyState,
  event: IdentityUsePrivateKeyEvent
): IdentityUsePrivateKeyStepResult {
  if (event.kind === "identity/use-private-key-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canIdentityUsePrivateKey({
            privateKeyPresent: event.privateKeyPresent,
            signaturePrivatePresent: event.signaturePrivatePresent
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowIdentityUsePrivateKey(
  actions: ReadonlyArray<IdentityUsePrivateKeyAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyIdentityUsePrivateKey(
  actions: ReadonlyArray<IdentityUsePrivateKeyAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether public-key ops (validate / encrypt / getPublicKey) may proceed. */
export function canIdentityUsePublicKey(input: {
  readonly publicKeyPresent: boolean;
  readonly signaturePublicPresent: boolean;
}): boolean {
  return input.publicKeyPresent && input.signaturePublicPresent;
}

/**
 * Identity public-key use allow gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canIdentityUsePublicKey` reads beside the step).
 */
export type IdentityUsePublicKeyState = Record<string, never>;

export type IdentityUsePublicKeyEvent =
  | Event
  | {
      readonly kind: "identity/use-public-key-gate";
      readonly publicKeyPresent: boolean;
      readonly signaturePublicPresent: boolean;
    };

export type IdentityUsePublicKeyAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface IdentityUsePublicKeyStepResult {
  readonly state: IdentityUsePublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityUsePublicKeyAction[];
}

export function initialIdentityUsePublicKeyState(): IdentityUsePublicKeyState {
  return {};
}

export function stepIdentityUsePublicKeyWithActions(
  state: IdentityUsePublicKeyState,
  event: IdentityUsePublicKeyEvent
): IdentityUsePublicKeyStepResult {
  if (event.kind === "identity/use-public-key-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canIdentityUsePublicKey({
            publicKeyPresent: event.publicKeyPresent,
            signaturePublicPresent: event.signaturePublicPresent
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowIdentityUsePublicKey(
  actions: ReadonlyArray<IdentityUsePublicKeyAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyIdentityUsePublicKey(
  actions: ReadonlyArray<IdentityUsePublicKeyAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether loadPrivateKey / loadPublicKey may accept a successful key split. */
export function canLoadIdentityKeyMaterial(splitOk: boolean): boolean {
  return splitOk;
}

/**
 * Identity load-key-material allow gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canLoadIdentityKeyMaterial` reads beside the step).
 */
export type LoadIdentityKeyMaterialState = Record<string, never>;

export type LoadIdentityKeyMaterialEvent =
  | Event
  | {
      readonly kind: "identity/load-key-material-gate";
      readonly splitOk: boolean;
    };

export type LoadIdentityKeyMaterialAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface LoadIdentityKeyMaterialStepResult {
  readonly state: LoadIdentityKeyMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LoadIdentityKeyMaterialAction[];
}

export function initialLoadIdentityKeyMaterialState(): LoadIdentityKeyMaterialState {
  return {};
}

export function stepLoadIdentityKeyMaterialWithActions(
  state: LoadIdentityKeyMaterialState,
  event: LoadIdentityKeyMaterialEvent
): LoadIdentityKeyMaterialStepResult {
  if (event.kind === "identity/load-key-material-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canLoadIdentityKeyMaterial(event.splitOk) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowLoadIdentityKeyMaterial(
  actions: ReadonlyArray<LoadIdentityKeyMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyLoadIdentityKeyMaterial(
  actions: ReadonlyArray<LoadIdentityKeyMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}
