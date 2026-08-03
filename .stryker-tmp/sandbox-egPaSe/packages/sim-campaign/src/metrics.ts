// @ts-nocheck
import type { NodeId } from "@twistedpear/effects";
import type { TransportClassName } from "@twistedpear/effects/adapters/sim";

export interface EgressAttribution {
  readonly appId?: string;
  readonly grantId?: string;
  readonly peerId?: string;
}

export interface ContainmentMetrics {
  readonly transport: TransportClassName | "unclassified";
  readonly revocationPropagationMs: number | null;
  readonly egressAttributability: number | null;
  readonly networkKillLatencyMs: number | null;
  readonly damageWindow: number;
}

interface Revocation {
  readonly at: number;
  readonly pending: Set<NodeId>;
  completedAt: number | null;
}

/** Scenario instrumentation for the three closed, testable containment measures. */
export class ContainmentTracker {
  private readonly revocations: Revocation[] = [];
  private readonly egress: EgressAttribution[] = [];
  private readonly kills: Array<{ requestedAt: number; severedAt: number | null; damage: number }> = [];

  constructor(readonly transport: TransportClassName | "unclassified" = "unclassified") {}

  revoked(at: number, affectedNodes: readonly NodeId[]): number {
    this.revocations.push({ at, pending: new Set(affectedNodes), completedAt: affectedNodes.length === 0 ? at : null });
    return this.revocations.length - 1;
  }

  nodeStoppedUsingGrant(revocation: number, node: NodeId, at: number): void {
    const item = this.revocations[revocation];
    if (item === undefined || at < item.at) throw new Error("invalid revocation observation");
    item.pending.delete(node);
    if (item.pending.size === 0) item.completedAt = at;
  }

  exfiltration(attribution: EgressAttribution): void {
    this.egress.push(attribution);
  }

  killRequested(at: number): number {
    this.kills.push({ requestedAt: at, severedAt: null, damage: 0 });
    return this.kills.length - 1;
  }

  damage(kill: number, units = 1): void {
    const item = this.kills[kill];
    if (item === undefined || item.severedAt !== null) throw new Error("damage outside active kill window");
    item.damage += Math.max(0, units);
  }

  severed(kill: number, at: number): void {
    const item = this.kills[kill];
    if (item === undefined || at < item.requestedAt) throw new Error("invalid sever observation");
    item.severedAt = at;
  }

  snapshot(): ContainmentMetrics {
    const propagation = this.revocations
      .filter((item) => item.completedAt !== null)
      .map((item) => item.completedAt! - item.at);
    const attributable = this.egress.map((item) =>
      (item.appId === undefined ? 0 : 1) +
      (item.grantId === undefined ? 0 : 1) +
      (item.peerId === undefined ? 0 : 1)
    );
    const killLatency = this.kills
      .filter((item) => item.severedAt !== null)
      .map((item) => item.severedAt! - item.requestedAt);
    return {
      transport: this.transport,
      revocationPropagationMs: propagation.length === 0 ? null : Math.max(...propagation),
      egressAttributability: attributable.length === 0 ? null : attributable.reduce((sum, score) => sum + score, 0) / (attributable.length * 3),
      networkKillLatencyMs: killLatency.length === 0 ? null : Math.max(...killLatency),
      damageWindow: this.kills.reduce((sum, item) => sum + item.damage, 0)
    };
  }
}

export interface ContainmentSummary extends ContainmentMetrics {
  readonly scenarios: number;
}

export interface ContainmentBaselineEntry {
  readonly transport: TransportClassName | "unclassified";
  readonly revocationPropagationMsMax: number;
  readonly egressAttributabilityMin: number;
  readonly networkKillLatencyMsMax: number;
}

export function containmentRegressions(
  actual: readonly ContainmentSummary[],
  baseline: readonly ContainmentBaselineEntry[]
): readonly string[] {
  const regressions: string[] = [];
  for (const expected of baseline) {
    const observed = actual.find((item) => item.transport === expected.transport);
    if (observed === undefined) { regressions.push(`${expected.transport}: missing containment metrics`); continue; }
    if (observed.revocationPropagationMs === null || observed.revocationPropagationMs > expected.revocationPropagationMsMax)
      regressions.push(`${expected.transport}: revocation propagation ${observed.revocationPropagationMs} exceeds ${expected.revocationPropagationMsMax}`);
    if (observed.egressAttributability === null || observed.egressAttributability < expected.egressAttributabilityMin)
      regressions.push(`${expected.transport}: attributability ${observed.egressAttributability} is below ${expected.egressAttributabilityMin}`);
    if (observed.networkKillLatencyMs === null || observed.networkKillLatencyMs > expected.networkKillLatencyMsMax)
      regressions.push(`${expected.transport}: kill latency ${observed.networkKillLatencyMs} exceeds ${expected.networkKillLatencyMsMax}`);
  }
  return regressions;
}

export function summarizeContainment(metrics: readonly ContainmentMetrics[]): readonly ContainmentSummary[] {
  const transports = new Set(metrics.map((item) => item.transport));
  if (transports.size === 0) transports.add("unclassified");
  return [...transports].sort().map((transport) => {
    const group = metrics.filter((item) => item.transport === transport);
    const values = <K extends "revocationPropagationMs" | "egressAttributability" | "networkKillLatencyMs">(key: K) =>
      group.map((item) => item[key]).filter((value): value is number => value !== null);
    const revocation = values("revocationPropagationMs");
    const attribution = values("egressAttributability");
    const kill = values("networkKillLatencyMs");
    return {
      transport,
      scenarios: group.length,
      revocationPropagationMs: revocation.length === 0 ? null : Math.max(...revocation),
      egressAttributability: attribution.length === 0 ? null : attribution.reduce((sum, value) => sum + value, 0) / attribution.length,
      networkKillLatencyMs: kill.length === 0 ? null : Math.max(...kill),
      damageWindow: group.reduce((sum, item) => sum + item.damageWindow, 0)
    };
  });
}
