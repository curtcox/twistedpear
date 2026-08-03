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
export type LxmfModerationDisposition = "allow" | "mute" | "block";
export interface LxmfModerationState {
  readonly blocked: ReadonlySet<string>;
  readonly muted: ReadonlySet<string>;
}
export interface LxmfModerationDecision {
  readonly disposition: LxmfModerationDisposition;
  readonly deliver: boolean;
  readonly notify: boolean;
}
export function decideLxmfModeration(state: LxmfModerationState, sourceHashHex: string): LxmfModerationDecision {
  if (stryMutAct_9fa48("21386")) {
    {}
  } else {
    stryCov_9fa48("21386");
    const normalized = stryMutAct_9fa48("21387") ? sourceHashHex.toUpperCase() : (stryCov_9fa48("21387"), sourceHashHex.toLowerCase());
    if (stryMutAct_9fa48("21389") ? false : stryMutAct_9fa48("21388") ? true : (stryCov_9fa48("21388", "21389"), state.blocked.has(normalized))) return stryMutAct_9fa48("21390") ? {} : (stryCov_9fa48("21390"), {
      disposition: stryMutAct_9fa48("21391") ? "" : (stryCov_9fa48("21391"), "block"),
      deliver: stryMutAct_9fa48("21392") ? true : (stryCov_9fa48("21392"), false),
      notify: stryMutAct_9fa48("21393") ? true : (stryCov_9fa48("21393"), false)
    });
    if (stryMutAct_9fa48("21395") ? false : stryMutAct_9fa48("21394") ? true : (stryCov_9fa48("21394", "21395"), state.muted.has(normalized))) return stryMutAct_9fa48("21396") ? {} : (stryCov_9fa48("21396"), {
      disposition: stryMutAct_9fa48("21397") ? "" : (stryCov_9fa48("21397"), "mute"),
      deliver: stryMutAct_9fa48("21398") ? false : (stryCov_9fa48("21398"), true),
      notify: stryMutAct_9fa48("21399") ? true : (stryCov_9fa48("21399"), false)
    });
    return stryMutAct_9fa48("21400") ? {} : (stryCov_9fa48("21400"), {
      disposition: stryMutAct_9fa48("21401") ? "" : (stryCov_9fa48("21401"), "allow"),
      deliver: stryMutAct_9fa48("21402") ? false : (stryCov_9fa48("21402"), true),
      notify: stryMutAct_9fa48("21403") ? false : (stryCov_9fa48("21403"), true)
    });
  }
}