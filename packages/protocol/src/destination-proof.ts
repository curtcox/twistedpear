/**
 * Pure destination proof-strategy codes and prove decision.
 * App `shouldProve` evaluation stays at the adapter edge.
 */

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
