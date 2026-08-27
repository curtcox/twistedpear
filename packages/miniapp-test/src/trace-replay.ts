import {
  HOST_API_VERSION,
  type AppTrace,
  type AppTraceEntry,
  type WidgetPatch,
} from "@twistedpear/miniapp-runtime";
import {
  fireTraceEvent,
  startTraceSession,
  type SessionRecording,
  type TraceSessionOptions,
  type TraceStep,
} from "./trace-session.js";

export class TraceReplayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TraceReplayError";
  }
}

export interface ReplayDivergence {
  /** Index into the recorded tape. */
  readonly at: number;
  readonly expected: string | null;
  readonly actual: string | null;
}

export interface ReplayReport {
  /** True when the tape reproduced. `clockDrift` is reported, not asserted. */
  readonly ok: boolean;
  readonly appId: string;
  readonly recorded: AppTrace;
  readonly observed: AppTrace;
  readonly steps: ReadonlyArray<TraceStep>;
  readonly patches: ReadonlyArray<WidgetPatch>;
  readonly divergences: ReadonlyArray<ReplayDivergence>;
  /** Entries that matched in shape but carried a different `at`. */
  readonly clockDrift: number;
}

export interface ReplayOptions extends TraceSessionOptions {
  readonly trace: AppTrace;
  /** Replay a trace stamped with a different host API. Off by default. */
  readonly allowHostApiSkew?: boolean;
  /** Also treat `at` differences as divergence. */
  readonly strictClock?: boolean;
  /** Stop reporting after this many divergences. */
  readonly maxDivergences?: number;
}

/**
 * Shape of a tape entry with the timestamp removed.
 *
 * `at` is the host clock, and two runs only agree on it when both ran on the
 * same virtual clock and made the same number of `now()` calls. That is a
 * useful signal but a poor equality test, so shape drives the verdict and
 * `at` is counted separately.
 */
function describeTraceEntry(entry: AppTraceEntry): string {
  switch (entry.t) {
    case "clock":
      return "clock";
    case "entropy":
      return `entropy ${entry.byteCount}`;
    case "grant":
      return `grant ${entry.change} ${entry.capability}`;
    case "broker":
      return `broker ${entry.namespace}.${entry.method} ${entry.capability ?? "-"} ${entry.outcome}`;
    case "inbound":
      return `inbound ${entry.kind} ${entry.name}`;
    case "assert":
      return entry.kind === "widget"
        ? `assert widget ${entry.nodes ?? 0}`
        : "assert call";
  }
}

/** The inputs a replay re-enters. Everything else on the tape is an effect. */
export function traceInputs(trace: AppTrace): ReadonlyArray<string> {
  return trace.entries
    .filter((entry) => entry.t === "inbound" && entry.kind === "ui")
    .map((entry) => (entry as AppTraceEntry & { name: string }).name);
}

function assertReplayable(trace: AppTrace, options: ReplayOptions): void {
  if (trace.identity.appId !== options.manifest.name) {
    throw new TraceReplayError(
      `trace records ${trace.identity.appId}, not ${options.manifest.name}`,
    );
  }
  if (
    options.allowHostApiSkew !== true &&
    trace.hostApiVersion !== HOST_API_VERSION
  ) {
    throw new TraceReplayError(
      `trace was recorded against host API ${trace.hostApiVersion}; this host is ${HOST_API_VERSION}`,
    );
  }
}

function entryLabel(
  entry: AppTraceEntry | undefined,
  withStamp: boolean,
): string | null {
  if (entry === undefined) return null;
  const text = describeTraceEntry(entry);
  return withStamp ? `${text} @${entry.at}` : text;
}

/** Same entry, different host clock read count. Reported, not asserted. */
function driftedOnly(
  left: AppTraceEntry | undefined,
  right: AppTraceEntry | undefined,
): boolean {
  if (left === undefined || right === undefined) return false;
  if (left.at === right.at) return false;
  return describeTraceEntry(left) === describeTraceEntry(right);
}

function compareTapes(
  recorded: ReadonlyArray<AppTraceEntry>,
  observed: ReadonlyArray<AppTraceEntry>,
  options: { readonly strictClock: boolean; readonly max: number },
): { divergences: ReplayDivergence[]; clockDrift: number } {
  const divergences: ReplayDivergence[] = [];
  let clockDrift = 0;
  const length = Math.max(recorded.length, observed.length);
  for (let index = 0; index < length; index += 1) {
    const left = recorded[index];
    const right = observed[index];
    const drift = driftedOnly(left, right);
    if (drift && !options.strictClock) {
      clockDrift += 1;
      continue;
    }
    if (!drift && entryLabel(left, false) === entryLabel(right, false))
      continue;
    if (divergences.length >= options.max) continue;
    divergences.push({
      at: index,
      expected: entryLabel(left, drift),
      actual: entryLabel(right, drift),
    });
  }
  return { divergences, clockDrift };
}

/**
 * Re-run a recorded session against the real `MiniappHost` and compare tapes.
 *
 * Only `inbound` UI rows are re-entered; broker calls, clock draws, and render
 * asserts are the app's own output and are what the comparison checks. An input
 * the replayed tree can no longer accept fails loudly rather than being skipped.
 */
export async function replaySession(
  options: ReplayOptions,
): Promise<ReplayReport> {
  const trace = options.trace;
  assertReplayable(trace, options);
  const session = await startTraceSession({
    ...options,
    grants: options.grants ?? trace.grants,
  });
  try {
    for (const input of traceInputs(trace)) {
      await fireTraceEvent(session, input);
    }
    const observed = session.recorder.snapshot();
    const { divergences, clockDrift } = compareTapes(
      trace.entries,
      observed.entries,
      {
        strictClock: options.strictClock === true,
        max: options.maxDivergences ?? 8,
      },
    );
    return {
      ok: divergences.length === 0,
      appId: trace.identity.appId,
      recorded: trace,
      observed,
      steps: session.steps,
      patches: session.patches,
      divergences,
      clockDrift,
    };
  } finally {
    await session.host.stop();
  }
}

export interface RoundTripReport extends ReplayReport {
  /** True when replay reproduced the recorded patch stream byte for byte. */
  readonly patchesMatch: boolean;
  readonly recordedPatches: ReadonlyArray<WidgetPatch>;
}

/**
 * Record a session and immediately replay it. This is the round-trip the
 * cookbook corpus runs: the recorded and replayed widget-patch streams must be
 * identical, which is the assertion `tp trace replay` cannot make on its own
 * because a shape trace does not carry the patch stream.
 */
export async function roundTripSession(
  options: TraceSessionOptions & {
    readonly script?: (
      session: Awaited<ReturnType<typeof startTraceSession>>,
    ) => Promise<void>;
    readonly strictClock?: boolean;
  },
): Promise<RoundTripReport> {
  const session = await startTraceSession(options);
  let recording: SessionRecording;
  try {
    await options.script?.(session);
    recording = {
      trace: session.recorder.snapshot(),
      steps: session.steps,
      patches: session.patches,
    };
  } finally {
    await session.host.stop();
  }
  const report = await replaySession({ ...options, trace: recording.trace });
  return {
    ...report,
    recordedPatches: recording.patches,
    patchesMatch:
      JSON.stringify(recording.patches) === JSON.stringify(report.patches),
  };
}
