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
export class SansIOViolation extends Error {
  readonly api: string;
  constructor(api: string, message?: string) {
    if (stryMutAct_9fa48("2158")) {
      {}
    } else {
      stryCov_9fa48("2158");
      super(stryMutAct_9fa48("2159") ? message && `Sans-IO violation: protocol code must not call ${api}` : (stryCov_9fa48("2159"), message ?? (stryMutAct_9fa48("2160") ? `` : (stryCov_9fa48("2160"), `Sans-IO violation: protocol code must not call ${api}`))));
      this.name = stryMutAct_9fa48("2161") ? "" : (stryCov_9fa48("2161"), "SansIOViolation");
      this.api = api;
    }
  }
}
type AnyFn = (...args: never[]) => unknown;
interface TripwireState {
  readonly originals: Map<string, unknown>;
}
const TRIPWIRE_KEY = stryMutAct_9fa48("2162") ? "" : (stryCov_9fa48("2162"), "__twistedpear_sansio_tripwire__");
function thrower(api: string): AnyFn {
  if (stryMutAct_9fa48("2163")) {
    {}
  } else {
    stryCov_9fa48("2163");
    return () => {
      if (stryMutAct_9fa48("2164")) {
        {}
      } else {
        stryCov_9fa48("2164");
        throw new SansIOViolation(api);
      }
    };
  }
}
function defineGlobal(name: string, value: unknown): void {
  if (stryMutAct_9fa48("2165")) {
    {}
  } else {
    stryCov_9fa48("2165");
    Object.defineProperty(globalThis, name, stryMutAct_9fa48("2166") ? {} : (stryCov_9fa48("2166"), {
      configurable: stryMutAct_9fa48("2167") ? false : (stryCov_9fa48("2167"), true),
      writable: stryMutAct_9fa48("2168") ? false : (stryCov_9fa48("2168"), true),
      enumerable: stryMutAct_9fa48("2169") ? false : (stryCov_9fa48("2169"), true),
      value
    }));
  }
}
function getState(): TripwireState | undefined {
  if (stryMutAct_9fa48("2170")) {
    {}
  } else {
    stryCov_9fa48("2170");
    return (globalThis as Record<string, unknown>)[TRIPWIRE_KEY] as TripwireState | undefined;
  }
}

/**
 * Replace deny-listed globals with throwers before importing protocol modules.
 * Catches dynamic access that static analysis misses.
 */
export function installTripwire(): void {
  if (stryMutAct_9fa48("2171")) {
    {}
  } else {
    stryCov_9fa48("2171");
    if (stryMutAct_9fa48("2174") ? getState() === undefined : stryMutAct_9fa48("2173") ? false : stryMutAct_9fa48("2172") ? true : (stryCov_9fa48("2172", "2173", "2174"), getState() !== undefined)) {
      if (stryMutAct_9fa48("2175")) {
        {}
      } else {
        stryCov_9fa48("2175");
        return;
      }
    }
    const originals = new Map<string, unknown>();
    const g = globalThis as Record<string, unknown>;
    const save = (key: string): void => {
      if (stryMutAct_9fa48("2176")) {
        {}
      } else {
        stryCov_9fa48("2176");
        originals.set(key, g[key]);
      }
    };
    save(stryMutAct_9fa48("2177") ? "" : (stryCov_9fa48("2177"), "Date"));
    save(stryMutAct_9fa48("2178") ? "" : (stryCov_9fa48("2178"), "setTimeout"));
    save(stryMutAct_9fa48("2179") ? "" : (stryCov_9fa48("2179"), "setInterval"));
    save(stryMutAct_9fa48("2180") ? "" : (stryCov_9fa48("2180"), "setImmediate"));
    save(stryMutAct_9fa48("2181") ? "" : (stryCov_9fa48("2181"), "clearTimeout"));
    save(stryMutAct_9fa48("2182") ? "" : (stryCov_9fa48("2182"), "clearInterval"));
    save(stryMutAct_9fa48("2183") ? "" : (stryCov_9fa48("2183"), "queueMicrotask"));
    save(stryMutAct_9fa48("2184") ? "" : (stryCov_9fa48("2184"), "fetch"));
    save(stryMutAct_9fa48("2185") ? "" : (stryCov_9fa48("2185"), "performance"));
    const OriginalDate = Date;
    const PatchedDate = function PatchedDate(...args: unknown[]) {
      if (args.length === 0) {
        throw new SansIOViolation("new Date()", "new Date() without arguments reads wall clock");
      }
      return new (OriginalDate as unknown as new (...a: unknown[]) => Date)(...args);
    } as unknown as DateConstructor;
    PatchedDate.now = () => {
      if (stryMutAct_9fa48("2186")) {
        {}
      } else {
        stryCov_9fa48("2186");
        throw new SansIOViolation(stryMutAct_9fa48("2187") ? "" : (stryCov_9fa48("2187"), "Date.now"));
      }
    };
    PatchedDate.parse = OriginalDate.parse.bind(OriginalDate);
    PatchedDate.UTC = OriginalDate.UTC.bind(OriginalDate);
    Object.setPrototypeOf(PatchedDate, OriginalDate);
    Object.defineProperty(PatchedDate, stryMutAct_9fa48("2188") ? "" : (stryCov_9fa48("2188"), "prototype"), stryMutAct_9fa48("2189") ? {} : (stryCov_9fa48("2189"), {
      value: OriginalDate.prototype,
      writable: stryMutAct_9fa48("2190") ? true : (stryCov_9fa48("2190"), false),
      configurable: stryMutAct_9fa48("2191") ? true : (stryCov_9fa48("2191"), false)
    }));
    Object.defineProperty(PatchedDate, stryMutAct_9fa48("2192") ? "" : (stryCov_9fa48("2192"), "name"), stryMutAct_9fa48("2193") ? {} : (stryCov_9fa48("2193"), {
      value: stryMutAct_9fa48("2194") ? "" : (stryCov_9fa48("2194"), "Date")
    }));
    defineGlobal(stryMutAct_9fa48("2195") ? "" : (stryCov_9fa48("2195"), "Date"), PatchedDate);
    const math = Math as unknown as Record<string, unknown>;
    originals.set(stryMutAct_9fa48("2196") ? "" : (stryCov_9fa48("2196"), "Math.random"), math.random);
    math.random = thrower(stryMutAct_9fa48("2197") ? "" : (stryCov_9fa48("2197"), "Math.random"));
    defineGlobal(stryMutAct_9fa48("2198") ? "" : (stryCov_9fa48("2198"), "setTimeout"), thrower(stryMutAct_9fa48("2199") ? "" : (stryCov_9fa48("2199"), "setTimeout")));
    defineGlobal(stryMutAct_9fa48("2200") ? "" : (stryCov_9fa48("2200"), "setInterval"), thrower(stryMutAct_9fa48("2201") ? "" : (stryCov_9fa48("2201"), "setInterval")));
    if (stryMutAct_9fa48("2203") ? false : stryMutAct_9fa48("2202") ? true : (stryCov_9fa48("2202", "2203"), (stryMutAct_9fa48("2204") ? "" : (stryCov_9fa48("2204"), "setImmediate")) in globalThis)) {
      if (stryMutAct_9fa48("2205")) {
        {}
      } else {
        stryCov_9fa48("2205");
        defineGlobal(stryMutAct_9fa48("2206") ? "" : (stryCov_9fa48("2206"), "setImmediate"), thrower(stryMutAct_9fa48("2207") ? "" : (stryCov_9fa48("2207"), "setImmediate")));
      }
    }
    defineGlobal(stryMutAct_9fa48("2208") ? "" : (stryCov_9fa48("2208"), "clearTimeout"), thrower(stryMutAct_9fa48("2209") ? "" : (stryCov_9fa48("2209"), "clearTimeout")));
    defineGlobal(stryMutAct_9fa48("2210") ? "" : (stryCov_9fa48("2210"), "clearInterval"), thrower(stryMutAct_9fa48("2211") ? "" : (stryCov_9fa48("2211"), "clearInterval")));
    defineGlobal(stryMutAct_9fa48("2212") ? "" : (stryCov_9fa48("2212"), "queueMicrotask"), thrower(stryMutAct_9fa48("2213") ? "" : (stryCov_9fa48("2213"), "queueMicrotask")));
    if (stryMutAct_9fa48("2215") ? false : stryMutAct_9fa48("2214") ? true : (stryCov_9fa48("2214", "2215"), (stryMutAct_9fa48("2216") ? "" : (stryCov_9fa48("2216"), "fetch")) in globalThis)) {
      if (stryMutAct_9fa48("2217")) {
        {}
      } else {
        stryCov_9fa48("2217");
        defineGlobal(stryMutAct_9fa48("2218") ? "" : (stryCov_9fa48("2218"), "fetch"), thrower(stryMutAct_9fa48("2219") ? "" : (stryCov_9fa48("2219"), "fetch")));
      }
    }
    const perf = g["performance"] as Record<string, unknown> | undefined;
    if (stryMutAct_9fa48("2222") ? perf !== undefined || typeof perf["now"] === "function" : stryMutAct_9fa48("2221") ? false : stryMutAct_9fa48("2220") ? true : (stryCov_9fa48("2220", "2221", "2222"), (stryMutAct_9fa48("2224") ? perf === undefined : stryMutAct_9fa48("2223") ? true : (stryCov_9fa48("2223", "2224"), perf !== undefined)) && (stryMutAct_9fa48("2226") ? typeof perf["now"] !== "function" : stryMutAct_9fa48("2225") ? true : (stryCov_9fa48("2225", "2226"), typeof perf[stryMutAct_9fa48("2227") ? "" : (stryCov_9fa48("2227"), "now")] === (stryMutAct_9fa48("2228") ? "" : (stryCov_9fa48("2228"), "function")))))) {
      if (stryMutAct_9fa48("2229")) {
        {}
      } else {
        stryCov_9fa48("2229");
        originals.set(stryMutAct_9fa48("2230") ? "" : (stryCov_9fa48("2230"), "performance.now"), perf[stryMutAct_9fa48("2231") ? "" : (stryCov_9fa48("2231"), "now")]);
        perf[stryMutAct_9fa48("2232") ? "" : (stryCov_9fa48("2232"), "now")] = thrower(stryMutAct_9fa48("2233") ? "" : (stryCov_9fa48("2233"), "performance.now"));
      }
    }
    const c = g["crypto"] as Record<string, unknown> | undefined;
    if (stryMutAct_9fa48("2236") ? c === undefined : stryMutAct_9fa48("2235") ? false : stryMutAct_9fa48("2234") ? true : (stryCov_9fa48("2234", "2235", "2236"), c !== undefined)) {
      if (stryMutAct_9fa48("2237")) {
        {}
      } else {
        stryCov_9fa48("2237");
        if (stryMutAct_9fa48("2240") ? typeof c["getRandomValues"] !== "function" : stryMutAct_9fa48("2239") ? false : stryMutAct_9fa48("2238") ? true : (stryCov_9fa48("2238", "2239", "2240"), typeof c[stryMutAct_9fa48("2241") ? "" : (stryCov_9fa48("2241"), "getRandomValues")] === (stryMutAct_9fa48("2242") ? "" : (stryCov_9fa48("2242"), "function")))) {
          if (stryMutAct_9fa48("2243")) {
            {}
          } else {
            stryCov_9fa48("2243");
            originals.set(stryMutAct_9fa48("2244") ? "" : (stryCov_9fa48("2244"), "crypto.getRandomValues"), c[stryMutAct_9fa48("2245") ? "" : (stryCov_9fa48("2245"), "getRandomValues")]);
            c[stryMutAct_9fa48("2246") ? "" : (stryCov_9fa48("2246"), "getRandomValues")] = thrower(stryMutAct_9fa48("2247") ? "" : (stryCov_9fa48("2247"), "crypto.getRandomValues"));
          }
        }
        if (stryMutAct_9fa48("2250") ? typeof c["randomUUID"] !== "function" : stryMutAct_9fa48("2249") ? false : stryMutAct_9fa48("2248") ? true : (stryCov_9fa48("2248", "2249", "2250"), typeof c[stryMutAct_9fa48("2251") ? "" : (stryCov_9fa48("2251"), "randomUUID")] === (stryMutAct_9fa48("2252") ? "" : (stryCov_9fa48("2252"), "function")))) {
          if (stryMutAct_9fa48("2253")) {
            {}
          } else {
            stryCov_9fa48("2253");
            originals.set(stryMutAct_9fa48("2254") ? "" : (stryCov_9fa48("2254"), "crypto.randomUUID"), c[stryMutAct_9fa48("2255") ? "" : (stryCov_9fa48("2255"), "randomUUID")]);
            c[stryMutAct_9fa48("2256") ? "" : (stryCov_9fa48("2256"), "randomUUID")] = thrower(stryMutAct_9fa48("2257") ? "" : (stryCov_9fa48("2257"), "crypto.randomUUID"));
          }
        }
      }
    }
    (globalThis as Record<string, unknown>)[TRIPWIRE_KEY] = (stryMutAct_9fa48("2258") ? {} : (stryCov_9fa48("2258"), {
      originals
    })) satisfies TripwireState;
  }
}
export function uninstallTripwire(): void {
  if (stryMutAct_9fa48("2259")) {
    {}
  } else {
    stryCov_9fa48("2259");
    const state = getState();
    if (stryMutAct_9fa48("2262") ? state !== undefined : stryMutAct_9fa48("2261") ? false : stryMutAct_9fa48("2260") ? true : (stryCov_9fa48("2260", "2261", "2262"), state === undefined)) {
      if (stryMutAct_9fa48("2263")) {
        {}
      } else {
        stryCov_9fa48("2263");
        return;
      }
    }
    const g = globalThis as Record<string, unknown>;
    for (const [key, value] of state.originals) {
      if (stryMutAct_9fa48("2264")) {
        {}
      } else {
        stryCov_9fa48("2264");
        if (stryMutAct_9fa48("2267") ? key !== "Math.random" : stryMutAct_9fa48("2266") ? false : stryMutAct_9fa48("2265") ? true : (stryCov_9fa48("2265", "2266", "2267"), key === (stryMutAct_9fa48("2268") ? "" : (stryCov_9fa48("2268"), "Math.random")))) {
          if (stryMutAct_9fa48("2269")) {
            {}
          } else {
            stryCov_9fa48("2269");
            (Math as unknown as Record<string, unknown>).random = value;
            continue;
          }
        }
        if (stryMutAct_9fa48("2272") ? key !== "performance.now" : stryMutAct_9fa48("2271") ? false : stryMutAct_9fa48("2270") ? true : (stryCov_9fa48("2270", "2271", "2272"), key === (stryMutAct_9fa48("2273") ? "" : (stryCov_9fa48("2273"), "performance.now")))) {
          if (stryMutAct_9fa48("2274")) {
            {}
          } else {
            stryCov_9fa48("2274");
            const perf = g["performance"] as Record<string, unknown> | undefined;
            if (stryMutAct_9fa48("2277") ? perf === undefined : stryMutAct_9fa48("2276") ? false : stryMutAct_9fa48("2275") ? true : (stryCov_9fa48("2275", "2276", "2277"), perf !== undefined)) {
              if (stryMutAct_9fa48("2278")) {
                {}
              } else {
                stryCov_9fa48("2278");
                perf[stryMutAct_9fa48("2279") ? "" : (stryCov_9fa48("2279"), "now")] = value;
              }
            }
            continue;
          }
        }
        if (stryMutAct_9fa48("2282") ? key === "crypto.getRandomValues" && key === "crypto.randomUUID" : stryMutAct_9fa48("2281") ? false : stryMutAct_9fa48("2280") ? true : (stryCov_9fa48("2280", "2281", "2282"), (stryMutAct_9fa48("2284") ? key !== "crypto.getRandomValues" : stryMutAct_9fa48("2283") ? false : (stryCov_9fa48("2283", "2284"), key === (stryMutAct_9fa48("2285") ? "" : (stryCov_9fa48("2285"), "crypto.getRandomValues")))) || (stryMutAct_9fa48("2287") ? key !== "crypto.randomUUID" : stryMutAct_9fa48("2286") ? false : (stryCov_9fa48("2286", "2287"), key === (stryMutAct_9fa48("2288") ? "" : (stryCov_9fa48("2288"), "crypto.randomUUID")))))) {
          if (stryMutAct_9fa48("2289")) {
            {}
          } else {
            stryCov_9fa48("2289");
            const c = g["crypto"] as Record<string, unknown> | undefined;
            if (stryMutAct_9fa48("2292") ? c === undefined : stryMutAct_9fa48("2291") ? false : stryMutAct_9fa48("2290") ? true : (stryCov_9fa48("2290", "2291", "2292"), c !== undefined)) {
              if (stryMutAct_9fa48("2293")) {
                {}
              } else {
                stryCov_9fa48("2293");
                c[(stryMutAct_9fa48("2296") ? key !== "crypto.getRandomValues" : stryMutAct_9fa48("2295") ? false : stryMutAct_9fa48("2294") ? true : (stryCov_9fa48("2294", "2295", "2296"), key === (stryMutAct_9fa48("2297") ? "" : (stryCov_9fa48("2297"), "crypto.getRandomValues")))) ? stryMutAct_9fa48("2298") ? "" : (stryCov_9fa48("2298"), "getRandomValues") : stryMutAct_9fa48("2299") ? "" : (stryCov_9fa48("2299"), "randomUUID")] = value;
              }
            }
            continue;
          }
        }
        defineGlobal(key, value);
      }
    }
    delete g[TRIPWIRE_KEY];
  }
}
export function isTripwireInstalled(): boolean {
  if (stryMutAct_9fa48("2300")) {
    {}
  } else {
    stryCov_9fa48("2300");
    return stryMutAct_9fa48("2303") ? getState() === undefined : stryMutAct_9fa48("2302") ? false : stryMutAct_9fa48("2301") ? true : (stryCov_9fa48("2301", "2302", "2303"), getState() !== undefined);
  }
}