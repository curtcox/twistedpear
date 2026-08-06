import type {
  DolevYaoPower,
  Intent,
  StepFn,
  TransportAdversaryAction,
} from "@twistedpear/effects";
import type {
  SimKernel,
  TransportClassName,
} from "@twistedpear/effects/adapters/sim";
import {
  LinkHandshakePhase,
  stepGrantHost,
  stepLinkHandshakeWithActions,
  type GrantEvent,
  type GrantHostState,
  type LinkHandshakeState,
} from "@twistedpear/protocol";
import type { AdversaryState } from "@twistedpear/sim-adversaries";
import type { ProductionCapabilityObservation } from "@twistedpear/miniapp-runtime";
import {
  cellId,
  type AbuseVerb,
  type AttackerPosition,
  type CoverageCell,
} from "./frame.js";
import { ContainmentTracker, type ContainmentMetrics } from "./metrics.js";

export const GRANT_AT = 0;
export const ATTACK_AT = 2_000;
export const REVOCATION_AT = 5_000;
const KILL_AT = 8_000;
const BYTE = new Uint8Array([1]);
const LINK_ID = new Uint8Array([0x54, 0x57, 0x50]);
export const stepGrant = stepGrantHost as unknown as StepFn<
  GrantHostState,
  GrantEvent
>;

export const TRANSPORT_LATENCY: Readonly<Record<TransportClassName, number>> = {
  lan: 5,
  internet: 120,
  ble: 40,
  lora: 1_500,
  freenet: 89,
};

interface EgressEvent {
  readonly at: number;
  readonly appId: string;
  readonly grantId: string;
  readonly peerId: string;
}

export type CampaignNodeState =
  | {
      readonly role: "authority";
      readonly grant: GrantHostState;
      readonly revocationRequestedAt: number | null;
      readonly killRequestedAt: number | null;
    }
  | {
      readonly role: "service";
      readonly revokedAt: number | null;
      readonly severedAt: number | null;
      readonly egress: readonly EgressEvent[];
      readonly damageEvents: readonly number[];
      readonly operationSemantics: readonly string[];
      readonly oracleBreak:
        "grant-coverage" | "id-uniqueness" | "revocation-monotonicity" | null;
      readonly productionPath: string;
      readonly productionObservation: ProductionCapabilityObservation | null;
    }
  | { readonly role: "handshake"; readonly handshake: LinkHandshakeState }
  | { readonly role: "adversary"; readonly adversary: AdversaryState }
  | { readonly role: "probe"; readonly sent: boolean };
export function authorityStep(capability: string): StepFn<CampaignNodeState> {
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
          timer("kill", KILL_AT),
        ],
      };
    }
    if (event.kind === "timer/fired" && event.id === "revoke") {
      const stepped = stepGrant(state.grant, {
        kind: "grant/revoke",
        at: event.at,
        capability,
      });
      return {
        state: {
          ...state,
          grant: stepped.state,
          revocationRequestedAt: event.at,
        },
        intents: [...stepped.intents, send("control/revoke", "service")],
      };
    }
    if (event.kind === "timer/fired" && event.id === "kill") {
      return {
        state: { ...state, killRequestedAt: event.at },
        intents: [send("control/kill", "service")],
      };
    }
    const stepped = stepGrant(state.grant, event);
    return {
      state: { ...state, grant: stepped.state },
      intents: stepped.intents,
    };
  };
}

export function serviceStep(
  cell: CoverageCell,
  defectivePolicy: boolean,
  observations: () => {
    readonly grantedObservation: ProductionCapabilityObservation | null;
    readonly revokedObservation: ProductionCapabilityObservation | null;
  },
): StepFn<CampaignNodeState> {
  return (state, event) => {
    if (state.role !== "service") return { state, intents: [] };
    if (event.kind === "start") return { state, intents: [] };
    if (event.kind !== "transport/recv") return { state, intents: [] };
    if (event.channel === "control/grant") {
      const production = observations().grantedObservation;
      if (production === null || !production.response.ok)
        return { state, intents: [] };
      return {
        state: { ...state, productionObservation: production },
        intents: [],
      };
    }
    if (event.channel === "control/revoke") {
      return {
        state: {
          ...state,
          revokedAt: event.at,
          productionObservation:
            observations().revokedObservation ?? state.productionObservation,
        },
        intents: [],
      };
    }
    if (event.channel === "control/kill")
      return { state: { ...state, severedAt: event.at }, intents: [] };
    if (event.channel === "protocol/availability" && state.severedAt === null) {
      const lifecycle = state.productionObservation?.authority[cell.capability];
      if (lifecycle?.phase !== "granted" && lifecycle?.phase !== "active")
        return { state, intents: [] };
      if (!state.productionObservation?.response.ok)
        return { state, intents: [] };
      const grantId = `${cell.capability}-grant`;
      return {
        state: {
          ...state,
          egress: [
            ...state.egress,
            { at: event.at, appId: "campaign-app", grantId, peerId: "probe" },
          ],
          operationSemantics: [
            ...state.operationSemantics,
            `${cell.capability}:legitimate-use`,
          ],
        },
        intents: [],
      };
    }
    if (!event.channel.startsWith("abuse/") || state.severedAt !== null)
      return { state, intents: [] };
    const lifecycle = state.productionObservation?.authority[cell.capability];
    const authorized =
      lifecycle?.phase === "granted" || lifecycle?.phase === "active";
    // Each defect variant removes one phase-specific guard. Whether it is reached depends on
    // the race between the real availability use and the adversarial payload over this transport.
    const attackSuppressesUse =
      cell.abuse.verb === "deny" || cell.position === "compromised-host";
    const requiresActive =
      !attackSuppressesUse && (stableHash(cellId(cell)) & 1) === 0;
    const scheduledUseObserved = state.operationSemantics.includes(
      `${cell.capability}:legitimate-use`,
    );
    const defectReached =
      defectivePolicy &&
      state.productionObservation?.negativeControlRejected === false &&
      event.payload[0] === (stableHash(cellId(cell)) & 0xff) &&
      (requiresActive ? scheduledUseObserved : !scheduledUseObserved);
    if (
      !authorized ||
      !state.productionObservation?.response.ok ||
      !defectReached
    )
      return { state, intents: [] };
    const egress: EgressEvent = {
      at: event.at,
      appId: "campaign-app",
      grantId: `${cell.capability}-grant`,
      peerId: cell.position,
    };
    return {
      state: {
        ...state,
        egress: [...state.egress, egress],
        damageEvents: [...state.damageEvents, event.at],
        operationSemantics: [
          ...state.operationSemantics,
          `${cell.capability}:${cell.position}:${cell.abuse.verb}`,
          ...(defectivePolicy ? [`defect:${cellId(cell)}`] : []),
        ],
      },
      intents: [],
    };
  };
}

export function handshakeStep(material: number): StepFn<CampaignNodeState> {
  return (state, event) => {
    if (state.role !== "handshake") return { state, intents: [] };
    if (event.kind === "start") {
      const stepped = stepLinkHandshakeWithActions(state.handshake, {
        kind: "handshake/begin",
        at: event.at,
        entropy: new Uint8Array(32).fill(material),
        linkId: LINK_ID,
      });
      return {
        state: { ...state, handshake: stepped.state },
        intents: stepped.actions.map((action): Intent => ({
          kind: "transport/send",
          send: {
            channel: "handshake/material",
            destination: action.peerId,
            payload: action.material,
          },
        })),
      };
    }
    if (
      event.kind === "transport/recv" &&
      event.channel === "handshake/material"
    ) {
      const stepped = stepLinkHandshakeWithActions(state.handshake, {
        kind: "handshake/peer-material",
        material: event.payload,
        linkId: LINK_ID,
      });
      return { state: { ...state, handshake: stepped.state }, intents: [] };
    }
    return { state, intents: [] };
  };
}

export const probeStep: StepFn<CampaignNodeState> = (state, event) => {
  if (state.role !== "probe") return { state, intents: [] };
  if (event.kind === "start")
    return { state, intents: [timer("probe", ATTACK_AT)] };
  if (event.kind === "timer/fired" && event.id === "probe") {
    return {
      state: { ...state, sent: true },
      intents: [send("protocol/availability", "service")],
    };
  }
  return { state, intents: [] };
};

export function adversaryStep(
  compiled: StepFn<AdversaryState>,
  latency: number,
): StepFn<CampaignNodeState> {
  return (state, event) => {
    if (state.role !== "adversary") return { state, intents: [] };
    if (event.kind === "start") {
      return {
        state,
        intents: [
          timer("attack", ATTACK_AT),
          timer("damage", Math.max(ATTACK_AT + 1, KILL_AT - latency / 2)),
        ],
      };
    }
    if (event.kind === "timer/fired" && event.id === "attack") {
      const stepped = compiled(state.adversary, {
        kind: "start",
        at: event.at,
      });
      return {
        state: { ...state, adversary: stepped.state },
        intents: stepped.intents,
      };
    }
    if (event.kind === "timer/fired" && event.id === "damage") {
      return { state, intents: [send("abuse/damage", "service")] };
    }
    return { state, intents: [] };
  };
}

export function attackActions(
  cell: CoverageCell,
  latency: number,
): readonly TransportAdversaryAction[] {
  const position = cell.position;
  const abuse = cell.abuse.verb;
  const actions: TransportAdversaryAction[] = [];
  actions.push({
    power: "inject",
    source: "z-adversary",
    destination: "service",
    channel: `abuse/${abuse}`,
    payload: new Uint8Array([stableHash(cellId(cell)) & 0xff]),
    delayMs: 100,
  });
  if (abuse === "deny")
    actions.push({ power: "drop", source: "probe", destination: "service" });
  if (abuse === "drain")
    actions.push({
      power: "duplicate",
      source: "z-adversary",
      destination: "service",
    });
  if (abuse === "correlate")
    actions.push({
      power: "reorder",
      source: "z-adversary",
      destination: "service",
    });
  if (position === "malicious-peer")
    actions.push({
      power: "duplicate",
      source: "z-adversary",
      destination: "service",
    });
  if (position === "malicious-relay")
    actions.push({
      power: "delay",
      source: "z-adversary",
      destination: "service",
      delayMs: Math.max(1, latency / 10),
    });
  if (position === "colluding-pair")
    actions.push({
      power: "reorder",
      source: "z-adversary",
      destination: "service",
    });
  if (position === "compromised-host")
    actions.push({ power: "drop", source: "probe", destination: "service" });
  return actions;
}

export function productionPathFor(capability: string): string {
  if (capability === "identity") return "miniapp-host/identity.sign";
  if (capability === "presence" || capability.startsWith("announce:"))
    return "miniapp-host/discovery";
  if (capability.startsWith("lxmf:")) return "miniapp-host/lxmf";
  if (capability.startsWith("storage:")) return "miniapp-host/storage";
  if (capability === "resource:fetch") return "miniapp-host/resource.fetch";
  if (capability === "workspace") return "miniapp-host/workspace";
  if (capability === "ai:chat") return "miniapp-host/ai.chat";
  if (capability.startsWith("apps:")) return "miniapp-host/apps";
  return "miniapp-host/share.cas";
}

export function productionHandlerFor(capability: string): string {
  if (capability === "identity") return "MiniappHost.identity.sign";
  if (capability === "presence") return "MiniappHost.presence.snapshot";
  if (capability === "announce:publish") return "MiniappHost.announce.publish";
  if (capability === "announce:subscribe")
    return "MiniappHost.announce.subscribe";
  if (capability === "lxmf:send") return "MiniappHost.lxmf.send";
  if (capability === "lxmf:receive") return "MiniappHost.lxmf.receive";
  if (capability === "storage:kv") return "MiniappHost.storage.kv.set";
  if (capability === "resource:fetch") return "MiniappHost.resource.fetch";
  if (capability === "workspace") return "MiniappHost.workspace.write";
  if (capability === "share:cas") return "MiniappHost.share.cas.put";
  return productionPathFor(capability);
}

export function capabilityEffect(capability: string): string {
  if (capability === "identity") return "signatures";
  if (capability === "presence" || capability.startsWith("announce:"))
    return "discoveries";
  if (capability.startsWith("lxmf:")) return "messages";
  if (
    capability.startsWith("storage:") ||
    capability === "workspace" ||
    capability === "share:cas"
  )
    return "storedBytes";
  if (capability === "resource:fetch") return "fetchedBytes";
  if (capability === "ai:chat") return "modelTokens";
  return "packageOperations";
}

export function abuseEffect(verb: AbuseVerb): string {
  if (verb === "exfiltrate") return "bytesDisclosed";
  if (verb === "spoof") return "forgedOperations";
  if (verb === "deny") return "deniedOperations";
  if (verb === "drain") return "energyUnits";
  return "correlationLinks";
}

export function powersForPosition(
  position: AttackerPosition,
): readonly DolevYaoPower[] {
  if (position === "malicious-app") return ["inject"];
  if (position === "malicious-peer") return ["inject", "duplicate"];
  if (position === "malicious-relay")
    return ["inject", "drop", "delay", "reorder", "duplicate"];
  if (position === "colluding-pair")
    return ["inject", "delay", "reorder", "duplicate"];
  return ["inject", "drop"];
}

export function positionAccessFor(position: AttackerPosition): string {
  if (position === "malicious-app") return "broker request surface only";
  if (position === "malicious-peer")
    return "authenticated peer ingress and replay";
  if (position === "malicious-relay")
    return "mediated link drop, delay, reorder, duplicate, and inject";
  if (position === "colluding-pair")
    return "two coordinated authenticated ingress paths";
  return "local host broker plus link suppression";
}

export function projectGrantCoverage(state: CampaignNodeState) {
  if (state.role !== "service")
    return { storedBlobIds: [], liveGrantBlobIds: [] };
  const authority = state.productionObservation?.authority ?? {};
  const live = Object.entries(authority)
    .filter(
      ([, lifecycle]) =>
        lifecycle.phase === "granted" || lifecycle.phase === "active",
    )
    .map(([capability]) => `${capability}-grant`);
  const publicStored =
    state.productionObservation?.publicGrant?.granted.map(
      (capability) => `${capability}-grant`,
    ) ?? [];
  return {
    storedBlobIds:
      state.oracleBreak === "grant-coverage"
        ? [...publicStored, `${Object.keys(authority)[0] ?? "identity"}-grant`]
        : publicStored,
    liveGrantBlobIds: live,
  };
}

export function projectGrantIdentities(state: CampaignNodeState) {
  if (state.role !== "service" || state.productionObservation === null)
    return [];
  const capability =
    Object.keys(state.productionObservation.authority)[0] ?? "identity";
  const identities = state.productionObservation.identityIds.map(
    (fingerprint, index) => ({
      id:
        index === 0 ? `${capability}-grant` : `${capability}-identity-${index}`,
      fingerprint,
    }),
  );
  return state.oracleBreak === "id-uniqueness" && identities.length > 0
    ? [
        ...identities,
        {
          id: identities[0]!.id,
          fingerprint: "conflicting-production-identity",
        },
      ]
    : identities;
}

export function projectGrantAuthorizations(state: CampaignNodeState) {
  if (state.role !== "service" || state.productionObservation === null)
    return [];
  const allowed = state.productionObservation.audit
    .filter((entry) => entry.allowed)
    .map((entry) => entry.at);
  return Object.entries(state.productionObservation.authority).map(
    ([capability, lifecycle]) => ({
      id: `${capability}-grant`,
      ...(lifecycle.revokedAt === null
        ? {}
        : { revokedAt: lifecycle.revokedAt }),
      accessTimes:
        state.oracleBreak === "revocation-monotonicity" &&
        lifecycle.revokedAt !== null
          ? [...allowed, lifecycle.revokedAt + 1]
          : allowed,
    }),
  );
}

export function measureContainment(
  kernel: SimKernel<CampaignNodeState>,
  transport: TransportClassName,
): ContainmentMetrics {
  const authority = kernel.getNodeState("authority");
  const service = kernel.getNodeState("service");
  if (authority.role !== "authority" || service.role !== "service")
    throw new Error("invalid production scenario topology");
  const tracker = new ContainmentTracker(transport);
  if (authority.revocationRequestedAt !== null) {
    const revocation = tracker.revoked(authority.revocationRequestedAt, [
      "service",
    ]);
    if (service.revokedAt !== null)
      tracker.nodeStoppedUsingGrant(revocation, "service", service.revokedAt);
  }
  for (const event of service.egress) tracker.exfiltration(event);
  if (authority.killRequestedAt !== null) {
    const kill = tracker.killRequested(authority.killRequestedAt);
    const end = service.severedAt ?? Number.POSITIVE_INFINITY;
    tracker.damage(
      kill,
      service.damageEvents.filter(
        (at) => at >= authority.killRequestedAt! && at < end,
      ).length,
    );
    if (service.severedAt !== null) tracker.severed(kill, service.severedAt);
  }
  return tracker.snapshot();
}

export function handshakeAgreementViolation(
  nodes: ReadonlyMap<string, CampaignNodeState>,
) {
  const handshakes = [...nodes.values()].filter(
    (state): state is Extract<CampaignNodeState, { role: "handshake" }> =>
      state.role === "handshake",
  );
  if (
    handshakes.length !== 2 ||
    handshakes.some(
      (state) => state.handshake.phase !== LinkHandshakePhase.ESTABLISHED,
    )
  )
    return null;
  const [first, second] = handshakes;
  if (
    first === undefined ||
    second === undefined ||
    bytesEqual(first.handshake.sessionKey, second.handshake.sessionKey)
  )
    return null;
  return {
    oracle: "link-handshake-agreement",
    message: "production handshake peers derived different session keys",
  };
}

function send(channel: string, destination: string): Intent {
  return {
    kind: "transport/send",
    send: { channel, destination, payload: BYTE },
  };
}

function timer(id: string, delayMs: number): Intent {
  return { kind: "timer/set", timer: { id, delayMs } };
}

export function transportFor(id: string, seed: number): TransportClassName {
  const transports: readonly TransportClassName[] = [
    "lan",
    "internet",
    "ble",
    "lora",
    "freenet",
  ];
  return transports[stableHash(`${id}|${seed}`) % transports.length]!;
}

export function stableHash(value: string): number {
  let out = 2_166_136_261;
  for (const character of value)
    out = Math.imul(out ^ character.charCodeAt(0), 16_777_619);
  return out >>> 0;
}

function bytesEqual(a: Uint8Array | null, b: Uint8Array | null): boolean {
  return (
    a !== null &&
    b !== null &&
    a.length === b.length &&
    a.every((byte, index) => byte === b[index])
  );
}
