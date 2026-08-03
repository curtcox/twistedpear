/** Host-owned outbound media share policy (Sans-IO). */
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
export type ShareOfferPhase = "active" | "expired" | "revoked";
export type ShareTargetKind = "peer" | "group";
export interface ShareOffer {
  readonly id: string;
  readonly appId: string;
  readonly targetKind: ShareTargetKind;
  readonly targetId: string;
  readonly displayLabel: string;
  readonly classId: "camera" | "microphone" | "screen-capture";
  readonly tierId: string;
  readonly maxRung: string;
  readonly direction: "send";
  readonly grantedAt: number;
  readonly expiresAt: number;
  readonly phase: ShareOfferPhase;
  readonly revokedAt: number | null;
}
export type ShareOfferEvent = {
  readonly kind: "share/grant";
  readonly offer: Omit<ShareOffer, "direction" | "phase" | "revokedAt" | "expiresAt">;
  readonly ttlMs: number;
} | {
  readonly kind: "share/revoke";
  readonly id: string;
  readonly at: number;
} | {
  readonly kind: "share/ttl";
  readonly id: string;
  readonly at: number;
} | {
  readonly kind: "share/clear-sensitive";
  readonly at: number;
};
export function initialShareOfferStore(): ReadonlyMap<string, ShareOffer> {
  if (stryMutAct_9fa48("8103")) {
    {}
  } else {
    stryCov_9fa48("8103");
    return new Map();
  }
}
export function stepShareOfferStore(store: ReadonlyMap<string, ShareOffer>, event: ShareOfferEvent): ReadonlyMap<string, ShareOffer> {
  if (stryMutAct_9fa48("8104")) {
    {}
  } else {
    stryCov_9fa48("8104");
    if (stryMutAct_9fa48("8107") ? event.kind !== "share/clear-sensitive" : stryMutAct_9fa48("8106") ? false : stryMutAct_9fa48("8105") ? true : (stryCov_9fa48("8105", "8106", "8107"), event.kind === (stryMutAct_9fa48("8108") ? "" : (stryCov_9fa48("8108"), "share/clear-sensitive")))) return new Map();
    const next = new Map(store);
    if (stryMutAct_9fa48("8111") ? event.kind !== "share/grant" : stryMutAct_9fa48("8110") ? false : stryMutAct_9fa48("8109") ? true : (stryCov_9fa48("8109", "8110", "8111"), event.kind === (stryMutAct_9fa48("8112") ? "" : (stryCov_9fa48("8112"), "share/grant")))) {
      if (stryMutAct_9fa48("8113")) {
        {}
      } else {
        stryCov_9fa48("8113");
        next.set(event.offer.id, stryMutAct_9fa48("8114") ? {} : (stryCov_9fa48("8114"), {
          ...event.offer,
          direction: stryMutAct_9fa48("8115") ? "" : (stryCov_9fa48("8115"), "send"),
          expiresAt: stryMutAct_9fa48("8116") ? event.offer.grantedAt - Math.max(0, event.ttlMs) : (stryCov_9fa48("8116"), event.offer.grantedAt + (stryMutAct_9fa48("8117") ? Math.min(0, event.ttlMs) : (stryCov_9fa48("8117"), Math.max(0, event.ttlMs)))),
          phase: stryMutAct_9fa48("8118") ? "" : (stryCov_9fa48("8118"), "active"),
          revokedAt: null
        }));
        return next;
      }
    }
    const current = next.get(event.id);
    if (stryMutAct_9fa48("8121") ? current === undefined && current.phase !== "active" : stryMutAct_9fa48("8120") ? false : stryMutAct_9fa48("8119") ? true : (stryCov_9fa48("8119", "8120", "8121"), (stryMutAct_9fa48("8123") ? current !== undefined : stryMutAct_9fa48("8122") ? false : (stryCov_9fa48("8122", "8123"), current === undefined)) || (stryMutAct_9fa48("8125") ? current.phase === "active" : stryMutAct_9fa48("8124") ? false : (stryCov_9fa48("8124", "8125"), current.phase !== (stryMutAct_9fa48("8126") ? "" : (stryCov_9fa48("8126"), "active")))))) return next;
    if (stryMutAct_9fa48("8129") ? event.kind !== "share/revoke" : stryMutAct_9fa48("8128") ? false : stryMutAct_9fa48("8127") ? true : (stryCov_9fa48("8127", "8128", "8129"), event.kind === (stryMutAct_9fa48("8130") ? "" : (stryCov_9fa48("8130"), "share/revoke")))) {
      if (stryMutAct_9fa48("8131")) {
        {}
      } else {
        stryCov_9fa48("8131");
        next.set(event.id, stryMutAct_9fa48("8132") ? {} : (stryCov_9fa48("8132"), {
          ...current,
          phase: stryMutAct_9fa48("8133") ? "" : (stryCov_9fa48("8133"), "revoked"),
          revokedAt: event.at
        }));
      }
    } else if (stryMutAct_9fa48("8137") ? event.at < current.expiresAt : stryMutAct_9fa48("8136") ? event.at > current.expiresAt : stryMutAct_9fa48("8135") ? false : stryMutAct_9fa48("8134") ? true : (stryCov_9fa48("8134", "8135", "8136", "8137"), event.at >= current.expiresAt)) {
      if (stryMutAct_9fa48("8138")) {
        {}
      } else {
        stryCov_9fa48("8138");
        next.set(event.id, stryMutAct_9fa48("8139") ? {} : (stryCov_9fa48("8139"), {
          ...current,
          phase: stryMutAct_9fa48("8140") ? "" : (stryCov_9fa48("8140"), "expired")
        }));
      }
    }
    return next;
  }
}
export function isShareOfferLive(offer: ShareOffer | undefined, at: number): boolean {
  if (stryMutAct_9fa48("8141")) {
    {}
  } else {
    stryCov_9fa48("8141");
    return stryMutAct_9fa48("8144") ? offer !== undefined && offer.phase === "active" || at < offer.expiresAt : stryMutAct_9fa48("8143") ? false : stryMutAct_9fa48("8142") ? true : (stryCov_9fa48("8142", "8143", "8144"), (stryMutAct_9fa48("8146") ? offer !== undefined || offer.phase === "active" : stryMutAct_9fa48("8145") ? true : (stryCov_9fa48("8145", "8146"), (stryMutAct_9fa48("8148") ? offer === undefined : stryMutAct_9fa48("8147") ? true : (stryCov_9fa48("8147", "8148"), offer !== undefined)) && (stryMutAct_9fa48("8150") ? offer.phase !== "active" : stryMutAct_9fa48("8149") ? true : (stryCov_9fa48("8149", "8150"), offer.phase === (stryMutAct_9fa48("8151") ? "" : (stryCov_9fa48("8151"), "active")))))) && (stryMutAct_9fa48("8154") ? at >= offer.expiresAt : stryMutAct_9fa48("8153") ? at <= offer.expiresAt : stryMutAct_9fa48("8152") ? true : (stryCov_9fa48("8152", "8153", "8154"), at < offer.expiresAt)));
  }
}
export function shareOfferPermits(offer: ShareOffer | undefined, input: {
  readonly appId: string;
  readonly targetId: string;
  readonly classId: string;
  readonly tierId: string;
  readonly at: number;
}): boolean {
  if (stryMutAct_9fa48("8155")) {
    {}
  } else {
    stryCov_9fa48("8155");
    return stryMutAct_9fa48("8158") ? isShareOfferLive(offer, input.at) && offer?.appId === input.appId && offer.targetId === input.targetId && offer.classId === input.classId || offer.tierId === input.tierId : stryMutAct_9fa48("8157") ? false : stryMutAct_9fa48("8156") ? true : (stryCov_9fa48("8156", "8157", "8158"), (stryMutAct_9fa48("8160") ? isShareOfferLive(offer, input.at) && offer?.appId === input.appId && offer.targetId === input.targetId || offer.classId === input.classId : stryMutAct_9fa48("8159") ? true : (stryCov_9fa48("8159", "8160"), (stryMutAct_9fa48("8162") ? isShareOfferLive(offer, input.at) && offer?.appId === input.appId || offer.targetId === input.targetId : stryMutAct_9fa48("8161") ? true : (stryCov_9fa48("8161", "8162"), (stryMutAct_9fa48("8164") ? isShareOfferLive(offer, input.at) || offer?.appId === input.appId : stryMutAct_9fa48("8163") ? true : (stryCov_9fa48("8163", "8164"), isShareOfferLive(offer, input.at) && (stryMutAct_9fa48("8166") ? offer?.appId !== input.appId : stryMutAct_9fa48("8165") ? true : (stryCov_9fa48("8165", "8166"), (stryMutAct_9fa48("8167") ? offer.appId : (stryCov_9fa48("8167"), offer?.appId)) === input.appId)))) && (stryMutAct_9fa48("8169") ? offer.targetId !== input.targetId : stryMutAct_9fa48("8168") ? true : (stryCov_9fa48("8168", "8169"), offer.targetId === input.targetId)))) && (stryMutAct_9fa48("8171") ? offer.classId !== input.classId : stryMutAct_9fa48("8170") ? true : (stryCov_9fa48("8170", "8171"), offer.classId === input.classId)))) && (stryMutAct_9fa48("8173") ? offer.tierId !== input.tierId : stryMutAct_9fa48("8172") ? true : (stryCov_9fa48("8172", "8173"), offer.tierId === input.tierId)));
  }
}