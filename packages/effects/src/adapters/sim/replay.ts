import type { Event, NodeId, StepFn } from "../../types.js";
import { hashTrace, type TraceEntry } from "../../trace.js";
import {
  SimKernel,
  type SimKernelConfig,
  type SimNodeConfig,
} from "./kernel.js";

export interface RecordedEvent {
  readonly node: NodeId;
  readonly event: Event;
}

/** Extract delivered events from a sim trace in deterministic order. */
export function eventsFromTrace(trace: readonly TraceEntry[]): RecordedEvent[] {
  const out: RecordedEvent[] = [];
  for (const entry of trace) {
    if (entry.t === "event") {
      out.push({ node: entry.node, event: entry.event });
    }
  }
  return out;
}

export interface ReplayResult<S> {
  readonly traceHash: string;
  readonly states: ReadonlyMap<NodeId, S>;
}

/**
 * Replay a recorded event sequence on fresh nodes with the same initial state.
 * Ignores timer/transport auto-scheduling — only explicit events are applied.
 */
export function replayEvents<S>(
  config: SimKernelConfig<S>,
  events: readonly RecordedEvent[],
): ReplayResult<S> {
  const kernel = new SimKernel(config);
  for (const { node, event } of events) {
    kernel.inject(node, event);
  }
  const states = new Map<NodeId, S>();
  for (const node of config.nodes) {
    states.set(node.id, kernel.getNodeState(node.id));
  }
  return { traceHash: kernel.getTraceHash(), states };
}

/** Stable hash of node final states for determinism checks. */
export function hashNodeStates<S>(states: ReadonlyMap<NodeId, S>): string {
  const ordered = [...states.entries()].sort(([a], [b]) => a.localeCompare(b));
  return hashTrace(
    ordered.map(([node, state]) => ({
      t: "intent" as const,
      node,
      intent: {
        kind: "log" as const,
        level: "debug" as const,
        message: JSON.stringify(state),
      },
    })),
  );
}

/** Run scenario, replay its event trace, assert identical final state hashes. */
export function assertReplayDeterminism<S>(
  config: SimKernelConfig<S>,
  run: (kernel: SimKernel<S>) => void,
): {
  readonly liveHash: string;
  readonly replayHash: string;
  readonly stateHash: string;
} {
  const live = new SimKernel(config);
  run(live);
  const events = eventsFromTrace(live.getTrace());
  const replayed = replayEvents(config, events);
  const liveStateHash = hashNodeStates(
    new Map(config.nodes.map((node) => [node.id, live.getNodeState(node.id)])),
  );
  const replayStateHash = hashNodeStates(replayed.states);
  if (liveStateHash !== replayStateHash) {
    throw new Error(
      `replay state hash mismatch: live=${liveStateHash} replay=${replayStateHash}`,
    );
  }
  return {
    liveHash: live.getTraceHash(),
    replayHash: replayed.traceHash,
    stateHash: liveStateHash,
  };
}

export type { SimKernelConfig, SimNodeConfig, StepFn };
