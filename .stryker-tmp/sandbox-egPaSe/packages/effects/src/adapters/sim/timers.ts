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
import type { InstantMs, Intent, TimerId } from "../../types.js";
import type { SimClock } from "./clock.js";
interface PendingTimer {
  readonly id: TimerId;
  readonly fireAt: InstantMs;
}

/**
 * Timer table driven by declared intents. Expiry is delivered as events by the
 * sim kernel — never via setTimeout.
 */
export class SimTimers {
  private readonly pending = new Map<TimerId, PendingTimer>();
  constructor(private readonly clock: SimClock) {}
  applyIntent(intent: Intent): void {
    if (stryMutAct_9fa48("1168")) {
      {}
    } else {
      stryCov_9fa48("1168");
      if (stryMutAct_9fa48("1171") ? intent.kind !== "timer/set" : stryMutAct_9fa48("1170") ? false : stryMutAct_9fa48("1169") ? true : (stryCov_9fa48("1169", "1170", "1171"), intent.kind === (stryMutAct_9fa48("1172") ? "" : (stryCov_9fa48("1172"), "timer/set")))) {
        if (stryMutAct_9fa48("1173")) {
          {}
        } else {
          stryCov_9fa48("1173");
          this.pending.set(intent.timer.id, stryMutAct_9fa48("1174") ? {} : (stryCov_9fa48("1174"), {
            id: intent.timer.id,
            fireAt: stryMutAct_9fa48("1175") ? this.clock.now() - intent.timer.delayMs : (stryCov_9fa48("1175"), this.clock.now() + intent.timer.delayMs)
          }));
          return;
        }
      }
      if (stryMutAct_9fa48("1178") ? intent.kind !== "timer/cancel" : stryMutAct_9fa48("1177") ? false : stryMutAct_9fa48("1176") ? true : (stryCov_9fa48("1176", "1177", "1178"), intent.kind === (stryMutAct_9fa48("1179") ? "" : (stryCov_9fa48("1179"), "timer/cancel")))) {
        if (stryMutAct_9fa48("1180")) {
          {}
        } else {
          stryCov_9fa48("1180");
          this.pending.delete(intent.timer.id);
        }
      }
    }
  }

  /** Next fire time, or undefined if idle. */
  nextFireAt(): InstantMs | undefined {
    if (stryMutAct_9fa48("1181")) {
      {}
    } else {
      stryCov_9fa48("1181");
      let soonest: InstantMs | undefined;
      for (const timer of this.pending.values()) {
        if (stryMutAct_9fa48("1182")) {
          {}
        } else {
          stryCov_9fa48("1182");
          if (stryMutAct_9fa48("1185") ? soonest === undefined && timer.fireAt < soonest : stryMutAct_9fa48("1184") ? false : stryMutAct_9fa48("1183") ? true : (stryCov_9fa48("1183", "1184", "1185"), (stryMutAct_9fa48("1187") ? soonest !== undefined : stryMutAct_9fa48("1186") ? false : (stryCov_9fa48("1186", "1187"), soonest === undefined)) || (stryMutAct_9fa48("1190") ? timer.fireAt >= soonest : stryMutAct_9fa48("1189") ? timer.fireAt <= soonest : stryMutAct_9fa48("1188") ? false : (stryCov_9fa48("1188", "1189", "1190"), timer.fireAt < soonest)))) {
            if (stryMutAct_9fa48("1191")) {
              {}
            } else {
              stryCov_9fa48("1191");
              soonest = timer.fireAt;
            }
          }
        }
      }
      return soonest;
    }
  }

  /** Timers due at or before `at`, removed from the pending set. */
  dueAt(at: InstantMs): TimerId[] {
    if (stryMutAct_9fa48("1192")) {
      {}
    } else {
      stryCov_9fa48("1192");
      const due: TimerId[] = stryMutAct_9fa48("1193") ? ["Stryker was here"] : (stryCov_9fa48("1193"), []);
      for (const [id, timer] of this.pending) {
        if (stryMutAct_9fa48("1194")) {
          {}
        } else {
          stryCov_9fa48("1194");
          if (stryMutAct_9fa48("1198") ? timer.fireAt > at : stryMutAct_9fa48("1197") ? timer.fireAt < at : stryMutAct_9fa48("1196") ? false : stryMutAct_9fa48("1195") ? true : (stryCov_9fa48("1195", "1196", "1197", "1198"), timer.fireAt <= at)) {
            if (stryMutAct_9fa48("1199")) {
              {}
            } else {
              stryCov_9fa48("1199");
              due.push(id);
              this.pending.delete(id);
            }
          }
        }
      }
      stryMutAct_9fa48("1200") ? due : (stryCov_9fa48("1200"), due.sort());
      return due;
    }
  }
}