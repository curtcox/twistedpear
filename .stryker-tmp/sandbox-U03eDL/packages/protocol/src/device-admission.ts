/**
 * Sans-IO device stream admission and degradation.
 * Measurements in → decision out; no clocks or sockets.
 */
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
import { DEVICE_CLASS_REGISTRY, deviceClassById, type DeviceBandwidthProfile, type DeviceClassEntry } from "./device-registry.gen.js";
export type StreamPlane = "webrtc" | "pears-bulk" | "reticulum" | "lxmf" | "cas";
export type AdmissionDecisionKind = "accept" | "degrade" | "defer" | "reject";
export interface StreamDemand {
  readonly classId: string;
  readonly tierId: string;
  readonly encoding?: string;
  readonly codec?: "vp8" | "vp9" | "h264" | "opus" | "pcm" | "jpeg";
  readonly rateHz?: number;
}
export interface LinkSupply {
  readonly plane: StreamPlane;
  readonly effectiveBps: number;
  /** Uncommitted host limiter headroom (default budget 524288 B/s). */
  readonly headroomBps: number;
  readonly measuredGoodputBps?: number;
  readonly queueDepthBytes?: number;
  readonly metered?: boolean;
  readonly lowBattery?: boolean;
}
export interface AdmissionDecision {
  readonly kind: AdmissionDecisionKind;
  readonly plane: StreamPlane;
  readonly rung: string;
  readonly rungIndex: number;
  readonly demandBps: number;
  /** Estimated demand at the selected degradation rung. */
  readonly admittedDemandBps: number;
  readonly supplyBps: number;
  readonly reason: string;
}
export interface AdaptationInput {
  readonly previous: AdmissionDecision;
  readonly supply: LinkSupply;
  readonly ladder: ReadonlyArray<string>;
  /** Sustained deficit samples before downshift. */
  readonly deficitStreak?: number;
  /** Good windows before upshift (hysteresis). */
  readonly surplusStreak?: number;
}
const DEFAULT_HOST_LIMIT_BPS = 524_288;
const DOWNSHIFT_AFTER = 2;
const UPSHIFT_AFTER = 4;
const PLANE_ORDER: ReadonlyArray<StreamPlane> = stryMutAct_9fa48("7188") ? [] : (stryCov_9fa48("7188"), [stryMutAct_9fa48("7189") ? "" : (stryCov_9fa48("7189"), "webrtc"), stryMutAct_9fa48("7190") ? "" : (stryCov_9fa48("7190"), "pears-bulk"), stryMutAct_9fa48("7191") ? "" : (stryCov_9fa48("7191"), "reticulum"), stryMutAct_9fa48("7192") ? "" : (stryCov_9fa48("7192"), "lxmf"), stryMutAct_9fa48("7193") ? "" : (stryCov_9fa48("7193"), "cas")]);
export function degradationLadderFor(classId: string): ReadonlyArray<string> {
  if (stryMutAct_9fa48("7194")) {
    {}
  } else {
    stryCov_9fa48("7194");
    const entry = deviceClassById(classId);
    if (stryMutAct_9fa48("7197") ? entry !== undefined : stryMutAct_9fa48("7196") ? false : stryMutAct_9fa48("7195") ? true : (stryCov_9fa48("7195", "7196", "7197"), entry === undefined)) return stryMutAct_9fa48("7198") ? [] : (stryCov_9fa48("7198"), [stryMutAct_9fa48("7199") ? "" : (stryCov_9fa48("7199"), "on-demand")]);
    return entry.degradationLadder;
  }
}
export function bandwidthProfileFor(classId: string, tierId: string, encoding?: string): DeviceBandwidthProfile | undefined {
  if (stryMutAct_9fa48("7200")) {
    {}
  } else {
    stryCov_9fa48("7200");
    const entry = deviceClassById(classId);
    const profile = stryMutAct_9fa48("7201") ? entry.bandwidth[tierId] : (stryCov_9fa48("7201"), entry?.bandwidth[tierId]);
    if (stryMutAct_9fa48("7204") ? profile === undefined && encoding === undefined : stryMutAct_9fa48("7203") ? false : stryMutAct_9fa48("7202") ? true : (stryCov_9fa48("7202", "7203", "7204"), (stryMutAct_9fa48("7206") ? profile !== undefined : stryMutAct_9fa48("7205") ? false : (stryCov_9fa48("7205", "7206"), profile === undefined)) || (stryMutAct_9fa48("7208") ? encoding !== undefined : stryMutAct_9fa48("7207") ? false : (stryCov_9fa48("7207", "7208"), encoding === undefined)))) return profile;
    return stryMutAct_9fa48("7209") ? profile.encodings[encoding] : (stryCov_9fa48("7209"), profile.encodings?.[encoding]);
  }
}
export function demandBps(demand: StreamDemand): number {
  if (stryMutAct_9fa48("7210")) {
    {}
  } else {
    stryCov_9fa48("7210");
    const profile = bandwidthProfileFor(demand.classId, demand.tierId, demand.encoding);
    if (stryMutAct_9fa48("7213") ? profile !== undefined : stryMutAct_9fa48("7212") ? false : stryMutAct_9fa48("7211") ? true : (stryCov_9fa48("7211", "7212", "7213"), profile === undefined)) return 0;
    const rate = stryMutAct_9fa48("7214") ? demand.rateHz && 1 : (stryCov_9fa48("7214"), demand.rateHz ?? 1);
    // Raw media profiles are already bitrates. Event/sample profiles are expressed
    // per 1 Hz and scale with the requested sample rate.
    const scaled = isMediaBitrate(demand.classId, demand.tierId) ? profile.targetBps : stryMutAct_9fa48("7215") ? profile.targetBps / Math.max(0.1, rate) : (stryCov_9fa48("7215"), profile.targetBps * (stryMutAct_9fa48("7216") ? Math.min(0.1, rate) : (stryCov_9fa48("7216"), Math.max(0.1, rate))));
    return stryMutAct_9fa48("7217") ? Math.min(profile.minBps, Math.min(scaled, profile.burstBytes * 8)) : (stryCov_9fa48("7217"), Math.max(profile.minBps, stryMutAct_9fa48("7218") ? Math.max(scaled, profile.burstBytes * 8) : (stryCov_9fa48("7218"), Math.min(scaled, stryMutAct_9fa48("7219") ? profile.burstBytes / 8 : (stryCov_9fa48("7219"), profile.burstBytes * 8)))));
  }
}
export function selectPlane(candidates: ReadonlyArray<LinkSupply>): LinkSupply | undefined {
  if (stryMutAct_9fa48("7220")) {
    {}
  } else {
    stryCov_9fa48("7220");
    const viable = stryMutAct_9fa48("7221") ? candidates : (stryCov_9fa48("7221"), candidates.filter(stryMutAct_9fa48("7222") ? () => undefined : (stryCov_9fa48("7222"), candidate => stryMutAct_9fa48("7226") ? supplyBps(candidate) <= 0 : stryMutAct_9fa48("7225") ? supplyBps(candidate) >= 0 : stryMutAct_9fa48("7224") ? false : stryMutAct_9fa48("7223") ? true : (stryCov_9fa48("7223", "7224", "7225", "7226"), supplyBps(candidate) > 0))));
    const available = stryMutAct_9fa48("7227") ? [...(viable.length > 0 ? viable : candidates)] : (stryCov_9fa48("7227"), (stryMutAct_9fa48("7228") ? [] : (stryCov_9fa48("7228"), [...((stryMutAct_9fa48("7232") ? viable.length <= 0 : stryMutAct_9fa48("7231") ? viable.length >= 0 : stryMutAct_9fa48("7230") ? false : stryMutAct_9fa48("7229") ? true : (stryCov_9fa48("7229", "7230", "7231", "7232"), viable.length > 0)) ? viable : candidates)])).sort((left, right) => {
      if (stryMutAct_9fa48("7233")) {
        {}
      } else {
        stryCov_9fa48("7233");
        const planeDelta = stryMutAct_9fa48("7234") ? PLANE_ORDER.indexOf(left.plane) + PLANE_ORDER.indexOf(right.plane) : (stryCov_9fa48("7234"), PLANE_ORDER.indexOf(left.plane) - PLANE_ORDER.indexOf(right.plane));
        if (stryMutAct_9fa48("7237") ? planeDelta === 0 : stryMutAct_9fa48("7236") ? false : stryMutAct_9fa48("7235") ? true : (stryCov_9fa48("7235", "7236", "7237"), planeDelta !== 0)) return planeDelta;
        return stryMutAct_9fa48("7238") ? supplyBps(right) + supplyBps(left) : (stryCov_9fa48("7238"), supplyBps(right) - supplyBps(left));
      }
    }));
    return available[0];
  }
}
export function supplyBps(supply: LinkSupply): number {
  if (stryMutAct_9fa48("7239")) {
    {}
  } else {
    stryCov_9fa48("7239");
    const measured = stryMutAct_9fa48("7240") ? supply.measuredGoodputBps && supply.effectiveBps : (stryCov_9fa48("7240"), supply.measuredGoodputBps ?? supply.effectiveBps);
    return stryMutAct_9fa48("7241") ? Math.min(0, Math.min(measured, supply.headroomBps)) : (stryCov_9fa48("7241"), Math.max(0, stryMutAct_9fa48("7242") ? Math.max(measured, supply.headroomBps) : (stryCov_9fa48("7242"), Math.min(measured, supply.headroomBps))));
  }
}

/**
 * Pure admission decision. On metered/low-battery links, start one rung lower
 * than the highest sustainable rung and require re-confirmation to climb
 * (caller enforces confirmation; this only picks the starting rung).
 *
 * When every live plane has zero usable supply — or there is no candidate at
 * all — and the class ladder ends in `cas-snapshot`, admit that terminal rung
 * on the `cas` plane instead of rejecting. Snapshot media is store-and-forward;
 * it is not a live bitrate claim.
 */
export function decideStreamAdmission(demand: StreamDemand, candidates: ReadonlyArray<LinkSupply>): AdmissionDecision {
  if (stryMutAct_9fa48("7243")) {
    {}
  } else {
    stryCov_9fa48("7243");
    const ladder = degradationLadderFor(demand.classId);
    const selected = selectPlane(candidates);
    if (stryMutAct_9fa48("7246") ? selected !== undefined : stryMutAct_9fa48("7245") ? false : stryMutAct_9fa48("7244") ? true : (stryCov_9fa48("7244", "7245", "7246"), selected === undefined)) {
      if (stryMutAct_9fa48("7247")) {
        {}
      } else {
        stryCov_9fa48("7247");
        return stryMutAct_9fa48("7248") ? casSnapshotAdmission(demand, ladder) && {
          kind: "reject",
          plane: "cas",
          rung: ladder[ladder.length - 1] ?? "on-demand",
          rungIndex: Math.max(0, ladder.length - 1),
          demandBps: demandBps(demand),
          admittedDemandBps: 0,
          supplyBps: 0,
          reason: "DEVICE_BANDWIDTH_INSUFFICIENT: no candidate plane"
        } : (stryCov_9fa48("7248"), casSnapshotAdmission(demand, ladder) ?? (stryMutAct_9fa48("7249") ? {} : (stryCov_9fa48("7249"), {
          kind: stryMutAct_9fa48("7250") ? "" : (stryCov_9fa48("7250"), "reject"),
          plane: stryMutAct_9fa48("7251") ? "" : (stryCov_9fa48("7251"), "cas"),
          rung: stryMutAct_9fa48("7252") ? ladder[ladder.length - 1] && "on-demand" : (stryCov_9fa48("7252"), ladder[stryMutAct_9fa48("7253") ? ladder.length + 1 : (stryCov_9fa48("7253"), ladder.length - 1)] ?? (stryMutAct_9fa48("7254") ? "" : (stryCov_9fa48("7254"), "on-demand"))),
          rungIndex: stryMutAct_9fa48("7255") ? Math.min(0, ladder.length - 1) : (stryCov_9fa48("7255"), Math.max(0, stryMutAct_9fa48("7256") ? ladder.length + 1 : (stryCov_9fa48("7256"), ladder.length - 1))),
          demandBps: demandBps(demand),
          admittedDemandBps: 0,
          supplyBps: 0,
          reason: stryMutAct_9fa48("7257") ? "" : (stryCov_9fa48("7257"), "DEVICE_BANDWIDTH_INSUFFICIENT: no candidate plane")
        })));
      }
    }
    const requiredBps = demandBps(demand);
    const supply = supplyBps(selected);
    const requestedRungIndex = (stryMutAct_9fa48("7260") ? demand.encoding !== undefined : stryMutAct_9fa48("7259") ? false : stryMutAct_9fa48("7258") ? true : (stryCov_9fa48("7258", "7259", "7260"), demand.encoding === undefined)) ? 0 : stryMutAct_9fa48("7261") ? Math.min(0, ladder.indexOf(demand.encoding)) : (stryCov_9fa48("7261"), Math.max(0, ladder.indexOf(demand.encoding)));
    if (stryMutAct_9fa48("7265") ? requiredBps > 0 : stryMutAct_9fa48("7264") ? requiredBps < 0 : stryMutAct_9fa48("7263") ? false : stryMutAct_9fa48("7262") ? true : (stryCov_9fa48("7262", "7263", "7264", "7265"), requiredBps <= 0)) {
      if (stryMutAct_9fa48("7266")) {
        {}
      } else {
        stryCov_9fa48("7266");
        return stryMutAct_9fa48("7267") ? {} : (stryCov_9fa48("7267"), {
          kind: stryMutAct_9fa48("7268") ? "" : (stryCov_9fa48("7268"), "reject"),
          plane: selected.plane,
          rung: stryMutAct_9fa48("7269") ? ladder[ladder.length - 1] && "on-demand" : (stryCov_9fa48("7269"), ladder[stryMutAct_9fa48("7270") ? ladder.length + 1 : (stryCov_9fa48("7270"), ladder.length - 1)] ?? (stryMutAct_9fa48("7271") ? "" : (stryCov_9fa48("7271"), "on-demand"))),
          rungIndex: stryMutAct_9fa48("7272") ? Math.min(0, ladder.length - 1) : (stryCov_9fa48("7272"), Math.max(0, stryMutAct_9fa48("7273") ? ladder.length + 1 : (stryCov_9fa48("7273"), ladder.length - 1))),
          demandBps: requiredBps,
          admittedDemandBps: 0,
          supplyBps: supply,
          reason: stryMutAct_9fa48("7274") ? "" : (stryCov_9fa48("7274"), "DEVICE_BANDWIDTH_INSUFFICIENT: unknown or empty demand profile")
        });
      }
    }
    if (stryMutAct_9fa48("7278") ? supply > 0 : stryMutAct_9fa48("7277") ? supply < 0 : stryMutAct_9fa48("7276") ? false : stryMutAct_9fa48("7275") ? true : (stryCov_9fa48("7275", "7276", "7277", "7278"), supply <= 0)) {
      if (stryMutAct_9fa48("7279")) {
        {}
      } else {
        stryCov_9fa48("7279");
        return stryMutAct_9fa48("7280") ? casSnapshotAdmission(demand, ladder) && {
          kind: "reject",
          plane: selected.plane,
          rung: ladder[ladder.length - 1] ?? "on-demand",
          rungIndex: Math.max(0, ladder.length - 1),
          demandBps: requiredBps,
          admittedDemandBps: 0,
          supplyBps: supply,
          reason: "DEVICE_BANDWIDTH_INSUFFICIENT: zero supply"
        } : (stryCov_9fa48("7280"), casSnapshotAdmission(demand, ladder) ?? (stryMutAct_9fa48("7281") ? {} : (stryCov_9fa48("7281"), {
          kind: stryMutAct_9fa48("7282") ? "" : (stryCov_9fa48("7282"), "reject"),
          plane: selected.plane,
          rung: stryMutAct_9fa48("7283") ? ladder[ladder.length - 1] && "on-demand" : (stryCov_9fa48("7283"), ladder[stryMutAct_9fa48("7284") ? ladder.length + 1 : (stryCov_9fa48("7284"), ladder.length - 1)] ?? (stryMutAct_9fa48("7285") ? "" : (stryCov_9fa48("7285"), "on-demand"))),
          rungIndex: stryMutAct_9fa48("7286") ? Math.min(0, ladder.length - 1) : (stryCov_9fa48("7286"), Math.max(0, stryMutAct_9fa48("7287") ? ladder.length + 1 : (stryCov_9fa48("7287"), ladder.length - 1))),
          demandBps: requiredBps,
          admittedDemandBps: 0,
          supplyBps: supply,
          reason: stryMutAct_9fa48("7288") ? "" : (stryCov_9fa48("7288"), "DEVICE_BANDWIDTH_INSUFFICIENT: zero supply")
        })));
      }
    }
    let rungIndex = highestSustainableRung(ladder, requiredBps, supply, requestedRungIndex);
    if (stryMutAct_9fa48("7291") ? selected.metered === true && selected.lowBattery === true : stryMutAct_9fa48("7290") ? false : stryMutAct_9fa48("7289") ? true : (stryCov_9fa48("7289", "7290", "7291"), (stryMutAct_9fa48("7293") ? selected.metered !== true : stryMutAct_9fa48("7292") ? false : (stryCov_9fa48("7292", "7293"), selected.metered === (stryMutAct_9fa48("7294") ? false : (stryCov_9fa48("7294"), true)))) || (stryMutAct_9fa48("7296") ? selected.lowBattery !== true : stryMutAct_9fa48("7295") ? false : (stryCov_9fa48("7295", "7296"), selected.lowBattery === (stryMutAct_9fa48("7297") ? false : (stryCov_9fa48("7297"), true)))))) {
      if (stryMutAct_9fa48("7298")) {
        {}
      } else {
        stryCov_9fa48("7298");
        rungIndex = stryMutAct_9fa48("7299") ? Math.max(ladder.length - 1, rungIndex + 1) : (stryCov_9fa48("7299"), Math.min(stryMutAct_9fa48("7300") ? ladder.length + 1 : (stryCov_9fa48("7300"), ladder.length - 1), stryMutAct_9fa48("7301") ? rungIndex - 1 : (stryCov_9fa48("7301"), rungIndex + 1)));
      }
    }
    const rung = stryMutAct_9fa48("7302") ? (ladder[rungIndex] ?? ladder[ladder.length - 1]) && "on-demand" : (stryCov_9fa48("7302"), (stryMutAct_9fa48("7303") ? ladder[rungIndex] && ladder[ladder.length - 1] : (stryCov_9fa48("7303"), ladder[rungIndex] ?? ladder[stryMutAct_9fa48("7304") ? ladder.length + 1 : (stryCov_9fa48("7304"), ladder.length - 1)])) ?? (stryMutAct_9fa48("7305") ? "" : (stryCov_9fa48("7305"), "on-demand")));
    const admittedDemand = demandAtRung(requiredBps, profileMinimumBps(demand), stryMutAct_9fa48("7306") ? rungIndex + requestedRungIndex : (stryCov_9fa48("7306"), rungIndex - requestedRungIndex), stryMutAct_9fa48("7307") ? ladder.length + requestedRungIndex : (stryCov_9fa48("7307"), ladder.length - requestedRungIndex));
    if (stryMutAct_9fa48("7311") ? admittedDemand <= supply : stryMutAct_9fa48("7310") ? admittedDemand >= supply : stryMutAct_9fa48("7309") ? false : stryMutAct_9fa48("7308") ? true : (stryCov_9fa48("7308", "7309", "7310", "7311"), admittedDemand > supply)) {
      if (stryMutAct_9fa48("7312")) {
        {}
      } else {
        stryCov_9fa48("7312");
        // Live planes cannot carry even the bottom live rung; fall through to CAS
        // when the ladder declares a snapshot terminal.
        return stryMutAct_9fa48("7313") ? casSnapshotAdmission(demand, ladder) && {
          kind: "reject",
          plane: selected.plane,
          rung,
          rungIndex,
          demandBps: requiredBps,
          admittedDemandBps: admittedDemand,
          supplyBps: supply,
          reason: "DEVICE_BANDWIDTH_INSUFFICIENT: no sustainable rung"
        } : (stryCov_9fa48("7313"), casSnapshotAdmission(demand, ladder) ?? (stryMutAct_9fa48("7314") ? {} : (stryCov_9fa48("7314"), {
          kind: stryMutAct_9fa48("7315") ? "" : (stryCov_9fa48("7315"), "reject"),
          plane: selected.plane,
          rung,
          rungIndex,
          demandBps: requiredBps,
          admittedDemandBps: admittedDemand,
          supplyBps: supply,
          reason: stryMutAct_9fa48("7316") ? "" : (stryCov_9fa48("7316"), "DEVICE_BANDWIDTH_INSUFFICIENT: no sustainable rung")
        })));
      }
    }
    if (stryMutAct_9fa48("7319") ? rungIndex === requestedRungIndex || requiredBps <= supply : stryMutAct_9fa48("7318") ? false : stryMutAct_9fa48("7317") ? true : (stryCov_9fa48("7317", "7318", "7319"), (stryMutAct_9fa48("7321") ? rungIndex !== requestedRungIndex : stryMutAct_9fa48("7320") ? true : (stryCov_9fa48("7320", "7321"), rungIndex === requestedRungIndex)) && (stryMutAct_9fa48("7324") ? requiredBps > supply : stryMutAct_9fa48("7323") ? requiredBps < supply : stryMutAct_9fa48("7322") ? true : (stryCov_9fa48("7322", "7323", "7324"), requiredBps <= supply)))) {
      if (stryMutAct_9fa48("7325")) {
        {}
      } else {
        stryCov_9fa48("7325");
        return stryMutAct_9fa48("7326") ? {} : (stryCov_9fa48("7326"), {
          kind: stryMutAct_9fa48("7327") ? "" : (stryCov_9fa48("7327"), "accept"),
          plane: selected.plane,
          rung,
          rungIndex,
          demandBps: requiredBps,
          admittedDemandBps: admittedDemand,
          supplyBps: supply,
          reason: stryMutAct_9fa48("7328") ? "" : (stryCov_9fa48("7328"), "accepted at requested quality")
        });
      }
    }
    // Prefer honest degradation (including bottom-of-ladder derived events) over defer
    // whenever the registry declares a ladder for the class.
    if (stryMutAct_9fa48("7331") ? ladder.length > 0 || rungIndex > requestedRungIndex : stryMutAct_9fa48("7330") ? false : stryMutAct_9fa48("7329") ? true : (stryCov_9fa48("7329", "7330", "7331"), (stryMutAct_9fa48("7334") ? ladder.length <= 0 : stryMutAct_9fa48("7333") ? ladder.length >= 0 : stryMutAct_9fa48("7332") ? true : (stryCov_9fa48("7332", "7333", "7334"), ladder.length > 0)) && (stryMutAct_9fa48("7337") ? rungIndex <= requestedRungIndex : stryMutAct_9fa48("7336") ? rungIndex >= requestedRungIndex : stryMutAct_9fa48("7335") ? true : (stryCov_9fa48("7335", "7336", "7337"), rungIndex > requestedRungIndex)))) {
      if (stryMutAct_9fa48("7338")) {
        {}
      } else {
        stryCov_9fa48("7338");
        return stryMutAct_9fa48("7339") ? {} : (stryCov_9fa48("7339"), {
          kind: stryMutAct_9fa48("7340") ? "" : (stryCov_9fa48("7340"), "degrade"),
          plane: selected.plane,
          rung,
          rungIndex,
          demandBps: requiredBps,
          admittedDemandBps: admittedDemand,
          supplyBps: supply,
          reason: stryMutAct_9fa48("7341") ? `` : (stryCov_9fa48("7341"), `degraded to ${rung}`)
        });
      }
    }
    if (stryMutAct_9fa48("7345") ? (selected.queueDepthBytes ?? 0) >= DEFAULT_HOST_LIMIT_BPS : stryMutAct_9fa48("7344") ? (selected.queueDepthBytes ?? 0) <= DEFAULT_HOST_LIMIT_BPS : stryMutAct_9fa48("7343") ? false : stryMutAct_9fa48("7342") ? true : (stryCov_9fa48("7342", "7343", "7344", "7345"), (stryMutAct_9fa48("7346") ? selected.queueDepthBytes && 0 : (stryCov_9fa48("7346"), selected.queueDepthBytes ?? 0)) < DEFAULT_HOST_LIMIT_BPS)) {
      if (stryMutAct_9fa48("7347")) {
        {}
      } else {
        stryCov_9fa48("7347");
        return stryMutAct_9fa48("7348") ? {} : (stryCov_9fa48("7348"), {
          kind: stryMutAct_9fa48("7349") ? "" : (stryCov_9fa48("7349"), "defer"),
          plane: selected.plane,
          rung,
          rungIndex,
          demandBps: requiredBps,
          admittedDemandBps: admittedDemand,
          supplyBps: supply,
          reason: stryMutAct_9fa48("7350") ? "" : (stryCov_9fa48("7350"), "defer until better path or headroom")
        });
      }
    }
    return stryMutAct_9fa48("7351") ? {} : (stryCov_9fa48("7351"), {
      kind: stryMutAct_9fa48("7352") ? "" : (stryCov_9fa48("7352"), "reject"),
      plane: selected.plane,
      rung,
      rungIndex,
      demandBps: requiredBps,
      admittedDemandBps: admittedDemand,
      supplyBps: supply,
      reason: stryMutAct_9fa48("7353") ? "" : (stryCov_9fa48("7353"), "DEVICE_BANDWIDTH_INSUFFICIENT")
    });
  }
}

/** Downshift immediately on sustained deficit; upshift only after hysteresis. */
export function adaptStreamAdmission(input: AdaptationInput): AdmissionDecision {
  if (stryMutAct_9fa48("7354")) {
    {}
  } else {
    stryCov_9fa48("7354");
    const supply = supplyBps(input.supply);
    const deficitStreak = stryMutAct_9fa48("7355") ? input.deficitStreak && 0 : (stryCov_9fa48("7355"), input.deficitStreak ?? 0);
    const surplusStreak = stryMutAct_9fa48("7356") ? input.surplusStreak && 0 : (stryCov_9fa48("7356"), input.surplusStreak ?? 0);
    let rungIndex = input.previous.rungIndex;
    if (stryMutAct_9fa48("7359") ? supply < input.previous.admittedDemandBps || deficitStreak >= DOWNSHIFT_AFTER : stryMutAct_9fa48("7358") ? false : stryMutAct_9fa48("7357") ? true : (stryCov_9fa48("7357", "7358", "7359"), (stryMutAct_9fa48("7362") ? supply >= input.previous.admittedDemandBps : stryMutAct_9fa48("7361") ? supply <= input.previous.admittedDemandBps : stryMutAct_9fa48("7360") ? true : (stryCov_9fa48("7360", "7361", "7362"), supply < input.previous.admittedDemandBps)) && (stryMutAct_9fa48("7365") ? deficitStreak < DOWNSHIFT_AFTER : stryMutAct_9fa48("7364") ? deficitStreak > DOWNSHIFT_AFTER : stryMutAct_9fa48("7363") ? true : (stryCov_9fa48("7363", "7364", "7365"), deficitStreak >= DOWNSHIFT_AFTER)))) {
      if (stryMutAct_9fa48("7366")) {
        {}
      } else {
        stryCov_9fa48("7366");
        rungIndex = stryMutAct_9fa48("7367") ? Math.max(input.ladder.length - 1, rungIndex + 1) : (stryCov_9fa48("7367"), Math.min(stryMutAct_9fa48("7368") ? input.ladder.length + 1 : (stryCov_9fa48("7368"), input.ladder.length - 1), stryMutAct_9fa48("7369") ? rungIndex - 1 : (stryCov_9fa48("7369"), rungIndex + 1)));
      }
    } else if (stryMutAct_9fa48("7372") ? supply >= Math.min(input.previous.demandBps, input.previous.admittedDemandBps * 2) && surplusStreak >= UPSHIFT_AFTER && input.supply.metered !== true || input.supply.lowBattery !== true : stryMutAct_9fa48("7371") ? false : stryMutAct_9fa48("7370") ? true : (stryCov_9fa48("7370", "7371", "7372"), (stryMutAct_9fa48("7374") ? supply >= Math.min(input.previous.demandBps, input.previous.admittedDemandBps * 2) && surplusStreak >= UPSHIFT_AFTER || input.supply.metered !== true : stryMutAct_9fa48("7373") ? true : (stryCov_9fa48("7373", "7374"), (stryMutAct_9fa48("7376") ? supply >= Math.min(input.previous.demandBps, input.previous.admittedDemandBps * 2) || surplusStreak >= UPSHIFT_AFTER : stryMutAct_9fa48("7375") ? true : (stryCov_9fa48("7375", "7376"), (stryMutAct_9fa48("7379") ? supply < Math.min(input.previous.demandBps, input.previous.admittedDemandBps * 2) : stryMutAct_9fa48("7378") ? supply > Math.min(input.previous.demandBps, input.previous.admittedDemandBps * 2) : stryMutAct_9fa48("7377") ? true : (stryCov_9fa48("7377", "7378", "7379"), supply >= (stryMutAct_9fa48("7380") ? Math.max(input.previous.demandBps, input.previous.admittedDemandBps * 2) : (stryCov_9fa48("7380"), Math.min(input.previous.demandBps, stryMutAct_9fa48("7381") ? input.previous.admittedDemandBps / 2 : (stryCov_9fa48("7381"), input.previous.admittedDemandBps * 2)))))) && (stryMutAct_9fa48("7384") ? surplusStreak < UPSHIFT_AFTER : stryMutAct_9fa48("7383") ? surplusStreak > UPSHIFT_AFTER : stryMutAct_9fa48("7382") ? true : (stryCov_9fa48("7382", "7383", "7384"), surplusStreak >= UPSHIFT_AFTER)))) && (stryMutAct_9fa48("7386") ? input.supply.metered === true : stryMutAct_9fa48("7385") ? true : (stryCov_9fa48("7385", "7386"), input.supply.metered !== (stryMutAct_9fa48("7387") ? false : (stryCov_9fa48("7387"), true)))))) && (stryMutAct_9fa48("7389") ? input.supply.lowBattery === true : stryMutAct_9fa48("7388") ? true : (stryCov_9fa48("7388", "7389"), input.supply.lowBattery !== (stryMutAct_9fa48("7390") ? false : (stryCov_9fa48("7390"), true)))))) {
      if (stryMutAct_9fa48("7391")) {
        {}
      } else {
        stryCov_9fa48("7391");
        rungIndex = stryMutAct_9fa48("7392") ? Math.min(0, rungIndex - 1) : (stryCov_9fa48("7392"), Math.max(0, stryMutAct_9fa48("7393") ? rungIndex + 1 : (stryCov_9fa48("7393"), rungIndex - 1)));
      }
    }
    const rung = stryMutAct_9fa48("7394") ? input.ladder[rungIndex] && input.previous.rung : (stryCov_9fa48("7394"), input.ladder[rungIndex] ?? input.previous.rung);
    const kind: AdmissionDecisionKind = (stryMutAct_9fa48("7397") ? rungIndex !== 0 : stryMutAct_9fa48("7396") ? false : stryMutAct_9fa48("7395") ? true : (stryCov_9fa48("7395", "7396", "7397"), rungIndex === 0)) ? stryMutAct_9fa48("7398") ? "" : (stryCov_9fa48("7398"), "accept") : stryMutAct_9fa48("7399") ? "" : (stryCov_9fa48("7399"), "degrade");
    const rungDelta = stryMutAct_9fa48("7400") ? rungIndex + input.previous.rungIndex : (stryCov_9fa48("7400"), rungIndex - input.previous.rungIndex);
    const admittedDemandBps = (stryMutAct_9fa48("7403") ? rungDelta !== 0 : stryMutAct_9fa48("7402") ? false : stryMutAct_9fa48("7401") ? true : (stryCov_9fa48("7401", "7402", "7403"), rungDelta === 0)) ? input.previous.admittedDemandBps : (stryMutAct_9fa48("7407") ? rungDelta <= 0 : stryMutAct_9fa48("7406") ? rungDelta >= 0 : stryMutAct_9fa48("7405") ? false : stryMutAct_9fa48("7404") ? true : (stryCov_9fa48("7404", "7405", "7406", "7407"), rungDelta > 0)) ? stryMutAct_9fa48("7408") ? input.previous.admittedDemandBps * 2 ** rungDelta : (stryCov_9fa48("7408"), input.previous.admittedDemandBps / 2 ** rungDelta) : stryMutAct_9fa48("7409") ? Math.max(input.previous.demandBps, input.previous.admittedDemandBps * 2 ** -rungDelta) : (stryCov_9fa48("7409"), Math.min(input.previous.demandBps, stryMutAct_9fa48("7410") ? input.previous.admittedDemandBps / 2 ** -rungDelta : (stryCov_9fa48("7410"), input.previous.admittedDemandBps * 2 ** (stryMutAct_9fa48("7411") ? +rungDelta : (stryCov_9fa48("7411"), -rungDelta)))));
    return stryMutAct_9fa48("7412") ? {} : (stryCov_9fa48("7412"), {
      kind,
      plane: input.supply.plane,
      rung,
      rungIndex,
      demandBps: input.previous.demandBps,
      admittedDemandBps,
      supplyBps: supply,
      reason: (stryMutAct_9fa48("7415") ? rungIndex !== input.previous.rungIndex : stryMutAct_9fa48("7414") ? false : stryMutAct_9fa48("7413") ? true : (stryCov_9fa48("7413", "7414", "7415"), rungIndex === input.previous.rungIndex)) ? stryMutAct_9fa48("7416") ? "" : (stryCov_9fa48("7416"), "hold") : stryMutAct_9fa48("7417") ? `` : (stryCov_9fa48("7417"), `adapt to ${rung}`)
    });
  }
}

/** Property helper: accepted/degraded streams must fit in headroom. */
export function admittedWithinHeadroom(decision: AdmissionDecision, headroomBps: number): boolean {
  if (stryMutAct_9fa48("7418")) {
    {}
  } else {
    stryCov_9fa48("7418");
    if (stryMutAct_9fa48("7421") ? decision.kind === "reject" && decision.kind === "defer" : stryMutAct_9fa48("7420") ? false : stryMutAct_9fa48("7419") ? true : (stryCov_9fa48("7419", "7420", "7421"), (stryMutAct_9fa48("7423") ? decision.kind !== "reject" : stryMutAct_9fa48("7422") ? false : (stryCov_9fa48("7422", "7423"), decision.kind === (stryMutAct_9fa48("7424") ? "" : (stryCov_9fa48("7424"), "reject")))) || (stryMutAct_9fa48("7426") ? decision.kind !== "defer" : stryMutAct_9fa48("7425") ? false : (stryCov_9fa48("7425", "7426"), decision.kind === (stryMutAct_9fa48("7427") ? "" : (stryCov_9fa48("7427"), "defer")))))) return stryMutAct_9fa48("7428") ? false : (stryCov_9fa48("7428"), true);
    // CAS snapshots are store-and-forward; they do not claim live headroom.
    if (stryMutAct_9fa48("7431") ? decision.plane === "cas" || decision.rung === "cas-snapshot" : stryMutAct_9fa48("7430") ? false : stryMutAct_9fa48("7429") ? true : (stryCov_9fa48("7429", "7430", "7431"), (stryMutAct_9fa48("7433") ? decision.plane !== "cas" : stryMutAct_9fa48("7432") ? true : (stryCov_9fa48("7432", "7433"), decision.plane === (stryMutAct_9fa48("7434") ? "" : (stryCov_9fa48("7434"), "cas")))) && (stryMutAct_9fa48("7436") ? decision.rung !== "cas-snapshot" : stryMutAct_9fa48("7435") ? true : (stryCov_9fa48("7435", "7436"), decision.rung === (stryMutAct_9fa48("7437") ? "" : (stryCov_9fa48("7437"), "cas-snapshot")))))) return stryMutAct_9fa48("7438") ? false : (stryCov_9fa48("7438"), true);
    return stryMutAct_9fa48("7441") ? decision.admittedDemandBps <= headroomBps || decision.admittedDemandBps > 0 : stryMutAct_9fa48("7440") ? false : stryMutAct_9fa48("7439") ? true : (stryCov_9fa48("7439", "7440", "7441"), (stryMutAct_9fa48("7444") ? decision.admittedDemandBps > headroomBps : stryMutAct_9fa48("7443") ? decision.admittedDemandBps < headroomBps : stryMutAct_9fa48("7442") ? true : (stryCov_9fa48("7442", "7443", "7444"), decision.admittedDemandBps <= headroomBps)) && (stryMutAct_9fa48("7447") ? decision.admittedDemandBps <= 0 : stryMutAct_9fa48("7446") ? decision.admittedDemandBps >= 0 : stryMutAct_9fa48("7445") ? true : (stryCov_9fa48("7445", "7446", "7447"), decision.admittedDemandBps > 0)));
  }
}
export function allDeviceClassIds(): ReadonlyArray<string> {
  if (stryMutAct_9fa48("7448")) {
    {}
  } else {
    stryCov_9fa48("7448");
    return DEVICE_CLASS_REGISTRY.map(stryMutAct_9fa48("7449") ? () => undefined : (stryCov_9fa48("7449"), (entry: DeviceClassEntry) => entry.id));
  }
}

/**
 * Terminal no-live-path admission. Only classes whose ladder names
 * `cas-snapshot` may take this exit; everyone else still fails closed.
 */
function casSnapshotAdmission(demand: StreamDemand, ladder: ReadonlyArray<string>): AdmissionDecision | null {
  if (stryMutAct_9fa48("7450")) {
    {}
  } else {
    stryCov_9fa48("7450");
    const rungIndex = ladder.indexOf(stryMutAct_9fa48("7451") ? "" : (stryCov_9fa48("7451"), "cas-snapshot"));
    if (stryMutAct_9fa48("7455") ? rungIndex >= 0 : stryMutAct_9fa48("7454") ? rungIndex <= 0 : stryMutAct_9fa48("7453") ? false : stryMutAct_9fa48("7452") ? true : (stryCov_9fa48("7452", "7453", "7454", "7455"), rungIndex < 0)) return null;
    const requiredBps = demandBps(demand);
    const requestedRungIndex = (stryMutAct_9fa48("7458") ? demand.encoding !== undefined : stryMutAct_9fa48("7457") ? false : stryMutAct_9fa48("7456") ? true : (stryCov_9fa48("7456", "7457", "7458"), demand.encoding === undefined)) ? 0 : stryMutAct_9fa48("7459") ? Math.min(0, ladder.indexOf(demand.encoding)) : (stryCov_9fa48("7459"), Math.max(0, ladder.indexOf(demand.encoding)));
    const kind: AdmissionDecisionKind = (stryMutAct_9fa48("7462") ? requestedRungIndex === rungIndex || demand.encoding === "cas-snapshot" : stryMutAct_9fa48("7461") ? false : stryMutAct_9fa48("7460") ? true : (stryCov_9fa48("7460", "7461", "7462"), (stryMutAct_9fa48("7464") ? requestedRungIndex !== rungIndex : stryMutAct_9fa48("7463") ? true : (stryCov_9fa48("7463", "7464"), requestedRungIndex === rungIndex)) && (stryMutAct_9fa48("7466") ? demand.encoding !== "cas-snapshot" : stryMutAct_9fa48("7465") ? true : (stryCov_9fa48("7465", "7466"), demand.encoding === (stryMutAct_9fa48("7467") ? "" : (stryCov_9fa48("7467"), "cas-snapshot")))))) ? stryMutAct_9fa48("7468") ? "" : (stryCov_9fa48("7468"), "accept") : stryMutAct_9fa48("7469") ? "" : (stryCov_9fa48("7469"), "degrade");
    return stryMutAct_9fa48("7470") ? {} : (stryCov_9fa48("7470"), {
      kind,
      plane: stryMutAct_9fa48("7471") ? "" : (stryCov_9fa48("7471"), "cas"),
      rung: stryMutAct_9fa48("7472") ? "" : (stryCov_9fa48("7472"), "cas-snapshot"),
      rungIndex,
      demandBps: requiredBps,
      admittedDemandBps: stryMutAct_9fa48("7473") ? Math.min(1, profileMinimumBps(demand)) : (stryCov_9fa48("7473"), Math.max(1, profileMinimumBps(demand))),
      supplyBps: 0,
      reason: stryMutAct_9fa48("7474") ? "" : (stryCov_9fa48("7474"), "no live path; admitted cas-snapshot")
    });
  }
}
function highestSustainableRung(ladder: ReadonlyArray<string>, demand: number, supply: number, startIndex = 0): number {
  if (stryMutAct_9fa48("7475")) {
    {}
  } else {
    stryCov_9fa48("7475");
    // Index 0 is highest quality. Each step roughly halves demand.
    for (let index = startIndex; stryMutAct_9fa48("7478") ? index >= ladder.length : stryMutAct_9fa48("7477") ? index <= ladder.length : stryMutAct_9fa48("7476") ? false : (stryCov_9fa48("7476", "7477", "7478"), index < ladder.length); stryMutAct_9fa48("7479") ? index -= 1 : (stryCov_9fa48("7479"), index += 1)) {
      if (stryMutAct_9fa48("7480")) {
        {}
      } else {
        stryCov_9fa48("7480");
        const scaledDemand = stryMutAct_9fa48("7481") ? demand * 2 ** (index - startIndex) : (stryCov_9fa48("7481"), demand / 2 ** (stryMutAct_9fa48("7482") ? index + startIndex : (stryCov_9fa48("7482"), index - startIndex)));
        if (stryMutAct_9fa48("7486") ? scaledDemand > supply : stryMutAct_9fa48("7485") ? scaledDemand < supply : stryMutAct_9fa48("7484") ? false : stryMutAct_9fa48("7483") ? true : (stryCov_9fa48("7483", "7484", "7485", "7486"), scaledDemand <= supply)) return index;
      }
    }
    return stryMutAct_9fa48("7487") ? ladder.length + 1 : (stryCov_9fa48("7487"), ladder.length - 1);
  }
}
function profileMinimumBps(demand: StreamDemand): number {
  if (stryMutAct_9fa48("7488")) {
    {}
  } else {
    stryCov_9fa48("7488");
    return stryMutAct_9fa48("7489") ? bandwidthProfileFor(demand.classId, demand.tierId, demand.encoding)?.minBps && 0 : (stryCov_9fa48("7489"), (stryMutAct_9fa48("7490") ? bandwidthProfileFor(demand.classId, demand.tierId, demand.encoding).minBps : (stryCov_9fa48("7490"), bandwidthProfileFor(demand.classId, demand.tierId, demand.encoding)?.minBps)) ?? 0);
  }
}
function demandAtRung(demand: number, minimum: number, index: number, ladderLength: number): number {
  if (stryMutAct_9fa48("7491")) {
    {}
  } else {
    stryCov_9fa48("7491");
    if (stryMutAct_9fa48("7494") ? ladderLength > 0 || index >= ladderLength - 1 : stryMutAct_9fa48("7493") ? false : stryMutAct_9fa48("7492") ? true : (stryCov_9fa48("7492", "7493", "7494"), (stryMutAct_9fa48("7497") ? ladderLength <= 0 : stryMutAct_9fa48("7496") ? ladderLength >= 0 : stryMutAct_9fa48("7495") ? true : (stryCov_9fa48("7495", "7496", "7497"), ladderLength > 0)) && (stryMutAct_9fa48("7500") ? index < ladderLength - 1 : stryMutAct_9fa48("7499") ? index > ladderLength - 1 : stryMutAct_9fa48("7498") ? true : (stryCov_9fa48("7498", "7499", "7500"), index >= (stryMutAct_9fa48("7501") ? ladderLength + 1 : (stryCov_9fa48("7501"), ladderLength - 1)))))) return stryMutAct_9fa48("7502") ? Math.max(demand, minimum) : (stryCov_9fa48("7502"), Math.min(demand, minimum));
    return stryMutAct_9fa48("7503") ? Math.min(minimum, demand / 2 ** index) : (stryCov_9fa48("7503"), Math.max(minimum, stryMutAct_9fa48("7504") ? demand * 2 ** index : (stryCov_9fa48("7504"), demand / 2 ** index)));
  }
}
function isMediaBitrate(classId: string, tierId: string): boolean {
  if (stryMutAct_9fa48("7505")) {
    {}
  } else {
    stryCov_9fa48("7505");
    return stryMutAct_9fa48("7508") ? (classId === "camera" && tierId === "frames" || classId === "screen-capture" && tierId === "frames") && (classId === "microphone" || classId === "speaker") && tierId === "pcm" : stryMutAct_9fa48("7507") ? false : stryMutAct_9fa48("7506") ? true : (stryCov_9fa48("7506", "7507", "7508"), (stryMutAct_9fa48("7510") ? classId === "camera" && tierId === "frames" && classId === "screen-capture" && tierId === "frames" : stryMutAct_9fa48("7509") ? false : (stryCov_9fa48("7509", "7510"), (stryMutAct_9fa48("7512") ? classId === "camera" || tierId === "frames" : stryMutAct_9fa48("7511") ? false : (stryCov_9fa48("7511", "7512"), (stryMutAct_9fa48("7514") ? classId !== "camera" : stryMutAct_9fa48("7513") ? true : (stryCov_9fa48("7513", "7514"), classId === (stryMutAct_9fa48("7515") ? "" : (stryCov_9fa48("7515"), "camera")))) && (stryMutAct_9fa48("7517") ? tierId !== "frames" : stryMutAct_9fa48("7516") ? true : (stryCov_9fa48("7516", "7517"), tierId === (stryMutAct_9fa48("7518") ? "" : (stryCov_9fa48("7518"), "frames")))))) || (stryMutAct_9fa48("7520") ? classId === "screen-capture" || tierId === "frames" : stryMutAct_9fa48("7519") ? false : (stryCov_9fa48("7519", "7520"), (stryMutAct_9fa48("7522") ? classId !== "screen-capture" : stryMutAct_9fa48("7521") ? true : (stryCov_9fa48("7521", "7522"), classId === (stryMutAct_9fa48("7523") ? "" : (stryCov_9fa48("7523"), "screen-capture")))) && (stryMutAct_9fa48("7525") ? tierId !== "frames" : stryMutAct_9fa48("7524") ? true : (stryCov_9fa48("7524", "7525"), tierId === (stryMutAct_9fa48("7526") ? "" : (stryCov_9fa48("7526"), "frames")))))))) || (stryMutAct_9fa48("7528") ? classId === "microphone" || classId === "speaker" || tierId === "pcm" : stryMutAct_9fa48("7527") ? false : (stryCov_9fa48("7527", "7528"), (stryMutAct_9fa48("7530") ? classId === "microphone" && classId === "speaker" : stryMutAct_9fa48("7529") ? true : (stryCov_9fa48("7529", "7530"), (stryMutAct_9fa48("7532") ? classId !== "microphone" : stryMutAct_9fa48("7531") ? false : (stryCov_9fa48("7531", "7532"), classId === (stryMutAct_9fa48("7533") ? "" : (stryCov_9fa48("7533"), "microphone")))) || (stryMutAct_9fa48("7535") ? classId !== "speaker" : stryMutAct_9fa48("7534") ? false : (stryCov_9fa48("7534", "7535"), classId === (stryMutAct_9fa48("7536") ? "" : (stryCov_9fa48("7536"), "speaker")))))) && (stryMutAct_9fa48("7538") ? tierId !== "pcm" : stryMutAct_9fa48("7537") ? true : (stryCov_9fa48("7537", "7538"), tierId === (stryMutAct_9fa48("7539") ? "" : (stryCov_9fa48("7539"), "pcm")))))));
  }
}