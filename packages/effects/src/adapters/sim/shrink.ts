import type { NodeId, StepFn } from "../../types.js";
import type { Oracle } from "./oracles.js";
import { OracleViolation, SimKernel } from "./kernel.js";
import {
  historyEvents,
  type RecordedHistory,
  type RecordedKernelConfig
} from "./recorder.js";

/** Zeller delta debugging: return a 1-minimal subsequence that still satisfies `fails`. */
export function ddmin<T>(items: readonly T[], fails: (candidate: readonly T[]) => boolean): T[] {
  if (!fails(items)) throw new Error("ddmin input does not reproduce the failure");
  let current = [...items];
  let partitions = 2;
  while (current.length >= 2) {
    const chunkSize = Math.ceil(current.length / partitions);
    let reduced = false;
    for (let offset = 0; offset < current.length; offset += chunkSize) {
      const complement = current.slice(0, offset).concat(current.slice(offset + chunkSize));
      if (complement.length > 0 && fails(complement)) {
        current = complement;
        partitions = Math.max(2, partitions - 1);
        reduced = true;
        break;
      }
    }
    if (reduced) continue;
    if (partitions >= current.length) break;
    partitions = Math.min(current.length, partitions * 2);
  }
  return current;
}

export type MachineResolver<S> = (machine: string, node: NodeId) => StepFn<S>;

export interface RerunOptions<S> {
  readonly resolveMachine: MachineResolver<S>;
  readonly oracles: readonly Oracle<S>[];
}

export interface RerunViolation<S> {
  readonly violation: OracleViolation;
  readonly kernel: SimKernel<S>;
}

export function configFromRecording<S>(
  config: RecordedKernelConfig<S>,
  options: RerunOptions<S>
) {
  return {
    seed: config.seed,
    startMs: config.startMs,
    nodes: config.nodes.map((node) => {
      if (node.machine === undefined) throw new Error(`recorded node ${node.id} has no machine id`);
      return { id: node.id, machine: node.machine, initial: node.initial, step: options.resolveMachine(node.machine, node.id) };
    }),
    ...(config.delivery === undefined ? {} : { delivery: config.delivery }),
    ...(config.links === undefined ? {} : { links: config.links }),
    ...(config.interleaveSalt === undefined ? {} : { interleaveSalt: config.interleaveSalt }),
    oracles: options.oracles
  };
}

/** Replay the explicit event tape and require the same named oracle to trip. */
export function rerunHistory<S>(
  history: RecordedHistory<S>,
  options: RerunOptions<S>,
  events = historyEvents(history)
): RerunViolation<S> {
  const kernel = new SimKernel(configFromRecording(history.config, options));
  try {
    for (const item of events) kernel.inject(item.node, item.event);
  } catch (error) {
    if (error instanceof OracleViolation) {
      if (history.violation !== undefined && error.violation.oracle !== history.violation.oracle) {
        throw new Error(
          `oracle mismatch: recorded=${history.violation.oracle} replay=${error.violation.oracle}`
        );
      }
      return { violation: error, kernel };
    }
    throw error;
  }
  throw new Error(`recorded oracle did not trip: ${history.violation?.oracle ?? "unknown"}`);
}

export function shrinkHistory<S>(
  history: RecordedHistory<S>,
  options: RerunOptions<S>
): RecordedHistory<S> {
  const minimal = ddmin(historyEvents(history), (events) => {
    try {
      rerunHistory(history, options, events);
      return true;
    } catch {
      return false;
    }
  });
  return {
    ...history,
    trace: minimal.map(({ node, event }) => ({ t: "event" as const, node, event }))
  };
}

/** Shrink while the live scenario's executable steps are still available. */
export function shrinkHistoryWithConfig<S>(
  history: RecordedHistory,
  config: import("./kernel.js").SimKernelConfig<S>
): RecordedHistory<S> {
  const oracleName = history.violation?.oracle;
  const events = historyEvents(history);
  const minimal = ddmin(events, (candidate) => {
    const { recorder: _recorder, ...rerunConfig } = config;
    const kernel = new SimKernel(rerunConfig);
    try {
      for (const item of candidate) kernel.inject(item.node, item.event);
    } catch (error) {
      return error instanceof OracleViolation &&
        (oracleName === undefined || error.violation.oracle === oracleName);
    }
    return false;
  });
  return {
    version: 1,
    config: history.config as RecordedKernelConfig<S>,
    trace: minimal.map(({ node, event }) => ({ t: "event" as const, node, event })),
    ...(history.violation === undefined ? {} : { violation: history.violation })
  };
}
