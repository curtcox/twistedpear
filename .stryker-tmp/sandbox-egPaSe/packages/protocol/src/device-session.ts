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
import { interpret, type EventClass, type Machine } from "@twistedpear/effects";
export type DeviceSessionPhase = "requested" | "active" | "degraded" | "closed" | "expired" | "revoked";
export interface DeviceSessionState {
  readonly phase: DeviceSessionPhase;
  readonly classId: string;
  readonly tierId: string;
  readonly appId: string;
  readonly openedAt: number;
  readonly expiresAt: number | null;
  readonly closedAt: number | null;
  readonly revokedAt: number | null;
  readonly degradationRung: number;
  readonly holder: string;
}
export type DeviceSessionEvent = {
  readonly kind: "device/open";
  readonly at: number;
  readonly ttlMs: number;
} | {
  readonly kind: "device/degrade";
  readonly at: number;
  readonly rung: number;
} | {
  readonly kind: "device/restore";
  readonly at: number;
  readonly rung: number;
} | {
  readonly kind: "device/close";
  readonly at: number;
} | {
  readonly kind: "device/ttl";
  readonly at: number;
} | {
  readonly kind: "device/revoke";
  readonly at: number;
};
export function initialDeviceSessionState(options: {
  readonly classId: string;
  readonly tierId: string;
  readonly appId: string;
  readonly holder: string;
  readonly openedAt?: number;
}): DeviceSessionState {
  if (stryMutAct_9fa48("7925")) {
    {}
  } else {
    stryCov_9fa48("7925");
    return stryMutAct_9fa48("7926") ? {} : (stryCov_9fa48("7926"), {
      phase: stryMutAct_9fa48("7927") ? "" : (stryCov_9fa48("7927"), "requested"),
      classId: options.classId,
      tierId: options.tierId,
      appId: options.appId,
      openedAt: stryMutAct_9fa48("7928") ? options.openedAt && 0 : (stryCov_9fa48("7928"), options.openedAt ?? 0),
      expiresAt: null,
      closedAt: null,
      revokedAt: null,
      degradationRung: 0,
      holder: options.holder
    });
  }
}
const open: EventClass<DeviceSessionEvent> = stryMutAct_9fa48("7929") ? {} : (stryCov_9fa48("7929"), {
  name: stryMutAct_9fa48("7930") ? "" : (stryCov_9fa48("7930"), "open"),
  matches: stryMutAct_9fa48("7931") ? () => undefined : (stryCov_9fa48("7931"), event => stryMutAct_9fa48("7934") ? event.kind !== "device/open" : stryMutAct_9fa48("7933") ? false : stryMutAct_9fa48("7932") ? true : (stryCov_9fa48("7932", "7933", "7934"), event.kind === (stryMutAct_9fa48("7935") ? "" : (stryCov_9fa48("7935"), "device/open"))))
});
const degrade: EventClass<DeviceSessionEvent> = stryMutAct_9fa48("7936") ? {} : (stryCov_9fa48("7936"), {
  name: stryMutAct_9fa48("7937") ? "" : (stryCov_9fa48("7937"), "degrade"),
  matches: stryMutAct_9fa48("7938") ? () => undefined : (stryCov_9fa48("7938"), event => stryMutAct_9fa48("7941") ? event.kind !== "device/degrade" : stryMutAct_9fa48("7940") ? false : stryMutAct_9fa48("7939") ? true : (stryCov_9fa48("7939", "7940", "7941"), event.kind === (stryMutAct_9fa48("7942") ? "" : (stryCov_9fa48("7942"), "device/degrade"))))
});
const restore: EventClass<DeviceSessionEvent> = stryMutAct_9fa48("7943") ? {} : (stryCov_9fa48("7943"), {
  name: stryMutAct_9fa48("7944") ? "" : (stryCov_9fa48("7944"), "restore"),
  matches: stryMutAct_9fa48("7945") ? () => undefined : (stryCov_9fa48("7945"), event => stryMutAct_9fa48("7948") ? event.kind !== "device/restore" : stryMutAct_9fa48("7947") ? false : stryMutAct_9fa48("7946") ? true : (stryCov_9fa48("7946", "7947", "7948"), event.kind === (stryMutAct_9fa48("7949") ? "" : (stryCov_9fa48("7949"), "device/restore"))))
});
const close: EventClass<DeviceSessionEvent> = stryMutAct_9fa48("7950") ? {} : (stryCov_9fa48("7950"), {
  name: stryMutAct_9fa48("7951") ? "" : (stryCov_9fa48("7951"), "close"),
  matches: stryMutAct_9fa48("7952") ? () => undefined : (stryCov_9fa48("7952"), event => stryMutAct_9fa48("7955") ? event.kind !== "device/close" : stryMutAct_9fa48("7954") ? false : stryMutAct_9fa48("7953") ? true : (stryCov_9fa48("7953", "7954", "7955"), event.kind === (stryMutAct_9fa48("7956") ? "" : (stryCov_9fa48("7956"), "device/close"))))
});
const ttlExpired: EventClass<DeviceSessionEvent> = stryMutAct_9fa48("7957") ? {} : (stryCov_9fa48("7957"), {
  name: stryMutAct_9fa48("7958") ? "" : (stryCov_9fa48("7958"), "ttl/expired"),
  matches: stryMutAct_9fa48("7959") ? () => undefined : (stryCov_9fa48("7959"), event => stryMutAct_9fa48("7962") ? event.kind !== "device/ttl" : stryMutAct_9fa48("7961") ? false : stryMutAct_9fa48("7960") ? true : (stryCov_9fa48("7960", "7961", "7962"), event.kind === (stryMutAct_9fa48("7963") ? "" : (stryCov_9fa48("7963"), "device/ttl"))))
});
const revoke: EventClass<DeviceSessionEvent> = stryMutAct_9fa48("7964") ? {} : (stryCov_9fa48("7964"), {
  name: stryMutAct_9fa48("7965") ? "" : (stryCov_9fa48("7965"), "revoke"),
  matches: stryMutAct_9fa48("7966") ? () => undefined : (stryCov_9fa48("7966"), event => stryMutAct_9fa48("7969") ? event.kind !== "device/revoke" : stryMutAct_9fa48("7968") ? false : stryMutAct_9fa48("7967") ? true : (stryCov_9fa48("7967", "7968", "7969"), event.kind === (stryMutAct_9fa48("7970") ? "" : (stryCov_9fa48("7970"), "device/revoke"))))
});
export const deviceSessionMachine: Machine<DeviceSessionState, DeviceSessionEvent> = stryMutAct_9fa48("7971") ? {} : (stryCov_9fa48("7971"), {
  states: stryMutAct_9fa48("7972") ? [] : (stryCov_9fa48("7972"), [stryMutAct_9fa48("7973") ? "" : (stryCov_9fa48("7973"), "requested"), stryMutAct_9fa48("7974") ? "" : (stryCov_9fa48("7974"), "active"), stryMutAct_9fa48("7975") ? "" : (stryCov_9fa48("7975"), "degraded"), stryMutAct_9fa48("7976") ? "" : (stryCov_9fa48("7976"), "closed"), stryMutAct_9fa48("7977") ? "" : (stryCov_9fa48("7977"), "expired"), stryMutAct_9fa48("7978") ? "" : (stryCov_9fa48("7978"), "revoked")]),
  events: stryMutAct_9fa48("7979") ? [] : (stryCov_9fa48("7979"), [open, degrade, restore, close, ttlExpired, revoke]),
  initial: stryMutAct_9fa48("7980") ? "" : (stryCov_9fa48("7980"), "requested"),
  stateOf: stryMutAct_9fa48("7981") ? () => undefined : (stryCov_9fa48("7981"), state => state.phase),
  withState: stryMutAct_9fa48("7982") ? () => undefined : (stryCov_9fa48("7982"), (state, phase) => stryMutAct_9fa48("7983") ? {} : (stryCov_9fa48("7983"), {
    ...state,
    phase: phase as DeviceSessionPhase
  })),
  table: stryMutAct_9fa48("7984") ? [] : (stryCov_9fa48("7984"), [stryMutAct_9fa48("7985") ? {} : (stryCov_9fa48("7985"), {
    from: stryMutAct_9fa48("7986") ? "" : (stryCov_9fa48("7986"), "requested"),
    on: open,
    to: stryMutAct_9fa48("7987") ? "" : (stryCov_9fa48("7987"), "active"),
    reduce: stryMutAct_9fa48("7988") ? () => undefined : (stryCov_9fa48("7988"), (state, event) => (stryMutAct_9fa48("7991") ? event.kind !== "device/open" : stryMutAct_9fa48("7990") ? false : stryMutAct_9fa48("7989") ? true : (stryCov_9fa48("7989", "7990", "7991"), event.kind === (stryMutAct_9fa48("7992") ? "" : (stryCov_9fa48("7992"), "device/open")))) ? stryMutAct_9fa48("7993") ? {} : (stryCov_9fa48("7993"), {
      ...state,
      openedAt: event.at,
      expiresAt: stryMutAct_9fa48("7994") ? event.at - Math.max(0, event.ttlMs) : (stryCov_9fa48("7994"), event.at + (stryMutAct_9fa48("7995") ? Math.min(0, event.ttlMs) : (stryCov_9fa48("7995"), Math.max(0, event.ttlMs))))
    }) : state)
  }), stryMutAct_9fa48("7996") ? {} : (stryCov_9fa48("7996"), {
    from: stryMutAct_9fa48("7997") ? "" : (stryCov_9fa48("7997"), "active"),
    on: degrade,
    to: stryMutAct_9fa48("7998") ? "" : (stryCov_9fa48("7998"), "degraded"),
    reduce: stryMutAct_9fa48("7999") ? () => undefined : (stryCov_9fa48("7999"), (state, event) => (stryMutAct_9fa48("8002") ? event.kind !== "device/degrade" : stryMutAct_9fa48("8001") ? false : stryMutAct_9fa48("8000") ? true : (stryCov_9fa48("8000", "8001", "8002"), event.kind === (stryMutAct_9fa48("8003") ? "" : (stryCov_9fa48("8003"), "device/degrade")))) ? stryMutAct_9fa48("8004") ? {} : (stryCov_9fa48("8004"), {
      ...state,
      degradationRung: event.rung
    }) : state)
  }), stryMutAct_9fa48("8005") ? {} : (stryCov_9fa48("8005"), {
    from: stryMutAct_9fa48("8006") ? "" : (stryCov_9fa48("8006"), "degraded"),
    on: restore,
    to: stryMutAct_9fa48("8007") ? "" : (stryCov_9fa48("8007"), "active"),
    reduce: stryMutAct_9fa48("8008") ? () => undefined : (stryCov_9fa48("8008"), (state, event) => (stryMutAct_9fa48("8011") ? event.kind !== "device/restore" : stryMutAct_9fa48("8010") ? false : stryMutAct_9fa48("8009") ? true : (stryCov_9fa48("8009", "8010", "8011"), event.kind === (stryMutAct_9fa48("8012") ? "" : (stryCov_9fa48("8012"), "device/restore")))) ? stryMutAct_9fa48("8013") ? {} : (stryCov_9fa48("8013"), {
      ...state,
      degradationRung: event.rung
    }) : state)
  }), stryMutAct_9fa48("8014") ? {} : (stryCov_9fa48("8014"), {
    from: stryMutAct_9fa48("8015") ? "" : (stryCov_9fa48("8015"), "degraded"),
    on: degrade,
    to: stryMutAct_9fa48("8016") ? "" : (stryCov_9fa48("8016"), "degraded"),
    reduce: stryMutAct_9fa48("8017") ? () => undefined : (stryCov_9fa48("8017"), (state, event) => (stryMutAct_9fa48("8020") ? event.kind !== "device/degrade" : stryMutAct_9fa48("8019") ? false : stryMutAct_9fa48("8018") ? true : (stryCov_9fa48("8018", "8019", "8020"), event.kind === (stryMutAct_9fa48("8021") ? "" : (stryCov_9fa48("8021"), "device/degrade")))) ? stryMutAct_9fa48("8022") ? {} : (stryCov_9fa48("8022"), {
      ...state,
      degradationRung: event.rung
    }) : state)
  }), stryMutAct_9fa48("8023") ? {} : (stryCov_9fa48("8023"), {
    from: stryMutAct_9fa48("8024") ? "" : (stryCov_9fa48("8024"), "active"),
    on: close,
    to: stryMutAct_9fa48("8025") ? "" : (stryCov_9fa48("8025"), "closed"),
    reduce: stryMutAct_9fa48("8026") ? () => undefined : (stryCov_9fa48("8026"), (state, event) => (stryMutAct_9fa48("8029") ? event.kind !== "device/close" : stryMutAct_9fa48("8028") ? false : stryMutAct_9fa48("8027") ? true : (stryCov_9fa48("8027", "8028", "8029"), event.kind === (stryMutAct_9fa48("8030") ? "" : (stryCov_9fa48("8030"), "device/close")))) ? stryMutAct_9fa48("8031") ? {} : (stryCov_9fa48("8031"), {
      ...state,
      closedAt: event.at
    }) : state)
  }), stryMutAct_9fa48("8032") ? {} : (stryCov_9fa48("8032"), {
    from: stryMutAct_9fa48("8033") ? "" : (stryCov_9fa48("8033"), "degraded"),
    on: close,
    to: stryMutAct_9fa48("8034") ? "" : (stryCov_9fa48("8034"), "closed"),
    reduce: stryMutAct_9fa48("8035") ? () => undefined : (stryCov_9fa48("8035"), (state, event) => (stryMutAct_9fa48("8038") ? event.kind !== "device/close" : stryMutAct_9fa48("8037") ? false : stryMutAct_9fa48("8036") ? true : (stryCov_9fa48("8036", "8037", "8038"), event.kind === (stryMutAct_9fa48("8039") ? "" : (stryCov_9fa48("8039"), "device/close")))) ? stryMutAct_9fa48("8040") ? {} : (stryCov_9fa48("8040"), {
      ...state,
      closedAt: event.at
    }) : state)
  }), stryMutAct_9fa48("8041") ? {} : (stryCov_9fa48("8041"), {
    from: stryMutAct_9fa48("8042") ? "" : (stryCov_9fa48("8042"), "active"),
    on: ttlExpired,
    to: stryMutAct_9fa48("8043") ? "" : (stryCov_9fa48("8043"), "expired"),
    guard: stryMutAct_9fa48("8044") ? () => undefined : (stryCov_9fa48("8044"), (state, event) => stryMutAct_9fa48("8047") ? event.kind === "device/ttl" && state.expiresAt !== null || event.at >= state.expiresAt : stryMutAct_9fa48("8046") ? false : stryMutAct_9fa48("8045") ? true : (stryCov_9fa48("8045", "8046", "8047"), (stryMutAct_9fa48("8049") ? event.kind === "device/ttl" || state.expiresAt !== null : stryMutAct_9fa48("8048") ? true : (stryCov_9fa48("8048", "8049"), (stryMutAct_9fa48("8051") ? event.kind !== "device/ttl" : stryMutAct_9fa48("8050") ? true : (stryCov_9fa48("8050", "8051"), event.kind === (stryMutAct_9fa48("8052") ? "" : (stryCov_9fa48("8052"), "device/ttl")))) && (stryMutAct_9fa48("8054") ? state.expiresAt === null : stryMutAct_9fa48("8053") ? true : (stryCov_9fa48("8053", "8054"), state.expiresAt !== null)))) && (stryMutAct_9fa48("8057") ? event.at < state.expiresAt : stryMutAct_9fa48("8056") ? event.at > state.expiresAt : stryMutAct_9fa48("8055") ? true : (stryCov_9fa48("8055", "8056", "8057"), event.at >= state.expiresAt))))
  }), stryMutAct_9fa48("8058") ? {} : (stryCov_9fa48("8058"), {
    from: stryMutAct_9fa48("8059") ? "" : (stryCov_9fa48("8059"), "degraded"),
    on: ttlExpired,
    to: stryMutAct_9fa48("8060") ? "" : (stryCov_9fa48("8060"), "expired"),
    guard: stryMutAct_9fa48("8061") ? () => undefined : (stryCov_9fa48("8061"), (state, event) => stryMutAct_9fa48("8064") ? event.kind === "device/ttl" && state.expiresAt !== null || event.at >= state.expiresAt : stryMutAct_9fa48("8063") ? false : stryMutAct_9fa48("8062") ? true : (stryCov_9fa48("8062", "8063", "8064"), (stryMutAct_9fa48("8066") ? event.kind === "device/ttl" || state.expiresAt !== null : stryMutAct_9fa48("8065") ? true : (stryCov_9fa48("8065", "8066"), (stryMutAct_9fa48("8068") ? event.kind !== "device/ttl" : stryMutAct_9fa48("8067") ? true : (stryCov_9fa48("8067", "8068"), event.kind === (stryMutAct_9fa48("8069") ? "" : (stryCov_9fa48("8069"), "device/ttl")))) && (stryMutAct_9fa48("8071") ? state.expiresAt === null : stryMutAct_9fa48("8070") ? true : (stryCov_9fa48("8070", "8071"), state.expiresAt !== null)))) && (stryMutAct_9fa48("8074") ? event.at < state.expiresAt : stryMutAct_9fa48("8073") ? event.at > state.expiresAt : stryMutAct_9fa48("8072") ? true : (stryCov_9fa48("8072", "8073", "8074"), event.at >= state.expiresAt))))
  }), stryMutAct_9fa48("8075") ? {} : (stryCov_9fa48("8075"), {
    from: stryMutAct_9fa48("8076") ? "" : (stryCov_9fa48("8076"), "active"),
    on: revoke,
    to: stryMutAct_9fa48("8077") ? "" : (stryCov_9fa48("8077"), "revoked"),
    reduce: stryMutAct_9fa48("8078") ? () => undefined : (stryCov_9fa48("8078"), (state, event) => (stryMutAct_9fa48("8081") ? event.kind !== "device/revoke" : stryMutAct_9fa48("8080") ? false : stryMutAct_9fa48("8079") ? true : (stryCov_9fa48("8079", "8080", "8081"), event.kind === (stryMutAct_9fa48("8082") ? "" : (stryCov_9fa48("8082"), "device/revoke")))) ? stryMutAct_9fa48("8083") ? {} : (stryCov_9fa48("8083"), {
      ...state,
      revokedAt: event.at
    }) : state)
  }), stryMutAct_9fa48("8084") ? {} : (stryCov_9fa48("8084"), {
    from: stryMutAct_9fa48("8085") ? "" : (stryCov_9fa48("8085"), "degraded"),
    on: revoke,
    to: stryMutAct_9fa48("8086") ? "" : (stryCov_9fa48("8086"), "revoked"),
    reduce: stryMutAct_9fa48("8087") ? () => undefined : (stryCov_9fa48("8087"), (state, event) => (stryMutAct_9fa48("8090") ? event.kind !== "device/revoke" : stryMutAct_9fa48("8089") ? false : stryMutAct_9fa48("8088") ? true : (stryCov_9fa48("8088", "8089", "8090"), event.kind === (stryMutAct_9fa48("8091") ? "" : (stryCov_9fa48("8091"), "device/revoke")))) ? stryMutAct_9fa48("8092") ? {} : (stryCov_9fa48("8092"), {
      ...state,
      revokedAt: event.at
    }) : state)
  })])
});
export const stepDeviceSession = interpret(deviceSessionMachine);
export function isDeviceSessionLive(phase: DeviceSessionPhase): boolean {
  if (stryMutAct_9fa48("8093")) {
    {}
  } else {
    stryCov_9fa48("8093");
    return stryMutAct_9fa48("8096") ? phase === "active" && phase === "degraded" : stryMutAct_9fa48("8095") ? false : stryMutAct_9fa48("8094") ? true : (stryCov_9fa48("8094", "8095", "8096"), (stryMutAct_9fa48("8098") ? phase !== "active" : stryMutAct_9fa48("8097") ? false : (stryCov_9fa48("8097", "8098"), phase === (stryMutAct_9fa48("8099") ? "" : (stryCov_9fa48("8099"), "active")))) || (stryMutAct_9fa48("8101") ? phase !== "degraded" : stryMutAct_9fa48("8100") ? false : (stryCov_9fa48("8100", "8101"), phase === (stryMutAct_9fa48("8102") ? "" : (stryCov_9fa48("8102"), "degraded")))));
  }
}