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
export function replayRecordedTrace<S>(history: RecordedHistory<S>, resolveMachine: MachineResolver<S>): TraceReplayResult<S> {
  if (stryMutAct_9fa48("355")) {
    {}
  } else {
    stryCov_9fa48("355");
    const states = new Map<NodeId, S>();
    const steps = new Map<NodeId, ReturnType<MachineResolver<S>>>();
    for (const node of history.config.nodes) {
      if (stryMutAct_9fa48("356")) {
        {}
      } else {
        stryCov_9fa48("356");
        if (stryMutAct_9fa48("359") ? node.machine !== undefined : stryMutAct_9fa48("358") ? false : stryMutAct_9fa48("357") ? true : (stryCov_9fa48("357", "358", "359"), node.machine === undefined)) {
          if (stryMutAct_9fa48("360")) {
            {}
          } else {
            stryCov_9fa48("360");
            throw new Error(stryMutAct_9fa48("361") ? `` : (stryCov_9fa48("361"), `recorded node ${node.id} has no machine id`));
          }
        }
        states.set(node.id, node.initial);
        steps.set(node.id, resolveMachine(node.machine, node.id));
      }
    }
    const frames: IntentFrame[] = stryMutAct_9fa48("362") ? ["Stryker was here"] : (stryCov_9fa48("362"), []);
    const out: TraceEntry[] = stryMutAct_9fa48("363") ? ["Stryker was here"] : (stryCov_9fa48("363"), []);
    for (const entry of history.trace) {
      if (stryMutAct_9fa48("364")) {
        {}
      } else {
        stryCov_9fa48("364");
        if (stryMutAct_9fa48("367") ? entry.t !== "advance" : stryMutAct_9fa48("366") ? false : stryMutAct_9fa48("365") ? true : (stryCov_9fa48("365", "366", "367"), entry.t === (stryMutAct_9fa48("368") ? "" : (stryCov_9fa48("368"), "advance")))) {
          if (stryMutAct_9fa48("369")) {
            {}
          } else {
            stryCov_9fa48("369");
            out.push(stryMutAct_9fa48("370") ? {} : (stryCov_9fa48("370"), {
              t: stryMutAct_9fa48("371") ? "" : (stryCov_9fa48("371"), "advance"),
              at: entry.at
            }));
            continue;
          }
        }
        if (stryMutAct_9fa48("374") ? entry.t !== "event" : stryMutAct_9fa48("373") ? false : stryMutAct_9fa48("372") ? true : (stryCov_9fa48("372", "373", "374"), entry.t === (stryMutAct_9fa48("375") ? "" : (stryCov_9fa48("375"), "event")))) {
          if (stryMutAct_9fa48("376")) {
            {}
          } else {
            stryCov_9fa48("376");
            const step = steps.get(entry.node);
            const state = states.get(entry.node);
            if (stryMutAct_9fa48("379") ? step === undefined && state === undefined : stryMutAct_9fa48("378") ? false : stryMutAct_9fa48("377") ? true : (stryCov_9fa48("377", "378", "379"), (stryMutAct_9fa48("381") ? step !== undefined : stryMutAct_9fa48("380") ? false : (stryCov_9fa48("380", "381"), step === undefined)) || (stryMutAct_9fa48("383") ? state !== undefined : stryMutAct_9fa48("382") ? false : (stryCov_9fa48("382", "383"), state === undefined)))) {
              if (stryMutAct_9fa48("384")) {
                {}
              } else {
                stryCov_9fa48("384");
                throw new Error(stryMutAct_9fa48("385") ? `` : (stryCov_9fa48("385"), `recorded event for unknown node ${entry.node}`));
              }
            }
            out.push(stryMutAct_9fa48("386") ? {} : (stryCov_9fa48("386"), {
              t: stryMutAct_9fa48("387") ? "" : (stryCov_9fa48("387"), "event"),
              node: entry.node,
              event: entry.event
            }));
            const result = step(state, entry.event);
            states.set(entry.node, result.state);
            frames.push(stryMutAct_9fa48("388") ? {} : (stryCov_9fa48("388"), {
              node: entry.node,
              queue: stryMutAct_9fa48("389") ? [] : (stryCov_9fa48("389"), [...result.intents])
            }));
            continue;
          }
        }
        // Intent entry: regenerate from the innermost pending dispatch frame,
        // mirroring the kernel's record-then-apply recursion order.
        while (stryMutAct_9fa48("391") ? frames.length > 0 || frames[frames.length - 1]!.queue.length === 0 : stryMutAct_9fa48("390") ? false : (stryCov_9fa48("390", "391"), (stryMutAct_9fa48("394") ? frames.length <= 0 : stryMutAct_9fa48("393") ? frames.length >= 0 : stryMutAct_9fa48("392") ? true : (stryCov_9fa48("392", "393", "394"), frames.length > 0)) && (stryMutAct_9fa48("396") ? frames[frames.length - 1]!.queue.length !== 0 : stryMutAct_9fa48("395") ? true : (stryCov_9fa48("395", "396"), frames[stryMutAct_9fa48("397") ? frames.length + 1 : (stryCov_9fa48("397"), frames.length - 1)]!.queue.length === 0)))) {
          if (stryMutAct_9fa48("398")) {
            {}
          } else {
            stryCov_9fa48("398");
            frames.pop();
          }
        }
        const frame = frames[stryMutAct_9fa48("399") ? frames.length + 1 : (stryCov_9fa48("399"), frames.length - 1)];
        if (stryMutAct_9fa48("402") ? frame !== undefined : stryMutAct_9fa48("401") ? false : stryMutAct_9fa48("400") ? true : (stryCov_9fa48("400", "401", "402"), frame === undefined)) {
          if (stryMutAct_9fa48("403")) {
            {}
          } else {
            stryCov_9fa48("403");
            throw new Error(stryMutAct_9fa48("404") ? `` : (stryCov_9fa48("404"), `recorded intent for ${entry.node} with no pending dispatch`));
          }
        }
        if (stryMutAct_9fa48("407") ? frame.node === entry.node : stryMutAct_9fa48("406") ? false : stryMutAct_9fa48("405") ? true : (stryCov_9fa48("405", "406", "407"), frame.node !== entry.node)) {
          if (stryMutAct_9fa48("408")) {
            {}
          } else {
            stryCov_9fa48("408");
            throw new Error(stryMutAct_9fa48("409") ? `` : (stryCov_9fa48("409"), `recorded intent node mismatch: recorded=${entry.node} regenerated=${frame.node}`));
          }
        }
        out.push(stryMutAct_9fa48("410") ? {} : (stryCov_9fa48("410"), {
          t: stryMutAct_9fa48("411") ? "" : (stryCov_9fa48("411"), "intent"),
          node: frame.node,
          intent: frame.queue.shift()!
        }));
      }
    }
    const leftover = stryMutAct_9fa48("412") ? frames : (stryCov_9fa48("412"), frames.filter(stryMutAct_9fa48("413") ? () => undefined : (stryCov_9fa48("413"), frame => stryMutAct_9fa48("417") ? frame.queue.length <= 0 : stryMutAct_9fa48("416") ? frame.queue.length >= 0 : stryMutAct_9fa48("415") ? false : stryMutAct_9fa48("414") ? true : (stryCov_9fa48("414", "415", "416", "417"), frame.queue.length > 0))));
    if (stryMutAct_9fa48("421") ? leftover.length <= 0 : stryMutAct_9fa48("420") ? leftover.length >= 0 : stryMutAct_9fa48("419") ? false : stryMutAct_9fa48("418") ? true : (stryCov_9fa48("418", "419", "420", "421"), leftover.length > 0)) {
      if (stryMutAct_9fa48("422")) {
        {}
      } else {
        stryCov_9fa48("422");
        throw new Error(stryMutAct_9fa48("423") ? `` : (stryCov_9fa48("423"), `machines produced intents beyond the recorded trace for: ${leftover.map(stryMutAct_9fa48("424") ? () => undefined : (stryCov_9fa48("424"), frame => frame.node)).join(stryMutAct_9fa48("425") ? "" : (stryCov_9fa48("425"), ", "))}`));
      }
    }
    return stryMutAct_9fa48("426") ? {} : (stryCov_9fa48("426"), {
      traceHash: hashTrace(out),
      trace: out,
      states
    });
  }
}