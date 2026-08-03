/**
 * Pure interface reconnect scheduling decisions and timer step machine.
 * Socket connect / timer arming stay at the adapter edge.
 * Interface name / MTU / closed / send / enqueue / deliver / yield gates
 * conclude via machine actions (no ad-hoc `isValidInterfaceName` /
 * `packetFitsInterfaceMtu` / `isInterfaceClosed` / `canInterfaceSend` /
 * `shouldEnqueueRawInterfaceFrame` / `shouldEnqueueDecodedPacket` /
 * `shouldDeliverQueuedPacket` / `shouldYieldBufferedPacket` reads beside
 * the step). Reconnect plan nested via
 * {@link stepInterfaceReconnectPlanWithActions} (`reconnect`|`give-up`).
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
export const INTERFACE_RECONNECT_WAIT_MS = 5_000;
export const INTERFACE_RECONNECT_TIMER_ID = stryMutAct_9fa48("11380") ? "" : (stryCov_9fa48("11380"), "interface-reconnect");

/** Whether an interface name is non-empty (RNS interface config). */
export function isValidInterfaceName(name: string): boolean {
  if (stryMutAct_9fa48("11381")) {
    {}
  } else {
    stryCov_9fa48("11381");
    return stryMutAct_9fa48("11385") ? name.length <= 0 : stryMutAct_9fa48("11384") ? name.length >= 0 : stryMutAct_9fa48("11383") ? false : stryMutAct_9fa48("11382") ? true : (stryCov_9fa48("11382", "11383", "11384", "11385"), name.length > 0);
  }
}

/**
 * Interface-name validity gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isValidInterfaceName`
 * reads beside the step).
 */
export type InterfaceNameValidState = Record<string, never>;
export type InterfaceNameValidEvent = Event | {
  readonly kind: "iface/name-valid-gate";
  readonly name: string;
};
export type InterfaceNameValidAction = {
  readonly kind: "valid";
} | {
  readonly kind: "invalid";
};
export interface InterfaceNameValidStepResult {
  readonly state: InterfaceNameValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceNameValidAction[];
}
export function initialInterfaceNameValidState(): InterfaceNameValidState {
  if (stryMutAct_9fa48("11386")) {
    {}
  } else {
    stryCov_9fa48("11386");
    return {};
  }
}
export function stepInterfaceNameValidWithActions(state: InterfaceNameValidState, event: InterfaceNameValidEvent): InterfaceNameValidStepResult {
  if (stryMutAct_9fa48("11387")) {
    {}
  } else {
    stryCov_9fa48("11387");
    if (stryMutAct_9fa48("11390") ? event.kind !== "iface/name-valid-gate" : stryMutAct_9fa48("11389") ? false : stryMutAct_9fa48("11388") ? true : (stryCov_9fa48("11388", "11389", "11390"), event.kind === (stryMutAct_9fa48("11391") ? "" : (stryCov_9fa48("11391"), "iface/name-valid-gate")))) {
      if (stryMutAct_9fa48("11392")) {
        {}
      } else {
        stryCov_9fa48("11392");
        return stryMutAct_9fa48("11393") ? {} : (stryCov_9fa48("11393"), {
          state,
          intents: stryMutAct_9fa48("11394") ? ["Stryker was here"] : (stryCov_9fa48("11394"), []),
          actions: stryMutAct_9fa48("11395") ? [] : (stryCov_9fa48("11395"), [stryMutAct_9fa48("11396") ? {} : (stryCov_9fa48("11396"), {
            kind: isValidInterfaceName(event.name) ? stryMutAct_9fa48("11397") ? "" : (stryCov_9fa48("11397"), "valid") : stryMutAct_9fa48("11398") ? "" : (stryCov_9fa48("11398"), "invalid")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11399") ? {} : (stryCov_9fa48("11399"), {
      state,
      intents: stryMutAct_9fa48("11400") ? ["Stryker was here"] : (stryCov_9fa48("11400"), []),
      actions: stryMutAct_9fa48("11401") ? ["Stryker was here"] : (stryCov_9fa48("11401"), [])
    });
  }
}
export function shouldAcceptInterfaceName(actions: ReadonlyArray<InterfaceNameValidAction>): boolean {
  if (stryMutAct_9fa48("11402")) {
    {}
  } else {
    stryCov_9fa48("11402");
    return stryMutAct_9fa48("11403") ? actions.every(action => action.kind === "valid") : (stryCov_9fa48("11403"), actions.some(stryMutAct_9fa48("11404") ? () => undefined : (stryCov_9fa48("11404"), action => stryMutAct_9fa48("11407") ? action.kind !== "valid" : stryMutAct_9fa48("11406") ? false : stryMutAct_9fa48("11405") ? true : (stryCov_9fa48("11405", "11406", "11407"), action.kind === (stryMutAct_9fa48("11408") ? "" : (stryCov_9fa48("11408"), "valid"))))));
  }
}
export function shouldRejectInterfaceName(actions: ReadonlyArray<InterfaceNameValidAction>): boolean {
  if (stryMutAct_9fa48("11409")) {
    {}
  } else {
    stryCov_9fa48("11409");
    return stryMutAct_9fa48("11410") ? actions.every(action => action.kind === "invalid") : (stryCov_9fa48("11410"), actions.some(stryMutAct_9fa48("11411") ? () => undefined : (stryCov_9fa48("11411"), action => stryMutAct_9fa48("11414") ? action.kind !== "invalid" : stryMutAct_9fa48("11413") ? false : stryMutAct_9fa48("11412") ? true : (stryCov_9fa48("11412", "11413", "11414"), action.kind === (stryMutAct_9fa48("11415") ? "" : (stryCov_9fa48("11415"), "invalid"))))));
  }
}

/** Whether a packet's raw length fits the interface MTU. */
export function packetFitsInterfaceMtu(rawLength: number, mtu: number): boolean {
  if (stryMutAct_9fa48("11416")) {
    {}
  } else {
    stryCov_9fa48("11416");
    return stryMutAct_9fa48("11420") ? rawLength > mtu : stryMutAct_9fa48("11419") ? rawLength < mtu : stryMutAct_9fa48("11418") ? false : stryMutAct_9fa48("11417") ? true : (stryCov_9fa48("11417", "11418", "11419", "11420"), rawLength <= mtu);
  }
}

/**
 * Interface MTU fitness gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packetFitsInterfaceMtu`
 * reads beside the step).
 */
export type InterfaceMtuFitState = Record<string, never>;
export type InterfaceMtuFitEvent = Event | {
  readonly kind: "iface/mtu-fit-gate";
  readonly rawLength: number;
  readonly mtu: number;
};
export type InterfaceMtuFitAction = {
  readonly kind: "fit";
} | {
  readonly kind: "overflow";
};
export interface InterfaceMtuFitStepResult {
  readonly state: InterfaceMtuFitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceMtuFitAction[];
}
export function initialInterfaceMtuFitState(): InterfaceMtuFitState {
  if (stryMutAct_9fa48("11421")) {
    {}
  } else {
    stryCov_9fa48("11421");
    return {};
  }
}
export function stepInterfaceMtuFitWithActions(state: InterfaceMtuFitState, event: InterfaceMtuFitEvent): InterfaceMtuFitStepResult {
  if (stryMutAct_9fa48("11422")) {
    {}
  } else {
    stryCov_9fa48("11422");
    if (stryMutAct_9fa48("11425") ? event.kind !== "iface/mtu-fit-gate" : stryMutAct_9fa48("11424") ? false : stryMutAct_9fa48("11423") ? true : (stryCov_9fa48("11423", "11424", "11425"), event.kind === (stryMutAct_9fa48("11426") ? "" : (stryCov_9fa48("11426"), "iface/mtu-fit-gate")))) {
      if (stryMutAct_9fa48("11427")) {
        {}
      } else {
        stryCov_9fa48("11427");
        return stryMutAct_9fa48("11428") ? {} : (stryCov_9fa48("11428"), {
          state,
          intents: stryMutAct_9fa48("11429") ? ["Stryker was here"] : (stryCov_9fa48("11429"), []),
          actions: stryMutAct_9fa48("11430") ? [] : (stryCov_9fa48("11430"), [stryMutAct_9fa48("11431") ? {} : (stryCov_9fa48("11431"), {
            kind: packetFitsInterfaceMtu(event.rawLength, event.mtu) ? stryMutAct_9fa48("11432") ? "" : (stryCov_9fa48("11432"), "fit") : stryMutAct_9fa48("11433") ? "" : (stryCov_9fa48("11433"), "overflow")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11434") ? {} : (stryCov_9fa48("11434"), {
      state,
      intents: stryMutAct_9fa48("11435") ? ["Stryker was here"] : (stryCov_9fa48("11435"), []),
      actions: stryMutAct_9fa48("11436") ? ["Stryker was here"] : (stryCov_9fa48("11436"), [])
    });
  }
}
export function shouldInterfaceMtuFit(actions: ReadonlyArray<InterfaceMtuFitAction>): boolean {
  if (stryMutAct_9fa48("11437")) {
    {}
  } else {
    stryCov_9fa48("11437");
    return stryMutAct_9fa48("11438") ? actions.every(action => action.kind === "fit") : (stryCov_9fa48("11438"), actions.some(stryMutAct_9fa48("11439") ? () => undefined : (stryCov_9fa48("11439"), action => stryMutAct_9fa48("11442") ? action.kind !== "fit" : stryMutAct_9fa48("11441") ? false : stryMutAct_9fa48("11440") ? true : (stryCov_9fa48("11440", "11441", "11442"), action.kind === (stryMutAct_9fa48("11443") ? "" : (stryCov_9fa48("11443"), "fit"))))));
  }
}
export function shouldInterfaceMtuOverflow(actions: ReadonlyArray<InterfaceMtuFitAction>): boolean {
  if (stryMutAct_9fa48("11444")) {
    {}
  } else {
    stryCov_9fa48("11444");
    return stryMutAct_9fa48("11445") ? actions.every(action => action.kind === "overflow") : (stryCov_9fa48("11445"), actions.some(stryMutAct_9fa48("11446") ? () => undefined : (stryCov_9fa48("11446"), action => stryMutAct_9fa48("11449") ? action.kind !== "overflow" : stryMutAct_9fa48("11448") ? false : stryMutAct_9fa48("11447") ? true : (stryCov_9fa48("11447", "11448", "11449"), action.kind === (stryMutAct_9fa48("11450") ? "" : (stryCov_9fa48("11450"), "overflow"))))));
  }
}

/** Whether the interface is closed (no further send / receive / close work). */
export function isInterfaceClosed(closed: boolean): boolean {
  if (stryMutAct_9fa48("11451")) {
    {}
  } else {
    stryCov_9fa48("11451");
    return closed;
  }
}

/**
 * Interface closed gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isInterfaceClosed`
 * reads beside the step).
 */
export type InterfaceClosedState = Record<string, never>;
export type InterfaceClosedEvent = Event | {
  readonly kind: "iface/closed-gate";
  readonly closed: boolean;
};
export type InterfaceClosedAction = {
  readonly kind: "closed";
} | {
  readonly kind: "open";
};
export interface InterfaceClosedStepResult {
  readonly state: InterfaceClosedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceClosedAction[];
}
export function initialInterfaceClosedState(): InterfaceClosedState {
  if (stryMutAct_9fa48("11452")) {
    {}
  } else {
    stryCov_9fa48("11452");
    return {};
  }
}
export function stepInterfaceClosedWithActions(state: InterfaceClosedState, event: InterfaceClosedEvent): InterfaceClosedStepResult {
  if (stryMutAct_9fa48("11453")) {
    {}
  } else {
    stryCov_9fa48("11453");
    if (stryMutAct_9fa48("11456") ? event.kind !== "iface/closed-gate" : stryMutAct_9fa48("11455") ? false : stryMutAct_9fa48("11454") ? true : (stryCov_9fa48("11454", "11455", "11456"), event.kind === (stryMutAct_9fa48("11457") ? "" : (stryCov_9fa48("11457"), "iface/closed-gate")))) {
      if (stryMutAct_9fa48("11458")) {
        {}
      } else {
        stryCov_9fa48("11458");
        return stryMutAct_9fa48("11459") ? {} : (stryCov_9fa48("11459"), {
          state,
          intents: stryMutAct_9fa48("11460") ? ["Stryker was here"] : (stryCov_9fa48("11460"), []),
          actions: stryMutAct_9fa48("11461") ? [] : (stryCov_9fa48("11461"), [stryMutAct_9fa48("11462") ? {} : (stryCov_9fa48("11462"), {
            kind: isInterfaceClosed(event.closed) ? stryMutAct_9fa48("11463") ? "" : (stryCov_9fa48("11463"), "closed") : stryMutAct_9fa48("11464") ? "" : (stryCov_9fa48("11464"), "open")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11465") ? {} : (stryCov_9fa48("11465"), {
      state,
      intents: stryMutAct_9fa48("11466") ? ["Stryker was here"] : (stryCov_9fa48("11466"), []),
      actions: stryMutAct_9fa48("11467") ? ["Stryker was here"] : (stryCov_9fa48("11467"), [])
    });
  }
}
export function shouldInterfaceClosedNow(actions: ReadonlyArray<InterfaceClosedAction>): boolean {
  if (stryMutAct_9fa48("11468")) {
    {}
  } else {
    stryCov_9fa48("11468");
    return stryMutAct_9fa48("11469") ? actions.every(action => action.kind === "closed") : (stryCov_9fa48("11469"), actions.some(stryMutAct_9fa48("11470") ? () => undefined : (stryCov_9fa48("11470"), action => stryMutAct_9fa48("11473") ? action.kind !== "closed" : stryMutAct_9fa48("11472") ? false : stryMutAct_9fa48("11471") ? true : (stryCov_9fa48("11471", "11472", "11473"), action.kind === (stryMutAct_9fa48("11474") ? "" : (stryCov_9fa48("11474"), "closed"))))));
  }
}
export function shouldInterfaceOpenNow(actions: ReadonlyArray<InterfaceClosedAction>): boolean {
  if (stryMutAct_9fa48("11475")) {
    {}
  } else {
    stryCov_9fa48("11475");
    return stryMutAct_9fa48("11476") ? actions.every(action => action.kind === "open") : (stryCov_9fa48("11476"), actions.some(stryMutAct_9fa48("11477") ? () => undefined : (stryCov_9fa48("11477"), action => stryMutAct_9fa48("11480") ? action.kind !== "open" : stryMutAct_9fa48("11479") ? false : stryMutAct_9fa48("11478") ? true : (stryCov_9fa48("11478", "11479", "11480"), action.kind === (stryMutAct_9fa48("11481") ? "" : (stryCov_9fa48("11481"), "open"))))));
  }
}

/** Whether the interface may send (open and configured for outbound traffic). */
export function canInterfaceSend(input: {
  readonly closed: boolean;
  readonly outgoing: boolean;
}): boolean {
  if (stryMutAct_9fa48("11482")) {
    {}
  } else {
    stryCov_9fa48("11482");
    return stryMutAct_9fa48("11485") ? !isInterfaceClosed(input.closed) || input.outgoing : stryMutAct_9fa48("11484") ? false : stryMutAct_9fa48("11483") ? true : (stryCov_9fa48("11483", "11484", "11485"), (stryMutAct_9fa48("11486") ? isInterfaceClosed(input.closed) : (stryCov_9fa48("11486"), !isInterfaceClosed(input.closed))) && input.outgoing);
  }
}

/**
 * Interface send-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canInterfaceSend`
 * reads beside the step).
 */
export type InterfaceSendAllowState = Record<string, never>;
export type InterfaceSendAllowEvent = Event | {
  readonly kind: "iface/send-allow-gate";
  readonly closed: boolean;
  readonly outgoing: boolean;
};
export type InterfaceSendAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface InterfaceSendAllowStepResult {
  readonly state: InterfaceSendAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceSendAllowAction[];
}
export function initialInterfaceSendAllowState(): InterfaceSendAllowState {
  if (stryMutAct_9fa48("11487")) {
    {}
  } else {
    stryCov_9fa48("11487");
    return {};
  }
}
export function stepInterfaceSendAllowWithActions(state: InterfaceSendAllowState, event: InterfaceSendAllowEvent): InterfaceSendAllowStepResult {
  if (stryMutAct_9fa48("11488")) {
    {}
  } else {
    stryCov_9fa48("11488");
    if (stryMutAct_9fa48("11491") ? event.kind !== "iface/send-allow-gate" : stryMutAct_9fa48("11490") ? false : stryMutAct_9fa48("11489") ? true : (stryCov_9fa48("11489", "11490", "11491"), event.kind === (stryMutAct_9fa48("11492") ? "" : (stryCov_9fa48("11492"), "iface/send-allow-gate")))) {
      if (stryMutAct_9fa48("11493")) {
        {}
      } else {
        stryCov_9fa48("11493");
        return stryMutAct_9fa48("11494") ? {} : (stryCov_9fa48("11494"), {
          state,
          intents: stryMutAct_9fa48("11495") ? ["Stryker was here"] : (stryCov_9fa48("11495"), []),
          actions: stryMutAct_9fa48("11496") ? [] : (stryCov_9fa48("11496"), [stryMutAct_9fa48("11497") ? {} : (stryCov_9fa48("11497"), {
            kind: canInterfaceSend(stryMutAct_9fa48("11498") ? {} : (stryCov_9fa48("11498"), {
              closed: event.closed,
              outgoing: event.outgoing
            })) ? stryMutAct_9fa48("11499") ? "" : (stryCov_9fa48("11499"), "allow") : stryMutAct_9fa48("11500") ? "" : (stryCov_9fa48("11500"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11501") ? {} : (stryCov_9fa48("11501"), {
      state,
      intents: stryMutAct_9fa48("11502") ? ["Stryker was here"] : (stryCov_9fa48("11502"), []),
      actions: stryMutAct_9fa48("11503") ? ["Stryker was here"] : (stryCov_9fa48("11503"), [])
    });
  }
}
export function shouldAllowInterfaceSend(actions: ReadonlyArray<InterfaceSendAllowAction>): boolean {
  if (stryMutAct_9fa48("11504")) {
    {}
  } else {
    stryCov_9fa48("11504");
    return stryMutAct_9fa48("11505") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("11505"), actions.some(stryMutAct_9fa48("11506") ? () => undefined : (stryCov_9fa48("11506"), action => stryMutAct_9fa48("11509") ? action.kind !== "allow" : stryMutAct_9fa48("11508") ? false : stryMutAct_9fa48("11507") ? true : (stryCov_9fa48("11507", "11508", "11509"), action.kind === (stryMutAct_9fa48("11510") ? "" : (stryCov_9fa48("11510"), "allow"))))));
  }
}
export function shouldDenyInterfaceSend(actions: ReadonlyArray<InterfaceSendAllowAction>): boolean {
  if (stryMutAct_9fa48("11511")) {
    {}
  } else {
    stryCov_9fa48("11511");
    return stryMutAct_9fa48("11512") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("11512"), actions.some(stryMutAct_9fa48("11513") ? () => undefined : (stryCov_9fa48("11513"), action => stryMutAct_9fa48("11516") ? action.kind !== "deny" : stryMutAct_9fa48("11515") ? false : stryMutAct_9fa48("11514") ? true : (stryCov_9fa48("11514", "11515", "11516"), action.kind === (stryMutAct_9fa48("11517") ? "" : (stryCov_9fa48("11517"), "deny"))))));
  }
}

/** Whether a raw (non-HDLC) inbound byte chunk should be enqueued as a frame. */
export function shouldEnqueueRawInterfaceFrame(length: number): boolean {
  if (stryMutAct_9fa48("11518")) {
    {}
  } else {
    stryCov_9fa48("11518");
    return stryMutAct_9fa48("11522") ? length <= 0 : stryMutAct_9fa48("11521") ? length >= 0 : stryMutAct_9fa48("11520") ? false : stryMutAct_9fa48("11519") ? true : (stryCov_9fa48("11519", "11520", "11521", "11522"), length > 0);
  }
}

/**
 * Raw interface-frame enqueue gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldEnqueueRawInterfaceFrame` reads beside the step).
 */
export type EnqueueRawInterfaceFrameState = Record<string, never>;
export type EnqueueRawInterfaceFrameEvent = Event | {
  readonly kind: "iface/enqueue-raw-frame-gate";
  readonly length: number;
};
export type EnqueueRawInterfaceFrameAction = {
  readonly kind: "enqueue";
} | {
  readonly kind: "skip";
};
export interface EnqueueRawInterfaceFrameStepResult {
  readonly state: EnqueueRawInterfaceFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EnqueueRawInterfaceFrameAction[];
}
export function initialEnqueueRawInterfaceFrameState(): EnqueueRawInterfaceFrameState {
  if (stryMutAct_9fa48("11523")) {
    {}
  } else {
    stryCov_9fa48("11523");
    return {};
  }
}
export function stepEnqueueRawInterfaceFrameWithActions(state: EnqueueRawInterfaceFrameState, event: EnqueueRawInterfaceFrameEvent): EnqueueRawInterfaceFrameStepResult {
  if (stryMutAct_9fa48("11524")) {
    {}
  } else {
    stryCov_9fa48("11524");
    if (stryMutAct_9fa48("11527") ? event.kind !== "iface/enqueue-raw-frame-gate" : stryMutAct_9fa48("11526") ? false : stryMutAct_9fa48("11525") ? true : (stryCov_9fa48("11525", "11526", "11527"), event.kind === (stryMutAct_9fa48("11528") ? "" : (stryCov_9fa48("11528"), "iface/enqueue-raw-frame-gate")))) {
      if (stryMutAct_9fa48("11529")) {
        {}
      } else {
        stryCov_9fa48("11529");
        return stryMutAct_9fa48("11530") ? {} : (stryCov_9fa48("11530"), {
          state,
          intents: stryMutAct_9fa48("11531") ? ["Stryker was here"] : (stryCov_9fa48("11531"), []),
          actions: stryMutAct_9fa48("11532") ? [] : (stryCov_9fa48("11532"), [stryMutAct_9fa48("11533") ? {} : (stryCov_9fa48("11533"), {
            kind: shouldEnqueueRawInterfaceFrame(event.length) ? stryMutAct_9fa48("11534") ? "" : (stryCov_9fa48("11534"), "enqueue") : stryMutAct_9fa48("11535") ? "" : (stryCov_9fa48("11535"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11536") ? {} : (stryCov_9fa48("11536"), {
      state,
      intents: stryMutAct_9fa48("11537") ? ["Stryker was here"] : (stryCov_9fa48("11537"), []),
      actions: stryMutAct_9fa48("11538") ? ["Stryker was here"] : (stryCov_9fa48("11538"), [])
    });
  }
}
export function shouldEnqueueRawInterfaceFrameNow(actions: ReadonlyArray<EnqueueRawInterfaceFrameAction>): boolean {
  if (stryMutAct_9fa48("11539")) {
    {}
  } else {
    stryCov_9fa48("11539");
    return stryMutAct_9fa48("11540") ? actions.every(action => action.kind === "enqueue") : (stryCov_9fa48("11540"), actions.some(stryMutAct_9fa48("11541") ? () => undefined : (stryCov_9fa48("11541"), action => stryMutAct_9fa48("11544") ? action.kind !== "enqueue" : stryMutAct_9fa48("11543") ? false : stryMutAct_9fa48("11542") ? true : (stryCov_9fa48("11542", "11543", "11544"), action.kind === (stryMutAct_9fa48("11545") ? "" : (stryCov_9fa48("11545"), "enqueue"))))));
  }
}
export function shouldSkipRawInterfaceFrameEnqueue(actions: ReadonlyArray<EnqueueRawInterfaceFrameAction>): boolean {
  if (stryMutAct_9fa48("11546")) {
    {}
  } else {
    stryCov_9fa48("11546");
    return stryMutAct_9fa48("11547") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("11547"), actions.some(stryMutAct_9fa48("11548") ? () => undefined : (stryCov_9fa48("11548"), action => stryMutAct_9fa48("11551") ? action.kind !== "skip" : stryMutAct_9fa48("11550") ? false : stryMutAct_9fa48("11549") ? true : (stryCov_9fa48("11549", "11550", "11551"), action.kind === (stryMutAct_9fa48("11552") ? "" : (stryCov_9fa48("11552"), "skip"))))));
  }
}

/** Whether a successfully decoded packet should be pushed onto the inbound queue. */
export function shouldEnqueueDecodedPacket(packetPresent: boolean): boolean {
  if (stryMutAct_9fa48("11553")) {
    {}
  } else {
    stryCov_9fa48("11553");
    return packetPresent;
  }
}

/**
 * Decoded-packet enqueue gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldEnqueueDecodedPacket` reads beside the step).
 */
export type EnqueueDecodedPacketState = Record<string, never>;
export type EnqueueDecodedPacketEvent = Event | {
  readonly kind: "iface/enqueue-decoded-packet-gate";
  readonly packetPresent: boolean;
};
export type EnqueueDecodedPacketAction = {
  readonly kind: "enqueue";
} | {
  readonly kind: "skip";
};
export interface EnqueueDecodedPacketStepResult {
  readonly state: EnqueueDecodedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EnqueueDecodedPacketAction[];
}
export function initialEnqueueDecodedPacketState(): EnqueueDecodedPacketState {
  if (stryMutAct_9fa48("11554")) {
    {}
  } else {
    stryCov_9fa48("11554");
    return {};
  }
}
export function stepEnqueueDecodedPacketWithActions(state: EnqueueDecodedPacketState, event: EnqueueDecodedPacketEvent): EnqueueDecodedPacketStepResult {
  if (stryMutAct_9fa48("11555")) {
    {}
  } else {
    stryCov_9fa48("11555");
    if (stryMutAct_9fa48("11558") ? event.kind !== "iface/enqueue-decoded-packet-gate" : stryMutAct_9fa48("11557") ? false : stryMutAct_9fa48("11556") ? true : (stryCov_9fa48("11556", "11557", "11558"), event.kind === (stryMutAct_9fa48("11559") ? "" : (stryCov_9fa48("11559"), "iface/enqueue-decoded-packet-gate")))) {
      if (stryMutAct_9fa48("11560")) {
        {}
      } else {
        stryCov_9fa48("11560");
        return stryMutAct_9fa48("11561") ? {} : (stryCov_9fa48("11561"), {
          state,
          intents: stryMutAct_9fa48("11562") ? ["Stryker was here"] : (stryCov_9fa48("11562"), []),
          actions: stryMutAct_9fa48("11563") ? [] : (stryCov_9fa48("11563"), [stryMutAct_9fa48("11564") ? {} : (stryCov_9fa48("11564"), {
            kind: shouldEnqueueDecodedPacket(event.packetPresent) ? stryMutAct_9fa48("11565") ? "" : (stryCov_9fa48("11565"), "enqueue") : stryMutAct_9fa48("11566") ? "" : (stryCov_9fa48("11566"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11567") ? {} : (stryCov_9fa48("11567"), {
      state,
      intents: stryMutAct_9fa48("11568") ? ["Stryker was here"] : (stryCov_9fa48("11568"), []),
      actions: stryMutAct_9fa48("11569") ? ["Stryker was here"] : (stryCov_9fa48("11569"), [])
    });
  }
}
export function shouldEnqueueDecodedPacketNow(actions: ReadonlyArray<EnqueueDecodedPacketAction>): boolean {
  if (stryMutAct_9fa48("11570")) {
    {}
  } else {
    stryCov_9fa48("11570");
    return stryMutAct_9fa48("11571") ? actions.every(action => action.kind === "enqueue") : (stryCov_9fa48("11571"), actions.some(stryMutAct_9fa48("11572") ? () => undefined : (stryCov_9fa48("11572"), action => stryMutAct_9fa48("11575") ? action.kind !== "enqueue" : stryMutAct_9fa48("11574") ? false : stryMutAct_9fa48("11573") ? true : (stryCov_9fa48("11573", "11574", "11575"), action.kind === (stryMutAct_9fa48("11576") ? "" : (stryCov_9fa48("11576"), "enqueue"))))));
  }
}
export function shouldSkipDecodedPacketEnqueue(actions: ReadonlyArray<EnqueueDecodedPacketAction>): boolean {
  if (stryMutAct_9fa48("11577")) {
    {}
  } else {
    stryCov_9fa48("11577");
    return stryMutAct_9fa48("11578") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("11578"), actions.some(stryMutAct_9fa48("11579") ? () => undefined : (stryCov_9fa48("11579"), action => stryMutAct_9fa48("11582") ? action.kind !== "skip" : stryMutAct_9fa48("11581") ? false : stryMutAct_9fa48("11580") ? true : (stryCov_9fa48("11580", "11581", "11582"), action.kind === (stryMutAct_9fa48("11583") ? "" : (stryCov_9fa48("11583"), "skip"))))));
  }
}

/** Whether a pushed packet should be delivered immediately to a waiting iterator. */
export function shouldDeliverQueuedPacket(waiterPresent: boolean): boolean {
  if (stryMutAct_9fa48("11584")) {
    {}
  } else {
    stryCov_9fa48("11584");
    return waiterPresent;
  }
}

/**
 * Queued-packet deliver gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDeliverQueuedPacket` reads beside the step).
 */
export type DeliverQueuedPacketState = Record<string, never>;
export type DeliverQueuedPacketEvent = Event | {
  readonly kind: "iface/deliver-queued-packet-gate";
  readonly waiterPresent: boolean;
};
export type DeliverQueuedPacketAction = {
  readonly kind: "deliver";
} | {
  readonly kind: "buffer";
};
export interface DeliverQueuedPacketStepResult {
  readonly state: DeliverQueuedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeliverQueuedPacketAction[];
}
export function initialDeliverQueuedPacketState(): DeliverQueuedPacketState {
  if (stryMutAct_9fa48("11585")) {
    {}
  } else {
    stryCov_9fa48("11585");
    return {};
  }
}
export function stepDeliverQueuedPacketWithActions(state: DeliverQueuedPacketState, event: DeliverQueuedPacketEvent): DeliverQueuedPacketStepResult {
  if (stryMutAct_9fa48("11586")) {
    {}
  } else {
    stryCov_9fa48("11586");
    if (stryMutAct_9fa48("11589") ? event.kind !== "iface/deliver-queued-packet-gate" : stryMutAct_9fa48("11588") ? false : stryMutAct_9fa48("11587") ? true : (stryCov_9fa48("11587", "11588", "11589"), event.kind === (stryMutAct_9fa48("11590") ? "" : (stryCov_9fa48("11590"), "iface/deliver-queued-packet-gate")))) {
      if (stryMutAct_9fa48("11591")) {
        {}
      } else {
        stryCov_9fa48("11591");
        return stryMutAct_9fa48("11592") ? {} : (stryCov_9fa48("11592"), {
          state,
          intents: stryMutAct_9fa48("11593") ? ["Stryker was here"] : (stryCov_9fa48("11593"), []),
          actions: stryMutAct_9fa48("11594") ? [] : (stryCov_9fa48("11594"), [stryMutAct_9fa48("11595") ? {} : (stryCov_9fa48("11595"), {
            kind: shouldDeliverQueuedPacket(event.waiterPresent) ? stryMutAct_9fa48("11596") ? "" : (stryCov_9fa48("11596"), "deliver") : stryMutAct_9fa48("11597") ? "" : (stryCov_9fa48("11597"), "buffer")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11598") ? {} : (stryCov_9fa48("11598"), {
      state,
      intents: stryMutAct_9fa48("11599") ? ["Stryker was here"] : (stryCov_9fa48("11599"), []),
      actions: stryMutAct_9fa48("11600") ? ["Stryker was here"] : (stryCov_9fa48("11600"), [])
    });
  }
}
export function shouldDeliverQueuedPacketNow(actions: ReadonlyArray<DeliverQueuedPacketAction>): boolean {
  if (stryMutAct_9fa48("11601")) {
    {}
  } else {
    stryCov_9fa48("11601");
    return stryMutAct_9fa48("11602") ? actions.every(action => action.kind === "deliver") : (stryCov_9fa48("11602"), actions.some(stryMutAct_9fa48("11603") ? () => undefined : (stryCov_9fa48("11603"), action => stryMutAct_9fa48("11606") ? action.kind !== "deliver" : stryMutAct_9fa48("11605") ? false : stryMutAct_9fa48("11604") ? true : (stryCov_9fa48("11604", "11605", "11606"), action.kind === (stryMutAct_9fa48("11607") ? "" : (stryCov_9fa48("11607"), "deliver"))))));
  }
}
export function shouldBufferQueuedPacket(actions: ReadonlyArray<DeliverQueuedPacketAction>): boolean {
  if (stryMutAct_9fa48("11608")) {
    {}
  } else {
    stryCov_9fa48("11608");
    return stryMutAct_9fa48("11609") ? actions.every(action => action.kind === "buffer") : (stryCov_9fa48("11609"), actions.some(stryMutAct_9fa48("11610") ? () => undefined : (stryCov_9fa48("11610"), action => stryMutAct_9fa48("11613") ? action.kind !== "buffer" : stryMutAct_9fa48("11612") ? false : stryMutAct_9fa48("11611") ? true : (stryCov_9fa48("11611", "11612", "11613"), action.kind === (stryMutAct_9fa48("11614") ? "" : (stryCov_9fa48("11614"), "buffer"))))));
  }
}

/** Whether a buffered queue value should be yielded from the iterator. */
export function shouldYieldBufferedPacket(valuePresent: boolean): boolean {
  if (stryMutAct_9fa48("11615")) {
    {}
  } else {
    stryCov_9fa48("11615");
    return valuePresent;
  }
}

/**
 * Buffered-packet yield gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldYieldBufferedPacket` reads beside the step).
 */
export type YieldBufferedPacketState = Record<string, never>;
export type YieldBufferedPacketEvent = Event | {
  readonly kind: "iface/yield-buffered-packet-gate";
  readonly valuePresent: boolean;
};
export type YieldBufferedPacketAction = {
  readonly kind: "yield";
} | {
  readonly kind: "skip";
};
export interface YieldBufferedPacketStepResult {
  readonly state: YieldBufferedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly YieldBufferedPacketAction[];
}
export function initialYieldBufferedPacketState(): YieldBufferedPacketState {
  if (stryMutAct_9fa48("11616")) {
    {}
  } else {
    stryCov_9fa48("11616");
    return {};
  }
}
export function stepYieldBufferedPacketWithActions(state: YieldBufferedPacketState, event: YieldBufferedPacketEvent): YieldBufferedPacketStepResult {
  if (stryMutAct_9fa48("11617")) {
    {}
  } else {
    stryCov_9fa48("11617");
    if (stryMutAct_9fa48("11620") ? event.kind !== "iface/yield-buffered-packet-gate" : stryMutAct_9fa48("11619") ? false : stryMutAct_9fa48("11618") ? true : (stryCov_9fa48("11618", "11619", "11620"), event.kind === (stryMutAct_9fa48("11621") ? "" : (stryCov_9fa48("11621"), "iface/yield-buffered-packet-gate")))) {
      if (stryMutAct_9fa48("11622")) {
        {}
      } else {
        stryCov_9fa48("11622");
        return stryMutAct_9fa48("11623") ? {} : (stryCov_9fa48("11623"), {
          state,
          intents: stryMutAct_9fa48("11624") ? ["Stryker was here"] : (stryCov_9fa48("11624"), []),
          actions: stryMutAct_9fa48("11625") ? [] : (stryCov_9fa48("11625"), [stryMutAct_9fa48("11626") ? {} : (stryCov_9fa48("11626"), {
            kind: shouldYieldBufferedPacket(event.valuePresent) ? stryMutAct_9fa48("11627") ? "" : (stryCov_9fa48("11627"), "yield") : stryMutAct_9fa48("11628") ? "" : (stryCov_9fa48("11628"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11629") ? {} : (stryCov_9fa48("11629"), {
      state,
      intents: stryMutAct_9fa48("11630") ? ["Stryker was here"] : (stryCov_9fa48("11630"), []),
      actions: stryMutAct_9fa48("11631") ? ["Stryker was here"] : (stryCov_9fa48("11631"), [])
    });
  }
}
export function shouldYieldBufferedPacketNow(actions: ReadonlyArray<YieldBufferedPacketAction>): boolean {
  if (stryMutAct_9fa48("11632")) {
    {}
  } else {
    stryCov_9fa48("11632");
    return stryMutAct_9fa48("11633") ? actions.every(action => action.kind === "yield") : (stryCov_9fa48("11633"), actions.some(stryMutAct_9fa48("11634") ? () => undefined : (stryCov_9fa48("11634"), action => stryMutAct_9fa48("11637") ? action.kind !== "yield" : stryMutAct_9fa48("11636") ? false : stryMutAct_9fa48("11635") ? true : (stryCov_9fa48("11635", "11636", "11637"), action.kind === (stryMutAct_9fa48("11638") ? "" : (stryCov_9fa48("11638"), "yield"))))));
  }
}
export function shouldSkipBufferedPacketYield(actions: ReadonlyArray<YieldBufferedPacketAction>): boolean {
  if (stryMutAct_9fa48("11639")) {
    {}
  } else {
    stryCov_9fa48("11639");
    return stryMutAct_9fa48("11640") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("11640"), actions.some(stryMutAct_9fa48("11641") ? () => undefined : (stryCov_9fa48("11641"), action => stryMutAct_9fa48("11644") ? action.kind !== "skip" : stryMutAct_9fa48("11643") ? false : stryMutAct_9fa48("11642") ? true : (stryCov_9fa48("11642", "11643", "11644"), action.kind === (stryMutAct_9fa48("11645") ? "" : (stryCov_9fa48("11645"), "skip"))))));
  }
}
export type InterfaceReconnectPlan = {
  readonly kind: "reconnect";
  readonly delayMs: number;
  readonly attempt: number;
} | {
  readonly kind: "give-up";
  readonly attempt: number;
};
export function planInterfaceReconnect(input: {
  readonly attempts: number;
  readonly maxTries?: number | null;
  readonly waitMs?: number;
}): InterfaceReconnectPlan {
  if (stryMutAct_9fa48("11646")) {
    {}
  } else {
    stryCov_9fa48("11646");
    const attempt = stryMutAct_9fa48("11647") ? input.attempts - 1 : (stryCov_9fa48("11647"), input.attempts + 1);
    const maxTries = stryMutAct_9fa48("11648") ? input.maxTries && null : (stryCov_9fa48("11648"), input.maxTries ?? null);
    if (stryMutAct_9fa48("11651") ? maxTries !== null || attempt > maxTries : stryMutAct_9fa48("11650") ? false : stryMutAct_9fa48("11649") ? true : (stryCov_9fa48("11649", "11650", "11651"), (stryMutAct_9fa48("11653") ? maxTries === null : stryMutAct_9fa48("11652") ? true : (stryCov_9fa48("11652", "11653"), maxTries !== null)) && (stryMutAct_9fa48("11656") ? attempt <= maxTries : stryMutAct_9fa48("11655") ? attempt >= maxTries : stryMutAct_9fa48("11654") ? true : (stryCov_9fa48("11654", "11655", "11656"), attempt > maxTries)))) {
      if (stryMutAct_9fa48("11657")) {
        {}
      } else {
        stryCov_9fa48("11657");
        return stryMutAct_9fa48("11658") ? {} : (stryCov_9fa48("11658"), {
          kind: stryMutAct_9fa48("11659") ? "" : (stryCov_9fa48("11659"), "give-up"),
          attempt
        });
      }
    }
    return stryMutAct_9fa48("11660") ? {} : (stryCov_9fa48("11660"), {
      kind: stryMutAct_9fa48("11661") ? "" : (stryCov_9fa48("11661"), "reconnect"),
      delayMs: stryMutAct_9fa48("11662") ? input.waitMs && INTERFACE_RECONNECT_WAIT_MS : (stryCov_9fa48("11662"), input.waitMs ?? INTERFACE_RECONNECT_WAIT_MS),
      attempt
    });
  }
}

/**
 * Interface-reconnect plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planInterfaceReconnect` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepInterfaceReconnectWithActions}.
 */
export type InterfaceReconnectPlanState = Record<string, never>;
export type InterfaceReconnectPlanEvent = Event | {
  readonly kind: "iface/reconnect-plan-gate";
  readonly attempts: number;
  readonly maxTries?: number | null;
  readonly waitMs?: number;
};
export type InterfaceReconnectPlanAction = {
  readonly kind: "reconnect";
  readonly delayMs: number;
  readonly attempt: number;
} | {
  readonly kind: "give-up";
  readonly attempt: number;
};
export interface InterfaceReconnectPlanStepResult {
  readonly state: InterfaceReconnectPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceReconnectPlanAction[];
}
export function initialInterfaceReconnectPlanState(): InterfaceReconnectPlanState {
  if (stryMutAct_9fa48("11663")) {
    {}
  } else {
    stryCov_9fa48("11663");
    return {};
  }
}
export function stepInterfaceReconnectPlanWithActions(state: InterfaceReconnectPlanState, event: InterfaceReconnectPlanEvent): InterfaceReconnectPlanStepResult {
  if (stryMutAct_9fa48("11664")) {
    {}
  } else {
    stryCov_9fa48("11664");
    if (stryMutAct_9fa48("11667") ? event.kind !== "iface/reconnect-plan-gate" : stryMutAct_9fa48("11666") ? false : stryMutAct_9fa48("11665") ? true : (stryCov_9fa48("11665", "11666", "11667"), event.kind === (stryMutAct_9fa48("11668") ? "" : (stryCov_9fa48("11668"), "iface/reconnect-plan-gate")))) {
      if (stryMutAct_9fa48("11669")) {
        {}
      } else {
        stryCov_9fa48("11669");
        return stryMutAct_9fa48("11670") ? {} : (stryCov_9fa48("11670"), {
          state,
          intents: stryMutAct_9fa48("11671") ? ["Stryker was here"] : (stryCov_9fa48("11671"), []),
          actions: stryMutAct_9fa48("11672") ? [] : (stryCov_9fa48("11672"), [planInterfaceReconnect(stryMutAct_9fa48("11673") ? {} : (stryCov_9fa48("11673"), {
            attempts: event.attempts,
            ...((stryMutAct_9fa48("11676") ? event.maxTries === undefined : stryMutAct_9fa48("11675") ? false : stryMutAct_9fa48("11674") ? true : (stryCov_9fa48("11674", "11675", "11676"), event.maxTries !== undefined)) ? stryMutAct_9fa48("11677") ? {} : (stryCov_9fa48("11677"), {
              maxTries: event.maxTries
            }) : {}),
            ...((stryMutAct_9fa48("11680") ? event.waitMs === undefined : stryMutAct_9fa48("11679") ? false : stryMutAct_9fa48("11678") ? true : (stryCov_9fa48("11678", "11679", "11680"), event.waitMs !== undefined)) ? stryMutAct_9fa48("11681") ? {} : (stryCov_9fa48("11681"), {
              waitMs: event.waitMs
            }) : {})
          }))])
        });
      }
    }
    return stryMutAct_9fa48("11682") ? {} : (stryCov_9fa48("11682"), {
      state,
      intents: stryMutAct_9fa48("11683") ? ["Stryker was here"] : (stryCov_9fa48("11683"), []),
      actions: stryMutAct_9fa48("11684") ? ["Stryker was here"] : (stryCov_9fa48("11684"), [])
    });
  }
}
export function shouldReconnectInterfacePlan(actions: ReadonlyArray<InterfaceReconnectPlanAction>): boolean {
  if (stryMutAct_9fa48("11685")) {
    {}
  } else {
    stryCov_9fa48("11685");
    return stryMutAct_9fa48("11686") ? actions.every(action => action.kind === "reconnect") : (stryCov_9fa48("11686"), actions.some(stryMutAct_9fa48("11687") ? () => undefined : (stryCov_9fa48("11687"), action => stryMutAct_9fa48("11690") ? action.kind !== "reconnect" : stryMutAct_9fa48("11689") ? false : stryMutAct_9fa48("11688") ? true : (stryCov_9fa48("11688", "11689", "11690"), action.kind === (stryMutAct_9fa48("11691") ? "" : (stryCov_9fa48("11691"), "reconnect"))))));
  }
}
export function shouldGiveUpInterfaceReconnectPlan(actions: ReadonlyArray<InterfaceReconnectPlanAction>): boolean {
  if (stryMutAct_9fa48("11692")) {
    {}
  } else {
    stryCov_9fa48("11692");
    return stryMutAct_9fa48("11693") ? actions.every(action => action.kind === "give-up") : (stryCov_9fa48("11693"), actions.some(stryMutAct_9fa48("11694") ? () => undefined : (stryCov_9fa48("11694"), action => stryMutAct_9fa48("11697") ? action.kind !== "give-up" : stryMutAct_9fa48("11696") ? false : stryMutAct_9fa48("11695") ? true : (stryCov_9fa48("11695", "11696", "11697"), action.kind === (stryMutAct_9fa48("11698") ? "" : (stryCov_9fa48("11698"), "give-up"))))));
  }
}

/** Extract give-up plan action, if any. */
export function interfaceReconnectGiveUpFromActions(actions: ReadonlyArray<InterfaceReconnectPlanAction>): Extract<InterfaceReconnectPlanAction, {
  kind: "give-up";
}> | null {
  if (stryMutAct_9fa48("11699")) {
    {}
  } else {
    stryCov_9fa48("11699");
    for (const action of actions) {
      if (stryMutAct_9fa48("11700")) {
        {}
      } else {
        stryCov_9fa48("11700");
        if (stryMutAct_9fa48("11703") ? action.kind !== "give-up" : stryMutAct_9fa48("11702") ? false : stryMutAct_9fa48("11701") ? true : (stryCov_9fa48("11701", "11702", "11703"), action.kind === (stryMutAct_9fa48("11704") ? "" : (stryCov_9fa48("11704"), "give-up")))) {
          if (stryMutAct_9fa48("11705")) {
            {}
          } else {
            stryCov_9fa48("11705");
            return action;
          }
        }
      }
    }
    return null;
  }
}

/** Extract reconnect plan action, if any. */
export function interfaceReconnectRetryFromActions(actions: ReadonlyArray<InterfaceReconnectPlanAction>): Extract<InterfaceReconnectPlanAction, {
  kind: "reconnect";
}> | null {
  if (stryMutAct_9fa48("11706")) {
    {}
  } else {
    stryCov_9fa48("11706");
    for (const action of actions) {
      if (stryMutAct_9fa48("11707")) {
        {}
      } else {
        stryCov_9fa48("11707");
        if (stryMutAct_9fa48("11710") ? action.kind !== "reconnect" : stryMutAct_9fa48("11709") ? false : stryMutAct_9fa48("11708") ? true : (stryCov_9fa48("11708", "11709", "11710"), action.kind === (stryMutAct_9fa48("11711") ? "" : (stryCov_9fa48("11711"), "reconnect")))) {
          if (stryMutAct_9fa48("11712")) {
            {}
          } else {
            stryCov_9fa48("11712");
            return action;
          }
        }
      }
    }
    return null;
  }
}

/** Extract the reconnect plan from actions; null when empty. */
export function interfaceReconnectPlanFromActions(actions: ReadonlyArray<InterfaceReconnectPlanAction>): InterfaceReconnectPlan | null {
  if (stryMutAct_9fa48("11713")) {
    {}
  } else {
    stryCov_9fa48("11713");
    const action = actions.find(stryMutAct_9fa48("11714") ? () => undefined : (stryCov_9fa48("11714"), entry => stryMutAct_9fa48("11717") ? entry.kind === "reconnect" && entry.kind === "give-up" : stryMutAct_9fa48("11716") ? false : stryMutAct_9fa48("11715") ? true : (stryCov_9fa48("11715", "11716", "11717"), (stryMutAct_9fa48("11719") ? entry.kind !== "reconnect" : stryMutAct_9fa48("11718") ? false : (stryCov_9fa48("11718", "11719"), entry.kind === (stryMutAct_9fa48("11720") ? "" : (stryCov_9fa48("11720"), "reconnect")))) || (stryMutAct_9fa48("11722") ? entry.kind !== "give-up" : stryMutAct_9fa48("11721") ? false : (stryCov_9fa48("11721", "11722"), entry.kind === (stryMutAct_9fa48("11723") ? "" : (stryCov_9fa48("11723"), "give-up")))))));
    return stryMutAct_9fa48("11724") ? action && null : (stryCov_9fa48("11724"), action ?? null);
  }
}
export interface InterfaceReconnectState {
  readonly attempts: number;
  readonly maxTries: number | null;
  readonly waitMs: number;
  readonly detached: boolean;
  /** When true, spawned/server-accepted sockets must not auto-reconnect. */
  readonly suppressReconnect: boolean;
  readonly waiting: boolean;
}
export type InterfaceReconnectEvent = Event | {
  readonly kind: "iface/connected";
} | {
  readonly kind: "iface/disconnected";
} | {
  readonly kind: "iface/connect-failed";
} | {
  readonly kind: "iface/detach";
};
export type InterfaceReconnectAction = {
  readonly kind: "connect";
  readonly attempt: number;
} | {
  readonly kind: "give-up";
  readonly attempt: number;
};
export interface InterfaceReconnectStepResult {
  readonly state: InterfaceReconnectState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceReconnectAction[];
}
export function initialInterfaceReconnectState(options: {
  readonly maxTries?: number | null;
  readonly waitMs?: number;
  readonly suppressReconnect?: boolean;
} = {}): InterfaceReconnectState {
  if (stryMutAct_9fa48("11725")) {
    {}
  } else {
    stryCov_9fa48("11725");
    return stryMutAct_9fa48("11726") ? {} : (stryCov_9fa48("11726"), {
      attempts: 0,
      maxTries: stryMutAct_9fa48("11727") ? options.maxTries && null : (stryCov_9fa48("11727"), options.maxTries ?? null),
      waitMs: stryMutAct_9fa48("11728") ? options.waitMs && INTERFACE_RECONNECT_WAIT_MS : (stryCov_9fa48("11728"), options.waitMs ?? INTERFACE_RECONNECT_WAIT_MS),
      detached: stryMutAct_9fa48("11729") ? true : (stryCov_9fa48("11729"), false),
      suppressReconnect: stryMutAct_9fa48("11732") ? options.suppressReconnect !== true : stryMutAct_9fa48("11731") ? false : stryMutAct_9fa48("11730") ? true : (stryCov_9fa48("11730", "11731", "11732"), options.suppressReconnect === (stryMutAct_9fa48("11733") ? false : (stryCov_9fa48("11733"), true))),
      waiting: stryMutAct_9fa48("11734") ? true : (stryCov_9fa48("11734"), false)
    });
  }
}
export const stepInterfaceReconnect: StepFn<InterfaceReconnectState> = (state, event) => {
  if (stryMutAct_9fa48("11735")) {
    {}
  } else {
    stryCov_9fa48("11735");
    const result = stepInterfaceReconnectInner(state, event as InterfaceReconnectEvent);
    return stryMutAct_9fa48("11736") ? {} : (stryCov_9fa48("11736"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepInterfaceReconnectWithActions(state: InterfaceReconnectState, event: InterfaceReconnectEvent): InterfaceReconnectStepResult {
  if (stryMutAct_9fa48("11737")) {
    {}
  } else {
    stryCov_9fa48("11737");
    return stepInterfaceReconnectInner(state, event);
  }
}
function cancelTimerIntent(): Intent {
  if (stryMutAct_9fa48("11738")) {
    {}
  } else {
    stryCov_9fa48("11738");
    return stryMutAct_9fa48("11739") ? {} : (stryCov_9fa48("11739"), {
      kind: stryMutAct_9fa48("11740") ? "" : (stryCov_9fa48("11740"), "timer/cancel"),
      timer: stryMutAct_9fa48("11741") ? {} : (stryCov_9fa48("11741"), {
        id: INTERFACE_RECONNECT_TIMER_ID
      })
    });
  }
}
function setTimerIntent(delayMs: number): Intent {
  if (stryMutAct_9fa48("11742")) {
    {}
  } else {
    stryCov_9fa48("11742");
    return stryMutAct_9fa48("11743") ? {} : (stryCov_9fa48("11743"), {
      kind: stryMutAct_9fa48("11744") ? "" : (stryCov_9fa48("11744"), "timer/set"),
      timer: stryMutAct_9fa48("11745") ? {} : (stryCov_9fa48("11745"), {
        id: INTERFACE_RECONNECT_TIMER_ID,
        delayMs
      })
    });
  }
}
function stepInterfaceReconnectInner(state: InterfaceReconnectState, event: InterfaceReconnectEvent): InterfaceReconnectStepResult {
  if (stryMutAct_9fa48("11746")) {
    {}
  } else {
    stryCov_9fa48("11746");
    if (stryMutAct_9fa48("11749") ? event.kind !== "iface/detach" : stryMutAct_9fa48("11748") ? false : stryMutAct_9fa48("11747") ? true : (stryCov_9fa48("11747", "11748", "11749"), event.kind === (stryMutAct_9fa48("11750") ? "" : (stryCov_9fa48("11750"), "iface/detach")))) {
      if (stryMutAct_9fa48("11751")) {
        {}
      } else {
        stryCov_9fa48("11751");
        return stryMutAct_9fa48("11752") ? {} : (stryCov_9fa48("11752"), {
          state: stryMutAct_9fa48("11753") ? {} : (stryCov_9fa48("11753"), {
            ...state,
            detached: stryMutAct_9fa48("11754") ? false : (stryCov_9fa48("11754"), true),
            waiting: stryMutAct_9fa48("11755") ? true : (stryCov_9fa48("11755"), false)
          }),
          intents: stryMutAct_9fa48("11756") ? [] : (stryCov_9fa48("11756"), [cancelTimerIntent()]),
          actions: stryMutAct_9fa48("11757") ? ["Stryker was here"] : (stryCov_9fa48("11757"), [])
        });
      }
    }
    if (stryMutAct_9fa48("11760") ? event.kind !== "iface/connected" : stryMutAct_9fa48("11759") ? false : stryMutAct_9fa48("11758") ? true : (stryCov_9fa48("11758", "11759", "11760"), event.kind === (stryMutAct_9fa48("11761") ? "" : (stryCov_9fa48("11761"), "iface/connected")))) {
      if (stryMutAct_9fa48("11762")) {
        {}
      } else {
        stryCov_9fa48("11762");
        return stryMutAct_9fa48("11763") ? {} : (stryCov_9fa48("11763"), {
          state: stryMutAct_9fa48("11764") ? {} : (stryCov_9fa48("11764"), {
            ...state,
            attempts: 0,
            waiting: stryMutAct_9fa48("11765") ? true : (stryCov_9fa48("11765"), false),
            detached: stryMutAct_9fa48("11766") ? true : (stryCov_9fa48("11766"), false)
          }),
          intents: stryMutAct_9fa48("11767") ? [] : (stryCov_9fa48("11767"), [cancelTimerIntent()]),
          actions: stryMutAct_9fa48("11768") ? ["Stryker was here"] : (stryCov_9fa48("11768"), [])
        });
      }
    }
    if (stryMutAct_9fa48("11771") ? state.detached && state.suppressReconnect : stryMutAct_9fa48("11770") ? false : stryMutAct_9fa48("11769") ? true : (stryCov_9fa48("11769", "11770", "11771"), state.detached || state.suppressReconnect)) {
      if (stryMutAct_9fa48("11772")) {
        {}
      } else {
        stryCov_9fa48("11772");
        return stryMutAct_9fa48("11773") ? {} : (stryCov_9fa48("11773"), {
          state,
          intents: stryMutAct_9fa48("11774") ? ["Stryker was here"] : (stryCov_9fa48("11774"), []),
          actions: stryMutAct_9fa48("11775") ? ["Stryker was here"] : (stryCov_9fa48("11775"), [])
        });
      }
    }
    if (stryMutAct_9fa48("11778") ? event.kind === "iface/disconnected" && event.kind === "iface/connect-failed" : stryMutAct_9fa48("11777") ? false : stryMutAct_9fa48("11776") ? true : (stryCov_9fa48("11776", "11777", "11778"), (stryMutAct_9fa48("11780") ? event.kind !== "iface/disconnected" : stryMutAct_9fa48("11779") ? false : (stryCov_9fa48("11779", "11780"), event.kind === (stryMutAct_9fa48("11781") ? "" : (stryCov_9fa48("11781"), "iface/disconnected")))) || (stryMutAct_9fa48("11783") ? event.kind !== "iface/connect-failed" : stryMutAct_9fa48("11782") ? false : (stryCov_9fa48("11782", "11783"), event.kind === (stryMutAct_9fa48("11784") ? "" : (stryCov_9fa48("11784"), "iface/connect-failed")))))) {
      if (stryMutAct_9fa48("11785")) {
        {}
      } else {
        stryCov_9fa48("11785");
        return stryMutAct_9fa48("11786") ? {} : (stryCov_9fa48("11786"), {
          state: stryMutAct_9fa48("11787") ? {} : (stryCov_9fa48("11787"), {
            ...state,
            waiting: stryMutAct_9fa48("11788") ? false : (stryCov_9fa48("11788"), true)
          }),
          intents: stryMutAct_9fa48("11789") ? [] : (stryCov_9fa48("11789"), [cancelTimerIntent(), setTimerIntent(state.waitMs)]),
          actions: stryMutAct_9fa48("11790") ? ["Stryker was here"] : (stryCov_9fa48("11790"), [])
        });
      }
    }
    if (stryMutAct_9fa48("11793") ? event.kind === "timer/fired" || event.id === INTERFACE_RECONNECT_TIMER_ID : stryMutAct_9fa48("11792") ? false : stryMutAct_9fa48("11791") ? true : (stryCov_9fa48("11791", "11792", "11793"), (stryMutAct_9fa48("11795") ? event.kind !== "timer/fired" : stryMutAct_9fa48("11794") ? true : (stryCov_9fa48("11794", "11795"), event.kind === (stryMutAct_9fa48("11796") ? "" : (stryCov_9fa48("11796"), "timer/fired")))) && (stryMutAct_9fa48("11798") ? event.id !== INTERFACE_RECONNECT_TIMER_ID : stryMutAct_9fa48("11797") ? true : (stryCov_9fa48("11797", "11798"), event.id === INTERFACE_RECONNECT_TIMER_ID)))) {
      if (stryMutAct_9fa48("11799")) {
        {}
      } else {
        stryCov_9fa48("11799");
        if (stryMutAct_9fa48("11802") ? false : stryMutAct_9fa48("11801") ? true : stryMutAct_9fa48("11800") ? state.waiting : (stryCov_9fa48("11800", "11801", "11802"), !state.waiting)) {
          if (stryMutAct_9fa48("11803")) {
            {}
          } else {
            stryCov_9fa48("11803");
            return stryMutAct_9fa48("11804") ? {} : (stryCov_9fa48("11804"), {
              state,
              intents: stryMutAct_9fa48("11805") ? ["Stryker was here"] : (stryCov_9fa48("11805"), []),
              actions: stryMutAct_9fa48("11806") ? ["Stryker was here"] : (stryCov_9fa48("11806"), [])
            });
          }
        }
        const planActions = stepInterfaceReconnectPlanWithActions(initialInterfaceReconnectPlanState(), stryMutAct_9fa48("11807") ? {} : (stryCov_9fa48("11807"), {
          kind: stryMutAct_9fa48("11808") ? "" : (stryCov_9fa48("11808"), "iface/reconnect-plan-gate"),
          attempts: state.attempts,
          maxTries: state.maxTries,
          waitMs: state.waitMs
        })).actions;
        const giveUp = interfaceReconnectGiveUpFromActions(planActions);
        if (stryMutAct_9fa48("11811") ? giveUp === null : stryMutAct_9fa48("11810") ? false : stryMutAct_9fa48("11809") ? true : (stryCov_9fa48("11809", "11810", "11811"), giveUp !== null)) {
          if (stryMutAct_9fa48("11812")) {
            {}
          } else {
            stryCov_9fa48("11812");
            return stryMutAct_9fa48("11813") ? {} : (stryCov_9fa48("11813"), {
              state: stryMutAct_9fa48("11814") ? {} : (stryCov_9fa48("11814"), {
                ...state,
                attempts: giveUp.attempt,
                waiting: stryMutAct_9fa48("11815") ? true : (stryCov_9fa48("11815"), false)
              }),
              intents: stryMutAct_9fa48("11816") ? ["Stryker was here"] : (stryCov_9fa48("11816"), []),
              actions: stryMutAct_9fa48("11817") ? [] : (stryCov_9fa48("11817"), [stryMutAct_9fa48("11818") ? {} : (stryCov_9fa48("11818"), {
                kind: stryMutAct_9fa48("11819") ? "" : (stryCov_9fa48("11819"), "give-up"),
                attempt: giveUp.attempt
              })])
            });
          }
        }
        const reconnect = interfaceReconnectRetryFromActions(planActions);
        if (stryMutAct_9fa48("11822") ? reconnect !== null : stryMutAct_9fa48("11821") ? false : stryMutAct_9fa48("11820") ? true : (stryCov_9fa48("11820", "11821", "11822"), reconnect === null)) {
          if (stryMutAct_9fa48("11823")) {
            {}
          } else {
            stryCov_9fa48("11823");
            return stryMutAct_9fa48("11824") ? {} : (stryCov_9fa48("11824"), {
              state,
              intents: stryMutAct_9fa48("11825") ? ["Stryker was here"] : (stryCov_9fa48("11825"), []),
              actions: stryMutAct_9fa48("11826") ? ["Stryker was here"] : (stryCov_9fa48("11826"), [])
            });
          }
        }
        return stryMutAct_9fa48("11827") ? {} : (stryCov_9fa48("11827"), {
          state: stryMutAct_9fa48("11828") ? {} : (stryCov_9fa48("11828"), {
            ...state,
            attempts: reconnect.attempt,
            waiting: stryMutAct_9fa48("11829") ? true : (stryCov_9fa48("11829"), false)
          }),
          intents: stryMutAct_9fa48("11830") ? ["Stryker was here"] : (stryCov_9fa48("11830"), []),
          actions: stryMutAct_9fa48("11831") ? [] : (stryCov_9fa48("11831"), [stryMutAct_9fa48("11832") ? {} : (stryCov_9fa48("11832"), {
            kind: stryMutAct_9fa48("11833") ? "" : (stryCov_9fa48("11833"), "connect"),
            attempt: reconnect.attempt
          })])
        });
      }
    }
    return stryMutAct_9fa48("11834") ? {} : (stryCov_9fa48("11834"), {
      state,
      intents: stryMutAct_9fa48("11835") ? ["Stryker was here"] : (stryCov_9fa48("11835"), []),
      actions: stryMutAct_9fa48("11836") ? ["Stryker was here"] : (stryCov_9fa48("11836"), [])
    });
  }
}