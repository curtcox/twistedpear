import { transportClass, type TransportClassName } from "@twistedpear/effects/adapters/sim";

export interface SpamEconomics {
  readonly transport: TransportClassName;
  readonly messages: number;
  readonly airtimeMs: number;
  readonly attackerCost: number;
  readonly expectedPayoff: number;
  readonly profitable: boolean;
}

const AIRTIME_COST: Readonly<Record<TransportClassName, number>> = {
  lan: 0.00001,
  internet: 0.0001,
  ble: 0.001,
  lora: 0.02
};

export function spamEconomics(options: {
  readonly transport: TransportClassName;
  readonly payloadBytes: number;
  readonly messages: number;
  readonly payoffPerDelivery: number;
}): SpamEconomics {
  const model = transportClass(options.transport);
  const messages = Math.max(0, Math.floor(options.messages));
  const airtimeMs = (Math.max(0, options.payloadBytes) * 8 * 1_000 / model.bandwidthBps) * messages;
  const dutyPenalty = model.dutyCycle === undefined ? 1 : 1 / model.dutyCycle;
  const attackerCost = airtimeMs * AIRTIME_COST[options.transport] * dutyPenalty;
  const expectedPayoff = messages * Math.max(0, 1 - model.lossRate) * options.payoffPerDelivery;
  return { transport: options.transport, messages, airtimeMs, attackerCost, expectedPayoff, profitable: expectedPayoff > attackerCost };
}

export interface HarassmentResult {
  readonly reached: readonly string[];
  readonly arrestedAtHop: number | null;
}

export function propagateHarassment(options: {
  readonly graph: Readonly<Record<string, readonly string[]>>;
  readonly origin: string;
  readonly blocked: ReadonlySet<string>;
  readonly severAtHop?: number;
}): HarassmentResult {
  const seen = new Set<string>();
  let frontier = [options.origin];
  let hop = 0;
  while (frontier.length > 0) {
    if (options.severAtHop !== undefined && hop >= options.severAtHop) {
      return { reached: [...seen].sort(), arrestedAtHop: hop };
    }
    const next: string[] = [];
    for (const node of frontier.sort()) {
      if (seen.has(node) || options.blocked.has(node)) continue;
      seen.add(node);
      next.push(...(options.graph[node] ?? []));
    }
    frontier = next;
    hop += 1;
  }
  return { reached: [...seen].sort(), arrestedAtHop: null };
}

export interface ReputationVote { readonly from: string; readonly to: string; readonly value: -1 | 1 }
export function reputationUnderCollusion(
  votes: readonly ReputationVote[],
  colluders: ReadonlySet<string>,
  colluderWeight = 0.1
): Readonly<Record<string, number>> {
  const scores: Record<string, number> = {};
  for (const vote of votes) {
    scores[vote.to] = (scores[vote.to] ?? 0) + vote.value * (colluders.has(vote.from) ? colluderWeight : 1);
  }
  return scores;
}
