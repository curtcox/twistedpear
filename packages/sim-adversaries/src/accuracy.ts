import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  OracleViolation,
  SimKernel,
  shrinkHistoryWithConfig,
  type RecordedHistory
} from "@twistedpear/effects/adapters/sim";
import { compileAttackProposal, createFuzzAdversary, type AdversaryState } from "./adversary.js";
import type { HistoricalReplayFixture } from "./historical.js";

interface AccuracyState extends AdversaryState {
  readonly role: "target" | "adversary";
  readonly received: number;
  readonly accepted: number;
  readonly seen: readonly string[];
  readonly outcome: string | null;
  readonly canary: boolean;
}

const initialTarget: AccuracyState = {
  role: "target", acted: false, entropyRequested: false, received: 0, accepted: 0,
  seen: [], outcome: null, canary: false
};

/** Execute a reviewed historical fixture against its named deterministic target. */
export function executeHistoricalFixture(fixture: HistoricalReplayFixture, seed = 1): string {
  if (!fixture.expressible || fixture.proposal === undefined || fixture.expectedOutcome === undefined)
    throw new Error(`historical fixture is not executable: ${fixture.name}`);
  const compiled = compileAttackProposal(fixture.proposal, ["drop", "delay", "reorder", "duplicate", "inject"]);
  const endpoints = new Set(compiled.proposal.actions.flatMap((action) => [action.source, action.destination]));
  const targetIds = [...endpoints].filter((id) => id !== "z");
  const linkPowers = new Map<string, Set<import("@twistedpear/effects").DolevYaoPower>>();
  for (const action of compiled.proposal.actions) {
    const key = `${action.source}\0${action.destination}`;
    const powers = linkPowers.get(key) ?? new Set();
    powers.add(action.power);
    linkPowers.set(key, powers);
  }
  const links = [...linkPowers].map(([key, powers]) => {
    const [source, destination] = key.split("\0") as [string, string];
    return { source, destination, class: "lan" as const, adversary: "z", powers: [...powers], params: clean };
  });
  const config = {
    seed,
    nodes: [
      ...targetIds.map((id) => ({ id, machine: `historical/${fixture.target ?? "target"}`,
        initial: initialTarget, step: historicalTargetStep(fixture.expectedOutcome!, id, compiled.proposal.actions) })),
      { id: "z", machine: "historical/adversary", initial: adversaryState(compiled.initial),
        step: widen(compiled.step) }
    ],
    links
  };
  const kernel = new SimKernel(config);
  kernel.start();
  kernel.runUntilIdle(10_000);
  const outcomes = targetIds.map((id) => kernel.getNodeState(id).outcome).filter(Boolean);
  if (!outcomes.includes(fixture.expectedOutcome)) throw new Error(
    `historical accuracy miss for ${fixture.name}: expected ${fixture.expectedOutcome}`
  );
  return fixture.expectedOutcome;
}

function historicalTargetStep(
  expected: string,
  id: string,
  actions: readonly import("@twistedpear/effects").TransportAdversaryAction[]
): StepFn<AccuracyState> {
  return (state, event) => {
    if (event.kind === "start") {
      const sends = actions.filter((action) => action.source === id && action.power !== "inject")
        .map((action): Intent => ({ kind: "transport/send", send: {
          channel: "historical", destination: action.destination, payload: new Uint8Array([1])
        } }));
      return { state, intents: sends };
    }
    if (state.role !== "target" || event.kind !== "transport/recv") return { state, intents: [] };
    const key = `${event.channel}:${bytes(event.payload)}`;
    const duplicate = state.seen.includes(key);
    const oversized = event.payload.length > 256;
    const received = state.received + 1;
    const contained = duplicate || oversized || received > 16 ||
      event.channel === "grant" || event.channel === "key-share" || event.channel === "federation";
    return { state: { ...state, received, accepted: state.accepted + (contained ? 0 : 1),
      seen: [...state.seen, key], outcome: contained ? expected : state.outcome }, intents: [] };
  };
}

export interface FuzzCanaryResult {
  readonly seed: number;
  readonly history: RecordedHistory<AccuracyState>;
  readonly minimized: RecordedHistory<AccuracyState>;
}

/** Search seeds and payloads, then delta-debug the first real target failure. */
export function searchFuzzCanary(options: { readonly from: number; readonly to: number }): FuzzCanaryResult {
  const payloads = [new Uint8Array([0]), new Uint8Array([0xca, 0xfe]), new Uint8Array([1, 2, 3])];
  for (let seed = options.from; seed <= options.to; seed += 1) {
    const fuzz = createFuzzAdversary({ source: "fuzzer", destination: "target", channel: "fuzz", payloads });
    const config = {
      seed,
      nodes: [
        { id: "target", machine: "fuzz/canary-target", initial: initialTarget, step: canaryTargetStep },
        { id: "z", machine: "fuzz/search", initial: adversaryState(fuzz.initial), step: widen(fuzz.step) }
      ],
      links: [{ source: "fuzzer", destination: "target", class: "lan" as const, adversary: "z",
        powers: ["inject" as const], params: clean }],
      oracles: [{ name: "fuzz-canary", check: (world: { nodes: ReadonlyMap<string, AccuracyState> }) =>
        [...world.nodes.values()].some((state) => state.canary)
          ? { oracle: "fuzz-canary", message: "search discovered ca-fe parser defect" } : null }]
    };
    const kernel = new SimKernel(config);
    try { kernel.start(); kernel.runUntilIdle(10_000); }
    catch (error) {
      if (!(error instanceof OracleViolation)) throw error;
      return { seed, history: error.history as RecordedHistory<AccuracyState>,
        minimized: shrinkHistoryWithConfig(error.history, config) };
    }
  }
  throw new Error(`fuzz canary not found in seeds ${options.from}..${options.to}`);
}

const canaryTargetStep: StepFn<AccuracyState> = (state, event) => event.kind === "transport/recv"
  ? { state: { ...state, received: state.received + 1,
      canary: event.payload.length === 2 && event.payload[0] === 0xca && event.payload[1] === 0xfe }, intents: [] }
  : { state, intents: [] };

function adversaryState(state: AdversaryState): AccuracyState {
  return { ...initialTarget, ...state, role: "adversary" };
}
function widen(step: StepFn<AdversaryState>): StepFn<AccuracyState> {
  return (state, event: Event) => { const result = step(state, event); return {
    state: { ...state, ...result.state }, intents: result.intents as readonly Intent[]
  }; };
}
function bytes(value: Uint8Array): string { return [...value].join("."); }
const clean = { lossRate: 0, latency: { kind: "fixed" as const, ms: 1 },
  burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 } };
