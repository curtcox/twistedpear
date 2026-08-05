import type { DolevYaoPower, InstantMs, NodeId } from "../../types.js";

export type TransportClassName = "lan" | "internet" | "ble" | "lora" | "freenet";

export type LatencyDistribution =
  | { readonly kind: "fixed"; readonly ms: number }
  | { readonly kind: "uniform"; readonly minMs: number; readonly maxMs: number };

export interface BurstLossModel {
  /** Probability of entering the bad state after a send in the good state. */
  readonly goodToBad: number;
  /** Probability of returning to the good state after a send in the bad state. */
  readonly badToGood: number;
  readonly goodLossRate: number;
  readonly badLossRate: number;
}

export interface PartitionWindow {
  readonly fromMs: InstantMs;
  readonly toMs: InstantMs;
}

export interface TransportClass {
  readonly name: TransportClassName;
  readonly bandwidthBps: number;
  readonly latency: LatencyDistribution;
  readonly lossRate: number;
  readonly burstLoss?: BurstLossModel;
  readonly partitions?: readonly PartitionWindow[];
  /** Fraction of elapsed airtime a link may occupy (notably LoRa). */
  readonly dutyCycle?: number;
  readonly dutyCyclePolicy?: "delay" | "drop";
}

export interface LinkConfig {
  readonly source: NodeId;
  readonly destination: NodeId;
  readonly class: TransportClassName;
  readonly params?: Partial<Omit<TransportClass, "name">>;
  readonly adversary?: NodeId;
  readonly powers?: readonly DolevYaoPower[];
}

const PRESETS: Readonly<Record<TransportClassName, TransportClass>> = {
  lan: {
    name: "lan",
    bandwidthBps: 100_000_000,
    latency: { kind: "uniform", minMs: 0.2, maxMs: 2 },
    lossRate: 0.0001
  },
  internet: {
    name: "internet",
    bandwidthBps: 10_000_000,
    latency: { kind: "uniform", minMs: 20, maxMs: 120 },
    lossRate: 0.005,
    burstLoss: { goodToBad: 0.002, badToGood: 0.35, goodLossRate: 0.001, badLossRate: 0.5 }
  },
  ble: {
    name: "ble",
    bandwidthBps: 125_000,
    latency: { kind: "uniform", minMs: 7.5, maxMs: 40 },
    lossRate: 0.01,
    burstLoss: { goodToBad: 0.01, badToGood: 0.25, goodLossRate: 0.005, badLossRate: 0.35 }
  },
  lora: {
    name: "lora",
    bandwidthBps: 5_000,
    latency: { kind: "uniform", minMs: 250, maxMs: 1_500 },
    lossRate: 0.03,
    burstLoss: { goodToBad: 0.02, badToGood: 0.15, goodLossRate: 0.01, badLossRate: 0.55 },
    dutyCycle: 0.01,
    dutyCyclePolicy: "delay"
  },
  // S2 local 1 KiB p50/p95 update→notify and F2 policy bitrate (~90 kbps).
  freenet: {
    name: "freenet",
    bandwidthBps: 90_000,
    latency: { kind: "uniform", minMs: 63, maxMs: 89 },
    lossRate: 0.002,
    burstLoss: { goodToBad: 0.004, badToGood: 0.4, goodLossRate: 0.001, badLossRate: 0.25 }
  }
};

export function transportClass(
  name: TransportClassName,
  overrides: Partial<Omit<TransportClass, "name">> = {}
): TransportClass {
  return { ...PRESETS[name], ...overrides, name };
}

export function sampleLatency(distribution: LatencyDistribution, rng: () => number): number {
  if (distribution.kind === "fixed") {
    return Math.max(0, distribution.ms);
  }
  const min = Math.max(0, Math.min(distribution.minMs, distribution.maxMs));
  const max = Math.max(min, Math.max(distribution.minMs, distribution.maxMs));
  return min + (max - min) * rng();
}
