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
import type { NodeId, StepFn } from "../../types.js";
import type { Oracle } from "./oracles.js";
import { OracleViolation, SimKernel } from "./kernel.js";
import { historyEvents, type RecordedHistory, type RecordedKernelConfig } from "./recorder.js";

/** Zeller delta debugging: return a 1-minimal subsequence that still satisfies `fails`. */
export function ddmin<T>(items: readonly T[], fails: (candidate: readonly T[]) => boolean): T[] {
  if (stryMutAct_9fa48("1022")) {
    {}
  } else {
    stryCov_9fa48("1022");
    if (stryMutAct_9fa48("1025") ? false : stryMutAct_9fa48("1024") ? true : stryMutAct_9fa48("1023") ? fails(items) : (stryCov_9fa48("1023", "1024", "1025"), !fails(items))) throw new Error(stryMutAct_9fa48("1026") ? "" : (stryCov_9fa48("1026"), "ddmin input does not reproduce the failure"));
    let current = stryMutAct_9fa48("1027") ? [] : (stryCov_9fa48("1027"), [...items]);
    let partitions = 2;
    while (stryMutAct_9fa48("1030") ? current.length < 2 : stryMutAct_9fa48("1029") ? current.length > 2 : stryMutAct_9fa48("1028") ? false : (stryCov_9fa48("1028", "1029", "1030"), current.length >= 2)) {
      if (stryMutAct_9fa48("1031")) {
        {}
      } else {
        stryCov_9fa48("1031");
        const chunkSize = Math.ceil(stryMutAct_9fa48("1032") ? current.length * partitions : (stryCov_9fa48("1032"), current.length / partitions));
        let reduced = stryMutAct_9fa48("1033") ? true : (stryCov_9fa48("1033"), false);
        for (let offset = 0; stryMutAct_9fa48("1036") ? offset >= current.length : stryMutAct_9fa48("1035") ? offset <= current.length : stryMutAct_9fa48("1034") ? false : (stryCov_9fa48("1034", "1035", "1036"), offset < current.length); stryMutAct_9fa48("1037") ? offset -= chunkSize : (stryCov_9fa48("1037"), offset += chunkSize)) {
          if (stryMutAct_9fa48("1038")) {
            {}
          } else {
            stryCov_9fa48("1038");
            const complement = stryMutAct_9fa48("1039") ? current.concat(current.slice(offset + chunkSize)) : (stryCov_9fa48("1039"), current.slice(0, offset).concat(stryMutAct_9fa48("1040") ? current : (stryCov_9fa48("1040"), current.slice(stryMutAct_9fa48("1041") ? offset - chunkSize : (stryCov_9fa48("1041"), offset + chunkSize)))));
            if (stryMutAct_9fa48("1044") ? complement.length > 0 || fails(complement) : stryMutAct_9fa48("1043") ? false : stryMutAct_9fa48("1042") ? true : (stryCov_9fa48("1042", "1043", "1044"), (stryMutAct_9fa48("1047") ? complement.length <= 0 : stryMutAct_9fa48("1046") ? complement.length >= 0 : stryMutAct_9fa48("1045") ? true : (stryCov_9fa48("1045", "1046", "1047"), complement.length > 0)) && fails(complement))) {
              if (stryMutAct_9fa48("1048")) {
                {}
              } else {
                stryCov_9fa48("1048");
                current = complement;
                partitions = stryMutAct_9fa48("1049") ? Math.min(2, partitions - 1) : (stryCov_9fa48("1049"), Math.max(2, stryMutAct_9fa48("1050") ? partitions + 1 : (stryCov_9fa48("1050"), partitions - 1)));
                reduced = stryMutAct_9fa48("1051") ? false : (stryCov_9fa48("1051"), true);
                break;
              }
            }
          }
        }
        if (stryMutAct_9fa48("1053") ? false : stryMutAct_9fa48("1052") ? true : (stryCov_9fa48("1052", "1053"), reduced)) continue;
        if (stryMutAct_9fa48("1057") ? partitions < current.length : stryMutAct_9fa48("1056") ? partitions > current.length : stryMutAct_9fa48("1055") ? false : stryMutAct_9fa48("1054") ? true : (stryCov_9fa48("1054", "1055", "1056", "1057"), partitions >= current.length)) break;
        partitions = stryMutAct_9fa48("1058") ? Math.max(current.length, partitions * 2) : (stryCov_9fa48("1058"), Math.min(current.length, stryMutAct_9fa48("1059") ? partitions / 2 : (stryCov_9fa48("1059"), partitions * 2)));
      }
    }
    return current;
  }
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
export function configFromRecording<S>(config: RecordedKernelConfig<S>, options: RerunOptions<S>) {
  if (stryMutAct_9fa48("1060")) {
    {}
  } else {
    stryCov_9fa48("1060");
    return stryMutAct_9fa48("1061") ? {} : (stryCov_9fa48("1061"), {
      seed: config.seed,
      startMs: config.startMs,
      nodes: config.nodes.map(node => {
        if (stryMutAct_9fa48("1062")) {
          {}
        } else {
          stryCov_9fa48("1062");
          if (stryMutAct_9fa48("1065") ? node.machine !== undefined : stryMutAct_9fa48("1064") ? false : stryMutAct_9fa48("1063") ? true : (stryCov_9fa48("1063", "1064", "1065"), node.machine === undefined)) throw new Error(stryMutAct_9fa48("1066") ? `` : (stryCov_9fa48("1066"), `recorded node ${node.id} has no machine id`));
          return stryMutAct_9fa48("1067") ? {} : (stryCov_9fa48("1067"), {
            id: node.id,
            machine: node.machine,
            initial: node.initial,
            step: options.resolveMachine(node.machine, node.id)
          });
        }
      }),
      ...((stryMutAct_9fa48("1070") ? config.delivery !== undefined : stryMutAct_9fa48("1069") ? false : stryMutAct_9fa48("1068") ? true : (stryCov_9fa48("1068", "1069", "1070"), config.delivery === undefined)) ? {} : stryMutAct_9fa48("1071") ? {} : (stryCov_9fa48("1071"), {
        delivery: config.delivery
      })),
      ...((stryMutAct_9fa48("1074") ? config.links !== undefined : stryMutAct_9fa48("1073") ? false : stryMutAct_9fa48("1072") ? true : (stryCov_9fa48("1072", "1073", "1074"), config.links === undefined)) ? {} : stryMutAct_9fa48("1075") ? {} : (stryCov_9fa48("1075"), {
        links: config.links
      })),
      ...((stryMutAct_9fa48("1078") ? config.interleaveSalt !== undefined : stryMutAct_9fa48("1077") ? false : stryMutAct_9fa48("1076") ? true : (stryCov_9fa48("1076", "1077", "1078"), config.interleaveSalt === undefined)) ? {} : stryMutAct_9fa48("1079") ? {} : (stryCov_9fa48("1079"), {
        interleaveSalt: config.interleaveSalt
      })),
      oracles: options.oracles
    });
  }
}

/** Replay the explicit event tape and require the same named oracle to trip. */
export function rerunHistory<S>(history: RecordedHistory<S>, options: RerunOptions<S>, events = historyEvents(history)): RerunViolation<S> {
  if (stryMutAct_9fa48("1080")) {
    {}
  } else {
    stryCov_9fa48("1080");
    const kernel = new SimKernel(configFromRecording(history.config, options));
    try {
      if (stryMutAct_9fa48("1081")) {
        {}
      } else {
        stryCov_9fa48("1081");
        for (const item of events) kernel.inject(item.node, item.event);
      }
    } catch (error) {
      if (stryMutAct_9fa48("1082")) {
        {}
      } else {
        stryCov_9fa48("1082");
        if (stryMutAct_9fa48("1084") ? false : stryMutAct_9fa48("1083") ? true : (stryCov_9fa48("1083", "1084"), error instanceof OracleViolation)) {
          if (stryMutAct_9fa48("1085")) {
            {}
          } else {
            stryCov_9fa48("1085");
            if (stryMutAct_9fa48("1088") ? history.violation !== undefined || error.violation.oracle !== history.violation.oracle : stryMutAct_9fa48("1087") ? false : stryMutAct_9fa48("1086") ? true : (stryCov_9fa48("1086", "1087", "1088"), (stryMutAct_9fa48("1090") ? history.violation === undefined : stryMutAct_9fa48("1089") ? true : (stryCov_9fa48("1089", "1090"), history.violation !== undefined)) && (stryMutAct_9fa48("1092") ? error.violation.oracle === history.violation.oracle : stryMutAct_9fa48("1091") ? true : (stryCov_9fa48("1091", "1092"), error.violation.oracle !== history.violation.oracle)))) {
              if (stryMutAct_9fa48("1093")) {
                {}
              } else {
                stryCov_9fa48("1093");
                throw new Error(stryMutAct_9fa48("1094") ? `` : (stryCov_9fa48("1094"), `oracle mismatch: recorded=${history.violation.oracle} replay=${error.violation.oracle}`));
              }
            }
            return stryMutAct_9fa48("1095") ? {} : (stryCov_9fa48("1095"), {
              violation: error,
              kernel
            });
          }
        }
        throw error;
      }
    }
    throw new Error(stryMutAct_9fa48("1096") ? `` : (stryCov_9fa48("1096"), `recorded oracle did not trip: ${stryMutAct_9fa48("1097") ? history.violation?.oracle && "unknown" : (stryCov_9fa48("1097"), (stryMutAct_9fa48("1098") ? history.violation.oracle : (stryCov_9fa48("1098"), history.violation?.oracle)) ?? (stryMutAct_9fa48("1099") ? "" : (stryCov_9fa48("1099"), "unknown")))}`));
  }
}
export function shrinkHistory<S>(history: RecordedHistory<S>, options: RerunOptions<S>): RecordedHistory<S> {
  if (stryMutAct_9fa48("1100")) {
    {}
  } else {
    stryCov_9fa48("1100");
    const minimal = ddmin(historyEvents(history), events => {
      if (stryMutAct_9fa48("1101")) {
        {}
      } else {
        stryCov_9fa48("1101");
        try {
          if (stryMutAct_9fa48("1102")) {
            {}
          } else {
            stryCov_9fa48("1102");
            rerunHistory(history, options, events);
            return stryMutAct_9fa48("1103") ? false : (stryCov_9fa48("1103"), true);
          }
        } catch {
          if (stryMutAct_9fa48("1104")) {
            {}
          } else {
            stryCov_9fa48("1104");
            return stryMutAct_9fa48("1105") ? true : (stryCov_9fa48("1105"), false);
          }
        }
      }
    });
    return stryMutAct_9fa48("1106") ? {} : (stryCov_9fa48("1106"), {
      ...history,
      trace: minimal.map(stryMutAct_9fa48("1107") ? () => undefined : (stryCov_9fa48("1107"), ({
        node,
        event
      }) => stryMutAct_9fa48("1108") ? {} : (stryCov_9fa48("1108"), {
        t: "event" as const,
        node,
        event
      })))
    });
  }
}

/** Shrink while the live scenario's executable steps are still available. */
export function shrinkHistoryWithConfig<S>(history: RecordedHistory, config: import("./kernel.js").SimKernelConfig<S>): RecordedHistory<S> {
  if (stryMutAct_9fa48("1109")) {
    {}
  } else {
    stryCov_9fa48("1109");
    const oracleName = stryMutAct_9fa48("1110") ? history.violation.oracle : (stryCov_9fa48("1110"), history.violation?.oracle);
    const events = historyEvents(history);
    const minimal = ddmin(events, candidate => {
      if (stryMutAct_9fa48("1111")) {
        {}
      } else {
        stryCov_9fa48("1111");
        const {
          recorder: _recorder,
          ...rerunConfig
        } = config;
        const kernel = new SimKernel(rerunConfig);
        try {
          if (stryMutAct_9fa48("1112")) {
            {}
          } else {
            stryCov_9fa48("1112");
            for (const item of candidate) kernel.inject(item.node, item.event);
          }
        } catch (error) {
          if (stryMutAct_9fa48("1113")) {
            {}
          } else {
            stryCov_9fa48("1113");
            return stryMutAct_9fa48("1116") ? error instanceof OracleViolation || oracleName === undefined || error.violation.oracle === oracleName : stryMutAct_9fa48("1115") ? false : stryMutAct_9fa48("1114") ? true : (stryCov_9fa48("1114", "1115", "1116"), error instanceof OracleViolation && (stryMutAct_9fa48("1118") ? oracleName === undefined && error.violation.oracle === oracleName : stryMutAct_9fa48("1117") ? true : (stryCov_9fa48("1117", "1118"), (stryMutAct_9fa48("1120") ? oracleName !== undefined : stryMutAct_9fa48("1119") ? false : (stryCov_9fa48("1119", "1120"), oracleName === undefined)) || (stryMutAct_9fa48("1122") ? error.violation.oracle !== oracleName : stryMutAct_9fa48("1121") ? false : (stryCov_9fa48("1121", "1122"), error.violation.oracle === oracleName)))));
          }
        }
        return stryMutAct_9fa48("1123") ? true : (stryCov_9fa48("1123"), false);
      }
    });
    return stryMutAct_9fa48("1124") ? {} : (stryCov_9fa48("1124"), {
      version: 1,
      config: history.config as RecordedKernelConfig<S>,
      trace: minimal.map(stryMutAct_9fa48("1125") ? () => undefined : (stryCov_9fa48("1125"), ({
        node,
        event
      }) => stryMutAct_9fa48("1126") ? {} : (stryCov_9fa48("1126"), {
        t: "event" as const,
        node,
        event
      }))),
      ...((stryMutAct_9fa48("1129") ? history.violation !== undefined : stryMutAct_9fa48("1128") ? false : stryMutAct_9fa48("1127") ? true : (stryCov_9fa48("1127", "1128", "1129"), history.violation === undefined)) ? {} : stryMutAct_9fa48("1130") ? {} : (stryCov_9fa48("1130"), {
        violation: history.violation
      }))
    });
  }
}