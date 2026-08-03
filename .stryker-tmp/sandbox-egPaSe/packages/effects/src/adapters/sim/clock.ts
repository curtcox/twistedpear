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
import type { Clock, InstantMs } from "../../types.js";

/** Virtual clock owned by the simulator; protocol code only reads `now()`. */
export class SimClock implements Clock {
  private instant: InstantMs;
  constructor(startMs: InstantMs = 0) {
    if (stryMutAct_9fa48("338")) {
      {}
    } else {
      stryCov_9fa48("338");
      this.instant = startMs;
    }
  }
  now(): InstantMs {
    if (stryMutAct_9fa48("339")) {
      {}
    } else {
      stryCov_9fa48("339");
      return this.instant;
    }
  }

  /** Advance to an absolute instant. Must be monotonic. */
  set(at: InstantMs): void {
    if (stryMutAct_9fa48("340")) {
      {}
    } else {
      stryCov_9fa48("340");
      if (stryMutAct_9fa48("344") ? at >= this.instant : stryMutAct_9fa48("343") ? at <= this.instant : stryMutAct_9fa48("342") ? false : stryMutAct_9fa48("341") ? true : (stryCov_9fa48("341", "342", "343", "344"), at < this.instant)) {
        if (stryMutAct_9fa48("345")) {
          {}
        } else {
          stryCov_9fa48("345");
          throw new Error(stryMutAct_9fa48("346") ? `` : (stryCov_9fa48("346"), `SimClock cannot go backwards: ${at} < ${this.instant}`));
        }
      }
      this.instant = at;
    }
  }
  advance(deltaMs: number): InstantMs {
    if (stryMutAct_9fa48("347")) {
      {}
    } else {
      stryCov_9fa48("347");
      if (stryMutAct_9fa48("351") ? deltaMs >= 0 : stryMutAct_9fa48("350") ? deltaMs <= 0 : stryMutAct_9fa48("349") ? false : stryMutAct_9fa48("348") ? true : (stryCov_9fa48("348", "349", "350", "351"), deltaMs < 0)) {
        if (stryMutAct_9fa48("352")) {
          {}
        } else {
          stryCov_9fa48("352");
          throw new Error(stryMutAct_9fa48("353") ? "" : (stryCov_9fa48("353"), "SimClock.advance requires non-negative delta"));
        }
      }
      stryMutAct_9fa48("354") ? this.instant -= deltaMs : (stryCov_9fa48("354"), this.instant += deltaMs);
      return this.instant;
    }
  }
}