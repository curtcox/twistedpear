import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  OracleViolation,
  SimKernel,
  shrinkHistoryWithConfig,
  type RecordedHistory,
  type SimKernelConfig,
} from "@twistedpear/effects/adapters/sim";
import type { AdversaryState, CompiledAdversary } from "./adversary.js";

export interface AuthoredExecutionState {
  readonly role: "endpoint" | "adversary";
  readonly seen: readonly string[];
  readonly duplicateAccepted: boolean;
  readonly adversary?: AdversaryState;
}

export interface AuthoredExecutionResult {
  readonly proposal: CompiledAdversary["proposal"];
  readonly finding: RecordedHistory<AuthoredExecutionState> | null;
  readonly minimized: RecordedHistory<AuthoredExecutionState> | null;
}

/** Execute compiler-approved model output, recording and shrinking typed findings. */
export function executeAuthoredStrategies(
  strategies: readonly CompiledAdversary[],
  seed = 44,
): readonly AuthoredExecutionResult[] {
  return strategies.map((strategy) => {
    const config = authoredConfig(strategy, seed);
    try {
      const kernel = new SimKernel(config);
      kernel.start();
      kernel.runUntilIdle(10_000);
      return { proposal: strategy.proposal, finding: null, minimized: null };
    } catch (error) {
      if (!(error instanceof OracleViolation)) throw error;
      const finding = error.history as RecordedHistory<AuthoredExecutionState>;
      return {
        proposal: strategy.proposal,
        finding,
        minimized: shrinkHistoryWithConfig(finding, config),
      };
    }
  });
}

export function authoredConfig(
  strategy: CompiledAdversary,
  seed: number,
): SimKernelConfig<AuthoredExecutionState> {
  const endpoints = [
    ...new Set(
      strategy.proposal.actions.flatMap((action) => [
        action.source,
        action.destination,
      ]),
    ),
  ].sort();
  const initial: AuthoredExecutionState = {
    role: "endpoint",
    seen: [],
    duplicateAccepted: false,
  };
  const links = new Map<
    string,
    {
      source: string;
      destination: string;
      powers: Set<import("@twistedpear/effects").DolevYaoPower>;
    }
  >();
  for (const action of strategy.proposal.actions) {
    if (action.power === "author-flood") continue;
    const key = `${action.source}\0${action.destination}`;
    const link = links.get(key) ?? {
      source: action.source,
      destination: action.destination,
      powers: new Set(),
    };
    link.powers.add(action.power);
    links.set(key, link);
  }
  const clean = {
    lossRate: 0,
    latency: { kind: "fixed" as const, ms: 1 },
    burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 },
  };
  return {
    seed,
    nodes: [
      ...endpoints.map((id) => ({
        id,
        machine: "authored/endpoint",
        initial,
        step: endpointStep(id, strategy),
      })),
      {
        id: "model-adversary",
        machine: "authored/adversary",
        initial: {
          ...initial,
          role: "adversary" as const,
          adversary: strategy.initial,
        },
        step: adversaryStep(strategy.step),
      },
    ],
    links: [...links.values()].map((link) => ({
      ...link,
      class: "lan" as const,
      params: clean,
      adversary: "model-adversary",
      powers: [...link.powers],
    })),
    oracles: [
      {
        name: "model-authored-duplicate-delivery",
        check: (world) =>
          [...world.nodes.values()].some((state) => state.duplicateAccepted)
            ? {
                oracle: "model-authored-duplicate-delivery",
                message: "model-authored strategy caused duplicate delivery",
              }
            : null,
      },
    ],
  };
}

function endpointStep(
  id: string,
  strategy: CompiledAdversary,
): StepFn<AuthoredExecutionState> {
  return (state, event) => {
    if (state.role !== "endpoint") return { state, intents: [] };
    if (event.kind === "start") {
      const intents = strategy.proposal.actions
        .filter((action) => action.source === id && action.power !== "inject")
        .map((action): Intent => ({
          kind: "transport/send",
          send: {
            destination: action.destination,
            channel: "authored",
            payload: new TextEncoder().encode(
              `${action.source}->${action.destination}`,
            ),
          },
        }));
      return { state, intents };
    }
    if (event.kind !== "transport/recv") return { state, intents: [] };
    const key = `${event.source}:${event.channel}:${[...event.payload].join(".")}`;
    return {
      state: {
        ...state,
        seen: [...state.seen, key],
        duplicateAccepted: state.duplicateAccepted || state.seen.includes(key),
      },
      intents: [],
    };
  };
}

function adversaryStep(
  step: StepFn<AdversaryState>,
): StepFn<AuthoredExecutionState> {
  return (state, event: Event) => {
    if (state.role !== "adversary" || state.adversary === undefined)
      return { state, intents: [] };
    const result = step(state.adversary, event);
    return {
      state: { ...state, adversary: result.state },
      intents: result.intents,
    };
  };
}
