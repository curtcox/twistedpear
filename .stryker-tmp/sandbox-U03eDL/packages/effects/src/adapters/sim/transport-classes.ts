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
import type { DolevYaoPower, InstantMs, NodeId } from "../../types.js";
export type TransportClassName = "lan" | "internet" | "ble" | "lora" | "freenet";
export type LatencyDistribution = {
  readonly kind: "fixed";
  readonly ms: number;
} | {
  readonly kind: "uniform";
  readonly minMs: number;
  readonly maxMs: number;
};
export interface BurstLossModel {
  /** Probability of entering the bad state after a send in the good state. */
  readonly goodToBad: number;
  /** Probability of returning to the good state after a send in the bad state. */
  readonly badToGood: number;
  readonly goodLossRate: number;
  readonly badLossRate: number;
}
export interface PartitionWindow {
  readonly fromMs: InstantMs;
  readonly toMs: InstantMs;
}
export interface TransportClass {
  readonly name: TransportClassName;
  readonly bandwidthBps: number;
  readonly latency: LatencyDistribution;
  readonly lossRate: number;
  readonly burstLoss?: BurstLossModel;
  readonly partitions?: readonly PartitionWindow[];
  /** Fraction of elapsed airtime a link may occupy (notably LoRa). */
  readonly dutyCycle?: number;
  readonly dutyCyclePolicy?: "delay" | "drop";
}
export interface LinkConfig {
  readonly source: NodeId;
  readonly destination: NodeId;
  readonly class: TransportClassName;
  readonly params?: Partial<Omit<TransportClass, "name">>;
  readonly adversary?: NodeId;
  readonly powers?: readonly DolevYaoPower[];
}
const PRESETS: Readonly<Record<TransportClassName, TransportClass>> = stryMutAct_9fa48("1201") ? {} : (stryCov_9fa48("1201"), {
  lan: stryMutAct_9fa48("1202") ? {} : (stryCov_9fa48("1202"), {
    name: stryMutAct_9fa48("1203") ? "" : (stryCov_9fa48("1203"), "lan"),
    bandwidthBps: 100_000_000,
    latency: stryMutAct_9fa48("1204") ? {} : (stryCov_9fa48("1204"), {
      kind: stryMutAct_9fa48("1205") ? "" : (stryCov_9fa48("1205"), "uniform"),
      minMs: 0.2,
      maxMs: 2
    }),
    lossRate: 0.0001
  }),
  internet: stryMutAct_9fa48("1206") ? {} : (stryCov_9fa48("1206"), {
    name: stryMutAct_9fa48("1207") ? "" : (stryCov_9fa48("1207"), "internet"),
    bandwidthBps: 10_000_000,
    latency: stryMutAct_9fa48("1208") ? {} : (stryCov_9fa48("1208"), {
      kind: stryMutAct_9fa48("1209") ? "" : (stryCov_9fa48("1209"), "uniform"),
      minMs: 20,
      maxMs: 120
    }),
    lossRate: 0.005,
    burstLoss: stryMutAct_9fa48("1210") ? {} : (stryCov_9fa48("1210"), {
      goodToBad: 0.002,
      badToGood: 0.35,
      goodLossRate: 0.001,
      badLossRate: 0.5
    })
  }),
  ble: stryMutAct_9fa48("1211") ? {} : (stryCov_9fa48("1211"), {
    name: stryMutAct_9fa48("1212") ? "" : (stryCov_9fa48("1212"), "ble"),
    bandwidthBps: 125_000,
    latency: stryMutAct_9fa48("1213") ? {} : (stryCov_9fa48("1213"), {
      kind: stryMutAct_9fa48("1214") ? "" : (stryCov_9fa48("1214"), "uniform"),
      minMs: 7.5,
      maxMs: 40
    }),
    lossRate: 0.01,
    burstLoss: stryMutAct_9fa48("1215") ? {} : (stryCov_9fa48("1215"), {
      goodToBad: 0.01,
      badToGood: 0.25,
      goodLossRate: 0.005,
      badLossRate: 0.35
    })
  }),
  lora: stryMutAct_9fa48("1216") ? {} : (stryCov_9fa48("1216"), {
    name: stryMutAct_9fa48("1217") ? "" : (stryCov_9fa48("1217"), "lora"),
    bandwidthBps: 5_000,
    latency: stryMutAct_9fa48("1218") ? {} : (stryCov_9fa48("1218"), {
      kind: stryMutAct_9fa48("1219") ? "" : (stryCov_9fa48("1219"), "uniform"),
      minMs: 250,
      maxMs: 1_500
    }),
    lossRate: 0.03,
    burstLoss: stryMutAct_9fa48("1220") ? {} : (stryCov_9fa48("1220"), {
      goodToBad: 0.02,
      badToGood: 0.15,
      goodLossRate: 0.01,
      badLossRate: 0.55
    }),
    dutyCycle: 0.01,
    dutyCyclePolicy: stryMutAct_9fa48("1221") ? "" : (stryCov_9fa48("1221"), "delay")
  }),
  // S2 local 1 KiB p50/p95 update→notify and F2 policy bitrate (~90 kbps).
  freenet: stryMutAct_9fa48("1222") ? {} : (stryCov_9fa48("1222"), {
    name: stryMutAct_9fa48("1223") ? "" : (stryCov_9fa48("1223"), "freenet"),
    bandwidthBps: 90_000,
    latency: stryMutAct_9fa48("1224") ? {} : (stryCov_9fa48("1224"), {
      kind: stryMutAct_9fa48("1225") ? "" : (stryCov_9fa48("1225"), "uniform"),
      minMs: 63,
      maxMs: 89
    }),
    lossRate: 0.002,
    burstLoss: stryMutAct_9fa48("1226") ? {} : (stryCov_9fa48("1226"), {
      goodToBad: 0.004,
      badToGood: 0.4,
      goodLossRate: 0.001,
      badLossRate: 0.25
    })
  })
});
export function transportClass(name: TransportClassName, overrides: Partial<Omit<TransportClass, "name">> = {}): TransportClass {
  if (stryMutAct_9fa48("1227")) {
    {}
  } else {
    stryCov_9fa48("1227");
    return stryMutAct_9fa48("1228") ? {} : (stryCov_9fa48("1228"), {
      ...PRESETS[name],
      ...overrides,
      name
    });
  }
}
export function sampleLatency(distribution: LatencyDistribution, rng: () => number): number {
  if (stryMutAct_9fa48("1229")) {
    {}
  } else {
    stryCov_9fa48("1229");
    if (stryMutAct_9fa48("1232") ? distribution.kind !== "fixed" : stryMutAct_9fa48("1231") ? false : stryMutAct_9fa48("1230") ? true : (stryCov_9fa48("1230", "1231", "1232"), distribution.kind === (stryMutAct_9fa48("1233") ? "" : (stryCov_9fa48("1233"), "fixed")))) {
      if (stryMutAct_9fa48("1234")) {
        {}
      } else {
        stryCov_9fa48("1234");
        return stryMutAct_9fa48("1235") ? Math.min(0, distribution.ms) : (stryCov_9fa48("1235"), Math.max(0, distribution.ms));
      }
    }
    const min = stryMutAct_9fa48("1236") ? Math.min(0, Math.min(distribution.minMs, distribution.maxMs)) : (stryCov_9fa48("1236"), Math.max(0, stryMutAct_9fa48("1237") ? Math.max(distribution.minMs, distribution.maxMs) : (stryCov_9fa48("1237"), Math.min(distribution.minMs, distribution.maxMs))));
    const max = stryMutAct_9fa48("1238") ? Math.min(min, Math.max(distribution.minMs, distribution.maxMs)) : (stryCov_9fa48("1238"), Math.max(min, stryMutAct_9fa48("1239") ? Math.min(distribution.minMs, distribution.maxMs) : (stryCov_9fa48("1239"), Math.max(distribution.minMs, distribution.maxMs))));
    return stryMutAct_9fa48("1240") ? min - (max - min) * rng() : (stryCov_9fa48("1240"), min + (stryMutAct_9fa48("1241") ? (max - min) / rng() : (stryCov_9fa48("1241"), (stryMutAct_9fa48("1242") ? max + min : (stryCov_9fa48("1242"), max - min)) * rng())));
  }
}