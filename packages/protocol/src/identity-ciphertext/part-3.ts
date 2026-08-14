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
import {
  identityRecallAppDataPlanFromActions,
  planIdentityRecallAppData,
} from "./part-2.js";
import type {
  IdentityRecallAppDataEvent,
  IdentityRecallAppDataPlan,
  IdentityRecallAppDataPlanAction,
  IdentityRecallAppDataPlanEvent,
} from "./part-2.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Identity-recall-app-data-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planIdentityRecallAppData`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepIdentityRecallAppDataWithActions}.
 */
export type IdentityRecallAppDataPlanState = Record<string, never>;

export interface IdentityRecallAppDataPlanStepResult {
  readonly state: IdentityRecallAppDataPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallAppDataPlanAction[];
}

export function initialIdentityRecallAppDataPlanState(): IdentityRecallAppDataPlanState {
  return {};
}

export function stepIdentityRecallAppDataPlanWithActions(
  state: IdentityRecallAppDataPlanState,
  event: IdentityRecallAppDataPlanEvent,
): IdentityRecallAppDataPlanStepResult {
  if (event.kind === "identity/recall-app-data-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planIdentityRecallAppData({
            recordPresent: event.recordPresent,
            appDataPresent: event.appDataPresent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldHitIdentityRecallAppDataPlan(
  actions: ReadonlyArray<IdentityRecallAppDataPlanAction>,
): boolean {
  return hasActionOfKind(actions, "hit");
}

export function shouldMissIdentityRecallAppDataPlan(
  actions: ReadonlyArray<IdentityRecallAppDataPlanAction>,
): boolean {
  return hasActionOfKind(actions, "miss");
}

/**
 * Identity app-data recall gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepIdentityRecallAppDataPlanWithActions}
 * (`hit`|`miss`).
 */
export type IdentityRecallAppDataState = Record<string, never>;

/**
 * Adapter returns app-data recall results only from these actions.
 * Plan nested via {@link stepIdentityRecallAppDataPlanWithActions}
 * (`hit`|`miss`).
 */
export type IdentityRecallAppDataAction = {
  readonly kind: IdentityRecallAppDataPlan;
};

export interface IdentityRecallAppDataStepResult {
  readonly state: IdentityRecallAppDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallAppDataAction[];
}

export function initialIdentityRecallAppDataState(): IdentityRecallAppDataState {
  return {};
}

export const stepIdentityRecallAppData: StepFn<IdentityRecallAppDataState> = (
  state,
  event,
) => {
  const result = stepIdentityRecallAppDataInner(
    state,
    event as IdentityRecallAppDataEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepIdentityRecallAppDataWithActions(
  state: IdentityRecallAppDataState,
  event: IdentityRecallAppDataEvent,
): IdentityRecallAppDataStepResult {
  return stepIdentityRecallAppDataInner(state, event);
}

export function shouldHitIdentityRecallAppData(
  actions: ReadonlyArray<IdentityRecallAppDataAction>,
): boolean {
  return hasActionOfKind(actions, "hit");
}

export function shouldMissIdentityRecallAppData(
  actions: ReadonlyArray<IdentityRecallAppDataAction>,
): boolean {
  return hasActionOfKind(actions, "miss");
}

function stepIdentityRecallAppDataInner(
  state: IdentityRecallAppDataState,
  event: IdentityRecallAppDataEvent,
): IdentityRecallAppDataStepResult {
  if (event.kind === "identity/recall-app-data-gate") {
    const planActions = stepIdentityRecallAppDataPlanWithActions(
      initialIdentityRecallAppDataPlanState(),
      {
        kind: "identity/recall-app-data-plan-gate",
        recordPresent: event.recordPresent,
        appDataPresent: event.appDataPresent,
      },
    ).actions;
    const plan = identityRecallAppDataPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether decrypt should attempt ratchet keys before identity-key fallback. */
export function shouldAttemptIdentityRatchetDecrypt(
  ratchetsPresent: boolean,
): boolean {
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
  { readonly kind: "attempt" } | { readonly kind: "skip" };

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
  event: AttemptIdentityRatchetDecryptEvent,
): AttemptIdentityRatchetDecryptStepResult {
  if (event.kind === "identity/attempt-ratchet-decrypt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAttemptIdentityRatchetDecrypt(event.ratchetsPresent)
            ? "attempt"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAttemptIdentityRatchetDecryptNow(
  actions: ReadonlyArray<AttemptIdentityRatchetDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "attempt");
}

export function shouldSkipIdentityRatchetDecrypt(
  actions: ReadonlyArray<AttemptIdentityRatchetDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
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
  { readonly kind: "allow" } | { readonly kind: "deny" };

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
  event: IdentityHashAllowEvent,
): IdentityHashAllowStepResult {
  if (event.kind === "identity/hash-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canIdentityHash(event.identityHashPresent) ? "allow" : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowIdentityHash(
  actions: ReadonlyArray<IdentityHashAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyIdentityHash(
  actions: ReadonlyArray<IdentityHashAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
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
  { readonly kind: "allow" } | { readonly kind: "deny" };

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
  event: IdentityUsePrivateKeyEvent,
): IdentityUsePrivateKeyStepResult {
  if (event.kind === "identity/use-private-key-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canIdentityUsePrivateKey({
            privateKeyPresent: event.privateKeyPresent,
            signaturePrivatePresent: event.signaturePrivatePresent,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowIdentityUsePrivateKey(
  actions: ReadonlyArray<IdentityUsePrivateKeyAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyIdentityUsePrivateKey(
  actions: ReadonlyArray<IdentityUsePrivateKeyAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
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
  { readonly kind: "allow" } | { readonly kind: "deny" };

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
  event: IdentityUsePublicKeyEvent,
): IdentityUsePublicKeyStepResult {
  if (event.kind === "identity/use-public-key-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canIdentityUsePublicKey({
            publicKeyPresent: event.publicKeyPresent,
            signaturePublicPresent: event.signaturePublicPresent,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowIdentityUsePublicKey(
  actions: ReadonlyArray<IdentityUsePublicKeyAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyIdentityUsePublicKey(
  actions: ReadonlyArray<IdentityUsePublicKeyAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
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
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface LoadIdentityKeyMaterialStepResult {
  readonly state: LoadIdentityKeyMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LoadIdentityKeyMaterialAction[];
}

export function initialLoadIdentityKeyMaterialState(): LoadIdentityKeyMaterialState {
  return {};
}
