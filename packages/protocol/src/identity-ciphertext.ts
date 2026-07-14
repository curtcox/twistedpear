/**
 * Pure RNS Identity encrypt wire layout: ephemeral X25519 public || Token ciphertext.
 * ECDH / Token crypto stay at the adapter edge.
 * Decrypt conclusions leave via machine actions (no ad-hoc plan reads beside the step).
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

/** Whether identity ciphertext split succeeded and may drive decrypt. */
export function shouldAcceptIdentityCiphertextFrame(splitOk: boolean): boolean {
  return splitOk;
}

/** Whether identity decrypt may return accepted plaintext after plan outcome. */
export function shouldAcceptIdentityDecryptPlaintext(planAccept: boolean): boolean {
  return planAccept;
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

/** Whether Identity.hash may be read (key material loaded). */
export function canIdentityHash(identityHashPresent: boolean): boolean {
  return identityHashPresent;
}

/** Whether private-key ops (sign / decrypt / getPrivateKey) may proceed. */
export function canIdentityUsePrivateKey(input: {
  readonly privateKeyPresent: boolean;
  readonly signaturePrivatePresent: boolean;
}): boolean {
  return input.privateKeyPresent && input.signaturePrivatePresent;
}

/** Whether public-key ops (validate / encrypt / getPublicKey) may proceed. */
export function canIdentityUsePublicKey(input: {
  readonly publicKeyPresent: boolean;
  readonly signaturePublicPresent: boolean;
}): boolean {
  return input.publicKeyPresent && input.signaturePublicPresent;
}

/** Whether loadPrivateKey / loadPublicKey may accept a successful key split. */
export function canLoadIdentityKeyMaterial(splitOk: boolean): boolean {
  return splitOk;
}
