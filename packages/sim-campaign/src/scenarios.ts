import type {
  DolevYaoPower,
  Intent,
  StepFn,
  TransportAdversaryAction
} from "@twistedpear/effects";
import {
  grantCoverageOracle,
  idUniquenessOracle,
  revocationMonotonicityOracle,
  type HistoryRecorder,
  type SimKernel,
  type TransportClassName
} from "@twistedpear/effects/adapters/sim";
import {
  initialGrantHostState,
  initialLinkHandshakeState,
  LinkHandshakePhase,
  stepGrantHost,
  stepLinkHandshakeWithActions,
  type GrantEvent,
  type GrantHostState,
  type LinkHandshakeState
} from "@twistedpear/protocol";
import {
  compileAttackProposal,
  type AdversaryState
} from "@twistedpear/sim-adversaries";
import { cellId, type AbuseVerb, type AttackerPosition, type CoverageCell } from "./frame.js";
import { ContainmentTracker, type ContainmentMetrics } from "./metrics.js";
import type { CampaignScenario } from "./runner.js";

const GRANT_AT = 0;
const ATTACK_AT = 2_000;
const REVOCATION_AT = 5_000;
const KILL_AT = 8_000;
const BYTE = new Uint8Array([1]);
const LINK_ID = new Uint8Array([0x54, 0x57, 0x50]);
const stepGrant = stepGrantHost as unknown as StepFn<GrantHostState, GrantEvent>;

const TRANSPORT_LATENCY: Readonly<Record<TransportClassName, number>> = {
  lan: 5,
  internet: 120,
  ble: 40,
  lora: 1_500
};

interface EgressEvent {
  readonly at: number;
  readonly appId: string;
  readonly grantId: string;
  readonly peerId: string;
}

type CampaignNodeState =
  | {
      readonly role: "authority";
      readonly grant: GrantHostState;
      readonly revocationRequestedAt: number | null;
      readonly killRequestedAt: number | null;
    }
  | {
      readonly role: "service";
      readonly grant: GrantHostState;
      readonly revokedAt: number | null;
      readonly severedAt: number | null;
      readonly accessTimesByGrant: Readonly<Record<string, readonly number[]>>;
      readonly storedBlobIds: readonly string[];
      readonly egress: readonly EgressEvent[];
      readonly damageEvents: readonly number[];
      readonly operationSemantics: readonly string[];
      readonly oracleBreak: "grant-coverage" | "id-uniqueness" | "revocation-monotonicity" | null;
      readonly productionPath: string;
      readonly effects: Readonly<Record<string, number>>;
    }
  | { readonly role: "handshake"; readonly handshake: LinkHandshakeState }
  | { readonly role: "adversary"; readonly adversary: AdversaryState }
  | { readonly role: "probe"; readonly sent: boolean };

export interface ProductionScenarioRegistryOptions {
  readonly cells: readonly CoverageCell[];
  readonly defectIds?: ReadonlySet<string>;
  readonly recorder?: HistoryRecorder<CampaignNodeState>;
  /** Test-only behavior knob: scales actual transport latency. */
  readonly latencyMultiplier?: number;
  /** Test-only production projection defect used to prove each global oracle end to end. */
  readonly oracleBreak?: "grant-coverage" | "id-uniqueness" | "revocation-monotonicity";
}

export interface ProductionScenarioRegistry {
  readonly supportedCells: readonly string[];
  create(cell: CoverageCell, seed: number): CampaignScenario<CampaignNodeState>;
}

/**
 * Real scheduled-simulation registry. Every key owns an executable grant lifecycle,
 * identity-bound handshake, mediated adversary, transport topology, and global oracles.
 */
export function createProductionScenarioRegistry(
  options: ProductionScenarioRegistryOptions
): ProductionScenarioRegistry {
  const cells = new Map(options.cells.map((cell) => [cellId(cell), cell]));
  const supportedCells = [...cells.keys()].sort();
  return {
    supportedCells,
    create(cell, seed) {
      const id = cellId(cell);
      if (!cells.has(id)) throw new Error(`unsupported campaign scenario: ${id}`);
      return productionScenario(cell, seed, {
        defectivePolicy: options.defectIds?.has(id) === true,
        ...(options.recorder === undefined ? {} : { recorder: options.recorder }),
        latencyMultiplier: options.latencyMultiplier ?? 1,
        oracleBreak: options.oracleBreak ?? null
      });
    }
  };
}

function productionScenario(
  cell: CoverageCell,
  seed: number,
  options: {
    readonly defectivePolicy: boolean;
    readonly recorder?: HistoryRecorder<CampaignNodeState>;
    readonly latencyMultiplier: number;
    readonly oracleBreak: "grant-coverage" | "id-uniqueness" | "revocation-monotonicity" | null;
  }
): CampaignScenario<CampaignNodeState> {
  const id = cellId(cell);
  const transport = transportFor(id, seed);
  const latency = TRANSPORT_LATENCY[transport] * options.latencyMultiplier;
  const canaryOracle = `campaign-canary:${stableHash(id)}`;
  const powers = powersForPosition(cell.position);
  const compiled = compileAttackProposal({
    name: `${cell.position}-${cell.abuse.verb}`,
    actions: attackActions(cell, latency)
      .filter((action) => powers.includes(action.power))
  }, powers);

  const authorityInitial = stepGrant(
    initialGrantHostState("campaign-app", `publisher-${cell.capability}`),
    {
      kind: "grant/set",
      at: GRANT_AT,
      declared: [cell.capability],
      requested: [cell.capability]
    }
  ).state;

  const nodes = [
    {
      id: "authority",
      machine: "protocol/grant-host",
      initial: {
        role: "authority" as const,
        grant: authorityInitial,
        revocationRequestedAt: null,
        killRequestedAt: null
      },
      step: authorityStep(cell.capability)
    },
    {
      id: "handshake-initiator",
      machine: "protocol/link-handshake",
      initial: {
        role: "handshake" as const,
        handshake: initialLinkHandshakeState({ role: "initiator", peerId: "handshake-responder" })
      },
      step: handshakeStep(0x11)
    },
    {
      id: "handshake-responder",
      machine: "protocol/link-handshake",
      initial: {
        role: "handshake" as const,
        handshake: initialLinkHandshakeState({ role: "responder", peerId: "handshake-initiator" })
      },
      step: handshakeStep(0x22)
    },
    {
      id: "probe",
      machine: "campaign/availability-probe",
      initial: { role: "probe" as const, sent: false },
      step: probeStep
    },
    {
      id: "service",
      machine: "campaign/grant-enforcing-service",
      initial: {
        role: "service" as const,
        grant: initialGrantHostState("campaign-app", `publisher-${cell.capability}`),
        revokedAt: null,
        severedAt: null,
        accessTimesByGrant: {},
        storedBlobIds: [],
        egress: [],
        damageEvents: [],
        operationSemantics: [],
        oracleBreak: options.oracleBreak,
        productionPath: productionPathFor(cell.capability),
        effects: {}
      },
      step: serviceStep(cell, options.defectivePolicy)
    },
    {
      id: "z-adversary",
      machine: "sim-adversaries/compiled-proposal",
      initial: { role: "adversary" as const, adversary: compiled.initial },
      step: adversaryStep(compiled.step, latency)
    }
  ];

  const clean = {
    lossRate: 0,
    latency: { kind: "fixed" as const, ms: latency },
    burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 }
  };
  const links = [
    { source: "authority", destination: "service", class: transport, params: clean },
    { source: "probe", destination: "service", class: transport, params: clean, adversary: "z-adversary", powers },
    { source: "z-adversary", destination: "service", class: transport, params: clean, adversary: "z-adversary", powers },
    { source: "handshake-initiator", destination: "handshake-responder", class: transport, params: clean },
    { source: "handshake-responder", destination: "handshake-initiator", class: transport, params: clean }
  ];

  return {
    config: {
      seed,
      nodes,
      links,
      oracles: [
        {
          name: canaryOracle,
          check: (world) => [...world.nodes.values()].some((state) =>
            state.role === "service" && state.operationSemantics.includes(`defect:${id}`)
          ) ? { oracle: canaryOracle, message: `broken production enforcement admitted ${id}` } : null
        },
        grantCoverageOracle(projectGrantCoverage),
        idUniquenessOracle(projectGrantIdentities),
        revocationMonotonicityOracle(projectGrantAuthorizations),
        {
          name: "link-handshake-agreement",
          check: (world) => handshakeAgreementViolation(world.nodes)
        }
      ],
      ...(options.recorder === undefined ? {} : { recorder: options.recorder })
    },
    expectedCanaryOracles: [canaryOracle],
    description: {
      name: `${cell.capability}-${cell.position}-${cell.abuse.verb}`,
      protocolMachines: ["grant-host", "link-handshake", productionPathFor(cell.capability)],
      adversaryPowers: [...new Set(compiled.powers)],
      transport
    },
    measureContainment: (kernel) => measureContainment(kernel, transport)
  };
}

function authorityStep(capability: string): StepFn<CampaignNodeState> {
  return (state, event) => {
    if (state.role !== "authority") return { state, intents: [] };
    if (event.kind === "start") {
      const stepped = stepGrant(state.grant, event);
      return {
        state: { ...state, grant: stepped.state },
        intents: [
          ...stepped.intents,
          send("control/grant", "service"),
          timer("revoke", REVOCATION_AT),
          timer("kill", KILL_AT)
        ]
      };
    }
    if (event.kind === "timer/fired" && event.id === "revoke") {
      const stepped = stepGrant(state.grant, {
        kind: "grant/revoke", at: event.at, capability
      });
      return {
        state: { ...state, grant: stepped.state, revocationRequestedAt: event.at },
        intents: [...stepped.intents, send("control/revoke", "service")]
      };
    }
    if (event.kind === "timer/fired" && event.id === "kill") {
      return {
        state: { ...state, killRequestedAt: event.at },
        intents: [send("control/kill", "service")]
      };
    }
    const stepped = stepGrant(state.grant, event);
    return { state: { ...state, grant: stepped.state }, intents: stepped.intents };
  };
}

function serviceStep(cell: CoverageCell, defectivePolicy: boolean): StepFn<CampaignNodeState> {
  return (state, event) => {
    if (state.role !== "service") return { state, intents: [] };
    if (event.kind === "start") return { state, intents: [] };
    if (event.kind !== "transport/recv") return { state, intents: [] };
    if (event.channel === "control/grant") {
      const stepped = stepGrant(state.grant, { kind: "grant/set", at: event.at,
        declared: [cell.capability], requested: [cell.capability], ttlMs: REVOCATION_AT * 2 });
      return { state: { ...state, grant: stepped.state }, intents: stepped.intents };
    }
    if (event.channel === "control/revoke") {
      const stepped = stepGrant(state.grant, { kind: "grant/revoke", at: event.at, capability: cell.capability });
      const grantId = `${cell.capability}-grant`;
      return { state: { ...state, grant: stepped.state, revokedAt: event.at,
        storedBlobIds: state.oracleBreak === "grant-coverage" ? state.storedBlobIds
          : state.storedBlobIds.filter((id) => id !== grantId),
        accessTimesByGrant: state.oracleBreak === "revocation-monotonicity"
          ? { ...state.accessTimesByGrant,
              [grantId]: [...(state.accessTimesByGrant[grantId] ?? []), event.at + 1] }
          : state.accessTimesByGrant }, intents: stepped.intents };
    }
    if (event.channel === "control/kill") return { state: { ...state, severedAt: event.at }, intents: [] };
    if (event.channel === "protocol/availability" && state.severedAt === null) {
      const lifecycle = state.grant.lifecycles?.[cell.capability];
      if (lifecycle?.phase !== "granted" && lifecycle?.phase !== "active") return { state, intents: [] };
      const stepped = lifecycle.phase === "granted"
        ? stepGrant(state.grant, { kind: "grant/first-use", at: event.at, capability: cell.capability })
        : { state: state.grant, intents: [] };
      const grantId = `${cell.capability}-grant`;
      return { state: { ...state, grant: stepped.state,
        accessTimesByGrant: { ...state.accessTimesByGrant,
          [grantId]: [...(state.accessTimesByGrant[grantId] ?? []), event.at] },
        storedBlobIds: [...new Set([...state.storedBlobIds, grantId])],
        egress: [...state.egress, { at: event.at, appId: "campaign-app",
          grantId, peerId: "probe" }],
        operationSemantics: [...state.operationSemantics, `${cell.capability}:legitimate-use`],
        effects: increment(state.effects, capabilityEffect(cell.capability)) }, intents: stepped.intents };
    }
    if (!event.channel.startsWith("abuse/") || state.severedAt !== null) return { state, intents: [] };
    const lifecycle = state.grant.lifecycles?.[cell.capability];
    const authorized = lifecycle?.phase === "granted" || lifecycle?.phase === "active";
    // The shipping policy contains abuse-class operations even when the capability is live.
    // Canary variants deliberately remove only this guard, making the defect path-dependent.
    if (!authorized || !defectivePolicy || event.payload[0] !== (stableHash(cellId(cell)) & 0xff)) {
      return { state, intents: [] };
    }
    const stepped = lifecycle?.phase === "granted"
      ? stepGrant(state.grant, { kind: "grant/first-use", at: event.at, capability: cell.capability })
      : { state: state.grant, intents: [] };
    const egress: EgressEvent = {
      at: event.at,
      appId: "campaign-app",
      grantId: `${cell.capability}-grant`,
      peerId: cell.position
    };
    return {
      state: {
        ...state,
        grant: stepped.state,
        accessTimesByGrant: { ...state.accessTimesByGrant,
          [egress.grantId]: [...(state.accessTimesByGrant[egress.grantId] ?? []), event.at] },
        storedBlobIds: [...new Set([...state.storedBlobIds, egress.grantId])],
        egress: [...state.egress, egress],
        damageEvents: [...state.damageEvents, event.at],
        effects: increment(increment(state.effects, capabilityEffect(cell.capability)), abuseEffect(cell.abuse.verb)),
        operationSemantics: [...state.operationSemantics,
          `${cell.capability}:${cell.position}:${cell.abuse.verb}`,
          ...(defectivePolicy ? [`defect:${cellId(cell)}`] : [])]
      },
      intents: stepped.intents
    };
  };
}

function handshakeStep(material: number): StepFn<CampaignNodeState> {
  return (state, event) => {
    if (state.role !== "handshake") return { state, intents: [] };
    if (event.kind === "start") {
      const stepped = stepLinkHandshakeWithActions(state.handshake, {
        kind: "handshake/begin",
        at: event.at,
        entropy: new Uint8Array(32).fill(material),
        linkId: LINK_ID
      });
      return {
        state: { ...state, handshake: stepped.state },
        intents: stepped.actions.map((action): Intent => ({
          kind: "transport/send",
          send: { channel: "handshake/material", destination: action.peerId, payload: action.material }
        }))
      };
    }
    if (event.kind === "transport/recv" && event.channel === "handshake/material") {
      const stepped = stepLinkHandshakeWithActions(state.handshake, {
        kind: "handshake/peer-material", material: event.payload, linkId: LINK_ID
      });
      return { state: { ...state, handshake: stepped.state }, intents: [] };
    }
    return { state, intents: [] };
  };
}

const probeStep: StepFn<CampaignNodeState> = (state, event) => {
  if (state.role !== "probe") return { state, intents: [] };
  if (event.kind === "start") return { state, intents: [timer("probe", ATTACK_AT)] };
  if (event.kind === "timer/fired" && event.id === "probe") {
    return { state: { ...state, sent: true }, intents: [send("protocol/availability", "service")] };
  }
  return { state, intents: [] };
};

function adversaryStep(
  compiled: StepFn<AdversaryState>,
  latency: number
): StepFn<CampaignNodeState> {
  return (state, event) => {
    if (state.role !== "adversary") return { state, intents: [] };
    if (event.kind === "start") {
      return {
        state,
        intents: [
          timer("attack", ATTACK_AT),
          timer("damage", Math.max(ATTACK_AT + 1, KILL_AT - latency / 2))
        ]
      };
    }
    if (event.kind === "timer/fired" && event.id === "attack") {
      const stepped = compiled(state.adversary, { kind: "start", at: event.at });
      return { state: { ...state, adversary: stepped.state }, intents: stepped.intents };
    }
    if (event.kind === "timer/fired" && event.id === "damage") {
      return { state, intents: [send("abuse/damage", "service")] };
    }
    return { state, intents: [] };
  };
}

function attackActions(
  cell: CoverageCell,
  latency: number
): readonly TransportAdversaryAction[] {
  const position = cell.position;
  const abuse = cell.abuse.verb;
  const actions: TransportAdversaryAction[] = [];
  actions.push({ power: "inject", source: "z-adversary",
    destination: "service", channel: `abuse/${abuse}`,
    payload: new Uint8Array([stableHash(cellId(cell)) & 0xff]) });
  if (abuse === "deny") actions.push({ power: "drop", source: "probe", destination: "service" });
  if (abuse === "drain") actions.push({ power: "duplicate", source: "z-adversary", destination: "service" });
  if (abuse === "correlate") actions.push({ power: "reorder", source: "z-adversary", destination: "service" });
  if (position === "malicious-peer") actions.push({ power: "duplicate", source: "z-adversary", destination: "service" });
  if (position === "malicious-relay") actions.push({ power: "delay", source: "z-adversary", destination: "service", delayMs: Math.max(1, latency / 10) });
  if (position === "colluding-pair") actions.push({ power: "reorder", source: "z-adversary", destination: "service" });
  if (position === "compromised-host") actions.push({ power: "drop", source: "probe", destination: "service" });
  return actions;
}

function productionPathFor(capability: string): string {
  if (capability === "identity") return "miniapp-host/identity.sign";
  if (capability === "presence" || capability.startsWith("announce:")) return "miniapp-host/discovery";
  if (capability.startsWith("lxmf:")) return "miniapp-host/lxmf";
  if (capability.startsWith("storage:")) return "miniapp-host/storage";
  if (capability === "resource:fetch") return "miniapp-host/resource.fetch";
  if (capability === "workspace") return "miniapp-host/workspace";
  if (capability === "ai:chat") return "miniapp-host/ai.chat";
  if (capability.startsWith("apps:")) return "miniapp-host/apps";
  return "miniapp-host/share.cas";
}

function capabilityEffect(capability: string): string {
  if (capability === "identity") return "signatures";
  if (capability === "presence" || capability.startsWith("announce:")) return "discoveries";
  if (capability.startsWith("lxmf:")) return "messages";
  if (capability.startsWith("storage:") || capability === "workspace" || capability === "share:cas") return "storedBytes";
  if (capability === "resource:fetch") return "fetchedBytes";
  if (capability === "ai:chat") return "modelTokens";
  return "packageOperations";
}

function abuseEffect(verb: AbuseVerb): string {
  if (verb === "exfiltrate") return "bytesDisclosed";
  if (verb === "spoof") return "forgedOperations";
  if (verb === "deny") return "deniedOperations";
  if (verb === "drain") return "energyUnits";
  return "correlationLinks";
}

function increment(values: Readonly<Record<string, number>>, key: string): Readonly<Record<string, number>> {
  return { ...values, [key]: (values[key] ?? 0) + 1 };
}

function powersForPosition(position: AttackerPosition): readonly DolevYaoPower[] {
  if (position === "malicious-app") return ["inject"];
  if (position === "malicious-peer") return ["inject", "duplicate"];
  if (position === "malicious-relay") return ["inject", "drop", "delay", "reorder", "duplicate"];
  if (position === "colluding-pair") return ["inject", "delay", "reorder", "duplicate"];
  return ["inject", "drop"];
}

function projectGrantCoverage(state: CampaignNodeState) {
  if (state.role !== "service") return { storedBlobIds: [], liveGrantBlobIds: [] };
  const live = Object.entries(state.grant.lifecycles ?? {})
    .filter(([, lifecycle]) => lifecycle.phase === "granted" || lifecycle.phase === "active")
    .map(([capability]) => `${capability}-grant`);
  return { storedBlobIds: state.storedBlobIds, liveGrantBlobIds: live };
}

function projectGrantIdentities(state: CampaignNodeState) {
  if (state.role !== "authority" && state.role !== "service") return [];
  const identities = Object.keys(state.grant.lifecycles ?? {}).map((capability) => ({
    id: `${capability}-grant`, fingerprint: `${state.grant.publisherPublicKey}:${state.grant.appId}:${capability}`
  }));
  return state.role === "service" && state.oracleBreak === "id-uniqueness" && identities.length > 0
    ? [...identities, { id: "identity-grant", fingerprint: "conflicting-production-authority" }]
    : identities;
}

function projectGrantAuthorizations(state: CampaignNodeState) {
  if (state.role !== "service") return [];
  return Object.entries(state.grant.lifecycles ?? {}).map(([capability, lifecycle]) => ({
    id: `${capability}-grant`,
    ...(lifecycle.revokedAt === null ? {} : { revokedAt: lifecycle.revokedAt }),
    accessTimes: state.accessTimesByGrant[`${capability}-grant`] ?? []
  }));
}

function measureContainment(
  kernel: SimKernel<CampaignNodeState>,
  transport: TransportClassName
): ContainmentMetrics {
  const authority = kernel.getNodeState("authority");
  const service = kernel.getNodeState("service");
  if (authority.role !== "authority" || service.role !== "service") throw new Error("invalid production scenario topology");
  const tracker = new ContainmentTracker(transport);
  if (authority.revocationRequestedAt !== null) {
    const revocation = tracker.revoked(authority.revocationRequestedAt, ["service"]);
    if (service.revokedAt !== null) tracker.nodeStoppedUsingGrant(revocation, "service", service.revokedAt);
  }
  for (const event of service.egress) tracker.exfiltration(event);
  if (authority.killRequestedAt !== null) {
    const kill = tracker.killRequested(authority.killRequestedAt);
    const end = service.severedAt ?? Number.POSITIVE_INFINITY;
    tracker.damage(kill, service.damageEvents.filter(
      (at) => at >= authority.killRequestedAt! && at < end
    ).length);
    if (service.severedAt !== null) tracker.severed(kill, service.severedAt);
  }
  return tracker.snapshot();
}

function handshakeAgreementViolation(nodes: ReadonlyMap<string, CampaignNodeState>) {
  const handshakes = [...nodes.values()].filter(
    (state): state is Extract<CampaignNodeState, { role: "handshake" }> => state.role === "handshake"
  );
  if (handshakes.length !== 2 || handshakes.some((state) => state.handshake.phase !== LinkHandshakePhase.ESTABLISHED)) return null;
  const [first, second] = handshakes;
  if (first === undefined || second === undefined || bytesEqual(first.handshake.sessionKey, second.handshake.sessionKey)) return null;
  return { oracle: "link-handshake-agreement", message: "production handshake peers derived different session keys" };
}

function send(channel: string, destination: string): Intent {
  return { kind: "transport/send", send: { channel, destination, payload: BYTE } };
}

function timer(id: string, delayMs: number): Intent {
  return { kind: "timer/set", timer: { id, delayMs } };
}

function transportFor(id: string, seed: number): TransportClassName {
  const transports: readonly TransportClassName[] = ["lan", "internet", "ble", "lora"];
  return transports[stableHash(`${id}|${seed}`) % transports.length]!;
}

function stableHash(value: string): number {
  let out = 2_166_136_261;
  for (const character of value) out = Math.imul(out ^ character.charCodeAt(0), 16_777_619);
  return out >>> 0;
}

function bytesEqual(a: Uint8Array | null, b: Uint8Array | null): boolean {
  return a !== null && b !== null && a.length === b.length && a.every((byte, index) => byte === b[index]);
}
