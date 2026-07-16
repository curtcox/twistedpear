import type { Event, Intent, StepFn, TransportAdversaryAction } from "@twistedpear/effects";
import { type HistoryRecorder, type TransportClassName } from "@twistedpear/effects/adapters/sim";
import {
  escrowSafetyViolation,
  initialEscrowState,
  initialRecoveryQuorumState,
  recoveryQuorumSafetyViolation,
  stepEscrow,
  stepRecoveryQuorum,
  type EscrowState,
  type RecoveryQuorumState
} from "@twistedpear/protocol";
import { reputationUnderCollusion, spamEconomics } from "@twistedpear/sim-adversaries";
import type { CampaignScenario } from "./runner.js";

export type QuorumAttack = "below-threshold" | "duplicate" | "replay" | "delay" | "partition" | "expiry" | "colluding-pair";
type QuorumState =
  | { readonly role: "escrow"; readonly escrow: EscrowState }
  | { readonly role: "recovery"; readonly recovery: RecoveryQuorumState }
  | { readonly role: "actor"; readonly sent: number }
  | { readonly role: "adversary"; readonly acted: boolean };

export function createEscrowCampaignScenario(options: {
  readonly transport: TransportClassName;
  readonly attack: QuorumAttack;
  readonly brokenBelowQuorum?: boolean;
  readonly recorder?: HistoryRecorder<QuorumState>;
}): CampaignScenario<QuorumState> {
  return quorumScenario("escrow", options);
}

export function createRecoveryCampaignScenario(options: {
  readonly transport: TransportClassName;
  readonly attack: QuorumAttack;
  readonly brokenBelowQuorum?: boolean;
  readonly recorder?: HistoryRecorder<QuorumState>;
}): CampaignScenario<QuorumState> {
  return quorumScenario("recovery", options);
}

function quorumScenario(
  machine: "escrow" | "recovery",
  options: { readonly transport: TransportClassName; readonly attack: QuorumAttack;
    readonly brokenBelowQuorum?: boolean; readonly recorder?: HistoryRecorder<QuorumState> }
): CampaignScenario<QuorumState> {
  const actions = quorumAdversaryActions(options.attack, machine);
  const powers = [...new Set(actions.map((action) => action.power))];
  const target = machine;
  const config = {
    seed: 1,
    nodes: [
      { id: "0-adversary", machine: "campaign/quorum-adversary",
        initial: { role: "adversary" as const, acted: false }, step: adversaryStep(actions) },
      { id: "actor", machine: "campaign/quorum-actor",
        initial: { role: "actor" as const, sent: 0 }, step: quorumActorStep(machine, options.attack) },
      machine === "escrow"
        ? { id: target, machine: "protocol/escrow", initial: { role: "escrow" as const, escrow: initialEscrowState(2) },
            step: escrowTargetStep(options.brokenBelowQuorum === true) }
        : { id: target, machine: "protocol/recovery-quorum", initial: { role: "recovery" as const, recovery: initialRecoveryQuorumState(2) },
            step: recoveryTargetStep(options.brokenBelowQuorum === true) }
    ],
    links: [{ source: "actor", destination: target, class: options.transport, adversary: "0-adversary",
      powers, params: clean(options.transport) }],
    oracles: [{ name: `${machine}-safety`, check: (world: { nodes: ReadonlyMap<string, QuorumState> }) => {
      const state = world.nodes.get(target);
      const violation = state?.role === "escrow" ? escrowSafetyViolation(state.escrow)
        : state?.role === "recovery" ? recoveryQuorumSafetyViolation(state.recovery) : null;
      return violation === null ? null : { oracle: `${machine}-safety`, message: violation, nodes: [target] };
    }}],
    ...(options.recorder === undefined ? {} : { recorder: options.recorder })
  };
  return { config, description: { name: `${machine}-${options.attack}`, protocolMachines: [machine],
    adversaryPowers: powers, transport: options.transport } };
}

function quorumActorStep(machine: "escrow" | "recovery", attack: QuorumAttack): StepFn<QuorumState> {
  return (state, event) => {
    if (state.role !== "actor" || event.kind !== "start") return { state, intents: [] };
    const channels = machine === "escrow"
      ? ["escrow/deposit", "escrow/request", `escrow/authorize/${attack === "below-threshold" || attack === "expiry" ? "a" : "a,b"}`,
          ...(attack === "expiry" ? ["escrow/ttl"] : [])]
      : attack === "expiry"
        ? ["recovery/start", "recovery/share/a", "recovery/ttl", "recovery/authorize"]
        : ["recovery/start", "recovery/share/a", `recovery/share/${attack === "duplicate" || attack === "below-threshold" ? "a" : "b"}`,
            "recovery/authorize"];
    return { state: { ...state, sent: channels.length }, intents: channels.map(send) };
  };
}

function escrowTargetStep(broken: boolean): StepFn<QuorumState> {
  return (state, event) => {
    if (state.role !== "escrow" || event.kind !== "transport/recv") return { state, intents: [] };
    let stepped = { state: state.escrow, intents: [] as readonly Intent[] };
    if (event.channel === "escrow/deposit") stepped = stepEscrow(state.escrow, { kind: "escrow/deposit", amount: 10 });
    else if (event.channel === "escrow/request") stepped = stepEscrow(state.escrow, { kind: "escrow/request-release" });
    else if (event.channel.startsWith("escrow/authorize/")) {
      const authorizers = event.channel.slice("escrow/authorize/".length).split(",");
      stepped = broken && state.escrow.phase === "release-requested"
        ? { state: { ...state.escrow, phase: "released", authorizers, releasedAmount: state.escrow.amount }, intents: [] }
        : stepEscrow(state.escrow, { kind: "escrow/authorize", authorizers });
    } else if (event.channel === "escrow/ttl") stepped = stepEscrow(state.escrow, { kind: "escrow/ttl" });
    return { state: { ...state, escrow: stepped.state }, intents: stepped.intents };
  };
}

function recoveryTargetStep(broken: boolean): StepFn<QuorumState> {
  return (state, event) => {
    if (state.role !== "recovery" || event.kind !== "transport/recv") return { state, intents: [] };
    const current = state.recovery;
    let next = current;
    if (event.channel === "recovery/start") next = stepRecoveryQuorum(current, { kind: "recovery/start" }).state;
    else if (event.channel.startsWith("recovery/share/")) next = stepRecoveryQuorum(current,
      { kind: "recovery/share", guardian: event.channel.slice("recovery/share/".length) }).state;
    else if (event.channel === "recovery/authorize") next = broken && current.phase === "collecting"
      ? { ...current, phase: "recovered", recoveredWith: current.shares }
      : stepRecoveryQuorum(current, { kind: "recovery/authorize" }).state;
    else if (event.channel === "recovery/ttl") next = stepRecoveryQuorum(current, { kind: "recovery/ttl" }).state;
    return { state: { ...state, recovery: next }, intents: [] };
  };
}

function quorumAdversaryActions(attack: QuorumAttack, destination: "escrow" | "recovery"): readonly TransportAdversaryAction[] {
  if (attack === "delay") return [{ power: "delay", source: "actor", destination, delayMs: 2 }];
  if (attack === "partition") return [{ power: "drop", source: "actor", destination }];
  if (attack === "replay" || attack === "duplicate") return [{ power: "duplicate", source: "actor", destination }];
  if (attack === "colluding-pair") return [{ power: "reorder", source: "actor", destination }];
  return [];
}

function adversaryStep(actions: readonly TransportAdversaryAction[]): StepFn<QuorumState> {
  return (state, event: Event) => state.role === "adversary" && event.kind === "start" && !state.acted
    ? { state: { ...state, acted: true }, intents: actions.map((action): Intent => ({ kind: "transport/adversary", action })) }
    : { state, intents: [] };
}

export type SocialKind = "spam" | "harassment" | "reputation";
export interface SocialCampaignState {
  readonly role: "sender" | "service";
  readonly sent: number;
  readonly delivered: number;
  readonly blocked: boolean;
  readonly severed: boolean;
  readonly votes: readonly { from: string; to: string; value: -1 | 1 }[];
  readonly outcome: number;
}

export function createSocialCampaignScenario(
  kind: SocialKind,
  transport: TransportClassName,
  options: { readonly containment?: boolean } = {}
): CampaignScenario<SocialCampaignState> {
  const initial: SocialCampaignState = { role: "sender", sent: 0, delivered: 0, blocked: false, severed: false, votes: [], outcome: 0 };
  const service: SocialCampaignState = { ...initial, role: "service" };
  return {
    config: { seed: 1, nodes: [
      { id: "social-adversary", machine: `social/${kind}-adversary`, initial,
        step: socialSender(kind, options.containment !== false) },
      { id: "social-service", machine: `social/${kind}-service`, initial: service, step: socialService(kind, transport) }
    ], links: [{ source: "social-adversary", destination: "social-service", class: transport, params: clean(transport) }] },
    description: { name: `social-${kind}`, protocolMachines: [`social-${kind}`], adversaryPowers: [], transport }
  };
}

function socialSender(kind: SocialKind, containment: boolean): StepFn<SocialCampaignState> {
  return (state, event) => {
    if (state.role !== "sender" || event.kind !== "start") return { state, intents: [] };
    const channels = kind === "spam" ? Array.from({ length: 12 }, () => "spam/send")
      : kind === "harassment" ? (containment
        ? ["harass/a", "harass/b", "contain/block", "harass/c", "contain/sever", "harass/d"]
        : ["harass/a", "harass/b", "harass/c", "harass/d"])
      : ["vote/c1/target/1", "vote/c2/target/1", "vote/honest/target/-1"];
    return { state: { ...state, sent: channels.length }, intents: channels.map(send) };
  };
}

function socialService(kind: SocialKind, transport: TransportClassName): StepFn<SocialCampaignState> {
  return (state, event) => {
    if (state.role !== "service" || event.kind !== "transport/recv") return { state, intents: [] };
    if (event.channel === "contain/block") return { state: { ...state, blocked: true }, intents: [] };
    if (event.channel === "contain/sever") return { state: { ...state, severed: true }, intents: [] };
    if (kind === "spam") {
      const delivered = state.delivered + 1;
      const economics = spamEconomics({ transport, payloadBytes: event.payload.length, messages: delivered, payoffPerDelivery: 0.01 });
      return { state: { ...state, delivered, outcome: economics.attackerCost }, intents: [] };
    }
    if (kind === "harassment") return state.blocked || state.severed ? { state, intents: [] }
      : { state: { ...state, delivered: state.delivered + 1, outcome: state.outcome + 1 }, intents: [] };
    const [, from = "", to = "", raw = "-1"] = event.channel.split("/");
    const vote = { from, to, value: raw === "1" ? 1 as const : -1 as const };
    const votes = [...state.votes, vote];
    const scores = reputationUnderCollusion(votes, new Set(["c1", "c2"]));
    return { state: { ...state, votes, delivered: state.delivered + 1, outcome: scores.target ?? 0 }, intents: [] };
  };
}

function send(channel: string): Intent { return { kind: "transport/send", send: {
  channel, destination: channel.startsWith("escrow/") ? "escrow" : channel.startsWith("recovery/") ? "recovery" : "social-service",
  payload: new Uint8Array([1]) } }; }
function clean(transport: TransportClassName) { return { lossRate: 0, latency: { kind: "fixed" as const,
  ms: transport === "lora" ? 20 : 1 }, burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 } }; }
