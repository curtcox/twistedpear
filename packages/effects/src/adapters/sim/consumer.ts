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

/**
 * SPEC-TRACE cross-producer consumer: rebuild a trace from a recorded history
 * using only the machines — no kernel, no scheduler. Recorded events and
 * advances are treated as external inputs; every intent entry is regenerated
 * by re-running the machine, so `traceHash` equals the producer's hash iff
 * the machines deterministically reproduce the recorded intents.
 */
export function replayRecordedTrace<S>(
  history: RecordedHistory<S>,
  resolveMachine: MachineResolver<S>
): TraceReplayResult<S> {
  const states = new Map<NodeId, S>();
  const steps = new Map<NodeId, ReturnType<MachineResolver<S>>>();
  for (const node of history.config.nodes) {
    if (node.machine === undefined) {
      throw new Error(`recorded node ${node.id} has no machine id`);
    }
    states.set(node.id, node.initial);
    steps.set(node.id, resolveMachine(node.machine, node.id));
  }

  const frames: IntentFrame[] = [];
  const out: TraceEntry[] = [];

  for (const entry of history.trace) {
    if (entry.t === "advance") {
      out.push({ t: "advance", at: entry.at });
      continue;
    }
    if (entry.t === "event") {
      const step = steps.get(entry.node);
      const state = states.get(entry.node);
      if (step === undefined || state === undefined) {
        throw new Error(`recorded event for unknown node ${entry.node}`);
      }
      out.push({ t: "event", node: entry.node, event: entry.event });
      const result = step(state, entry.event);
      states.set(entry.node, result.state);
      frames.push({ node: entry.node, queue: [...result.intents] });
      continue;
    }
    // Intent entry: regenerate from the innermost pending dispatch frame,
    // mirroring the kernel's record-then-apply recursion order.
    while (frames.length > 0 && frames[frames.length - 1]!.queue.length === 0) {
      frames.pop();
    }
    const frame = frames[frames.length - 1];
    if (frame === undefined) {
      throw new Error(`recorded intent for ${entry.node} with no pending dispatch`);
    }
    if (frame.node !== entry.node) {
      throw new Error(
        `recorded intent node mismatch: recorded=${entry.node} regenerated=${frame.node}`
      );
    }
    out.push({ t: "intent", node: frame.node, intent: frame.queue.shift()! });
  }

  const leftover = frames.filter((frame) => frame.queue.length > 0);
  if (leftover.length > 0) {
    throw new Error(
      `machines produced intents beyond the recorded trace for: ${leftover
        .map((frame) => frame.node)
        .join(", ")}`
    );
  }

  return { traceHash: hashTrace(out), trace: out, states };
}
