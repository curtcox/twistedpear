/**
 * Sans-IO link-quality estimator. Callers supply observations and timestamps;
 * this module performs no I/O and reads no clock.
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
export type LinkQualitySource = "declared" | "observed" | "probed";
export type LinkQualityConfidence = "low" | "medium" | "high";
export interface LinkQuality {
  readonly goodputBps: number;
  readonly rttMs: number;
  readonly jitterMs: number;
  readonly lossRatio: number;
  readonly mtu: number;
  readonly source: LinkQualitySource;
  readonly samples: number;
  readonly confidence: LinkQualityConfidence;
}
export interface DeclaredLinkMeasurement {
  readonly kind: "declared";
  readonly effectiveBps: number;
  readonly mtu: number;
}
export interface DeliveredLinkMeasurement {
  readonly kind: "observed" | "probed";
  readonly deliveredBytes: number;
  readonly durationMs: number;
  readonly rttMs: number;
  readonly jitterMs?: number;
  readonly lostPackets?: number;
  readonly deliveredPackets?: number;
  readonly mtu: number;
}
export type LinkMeasurement = DeclaredLinkMeasurement | DeliveredLinkMeasurement;
export function initialLinkQuality(measurement: DeclaredLinkMeasurement): LinkQuality {
  if (stryMutAct_9fa48("16579")) {
    {}
  } else {
    stryCov_9fa48("16579");
    return stryMutAct_9fa48("16580") ? {} : (stryCov_9fa48("16580"), {
      goodputBps: finiteNonNegative(measurement.effectiveBps),
      rttMs: 0,
      jitterMs: 0,
      lossRatio: 0,
      mtu: positiveInteger(measurement.mtu),
      source: stryMutAct_9fa48("16581") ? "" : (stryCov_9fa48("16581"), "declared"),
      samples: 0,
      confidence: stryMutAct_9fa48("16582") ? "" : (stryCov_9fa48("16582"), "low")
    });
  }
}
export function updateLinkQuality(previous: LinkQuality | null, measurement: LinkMeasurement): LinkQuality {
  if (stryMutAct_9fa48("16583")) {
    {}
  } else {
    stryCov_9fa48("16583");
    if (stryMutAct_9fa48("16586") ? measurement.kind !== "declared" : stryMutAct_9fa48("16585") ? false : stryMutAct_9fa48("16584") ? true : (stryCov_9fa48("16584", "16585", "16586"), measurement.kind === (stryMutAct_9fa48("16587") ? "" : (stryCov_9fa48("16587"), "declared")))) {
      if (stryMutAct_9fa48("16588")) {
        {}
      } else {
        stryCov_9fa48("16588");
        return stryMutAct_9fa48("16589") ? previous && initialLinkQuality(measurement) : (stryCov_9fa48("16589"), previous ?? initialLinkQuality(measurement));
      }
    }
    const durationMs = stryMutAct_9fa48("16590") ? Math.min(1, finiteNonNegative(measurement.durationMs)) : (stryCov_9fa48("16590"), Math.max(1, finiteNonNegative(measurement.durationMs)));
    const sampleGoodput = stryMutAct_9fa48("16591") ? finiteNonNegative(measurement.deliveredBytes) * 8_000 * durationMs : (stryCov_9fa48("16591"), (stryMutAct_9fa48("16592") ? finiteNonNegative(measurement.deliveredBytes) / 8_000 : (stryCov_9fa48("16592"), finiteNonNegative(measurement.deliveredBytes) * 8_000)) / durationMs);
    const deliveredPackets = finiteNonNegative(stryMutAct_9fa48("16593") ? measurement.deliveredPackets && 0 : (stryCov_9fa48("16593"), measurement.deliveredPackets ?? 0));
    const lostPackets = finiteNonNegative(stryMutAct_9fa48("16594") ? measurement.lostPackets && 0 : (stryCov_9fa48("16594"), measurement.lostPackets ?? 0));
    const packetTotal = stryMutAct_9fa48("16595") ? deliveredPackets - lostPackets : (stryCov_9fa48("16595"), deliveredPackets + lostPackets);
    const sampleLoss = (stryMutAct_9fa48("16598") ? packetTotal !== 0 : stryMutAct_9fa48("16597") ? false : stryMutAct_9fa48("16596") ? true : (stryCov_9fa48("16596", "16597", "16598"), packetTotal === 0)) ? 0 : stryMutAct_9fa48("16599") ? lostPackets * packetTotal : (stryCov_9fa48("16599"), lostPackets / packetTotal);
    const samples = stryMutAct_9fa48("16600") ? (previous?.samples ?? 0) - 1 : (stryCov_9fa48("16600"), (stryMutAct_9fa48("16601") ? previous?.samples && 0 : (stryCov_9fa48("16601"), (stryMutAct_9fa48("16602") ? previous.samples : (stryCov_9fa48("16602"), previous?.samples)) ?? 0)) + 1);
    const alpha = (stryMutAct_9fa48("16605") ? measurement.kind !== "probed" : stryMutAct_9fa48("16604") ? false : stryMutAct_9fa48("16603") ? true : (stryCov_9fa48("16603", "16604", "16605"), measurement.kind === (stryMutAct_9fa48("16606") ? "" : (stryCov_9fa48("16606"), "probed")))) ? 0.5 : 0.25;
    // A declared seed is an interface nameplate, not a prior measurement. The
    // first real sample replaces it outright; blending would carry the guess
    // into every number that follows.
    const prior = (stryMutAct_9fa48("16609") ? previous === null && previous.source === "declared" : stryMutAct_9fa48("16608") ? false : stryMutAct_9fa48("16607") ? true : (stryCov_9fa48("16607", "16608", "16609"), (stryMutAct_9fa48("16611") ? previous !== null : stryMutAct_9fa48("16610") ? false : (stryCov_9fa48("16610", "16611"), previous === null)) || (stryMutAct_9fa48("16613") ? previous.source !== "declared" : stryMutAct_9fa48("16612") ? false : (stryCov_9fa48("16612", "16613"), previous.source === (stryMutAct_9fa48("16614") ? "" : (stryCov_9fa48("16614"), "declared")))))) ? undefined : previous;
    return stryMutAct_9fa48("16615") ? {} : (stryCov_9fa48("16615"), {
      goodputBps: ewma(stryMutAct_9fa48("16616") ? prior.goodputBps : (stryCov_9fa48("16616"), prior?.goodputBps), sampleGoodput, alpha),
      rttMs: ewma(stryMutAct_9fa48("16617") ? prior.rttMs : (stryCov_9fa48("16617"), prior?.rttMs), finiteNonNegative(measurement.rttMs), alpha),
      jitterMs: ewma(stryMutAct_9fa48("16618") ? prior.jitterMs : (stryCov_9fa48("16618"), prior?.jitterMs), finiteNonNegative(stryMutAct_9fa48("16619") ? measurement.jitterMs && 0 : (stryCov_9fa48("16619"), measurement.jitterMs ?? 0)), alpha),
      lossRatio: clamp(ewma(stryMutAct_9fa48("16620") ? prior.lossRatio : (stryCov_9fa48("16620"), prior?.lossRatio), sampleLoss, alpha), 0, 1),
      mtu: positiveInteger(measurement.mtu),
      source: measurement.kind,
      samples,
      confidence: confidenceFor(measurement.kind, samples)
    });
  }
}

/**
 * Live telemetry a host transport reports about one route. A transport that
 * does not say how it knows a number is treated as `declared`: an interface's
 * nameplate bitrate is not a measurement and must not be presented as one.
 */
export interface RouteQualityReport {
  readonly goodputBps: number;
  readonly rttMs: number;
  readonly mtu: number;
  readonly queueDepthBytes?: number;
  readonly jitterMs?: number;
  readonly lossRatio?: number;
  readonly source?: LinkQualitySource;
  readonly samples?: number;
  readonly confidence?: LinkQualityConfidence;
}

/** Folds host route telemetry into a `LinkQuality` without inflating its source. */
export function linkQualityFromRoute(declared: DeclaredLinkMeasurement, reported?: RouteQualityReport): LinkQuality {
  if (stryMutAct_9fa48("16621")) {
    {}
  } else {
    stryCov_9fa48("16621");
    const base = initialLinkQuality(declared);
    if (stryMutAct_9fa48("16624") ? reported !== undefined : stryMutAct_9fa48("16623") ? false : stryMutAct_9fa48("16622") ? true : (stryCov_9fa48("16622", "16623", "16624"), reported === undefined)) return base;
    const source = stryMutAct_9fa48("16625") ? reported.source && "declared" : (stryCov_9fa48("16625"), reported.source ?? (stryMutAct_9fa48("16626") ? "" : (stryCov_9fa48("16626"), "declared")));
    const samples = stryMutAct_9fa48("16627") ? Math.min(0, Math.floor(finiteNonNegative(reported.samples ?? 0))) : (stryCov_9fa48("16627"), Math.max(0, Math.floor(finiteNonNegative(stryMutAct_9fa48("16628") ? reported.samples && 0 : (stryCov_9fa48("16628"), reported.samples ?? 0)))));
    return stryMutAct_9fa48("16629") ? {} : (stryCov_9fa48("16629"), {
      goodputBps: finiteNonNegative(reported.goodputBps),
      rttMs: finiteNonNegative(reported.rttMs),
      jitterMs: finiteNonNegative(stryMutAct_9fa48("16630") ? reported.jitterMs && 0 : (stryCov_9fa48("16630"), reported.jitterMs ?? 0)),
      lossRatio: clamp(finiteNonNegative(stryMutAct_9fa48("16631") ? reported.lossRatio && 0 : (stryCov_9fa48("16631"), reported.lossRatio ?? 0)), 0, 1),
      mtu: positiveInteger(reported.mtu),
      source,
      samples,
      confidence: stryMutAct_9fa48("16632") ? reported.confidence && (source === "declared" ? "low" : confidenceFor(source, samples)) : (stryCov_9fa48("16632"), reported.confidence ?? ((stryMutAct_9fa48("16635") ? source !== "declared" : stryMutAct_9fa48("16634") ? false : stryMutAct_9fa48("16633") ? true : (stryCov_9fa48("16633", "16634", "16635"), source === (stryMutAct_9fa48("16636") ? "" : (stryCov_9fa48("16636"), "declared")))) ? stryMutAct_9fa48("16637") ? "" : (stryCov_9fa48("16637"), "low") : confidenceFor(source, samples)))
    });
  }
}

/** Default bytes a window must carry before it is a credible goodput sample. */
export const LINK_OBSERVATION_MIN_SAMPLE_BYTES = 2_048;
/** Default age after which an under-filled window is discarded, not reported. */
export const LINK_OBSERVATION_MAX_WINDOW_MS = 30_000;

/**
 * Accumulated passive traffic on one route.
 *
 * Idleness is not evidence of a slow link, so a window that never reaches
 * `minSampleBytes` is discarded rather than reported: the estimate stays at
 * whatever was last known instead of decaying towards zero while nobody is
 * talking. A closed window measures its span from the first to the last
 * observed byte, which makes the reported goodput a floor on the link's
 * capacity rather than a claim about its ceiling.
 */
export interface LinkObservationWindow {
  readonly quality: LinkQuality;
  readonly windowStartMs: number;
  readonly windowBytes: number;
  readonly windowPackets: number;
  readonly lostPackets: number;
  readonly rttMs: number;
  readonly mtu: number;
}
export interface LinkDeliveryObservation {
  readonly bytes: number;
  readonly atMs: number;
  readonly rttMs?: number;
  readonly mtu?: number;
  readonly lostPackets?: number;
  readonly minSampleBytes?: number;
  readonly maxWindowMs?: number;
}
export function openLinkObservation(declared: DeclaredLinkMeasurement, atMs: number): LinkObservationWindow {
  if (stryMutAct_9fa48("16638")) {
    {}
  } else {
    stryCov_9fa48("16638");
    return stryMutAct_9fa48("16639") ? {} : (stryCov_9fa48("16639"), {
      quality: initialLinkQuality(declared),
      windowStartMs: finiteNonNegative(atMs),
      windowBytes: 0,
      windowPackets: 0,
      lostPackets: 0,
      rttMs: 0,
      mtu: positiveInteger(declared.mtu)
    });
  }
}
export function observeLinkDelivery(window: LinkObservationWindow, observation: LinkDeliveryObservation): LinkObservationWindow {
  if (stryMutAct_9fa48("16640")) {
    {}
  } else {
    stryCov_9fa48("16640");
    const atMs = finiteNonNegative(observation.atMs);
    const minSampleBytes = positiveInteger(stryMutAct_9fa48("16641") ? observation.minSampleBytes && LINK_OBSERVATION_MIN_SAMPLE_BYTES : (stryCov_9fa48("16641"), observation.minSampleBytes ?? LINK_OBSERVATION_MIN_SAMPLE_BYTES));
    const maxWindowMs = positiveInteger(stryMutAct_9fa48("16642") ? observation.maxWindowMs && LINK_OBSERVATION_MAX_WINDOW_MS : (stryCov_9fa48("16642"), observation.maxWindowMs ?? LINK_OBSERVATION_MAX_WINDOW_MS));
    const rttMs = (stryMutAct_9fa48("16645") ? observation.rttMs !== undefined : stryMutAct_9fa48("16644") ? false : stryMutAct_9fa48("16643") ? true : (stryCov_9fa48("16643", "16644", "16645"), observation.rttMs === undefined)) ? window.rttMs : finiteNonNegative(observation.rttMs);
    const mtu = (stryMutAct_9fa48("16648") ? observation.mtu !== undefined : stryMutAct_9fa48("16647") ? false : stryMutAct_9fa48("16646") ? true : (stryCov_9fa48("16646", "16647", "16648"), observation.mtu === undefined)) ? window.mtu : positiveInteger(observation.mtu);

    // A clock that jumped backwards restarts the window rather than producing a
    // negative span and an absurd goodput.
    const started = (stryMutAct_9fa48("16652") ? atMs >= window.windowStartMs : stryMutAct_9fa48("16651") ? atMs <= window.windowStartMs : stryMutAct_9fa48("16650") ? false : stryMutAct_9fa48("16649") ? true : (stryCov_9fa48("16649", "16650", "16651", "16652"), atMs < window.windowStartMs)) ? atMs : window.windowStartMs;
    const windowBytes = stryMutAct_9fa48("16653") ? window.windowBytes - finiteNonNegative(observation.bytes) : (stryCov_9fa48("16653"), window.windowBytes + finiteNonNegative(observation.bytes));
    const windowPackets = stryMutAct_9fa48("16654") ? window.windowPackets - 1 : (stryCov_9fa48("16654"), window.windowPackets + 1);
    const lostPackets = stryMutAct_9fa48("16655") ? window.lostPackets - finiteNonNegative(observation.lostPackets ?? 0) : (stryCov_9fa48("16655"), window.lostPackets + finiteNonNegative(stryMutAct_9fa48("16656") ? observation.lostPackets && 0 : (stryCov_9fa48("16656"), observation.lostPackets ?? 0)));
    if (stryMutAct_9fa48("16660") ? windowBytes >= minSampleBytes : stryMutAct_9fa48("16659") ? windowBytes <= minSampleBytes : stryMutAct_9fa48("16658") ? false : stryMutAct_9fa48("16657") ? true : (stryCov_9fa48("16657", "16658", "16659", "16660"), windowBytes < minSampleBytes)) {
      if (stryMutAct_9fa48("16661")) {
        {}
      } else {
        stryCov_9fa48("16661");
        const stale = stryMutAct_9fa48("16665") ? atMs - started < maxWindowMs : stryMutAct_9fa48("16664") ? atMs - started > maxWindowMs : stryMutAct_9fa48("16663") ? false : stryMutAct_9fa48("16662") ? true : (stryCov_9fa48("16662", "16663", "16664", "16665"), (stryMutAct_9fa48("16666") ? atMs + started : (stryCov_9fa48("16666"), atMs - started)) >= maxWindowMs);
        return stryMutAct_9fa48("16667") ? {} : (stryCov_9fa48("16667"), {
          quality: window.quality,
          windowStartMs: stale ? atMs : started,
          windowBytes: stale ? 0 : windowBytes,
          windowPackets: stale ? 0 : windowPackets,
          lostPackets: stale ? 0 : lostPackets,
          rttMs,
          mtu
        });
      }
    }
    return stryMutAct_9fa48("16668") ? {} : (stryCov_9fa48("16668"), {
      quality: updateLinkQuality(window.quality, stryMutAct_9fa48("16669") ? {} : (stryCov_9fa48("16669"), {
        kind: stryMutAct_9fa48("16670") ? "" : (stryCov_9fa48("16670"), "observed"),
        deliveredBytes: windowBytes,
        durationMs: stryMutAct_9fa48("16671") ? Math.min(1, atMs - started) : (stryCov_9fa48("16671"), Math.max(1, stryMutAct_9fa48("16672") ? atMs + started : (stryCov_9fa48("16672"), atMs - started))),
        rttMs,
        deliveredPackets: windowPackets,
        lostPackets,
        mtu
      })),
      windowStartMs: atMs,
      windowBytes: 0,
      windowPackets: 0,
      lostPackets: 0,
      rttMs,
      mtu
    });
  }
}
function confidenceFor(source: "observed" | "probed", samples: number): LinkQualityConfidence {
  if (stryMutAct_9fa48("16673")) {
    {}
  } else {
    stryCov_9fa48("16673");
    if (stryMutAct_9fa48("16676") ? source !== "probed" : stryMutAct_9fa48("16675") ? false : stryMutAct_9fa48("16674") ? true : (stryCov_9fa48("16674", "16675", "16676"), source === (stryMutAct_9fa48("16677") ? "" : (stryCov_9fa48("16677"), "probed")))) return (stryMutAct_9fa48("16681") ? samples < 3 : stryMutAct_9fa48("16680") ? samples > 3 : stryMutAct_9fa48("16679") ? false : stryMutAct_9fa48("16678") ? true : (stryCov_9fa48("16678", "16679", "16680", "16681"), samples >= 3)) ? stryMutAct_9fa48("16682") ? "" : (stryCov_9fa48("16682"), "high") : stryMutAct_9fa48("16683") ? "" : (stryCov_9fa48("16683"), "medium");
    if (stryMutAct_9fa48("16687") ? samples < 8 : stryMutAct_9fa48("16686") ? samples > 8 : stryMutAct_9fa48("16685") ? false : stryMutAct_9fa48("16684") ? true : (stryCov_9fa48("16684", "16685", "16686", "16687"), samples >= 8)) return stryMutAct_9fa48("16688") ? "" : (stryCov_9fa48("16688"), "high");
    return (stryMutAct_9fa48("16692") ? samples < 3 : stryMutAct_9fa48("16691") ? samples > 3 : stryMutAct_9fa48("16690") ? false : stryMutAct_9fa48("16689") ? true : (stryCov_9fa48("16689", "16690", "16691", "16692"), samples >= 3)) ? stryMutAct_9fa48("16693") ? "" : (stryCov_9fa48("16693"), "medium") : stryMutAct_9fa48("16694") ? "" : (stryCov_9fa48("16694"), "low");
  }
}
function ewma(previous: number | undefined, sample: number, alpha: number): number {
  if (stryMutAct_9fa48("16695")) {
    {}
  } else {
    stryCov_9fa48("16695");
    if (stryMutAct_9fa48("16698") ? previous === undefined && previous === 0 : stryMutAct_9fa48("16697") ? false : stryMutAct_9fa48("16696") ? true : (stryCov_9fa48("16696", "16697", "16698"), (stryMutAct_9fa48("16700") ? previous !== undefined : stryMutAct_9fa48("16699") ? false : (stryCov_9fa48("16699", "16700"), previous === undefined)) || (stryMutAct_9fa48("16702") ? previous !== 0 : stryMutAct_9fa48("16701") ? false : (stryCov_9fa48("16701", "16702"), previous === 0)))) return sample;
    return stryMutAct_9fa48("16703") ? previous - alpha * (sample - previous) : (stryCov_9fa48("16703"), previous + (stryMutAct_9fa48("16704") ? alpha / (sample - previous) : (stryCov_9fa48("16704"), alpha * (stryMutAct_9fa48("16705") ? sample + previous : (stryCov_9fa48("16705"), sample - previous)))));
  }
}
function finiteNonNegative(value: number): number {
  if (stryMutAct_9fa48("16706")) {
    {}
  } else {
    stryCov_9fa48("16706");
    return Number.isFinite(value) ? stryMutAct_9fa48("16707") ? Math.min(0, value) : (stryCov_9fa48("16707"), Math.max(0, value)) : 0;
  }
}
function positiveInteger(value: number): number {
  if (stryMutAct_9fa48("16708")) {
    {}
  } else {
    stryCov_9fa48("16708");
    return stryMutAct_9fa48("16709") ? Math.min(1, Math.floor(finiteNonNegative(value))) : (stryCov_9fa48("16709"), Math.max(1, Math.floor(finiteNonNegative(value))));
  }
}
function clamp(value: number, min: number, max: number): number {
  if (stryMutAct_9fa48("16710")) {
    {}
  } else {
    stryCov_9fa48("16710");
    return stryMutAct_9fa48("16711") ? Math.min(min, Math.min(max, value)) : (stryCov_9fa48("16711"), Math.max(min, stryMutAct_9fa48("16712") ? Math.max(max, value) : (stryCov_9fa48("16712"), Math.min(max, value))));
  }
}