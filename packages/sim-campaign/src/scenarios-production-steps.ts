import type { StepFn } from "@twistedpear/effects";
import {
  grantCoverageOracle,
  idUniquenessOracle,
  revocationMonotonicityOracle,
  type HistoryRecorder,
} from "@twistedpear/effects/adapters/sim";
import {
  initialGrantHostState,
  initialLinkHandshakeState,
  stepGrantHost,
  type GrantEvent,
  type GrantHostState,
} from "@twistedpear/protocol";
import { compileAttackProposal } from "@twistedpear/sim-adversaries";
import {
  ProductionCapabilityAdapter,
  type ProductionCapabilityObservation,
} from "@twistedpear/miniapp-runtime";
import { cellId, type CoverageCell } from "./frame.js";
import type { CampaignScenario } from "./runner.js";
import {
  ATTACK_AT,
  GRANT_AT,
  REVOCATION_AT,
  abuseEffect,
  adversaryStep,
  attackActions,
  authorityStep,
  capabilityEffect,
  handshakeAgreementViolation,
  handshakeStep,
  measureContainment,
  positionAccessFor,
  powersForPosition,
  probeStep,
  productionHandlerFor,
  productionPathFor,
  projectGrantAuthorizations,
  projectGrantCoverage,
  projectGrantIdentities,
  serviceStep,
  stableHash,
  stepGrant,
  TRANSPORT_LATENCY,
  transportFor,
  type CampaignNodeState,
} from "./scenarios-production-helpers.js";

export type { CampaignNodeState } from "./scenarios-production-helpers.js";

export function productionScenario(
  cell: CoverageCell,
  seed: number,
  options: {
    readonly defectivePolicy: boolean;
    readonly recorder?: HistoryRecorder<CampaignNodeState>;
    readonly latencyMultiplier: number;
    readonly oracleBreak:
      "grant-coverage" | "id-uniqueness" | "revocation-monotonicity" | null;
  },
): CampaignScenario<CampaignNodeState> {
  const id = cellId(cell);
  const transport = transportFor(id, seed);
  const latency = TRANSPORT_LATENCY[transport] * options.latencyMultiplier;
  const canaryOracle = `campaign-canary:${stableHash(id)}`;
  const powers = powersForPosition(cell.position);
  const compiled = compileAttackProposal(
    {
      name: `${cell.position}-${cell.abuse.verb}`,
      actions: attackActions(cell, latency).filter((action) =>
        powers.includes(action.power),
      ),
    },
    powers,
  );
  const adapter = new ProductionCapabilityAdapter(
    "campaign-app",
    `publisher-${cell.capability}`,
    options.defectivePolicy,
  );
  let grantedObservation: ProductionCapabilityObservation | null = null;
  let revokedObservation: ProductionCapabilityObservation | null = null;

  const authorityInitial = stepGrant(
    initialGrantHostState("campaign-app", `publisher-${cell.capability}`),
    {
      kind: "grant/set",
      at: GRANT_AT,
      declared: [cell.capability],
      requested: [cell.capability],
    },
  ).state;

  const nodes = [
    {
      id: "authority",
      machine: "protocol/grant-host",
      initial: {
        role: "authority" as const,
        grant: authorityInitial,
        revocationRequestedAt: null,
        killRequestedAt: null,
      },
      step: authorityStep(cell.capability),
    },
    {
      id: "handshake-initiator",
      machine: "protocol/link-handshake",
      initial: {
        role: "handshake" as const,
        handshake: initialLinkHandshakeState({
          role: "initiator",
          peerId: "handshake-responder",
        }),
      },
      step: handshakeStep(0x11),
    },
    {
      id: "handshake-responder",
      machine: "protocol/link-handshake",
      initial: {
        role: "handshake" as const,
        handshake: initialLinkHandshakeState({
          role: "responder",
          peerId: "handshake-initiator",
        }),
      },
      step: handshakeStep(0x22),
    },
    {
      id: "probe",
      machine: "campaign/availability-probe",
      initial: { role: "probe" as const, sent: false },
      step: probeStep,
    },
    {
      id: "service",
      machine: productionPathFor(cell.capability),
      initial: {
        role: "service" as const,
        revokedAt: null,
        severedAt: null,
        egress: [],
        damageEvents: [],
        operationSemantics: [],
        oracleBreak: options.oracleBreak,
        productionPath: productionPathFor(cell.capability),
        productionObservation: null,
      },
      step: serviceStep(cell, options.defectivePolicy, () => ({
        grantedObservation,
        revokedObservation,
      })),
    },
    {
      id: "z-adversary",
      machine: "sim-adversaries/compiled-proposal",
      initial: { role: "adversary" as const, adversary: compiled.initial },
      step: adversaryStep(compiled.step, latency),
    },
  ];

  const clean = {
    lossRate: 0,
    latency: { kind: "fixed" as const, ms: latency },
    burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 },
  };
  const links = [
    {
      source: "authority",
      destination: "service",
      class: transport,
      params: clean,
    },
    {
      source: "probe",
      destination: "service",
      class: transport,
      params: clean,
      adversary: "z-adversary",
      powers,
    },
    {
      source: "z-adversary",
      destination: "service",
      class: transport,
      params: clean,
      adversary: "z-adversary",
      powers,
    },
    {
      source: "handshake-initiator",
      destination: "handshake-responder",
      class: transport,
      params: clean,
    },
    {
      source: "handshake-responder",
      destination: "handshake-initiator",
      class: transport,
      params: clean,
    },
  ];

  return {
    prepare: async () => {
      await adapter.grant(cell.capability, GRANT_AT);
      grantedObservation = await adapter.execute(cell.capability, ATTACK_AT);
      await adapter.revoke(cell.capability, REVOCATION_AT);
      revokedObservation = await adapter.snapshot(
        grantedObservation.handler,
        grantedObservation.response,
      );
      if (!grantedObservation.response.ok) {
        throw new Error(
          `production handler failed for ${id}: ${grantedObservation.response.error?.message}`,
        );
      }
    },
    config: {
      seed,
      nodes,
      links,
      oracles: [
        {
          name: canaryOracle,
          check: (world) =>
            [...world.nodes.values()].some(
              (state) =>
                state.role === "service" &&
                state.operationSemantics.includes(`defect:${id}`),
            )
              ? {
                  oracle: canaryOracle,
                  message: `broken production enforcement admitted ${id}`,
                }
              : null,
        },
        grantCoverageOracle(projectGrantCoverage),
        idUniquenessOracle(projectGrantIdentities),
        revocationMonotonicityOracle(projectGrantAuthorizations),
        {
          name: "link-handshake-agreement",
          check: (world) => handshakeAgreementViolation(world.nodes),
        },
      ],
      ...(options.recorder === undefined ? {} : { recorder: options.recorder }),
    },
    expectedCanaryOracles: [canaryOracle],
    description: {
      name: `${cell.capability}-${cell.position}-${cell.abuse.verb}`,
      protocolMachines: [
        "grant-host",
        "link-handshake",
        productionPathFor(cell.capability),
      ],
      adversaryPowers: [...new Set(compiled.powers)],
      transport,
      productionPath: productionPathFor(cell.capability),
      productionBackedPath: productionHandlerFor(cell.capability),
      authority: `persisted grant lifecycle:${cell.capability}`,
      operation: `${capabilityEffect(cell.capability)} via ${productionPathFor(cell.capability)}`,
      positionAccess: positionAccessFor(cell.position),
      damageCondition: abuseEffect(cell.abuse.verb),
      successOracle: canaryOracle,
    },
    measureContainment: (kernel) => measureContainment(kernel, transport),
  };
}
