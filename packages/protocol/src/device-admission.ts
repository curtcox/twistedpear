/**
 * Sans-IO device stream admission and degradation.
 * Measurements in → decision out; no clocks or sockets.
 */

import {
  DEVICE_CLASS_REGISTRY,
  deviceClassById,
  type DeviceBandwidthProfile,
  type DeviceClassEntry
} from "./device-registry.gen.js";

export type StreamPlane = "webrtc" | "pears-bulk" | "reticulum" | "lxmf" | "cas";

export type AdmissionDecisionKind = "accept" | "degrade" | "defer" | "reject";

export interface StreamDemand {
  readonly classId: string;
  readonly tierId: string;
  readonly encoding?: string;
  readonly rateHz?: number;
}

export interface LinkSupply {
  readonly plane: StreamPlane;
  readonly effectiveBps: number;
  /** Uncommitted host limiter headroom (default budget 524288 B/s). */
  readonly headroomBps: number;
  readonly measuredGoodputBps?: number;
  readonly queueDepthBytes?: number;
  readonly metered?: boolean;
  readonly lowBattery?: boolean;
}

export interface AdmissionDecision {
  readonly kind: AdmissionDecisionKind;
  readonly plane: StreamPlane;
  readonly rung: string;
  readonly rungIndex: number;
  readonly demandBps: number;
  readonly supplyBps: number;
  readonly reason: string;
}

export interface AdaptationInput {
  readonly previous: AdmissionDecision;
  readonly supply: LinkSupply;
  readonly ladder: ReadonlyArray<string>;
  /** Sustained deficit samples before downshift. */
  readonly deficitStreak?: number;
  /** Good windows before upshift (hysteresis). */
  readonly surplusStreak?: number;
}

const DEFAULT_HOST_LIMIT_BPS = 524_288;
const DOWNSHIFT_AFTER = 2;
const UPSHIFT_AFTER = 4;

const PLANE_ORDER: ReadonlyArray<StreamPlane> = [
  "webrtc",
  "pears-bulk",
  "reticulum",
  "lxmf",
  "cas"
];

export function degradationLadderFor(classId: string): ReadonlyArray<string> {
  const entry = deviceClassById(classId);
  if (entry === undefined) return ["on-demand"];
  return entry.degradationLadder;
}

export function bandwidthProfileFor(
  classId: string,
  tierId: string
): DeviceBandwidthProfile | undefined {
  const entry = deviceClassById(classId);
  return entry?.bandwidth[tierId];
}

export function demandBps(demand: StreamDemand): number {
  const profile = bandwidthProfileFor(demand.classId, demand.tierId);
  if (profile === undefined) return 0;
  const rate = demand.rateHz ?? 1;
  // Scale target by requested rate relative to 1 Hz baseline, clamped to [min, burst*8].
  const scaled = profile.targetBps * Math.max(0.1, rate);
  return Math.max(profile.minBps, Math.min(scaled, profile.burstBytes * 8));
}

export function selectPlane(candidates: ReadonlyArray<LinkSupply>): LinkSupply | undefined {
  const available = [...candidates].sort((left, right) => {
    const planeDelta = PLANE_ORDER.indexOf(left.plane) - PLANE_ORDER.indexOf(right.plane);
    if (planeDelta !== 0) return planeDelta;
    return supplyBps(right) - supplyBps(left);
  });
  return available[0];
}

export function supplyBps(supply: LinkSupply): number {
  const measured = supply.measuredGoodputBps ?? supply.effectiveBps;
  return Math.max(0, Math.min(measured, supply.headroomBps));
}

/**
 * Pure admission decision. On metered/low-battery links, start one rung lower
 * than the highest sustainable rung and require re-confirmation to climb
 * (caller enforces confirmation; this only picks the starting rung).
 */
export function decideStreamAdmission(
  demand: StreamDemand,
  candidates: ReadonlyArray<LinkSupply>
): AdmissionDecision {
  const ladder = degradationLadderFor(demand.classId);
  const selected = selectPlane(candidates);
  if (selected === undefined) {
    return {
      kind: "reject",
      plane: "cas",
      rung: ladder[ladder.length - 1] ?? "on-demand",
      rungIndex: Math.max(0, ladder.length - 1),
      demandBps: demandBps(demand),
      supplyBps: 0,
      reason: "DEVICE_BANDWIDTH_INSUFFICIENT: no candidate plane"
    };
  }

  const requiredBps = demandBps(demand);
  const supply = supplyBps(selected);
  if (supply <= 0) {
    return {
      kind: "reject",
      plane: selected.plane,
      rung: ladder[ladder.length - 1] ?? "on-demand",
      rungIndex: Math.max(0, ladder.length - 1),
      demandBps: requiredBps,
      supplyBps: supply,
      reason: "DEVICE_BANDWIDTH_INSUFFICIENT: zero supply"
    };
  }

  let rungIndex = highestSustainableRung(ladder, requiredBps, supply);
  if (selected.metered === true || selected.lowBattery === true) {
    rungIndex = Math.min(ladder.length - 1, rungIndex + 1);
  }

  const rung = ladder[rungIndex] ?? ladder[ladder.length - 1] ?? "on-demand";
  if (rungIndex === 0 && requiredBps <= supply) {
    return {
      kind: "accept",
      plane: selected.plane,
      rung,
      rungIndex,
      demandBps: requiredBps,
      supplyBps: supply,
      reason: "accepted at requested quality"
    };
  }
  // Prefer honest degradation (including bottom-of-ladder derived events) over defer
  // whenever the registry declares a ladder for the class.
  if (ladder.length > 0 && rungIndex > 0) {
    return {
      kind: "degrade",
      plane: selected.plane,
      rung,
      rungIndex,
      demandBps: requiredBps,
      supplyBps: supply,
      reason: `degraded to ${rung}`
    };
  }
  if ((selected.queueDepthBytes ?? 0) < DEFAULT_HOST_LIMIT_BPS) {
    return {
      kind: "defer",
      plane: selected.plane,
      rung,
      rungIndex,
      demandBps: requiredBps,
      supplyBps: supply,
      reason: "defer until better path or headroom"
    };
  }
  return {
    kind: "reject",
    plane: selected.plane,
    rung,
    rungIndex,
    demandBps: requiredBps,
    supplyBps: supply,
    reason: "DEVICE_BANDWIDTH_INSUFFICIENT"
  };
}

/** Downshift immediately on sustained deficit; upshift only after hysteresis. */
export function adaptStreamAdmission(input: AdaptationInput): AdmissionDecision {
  const supply = supplyBps(input.supply);
  const deficitStreak = input.deficitStreak ?? 0;
  const surplusStreak = input.surplusStreak ?? 0;
  let rungIndex = input.previous.rungIndex;

  if (supply < input.previous.demandBps && deficitStreak >= DOWNSHIFT_AFTER) {
    rungIndex = Math.min(input.ladder.length - 1, rungIndex + 1);
  } else if (
    supply >= input.previous.demandBps &&
    surplusStreak >= UPSHIFT_AFTER &&
    input.supply.metered !== true &&
    input.supply.lowBattery !== true
  ) {
    rungIndex = Math.max(0, rungIndex - 1);
  }

  const rung = input.ladder[rungIndex] ?? input.previous.rung;
  const kind: AdmissionDecisionKind =
    rungIndex === 0 ? "accept" : rungIndex >= input.ladder.length - 1 ? "degrade" : "degrade";
  return {
    kind,
    plane: input.supply.plane,
    rung,
    rungIndex,
    demandBps: input.previous.demandBps,
    supplyBps: supply,
    reason: rungIndex === input.previous.rungIndex ? "hold" : `adapt to ${rung}`
  };
}

/** Property helper: accepted/degraded streams must fit in headroom. */
export function admittedWithinHeadroom(decision: AdmissionDecision, headroomBps: number): boolean {
  if (decision.kind === "reject" || decision.kind === "defer") return true;
  return decision.supplyBps <= headroomBps && decision.supplyBps > 0;
}

export function allDeviceClassIds(): ReadonlyArray<string> {
  return DEVICE_CLASS_REGISTRY.map((entry: DeviceClassEntry) => entry.id);
}

function highestSustainableRung(
  ladder: ReadonlyArray<string>,
  demand: number,
  supply: number
): number {
  // Index 0 is highest quality. Each step roughly halves demand.
  for (let index = 0; index < ladder.length; index += 1) {
    const scaledDemand = demand / 2 ** index;
    if (scaledDemand <= supply) return index;
  }
  return ladder.length - 1;
}
