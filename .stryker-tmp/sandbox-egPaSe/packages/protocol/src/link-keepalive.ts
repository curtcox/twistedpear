/**
 * Pure link keepalive probe / reply framing (1-byte payloads).
 * Pack / classify framing conclusions leave via machine actions (no ad-hoc
 * `packLinkKeepaliveProbe` / `packLinkKeepaliveReply` /
 * `isLinkKeepaliveProbe` / `isLinkKeepaliveReply` reads beside the step).
 * Initiator ignore / responder reply gates conclude via machine actions
 * (no ad-hoc `shouldIgnoreInitiatorKeepaliveProbe` /
 * `shouldReplyKeepaliveProbe` reads beside the step).
 * Timing stays in link-watchdog; send/receive stays at the adapter edge.
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
import type { Event, Intent } from "@twistedpear/effects";
export const LINK_KEEPALIVE_PROBE_BYTE = 0xff;
export const LINK_KEEPALIVE_REPLY_BYTE = 0xfe;
export function packLinkKeepaliveProbe(): Uint8Array {
  if (stryMutAct_9fa48("15177")) {
    {}
  } else {
    stryCov_9fa48("15177");
    return new Uint8Array(stryMutAct_9fa48("15178") ? [] : (stryCov_9fa48("15178"), [LINK_KEEPALIVE_PROBE_BYTE]));
  }
}
export function packLinkKeepaliveReply(): Uint8Array {
  if (stryMutAct_9fa48("15179")) {
    {}
  } else {
    stryCov_9fa48("15179");
    return new Uint8Array(stryMutAct_9fa48("15180") ? [] : (stryCov_9fa48("15180"), [LINK_KEEPALIVE_REPLY_BYTE]));
  }
}
export function isLinkKeepaliveProbe(data: Uint8Array): boolean {
  if (stryMutAct_9fa48("15181")) {
    {}
  } else {
    stryCov_9fa48("15181");
    return stryMutAct_9fa48("15184") ? data.length === 1 || data[0] === LINK_KEEPALIVE_PROBE_BYTE : stryMutAct_9fa48("15183") ? false : stryMutAct_9fa48("15182") ? true : (stryCov_9fa48("15182", "15183", "15184"), (stryMutAct_9fa48("15186") ? data.length !== 1 : stryMutAct_9fa48("15185") ? true : (stryCov_9fa48("15185", "15186"), data.length === 1)) && (stryMutAct_9fa48("15188") ? data[0] !== LINK_KEEPALIVE_PROBE_BYTE : stryMutAct_9fa48("15187") ? true : (stryCov_9fa48("15187", "15188"), data[0] === LINK_KEEPALIVE_PROBE_BYTE)));
  }
}
export function isLinkKeepaliveReply(data: Uint8Array): boolean {
  if (stryMutAct_9fa48("15189")) {
    {}
  } else {
    stryCov_9fa48("15189");
    return stryMutAct_9fa48("15192") ? data.length === 1 || data[0] === LINK_KEEPALIVE_REPLY_BYTE : stryMutAct_9fa48("15191") ? false : stryMutAct_9fa48("15190") ? true : (stryCov_9fa48("15190", "15191", "15192"), (stryMutAct_9fa48("15194") ? data.length !== 1 : stryMutAct_9fa48("15193") ? true : (stryCov_9fa48("15193", "15194"), data.length === 1)) && (stryMutAct_9fa48("15196") ? data[0] !== LINK_KEEPALIVE_REPLY_BYTE : stryMutAct_9fa48("15195") ? true : (stryCov_9fa48("15195", "15196"), data[0] === LINK_KEEPALIVE_REPLY_BYTE)));
  }
}

/** Whether an initiator should drop an inbound keepalive-probe DATA/KEEPALIVE packet. */
export function shouldIgnoreInitiatorKeepaliveProbe(input: {
  readonly initiator: boolean;
  readonly contextKeepalive: boolean;
  readonly probePayload: boolean;
}): boolean {
  if (stryMutAct_9fa48("15197")) {
    {}
  } else {
    stryCov_9fa48("15197");
    return stryMutAct_9fa48("15200") ? input.initiator && input.contextKeepalive || input.probePayload : stryMutAct_9fa48("15199") ? false : stryMutAct_9fa48("15198") ? true : (stryCov_9fa48("15198", "15199", "15200"), (stryMutAct_9fa48("15202") ? input.initiator || input.contextKeepalive : stryMutAct_9fa48("15201") ? true : (stryCov_9fa48("15201", "15202"), input.initiator && input.contextKeepalive)) && input.probePayload);
  }
}

/**
 * shouldIgnoreInitiatorKeepaliveProbe gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldIgnoreInitiatorKeepaliveProbe` reads beside
 * the step).
 */
export type IgnoreInitiatorKeepaliveProbeState = Record<string, never>;
export type IgnoreInitiatorKeepaliveProbeEvent = Event | {
  readonly kind: "link-keepalive/ignore-initiator-probe-gate";
  readonly initiator: boolean;
  readonly contextKeepalive: boolean;
  readonly probePayload: boolean;
};
export type IgnoreInitiatorKeepaliveProbeAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "proceed";
};
export interface IgnoreInitiatorKeepaliveProbeStepResult {
  readonly state: IgnoreInitiatorKeepaliveProbeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IgnoreInitiatorKeepaliveProbeAction[];
}
export function initialIgnoreInitiatorKeepaliveProbeState(): IgnoreInitiatorKeepaliveProbeState {
  if (stryMutAct_9fa48("15203")) {
    {}
  } else {
    stryCov_9fa48("15203");
    return {};
  }
}
export function stepIgnoreInitiatorKeepaliveProbeWithActions(state: IgnoreInitiatorKeepaliveProbeState, event: IgnoreInitiatorKeepaliveProbeEvent): IgnoreInitiatorKeepaliveProbeStepResult {
  if (stryMutAct_9fa48("15204")) {
    {}
  } else {
    stryCov_9fa48("15204");
    if (stryMutAct_9fa48("15207") ? event.kind !== "link-keepalive/ignore-initiator-probe-gate" : stryMutAct_9fa48("15206") ? false : stryMutAct_9fa48("15205") ? true : (stryCov_9fa48("15205", "15206", "15207"), event.kind === (stryMutAct_9fa48("15208") ? "" : (stryCov_9fa48("15208"), "link-keepalive/ignore-initiator-probe-gate")))) {
      if (stryMutAct_9fa48("15209")) {
        {}
      } else {
        stryCov_9fa48("15209");
        return stryMutAct_9fa48("15210") ? {} : (stryCov_9fa48("15210"), {
          state,
          intents: stryMutAct_9fa48("15211") ? ["Stryker was here"] : (stryCov_9fa48("15211"), []),
          actions: stryMutAct_9fa48("15212") ? [] : (stryCov_9fa48("15212"), [stryMutAct_9fa48("15213") ? {} : (stryCov_9fa48("15213"), {
            kind: shouldIgnoreInitiatorKeepaliveProbe(stryMutAct_9fa48("15214") ? {} : (stryCov_9fa48("15214"), {
              initiator: event.initiator,
              contextKeepalive: event.contextKeepalive,
              probePayload: event.probePayload
            })) ? stryMutAct_9fa48("15215") ? "" : (stryCov_9fa48("15215"), "ignore") : stryMutAct_9fa48("15216") ? "" : (stryCov_9fa48("15216"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("15217") ? {} : (stryCov_9fa48("15217"), {
      state,
      intents: stryMutAct_9fa48("15218") ? ["Stryker was here"] : (stryCov_9fa48("15218"), []),
      actions: stryMutAct_9fa48("15219") ? ["Stryker was here"] : (stryCov_9fa48("15219"), [])
    });
  }
}
export function shouldIgnoreInitiatorKeepaliveProbeNow(actions: ReadonlyArray<IgnoreInitiatorKeepaliveProbeAction>): boolean {
  if (stryMutAct_9fa48("15220")) {
    {}
  } else {
    stryCov_9fa48("15220");
    return stryMutAct_9fa48("15221") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("15221"), actions.some(stryMutAct_9fa48("15222") ? () => undefined : (stryCov_9fa48("15222"), action => stryMutAct_9fa48("15225") ? action.kind !== "ignore" : stryMutAct_9fa48("15224") ? false : stryMutAct_9fa48("15223") ? true : (stryCov_9fa48("15223", "15224", "15225"), action.kind === (stryMutAct_9fa48("15226") ? "" : (stryCov_9fa48("15226"), "ignore"))))));
  }
}
export function shouldProceedInitiatorKeepaliveProbe(actions: ReadonlyArray<IgnoreInitiatorKeepaliveProbeAction>): boolean {
  if (stryMutAct_9fa48("15227")) {
    {}
  } else {
    stryCov_9fa48("15227");
    return stryMutAct_9fa48("15228") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("15228"), actions.some(stryMutAct_9fa48("15229") ? () => undefined : (stryCov_9fa48("15229"), action => stryMutAct_9fa48("15232") ? action.kind !== "proceed" : stryMutAct_9fa48("15231") ? false : stryMutAct_9fa48("15230") ? true : (stryCov_9fa48("15230", "15231", "15232"), action.kind === (stryMutAct_9fa48("15233") ? "" : (stryCov_9fa48("15233"), "proceed"))))));
  }
}
/** Whether a responder should reply to an inbound keepalive probe. */
export function shouldReplyKeepaliveProbe(input: {
  readonly initiator: boolean;
  readonly probePayload: boolean;
}): boolean {
  if (stryMutAct_9fa48("15234")) {
    {}
  } else {
    stryCov_9fa48("15234");
    return stryMutAct_9fa48("15237") ? !input.initiator || input.probePayload : stryMutAct_9fa48("15236") ? false : stryMutAct_9fa48("15235") ? true : (stryCov_9fa48("15235", "15236", "15237"), (stryMutAct_9fa48("15238") ? input.initiator : (stryCov_9fa48("15238"), !input.initiator)) && input.probePayload);
  }
}

/**
 * shouldReplyKeepaliveProbe gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReplyKeepaliveProbe` reads beside
 * the step).
 */
export type ReplyKeepaliveProbeState = Record<string, never>;
export type ReplyKeepaliveProbeEvent = Event | {
  readonly kind: "link-keepalive/reply-probe-gate";
  readonly initiator: boolean;
  readonly probePayload: boolean;
};
export type ReplyKeepaliveProbeAction = {
  readonly kind: "reply";
} | {
  readonly kind: "skip";
};
export interface ReplyKeepaliveProbeStepResult {
  readonly state: ReplyKeepaliveProbeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReplyKeepaliveProbeAction[];
}
export function initialReplyKeepaliveProbeState(): ReplyKeepaliveProbeState {
  if (stryMutAct_9fa48("15239")) {
    {}
  } else {
    stryCov_9fa48("15239");
    return {};
  }
}
export function stepReplyKeepaliveProbeWithActions(state: ReplyKeepaliveProbeState, event: ReplyKeepaliveProbeEvent): ReplyKeepaliveProbeStepResult {
  if (stryMutAct_9fa48("15240")) {
    {}
  } else {
    stryCov_9fa48("15240");
    if (stryMutAct_9fa48("15243") ? event.kind !== "link-keepalive/reply-probe-gate" : stryMutAct_9fa48("15242") ? false : stryMutAct_9fa48("15241") ? true : (stryCov_9fa48("15241", "15242", "15243"), event.kind === (stryMutAct_9fa48("15244") ? "" : (stryCov_9fa48("15244"), "link-keepalive/reply-probe-gate")))) {
      if (stryMutAct_9fa48("15245")) {
        {}
      } else {
        stryCov_9fa48("15245");
        return stryMutAct_9fa48("15246") ? {} : (stryCov_9fa48("15246"), {
          state,
          intents: stryMutAct_9fa48("15247") ? ["Stryker was here"] : (stryCov_9fa48("15247"), []),
          actions: stryMutAct_9fa48("15248") ? [] : (stryCov_9fa48("15248"), [stryMutAct_9fa48("15249") ? {} : (stryCov_9fa48("15249"), {
            kind: shouldReplyKeepaliveProbe(stryMutAct_9fa48("15250") ? {} : (stryCov_9fa48("15250"), {
              initiator: event.initiator,
              probePayload: event.probePayload
            })) ? stryMutAct_9fa48("15251") ? "" : (stryCov_9fa48("15251"), "reply") : stryMutAct_9fa48("15252") ? "" : (stryCov_9fa48("15252"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("15253") ? {} : (stryCov_9fa48("15253"), {
      state,
      intents: stryMutAct_9fa48("15254") ? ["Stryker was here"] : (stryCov_9fa48("15254"), []),
      actions: stryMutAct_9fa48("15255") ? ["Stryker was here"] : (stryCov_9fa48("15255"), [])
    });
  }
}
export function shouldReplyKeepaliveProbeNow(actions: ReadonlyArray<ReplyKeepaliveProbeAction>): boolean {
  if (stryMutAct_9fa48("15256")) {
    {}
  } else {
    stryCov_9fa48("15256");
    return stryMutAct_9fa48("15257") ? actions.every(action => action.kind === "reply") : (stryCov_9fa48("15257"), actions.some(stryMutAct_9fa48("15258") ? () => undefined : (stryCov_9fa48("15258"), action => stryMutAct_9fa48("15261") ? action.kind !== "reply" : stryMutAct_9fa48("15260") ? false : stryMutAct_9fa48("15259") ? true : (stryCov_9fa48("15259", "15260", "15261"), action.kind === (stryMutAct_9fa48("15262") ? "" : (stryCov_9fa48("15262"), "reply"))))));
  }
}
export function shouldSkipKeepaliveProbeReply(actions: ReadonlyArray<ReplyKeepaliveProbeAction>): boolean {
  if (stryMutAct_9fa48("15263")) {
    {}
  } else {
    stryCov_9fa48("15263");
    return stryMutAct_9fa48("15264") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("15264"), actions.some(stryMutAct_9fa48("15265") ? () => undefined : (stryCov_9fa48("15265"), action => stryMutAct_9fa48("15268") ? action.kind !== "skip" : stryMutAct_9fa48("15267") ? false : stryMutAct_9fa48("15266") ? true : (stryCov_9fa48("15266", "15267", "15268"), action.kind === (stryMutAct_9fa48("15269") ? "" : (stryCov_9fa48("15269"), "skip"))))));
  }
}
/**
 * Keepalive probe pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkKeepaliveProbe`
 * reads beside the step).
 */
export type PackLinkKeepaliveProbeState = Record<string, never>;
export type PackLinkKeepaliveProbeEvent = Event | {
  readonly kind: "link-keepalive/pack-probe-gate";
};
export type PackLinkKeepaliveProbeAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackLinkKeepaliveProbeStepResult {
  readonly state: PackLinkKeepaliveProbeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkKeepaliveProbeAction[];
}
export function initialPackLinkKeepaliveProbeState(): PackLinkKeepaliveProbeState {
  if (stryMutAct_9fa48("15270")) {
    {}
  } else {
    stryCov_9fa48("15270");
    return {};
  }
}
export function stepPackLinkKeepaliveProbeWithActions(state: PackLinkKeepaliveProbeState, event: PackLinkKeepaliveProbeEvent): PackLinkKeepaliveProbeStepResult {
  if (stryMutAct_9fa48("15271")) {
    {}
  } else {
    stryCov_9fa48("15271");
    if (stryMutAct_9fa48("15274") ? event.kind !== "link-keepalive/pack-probe-gate" : stryMutAct_9fa48("15273") ? false : stryMutAct_9fa48("15272") ? true : (stryCov_9fa48("15272", "15273", "15274"), event.kind === (stryMutAct_9fa48("15275") ? "" : (stryCov_9fa48("15275"), "link-keepalive/pack-probe-gate")))) {
      if (stryMutAct_9fa48("15276")) {
        {}
      } else {
        stryCov_9fa48("15276");
        return stryMutAct_9fa48("15277") ? {} : (stryCov_9fa48("15277"), {
          state,
          intents: stryMutAct_9fa48("15278") ? ["Stryker was here"] : (stryCov_9fa48("15278"), []),
          actions: stryMutAct_9fa48("15279") ? [] : (stryCov_9fa48("15279"), [stryMutAct_9fa48("15280") ? {} : (stryCov_9fa48("15280"), {
            kind: stryMutAct_9fa48("15281") ? "" : (stryCov_9fa48("15281"), "use-raw"),
            raw: packLinkKeepaliveProbe()
          })])
        });
      }
    }
    return stryMutAct_9fa48("15282") ? {} : (stryCov_9fa48("15282"), {
      state,
      intents: stryMutAct_9fa48("15283") ? ["Stryker was here"] : (stryCov_9fa48("15283"), []),
      actions: stryMutAct_9fa48("15284") ? ["Stryker was here"] : (stryCov_9fa48("15284"), [])
    });
  }
}
export function shouldUsePackLinkKeepaliveProbe(actions: ReadonlyArray<PackLinkKeepaliveProbeAction>): boolean {
  if (stryMutAct_9fa48("15285")) {
    {}
  } else {
    stryCov_9fa48("15285");
    return stryMutAct_9fa48("15286") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("15286"), actions.some(stryMutAct_9fa48("15287") ? () => undefined : (stryCov_9fa48("15287"), action => stryMutAct_9fa48("15290") ? action.kind !== "use-raw" : stryMutAct_9fa48("15289") ? false : stryMutAct_9fa48("15288") ? true : (stryCov_9fa48("15288", "15289", "15290"), action.kind === (stryMutAct_9fa48("15291") ? "" : (stryCov_9fa48("15291"), "use-raw"))))));
  }
}

/** Extract packed keepalive probe from step actions; null when no `use-raw`. */
export function packLinkKeepaliveProbeRawFromActions(actions: ReadonlyArray<PackLinkKeepaliveProbeAction>): Uint8Array | null {
  if (stryMutAct_9fa48("15292")) {
    {}
  } else {
    stryCov_9fa48("15292");
    const action = actions.find(stryMutAct_9fa48("15293") ? () => undefined : (stryCov_9fa48("15293"), entry => stryMutAct_9fa48("15296") ? entry.kind !== "use-raw" : stryMutAct_9fa48("15295") ? false : stryMutAct_9fa48("15294") ? true : (stryCov_9fa48("15294", "15295", "15296"), entry.kind === (stryMutAct_9fa48("15297") ? "" : (stryCov_9fa48("15297"), "use-raw")))));
    return (stryMutAct_9fa48("15300") ? action?.kind !== "use-raw" : stryMutAct_9fa48("15299") ? false : stryMutAct_9fa48("15298") ? true : (stryCov_9fa48("15298", "15299", "15300"), (stryMutAct_9fa48("15301") ? action.kind : (stryCov_9fa48("15301"), action?.kind)) === (stryMutAct_9fa48("15302") ? "" : (stryCov_9fa48("15302"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Keepalive reply pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkKeepaliveReply`
 * reads beside the step).
 */
export type PackLinkKeepaliveReplyState = Record<string, never>;
export type PackLinkKeepaliveReplyEvent = Event | {
  readonly kind: "link-keepalive/pack-reply-gate";
};
export type PackLinkKeepaliveReplyAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackLinkKeepaliveReplyStepResult {
  readonly state: PackLinkKeepaliveReplyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkKeepaliveReplyAction[];
}
export function initialPackLinkKeepaliveReplyState(): PackLinkKeepaliveReplyState {
  if (stryMutAct_9fa48("15303")) {
    {}
  } else {
    stryCov_9fa48("15303");
    return {};
  }
}
export function stepPackLinkKeepaliveReplyWithActions(state: PackLinkKeepaliveReplyState, event: PackLinkKeepaliveReplyEvent): PackLinkKeepaliveReplyStepResult {
  if (stryMutAct_9fa48("15304")) {
    {}
  } else {
    stryCov_9fa48("15304");
    if (stryMutAct_9fa48("15307") ? event.kind !== "link-keepalive/pack-reply-gate" : stryMutAct_9fa48("15306") ? false : stryMutAct_9fa48("15305") ? true : (stryCov_9fa48("15305", "15306", "15307"), event.kind === (stryMutAct_9fa48("15308") ? "" : (stryCov_9fa48("15308"), "link-keepalive/pack-reply-gate")))) {
      if (stryMutAct_9fa48("15309")) {
        {}
      } else {
        stryCov_9fa48("15309");
        return stryMutAct_9fa48("15310") ? {} : (stryCov_9fa48("15310"), {
          state,
          intents: stryMutAct_9fa48("15311") ? ["Stryker was here"] : (stryCov_9fa48("15311"), []),
          actions: stryMutAct_9fa48("15312") ? [] : (stryCov_9fa48("15312"), [stryMutAct_9fa48("15313") ? {} : (stryCov_9fa48("15313"), {
            kind: stryMutAct_9fa48("15314") ? "" : (stryCov_9fa48("15314"), "use-raw"),
            raw: packLinkKeepaliveReply()
          })])
        });
      }
    }
    return stryMutAct_9fa48("15315") ? {} : (stryCov_9fa48("15315"), {
      state,
      intents: stryMutAct_9fa48("15316") ? ["Stryker was here"] : (stryCov_9fa48("15316"), []),
      actions: stryMutAct_9fa48("15317") ? ["Stryker was here"] : (stryCov_9fa48("15317"), [])
    });
  }
}
export function shouldUsePackLinkKeepaliveReply(actions: ReadonlyArray<PackLinkKeepaliveReplyAction>): boolean {
  if (stryMutAct_9fa48("15318")) {
    {}
  } else {
    stryCov_9fa48("15318");
    return stryMutAct_9fa48("15319") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("15319"), actions.some(stryMutAct_9fa48("15320") ? () => undefined : (stryCov_9fa48("15320"), action => stryMutAct_9fa48("15323") ? action.kind !== "use-raw" : stryMutAct_9fa48("15322") ? false : stryMutAct_9fa48("15321") ? true : (stryCov_9fa48("15321", "15322", "15323"), action.kind === (stryMutAct_9fa48("15324") ? "" : (stryCov_9fa48("15324"), "use-raw"))))));
  }
}

/** Extract packed keepalive reply from step actions; null when no `use-raw`. */
export function packLinkKeepaliveReplyRawFromActions(actions: ReadonlyArray<PackLinkKeepaliveReplyAction>): Uint8Array | null {
  if (stryMutAct_9fa48("15325")) {
    {}
  } else {
    stryCov_9fa48("15325");
    const action = actions.find(stryMutAct_9fa48("15326") ? () => undefined : (stryCov_9fa48("15326"), entry => stryMutAct_9fa48("15329") ? entry.kind !== "use-raw" : stryMutAct_9fa48("15328") ? false : stryMutAct_9fa48("15327") ? true : (stryCov_9fa48("15327", "15328", "15329"), entry.kind === (stryMutAct_9fa48("15330") ? "" : (stryCov_9fa48("15330"), "use-raw")))));
    return (stryMutAct_9fa48("15333") ? action?.kind !== "use-raw" : stryMutAct_9fa48("15332") ? false : stryMutAct_9fa48("15331") ? true : (stryCov_9fa48("15331", "15332", "15333"), (stryMutAct_9fa48("15334") ? action.kind : (stryCov_9fa48("15334"), action?.kind)) === (stryMutAct_9fa48("15335") ? "" : (stryCov_9fa48("15335"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Keepalive payload classify framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkKeepaliveProbe` /
 * `isLinkKeepaliveReply` reads beside the step). Unrecognized payloads become
 * `reject`.
 */
export type ClassifyLinkKeepaliveState = Record<string, never>;
export type ClassifyLinkKeepaliveEvent = Event | {
  readonly kind: "link-keepalive/classify-gate";
  readonly data: Uint8Array;
};
export type ClassifyLinkKeepaliveAction = {
  readonly kind: "probe";
} | {
  readonly kind: "reply";
} | {
  readonly kind: "reject";
};
export interface ClassifyLinkKeepaliveStepResult {
  readonly state: ClassifyLinkKeepaliveState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClassifyLinkKeepaliveAction[];
}
export function initialClassifyLinkKeepaliveState(): ClassifyLinkKeepaliveState {
  if (stryMutAct_9fa48("15336")) {
    {}
  } else {
    stryCov_9fa48("15336");
    return {};
  }
}
export function stepClassifyLinkKeepaliveWithActions(state: ClassifyLinkKeepaliveState, event: ClassifyLinkKeepaliveEvent): ClassifyLinkKeepaliveStepResult {
  if (stryMutAct_9fa48("15337")) {
    {}
  } else {
    stryCov_9fa48("15337");
    if (stryMutAct_9fa48("15340") ? event.kind !== "link-keepalive/classify-gate" : stryMutAct_9fa48("15339") ? false : stryMutAct_9fa48("15338") ? true : (stryCov_9fa48("15338", "15339", "15340"), event.kind === (stryMutAct_9fa48("15341") ? "" : (stryCov_9fa48("15341"), "link-keepalive/classify-gate")))) {
      if (stryMutAct_9fa48("15342")) {
        {}
      } else {
        stryCov_9fa48("15342");
        if (stryMutAct_9fa48("15344") ? false : stryMutAct_9fa48("15343") ? true : (stryCov_9fa48("15343", "15344"), isLinkKeepaliveProbe(event.data))) {
          if (stryMutAct_9fa48("15345")) {
            {}
          } else {
            stryCov_9fa48("15345");
            return stryMutAct_9fa48("15346") ? {} : (stryCov_9fa48("15346"), {
              state,
              intents: stryMutAct_9fa48("15347") ? ["Stryker was here"] : (stryCov_9fa48("15347"), []),
              actions: stryMutAct_9fa48("15348") ? [] : (stryCov_9fa48("15348"), [stryMutAct_9fa48("15349") ? {} : (stryCov_9fa48("15349"), {
                kind: stryMutAct_9fa48("15350") ? "" : (stryCov_9fa48("15350"), "probe")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("15352") ? false : stryMutAct_9fa48("15351") ? true : (stryCov_9fa48("15351", "15352"), isLinkKeepaliveReply(event.data))) {
          if (stryMutAct_9fa48("15353")) {
            {}
          } else {
            stryCov_9fa48("15353");
            return stryMutAct_9fa48("15354") ? {} : (stryCov_9fa48("15354"), {
              state,
              intents: stryMutAct_9fa48("15355") ? ["Stryker was here"] : (stryCov_9fa48("15355"), []),
              actions: stryMutAct_9fa48("15356") ? [] : (stryCov_9fa48("15356"), [stryMutAct_9fa48("15357") ? {} : (stryCov_9fa48("15357"), {
                kind: stryMutAct_9fa48("15358") ? "" : (stryCov_9fa48("15358"), "reply")
              })])
            });
          }
        }
        return stryMutAct_9fa48("15359") ? {} : (stryCov_9fa48("15359"), {
          state,
          intents: stryMutAct_9fa48("15360") ? ["Stryker was here"] : (stryCov_9fa48("15360"), []),
          actions: stryMutAct_9fa48("15361") ? [] : (stryCov_9fa48("15361"), [stryMutAct_9fa48("15362") ? {} : (stryCov_9fa48("15362"), {
            kind: stryMutAct_9fa48("15363") ? "" : (stryCov_9fa48("15363"), "reject")
          })])
        });
      }
    }
    return stryMutAct_9fa48("15364") ? {} : (stryCov_9fa48("15364"), {
      state,
      intents: stryMutAct_9fa48("15365") ? ["Stryker was here"] : (stryCov_9fa48("15365"), []),
      actions: stryMutAct_9fa48("15366") ? ["Stryker was here"] : (stryCov_9fa48("15366"), [])
    });
  }
}
export function shouldClassifyLinkKeepaliveProbe(actions: ReadonlyArray<ClassifyLinkKeepaliveAction>): boolean {
  if (stryMutAct_9fa48("15367")) {
    {}
  } else {
    stryCov_9fa48("15367");
    return stryMutAct_9fa48("15368") ? actions.every(action => action.kind === "probe") : (stryCov_9fa48("15368"), actions.some(stryMutAct_9fa48("15369") ? () => undefined : (stryCov_9fa48("15369"), action => stryMutAct_9fa48("15372") ? action.kind !== "probe" : stryMutAct_9fa48("15371") ? false : stryMutAct_9fa48("15370") ? true : (stryCov_9fa48("15370", "15371", "15372"), action.kind === (stryMutAct_9fa48("15373") ? "" : (stryCov_9fa48("15373"), "probe"))))));
  }
}
export function shouldClassifyLinkKeepaliveReply(actions: ReadonlyArray<ClassifyLinkKeepaliveAction>): boolean {
  if (stryMutAct_9fa48("15374")) {
    {}
  } else {
    stryCov_9fa48("15374");
    return stryMutAct_9fa48("15375") ? actions.every(action => action.kind === "reply") : (stryCov_9fa48("15375"), actions.some(stryMutAct_9fa48("15376") ? () => undefined : (stryCov_9fa48("15376"), action => stryMutAct_9fa48("15379") ? action.kind !== "reply" : stryMutAct_9fa48("15378") ? false : stryMutAct_9fa48("15377") ? true : (stryCov_9fa48("15377", "15378", "15379"), action.kind === (stryMutAct_9fa48("15380") ? "" : (stryCov_9fa48("15380"), "reply"))))));
  }
}
export function shouldRejectClassifyLinkKeepalive(actions: ReadonlyArray<ClassifyLinkKeepaliveAction>): boolean {
  if (stryMutAct_9fa48("15381")) {
    {}
  } else {
    stryCov_9fa48("15381");
    return stryMutAct_9fa48("15382") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("15382"), actions.some(stryMutAct_9fa48("15383") ? () => undefined : (stryCov_9fa48("15383"), action => stryMutAct_9fa48("15386") ? action.kind !== "reject" : stryMutAct_9fa48("15385") ? false : stryMutAct_9fa48("15384") ? true : (stryCov_9fa48("15384", "15385", "15386"), action.kind === (stryMutAct_9fa48("15387") ? "" : (stryCov_9fa48("15387"), "reject"))))));
  }
}