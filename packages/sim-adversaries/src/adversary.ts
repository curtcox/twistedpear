import type {
  DolevYaoPower,
  Event,
  Intent,
  NodeId,
  StepFn,
  TransportAdversaryAction,
} from "@twistedpear/effects";

export interface AdversaryState {
  readonly acted: boolean;
  readonly entropyRequested: boolean;
}

export interface AttackProposal {
  readonly name: string;
  readonly actions: readonly TransportAdversaryAction[];
}

export interface CompiledAdversary {
  readonly initial: AdversaryState;
  readonly step: StepFn<AdversaryState>;
  readonly powers: readonly DolevYaoPower[];
  readonly proposal: AttackProposal;
}

export class UnlowerableAttackProposalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnlowerableAttackProposalError";
  }
}

/** Lower an authored strategy to a deterministic ordinary-node step function. */
export function compileAttackProposal(
  proposal: AttackProposal,
  allowedPowers: readonly DolevYaoPower[],
): CompiledAdversary {
  if (proposal.actions.length === 0)
    throw new UnlowerableAttackProposalError("proposal has no actions");
  for (const action of proposal.actions) {
    if (!allowedPowers.includes(action.power)) {
      throw new UnlowerableAttackProposalError(
        `proposal requires out-of-model power: ${action.power}`,
      );
    }
    if (action.source.length === 0 || action.destination.length === 0) {
      throw new UnlowerableAttackProposalError(
        "proposal link endpoints must be named",
      );
    }
  }
  const step: StepFn<AdversaryState> = (state, event) => {
    if (event.kind !== "start" || state.acted) return { state, intents: [] };
    return {
      state: { ...state, acted: true },
      intents: proposal.actions.map((action): Intent => ({
        kind: "transport/adversary",
        action,
      })),
    };
  };
  return {
    initial: { acted: false, entropyRequested: false },
    step,
    powers: [...new Set(proposal.actions.map((action) => action.power))],
    proposal,
  };
}

export interface FuzzAdversaryOptions {
  readonly source: NodeId;
  readonly destination: NodeId;
  readonly channel: string;
  readonly payloads: readonly Uint8Array[];
}

/** Search-based attacker whose choices come exclusively from the kernel entropy tape. */
export function createFuzzAdversary(
  options: FuzzAdversaryOptions,
): CompiledAdversary {
  if (options.payloads.length === 0)
    throw new Error("fuzz adversary needs at least one payload");
  const proposal: AttackProposal = {
    name: "entropy-driven-payload-fuzzer",
    actions: [
      {
        power: "inject",
        source: options.source,
        destination: options.destination,
        channel: options.channel,
        payload: options.payloads[0]!,
      },
    ],
  };
  const step: StepFn<AdversaryState> = (state, event: Event) => {
    if (event.kind === "start" && !state.entropyRequested) {
      return {
        state: { ...state, entropyRequested: true },
        intents: [{ kind: "need_entropy", nbytes: 2 }],
      };
    }
    if (event.kind === "entropy" && !state.acted) {
      const payload =
        options.payloads[event.bytes[0]! % options.payloads.length]!;
      const delayMs = event.bytes[1]!;
      return {
        state: { ...state, acted: true },
        intents: [
          {
            kind: "transport/adversary",
            action: {
              power: "inject",
              source: options.source,
              destination: options.destination,
              channel: options.channel,
              payload,
              delayMs,
            },
          },
        ],
      };
    }
    return { state, intents: [] };
  };
  return {
    initial: { acted: false, entropyRequested: false },
    step,
    powers: ["inject"],
    proposal,
  };
}
