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
import type { Event, Intent } from "./types.js";
export type TraceEntry = {
  readonly t: "event";
  readonly node: string;
  readonly event: Event;
} | {
  readonly t: "intent";
  readonly node: string;
  readonly intent: Intent;
} | {
  readonly t: "advance";
  readonly at: number;
};
function bytesToHex(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("2093")) {
    {}
  } else {
    stryCov_9fa48("2093");
    let out = stryMutAct_9fa48("2094") ? "Stryker was here!" : (stryCov_9fa48("2094"), "");
    for (const b of bytes) {
      if (stryMutAct_9fa48("2095")) {
        {}
      } else {
        stryCov_9fa48("2095");
        stryMutAct_9fa48("2096") ? out -= b.toString(16).padStart(2, "0") : (stryCov_9fa48("2096"), out += b.toString(16).padStart(2, stryMutAct_9fa48("2097") ? "" : (stryCov_9fa48("2097"), "0")));
      }
    }
    return out;
  }
}

/**
 * SPEC-TRACE canonical JSON: object keys sorted by UTF-16 code units,
 * `Uint8Array` as {"$bytes":"<lowercase hex>"}, no whitespace, numbers in
 * ECMAScript Number::toString form. Non-finite numbers and non-JSON values
 * are rejected so every producer serializes byte-identically.
 */
export function canonicalJson(value: unknown): string {
  if (stryMutAct_9fa48("2098")) {
    {}
  } else {
    stryCov_9fa48("2098");
    if (stryMutAct_9fa48("2101") ? value !== null : stryMutAct_9fa48("2100") ? false : stryMutAct_9fa48("2099") ? true : (stryCov_9fa48("2099", "2100", "2101"), value === null)) return stryMutAct_9fa48("2102") ? "" : (stryCov_9fa48("2102"), "null");
    if (stryMutAct_9fa48("2105") ? typeof value !== "boolean" : stryMutAct_9fa48("2104") ? false : stryMutAct_9fa48("2103") ? true : (stryCov_9fa48("2103", "2104", "2105"), typeof value === (stryMutAct_9fa48("2106") ? "" : (stryCov_9fa48("2106"), "boolean")))) return value ? stryMutAct_9fa48("2107") ? "" : (stryCov_9fa48("2107"), "true") : stryMutAct_9fa48("2108") ? "" : (stryCov_9fa48("2108"), "false");
    if (stryMutAct_9fa48("2111") ? typeof value !== "number" : stryMutAct_9fa48("2110") ? false : stryMutAct_9fa48("2109") ? true : (stryCov_9fa48("2109", "2110", "2111"), typeof value === (stryMutAct_9fa48("2112") ? "" : (stryCov_9fa48("2112"), "number")))) {
      if (stryMutAct_9fa48("2113")) {
        {}
      } else {
        stryCov_9fa48("2113");
        if (stryMutAct_9fa48("2116") ? false : stryMutAct_9fa48("2115") ? true : stryMutAct_9fa48("2114") ? Number.isFinite(value) : (stryCov_9fa48("2114", "2115", "2116"), !Number.isFinite(value))) {
          if (stryMutAct_9fa48("2117")) {
            {}
          } else {
            stryCov_9fa48("2117");
            throw new Error(stryMutAct_9fa48("2118") ? `` : (stryCov_9fa48("2118"), `non-finite number is not canonicalizable: ${value}`));
          }
        }
        return JSON.stringify(value);
      }
    }
    if (stryMutAct_9fa48("2121") ? typeof value !== "string" : stryMutAct_9fa48("2120") ? false : stryMutAct_9fa48("2119") ? true : (stryCov_9fa48("2119", "2120", "2121"), typeof value === (stryMutAct_9fa48("2122") ? "" : (stryCov_9fa48("2122"), "string")))) return JSON.stringify(value);
    if (stryMutAct_9fa48("2124") ? false : stryMutAct_9fa48("2123") ? true : (stryCov_9fa48("2123", "2124"), value instanceof Uint8Array)) {
      if (stryMutAct_9fa48("2125")) {
        {}
      } else {
        stryCov_9fa48("2125");
        return stryMutAct_9fa48("2126") ? `` : (stryCov_9fa48("2126"), `{"$bytes":"${bytesToHex(value)}"}`);
      }
    }
    if (stryMutAct_9fa48("2128") ? false : stryMutAct_9fa48("2127") ? true : (stryCov_9fa48("2127", "2128"), Array.isArray(value))) {
      if (stryMutAct_9fa48("2129")) {
        {}
      } else {
        stryCov_9fa48("2129");
        return stryMutAct_9fa48("2130") ? `` : (stryCov_9fa48("2130"), `[${value.map(stryMutAct_9fa48("2131") ? () => undefined : (stryCov_9fa48("2131"), item => canonicalJson(stryMutAct_9fa48("2132") ? item && null : (stryCov_9fa48("2132"), item ?? null)))).join(stryMutAct_9fa48("2133") ? "" : (stryCov_9fa48("2133"), ","))}]`);
      }
    }
    if (stryMutAct_9fa48("2136") ? typeof value !== "object" : stryMutAct_9fa48("2135") ? false : stryMutAct_9fa48("2134") ? true : (stryCov_9fa48("2134", "2135", "2136"), typeof value === (stryMutAct_9fa48("2137") ? "" : (stryCov_9fa48("2137"), "object")))) {
      if (stryMutAct_9fa48("2138")) {
        {}
      } else {
        stryCov_9fa48("2138");
        const record = value as Record<string, unknown>;
        const parts: string[] = stryMutAct_9fa48("2139") ? ["Stryker was here"] : (stryCov_9fa48("2139"), []);
        for (const key of stryMutAct_9fa48("2140") ? Object.keys(record) : (stryCov_9fa48("2140"), Object.keys(record).sort())) {
          if (stryMutAct_9fa48("2141")) {
            {}
          } else {
            stryCov_9fa48("2141");
            const item = record[key];
            if (stryMutAct_9fa48("2144") ? item !== undefined : stryMutAct_9fa48("2143") ? false : stryMutAct_9fa48("2142") ? true : (stryCov_9fa48("2142", "2143", "2144"), item === undefined)) continue;
            parts.push(stryMutAct_9fa48("2145") ? `` : (stryCov_9fa48("2145"), `${JSON.stringify(key)}:${canonicalJson(item)}`));
          }
        }
        return stryMutAct_9fa48("2146") ? `` : (stryCov_9fa48("2146"), `{${parts.join(stryMutAct_9fa48("2147") ? "" : (stryCov_9fa48("2147"), ","))}}`);
      }
    }
    throw new Error(stryMutAct_9fa48("2148") ? `` : (stryCov_9fa48("2148"), `value of type ${typeof value} is not canonicalizable`));
  }
}

/** Canonical serialization of a trace (SPEC-TRACE) — the hash preimage. */
export function serializeTrace(entries: readonly TraceEntry[]): string {
  if (stryMutAct_9fa48("2149")) {
    {}
  } else {
    stryCov_9fa48("2149");
    return canonicalJson(entries);
  }
}

/** FNV-1a 64-bit over the UTF-16 code units of the canonical form, as 16 hex digits. */
export function hashTrace(entries: readonly TraceEntry[]): string {
  if (stryMutAct_9fa48("2150")) {
    {}
  } else {
    stryCov_9fa48("2150");
    const text = serializeTrace(entries);
    let h = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let i = 0; stryMutAct_9fa48("2153") ? i >= text.length : stryMutAct_9fa48("2152") ? i <= text.length : stryMutAct_9fa48("2151") ? false : (stryCov_9fa48("2151", "2152", "2153"), i < text.length); stryMutAct_9fa48("2154") ? i -= 1 : (stryCov_9fa48("2154"), i += 1)) {
      if (stryMutAct_9fa48("2155")) {
        {}
      } else {
        stryCov_9fa48("2155");
        h ^= BigInt(text.charCodeAt(i));
        h = (stryMutAct_9fa48("2156") ? h / prime : (stryCov_9fa48("2156"), h * prime)) & 0xffffffffffffffffn;
      }
    }
    return h.toString(16).padStart(16, stryMutAct_9fa48("2157") ? "" : (stryCov_9fa48("2157"), "0"));
  }
}