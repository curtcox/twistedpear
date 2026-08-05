/**
 * Pure Link X25519/Ed25519 private-key material extraction from injected entropy.
 * Public-key derivation stays at the crypto adapter edge.
 * Entropy-split conclusions leave via machine actions (no ad-hoc
 * `splitInitiatorLinkEntropy` / `splitResponderLinkEntropy` reads beside the
 * step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const LINK_X25519_KEY_SIZE = 32;
export const LINK_INITIATOR_ENTROPY_SIZE = LINK_X25519_KEY_SIZE * 2;
export const LINK_RESPONDER_ENTROPY_SIZE = LINK_X25519_KEY_SIZE;

export interface LinkInitiatorKeyMaterial {
  readonly privateKey: Uint8Array;
  readonly signaturePrivateKey: Uint8Array;
}

export interface LinkResponderKeyMaterial {
  readonly privateKey: Uint8Array;
}

export function splitInitiatorLinkEntropy(entropy: Uint8Array): LinkInitiatorKeyMaterial {
  if (entropy.length < LINK_INITIATOR_ENTROPY_SIZE) {
    throw new Error(
      `Initiator link entropy must be at least ${LINK_INITIATOR_ENTROPY_SIZE} bytes`
    );
  }
  return {
    privateKey: Uint8Array.from(entropy.subarray(0, LINK_X25519_KEY_SIZE)),
    signaturePrivateKey: Uint8Array.from(
      entropy.subarray(LINK_X25519_KEY_SIZE, LINK_INITIATOR_ENTROPY_SIZE)
    )
  };
}

export function splitResponderLinkEntropy(entropy: Uint8Array): LinkResponderKeyMaterial {
  if (entropy.length < LINK_RESPONDER_ENTROPY_SIZE) {
    throw new Error(
      `Responder link entropy must be at least ${LINK_RESPONDER_ENTROPY_SIZE} bytes`
    );
  }
  return {
    privateKey: Uint8Array.from(entropy.subarray(0, LINK_X25519_KEY_SIZE))
  };
}

/**
 * Initiator link entropy split is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitInitiatorLinkEntropy`
 * reads beside the step). Undersized entropy becomes `reject`.
 */
export type SplitInitiatorLinkEntropyState = Record<string, never>;

export type SplitInitiatorLinkEntropyEvent =
  | Event
  | {
      readonly kind: "link-keygen/split-initiator-gate";
      readonly entropy: Uint8Array;
    };

export type SplitInitiatorLinkEntropyAction =
  | { readonly kind: "use-fields"; readonly fields: LinkInitiatorKeyMaterial }
  | { readonly kind: "reject" };

export interface SplitInitiatorLinkEntropyStepResult {
  readonly state: SplitInitiatorLinkEntropyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitInitiatorLinkEntropyAction[];
}

export function initialSplitInitiatorLinkEntropyState(): SplitInitiatorLinkEntropyState {
  return {};
}

export function stepSplitInitiatorLinkEntropyWithActions(
  state: SplitInitiatorLinkEntropyState,
  event: SplitInitiatorLinkEntropyEvent
): SplitInitiatorLinkEntropyStepResult {
  if (event.kind === "link-keygen/split-initiator-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields: splitInitiatorLinkEntropy(event.entropy) }]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitInitiatorLinkEntropy(
  actions: ReadonlyArray<SplitInitiatorLinkEntropyAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitInitiatorLinkEntropy(
  actions: ReadonlyArray<SplitInitiatorLinkEntropyAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract initiator key material from step actions; null when no `use-fields`. */
export function initiatorLinkEntropyFieldsFromActions(
  actions: ReadonlyArray<SplitInitiatorLinkEntropyAction>
): LinkInitiatorKeyMaterial | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Responder link entropy split is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitResponderLinkEntropy`
 * reads beside the step). Undersized entropy becomes `reject`.
 */
export type SplitResponderLinkEntropyState = Record<string, never>;

export type SplitResponderLinkEntropyEvent =
  | Event
  | {
      readonly kind: "link-keygen/split-responder-gate";
      readonly entropy: Uint8Array;
    };

export type SplitResponderLinkEntropyAction =
  | { readonly kind: "use-fields"; readonly fields: LinkResponderKeyMaterial }
  | { readonly kind: "reject" };

export interface SplitResponderLinkEntropyStepResult {
  readonly state: SplitResponderLinkEntropyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResponderLinkEntropyAction[];
}

export function initialSplitResponderLinkEntropyState(): SplitResponderLinkEntropyState {
  return {};
}

export function stepSplitResponderLinkEntropyWithActions(
  state: SplitResponderLinkEntropyState,
  event: SplitResponderLinkEntropyEvent
): SplitResponderLinkEntropyStepResult {
  if (event.kind === "link-keygen/split-responder-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields: splitResponderLinkEntropy(event.entropy) }]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitResponderLinkEntropy(
  actions: ReadonlyArray<SplitResponderLinkEntropyAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitResponderLinkEntropy(
  actions: ReadonlyArray<SplitResponderLinkEntropyAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract responder key material from step actions; null when no `use-fields`. */
export function responderLinkEntropyFieldsFromActions(
  actions: ReadonlyArray<SplitResponderLinkEntropyAction>
): LinkResponderKeyMaterial | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
