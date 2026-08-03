// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Event, NodeId, StepFn } from "../../types.js";
import { hashTrace, type TraceEntry } from "../../trace.js";
import { SimKernel, type SimKernelConfig, type SimNodeConfig } from "./kernel.js";
export interface RecordedEvent {
  readonly node: NodeId;
  readonly event: Event;
}

/** Extract delivered events from a sim trace in deterministic order. */
export function eventsFromTrace(trace: readonly TraceEntry[]): RecordedEvent[] {
  if (stryMutAct_9fa48("993")) {
    {}
  } else {
    stryCov_9fa48("993");
    const out: RecordedEvent[] = stryMutAct_9fa48("994") ? ["Stryker was here"] : (stryCov_9fa48("994"), []);
    for (const entry of trace) {
      if (stryMutAct_9fa48("995")) {
        {}
      } else {
        stryCov_9fa48("995");
        if (stryMutAct_9fa48("998") ? entry.t !== "event" : stryMutAct_9fa48("997") ? false : stryMutAct_9fa48("996") ? true : (stryCov_9fa48("996", "997", "998"), entry.t === (stryMutAct_9fa48("999") ? "" : (stryCov_9fa48("999"), "event")))) {
          if (stryMutAct_9fa48("1000")) {
            {}
          } else {
            stryCov_9fa48("1000");
            out.push(stryMutAct_9fa48("1001") ? {} : (stryCov_9fa48("1001"), {
              node: entry.node,
              event: entry.event
            }));
          }
        }
      }
    }
    return out;
  }
}
export interface ReplayResult<S> {
  readonly traceHash: string;
  readonly states: ReadonlyMap<NodeId, S>;
}

/**
 * Replay a recorded event sequence on fresh nodes with the same initial state.
 * Ignores timer/transport auto-scheduling — only explicit events are applied.
 */
export function replayEvents<S>(config: SimKernelConfig<S>, events: readonly RecordedEvent[]): ReplayResult<S> {
  if (stryMutAct_9fa48("1002")) {
    {}
  } else {
    stryCov_9fa48("1002");
    const kernel = new SimKernel(config);
    for (const {
      node,
      event
    } of events) {
      if (stryMutAct_9fa48("1003")) {
        {}
      } else {
        stryCov_9fa48("1003");
        kernel.inject(node, event);
      }
    }
    const states = new Map<NodeId, S>();
    for (const node of config.nodes) {
      if (stryMutAct_9fa48("1004")) {
        {}
      } else {
        stryCov_9fa48("1004");
        states.set(node.id, kernel.getNodeState(node.id));
      }
    }
    return stryMutAct_9fa48("1005") ? {} : (stryCov_9fa48("1005"), {
      traceHash: kernel.getTraceHash(),
      states
    });
  }
}

/** Stable hash of node final states for determinism checks. */
export function hashNodeStates<S>(states: ReadonlyMap<NodeId, S>): string {
  if (stryMutAct_9fa48("1006")) {
    {}
  } else {
    stryCov_9fa48("1006");
    const ordered = stryMutAct_9fa48("1007") ? [...states.entries()] : (stryCov_9fa48("1007"), (stryMutAct_9fa48("1008") ? [] : (stryCov_9fa48("1008"), [...states.entries()])).sort(stryMutAct_9fa48("1009") ? () => undefined : (stryCov_9fa48("1009"), ([a], [b]) => a.localeCompare(b))));
    return hashTrace(ordered.map(stryMutAct_9fa48("1010") ? () => undefined : (stryCov_9fa48("1010"), ([node, state]) => stryMutAct_9fa48("1011") ? {} : (stryCov_9fa48("1011"), {
      t: "intent" as const,
      node,
      intent: stryMutAct_9fa48("1012") ? {} : (stryCov_9fa48("1012"), {
        kind: "log" as const,
        level: "debug" as const,
        message: JSON.stringify(state)
      })
    }))));
  }
}

/** Run scenario, replay its event trace, assert identical final state hashes. */
export function assertReplayDeterminism<S>(config: SimKernelConfig<S>, run: (kernel: SimKernel<S>) => void): {
  readonly liveHash: string;
  readonly replayHash: string;
  readonly stateHash: string;
} {
  if (stryMutAct_9fa48("1013")) {
    {}
  } else {
    stryCov_9fa48("1013");
    const live = new SimKernel(config);
    run(live);
    const events = eventsFromTrace(live.getTrace());
    const replayed = replayEvents(config, events);
    const liveStateHash = hashNodeStates(new Map(config.nodes.map(stryMutAct_9fa48("1014") ? () => undefined : (stryCov_9fa48("1014"), node => stryMutAct_9fa48("1015") ? [] : (stryCov_9fa48("1015"), [node.id, live.getNodeState(node.id)])))));
    const replayStateHash = hashNodeStates(replayed.states);
    if (stryMutAct_9fa48("1018") ? liveStateHash === replayStateHash : stryMutAct_9fa48("1017") ? false : stryMutAct_9fa48("1016") ? true : (stryCov_9fa48("1016", "1017", "1018"), liveStateHash !== replayStateHash)) {
      if (stryMutAct_9fa48("1019")) {
        {}
      } else {
        stryCov_9fa48("1019");
        throw new Error(stryMutAct_9fa48("1020") ? `` : (stryCov_9fa48("1020"), `replay state hash mismatch: live=${liveStateHash} replay=${replayStateHash}`));
      }
    }
    return stryMutAct_9fa48("1021") ? {} : (stryCov_9fa48("1021"), {
      liveHash: live.getTraceHash(),
      replayHash: replayed.traceHash,
      stateHash: liveStateHash
    });
  }
}
export type { SimKernelConfig, SimNodeConfig, StepFn };