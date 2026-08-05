import type { DeviceStreamFrame } from "./device-stream-framing.js";

export interface ClockOffsetEstimate {
  readonly offsetUs: number;
  readonly rttUs: number;
  readonly samples: number;
}

export interface ClockOffsetSample {
  readonly sentAtUs: number;
  readonly receivedAtUs: number;
  readonly remoteAtUs: number;
}

export function updateClockOffset(
  previous: ClockOffsetEstimate | null,
  sample: ClockOffsetSample,
): ClockOffsetEstimate {
  const rttUs = Math.max(0, sample.receivedAtUs - sample.sentAtUs);
  const offsetUs = sample.remoteAtUs - (sample.sentAtUs + rttUs / 2);
  const alpha = previous === null ? 1 : 0.25;
  return {
    offsetUs:
      previous === null
        ? offsetUs
        : previous.offsetUs + alpha * (offsetUs - previous.offsetUs),
    rttUs:
      previous === null
        ? rttUs
        : previous.rttUs + alpha * (rttUs - previous.rttUs),
    samples: (previous?.samples ?? 0) + 1,
  };
}

export interface TimedMediaFrame {
  readonly frame: Extract<DeviceStreamFrame, { readonly version: 2 }>;
  readonly receivedAtUs: number;
}

export interface JitterBufferState {
  readonly targetDelayUs: number;
  readonly frames: ReadonlyArray<TimedMediaFrame>;
  readonly droppedLate: number;
}

export function initialJitterBuffer(
  targetDelayUs = 120_000,
): JitterBufferState {
  return {
    targetDelayUs: Math.max(0, targetDelayUs),
    frames: [],
    droppedLate: 0,
  };
}

export function pushJitterFrame(
  state: JitterBufferState,
  timed: TimedMediaFrame,
  nowUs: number,
  clockOffsetUs = 0,
): JitterBufferState {
  const presentationAt =
    timed.frame.captureAtUs - clockOffsetUs + state.targetDelayUs;
  if (presentationAt < nowUs - state.targetDelayUs) {
    return { ...state, droppedLate: state.droppedLate + 1 };
  }
  const frames = [...state.frames, timed].sort(
    (left, right) =>
      left.frame.captureAtUs - right.frame.captureAtUs ||
      left.frame.sequence - right.frame.sequence,
  );
  return { ...state, frames };
}

export function drainJitterBuffer(
  state: JitterBufferState,
  nowUs: number,
  clockOffsetUs = 0,
): {
  readonly state: JitterBufferState;
  readonly ready: ReadonlyArray<TimedMediaFrame>;
} {
  const ready: TimedMediaFrame[] = [];
  const pending: TimedMediaFrame[] = [];
  for (const timed of state.frames) {
    const presentationAt =
      timed.frame.captureAtUs - clockOffsetUs + state.targetDelayUs;
    (presentationAt <= nowUs ? ready : pending).push(timed);
  }
  return { state: { ...state, frames: pending }, ready };
}
