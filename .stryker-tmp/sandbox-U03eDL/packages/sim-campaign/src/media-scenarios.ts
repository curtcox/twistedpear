/**
 * Simulated realtime-media scenarios.
 *
 * A call is admitted once and then adapted sample by sample. The properties
 * that make a degradation ladder behavior rather than a table are safety
 * properties, so they are kernel oracles: one rung per step, never above
 * headroom, and never oscillating inside the hysteresis window. Whether the
 * call *recovers* is liveness — the caller inspects the recorded rung history.
 */
// @ts-nocheck


import type { Event, Intent, StepFn } from "@twistedpear/effects";
import type { HistoryRecorder, TransportClassName } from "@twistedpear/effects/adapters/sim";
import {
  adaptStreamAdmission,
  admittedWithinHeadroom,
  decideStreamAdmission,
  degradationLadderFor,
  type AdmissionDecision,
  type LinkSupply,
  type StreamDemand
} from "@twistedpear/protocol";
import type { CampaignScenario } from "./runner.js";

/** Adversarial link shapes the plan names for a mid-call ladder. */
export type MediaLinkProfile = "collapse-recover" | "asymmetric" | "bufferbloat" | "flapping";

export interface MediaLadderSample {
  readonly at: number;
  readonly goodputBps: number;
  readonly queueDepthBytes: number;
  readonly rungIndex: number;
  readonly rung: string;
  readonly kind: AdmissionDecision["kind"];
}

export type MediaLadderState =
  | { readonly role: "link"; readonly emitted: number }
  | {
      readonly role: "caller";
      readonly demand: StreamDemand;
      readonly ladder: ReadonlyArray<string>;
      readonly decision: AdmissionDecision | null;
      readonly deficitStreak: number;
      readonly surplusStreak: number;
      readonly history: ReadonlyArray<MediaLadderSample>;
      readonly overHeadroomStreak: number;
      readonly violations: ReadonlyArray<string>;
    };

const SAMPLE_COUNT = 40;
/** `adaptStreamAdmission` upshifts only after four good windows. */
const HYSTERESIS_WINDOW = 4;
/** `adaptStreamAdmission` downshifts after two sustained deficit samples. */
const DOWNSHIFT_WINDOW = 2;
const HOST_HEADROOM_BPS = 524_288;

export interface MediaLadderScenarioOptions {
  readonly transport: TransportClassName;
  readonly profile: MediaLinkProfile;
  readonly classId?: string;
  readonly tierId?: string;
  readonly encoding?: string;
  readonly plane?: LinkSupply["plane"];
  /** Test-only defect that lets the ladder jump more than one rung per step. */
  readonly brokenLadderStep?: boolean;
  readonly recorder?: HistoryRecorder<MediaLadderState>;
}

/**
 * Goodput in bits per second at a given sample index. Every profile starts
 * healthy so the call is admitted at the top rung, then degrades.
 */
export function mediaLinkGoodputBps(profile: MediaLinkProfile, index: number): number {
  const healthy = 800_000;
  switch (profile) {
    case "collapse-recover":
      // Healthy → collapse to a narrowband trickle → recover.
      if (index < 8) return healthy;
      if (index < 24) return 9_000;
      return healthy;
    case "asymmetric":
      // A permanently thin return path: the ladder must settle, not hunt.
      return index < 6 ? healthy : 20_000;
    case "bufferbloat":
      // Nominal goodput holds while the queue grows; the deficit is in latency.
      return index < 6 ? healthy : 300_000;
    case "flapping":
      // Bad and good windows long enough to downshift but too short to earn
      // the four-sample upshift.
      return index < 6 ? healthy : Math.floor(index / 2) % 2 === 0 ? healthy : 9_000;
  }
}

export function mediaLinkQueueDepthBytes(profile: MediaLinkProfile, index: number): number {
  if (profile !== "bufferbloat" || index < 6) return 0;
  return Math.min(HOST_HEADROOM_BPS, (index - 5) * 96_000);
}

export function createMediaLadderScenario(
  options: MediaLadderScenarioOptions
): CampaignScenario<MediaLadderState> {
  const demand: StreamDemand = {
    classId: options.classId ?? "microphone",
    tierId: options.tierId ?? "pcm",
    ...(options.encoding === undefined ? {} : { encoding: options.encoding })
  };
  const ladder = degradationLadderFor(demand.classId);
  const plane = options.plane ?? "webrtc";
  const caller: MediaLadderState = {
    role: "caller",
    demand,
    ladder,
    decision: null,
    deficitStreak: 0,
    surplusStreak: 0,
    history: [],
    overHeadroomStreak: 0,
    violations: []
  };

  return {
    config: {
      seed: 1,
      nodes: [
        { id: "link", machine: "media/link-profile", initial: { role: "link" as const, emitted: 0 }, step: linkStep(options.profile) },
        {
          id: "caller",
          machine: "media/ladder-caller",
          initial: caller,
          step: callerStep(plane, options.brokenLadderStep === true)
        }
      ],
      links: [
        {
          source: "link",
          destination: "caller",
          class: options.transport,
          params: { lossRate: 0, latency: { kind: "fixed" as const, ms: 1 }, burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 } }
        }
      ],
      oracles: [
        {
          name: "media-ladder",
          check: (world: { nodes: ReadonlyMap<string, MediaLadderState> }) => {
            const state = world.nodes.get("caller");
            const first = state?.role === "caller" ? state.violations[0] : undefined;
            return first === undefined ? null : { oracle: "media-ladder", message: first, nodes: ["caller"] };
          }
        }
      ],
      ...(options.recorder === undefined ? {} : { recorder: options.recorder })
    },
    description: {
      name: `media-ladder-${options.profile}`,
      protocolMachines: ["device-admission"],
      adversaryPowers: [],
      transport: options.transport
    }
  };
}

/** Rung history of a finished run, for liveness assertions by the caller. */
export function mediaLadderHistory(state: MediaLadderState): ReadonlyArray<MediaLadderSample> {
  return state.role === "caller" ? state.history : [];
}

function linkStep(profile: MediaLinkProfile): StepFn<MediaLadderState> {
  return (state, event: Event) => {
    if (state.role !== "link" || event.kind !== "start") return { state, intents: [] };
    const intents: Intent[] = [];
    for (let index = 0; index < SAMPLE_COUNT; index += 1) {
      const payload = new Uint8Array(8);
      const view = new DataView(payload.buffer);
      view.setUint32(0, mediaLinkGoodputBps(profile, index), false);
      view.setUint32(4, mediaLinkQueueDepthBytes(profile, index), false);
      intents.push({
        kind: "transport/send",
        send: { channel: `media/sample/${index}`, destination: "caller", payload }
      });
    }
    return { state: { ...state, emitted: intents.length }, intents };
  };
}

function callerStep(plane: LinkSupply["plane"], brokenLadderStep: boolean): StepFn<MediaLadderState> {
  return (state, event: Event) => {
    if (state.role !== "caller" || event.kind !== "transport/recv") return { state, intents: [] };
    if (event.payload.length < 8) return { state, intents: [] };
    const view = new DataView(event.payload.buffer, event.payload.byteOffset, event.payload.byteLength);
    const goodputBps = view.getUint32(0, false);
    const queueDepthBytes = view.getUint32(4, false);
    const supply: LinkSupply = {
      plane,
      effectiveBps: goodputBps,
      measuredGoodputBps: goodputBps,
      headroomBps: Math.max(0, HOST_HEADROOM_BPS - Math.floor(queueDepthBytes / 8)),
      queueDepthBytes
    };

    const previous = state.decision;
    let next: AdmissionDecision;
    let deficitStreak = state.deficitStreak;
    let surplusStreak = state.surplusStreak;
    if (previous === null) {
      next = decideStreamAdmission(state.demand, [supply]);
    } else {
      const shortfall = Math.max(0, supply.effectiveBps) < previous.admittedDemandBps;
      deficitStreak = shortfall ? deficitStreak + 1 : 0;
      surplusStreak = shortfall ? 0 : surplusStreak + 1;
      next = adaptStreamAdmission({
        previous,
        supply,
        ladder: state.ladder,
        deficitStreak,
        surplusStreak
      });
      if (brokenLadderStep && shortfall) {
        const jumped = Math.min(state.ladder.length - 1, previous.rungIndex + 2);
        next = { ...next, rungIndex: jumped, rung: state.ladder[jumped] ?? next.rung };
      }
      if (next.rungIndex !== previous.rungIndex) {
        deficitStreak = 0;
        surplusStreak = 0;
      }
    }

    const overHeadroomStreak = admittedWithinHeadroom(next, supply.headroomBps) ? 0 : state.overHeadroomStreak + 1;
    const violations = [
      ...state.violations,
      ...ladderViolations(previous, next, state.history, supply, overHeadroomStreak)
    ];
    return {
      state: {
        ...state,
        decision: next,
        deficitStreak,
        surplusStreak,
        history: [
          ...state.history,
          { at: event.at, goodputBps, queueDepthBytes, rungIndex: next.rungIndex, rung: next.rung, kind: next.kind }
        ],
        overHeadroomStreak,
        violations
      },
      intents: []
    };
  };
}

function ladderViolations(
  previous: AdmissionDecision | null,
  next: AdmissionDecision,
  history: ReadonlyArray<MediaLadderSample>,
  supply: LinkSupply,
  overHeadroomStreak: number
): ReadonlyArray<string> {
  const found: string[] = [];
  if (previous !== null && Math.abs(next.rungIndex - previous.rungIndex) > 1) {
    found.push(`ladder moved ${previous.rung} → ${next.rung} in one step`);
  }
  // Headroom may be briefly exceeded while the downshift hysteresis runs; what
  // must never happen is staying above it once the ladder has had its window.
  if (overHeadroomStreak > DOWNSHIFT_WINDOW + 1) {
    found.push(`admitted ${next.admittedDemandBps} bps at ${next.rung} stayed above ${supply.headroomBps} bps of headroom for ${overHeadroomStreak} samples`);
  }
  if (previous !== null && next.rungIndex < previous.rungIndex) {
    // An upshift is only legitimate after the hysteresis window has held.
    const held = history.slice(-HYSTERESIS_WINDOW);
    if (held.length === HYSTERESIS_WINDOW && held.some((sample) => sample.rungIndex !== previous.rungIndex)) {
      found.push(`upshifted to ${next.rung} inside the ${HYSTERESIS_WINDOW}-sample hysteresis window`);
    }
  }
  return found;
}
