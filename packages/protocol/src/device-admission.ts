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
      casSnapshotAdmission(demand, ladder) ??
      rejectAtLadderEnd({
        plane: "cas",
        ladder,
        demandBps: demandBps(demand),
        supplyBps: 0,
        reason: "DEVICE_BANDWIDTH_INSUFFICIENT: no candidate plane",
      })
    );
  }

  const requiredBps = demandBps(demand);
  const supply = supplyBps(selected);
  const requestedRungIndex =
    demand.encoding === undefined
      ? 0
      : Math.max(0, ladder.indexOf(demand.encoding));
  if (requiredBps <= 0) {
    return rejectAtLadderEnd({
      plane: selected.plane,
      ladder,
      demandBps: requiredBps,
      supplyBps: supply,
      reason: "DEVICE_BANDWIDTH_INSUFFICIENT: unknown or empty demand profile",
    });
  }
  if (supply <= 0) {
    return (
      casSnapshotAdmission(demand, ladder) ??
      rejectAtLadderEnd({
        plane: selected.plane,
        ladder,
        demandBps: requiredBps,
        supplyBps: supply,
        reason: "DEVICE_BANDWIDTH_INSUFFICIENT: zero supply",
      })
    );
  }

  return decideLiveStreamAdmission({
    demand,
    selected,
    ladder,
    requiredBps,
    supply,
    requestedRungIndex,
  });
}

function decideLiveStreamAdmission(input: {
  readonly demand: StreamDemand;
  readonly selected: LinkSupply;
  readonly ladder: ReadonlyArray<string>;
  readonly requiredBps: number;
  readonly supply: number;
  readonly requestedRungIndex: number;
}): AdmissionDecision {
  let rungIndex = highestSustainableRung(
    input.ladder,
    input.requiredBps,
    input.supply,
    input.requestedRungIndex,
  );
  if (input.selected.metered === true || input.selected.lowBattery === true) {
    rungIndex = Math.min(input.ladder.length - 1, rungIndex + 1);
  }

  const rung =
    input.ladder[rungIndex] ??
    input.ladder[input.ladder.length - 1] ??
    "on-demand";
  const admittedDemand = demandAtRung(
    input.requiredBps,
    profileMinimumBps(input.demand),
    rungIndex - input.requestedRungIndex,
    input.ladder.length - input.requestedRungIndex,
  );
  if (admittedDemand > input.supply) {
    return (
      casSnapshotAdmission(input.demand, input.ladder) ?? {
        kind: "reject",
        plane: input.selected.plane,
        rung,
        rungIndex,
        demandBps: input.requiredBps,
        admittedDemandBps: admittedDemand,
        supplyBps: input.supply,
        reason: "DEVICE_BANDWIDTH_INSUFFICIENT: no sustainable rung",
      }
    );
  }
  const kind = liveAdmissionKind(input, rungIndex);
  return liveAdmission(kind, input, {
    rung,
    rungIndex,
    admittedDemandBps: admittedDemand,
    reason: liveAdmissionReason(kind, rung),
  });
}

function liveAdmissionKind(
  input: {
    readonly selected: LinkSupply;
    readonly ladder: ReadonlyArray<string>;
    readonly requiredBps: number;
    readonly supply: number;
    readonly requestedRungIndex: number;
  },
  rungIndex: number,
): AdmissionDecisionKind {
  if (
    rungIndex === input.requestedRungIndex &&
    input.requiredBps <= input.supply
  ) {
    return "accept";
  }
  if (input.ladder.length > 0 && rungIndex > input.requestedRungIndex) {
    return "degrade";
  }
  if ((input.selected.queueDepthBytes ?? 0) < DEFAULT_HOST_LIMIT_BPS) {
    return "defer";
  }
  return "reject";
}

function liveAdmissionReason(
  kind: AdmissionDecisionKind,
  rung: string,
): string {
  if (kind === "accept") return "accepted at requested quality";
  if (kind === "degrade") return `degraded to ${rung}`;
  if (kind === "defer") return "defer until better path or headroom";
  return "DEVICE_BANDWIDTH_INSUFFICIENT";
}

function liveAdmission(
  kind: AdmissionDecisionKind,
  input: {
    readonly selected: LinkSupply;
    readonly requiredBps: number;
    readonly supply: number;
  },
  chosen: {
    readonly rung: string;
    readonly rungIndex: number;
    readonly admittedDemandBps: number;
    readonly reason: string;
  },
): AdmissionDecision {
  return {
    kind,
    plane: input.selected.plane,
    rung: chosen.rung,
    rungIndex: chosen.rungIndex,
    demandBps: input.requiredBps,
    admittedDemandBps: chosen.admittedDemandBps,
    supplyBps: input.supply,
    reason: chosen.reason,
  };
}

function rejectAtLadderEnd(input: {
  readonly plane: StreamPlane;
  readonly ladder: ReadonlyArray<string>;
  readonly demandBps: number;
  readonly supplyBps: number;
  readonly reason: string;
}): AdmissionDecision {
  return {
    kind: "reject",
    plane: input.plane,
    rung: input.ladder[input.ladder.length - 1] ?? "on-demand",
    rungIndex: Math.max(0, input.ladder.length - 1),
    demandBps: input.demandBps,
    admittedDemandBps: 0,
    supplyBps: input.supplyBps,
    reason: input.reason,
  };
}

/** Downshift immediately on sustained deficit; upshift only after hysteresis. */
export function adaptStreamAdmission(
  input: AdaptationInput,
): AdmissionDecision {
  const supply = supplyBps(input.supply);
  const rungIndex = nextAdaptedRungIndex(input, supply);
  const rung = input.ladder[rungIndex] ?? input.previous.rung;
  const kind: AdmissionDecisionKind = rungIndex === 0 ? "accept" : "degrade";
  return {
    kind,
    plane: input.supply.plane,
    rung,
    rungIndex,
    demandBps: input.previous.demandBps,
    admittedDemandBps: adaptedDemandBps(input.previous, rungIndex),
    supplyBps: supply,
    reason:
      rungIndex === input.previous.rungIndex ? "hold" : `adapt to ${rung}`,
  };
}

function nextAdaptedRungIndex(input: AdaptationInput, supply: number): number {
  const deficitStreak = input.deficitStreak ?? 0;
  const surplusStreak = input.surplusStreak ?? 0;
  if (
    supply < input.previous.admittedDemandBps &&
    deficitStreak >= DOWNSHIFT_AFTER
  ) {
    return Math.min(input.ladder.length - 1, input.previous.rungIndex + 1);
  }
  if (
    supply >=
      Math.min(
        input.previous.demandBps,
        input.previous.admittedDemandBps * 2,
      ) &&
    surplusStreak >= UPSHIFT_AFTER &&
    input.supply.metered !== true &&
    input.supply.lowBattery !== true
  ) {
    return Math.max(0, input.previous.rungIndex - 1);
  }
  return input.previous.rungIndex;
}

function adaptedDemandBps(
  previous: AdmissionDecision,
  rungIndex: number,
): number {
  const rungDelta = rungIndex - previous.rungIndex;
  if (rungDelta === 0) return previous.admittedDemandBps;
  if (rungDelta > 0) return previous.admittedDemandBps / 2 ** rungDelta;
  return Math.min(
    previous.demandBps,
    previous.admittedDemandBps * 2 ** -rungDelta,
  );
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
