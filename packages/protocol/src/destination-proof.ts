/**
 * Pure destination proof-strategy codes and prove decision.
 * App `shouldProve` evaluation stays at the adapter edge.
 * Prove conclusions leave via machine actions (no ad-hoc
 * `planDestinationProof` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const DestinationProofStrategyCode = {
  PROVE_NONE: 0x21,
  PROVE_APP: 0x22,
  PROVE_ALL: 0x23
} as const;

export type DestinationProofStrategyCodeValue =
  (typeof DestinationProofStrategyCode)[keyof typeof DestinationProofStrategyCode];

/**
 * Decide whether to send a delivery proof.
 * For PROVE_APP, pass `appWantsProof` from the destination callback.
 */
export function planDestinationProof(input: {
  readonly strategy: number;
  readonly appWantsProof?: boolean;
}): boolean {
  if (input.strategy === DestinationProofStrategyCode.PROVE_ALL) {
    return true;
  }
  if (input.strategy === DestinationProofStrategyCode.PROVE_APP) {
    return input.appWantsProof === true;
  }
  return false;
}

/** Whether transport may emit a destination delivery proof (identity required). */
export function canEmitDestinationProof(identityPresent: boolean): boolean {
  return identityPresent;
}

/**
 * Destination proof gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationProof`
 * reads beside the step).
 */
export type DestinationProofState = Record<string, never>;

export type DestinationProofEvent =
  | Event
  | {
      readonly kind: "destination/proof-gate";
      readonly strategy: number;
      readonly appWantsProof?: boolean;
    };

export type DestinationProofAction =
  | { readonly kind: "prove" }
  | { readonly kind: "skip" };

export interface DestinationProofStepResult {
  readonly state: DestinationProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationProofAction[];
}

export function initialDestinationProofState(): DestinationProofState {
  return {};
}

export function stepDestinationProofWithActions(
  state: DestinationProofState,
  event: DestinationProofEvent
): DestinationProofStepResult {
  if (event.kind === "destination/proof-gate") {
    const prove = planDestinationProof({
      strategy: event.strategy,
      ...(event.appWantsProof !== undefined ? { appWantsProof: event.appWantsProof } : {})
    });
    return {
      state,
      intents: [],
      actions: [{ kind: prove ? "prove" : "skip" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldProveDestination(
  actions: ReadonlyArray<DestinationProofAction>
): boolean {
  return actions.some((action) => action.kind === "prove");
}
