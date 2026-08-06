/**
 * Sans-IO device stream admission and degradation.
 * Measurements in → decision out; no clocks or sockets.
 */

import {
  DEVICE_CLASS_REGISTRY,
  deviceClassById,
  type DeviceBandwidthProfile,
  type DeviceClassEntry,
} from "./device-registry.gen.js";

export type StreamPlane =
  "webrtc" | "pears-bulk" | "reticulum" | "lxmf" | "cas";

export type AdmissionDecisionKind = "accept" | "degrade" | "defer" | "reject";

export interface StreamDemand {
  readonly classId: string;
  readonly tierId: string;
  readonly encoding?: string;
  readonly codec?: "vp8" | "vp9" | "h264" | "opus" | "pcm" | "jpeg";
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
  /** Estimated demand at the selected degradation rung. */
  readonly admittedDemandBps: number;
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
  "cas",
];

export function degradationLadderFor(classId: string): ReadonlyArray<string> {
  const entry = deviceClassById(classId);
  if (entry === undefined) return ["on-demand"];
  return entry.degradationLadder;
}

export function bandwidthProfileFor(
  classId: string,
  tierId: string,
  encoding?: string,
): DeviceBandwidthProfile | undefined {
  const entry = deviceClassById(classId);
  const profile = entry?.bandwidth[tierId];
  if (profile === undefined || encoding === undefined) return profile;
  return profile.encodings?.[encoding];
}

export function demandBps(demand: StreamDemand): number {
  const profile = bandwidthProfileFor(
    demand.classId,
    demand.tierId,
    demand.encoding,
  );
  if (profile === undefined) return 0;
  const rate = demand.rateHz ?? 1;
  // Raw media profiles are already bitrates. Event/sample profiles are expressed
  // per 1 Hz and scale with the requested sample rate.
  const scaled = isMediaBitrate(demand.classId, demand.tierId)
    ? profile.targetBps
    : profile.targetBps * Math.max(0.1, rate);
  return Math.max(profile.minBps, Math.min(scaled, profile.burstBytes * 8));
}

export function selectPlane(
  candidates: ReadonlyArray<LinkSupply>,
): LinkSupply | undefined {
  const viable = candidates.filter((candidate) => supplyBps(candidate) > 0);
  const available = [...(viable.length > 0 ? viable : candidates)].sort(
    (left, right) => {
      const planeDelta =
        PLANE_ORDER.indexOf(left.plane) - PLANE_ORDER.indexOf(right.plane);
      if (planeDelta !== 0) return planeDelta;
      return supplyBps(right) - supplyBps(left);
    },
  );
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
 *
 * When every live plane has zero usable supply — or there is no candidate at
 * all — and the class ladder ends in `cas-snapshot`, admit that terminal rung
 * on the `cas` plane instead of rejecting. Snapshot media is store-and-forward;
 * it is not a live bitrate claim.
 */
export function decideStreamAdmission(
  demand: StreamDemand,
  candidates: ReadonlyArray<LinkSupply>,
): AdmissionDecision {
  const ladder = degradationLadderFor(demand.classId);
  const selected = selectPlane(candidates);
  if (selected === undefined) {
    return (
      casSnapshotAdmission(demand, ladder) ?? {
        kind: "reject",
        plane: "cas",
        rung: ladder[ladder.length - 1] ?? "on-demand",
        rungIndex: Math.max(0, ladder.length - 1),
        demandBps: demandBps(demand),
        admittedDemandBps: 0,
        supplyBps: 0,
        reason: "DEVICE_BANDWIDTH_INSUFFICIENT: no candidate plane",
      }
    );
  }

  const requiredBps = demandBps(demand);
  const supply = supplyBps(selected);
  const requestedRungIndex =
    demand.encoding === undefined
      ? 0
      : Math.max(0, ladder.indexOf(demand.encoding));
  if (requiredBps <= 0) {
    return {
      kind: "reject",
      plane: selected.plane,
      rung: ladder[ladder.length - 1] ?? "on-demand",
      rungIndex: Math.max(0, ladder.length - 1),
      demandBps: requiredBps,
      admittedDemandBps: 0,
      supplyBps: supply,
      reason: "DEVICE_BANDWIDTH_INSUFFICIENT: unknown or empty demand profile",
    };
  }
  if (supply <= 0) {
    return (
      casSnapshotAdmission(demand, ladder) ?? {
        kind: "reject",
        plane: selected.plane,
        rung: ladder[ladder.length - 1] ?? "on-demand",
        rungIndex: Math.max(0, ladder.length - 1),
        demandBps: requiredBps,
        admittedDemandBps: 0,
        supplyBps: supply,
        reason: "DEVICE_BANDWIDTH_INSUFFICIENT: zero supply",
      }
    );
  }

  let rungIndex = highestSustainableRung(
    ladder,
    requiredBps,
    supply,
    requestedRungIndex,
  );
  if (selected.metered === true || selected.lowBattery === true) {
    rungIndex = Math.min(ladder.length - 1, rungIndex + 1);
  }

  const rung = ladder[rungIndex] ?? ladder[ladder.length - 1] ?? "on-demand";
  const admittedDemand = demandAtRung(
    requiredBps,
    profileMinimumBps(demand),
    rungIndex - requestedRungIndex,
    ladder.length - requestedRungIndex,
  );
  if (admittedDemand > supply) {
    // Live planes cannot carry even the bottom live rung; fall through to CAS
    // when the ladder declares a snapshot terminal.
    return (
      casSnapshotAdmission(demand, ladder) ?? {
        kind: "reject",
        plane: selected.plane,
        rung,
        rungIndex,
        demandBps: requiredBps,
        admittedDemandBps: admittedDemand,
        supplyBps: supply,
        reason: "DEVICE_BANDWIDTH_INSUFFICIENT: no sustainable rung",
      }
    );
  }
  if (rungIndex === requestedRungIndex && requiredBps <= supply) {
    return {
      kind: "accept",
      plane: selected.plane,
      rung,
      rungIndex,
      demandBps: requiredBps,
      admittedDemandBps: admittedDemand,
      supplyBps: supply,
      reason: "accepted at requested quality",
    };
  }
  // Prefer honest degradation (including bottom-of-ladder derived events) over defer
  // whenever the registry declares a ladder for the class.
  if (ladder.length > 0 && rungIndex > requestedRungIndex) {
    return {
      kind: "degrade",
      plane: selected.plane,
      rung,
      rungIndex,
      demandBps: requiredBps,
      admittedDemandBps: admittedDemand,
      supplyBps: supply,
      reason: `degraded to ${rung}`,
    };
  }
  if ((selected.queueDepthBytes ?? 0) < DEFAULT_HOST_LIMIT_BPS) {
    return {
      kind: "defer",
      plane: selected.plane,
      rung,
      rungIndex,
      demandBps: requiredBps,
      admittedDemandBps: admittedDemand,
      supplyBps: supply,
      reason: "defer until better path or headroom",
    };
  }
  return {
    kind: "reject",
    plane: selected.plane,
    rung,
    rungIndex,
    demandBps: requiredBps,
    admittedDemandBps: admittedDemand,
    supplyBps: supply,
    reason: "DEVICE_BANDWIDTH_INSUFFICIENT",
  };
}

/** Downshift immediately on sustained deficit; upshift only after hysteresis. */
export function adaptStreamAdmission(
  input: AdaptationInput,
): AdmissionDecision {
  const supply = supplyBps(input.supply);
  const deficitStreak = input.deficitStreak ?? 0;
  const surplusStreak = input.surplusStreak ?? 0;
  let rungIndex = input.previous.rungIndex;

  if (
    supply < input.previous.admittedDemandBps &&
    deficitStreak >= DOWNSHIFT_AFTER
  ) {
    rungIndex = Math.min(input.ladder.length - 1, rungIndex + 1);
  } else if (
    supply >=
      Math.min(
        input.previous.demandBps,
        input.previous.admittedDemandBps * 2,
      ) &&
    surplusStreak >= UPSHIFT_AFTER &&
    input.supply.metered !== true &&
    input.supply.lowBattery !== true
  ) {
    rungIndex = Math.max(0, rungIndex - 1);
  }

  const rung = input.ladder[rungIndex] ?? input.previous.rung;
  const kind: AdmissionDecisionKind = rungIndex === 0 ? "accept" : "degrade";
  const rungDelta = rungIndex - input.previous.rungIndex;
  const admittedDemandBps =
    rungDelta === 0
      ? input.previous.admittedDemandBps
      : rungDelta > 0
        ? input.previous.admittedDemandBps / 2 ** rungDelta
        : Math.min(
            input.previous.demandBps,
            input.previous.admittedDemandBps * 2 ** -rungDelta,
          );
  return {
    kind,
    plane: input.supply.plane,
    rung,
    rungIndex,
    demandBps: input.previous.demandBps,
    admittedDemandBps,
    supplyBps: supply,
    reason:
      rungIndex === input.previous.rungIndex ? "hold" : `adapt to ${rung}`,
  };
}

/** Property helper: accepted/degraded streams must fit in headroom. */
export function admittedWithinHeadroom(
  decision: AdmissionDecision,
  headroomBps: number,
): boolean {
  if (decision.kind === "reject" || decision.kind === "defer") return true;
  // CAS snapshots are store-and-forward; they do not claim live headroom.
  if (decision.plane === "cas" && decision.rung === "cas-snapshot") return true;
  return (
    decision.admittedDemandBps <= headroomBps && decision.admittedDemandBps > 0
  );
}

export function allDeviceClassIds(): ReadonlyArray<string> {
  return DEVICE_CLASS_REGISTRY.map((entry: DeviceClassEntry) => entry.id);
}

/**
 * Terminal no-live-path admission. Only classes whose ladder names
 * `cas-snapshot` may take this exit; everyone else still fails closed.
 */
function casSnapshotAdmission(
  demand: StreamDemand,
  ladder: ReadonlyArray<string>,
): AdmissionDecision | null {
  const rungIndex = ladder.indexOf("cas-snapshot");
  if (rungIndex < 0) return null;
  const requiredBps = demandBps(demand);
  const requestedRungIndex =
    demand.encoding === undefined
      ? 0
      : Math.max(0, ladder.indexOf(demand.encoding));
  const kind: AdmissionDecisionKind =
    requestedRungIndex === rungIndex && demand.encoding === "cas-snapshot"
      ? "accept"
      : "degrade";
  return {
    kind,
    plane: "cas",
    rung: "cas-snapshot",
    rungIndex,
    demandBps: requiredBps,
    admittedDemandBps: Math.max(1, profileMinimumBps(demand)),
    supplyBps: 0,
    reason: "no live path; admitted cas-snapshot",
  };
}

function highestSustainableRung(
  ladder: ReadonlyArray<string>,
  demand: number,
  supply: number,
  startIndex = 0,
): number {
  // Index 0 is highest quality. Each step roughly halves demand.
  for (let index = startIndex; index < ladder.length; index += 1) {
    const scaledDemand = demand / 2 ** (index - startIndex);
    if (scaledDemand <= supply) return index;
  }
  return ladder.length - 1;
}

function profileMinimumBps(demand: StreamDemand): number {
  return (
    bandwidthProfileFor(demand.classId, demand.tierId, demand.encoding)
      ?.minBps ?? 0
  );
}

function demandAtRung(
  demand: number,
  minimum: number,
  index: number,
  ladderLength: number,
): number {
  if (ladderLength > 0 && index >= ladderLength - 1)
    return Math.min(demand, minimum);
  return Math.max(minimum, demand / 2 ** index);
}

function isMediaBitrate(classId: string, tierId: string): boolean {
  return (
    (classId === "camera" && tierId === "frames") ||
    (classId === "screen-capture" && tierId === "frames") ||
    ((classId === "microphone" || classId === "speaker") && tierId === "pcm")
  );
}
