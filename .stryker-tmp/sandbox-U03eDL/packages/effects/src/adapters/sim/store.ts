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
import type { Intent } from "../../types.js";
export interface StoreResult {
  readonly intents: Intent[];
  readonly events: Array<{
    readonly kind: "store/value";
    readonly key: string;
    readonly value: Uint8Array | undefined;
  } | {
    readonly kind: "store/done";
    readonly key: string;
    readonly op: "write" | "delete";
  }>;
}

/** Synchronous in-memory KV. Store intents resolve to events in the same step. */
export class SimStore {
  private readonly data = new Map<string, Uint8Array>();
  applyIntent(intent: Intent): StoreResult["events"] {
    if (stryMutAct_9fa48("1131")) {
      {}
    } else {
      stryCov_9fa48("1131");
      if (stryMutAct_9fa48("1134") ? intent.kind !== "store/read" : stryMutAct_9fa48("1133") ? false : stryMutAct_9fa48("1132") ? true : (stryCov_9fa48("1132", "1133", "1134"), intent.kind === (stryMutAct_9fa48("1135") ? "" : (stryCov_9fa48("1135"), "store/read")))) {
        if (stryMutAct_9fa48("1136")) {
          {}
        } else {
          stryCov_9fa48("1136");
          const value = this.data.get(intent.read.key);
          return stryMutAct_9fa48("1137") ? [] : (stryCov_9fa48("1137"), [stryMutAct_9fa48("1138") ? {} : (stryCov_9fa48("1138"), {
            kind: stryMutAct_9fa48("1139") ? "" : (stryCov_9fa48("1139"), "store/value"),
            key: intent.read.key,
            value: stryMutAct_9fa48("1141") ? value.slice() : stryMutAct_9fa48("1140") ? value : (stryCov_9fa48("1140", "1141"), value?.slice())
          })]);
        }
      }
      if (stryMutAct_9fa48("1144") ? intent.kind !== "store/write" : stryMutAct_9fa48("1143") ? false : stryMutAct_9fa48("1142") ? true : (stryCov_9fa48("1142", "1143", "1144"), intent.kind === (stryMutAct_9fa48("1145") ? "" : (stryCov_9fa48("1145"), "store/write")))) {
        if (stryMutAct_9fa48("1146")) {
          {}
        } else {
          stryCov_9fa48("1146");
          this.data.set(intent.write.key, stryMutAct_9fa48("1147") ? intent.write.value : (stryCov_9fa48("1147"), intent.write.value.slice()));
          return stryMutAct_9fa48("1148") ? [] : (stryCov_9fa48("1148"), [stryMutAct_9fa48("1149") ? {} : (stryCov_9fa48("1149"), {
            kind: stryMutAct_9fa48("1150") ? "" : (stryCov_9fa48("1150"), "store/done"),
            key: intent.write.key,
            op: stryMutAct_9fa48("1151") ? "" : (stryCov_9fa48("1151"), "write")
          })]);
        }
      }
      if (stryMutAct_9fa48("1154") ? intent.kind !== "store/delete" : stryMutAct_9fa48("1153") ? false : stryMutAct_9fa48("1152") ? true : (stryCov_9fa48("1152", "1153", "1154"), intent.kind === (stryMutAct_9fa48("1155") ? "" : (stryCov_9fa48("1155"), "store/delete")))) {
        if (stryMutAct_9fa48("1156")) {
          {}
        } else {
          stryCov_9fa48("1156");
          this.data.delete(intent.del.key);
          return stryMutAct_9fa48("1157") ? [] : (stryCov_9fa48("1157"), [stryMutAct_9fa48("1158") ? {} : (stryCov_9fa48("1158"), {
            kind: stryMutAct_9fa48("1159") ? "" : (stryCov_9fa48("1159"), "store/done"),
            key: intent.del.key,
            op: stryMutAct_9fa48("1160") ? "" : (stryCov_9fa48("1160"), "delete")
          })]);
        }
      }
      return stryMutAct_9fa48("1161") ? ["Stryker was here"] : (stryCov_9fa48("1161"), []);
    }
  }
  get(key: string): Uint8Array | undefined {
    if (stryMutAct_9fa48("1162")) {
      {}
    } else {
      stryCov_9fa48("1162");
      const value = this.data.get(key);
      return stryMutAct_9fa48("1164") ? value.slice() : stryMutAct_9fa48("1163") ? value : (stryCov_9fa48("1163", "1164"), value?.slice());
    }
  }
  snapshot(): Map<string, Uint8Array> {
    if (stryMutAct_9fa48("1165")) {
      {}
    } else {
      stryCov_9fa48("1165");
      const out = new Map<string, Uint8Array>();
      for (const [k, v] of this.data) {
        if (stryMutAct_9fa48("1166")) {
          {}
        } else {
          stryCov_9fa48("1166");
          out.set(k, stryMutAct_9fa48("1167") ? v : (stryCov_9fa48("1167"), v.slice()));
        }
      }
      return out;
    }
  }
}