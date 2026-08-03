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
export type BandwidthBucket = "none" | "derived" | "narrowband" | "audio" | "sd-video" | "hd-video";
export type MediaClassId = "camera" | "microphone" | "screen-capture";
export interface MediaReadinessClass {
  readonly classId: MediaClassId;
  readonly maxRung: string;
  readonly encodings: ReadonlyArray<string>;
}
export interface PeerMediaReadiness {
  readonly hostApi: string;
  readonly accepts: ReadonlyArray<MediaReadinessClass>;
  readonly offers: ReadonlyArray<MediaReadinessClass>;
  readonly downlinkBucket: BandwidthBucket;
  readonly constrained: ReadonlyArray<"metered" | "low-battery" | "thermal" | "foreground-only">;
  readonly consentPosture: "open" | "ask" | "closed";
  readonly expiresAt: number;
}
export type MediaReadinessPhase = "unknown" | "requested" | "ready" | "unreachable";
export interface MediaReadinessState {
  readonly phase: MediaReadinessPhase;
  readonly readiness: PeerMediaReadiness | null;
}
export type MediaReadinessEvent = {
  readonly kind: "readiness/request";
} | {
  readonly kind: "readiness/receive";
  readonly at: number;
  readonly readiness: PeerMediaReadiness;
} | {
  readonly kind: "readiness/refuse";
} | {
  readonly kind: "readiness/unreachable";
} | {
  readonly kind: "readiness/ttl";
  readonly at: number;
};
export type MediaCapability = "hd-video" | "sd-video" | "audio" | "narrowband" | "derived" | "unreachable";
const BUCKET_ORDER: ReadonlyArray<BandwidthBucket> = stryMutAct_9fa48("22085") ? [] : (stryCov_9fa48("22085"), [stryMutAct_9fa48("22086") ? "" : (stryCov_9fa48("22086"), "none"), stryMutAct_9fa48("22087") ? "" : (stryCov_9fa48("22087"), "derived"), stryMutAct_9fa48("22088") ? "" : (stryCov_9fa48("22088"), "narrowband"), stryMutAct_9fa48("22089") ? "" : (stryCov_9fa48("22089"), "audio"), stryMutAct_9fa48("22090") ? "" : (stryCov_9fa48("22090"), "sd-video"), stryMutAct_9fa48("22091") ? "" : (stryCov_9fa48("22091"), "hd-video")]);
export function initialMediaReadinessState(): MediaReadinessState {
  if (stryMutAct_9fa48("22092")) {
    {}
  } else {
    stryCov_9fa48("22092");
    return stryMutAct_9fa48("22093") ? {} : (stryCov_9fa48("22093"), {
      phase: stryMutAct_9fa48("22094") ? "" : (stryCov_9fa48("22094"), "unknown"),
      readiness: null
    });
  }
}

/** Refusal and transport failure intentionally collapse to the same state. */
export function stepMediaReadiness(state: MediaReadinessState, event: MediaReadinessEvent): MediaReadinessState {
  if (stryMutAct_9fa48("22095")) {
    {}
  } else {
    stryCov_9fa48("22095");
    switch (event.kind) {
      case stryMutAct_9fa48("22097") ? "" : (stryCov_9fa48("22097"), "readiness/request"):
        if (stryMutAct_9fa48("22096")) {} else {
          stryCov_9fa48("22096");
          return stryMutAct_9fa48("22098") ? {} : (stryCov_9fa48("22098"), {
            phase: stryMutAct_9fa48("22099") ? "" : (stryCov_9fa48("22099"), "requested"),
            readiness: null
          });
        }
      case stryMutAct_9fa48("22101") ? "" : (stryCov_9fa48("22101"), "readiness/receive"):
        if (stryMutAct_9fa48("22100")) {} else {
          stryCov_9fa48("22100");
          if (stryMutAct_9fa48("22104") ? event.readiness.consentPosture === "closed" && event.at >= event.readiness.expiresAt : stryMutAct_9fa48("22103") ? false : stryMutAct_9fa48("22102") ? true : (stryCov_9fa48("22102", "22103", "22104"), (stryMutAct_9fa48("22106") ? event.readiness.consentPosture !== "closed" : stryMutAct_9fa48("22105") ? false : (stryCov_9fa48("22105", "22106"), event.readiness.consentPosture === (stryMutAct_9fa48("22107") ? "" : (stryCov_9fa48("22107"), "closed")))) || (stryMutAct_9fa48("22110") ? event.at < event.readiness.expiresAt : stryMutAct_9fa48("22109") ? event.at > event.readiness.expiresAt : stryMutAct_9fa48("22108") ? false : (stryCov_9fa48("22108", "22109", "22110"), event.at >= event.readiness.expiresAt)))) {
            if (stryMutAct_9fa48("22111")) {
              {}
            } else {
              stryCov_9fa48("22111");
              return stryMutAct_9fa48("22112") ? {} : (stryCov_9fa48("22112"), {
                phase: stryMutAct_9fa48("22113") ? "" : (stryCov_9fa48("22113"), "unreachable"),
                readiness: null
              });
            }
          }
          return stryMutAct_9fa48("22114") ? {} : (stryCov_9fa48("22114"), {
            phase: stryMutAct_9fa48("22115") ? "" : (stryCov_9fa48("22115"), "ready"),
            readiness: normalizeMediaReadiness(event.readiness)
          });
        }
      case stryMutAct_9fa48("22116") ? "" : (stryCov_9fa48("22116"), "readiness/refuse"):
      case stryMutAct_9fa48("22118") ? "" : (stryCov_9fa48("22118"), "readiness/unreachable"):
        if (stryMutAct_9fa48("22117")) {} else {
          stryCov_9fa48("22117");
          return stryMutAct_9fa48("22119") ? {} : (stryCov_9fa48("22119"), {
            phase: stryMutAct_9fa48("22120") ? "" : (stryCov_9fa48("22120"), "unreachable"),
            readiness: null
          });
        }
      case stryMutAct_9fa48("22122") ? "" : (stryCov_9fa48("22122"), "readiness/ttl"):
        if (stryMutAct_9fa48("22121")) {} else {
          stryCov_9fa48("22121");
          if (stryMutAct_9fa48("22125") ? state.phase === "ready" && state.readiness !== null || event.at >= state.readiness.expiresAt : stryMutAct_9fa48("22124") ? false : stryMutAct_9fa48("22123") ? true : (stryCov_9fa48("22123", "22124", "22125"), (stryMutAct_9fa48("22127") ? state.phase === "ready" || state.readiness !== null : stryMutAct_9fa48("22126") ? true : (stryCov_9fa48("22126", "22127"), (stryMutAct_9fa48("22129") ? state.phase !== "ready" : stryMutAct_9fa48("22128") ? true : (stryCov_9fa48("22128", "22129"), state.phase === (stryMutAct_9fa48("22130") ? "" : (stryCov_9fa48("22130"), "ready")))) && (stryMutAct_9fa48("22132") ? state.readiness === null : stryMutAct_9fa48("22131") ? true : (stryCov_9fa48("22131", "22132"), state.readiness !== null)))) && (stryMutAct_9fa48("22135") ? event.at < state.readiness.expiresAt : stryMutAct_9fa48("22134") ? event.at > state.readiness.expiresAt : stryMutAct_9fa48("22133") ? true : (stryCov_9fa48("22133", "22134", "22135"), event.at >= state.readiness.expiresAt)))) {
            if (stryMutAct_9fa48("22136")) {
              {}
            } else {
              stryCov_9fa48("22136");
              // Do not reveal whether a peer refused, disappeared, or merely let its
              // readiness lapse; all three are the same app-visible posture.
              return stryMutAct_9fa48("22137") ? {} : (stryCov_9fa48("22137"), {
                phase: stryMutAct_9fa48("22138") ? "" : (stryCov_9fa48("22138"), "unreachable"),
                readiness: null
              });
            }
          }
          return state;
        }
    }
  }
}
export function minimumBandwidthBucket(left: BandwidthBucket, right: BandwidthBucket): BandwidthBucket {
  if (stryMutAct_9fa48("22139")) {
    {}
  } else {
    stryCov_9fa48("22139");
    return stryMutAct_9fa48("22140") ? BUCKET_ORDER[Math.min(BUCKET_ORDER.indexOf(left), BUCKET_ORDER.indexOf(right))] && "none" : (stryCov_9fa48("22140"), BUCKET_ORDER[stryMutAct_9fa48("22141") ? Math.max(BUCKET_ORDER.indexOf(left), BUCKET_ORDER.indexOf(right)) : (stryCov_9fa48("22141"), Math.min(BUCKET_ORDER.indexOf(left), BUCKET_ORDER.indexOf(right)))] ?? (stryMutAct_9fa48("22142") ? "" : (stryCov_9fa48("22142"), "none")));
  }
}
export function decideMediaCapability(input: {
  readonly classId: MediaClassId;
  readonly localSupply: BandwidthBucket;
  readonly peer: PeerMediaReadiness | null;
  readonly at: number;
  readonly sharePermitted: boolean;
}): MediaCapability {
  if (stryMutAct_9fa48("22143")) {
    {}
  } else {
    stryCov_9fa48("22143");
    if (stryMutAct_9fa48("22146") ? (!input.sharePermitted || input.peer === null || input.at >= input.peer.expiresAt) && input.peer.consentPosture === "closed" : stryMutAct_9fa48("22145") ? false : stryMutAct_9fa48("22144") ? true : (stryCov_9fa48("22144", "22145", "22146"), (stryMutAct_9fa48("22148") ? (!input.sharePermitted || input.peer === null) && input.at >= input.peer.expiresAt : stryMutAct_9fa48("22147") ? false : (stryCov_9fa48("22147", "22148"), (stryMutAct_9fa48("22150") ? !input.sharePermitted && input.peer === null : stryMutAct_9fa48("22149") ? false : (stryCov_9fa48("22149", "22150"), (stryMutAct_9fa48("22151") ? input.sharePermitted : (stryCov_9fa48("22151"), !input.sharePermitted)) || (stryMutAct_9fa48("22153") ? input.peer !== null : stryMutAct_9fa48("22152") ? false : (stryCov_9fa48("22152", "22153"), input.peer === null)))) || (stryMutAct_9fa48("22156") ? input.at < input.peer.expiresAt : stryMutAct_9fa48("22155") ? input.at > input.peer.expiresAt : stryMutAct_9fa48("22154") ? false : (stryCov_9fa48("22154", "22155", "22156"), input.at >= input.peer.expiresAt)))) || (stryMutAct_9fa48("22158") ? input.peer.consentPosture !== "closed" : stryMutAct_9fa48("22157") ? false : (stryCov_9fa48("22157", "22158"), input.peer.consentPosture === (stryMutAct_9fa48("22159") ? "" : (stryCov_9fa48("22159"), "closed")))))) {
      if (stryMutAct_9fa48("22160")) {
        {}
      } else {
        stryCov_9fa48("22160");
        return stryMutAct_9fa48("22161") ? "" : (stryCov_9fa48("22161"), "unreachable");
      }
    }
    const accepted = input.peer.accepts.find(stryMutAct_9fa48("22162") ? () => undefined : (stryCov_9fa48("22162"), entry => stryMutAct_9fa48("22165") ? entry.classId !== input.classId : stryMutAct_9fa48("22164") ? false : stryMutAct_9fa48("22163") ? true : (stryCov_9fa48("22163", "22164", "22165"), entry.classId === input.classId)));
    if (stryMutAct_9fa48("22168") ? accepted !== undefined : stryMutAct_9fa48("22167") ? false : stryMutAct_9fa48("22166") ? true : (stryCov_9fa48("22166", "22167", "22168"), accepted === undefined)) return stryMutAct_9fa48("22169") ? "" : (stryCov_9fa48("22169"), "unreachable");
    const bucket = minimumBandwidthBucket(input.localSupply, input.peer.downlinkBucket);
    if (stryMutAct_9fa48("22172") ? input.classId !== "microphone" : stryMutAct_9fa48("22171") ? false : stryMutAct_9fa48("22170") ? true : (stryCov_9fa48("22170", "22171", "22172"), input.classId === (stryMutAct_9fa48("22173") ? "" : (stryCov_9fa48("22173"), "microphone")))) {
      if (stryMutAct_9fa48("22174")) {
        {}
      } else {
        stryCov_9fa48("22174");
        if (stryMutAct_9fa48("22177") ? (bucket === "hd-video" || bucket === "sd-video") && bucket === "audio" : stryMutAct_9fa48("22176") ? false : stryMutAct_9fa48("22175") ? true : (stryCov_9fa48("22175", "22176", "22177"), (stryMutAct_9fa48("22179") ? bucket === "hd-video" && bucket === "sd-video" : stryMutAct_9fa48("22178") ? false : (stryCov_9fa48("22178", "22179"), (stryMutAct_9fa48("22181") ? bucket !== "hd-video" : stryMutAct_9fa48("22180") ? false : (stryCov_9fa48("22180", "22181"), bucket === (stryMutAct_9fa48("22182") ? "" : (stryCov_9fa48("22182"), "hd-video")))) || (stryMutAct_9fa48("22184") ? bucket !== "sd-video" : stryMutAct_9fa48("22183") ? false : (stryCov_9fa48("22183", "22184"), bucket === (stryMutAct_9fa48("22185") ? "" : (stryCov_9fa48("22185"), "sd-video")))))) || (stryMutAct_9fa48("22187") ? bucket !== "audio" : stryMutAct_9fa48("22186") ? false : (stryCov_9fa48("22186", "22187"), bucket === (stryMutAct_9fa48("22188") ? "" : (stryCov_9fa48("22188"), "audio")))))) return stryMutAct_9fa48("22189") ? "" : (stryCov_9fa48("22189"), "audio");
        if (stryMutAct_9fa48("22192") ? bucket !== "narrowband" : stryMutAct_9fa48("22191") ? false : stryMutAct_9fa48("22190") ? true : (stryCov_9fa48("22190", "22191", "22192"), bucket === (stryMutAct_9fa48("22193") ? "" : (stryCov_9fa48("22193"), "narrowband")))) return stryMutAct_9fa48("22194") ? "" : (stryCov_9fa48("22194"), "narrowband");
        return (stryMutAct_9fa48("22197") ? bucket !== "derived" : stryMutAct_9fa48("22196") ? false : stryMutAct_9fa48("22195") ? true : (stryCov_9fa48("22195", "22196", "22197"), bucket === (stryMutAct_9fa48("22198") ? "" : (stryCov_9fa48("22198"), "derived")))) ? stryMutAct_9fa48("22199") ? "" : (stryCov_9fa48("22199"), "derived") : stryMutAct_9fa48("22200") ? "" : (stryCov_9fa48("22200"), "unreachable");
      }
    }
    if (stryMutAct_9fa48("22203") ? bucket !== "hd-video" : stryMutAct_9fa48("22202") ? false : stryMutAct_9fa48("22201") ? true : (stryCov_9fa48("22201", "22202", "22203"), bucket === (stryMutAct_9fa48("22204") ? "" : (stryCov_9fa48("22204"), "hd-video")))) return stryMutAct_9fa48("22205") ? "" : (stryCov_9fa48("22205"), "hd-video");
    if (stryMutAct_9fa48("22208") ? bucket !== "sd-video" : stryMutAct_9fa48("22207") ? false : stryMutAct_9fa48("22206") ? true : (stryCov_9fa48("22206", "22207", "22208"), bucket === (stryMutAct_9fa48("22209") ? "" : (stryCov_9fa48("22209"), "sd-video")))) return stryMutAct_9fa48("22210") ? "" : (stryCov_9fa48("22210"), "sd-video");
    if (stryMutAct_9fa48("22213") ? (bucket === "audio" || bucket === "narrowband") && bucket === "derived" : stryMutAct_9fa48("22212") ? false : stryMutAct_9fa48("22211") ? true : (stryCov_9fa48("22211", "22212", "22213"), (stryMutAct_9fa48("22215") ? bucket === "audio" && bucket === "narrowband" : stryMutAct_9fa48("22214") ? false : (stryCov_9fa48("22214", "22215"), (stryMutAct_9fa48("22217") ? bucket !== "audio" : stryMutAct_9fa48("22216") ? false : (stryCov_9fa48("22216", "22217"), bucket === (stryMutAct_9fa48("22218") ? "" : (stryCov_9fa48("22218"), "audio")))) || (stryMutAct_9fa48("22220") ? bucket !== "narrowband" : stryMutAct_9fa48("22219") ? false : (stryCov_9fa48("22219", "22220"), bucket === (stryMutAct_9fa48("22221") ? "" : (stryCov_9fa48("22221"), "narrowband")))))) || (stryMutAct_9fa48("22223") ? bucket !== "derived" : stryMutAct_9fa48("22222") ? false : (stryCov_9fa48("22222", "22223"), bucket === (stryMutAct_9fa48("22224") ? "" : (stryCov_9fa48("22224"), "derived")))))) return stryMutAct_9fa48("22225") ? "" : (stryCov_9fa48("22225"), "derived");
    return stryMutAct_9fa48("22226") ? "" : (stryCov_9fa48("22226"), "unreachable");
  }
}
export function normalizeMediaReadiness(readiness: PeerMediaReadiness): PeerMediaReadiness {
  if (stryMutAct_9fa48("22227")) {
    {}
  } else {
    stryCov_9fa48("22227");
    return stryMutAct_9fa48("22228") ? {} : (stryCov_9fa48("22228"), {
      ...readiness,
      accepts: normalizeClasses(readiness.accepts),
      offers: normalizeClasses(readiness.offers),
      constrained: stryMutAct_9fa48("22229") ? [...new Set(readiness.constrained)] : (stryCov_9fa48("22229"), (stryMutAct_9fa48("22230") ? [] : (stryCov_9fa48("22230"), [...new Set(readiness.constrained)])).sort())
    });
  }
}
export function negotiateMediaEncoding(localPreference: ReadonlyArray<string>, remote: MediaReadinessClass): string | null {
  if (stryMutAct_9fa48("22231")) {
    {}
  } else {
    stryCov_9fa48("22231");
    const remoteSet = new Set(remote.encodings);
    return stryMutAct_9fa48("22232") ? localPreference.find(encoding => remoteSet.has(encoding)) && null : (stryCov_9fa48("22232"), localPreference.find(stryMutAct_9fa48("22233") ? () => undefined : (stryCov_9fa48("22233"), encoding => remoteSet.has(encoding))) ?? null);
  }
}
function normalizeClasses(classes: ReadonlyArray<MediaReadinessClass>): ReadonlyArray<MediaReadinessClass> {
  if (stryMutAct_9fa48("22234")) {
    {}
  } else {
    stryCov_9fa48("22234");
    return stryMutAct_9fa48("22236") ? [...classes].map(entry => ({
      ...entry,
      encodings: [...new Set(entry.encodings)].sort()
    })).sort((left, right) => left.classId.localeCompare(right.classId)) : stryMutAct_9fa48("22235") ? [...classes].filter(entry => entry.encodings.length > 0).map(entry => ({
      ...entry,
      encodings: [...new Set(entry.encodings)].sort()
    })) : (stryCov_9fa48("22235", "22236"), (stryMutAct_9fa48("22237") ? [] : (stryCov_9fa48("22237"), [...classes])).filter(stryMutAct_9fa48("22238") ? () => undefined : (stryCov_9fa48("22238"), entry => stryMutAct_9fa48("22242") ? entry.encodings.length <= 0 : stryMutAct_9fa48("22241") ? entry.encodings.length >= 0 : stryMutAct_9fa48("22240") ? false : stryMutAct_9fa48("22239") ? true : (stryCov_9fa48("22239", "22240", "22241", "22242"), entry.encodings.length > 0))).map(stryMutAct_9fa48("22243") ? () => undefined : (stryCov_9fa48("22243"), entry => stryMutAct_9fa48("22244") ? {} : (stryCov_9fa48("22244"), {
      ...entry,
      encodings: stryMutAct_9fa48("22245") ? [...new Set(entry.encodings)] : (stryCov_9fa48("22245"), (stryMutAct_9fa48("22246") ? [] : (stryCov_9fa48("22246"), [...new Set(entry.encodings)])).sort())
    }))).sort(stryMutAct_9fa48("22247") ? () => undefined : (stryCov_9fa48("22247"), (left, right) => left.classId.localeCompare(right.classId))));
  }
}