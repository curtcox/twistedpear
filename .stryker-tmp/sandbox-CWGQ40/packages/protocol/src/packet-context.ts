/**
 * Pure RNS packet context byte constants.
 * Packet construction stays at the adapter edge.
 * Link DATA context dispatch conclusions leave via machine actions (no ad-hoc
 * plan reads beside the step). Plan nested via
 * {@link stepLinkDataContextPlanWithActions}.
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
import type { Event, Intent, StepFn } from "@twistedpear/effects";
export const PacketContextCode = {
  NONE: 0x00,
  RESOURCE: 0x01,
  RESOURCE_ADV: 0x02,
  RESOURCE_REQ: 0x03,
  RESOURCE_HMU: 0x04,
  RESOURCE_PRF: 0x05,
  RESOURCE_ICL: 0x06,
  RESOURCE_RCL: 0x07,
  CACHE_REQUEST: 0x08,
  REQUEST: 0x09,
  RESPONSE: 0x0a,
  PATH_RESPONSE: 0x0b,
  COMMAND: 0x0c,
  COMMAND_STATUS: 0x0d,
  CHANNEL: 0x0e,
  KEEPALIVE: 0xfa,
  LINKIDENTIFY: 0xfb,
  LINKCLOSE: 0xfc,
  LINKPROOF: 0xfd,
  LRRTT: 0xfe,
  LRPROOF: 0xff
} as const;
export type PacketContextCodeValue = (typeof PacketContextCode)[keyof typeof PacketContextCode];

/** Keep transport-announce aliases aligned with PacketContextCode. */
export const PACKET_CONTEXT_NONE = PacketContextCode.NONE;
export const PACKET_CONTEXT_PATH_RESPONSE = PacketContextCode.PATH_RESPONSE;

/** Pure link DATA packet context → handler kind. */
export type LinkDataContextKind = "rtt" | "keepalive" | "close" | "identify" | "request" | "response" | "channel" | "resource-adv" | "resource-req" | "resource-hmu" | "resource-icl" | "resource-rcl" | "resource" | "plaintext" | "ignore";
export function planLinkDataContext(context: number): LinkDataContextKind {
  if (stryMutAct_9fa48("22686")) {
    {}
  } else {
    stryCov_9fa48("22686");
    switch (context) {
      case PacketContextCode.LRRTT:
        if (stryMutAct_9fa48("22687")) {} else {
          stryCov_9fa48("22687");
          return stryMutAct_9fa48("22688") ? "" : (stryCov_9fa48("22688"), "rtt");
        }
      case PacketContextCode.KEEPALIVE:
        if (stryMutAct_9fa48("22689")) {} else {
          stryCov_9fa48("22689");
          return stryMutAct_9fa48("22690") ? "" : (stryCov_9fa48("22690"), "keepalive");
        }
      case PacketContextCode.LINKCLOSE:
        if (stryMutAct_9fa48("22691")) {} else {
          stryCov_9fa48("22691");
          return stryMutAct_9fa48("22692") ? "" : (stryCov_9fa48("22692"), "close");
        }
      case PacketContextCode.LINKIDENTIFY:
        if (stryMutAct_9fa48("22693")) {} else {
          stryCov_9fa48("22693");
          return stryMutAct_9fa48("22694") ? "" : (stryCov_9fa48("22694"), "identify");
        }
      case PacketContextCode.REQUEST:
        if (stryMutAct_9fa48("22695")) {} else {
          stryCov_9fa48("22695");
          return stryMutAct_9fa48("22696") ? "" : (stryCov_9fa48("22696"), "request");
        }
      case PacketContextCode.RESPONSE:
        if (stryMutAct_9fa48("22697")) {} else {
          stryCov_9fa48("22697");
          return stryMutAct_9fa48("22698") ? "" : (stryCov_9fa48("22698"), "response");
        }
      case PacketContextCode.CHANNEL:
        if (stryMutAct_9fa48("22699")) {} else {
          stryCov_9fa48("22699");
          return stryMutAct_9fa48("22700") ? "" : (stryCov_9fa48("22700"), "channel");
        }
      case PacketContextCode.RESOURCE_ADV:
        if (stryMutAct_9fa48("22701")) {} else {
          stryCov_9fa48("22701");
          return stryMutAct_9fa48("22702") ? "" : (stryCov_9fa48("22702"), "resource-adv");
        }
      case PacketContextCode.RESOURCE_REQ:
        if (stryMutAct_9fa48("22703")) {} else {
          stryCov_9fa48("22703");
          return stryMutAct_9fa48("22704") ? "" : (stryCov_9fa48("22704"), "resource-req");
        }
      case PacketContextCode.RESOURCE_HMU:
        if (stryMutAct_9fa48("22705")) {} else {
          stryCov_9fa48("22705");
          return stryMutAct_9fa48("22706") ? "" : (stryCov_9fa48("22706"), "resource-hmu");
        }
      case PacketContextCode.RESOURCE_ICL:
        if (stryMutAct_9fa48("22707")) {} else {
          stryCov_9fa48("22707");
          return stryMutAct_9fa48("22708") ? "" : (stryCov_9fa48("22708"), "resource-icl");
        }
      case PacketContextCode.RESOURCE_RCL:
        if (stryMutAct_9fa48("22709")) {} else {
          stryCov_9fa48("22709");
          return stryMutAct_9fa48("22710") ? "" : (stryCov_9fa48("22710"), "resource-rcl");
        }
      case PacketContextCode.RESOURCE:
        if (stryMutAct_9fa48("22711")) {} else {
          stryCov_9fa48("22711");
          return stryMutAct_9fa48("22712") ? "" : (stryCov_9fa48("22712"), "resource");
        }
      case PacketContextCode.NONE:
        if (stryMutAct_9fa48("22713")) {} else {
          stryCov_9fa48("22713");
          return stryMutAct_9fa48("22714") ? "" : (stryCov_9fa48("22714"), "plaintext");
        }
      default:
        if (stryMutAct_9fa48("22715")) {} else {
          stryCov_9fa48("22715");
          return stryMutAct_9fa48("22716") ? "" : (stryCov_9fa48("22716"), "ignore");
        }
    }
  }
}

/** Whether a packet context byte is the link keepalive context. */
export function isLinkKeepaliveContext(context: number): boolean {
  if (stryMutAct_9fa48("22717")) {
    {}
  } else {
    stryCov_9fa48("22717");
    return stryMutAct_9fa48("22720") ? context !== PacketContextCode.KEEPALIVE : stryMutAct_9fa48("22719") ? false : stryMutAct_9fa48("22718") ? true : (stryCov_9fa48("22718", "22719", "22720"), context === PacketContextCode.KEEPALIVE);
  }
}

/**
 * Link keepalive-context gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkKeepaliveContext`
 * reads beside the step).
 */
export type LinkKeepaliveContextState = Record<string, never>;
export type LinkKeepaliveContextEvent = Event | {
  readonly kind: "link/keepalive-context-gate";
  readonly context: number;
};
export type LinkKeepaliveContextAction = {
  readonly kind: "keepalive";
} | {
  readonly kind: "other";
};
export interface LinkKeepaliveContextStepResult {
  readonly state: LinkKeepaliveContextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkKeepaliveContextAction[];
}
export function initialLinkKeepaliveContextState(): LinkKeepaliveContextState {
  if (stryMutAct_9fa48("22721")) {
    {}
  } else {
    stryCov_9fa48("22721");
    return {};
  }
}
export function stepLinkKeepaliveContextWithActions(state: LinkKeepaliveContextState, event: LinkKeepaliveContextEvent): LinkKeepaliveContextStepResult {
  if (stryMutAct_9fa48("22722")) {
    {}
  } else {
    stryCov_9fa48("22722");
    if (stryMutAct_9fa48("22725") ? event.kind !== "link/keepalive-context-gate" : stryMutAct_9fa48("22724") ? false : stryMutAct_9fa48("22723") ? true : (stryCov_9fa48("22723", "22724", "22725"), event.kind === (stryMutAct_9fa48("22726") ? "" : (stryCov_9fa48("22726"), "link/keepalive-context-gate")))) {
      if (stryMutAct_9fa48("22727")) {
        {}
      } else {
        stryCov_9fa48("22727");
        return stryMutAct_9fa48("22728") ? {} : (stryCov_9fa48("22728"), {
          state,
          intents: stryMutAct_9fa48("22729") ? ["Stryker was here"] : (stryCov_9fa48("22729"), []),
          actions: stryMutAct_9fa48("22730") ? [] : (stryCov_9fa48("22730"), [stryMutAct_9fa48("22731") ? {} : (stryCov_9fa48("22731"), {
            kind: isLinkKeepaliveContext(event.context) ? stryMutAct_9fa48("22732") ? "" : (stryCov_9fa48("22732"), "keepalive") : stryMutAct_9fa48("22733") ? "" : (stryCov_9fa48("22733"), "other")
          })])
        });
      }
    }
    return stryMutAct_9fa48("22734") ? {} : (stryCov_9fa48("22734"), {
      state,
      intents: stryMutAct_9fa48("22735") ? ["Stryker was here"] : (stryCov_9fa48("22735"), []),
      actions: stryMutAct_9fa48("22736") ? ["Stryker was here"] : (stryCov_9fa48("22736"), [])
    });
  }
}
export function shouldTreatLinkKeepaliveContext(actions: ReadonlyArray<LinkKeepaliveContextAction>): boolean {
  if (stryMutAct_9fa48("22737")) {
    {}
  } else {
    stryCov_9fa48("22737");
    return stryMutAct_9fa48("22738") ? actions.every(action => action.kind === "keepalive") : (stryCov_9fa48("22738"), actions.some(stryMutAct_9fa48("22739") ? () => undefined : (stryCov_9fa48("22739"), action => stryMutAct_9fa48("22742") ? action.kind !== "keepalive" : stryMutAct_9fa48("22741") ? false : stryMutAct_9fa48("22740") ? true : (stryCov_9fa48("22740", "22741", "22742"), action.kind === (stryMutAct_9fa48("22743") ? "" : (stryCov_9fa48("22743"), "keepalive"))))));
  }
}
export function shouldTreatLinkKeepaliveOther(actions: ReadonlyArray<LinkKeepaliveContextAction>): boolean {
  if (stryMutAct_9fa48("22744")) {
    {}
  } else {
    stryCov_9fa48("22744");
    return stryMutAct_9fa48("22745") ? actions.every(action => action.kind === "other") : (stryCov_9fa48("22745"), actions.some(stryMutAct_9fa48("22746") ? () => undefined : (stryCov_9fa48("22746"), action => stryMutAct_9fa48("22749") ? action.kind !== "other" : stryMutAct_9fa48("22748") ? false : stryMutAct_9fa48("22747") ? true : (stryCov_9fa48("22747", "22748", "22749"), action.kind === (stryMutAct_9fa48("22750") ? "" : (stryCov_9fa48("22750"), "other"))))));
  }
}

/**
 * Link DATA context plan gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkDataContext` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkDataContextWithActions}.
 */
export type LinkDataContextPlanState = Record<string, never>;
export type LinkDataContextPlanEvent = Event | {
  readonly kind: "link/data-context-plan-gate";
  readonly context: number;
};
export type LinkDataContextPlanAction = {
  readonly kind: LinkDataContextKind;
};
export interface LinkDataContextPlanStepResult {
  readonly state: LinkDataContextPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkDataContextPlanAction[];
}
export function initialLinkDataContextPlanState(): LinkDataContextPlanState {
  if (stryMutAct_9fa48("22751")) {
    {}
  } else {
    stryCov_9fa48("22751");
    return {};
  }
}
export function stepLinkDataContextPlanWithActions(state: LinkDataContextPlanState, event: LinkDataContextPlanEvent): LinkDataContextPlanStepResult {
  if (stryMutAct_9fa48("22752")) {
    {}
  } else {
    stryCov_9fa48("22752");
    if (stryMutAct_9fa48("22755") ? event.kind !== "link/data-context-plan-gate" : stryMutAct_9fa48("22754") ? false : stryMutAct_9fa48("22753") ? true : (stryCov_9fa48("22753", "22754", "22755"), event.kind === (stryMutAct_9fa48("22756") ? "" : (stryCov_9fa48("22756"), "link/data-context-plan-gate")))) {
      if (stryMutAct_9fa48("22757")) {
        {}
      } else {
        stryCov_9fa48("22757");
        return stryMutAct_9fa48("22758") ? {} : (stryCov_9fa48("22758"), {
          state,
          intents: stryMutAct_9fa48("22759") ? ["Stryker was here"] : (stryCov_9fa48("22759"), []),
          actions: stryMutAct_9fa48("22760") ? [] : (stryCov_9fa48("22760"), [stryMutAct_9fa48("22761") ? {} : (stryCov_9fa48("22761"), {
            kind: planLinkDataContext(event.context)
          })])
        });
      }
    }
    return stryMutAct_9fa48("22762") ? {} : (stryCov_9fa48("22762"), {
      state,
      intents: stryMutAct_9fa48("22763") ? ["Stryker was here"] : (stryCov_9fa48("22763"), []),
      actions: stryMutAct_9fa48("22764") ? ["Stryker was here"] : (stryCov_9fa48("22764"), [])
    });
  }
}
export function linkDataContextPlanFromActions(actions: ReadonlyArray<LinkDataContextPlanAction>): LinkDataContextKind | null {
  if (stryMutAct_9fa48("22765")) {
    {}
  } else {
    stryCov_9fa48("22765");
    const action = actions[0];
    return stryMutAct_9fa48("22766") ? action?.kind && null : (stryCov_9fa48("22766"), (stryMutAct_9fa48("22767") ? action.kind : (stryCov_9fa48("22767"), action?.kind)) ?? null);
  }
}

/**
 * Link DATA context dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkDataContextPlanWithActions}
 * (`rtt`|`keepalive`|`close`|`identify`|`request`|`response`|`channel`|
 * `resource-*`|`plaintext`|`ignore`).
 */
export type LinkDataContextState = Record<string, never>;
export type LinkDataContextEvent = Event | {
  readonly kind: "link/data-context-gate";
  readonly context: number;
};

/**
 * Plan nested via {@link stepLinkDataContextPlanWithActions}
 * (`rtt`|`keepalive`|`close`|`identify`|`request`|`response`|`channel`|
 * `resource-*`|`plaintext`|`ignore`).
 */
export type LinkDataContextAction = {
  readonly kind: LinkDataContextKind;
};
export interface LinkDataContextStepResult {
  readonly state: LinkDataContextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkDataContextAction[];
}
export function initialLinkDataContextState(): LinkDataContextState {
  if (stryMutAct_9fa48("22768")) {
    {}
  } else {
    stryCov_9fa48("22768");
    return {};
  }
}
export const stepLinkDataContext: StepFn<LinkDataContextState> = (state, event) => {
  if (stryMutAct_9fa48("22769")) {
    {}
  } else {
    stryCov_9fa48("22769");
    const result = stepLinkDataContextInner(state, event as LinkDataContextEvent);
    return stryMutAct_9fa48("22770") ? {} : (stryCov_9fa48("22770"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkDataContextWithActions(state: LinkDataContextState, event: LinkDataContextEvent): LinkDataContextStepResult {
  if (stryMutAct_9fa48("22771")) {
    {}
  } else {
    stryCov_9fa48("22771");
    return stepLinkDataContextInner(state, event);
  }
}
export function linkDataContextFromActions(actions: ReadonlyArray<LinkDataContextAction>): LinkDataContextKind | null {
  if (stryMutAct_9fa48("22772")) {
    {}
  } else {
    stryCov_9fa48("22772");
    const action = actions[0];
    return stryMutAct_9fa48("22773") ? action?.kind && null : (stryCov_9fa48("22773"), (stryMutAct_9fa48("22774") ? action.kind : (stryCov_9fa48("22774"), action?.kind)) ?? null);
  }
}
export function shouldHandleLinkDataRtt(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22775")) {
    {}
  } else {
    stryCov_9fa48("22775");
    return stryMutAct_9fa48("22776") ? actions.every(action => action.kind === "rtt") : (stryCov_9fa48("22776"), actions.some(stryMutAct_9fa48("22777") ? () => undefined : (stryCov_9fa48("22777"), action => stryMutAct_9fa48("22780") ? action.kind !== "rtt" : stryMutAct_9fa48("22779") ? false : stryMutAct_9fa48("22778") ? true : (stryCov_9fa48("22778", "22779", "22780"), action.kind === (stryMutAct_9fa48("22781") ? "" : (stryCov_9fa48("22781"), "rtt"))))));
  }
}
export function shouldHandleLinkDataKeepalive(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22782")) {
    {}
  } else {
    stryCov_9fa48("22782");
    return stryMutAct_9fa48("22783") ? actions.every(action => action.kind === "keepalive") : (stryCov_9fa48("22783"), actions.some(stryMutAct_9fa48("22784") ? () => undefined : (stryCov_9fa48("22784"), action => stryMutAct_9fa48("22787") ? action.kind !== "keepalive" : stryMutAct_9fa48("22786") ? false : stryMutAct_9fa48("22785") ? true : (stryCov_9fa48("22785", "22786", "22787"), action.kind === (stryMutAct_9fa48("22788") ? "" : (stryCov_9fa48("22788"), "keepalive"))))));
  }
}
export function shouldHandleLinkDataClose(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22789")) {
    {}
  } else {
    stryCov_9fa48("22789");
    return stryMutAct_9fa48("22790") ? actions.every(action => action.kind === "close") : (stryCov_9fa48("22790"), actions.some(stryMutAct_9fa48("22791") ? () => undefined : (stryCov_9fa48("22791"), action => stryMutAct_9fa48("22794") ? action.kind !== "close" : stryMutAct_9fa48("22793") ? false : stryMutAct_9fa48("22792") ? true : (stryCov_9fa48("22792", "22793", "22794"), action.kind === (stryMutAct_9fa48("22795") ? "" : (stryCov_9fa48("22795"), "close"))))));
  }
}
export function shouldHandleLinkDataIdentify(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22796")) {
    {}
  } else {
    stryCov_9fa48("22796");
    return stryMutAct_9fa48("22797") ? actions.every(action => action.kind === "identify") : (stryCov_9fa48("22797"), actions.some(stryMutAct_9fa48("22798") ? () => undefined : (stryCov_9fa48("22798"), action => stryMutAct_9fa48("22801") ? action.kind !== "identify" : stryMutAct_9fa48("22800") ? false : stryMutAct_9fa48("22799") ? true : (stryCov_9fa48("22799", "22800", "22801"), action.kind === (stryMutAct_9fa48("22802") ? "" : (stryCov_9fa48("22802"), "identify"))))));
  }
}
export function shouldHandleLinkDataRequest(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22803")) {
    {}
  } else {
    stryCov_9fa48("22803");
    return stryMutAct_9fa48("22804") ? actions.every(action => action.kind === "request") : (stryCov_9fa48("22804"), actions.some(stryMutAct_9fa48("22805") ? () => undefined : (stryCov_9fa48("22805"), action => stryMutAct_9fa48("22808") ? action.kind !== "request" : stryMutAct_9fa48("22807") ? false : stryMutAct_9fa48("22806") ? true : (stryCov_9fa48("22806", "22807", "22808"), action.kind === (stryMutAct_9fa48("22809") ? "" : (stryCov_9fa48("22809"), "request"))))));
  }
}
export function shouldHandleLinkDataResponse(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22810")) {
    {}
  } else {
    stryCov_9fa48("22810");
    return stryMutAct_9fa48("22811") ? actions.every(action => action.kind === "response") : (stryCov_9fa48("22811"), actions.some(stryMutAct_9fa48("22812") ? () => undefined : (stryCov_9fa48("22812"), action => stryMutAct_9fa48("22815") ? action.kind !== "response" : stryMutAct_9fa48("22814") ? false : stryMutAct_9fa48("22813") ? true : (stryCov_9fa48("22813", "22814", "22815"), action.kind === (stryMutAct_9fa48("22816") ? "" : (stryCov_9fa48("22816"), "response"))))));
  }
}
export function shouldHandleLinkDataChannel(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22817")) {
    {}
  } else {
    stryCov_9fa48("22817");
    return stryMutAct_9fa48("22818") ? actions.every(action => action.kind === "channel") : (stryCov_9fa48("22818"), actions.some(stryMutAct_9fa48("22819") ? () => undefined : (stryCov_9fa48("22819"), action => stryMutAct_9fa48("22822") ? action.kind !== "channel" : stryMutAct_9fa48("22821") ? false : stryMutAct_9fa48("22820") ? true : (stryCov_9fa48("22820", "22821", "22822"), action.kind === (stryMutAct_9fa48("22823") ? "" : (stryCov_9fa48("22823"), "channel"))))));
  }
}
export function shouldHandleLinkDataResourceAdv(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22824")) {
    {}
  } else {
    stryCov_9fa48("22824");
    return stryMutAct_9fa48("22825") ? actions.every(action => action.kind === "resource-adv") : (stryCov_9fa48("22825"), actions.some(stryMutAct_9fa48("22826") ? () => undefined : (stryCov_9fa48("22826"), action => stryMutAct_9fa48("22829") ? action.kind !== "resource-adv" : stryMutAct_9fa48("22828") ? false : stryMutAct_9fa48("22827") ? true : (stryCov_9fa48("22827", "22828", "22829"), action.kind === (stryMutAct_9fa48("22830") ? "" : (stryCov_9fa48("22830"), "resource-adv"))))));
  }
}
export function shouldHandleLinkDataResourceReq(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22831")) {
    {}
  } else {
    stryCov_9fa48("22831");
    return stryMutAct_9fa48("22832") ? actions.every(action => action.kind === "resource-req") : (stryCov_9fa48("22832"), actions.some(stryMutAct_9fa48("22833") ? () => undefined : (stryCov_9fa48("22833"), action => stryMutAct_9fa48("22836") ? action.kind !== "resource-req" : stryMutAct_9fa48("22835") ? false : stryMutAct_9fa48("22834") ? true : (stryCov_9fa48("22834", "22835", "22836"), action.kind === (stryMutAct_9fa48("22837") ? "" : (stryCov_9fa48("22837"), "resource-req"))))));
  }
}
export function shouldHandleLinkDataResourceHmu(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22838")) {
    {}
  } else {
    stryCov_9fa48("22838");
    return stryMutAct_9fa48("22839") ? actions.every(action => action.kind === "resource-hmu") : (stryCov_9fa48("22839"), actions.some(stryMutAct_9fa48("22840") ? () => undefined : (stryCov_9fa48("22840"), action => stryMutAct_9fa48("22843") ? action.kind !== "resource-hmu" : stryMutAct_9fa48("22842") ? false : stryMutAct_9fa48("22841") ? true : (stryCov_9fa48("22841", "22842", "22843"), action.kind === (stryMutAct_9fa48("22844") ? "" : (stryCov_9fa48("22844"), "resource-hmu"))))));
  }
}
export function shouldHandleLinkDataResourceIcl(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22845")) {
    {}
  } else {
    stryCov_9fa48("22845");
    return stryMutAct_9fa48("22846") ? actions.every(action => action.kind === "resource-icl") : (stryCov_9fa48("22846"), actions.some(stryMutAct_9fa48("22847") ? () => undefined : (stryCov_9fa48("22847"), action => stryMutAct_9fa48("22850") ? action.kind !== "resource-icl" : stryMutAct_9fa48("22849") ? false : stryMutAct_9fa48("22848") ? true : (stryCov_9fa48("22848", "22849", "22850"), action.kind === (stryMutAct_9fa48("22851") ? "" : (stryCov_9fa48("22851"), "resource-icl"))))));
  }
}
export function shouldHandleLinkDataResourceRcl(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22852")) {
    {}
  } else {
    stryCov_9fa48("22852");
    return stryMutAct_9fa48("22853") ? actions.every(action => action.kind === "resource-rcl") : (stryCov_9fa48("22853"), actions.some(stryMutAct_9fa48("22854") ? () => undefined : (stryCov_9fa48("22854"), action => stryMutAct_9fa48("22857") ? action.kind !== "resource-rcl" : stryMutAct_9fa48("22856") ? false : stryMutAct_9fa48("22855") ? true : (stryCov_9fa48("22855", "22856", "22857"), action.kind === (stryMutAct_9fa48("22858") ? "" : (stryCov_9fa48("22858"), "resource-rcl"))))));
  }
}
export function shouldHandleLinkDataResource(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22859")) {
    {}
  } else {
    stryCov_9fa48("22859");
    return stryMutAct_9fa48("22860") ? actions.every(action => action.kind === "resource") : (stryCov_9fa48("22860"), actions.some(stryMutAct_9fa48("22861") ? () => undefined : (stryCov_9fa48("22861"), action => stryMutAct_9fa48("22864") ? action.kind !== "resource" : stryMutAct_9fa48("22863") ? false : stryMutAct_9fa48("22862") ? true : (stryCov_9fa48("22862", "22863", "22864"), action.kind === (stryMutAct_9fa48("22865") ? "" : (stryCov_9fa48("22865"), "resource"))))));
  }
}
export function shouldHandleLinkDataPlaintext(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22866")) {
    {}
  } else {
    stryCov_9fa48("22866");
    return stryMutAct_9fa48("22867") ? actions.every(action => action.kind === "plaintext") : (stryCov_9fa48("22867"), actions.some(stryMutAct_9fa48("22868") ? () => undefined : (stryCov_9fa48("22868"), action => stryMutAct_9fa48("22871") ? action.kind !== "plaintext" : stryMutAct_9fa48("22870") ? false : stryMutAct_9fa48("22869") ? true : (stryCov_9fa48("22869", "22870", "22871"), action.kind === (stryMutAct_9fa48("22872") ? "" : (stryCov_9fa48("22872"), "plaintext"))))));
  }
}
export function shouldIgnoreLinkDataContext(actions: ReadonlyArray<LinkDataContextAction>): boolean {
  if (stryMutAct_9fa48("22873")) {
    {}
  } else {
    stryCov_9fa48("22873");
    return stryMutAct_9fa48("22874") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("22874"), actions.some(stryMutAct_9fa48("22875") ? () => undefined : (stryCov_9fa48("22875"), action => stryMutAct_9fa48("22878") ? action.kind !== "ignore" : stryMutAct_9fa48("22877") ? false : stryMutAct_9fa48("22876") ? true : (stryCov_9fa48("22876", "22877", "22878"), action.kind === (stryMutAct_9fa48("22879") ? "" : (stryCov_9fa48("22879"), "ignore"))))));
  }
}
function stepLinkDataContextInner(state: LinkDataContextState, event: LinkDataContextEvent): LinkDataContextStepResult {
  if (stryMutAct_9fa48("22880")) {
    {}
  } else {
    stryCov_9fa48("22880");
    if (stryMutAct_9fa48("22883") ? event.kind !== "link/data-context-gate" : stryMutAct_9fa48("22882") ? false : stryMutAct_9fa48("22881") ? true : (stryCov_9fa48("22881", "22882", "22883"), event.kind === (stryMutAct_9fa48("22884") ? "" : (stryCov_9fa48("22884"), "link/data-context-gate")))) {
      if (stryMutAct_9fa48("22885")) {
        {}
      } else {
        stryCov_9fa48("22885");
        const planActions = stepLinkDataContextPlanWithActions(initialLinkDataContextPlanState(), stryMutAct_9fa48("22886") ? {} : (stryCov_9fa48("22886"), {
          kind: stryMutAct_9fa48("22887") ? "" : (stryCov_9fa48("22887"), "link/data-context-plan-gate"),
          context: event.context
        })).actions;
        const plan = linkDataContextPlanFromActions(planActions);
        if (stryMutAct_9fa48("22890") ? plan !== null : stryMutAct_9fa48("22889") ? false : stryMutAct_9fa48("22888") ? true : (stryCov_9fa48("22888", "22889", "22890"), plan === null)) {
          if (stryMutAct_9fa48("22891")) {
            {}
          } else {
            stryCov_9fa48("22891");
            return stryMutAct_9fa48("22892") ? {} : (stryCov_9fa48("22892"), {
              state,
              intents: stryMutAct_9fa48("22893") ? ["Stryker was here"] : (stryCov_9fa48("22893"), []),
              actions: stryMutAct_9fa48("22894") ? ["Stryker was here"] : (stryCov_9fa48("22894"), [])
            });
          }
        }
        return stryMutAct_9fa48("22895") ? {} : (stryCov_9fa48("22895"), {
          state,
          intents: stryMutAct_9fa48("22896") ? ["Stryker was here"] : (stryCov_9fa48("22896"), []),
          actions: stryMutAct_9fa48("22897") ? [] : (stryCov_9fa48("22897"), [stryMutAct_9fa48("22898") ? {} : (stryCov_9fa48("22898"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("22899") ? {} : (stryCov_9fa48("22899"), {
      state,
      intents: stryMutAct_9fa48("22900") ? ["Stryker was here"] : (stryCov_9fa48("22900"), []),
      actions: stryMutAct_9fa48("22901") ? ["Stryker was here"] : (stryCov_9fa48("22901"), [])
    });
  }
}