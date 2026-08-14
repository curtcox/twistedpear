import type {
  Event,
  Intent,
  StepFn,
  TransportAdversaryAction,
} from "@twistedpear/effects";
import {
  type HistoryRecorder,
  type SimKernel,
  type TransportClassName,
} from "@twistedpear/effects/adapters/sim";
import {
  escrowSafetyViolation,
  initialEscrowState,
  initialRecoveryQuorumState,
  recoveryQuorumSafetyViolation,
  stepEscrow,
  stepRecoveryQuorum,
  type EscrowState,
  type RecoveryQuorumState,
} from "@twistedpear/protocol";
import {
  reputationUnderCollusion,
  spamEconomics,
} from "@twistedpear/sim-adversaries";
import type { CampaignScenario } from "./runner.js";
import type { ContainmentMetrics } from "./metrics.js";

export type QuorumAttack =
  | "below-threshold"
  | "drop"
  | "duplicate"
  | "replay"
  | "delay"
  | "partition"
  | "expiry"
  | "colluding-pair";
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
  options: {
    readonly transport: TransportClassName;
    readonly attack: QuorumAttack;
    readonly brokenBelowQuorum?: boolean;
    readonly recorder?: HistoryRecorder<QuorumState>;
  },
): CampaignScenario<QuorumState> {
  const actions = quorumAdversaryActions(options.attack, machine);
  const powers = [...new Set(actions.map((action) => action.power))];
  const target = machine;
  const config = {
    seed: 1,
    nodes: [
      {
        id: "actor",
        machine: "campaign/quorum-actor",
        initial: { role: "actor" as const, sent: 0 },
        step: quorumActorStep(machine, options.attack),
      },
      machine === "escrow"
        ? {
            id: target,
            machine: "protocol/escrow",
            initial: { role: "escrow" as const, escrow: initialEscrowState(2) },
            step: escrowTargetStep(options.brokenBelowQuorum === true),
          }
        : {
            id: target,
            machine: "protocol/recovery-quorum",
            initial: {
              role: "recovery" as const,
              recovery: initialRecoveryQuorumState(2),
            },
            step: recoveryTargetStep(options.brokenBelowQuorum === true),
          },
      {
        id: "z-adversary",
        machine: "campaign/quorum-adversary",
        initial: { role: "adversary" as const, acted: false },
        step: adversaryStep(actions),
      },
    ],
    links: [
      {
        source: "actor",
        destination: target,
        class: options.transport,
        adversary: "z-adversary",
        powers,
        params: {
          ...clean(options.transport),
          ...(options.attack === "partition"
            ? { partitions: [{ fromMs: 0, toMs: 10_000 }] }
            : {}),
        },
      },
    ],
    oracles: [
      {
        name: `${machine}-safety`,
        check: (world: { nodes: ReadonlyMap<string, QuorumState> }) => {
          const state = world.nodes.get(target);
          const violation =
            state?.role === "escrow"
              ? escrowSafetyViolation(state.escrow)
              : state?.role === "recovery"
                ? recoveryQuorumSafetyViolation(state.recovery)
                : null;
          return violation === null
            ? null
            : {
                oracle: `${machine}-safety`,
                message: violation,
                nodes: [target],
              };
        },
      },
    ],
    ...(options.recorder === undefined ? {} : { recorder: options.recorder }),
  };
  return {
    config,
    description: {
      name: `${machine}-${options.attack}`,
      protocolMachines: [machine],
      adversaryPowers: powers,
      transport: options.transport,
    },
  };
}

function quorumActorStep(
  machine: "escrow" | "recovery",
  attack: QuorumAttack,
): StepFn<QuorumState> {
  return (state, event) => {
    if (state.role !== "actor" || event.kind !== "start")
      return { state, intents: [] };
    const channels =
      machine === "escrow"
        ? [
            "escrow/deposit",
            "escrow/request",
            `escrow/authorize/${
              attack === "below-threshold" || attack === "expiry"
                ? "a"
                : attack === "colluding-pair"
                  ? "colluder-a,colluder-b"
                  : "a,b"
            }`,
            ...(attack === "replay" ? ["escrow/authorize/a,b"] : []),
            ...(attack === "expiry" ? ["escrow/ttl"] : []),
          ]
        : attack === "expiry"
          ? [
              "recovery/start",
              "recovery/share/a",
              "recovery/ttl",
              "recovery/authorize",
            ]
          : [
              "recovery/start",
              `recovery/share/${attack === "colluding-pair" ? "colluder-a" : "a"}`,
              `recovery/share/${
                attack === "duplicate" || attack === "below-threshold"
                  ? "a"
                  : attack === "colluding-pair"
                    ? "colluder-b"
                    : "b"
              }`,
              ...(attack === "replay" ? ["recovery/share/a"] : []),
              "recovery/authorize",
            ];
    return {
      state: { ...state, sent: channels.length },
      intents: channels.map(send),
    };
  };
}

function escrowTargetStep(broken: boolean): StepFn<QuorumState> {
  return (state, event) => {
    if (state.role !== "escrow" || event.kind !== "transport/recv")
      return { state, intents: [] };
    let stepped = { state: state.escrow, intents: [] as readonly Intent[] };
    if (event.channel === "escrow/deposit")
      stepped = stepEscrow(state.escrow, {
        kind: "escrow/deposit",
        amount: 10,
      });
    else if (event.channel === "escrow/request")
      stepped = stepEscrow(state.escrow, { kind: "escrow/request-release" });
    else if (event.channel.startsWith("escrow/authorize/")) {
      const authorizers = event.channel
        .slice("escrow/authorize/".length)
        .split(",");
      stepped =
        broken && state.escrow.phase === "release-requested"
          ? {
              state: {
                ...state.escrow,
                phase: "released",
                authorizers,
                releasedAmount: state.escrow.amount,
              },
              intents: [],
            }
          : stepEscrow(state.escrow, { kind: "escrow/authorize", authorizers });
    } else if (event.channel === "escrow/ttl")
      stepped = stepEscrow(state.escrow, { kind: "escrow/ttl" });
    return {
      state: { ...state, escrow: stepped.state },
      intents: stepped.intents,
    };
  };
}

function recoveryTargetStep(broken: boolean): StepFn<QuorumState> {
  return (state, event) => {
    if (state.role !== "recovery" || event.kind !== "transport/recv")
      return { state, intents: [] };
    const current = state.recovery;
    let next = current;
    if (event.channel === "recovery/start")
      next = stepRecoveryQuorum(current, { kind: "recovery/start" }).state;
    else if (event.channel.startsWith("recovery/share/"))
      next = stepRecoveryQuorum(current, {
        kind: "recovery/share",
        guardian: event.channel.slice("recovery/share/".length),
      }).state;
    else if (event.channel === "recovery/authorize")
      next =
        broken && current.phase === "collecting"
          ? { ...current, phase: "recovered", recoveredWith: current.shares }
          : stepRecoveryQuorum(current, { kind: "recovery/authorize" }).state;
    else if (event.channel === "recovery/ttl")
      next = stepRecoveryQuorum(current, { kind: "recovery/ttl" }).state;
    return { state: { ...state, recovery: next }, intents: [] };
  };
}

function quorumAdversaryActions(
  attack: QuorumAttack,
  destination: "escrow" | "recovery",
): readonly TransportAdversaryAction[] {
  if (attack === "drop")
    return [{ power: "drop", source: "actor", destination }];
  if (attack === "delay")
    return [{ power: "delay", source: "actor", destination, delayMs: 2 }];
  if (attack === "duplicate")
    return [{ power: "duplicate", source: "actor", destination }];
  if (attack === "colluding-pair")
    return [{ power: "reorder", source: "actor", destination }];
  return [];
}

function adversaryStep(
  actions: readonly TransportAdversaryAction[],
): StepFn<QuorumState> {
  return (state, event: Event) =>
    state.role === "adversary" && event.kind === "start" && !state.acted
      ? {
          state: { ...state, acted: true },
          intents: actions.map((action): Intent => ({
            kind: "transport/adversary",
            action,
          })),
        }
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
  readonly ranking: readonly string[];
  readonly containmentBreaches: number;
  readonly deliveryTimes: readonly number[];
  readonly blockedAt: number | null;
  readonly severedAt: number | null;
}

export function createSocialCampaignScenario(
  kind: SocialKind,
  transport: TransportClassName,
  options: {
    readonly containment?: boolean;
    readonly defectivePolicy?: boolean;
    readonly recorder?: HistoryRecorder<SocialCampaignState>;
  } = {},
): CampaignScenario<SocialCampaignState> {
  const initial: SocialCampaignState = {
    role: "sender",
    sent: 0,
    delivered: 0,
    blocked: false,
    severed: false,
    votes: [],
    outcome: 0,
    ranking: [],
    containmentBreaches: 0,
    deliveryTimes: [],
    blockedAt: null,
    severedAt: null,
  };
  const service: SocialCampaignState = { ...initial, role: "service" };
  return {
    config: {
      seed: 1,
      nodes: [
        {
          id: "social-adversary",
          machine: `social/${kind}-adversary`,
          initial,
          step: socialSender(kind, options.containment !== false),
        },
        ...socialServiceNodes(
          kind,
          transport,
          service,
          options.defectivePolicy === true,
        ),
      ],
      links: socialCampaignLinks(kind, transport),
      oracles: [socialAssuranceOracle(kind)],
      ...(options.recorder === undefined ? {} : { recorder: options.recorder }),
    },
    description: {
      name: `social-${kind}`,
      protocolMachines: [`social-${kind}`],
      adversaryPowers: [],
      transport,
    },
    measureContainment: (kernel) =>
      measureSocialContainment(kernel, kind, transport),
  };
}

function socialServiceNodes(
  kind: SocialKind,
  transport: TransportClassName,
  service: SocialCampaignState,
  defectivePolicy: boolean,
) {
  if (kind !== "harassment") {
    return [
      {
        id: "social-service",
        machine: `social/${kind}-service`,
        initial: service,
        step: socialService(kind, transport, [], defectivePolicy),
      },
    ];
  }
  return [
    {
      id: "social-service",
      machine: "social/harassment-discovery-gateway",
      initial: service,
      step: socialService(
        kind,
        transport,
        ["social-peer-a", "social-peer-b"],
        defectivePolicy,
      ),
    },
    {
      id: "social-peer-a",
      machine: "social/harassment-discovery-peer",
      initial: service,
      step: socialService(kind, transport, ["social-peer-b"], defectivePolicy),
    },
    {
      id: "social-peer-b",
      machine: "social/harassment-discovery-peer",
      initial: service,
      step: socialService(kind, transport, [], defectivePolicy),
    },
  ];
}

function socialCampaignLinks(kind: SocialKind, transport: TransportClassName) {
  const adversaryLink = {
    source: "social-adversary",
    destination: "social-service",
    class: transport,
    params: clean(transport),
  };
  if (kind !== "harassment") return [adversaryLink];
  return [
    adversaryLink,
    {
      source: "social-service",
      destination: "social-peer-a",
      class: transport,
      params: clean(transport),
    },
    {
      source: "social-service",
      destination: "social-peer-b",
      class: transport,
      params: clean(transport),
    },
    {
      source: "social-peer-a",
      destination: "social-peer-b",
      class: transport,
      params: clean(transport),
    },
  ];
}

function socialAssuranceOracle(kind: SocialKind) {
  return {
    name: "social-assurance",
    check: (world: { nodes: ReadonlyMap<string, SocialCampaignState> }) => {
      const state = world.nodes.get("social-service");
      if (
        kind === "spam" &&
        state !== undefined &&
        state.delivered > 0 &&
        state.outcome <= 0
      )
        return {
          oracle: "spam-executed-economics",
          message: "executed spam traffic has no accounted cost",
        };
      if (
        kind === "harassment" &&
        [...world.nodes.values()].some((node) => node.containmentBreaches > 0)
      )
        return {
          oracle: "harassment-containment",
          message: "harassment propagated after block or sever",
        };
      return kind === "reputation" &&
        (state?.votes.length ?? 0) >= 4 &&
        state?.ranking[0] === "target"
        ? {
            oracle: "reputation-resilience",
            message: "colluders displaced the trusted candidate",
          }
        : null;
    },
  };
}

function socialSender(
  kind: SocialKind,
  containment: boolean,
): StepFn<SocialCampaignState> {
  return (state, event) => {
    if (state.role !== "sender" || event.kind !== "start")
      return { state, intents: [] };
    const channels =
      kind === "spam"
        ? Array.from({ length: 12 }, () => "spam/send")
        : kind === "harassment"
          ? containment
            ? [
                "harass/a",
                "harass/b",
                "contain/block",
                "harass/c",
                "contain/sever",
                "harass/d",
              ]
            : ["harass/a", "harass/b", "harass/c", "harass/d"]
          : [
              "vote/c1/target/1",
              "vote/c2/target/1",
              "vote/honest/target/-1",
              "vote/honest/alternative/1",
            ];
    return {
      state: { ...state, sent: channels.length },
      intents: channels.map(send),
    };
  };
}

function socialService(
  kind: SocialKind,
  transport: TransportClassName,
  neighbors: readonly string[],
  defectivePolicy: boolean,
): StepFn<SocialCampaignState> {
  return (state, event) => {
    if (state.role !== "service" || event.kind !== "transport/recv")
      return { state, intents: [] };
    if (event.channel === "contain/block")
      return {
        state: { ...state, blocked: true, blockedAt: event.at },
        intents: [],
      };
    if (event.channel === "contain/sever")
      return {
        state: { ...state, severed: true, severedAt: event.at },
        intents: [],
      };
    if (kind === "spam") {
      const delivered = state.delivered + 1;
      const economics = spamEconomics({
        transport,
        payloadBytes: event.payload.length,
        messages: delivered,
        payoffPerDelivery: 0.01,
      });
      return {
        state: {
          ...state,
          delivered,
          deliveryTimes: [...state.deliveryTimes, event.at],
          outcome: defectivePolicy ? 0 : economics.attackerCost,
        },
        intents: [],
      };
    }
    if (kind === "harassment")
      return state.blocked || state.severed
        ? {
            state: defectivePolicy
              ? { ...state, containmentBreaches: state.containmentBreaches + 1 }
              : state,
            intents: [],
          }
        : {
            state: {
              ...state,
              delivered: state.delivered + 1,
              deliveryTimes: [...state.deliveryTimes, event.at],
              outcome: state.outcome + 1,
            },
            intents: neighbors.map((destination) =>
              sendTo(event.channel, destination, event.payload),
            ),
          };
    const [, from = "", to = "", raw = "-1"] = event.channel.split("/");
    const vote = {
      from,
      to,
      value: raw === "1" ? (1 as const) : (-1 as const),
    };
    const votes = [...state.votes, vote];
    const scores = reputationUnderCollusion(
      votes,
      new Set(["c1", "c2"]),
      defectivePolicy ? 2 : 0.1,
    );
    const ranking = Object.keys(scores).sort(
      (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0) || a.localeCompare(b),
    );
    return {
      state: {
        ...state,
        votes,
        delivered: state.delivered + 1,
        deliveryTimes: [...state.deliveryTimes, event.at],
        outcome: scores.target ?? 0,
        ranking,
      },
      intents: [],
    };
  };
}

function measureSocialContainment(
  kernel: SimKernel<SocialCampaignState>,
  kind: SocialKind,
  transport: TransportClassName,
): ContainmentMetrics {
  if (kind !== "harassment")
    return {
      transport,
      revocationPropagationMs: null,
      egressAttributability: null,
      networkKillLatencyMs: null,
      damageWindow: 0,
    };
  const gateway = kernel.getNodeState("social-service");
  const nodes = ["social-service", "social-peer-a", "social-peer-b"].map((id) =>
    kernel.getNodeState(id),
  );
  const afterBlock =
    gateway.blockedAt === null
      ? []
      : nodes
          .flatMap((state) => state.deliveryTimes)
          .filter((at) => at > gateway.blockedAt!);
  return {
    transport,
    revocationPropagationMs:
      gateway.blockedAt === null
        ? null
        : Math.max(gateway.blockedAt, ...afterBlock) - gateway.blockedAt,
    egressAttributability: nodes.some((state) => state.delivered > 0)
      ? 1
      : null,
    networkKillLatencyMs:
      gateway.blockedAt === null || gateway.severedAt === null
        ? null
        : gateway.severedAt - gateway.blockedAt,
    damageWindow: afterBlock.length,
  };
}

export function executedSpamEconomics(
  kernel: {
    readonly transport: {
      getStats(): {
        sent: number;
        dropped: number;
        dutyCycleDropped: number;
        dutyCycleDelayed: number;
        serializedBytes: number;
        airtimeMs: number;
      };
    };
    getNodeState(id: string): SocialCampaignState;
  },
  transport: TransportClassName,
) {
  const stats = kernel.transport.getStats();
  const delivered = kernel.getNodeState("social-service").delivered;
  return spamEconomics({
    transport,
    payloadBytes: 1,
    messages: stats.sent,
    deliveredMessages: delivered,
    lostMessages: stats.dropped,
    serializedBytes: stats.serializedBytes,
    executedAirtimeMs: stats.airtimeMs,
    dutyCycleOutcomes: stats.dutyCycleDropped + stats.dutyCycleDelayed,
    payoffPerDelivery: 0.01,
  });
}

function send(channel: string): Intent {
  return {
    kind: "transport/send",
    send: {
      channel,
      destination: channel.startsWith("escrow/")
        ? "escrow"
        : channel.startsWith("recovery/")
          ? "recovery"
          : "social-service",
      payload: new Uint8Array([1]),
    },
  };
}
function sendTo(
  channel: string,
  destination: string,
  payload: Uint8Array,
): Intent {
  return { kind: "transport/send", send: { channel, destination, payload } };
}
function clean(transport: TransportClassName) {
  return {
    lossRate: 0,
    latency: { kind: "fixed" as const, ms: transport === "lora" ? 20 : 1 },
    burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 },
  };
}
