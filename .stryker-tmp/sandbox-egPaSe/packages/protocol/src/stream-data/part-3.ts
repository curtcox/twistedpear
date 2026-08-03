/** Extracted from stream-data.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS channel StreamDataMessage header framing.
 * Compression / channel IO stay at the adapter edge.
 * Pack / unpack conclusions leave via machine actions (no ad-hoc
 * `packStreamDataMessage` / `unpackStreamDataMessage` reads beside the step).
 * Stream ready-callback unregister conclusions leave via machine actions
 * (no ad-hoc `planUnregisterStreamReadyCallback` reads beside the step).
 * Unregister plan nested via {@link stepStreamReadyCallbackUnregisterPlanWithActions}.
 * Write chunk-length / read-size / chunk-take clamp conclusions leave via
 * machine actions (no ad-hoc `clampStreamDataChunkLength` /
 * `clampStreamReadSize` / `clampStreamChunkTake` reads beside the step).
 * Append / read-defer / read-return / chunk-consume / eof-mark / stream-id /
 * message-handle / ready-callback-register conclusions leave via machine
 * actions (no ad-hoc `shouldAppendStreamData` / `shouldDeferStreamRead` /
 * `shouldReturnStreamReadResult` / `shouldConsumeStreamChunk` /
 * `shouldMarkStreamEof` / `isStreamIdAssigned` /
 * `shouldHandleStreamDataMessage` / `shouldRegisterStreamReadyCallback`
 * reads beside the step).
 */function stryNS_9fa48() {
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
import type { StreamDataMessageHandleAction } from "./part-2.js";
export function shouldHandleStreamDataMessageNow(actions: ReadonlyArray<StreamDataMessageHandleAction>): boolean {
  if (stryMutAct_9fa48("32538")) {
    {}
  } else {
    stryCov_9fa48("32538");
    return stryMutAct_9fa48("32539") ? actions.every(action => action.kind === "handle") : (stryCov_9fa48("32539"), actions.some(stryMutAct_9fa48("32540") ? () => undefined : (stryCov_9fa48("32540"), action => stryMutAct_9fa48("32543") ? action.kind !== "handle" : stryMutAct_9fa48("32542") ? false : stryMutAct_9fa48("32541") ? true : (stryCov_9fa48("32541", "32542", "32543"), action.kind === (stryMutAct_9fa48("32544") ? "" : (stryCov_9fa48("32544"), "handle"))))));
  }
}
export function shouldIgnoreStreamDataMessage(actions: ReadonlyArray<StreamDataMessageHandleAction>): boolean {
  if (stryMutAct_9fa48("32545")) {
    {}
  } else {
    stryCov_9fa48("32545");
    return stryMutAct_9fa48("32546") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("32546"), actions.some(stryMutAct_9fa48("32547") ? () => undefined : (stryCov_9fa48("32547"), action => stryMutAct_9fa48("32550") ? action.kind !== "ignore" : stryMutAct_9fa48("32549") ? false : stryMutAct_9fa48("32548") ? true : (stryCov_9fa48("32548", "32549", "32550"), action.kind === (stryMutAct_9fa48("32551") ? "" : (stryCov_9fa48("32551"), "ignore"))))));
  }
}

/** Whether createReader should register an optional ready-callback. */
export function shouldRegisterStreamReadyCallback(callbackPresent: boolean): boolean {
  if (stryMutAct_9fa48("32552")) {
    {}
  } else {
    stryCov_9fa48("32552");
    return callbackPresent;
  }
}

/**
 * Stream ready-callback register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterStreamReadyCallback` reads beside the step).
 */
export type StreamReadyCallbackRegisterState = Record<string, never>;
export type StreamReadyCallbackRegisterEvent = Event | {
  readonly kind: "stream/ready-callback-register-gate";
  readonly callbackPresent: boolean;
};
export type StreamReadyCallbackRegisterAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export interface StreamReadyCallbackRegisterStepResult {
  readonly state: StreamReadyCallbackRegisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadyCallbackRegisterAction[];
}
export function initialStreamReadyCallbackRegisterState(): StreamReadyCallbackRegisterState {
  if (stryMutAct_9fa48("32553")) {
    {}
  } else {
    stryCov_9fa48("32553");
    return {};
  }
}
export function stepStreamReadyCallbackRegisterWithActions(state: StreamReadyCallbackRegisterState, event: StreamReadyCallbackRegisterEvent): StreamReadyCallbackRegisterStepResult {
  if (stryMutAct_9fa48("32554")) {
    {}
  } else {
    stryCov_9fa48("32554");
    if (stryMutAct_9fa48("32557") ? event.kind !== "stream/ready-callback-register-gate" : stryMutAct_9fa48("32556") ? false : stryMutAct_9fa48("32555") ? true : (stryCov_9fa48("32555", "32556", "32557"), event.kind === (stryMutAct_9fa48("32558") ? "" : (stryCov_9fa48("32558"), "stream/ready-callback-register-gate")))) {
      if (stryMutAct_9fa48("32559")) {
        {}
      } else {
        stryCov_9fa48("32559");
        return stryMutAct_9fa48("32560") ? {} : (stryCov_9fa48("32560"), {
          state,
          intents: stryMutAct_9fa48("32561") ? ["Stryker was here"] : (stryCov_9fa48("32561"), []),
          actions: stryMutAct_9fa48("32562") ? [] : (stryCov_9fa48("32562"), [stryMutAct_9fa48("32563") ? {} : (stryCov_9fa48("32563"), {
            kind: shouldRegisterStreamReadyCallback(event.callbackPresent) ? stryMutAct_9fa48("32564") ? "" : (stryCov_9fa48("32564"), "register") : stryMutAct_9fa48("32565") ? "" : (stryCov_9fa48("32565"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32566") ? {} : (stryCov_9fa48("32566"), {
      state,
      intents: stryMutAct_9fa48("32567") ? ["Stryker was here"] : (stryCov_9fa48("32567"), []),
      actions: stryMutAct_9fa48("32568") ? ["Stryker was here"] : (stryCov_9fa48("32568"), [])
    });
  }
}
export function shouldRegisterStreamReadyNow(actions: ReadonlyArray<StreamReadyCallbackRegisterAction>): boolean {
  if (stryMutAct_9fa48("32569")) {
    {}
  } else {
    stryCov_9fa48("32569");
    return stryMutAct_9fa48("32570") ? actions.every(action => action.kind === "register") : (stryCov_9fa48("32570"), actions.some(stryMutAct_9fa48("32571") ? () => undefined : (stryCov_9fa48("32571"), action => stryMutAct_9fa48("32574") ? action.kind !== "register" : stryMutAct_9fa48("32573") ? false : stryMutAct_9fa48("32572") ? true : (stryCov_9fa48("32572", "32573", "32574"), action.kind === (stryMutAct_9fa48("32575") ? "" : (stryCov_9fa48("32575"), "register"))))));
  }
}
export function shouldSkipStreamReadyRegister(actions: ReadonlyArray<StreamReadyCallbackRegisterAction>): boolean {
  if (stryMutAct_9fa48("32576")) {
    {}
  } else {
    stryCov_9fa48("32576");
    return stryMutAct_9fa48("32577") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("32577"), actions.some(stryMutAct_9fa48("32578") ? () => undefined : (stryCov_9fa48("32578"), action => stryMutAct_9fa48("32581") ? action.kind !== "skip" : stryMutAct_9fa48("32580") ? false : stryMutAct_9fa48("32579") ? true : (stryCov_9fa48("32579", "32580", "32581"), action.kind === (stryMutAct_9fa48("32582") ? "" : (stryCov_9fa48("32582"), "skip"))))));
  }
}

/**
 * Unregister a stream ready-callback: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterStreamReadyCallback(index: number): number | null {
  if (stryMutAct_9fa48("32583")) {
    {}
  } else {
    stryCov_9fa48("32583");
    return (stryMutAct_9fa48("32587") ? index < 0 : stryMutAct_9fa48("32586") ? index > 0 : stryMutAct_9fa48("32585") ? false : stryMutAct_9fa48("32584") ? true : (stryCov_9fa48("32584", "32585", "32586", "32587"), index >= 0)) ? index : null;
  }
}

/** Whether unregister may splice after {@link planUnregisterStreamReadyCallback}. */
export function shouldUnregisterStreamReadyCallback(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("32588")) {
    {}
  } else {
    stryCov_9fa48("32588");
    return indexPresent;
  }
}

/**
 * Stream ready-callback unregister plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterStreamReadyCallback` reads beside the step). Nested under
 * {@link stepStreamReadyCallbackUnregisterWithActions}.
 */
export type StreamReadyCallbackUnregisterPlanState = Record<string, never>;
export type StreamReadyCallbackUnregisterPlanEvent = Event | {
  readonly kind: "stream/ready-callback-unregister-plan-gate";
  readonly index: number;
};
export type StreamReadyCallbackUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};
export interface StreamReadyCallbackUnregisterPlanStepResult {
  readonly state: StreamReadyCallbackUnregisterPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadyCallbackUnregisterPlanAction[];
}
export function initialStreamReadyCallbackUnregisterPlanState(): StreamReadyCallbackUnregisterPlanState {
  if (stryMutAct_9fa48("32589")) {
    {}
  } else {
    stryCov_9fa48("32589");
    return {};
  }
}
export function stepStreamReadyCallbackUnregisterPlanWithActions(state: StreamReadyCallbackUnregisterPlanState, event: StreamReadyCallbackUnregisterPlanEvent): StreamReadyCallbackUnregisterPlanStepResult {
  if (stryMutAct_9fa48("32590")) {
    {}
  } else {
    stryCov_9fa48("32590");
    if (stryMutAct_9fa48("32593") ? event.kind !== "stream/ready-callback-unregister-plan-gate" : stryMutAct_9fa48("32592") ? false : stryMutAct_9fa48("32591") ? true : (stryCov_9fa48("32591", "32592", "32593"), event.kind === (stryMutAct_9fa48("32594") ? "" : (stryCov_9fa48("32594"), "stream/ready-callback-unregister-plan-gate")))) {
      if (stryMutAct_9fa48("32595")) {
        {}
      } else {
        stryCov_9fa48("32595");
        const index = planUnregisterStreamReadyCallback(event.index);
        return stryMutAct_9fa48("32596") ? {} : (stryCov_9fa48("32596"), {
          state,
          intents: stryMutAct_9fa48("32597") ? ["Stryker was here"] : (stryCov_9fa48("32597"), []),
          actions: (stryMutAct_9fa48("32600") ? index !== null : stryMutAct_9fa48("32599") ? false : stryMutAct_9fa48("32598") ? true : (stryCov_9fa48("32598", "32599", "32600"), index === null)) ? stryMutAct_9fa48("32601") ? ["Stryker was here"] : (stryCov_9fa48("32601"), []) : stryMutAct_9fa48("32602") ? [] : (stryCov_9fa48("32602"), [stryMutAct_9fa48("32603") ? {} : (stryCov_9fa48("32603"), {
            kind: stryMutAct_9fa48("32604") ? "" : (stryCov_9fa48("32604"), "remove"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("32605") ? {} : (stryCov_9fa48("32605"), {
      state,
      intents: stryMutAct_9fa48("32606") ? ["Stryker was here"] : (stryCov_9fa48("32606"), []),
      actions: stryMutAct_9fa48("32607") ? ["Stryker was here"] : (stryCov_9fa48("32607"), [])
    });
  }
}
export function streamReadyCallbackUnregisterPlanIndex(actions: ReadonlyArray<StreamReadyCallbackUnregisterPlanAction>): number | null {
  if (stryMutAct_9fa48("32608")) {
    {}
  } else {
    stryCov_9fa48("32608");
    const action = actions.find(stryMutAct_9fa48("32609") ? () => undefined : (stryCov_9fa48("32609"), entry => stryMutAct_9fa48("32612") ? entry.kind !== "remove" : stryMutAct_9fa48("32611") ? false : stryMutAct_9fa48("32610") ? true : (stryCov_9fa48("32610", "32611", "32612"), entry.kind === (stryMutAct_9fa48("32613") ? "" : (stryCov_9fa48("32613"), "remove")))));
    return (stryMutAct_9fa48("32616") ? action?.kind !== "remove" : stryMutAct_9fa48("32615") ? false : stryMutAct_9fa48("32614") ? true : (stryCov_9fa48("32614", "32615", "32616"), (stryMutAct_9fa48("32617") ? action.kind : (stryCov_9fa48("32617"), action?.kind)) === (stryMutAct_9fa48("32618") ? "" : (stryCov_9fa48("32618"), "remove")))) ? action.index : null;
  }
}
export function shouldRemoveStreamReadyCallbackUnregisterPlan(actions: ReadonlyArray<StreamReadyCallbackUnregisterPlanAction>): boolean {
  if (stryMutAct_9fa48("32619")) {
    {}
  } else {
    stryCov_9fa48("32619");
    return stryMutAct_9fa48("32620") ? actions.every(action => action.kind === "remove") : (stryCov_9fa48("32620"), actions.some(stryMutAct_9fa48("32621") ? () => undefined : (stryCov_9fa48("32621"), action => stryMutAct_9fa48("32624") ? action.kind !== "remove" : stryMutAct_9fa48("32623") ? false : stryMutAct_9fa48("32622") ? true : (stryCov_9fa48("32622", "32623", "32624"), action.kind === (stryMutAct_9fa48("32625") ? "" : (stryCov_9fa48("32625"), "remove"))))));
  }
}

/**
 * Stream ready-callback unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterStreamReadyCallback` reads beside the step).
 * Plan nested via {@link stepStreamReadyCallbackUnregisterPlanWithActions}
 * (`remove`).
 */
export type StreamReadyCallbackUnregisterState = Record<string, never>;
export type StreamReadyCallbackUnregisterEvent = Event | {
  readonly kind: "stream/ready-callback-unregister-gate";
  readonly index: number;
};
export type StreamReadyCallbackUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};
export interface StreamReadyCallbackUnregisterStepResult {
  readonly state: StreamReadyCallbackUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadyCallbackUnregisterAction[];
}
export function initialStreamReadyCallbackUnregisterState(): StreamReadyCallbackUnregisterState {
  if (stryMutAct_9fa48("32626")) {
    {}
  } else {
    stryCov_9fa48("32626");
    return {};
  }
}
export function stepStreamReadyCallbackUnregisterWithActions(state: StreamReadyCallbackUnregisterState, event: StreamReadyCallbackUnregisterEvent): StreamReadyCallbackUnregisterStepResult {
  if (stryMutAct_9fa48("32627")) {
    {}
  } else {
    stryCov_9fa48("32627");
    if (stryMutAct_9fa48("32630") ? event.kind !== "stream/ready-callback-unregister-gate" : stryMutAct_9fa48("32629") ? false : stryMutAct_9fa48("32628") ? true : (stryCov_9fa48("32628", "32629", "32630"), event.kind === (stryMutAct_9fa48("32631") ? "" : (stryCov_9fa48("32631"), "stream/ready-callback-unregister-gate")))) {
      if (stryMutAct_9fa48("32632")) {
        {}
      } else {
        stryCov_9fa48("32632");
        const planActions = stepStreamReadyCallbackUnregisterPlanWithActions(initialStreamReadyCallbackUnregisterPlanState(), stryMutAct_9fa48("32633") ? {} : (stryCov_9fa48("32633"), {
          kind: stryMutAct_9fa48("32634") ? "" : (stryCov_9fa48("32634"), "stream/ready-callback-unregister-plan-gate"),
          index: event.index
        })).actions;
        const index = streamReadyCallbackUnregisterPlanIndex(planActions);
        return stryMutAct_9fa48("32635") ? {} : (stryCov_9fa48("32635"), {
          state,
          intents: stryMutAct_9fa48("32636") ? ["Stryker was here"] : (stryCov_9fa48("32636"), []),
          actions: (stryMutAct_9fa48("32639") ? index !== null : stryMutAct_9fa48("32638") ? false : stryMutAct_9fa48("32637") ? true : (stryCov_9fa48("32637", "32638", "32639"), index === null)) ? stryMutAct_9fa48("32640") ? ["Stryker was here"] : (stryCov_9fa48("32640"), []) : stryMutAct_9fa48("32641") ? [] : (stryCov_9fa48("32641"), [stryMutAct_9fa48("32642") ? {} : (stryCov_9fa48("32642"), {
            kind: stryMutAct_9fa48("32643") ? "" : (stryCov_9fa48("32643"), "remove"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("32644") ? {} : (stryCov_9fa48("32644"), {
      state,
      intents: stryMutAct_9fa48("32645") ? ["Stryker was here"] : (stryCov_9fa48("32645"), []),
      actions: stryMutAct_9fa48("32646") ? ["Stryker was here"] : (stryCov_9fa48("32646"), [])
    });
  }
}
export function streamReadyCallbackUnregisterIndex(actions: ReadonlyArray<StreamReadyCallbackUnregisterAction>): number | null {
  if (stryMutAct_9fa48("32647")) {
    {}
  } else {
    stryCov_9fa48("32647");
    const action = actions.find(stryMutAct_9fa48("32648") ? () => undefined : (stryCov_9fa48("32648"), entry => stryMutAct_9fa48("32651") ? entry.kind !== "remove" : stryMutAct_9fa48("32650") ? false : stryMutAct_9fa48("32649") ? true : (stryCov_9fa48("32649", "32650", "32651"), entry.kind === (stryMutAct_9fa48("32652") ? "" : (stryCov_9fa48("32652"), "remove")))));
    return (stryMutAct_9fa48("32655") ? action?.kind !== "remove" : stryMutAct_9fa48("32654") ? false : stryMutAct_9fa48("32653") ? true : (stryCov_9fa48("32653", "32654", "32655"), (stryMutAct_9fa48("32656") ? action.kind : (stryCov_9fa48("32656"), action?.kind)) === (stryMutAct_9fa48("32657") ? "" : (stryCov_9fa48("32657"), "remove")))) ? action.index : null;
  }
}
export function shouldRemoveStreamReadyCallback(actions: ReadonlyArray<StreamReadyCallbackUnregisterAction>): boolean {
  if (stryMutAct_9fa48("32658")) {
    {}
  } else {
    stryCov_9fa48("32658");
    return stryMutAct_9fa48("32659") ? actions.every(action => action.kind === "remove") : (stryCov_9fa48("32659"), actions.some(stryMutAct_9fa48("32660") ? () => undefined : (stryCov_9fa48("32660"), action => stryMutAct_9fa48("32663") ? action.kind !== "remove" : stryMutAct_9fa48("32662") ? false : stryMutAct_9fa48("32661") ? true : (stryCov_9fa48("32661", "32662", "32663"), action.kind === (stryMutAct_9fa48("32664") ? "" : (stryCov_9fa48("32664"), "remove"))))));
  }
}