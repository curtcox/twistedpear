/** ~1 km cell size at the equator in degrees (111 km ≈ 1° latitude). */
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
const COARSE_CELL_DEG = stryMutAct_9fa48("7804") ? 1 * 111 : (stryCov_9fa48("7804"), 1 / 111);
export interface PreciseLocationFix {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM?: number;
  readonly altitudeM?: number;
  readonly speedMps?: number;
  readonly headingDeg?: number;
}
export interface CoarseLocationFix {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM: number;
}

/**
 * Quantize a precise fix to a host-side coarse cell so apps holding only
 * `device:location` never observe the precise coordinates.
 */
export function quantizeLocationCoarse(fix: PreciseLocationFix): CoarseLocationFix {
  if (stryMutAct_9fa48("7805")) {
    {}
  } else {
    stryCov_9fa48("7805");
    const latitude = clamp(stryMutAct_9fa48("7806") ? Math.round(fix.latitude / COARSE_CELL_DEG) / COARSE_CELL_DEG : (stryCov_9fa48("7806"), Math.round(stryMutAct_9fa48("7807") ? fix.latitude * COARSE_CELL_DEG : (stryCov_9fa48("7807"), fix.latitude / COARSE_CELL_DEG)) * COARSE_CELL_DEG), stryMutAct_9fa48("7808") ? +90 : (stryCov_9fa48("7808"), -90), 90);
    const cosLat = Math.cos(stryMutAct_9fa48("7809") ? latitude * Math.PI * 180 : (stryCov_9fa48("7809"), (stryMutAct_9fa48("7810") ? latitude / Math.PI : (stryCov_9fa48("7810"), latitude * Math.PI)) / 180));
    const lonCell = (stryMutAct_9fa48("7813") ? cosLat !== 0 : stryMutAct_9fa48("7812") ? false : stryMutAct_9fa48("7811") ? true : (stryCov_9fa48("7811", "7812", "7813"), cosLat === 0)) ? COARSE_CELL_DEG : stryMutAct_9fa48("7814") ? COARSE_CELL_DEG * Math.max(Math.abs(cosLat), 0.01) : (stryCov_9fa48("7814"), COARSE_CELL_DEG / (stryMutAct_9fa48("7815") ? Math.min(Math.abs(cosLat), 0.01) : (stryCov_9fa48("7815"), Math.max(Math.abs(cosLat), 0.01))));
    const longitude = wrapLongitude(stryMutAct_9fa48("7816") ? Math.round(fix.longitude / lonCell) / lonCell : (stryCov_9fa48("7816"), Math.round(stryMutAct_9fa48("7817") ? fix.longitude * lonCell : (stryCov_9fa48("7817"), fix.longitude / lonCell)) * lonCell));
    return stryMutAct_9fa48("7818") ? {} : (stryCov_9fa48("7818"), {
      latitude,
      longitude,
      accuracyM: 1000
    });
  }
}
export type AmbientLuxBucket = "dark" | "dim" | "indoor" | "bright" | "sunlit";

/** Quantize raw lux into coarse buckets — fingerprinting mitigation. */
export function quantizeAmbientLux(lux: number): AmbientLuxBucket {
  if (stryMutAct_9fa48("7819")) {
    {}
  } else {
    stryCov_9fa48("7819");
    if (stryMutAct_9fa48("7822") ? !Number.isFinite(lux) && lux < 0 : stryMutAct_9fa48("7821") ? false : stryMutAct_9fa48("7820") ? true : (stryCov_9fa48("7820", "7821", "7822"), (stryMutAct_9fa48("7823") ? Number.isFinite(lux) : (stryCov_9fa48("7823"), !Number.isFinite(lux))) || (stryMutAct_9fa48("7826") ? lux >= 0 : stryMutAct_9fa48("7825") ? lux <= 0 : stryMutAct_9fa48("7824") ? false : (stryCov_9fa48("7824", "7825", "7826"), lux < 0)))) return stryMutAct_9fa48("7827") ? "" : (stryCov_9fa48("7827"), "dark");
    if (stryMutAct_9fa48("7831") ? lux >= 10 : stryMutAct_9fa48("7830") ? lux <= 10 : stryMutAct_9fa48("7829") ? false : stryMutAct_9fa48("7828") ? true : (stryCov_9fa48("7828", "7829", "7830", "7831"), lux < 10)) return stryMutAct_9fa48("7832") ? "" : (stryCov_9fa48("7832"), "dark");
    if (stryMutAct_9fa48("7836") ? lux >= 50 : stryMutAct_9fa48("7835") ? lux <= 50 : stryMutAct_9fa48("7834") ? false : stryMutAct_9fa48("7833") ? true : (stryCov_9fa48("7833", "7834", "7835", "7836"), lux < 50)) return stryMutAct_9fa48("7837") ? "" : (stryCov_9fa48("7837"), "dim");
    if (stryMutAct_9fa48("7841") ? lux >= 500 : stryMutAct_9fa48("7840") ? lux <= 500 : stryMutAct_9fa48("7839") ? false : stryMutAct_9fa48("7838") ? true : (stryCov_9fa48("7838", "7839", "7840", "7841"), lux < 500)) return stryMutAct_9fa48("7842") ? "" : (stryCov_9fa48("7842"), "indoor");
    if (stryMutAct_9fa48("7846") ? lux >= 10000 : stryMutAct_9fa48("7845") ? lux <= 10000 : stryMutAct_9fa48("7844") ? false : stryMutAct_9fa48("7843") ? true : (stryCov_9fa48("7843", "7844", "7845", "7846"), lux < 10000)) return stryMutAct_9fa48("7847") ? "" : (stryCov_9fa48("7847"), "bright");
    return stryMutAct_9fa48("7848") ? "" : (stryCov_9fa48("7848"), "sunlit");
  }
}
function clamp(value: number, min: number, max: number): number {
  if (stryMutAct_9fa48("7849")) {
    {}
  } else {
    stryCov_9fa48("7849");
    return stryMutAct_9fa48("7850") ? Math.max(max, Math.max(min, value)) : (stryCov_9fa48("7850"), Math.min(max, stryMutAct_9fa48("7851") ? Math.min(min, value) : (stryCov_9fa48("7851"), Math.max(min, value))));
  }
}
function wrapLongitude(longitude: number): number {
  if (stryMutAct_9fa48("7852")) {
    {}
  } else {
    stryCov_9fa48("7852");
    const wrapped = stryMutAct_9fa48("7853") ? ((longitude + 180) % 360 + 360) % 360 + 180 : (stryCov_9fa48("7853"), (stryMutAct_9fa48("7854") ? ((longitude + 180) % 360 + 360) * 360 : (stryCov_9fa48("7854"), (stryMutAct_9fa48("7855") ? (longitude + 180) % 360 - 360 : (stryCov_9fa48("7855"), (stryMutAct_9fa48("7856") ? (longitude + 180) * 360 : (stryCov_9fa48("7856"), (stryMutAct_9fa48("7857") ? longitude - 180 : (stryCov_9fa48("7857"), longitude + 180)) % 360)) + 360)) % 360)) - 180);
    return (stryMutAct_9fa48("7860") ? wrapped !== -180 : stryMutAct_9fa48("7859") ? false : stryMutAct_9fa48("7858") ? true : (stryCov_9fa48("7858", "7859", "7860"), wrapped === (stryMutAct_9fa48("7861") ? +180 : (stryCov_9fa48("7861"), -180)))) ? 180 : wrapped;
  }
}