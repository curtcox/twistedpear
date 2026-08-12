import type { Intent, NodeId } from "../../types.js";
import { hashTrace, type TraceEntry } from "../../trace.js";
import type { RecordedHistory } from "./recorder.js";
import type { MachineResolver } from "./shrink.js";

export interface TraceReplayResult<S> {
  readonly traceHash: string;
  readonly trace: readonly TraceEntry[];
  readonly states: ReadonlyMap<NodeId, S>;
}

interface IntentFrame {
  readonly node: NodeId;
  readonly queue: Intent[];
}

interface ReplayContext<S> {
  readonly states: Map<NodeId, S>;
  readonly steps: Map<NodeId, ReturnType<MachineResolver<S>>>;
  readonly frames: IntentFrame[];
  readonly trace: TraceEntry[];
}

function initializeReplay<S>(
  history: RecordedHistory<S>,
  resolveMachine: MachineResolver<S>,
): ReplayContext<S> {
  const context: ReplayContext<S> = {
    states: new Map(),
    steps: new Map(),
    frames: [],
    trace: [],
  };
  for (const node of history.config.nodes) {
    if (node.machine === undefined) {
      throw new Error(`recorded node ${node.id} has no machine id`);
    }
    context.states.set(node.id, node.initial);
    context.steps.set(node.id, resolveMachine(node.machine, node.id));
  }
  return context;
}

function consumeTraceEntry<S>(
  context: ReplayContext<S>,
  entry: TraceEntry,
): void {
  if (entry.t === "advance") {
    context.trace.push({ t: "advance", at: entry.at });
    return;
  }
  if (entry.t === "event") {
    const step = context.steps.get(entry.node);
    const state = context.states.get(entry.node);
    if (step === undefined || state === undefined) {
      throw new Error(`recorded event for unknown node ${entry.node}`);
    }
    context.trace.push({ t: "event", node: entry.node, event: entry.event });
    const result = step(state, entry.event);
    context.states.set(entry.node, result.state);
    context.frames.push({ node: entry.node, queue: [...result.intents] });
    return;
  }

  // Regenerate from the innermost pending dispatch frame, mirroring the
  // kernel's record-then-apply recursion order.
  while (
    context.frames.length > 0 &&
    context.frames[context.frames.length - 1]!.queue.length === 0
  ) {
    context.frames.pop();
  }
  const frame = context.frames[context.frames.length - 1];
  if (frame === undefined) {
    throw new Error(
      `recorded intent for ${entry.node} with no pending dispatch`,
    );
  }
  if (frame.node !== entry.node) {
    throw new Error(
      `recorded intent node mismatch: recorded=${entry.node} regenerated=${frame.node}`,
    );
  }
  context.trace.push({
    t: "intent",
    node: frame.node,
    intent: frame.queue.shift()!,
  });
}

function assertReplayConsumedAllIntents(frames: readonly IntentFrame[]): void {
  const leftover = frames.filter((frame) => frame.queue.length > 0);
  if (leftover.length > 0) {
    throw new Error(
      `machines produced intents beyond the recorded trace for: ${leftover
        .map((frame) => frame.node)
        .join(", ")}`,
    );
  }
}

/**
 * SPEC-TRACE cross-producer consumer: rebuild a trace from a recorded history
 * using only the machines — no kernel, no scheduler. Recorded events and
 * advances are treated as external inputs; every intent entry is regenerated
 * by re-running the machine, so `traceHash` equals the producer's hash iff
 * the machines deterministically reproduce the recorded intents.
 */
export function replayRecordedTrace<S>(
  history: RecordedHistory<S>,
  resolveMachine: MachineResolver<S>,
): TraceReplayResult<S> {
  const context = initializeReplay(history, resolveMachine);
  for (const entry of history.trace) {
    consumeTraceEntry(context, entry);
  }
  assertReplayConsumedAllIntents(context.frames);
  return {
    traceHash: hashTrace(context.trace),
    trace: context.trace,
    states: context.states,
  };
}
