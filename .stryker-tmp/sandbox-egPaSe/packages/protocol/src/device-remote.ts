/**
 * Serving-host remote device grant policy (Sans-IO).
 * Grants never survive a host restart — callers drop the store on reboot.
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
export type RemoteGrantPhase = "active" | "expired" | "revoked";
export interface RemoteDeviceGrant {
  readonly peerId: string;
  readonly classId: string;
  readonly tierId: string;
  readonly expiresAt: number;
  readonly phase: RemoteGrantPhase;
  readonly grantedAt: number;
  readonly revokedAt: number | null;
  readonly maxConcurrent: number;
  readonly maxSessionMs: number;
}
export type RemoteGrantEvent = {
  readonly kind: "remote/grant";
  readonly at: number;
  readonly peerId: string;
  readonly classId: string;
  readonly tierId: string;
  readonly ttlMs: number;
  readonly maxConcurrent?: number;
  readonly maxSessionMs?: number;
} | {
  readonly kind: "remote/revoke";
  readonly at: number;
  readonly peerId: string;
  readonly classId: string;
  readonly tierId: string;
} | {
  readonly kind: "remote/ttl";
  readonly at: number;
  readonly peerId: string;
  readonly classId: string;
  readonly tierId: string;
} | {
  readonly kind: "remote/clear-all";
  readonly at: number;
};
export function remoteGrantKey(peerId: string, classId: string, tierId: string): string {
  if (stryMutAct_9fa48("7862")) {
    {}
  } else {
    stryCov_9fa48("7862");
    return stryMutAct_9fa48("7863") ? `` : (stryCov_9fa48("7863"), `${peerId}\0${classId}\0${tierId}`);
  }
}
export function initialRemoteGrantStore(): ReadonlyMap<string, RemoteDeviceGrant> {
  if (stryMutAct_9fa48("7864")) {
    {}
  } else {
    stryCov_9fa48("7864");
    return new Map();
  }
}
export function stepRemoteGrantStore(store: ReadonlyMap<string, RemoteDeviceGrant>, event: RemoteGrantEvent): ReadonlyMap<string, RemoteDeviceGrant> {
  if (stryMutAct_9fa48("7865")) {
    {}
  } else {
    stryCov_9fa48("7865");
    const next = new Map(store);
    if (stryMutAct_9fa48("7868") ? event.kind !== "remote/clear-all" : stryMutAct_9fa48("7867") ? false : stryMutAct_9fa48("7866") ? true : (stryCov_9fa48("7866", "7867", "7868"), event.kind === (stryMutAct_9fa48("7869") ? "" : (stryCov_9fa48("7869"), "remote/clear-all")))) {
      if (stryMutAct_9fa48("7870")) {
        {}
      } else {
        stryCov_9fa48("7870");
        return new Map();
      }
    }
    if (stryMutAct_9fa48("7873") ? event.kind !== "remote/grant" : stryMutAct_9fa48("7872") ? false : stryMutAct_9fa48("7871") ? true : (stryCov_9fa48("7871", "7872", "7873"), event.kind === (stryMutAct_9fa48("7874") ? "" : (stryCov_9fa48("7874"), "remote/grant")))) {
      if (stryMutAct_9fa48("7875")) {
        {}
      } else {
        stryCov_9fa48("7875");
        const key = remoteGrantKey(event.peerId, event.classId, event.tierId);
        next.set(key, stryMutAct_9fa48("7876") ? {} : (stryCov_9fa48("7876"), {
          peerId: event.peerId,
          classId: event.classId,
          tierId: event.tierId,
          grantedAt: event.at,
          expiresAt: stryMutAct_9fa48("7877") ? event.at - Math.max(0, event.ttlMs) : (stryCov_9fa48("7877"), event.at + (stryMutAct_9fa48("7878") ? Math.min(0, event.ttlMs) : (stryCov_9fa48("7878"), Math.max(0, event.ttlMs)))),
          phase: stryMutAct_9fa48("7879") ? "" : (stryCov_9fa48("7879"), "active"),
          revokedAt: null,
          maxConcurrent: stryMutAct_9fa48("7880") ? event.maxConcurrent && 1 : (stryCov_9fa48("7880"), event.maxConcurrent ?? 1),
          maxSessionMs: stryMutAct_9fa48("7881") ? event.maxSessionMs && Math.min(event.ttlMs, 15 * 60_000) : (stryCov_9fa48("7881"), event.maxSessionMs ?? (stryMutAct_9fa48("7882") ? Math.max(event.ttlMs, 15 * 60_000) : (stryCov_9fa48("7882"), Math.min(event.ttlMs, stryMutAct_9fa48("7883") ? 15 / 60_000 : (stryCov_9fa48("7883"), 15 * 60_000)))))
        }));
        return next;
      }
    }
    const key = remoteGrantKey(event.peerId, event.classId, event.tierId);
    const current = next.get(key);
    if (stryMutAct_9fa48("7886") ? current !== undefined : stryMutAct_9fa48("7885") ? false : stryMutAct_9fa48("7884") ? true : (stryCov_9fa48("7884", "7885", "7886"), current === undefined)) return next;
    if (stryMutAct_9fa48("7889") ? event.kind !== "remote/revoke" : stryMutAct_9fa48("7888") ? false : stryMutAct_9fa48("7887") ? true : (stryCov_9fa48("7887", "7888", "7889"), event.kind === (stryMutAct_9fa48("7890") ? "" : (stryCov_9fa48("7890"), "remote/revoke")))) {
      if (stryMutAct_9fa48("7891")) {
        {}
      } else {
        stryCov_9fa48("7891");
        next.set(key, stryMutAct_9fa48("7892") ? {} : (stryCov_9fa48("7892"), {
          ...current,
          phase: stryMutAct_9fa48("7893") ? "" : (stryCov_9fa48("7893"), "revoked"),
          revokedAt: event.at
        }));
        return next;
      }
    }
    if (stryMutAct_9fa48("7896") ? event.kind === "remote/ttl" && current.phase === "active" || event.at >= current.expiresAt : stryMutAct_9fa48("7895") ? false : stryMutAct_9fa48("7894") ? true : (stryCov_9fa48("7894", "7895", "7896"), (stryMutAct_9fa48("7898") ? event.kind === "remote/ttl" || current.phase === "active" : stryMutAct_9fa48("7897") ? true : (stryCov_9fa48("7897", "7898"), (stryMutAct_9fa48("7900") ? event.kind !== "remote/ttl" : stryMutAct_9fa48("7899") ? true : (stryCov_9fa48("7899", "7900"), event.kind === (stryMutAct_9fa48("7901") ? "" : (stryCov_9fa48("7901"), "remote/ttl")))) && (stryMutAct_9fa48("7903") ? current.phase !== "active" : stryMutAct_9fa48("7902") ? true : (stryCov_9fa48("7902", "7903"), current.phase === (stryMutAct_9fa48("7904") ? "" : (stryCov_9fa48("7904"), "active")))))) && (stryMutAct_9fa48("7907") ? event.at < current.expiresAt : stryMutAct_9fa48("7906") ? event.at > current.expiresAt : stryMutAct_9fa48("7905") ? true : (stryCov_9fa48("7905", "7906", "7907"), event.at >= current.expiresAt)))) {
      if (stryMutAct_9fa48("7908")) {
        {}
      } else {
        stryCov_9fa48("7908");
        next.set(key, stryMutAct_9fa48("7909") ? {} : (stryCov_9fa48("7909"), {
          ...current,
          phase: stryMutAct_9fa48("7910") ? "" : (stryCov_9fa48("7910"), "expired")
        }));
      }
    }
    return next;
  }
}
export function isRemoteGrantLive(grant: RemoteDeviceGrant | undefined, at: number): boolean {
  if (stryMutAct_9fa48("7911")) {
    {}
  } else {
    stryCov_9fa48("7911");
    if (stryMutAct_9fa48("7914") ? grant === undefined && grant.phase !== "active" : stryMutAct_9fa48("7913") ? false : stryMutAct_9fa48("7912") ? true : (stryCov_9fa48("7912", "7913", "7914"), (stryMutAct_9fa48("7916") ? grant !== undefined : stryMutAct_9fa48("7915") ? false : (stryCov_9fa48("7915", "7916"), grant === undefined)) || (stryMutAct_9fa48("7918") ? grant.phase === "active" : stryMutAct_9fa48("7917") ? false : (stryCov_9fa48("7917", "7918"), grant.phase !== (stryMutAct_9fa48("7919") ? "" : (stryCov_9fa48("7919"), "active")))))) return stryMutAct_9fa48("7920") ? true : (stryCov_9fa48("7920"), false);
    return stryMutAct_9fa48("7924") ? at >= grant.expiresAt : stryMutAct_9fa48("7923") ? at <= grant.expiresAt : stryMutAct_9fa48("7922") ? false : stryMutAct_9fa48("7921") ? true : (stryCov_9fa48("7921", "7922", "7923", "7924"), at < grant.expiresAt);
  }
}