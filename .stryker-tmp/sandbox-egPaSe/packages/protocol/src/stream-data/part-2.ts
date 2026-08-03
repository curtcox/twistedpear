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
import { shouldDeferStreamRead } from "./part-1.js";
import type { StreamReadDeferState } from "./part-1.js";
export type StreamReadDeferEvent = Event | {
  readonly kind: "stream/read-defer-gate";
  readonly bufferLength: number;
  readonly eof: boolean;
};
export type StreamReadDeferAction = {
  readonly kind: "defer";
} | {
  readonly kind: "proceed";
};
export interface StreamReadDeferStepResult {
  readonly state: StreamReadDeferState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadDeferAction[];
}
export function initialStreamReadDeferState(): StreamReadDeferState {
  if (stryMutAct_9fa48("32319")) {
    {}
  } else {
    stryCov_9fa48("32319");
    return {};
  }
}
export function stepStreamReadDeferWithActions(state: StreamReadDeferState, event: StreamReadDeferEvent): StreamReadDeferStepResult {
  if (stryMutAct_9fa48("32320")) {
    {}
  } else {
    stryCov_9fa48("32320");
    if (stryMutAct_9fa48("32323") ? event.kind !== "stream/read-defer-gate" : stryMutAct_9fa48("32322") ? false : stryMutAct_9fa48("32321") ? true : (stryCov_9fa48("32321", "32322", "32323"), event.kind === (stryMutAct_9fa48("32324") ? "" : (stryCov_9fa48("32324"), "stream/read-defer-gate")))) {
      if (stryMutAct_9fa48("32325")) {
        {}
      } else {
        stryCov_9fa48("32325");
        return stryMutAct_9fa48("32326") ? {} : (stryCov_9fa48("32326"), {
          state,
          intents: stryMutAct_9fa48("32327") ? ["Stryker was here"] : (stryCov_9fa48("32327"), []),
          actions: stryMutAct_9fa48("32328") ? [] : (stryCov_9fa48("32328"), [stryMutAct_9fa48("32329") ? {} : (stryCov_9fa48("32329"), {
            kind: shouldDeferStreamRead(event.bufferLength, event.eof) ? stryMutAct_9fa48("32330") ? "" : (stryCov_9fa48("32330"), "defer") : stryMutAct_9fa48("32331") ? "" : (stryCov_9fa48("32331"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32332") ? {} : (stryCov_9fa48("32332"), {
      state,
      intents: stryMutAct_9fa48("32333") ? ["Stryker was here"] : (stryCov_9fa48("32333"), []),
      actions: stryMutAct_9fa48("32334") ? ["Stryker was here"] : (stryCov_9fa48("32334"), [])
    });
  }
}
export function shouldStreamReadDefer(actions: ReadonlyArray<StreamReadDeferAction>): boolean {
  if (stryMutAct_9fa48("32335")) {
    {}
  } else {
    stryCov_9fa48("32335");
    return stryMutAct_9fa48("32336") ? actions.every(action => action.kind === "defer") : (stryCov_9fa48("32336"), actions.some(stryMutAct_9fa48("32337") ? () => undefined : (stryCov_9fa48("32337"), action => stryMutAct_9fa48("32340") ? action.kind !== "defer" : stryMutAct_9fa48("32339") ? false : stryMutAct_9fa48("32338") ? true : (stryCov_9fa48("32338", "32339", "32340"), action.kind === (stryMutAct_9fa48("32341") ? "" : (stryCov_9fa48("32341"), "defer"))))));
  }
}
export function shouldStreamReadProceed(actions: ReadonlyArray<StreamReadDeferAction>): boolean {
  if (stryMutAct_9fa48("32342")) {
    {}
  } else {
    stryCov_9fa48("32342");
    return stryMutAct_9fa48("32343") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("32343"), actions.some(stryMutAct_9fa48("32344") ? () => undefined : (stryCov_9fa48("32344"), action => stryMutAct_9fa48("32347") ? action.kind !== "proceed" : stryMutAct_9fa48("32346") ? false : stryMutAct_9fa48("32345") ? true : (stryCov_9fa48("32345", "32346", "32347"), action.kind === (stryMutAct_9fa48("32348") ? "" : (stryCov_9fa48("32348"), "proceed"))))));
  }
}

/** Whether a read produced a returnable buffer (bytes copied or EOF empty result). */
export function shouldReturnStreamReadResult(copied: number, eof: boolean): boolean {
  if (stryMutAct_9fa48("32349")) {
    {}
  } else {
    stryCov_9fa48("32349");
    return stryMutAct_9fa48("32352") ? copied > 0 && eof : stryMutAct_9fa48("32351") ? false : stryMutAct_9fa48("32350") ? true : (stryCov_9fa48("32350", "32351", "32352"), (stryMutAct_9fa48("32355") ? copied <= 0 : stryMutAct_9fa48("32354") ? copied >= 0 : stryMutAct_9fa48("32353") ? false : (stryCov_9fa48("32353", "32354", "32355"), copied > 0)) || eof);
  }
}

/**
 * Stream read-return gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReturnStreamReadResult`
 * reads beside the step).
 */
export type StreamReadReturnState = Record<string, never>;
export type StreamReadReturnEvent = Event | {
  readonly kind: "stream/read-return-gate";
  readonly copied: number;
  readonly eof: boolean;
};
export type StreamReadReturnAction = {
  readonly kind: "yield";
} | {
  readonly kind: "skip";
};
export interface StreamReadReturnStepResult {
  readonly state: StreamReadReturnState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamReadReturnAction[];
}
export function initialStreamReadReturnState(): StreamReadReturnState {
  if (stryMutAct_9fa48("32356")) {
    {}
  } else {
    stryCov_9fa48("32356");
    return {};
  }
}
export function stepStreamReadReturnWithActions(state: StreamReadReturnState, event: StreamReadReturnEvent): StreamReadReturnStepResult {
  if (stryMutAct_9fa48("32357")) {
    {}
  } else {
    stryCov_9fa48("32357");
    if (stryMutAct_9fa48("32360") ? event.kind !== "stream/read-return-gate" : stryMutAct_9fa48("32359") ? false : stryMutAct_9fa48("32358") ? true : (stryCov_9fa48("32358", "32359", "32360"), event.kind === (stryMutAct_9fa48("32361") ? "" : (stryCov_9fa48("32361"), "stream/read-return-gate")))) {
      if (stryMutAct_9fa48("32362")) {
        {}
      } else {
        stryCov_9fa48("32362");
        return stryMutAct_9fa48("32363") ? {} : (stryCov_9fa48("32363"), {
          state,
          intents: stryMutAct_9fa48("32364") ? ["Stryker was here"] : (stryCov_9fa48("32364"), []),
          actions: stryMutAct_9fa48("32365") ? [] : (stryCov_9fa48("32365"), [stryMutAct_9fa48("32366") ? {} : (stryCov_9fa48("32366"), {
            kind: shouldReturnStreamReadResult(event.copied, event.eof) ? stryMutAct_9fa48("32367") ? "" : (stryCov_9fa48("32367"), "yield") : stryMutAct_9fa48("32368") ? "" : (stryCov_9fa48("32368"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32369") ? {} : (stryCov_9fa48("32369"), {
      state,
      intents: stryMutAct_9fa48("32370") ? ["Stryker was here"] : (stryCov_9fa48("32370"), []),
      actions: stryMutAct_9fa48("32371") ? ["Stryker was here"] : (stryCov_9fa48("32371"), [])
    });
  }
}
export function shouldYieldStreamRead(actions: ReadonlyArray<StreamReadReturnAction>): boolean {
  if (stryMutAct_9fa48("32372")) {
    {}
  } else {
    stryCov_9fa48("32372");
    return stryMutAct_9fa48("32373") ? actions.every(action => action.kind === "yield") : (stryCov_9fa48("32373"), actions.some(stryMutAct_9fa48("32374") ? () => undefined : (stryCov_9fa48("32374"), action => stryMutAct_9fa48("32377") ? action.kind !== "yield" : stryMutAct_9fa48("32376") ? false : stryMutAct_9fa48("32375") ? true : (stryCov_9fa48("32375", "32376", "32377"), action.kind === (stryMutAct_9fa48("32378") ? "" : (stryCov_9fa48("32378"), "yield"))))));
  }
}
export function shouldSkipStreamReadYield(actions: ReadonlyArray<StreamReadReturnAction>): boolean {
  if (stryMutAct_9fa48("32379")) {
    {}
  } else {
    stryCov_9fa48("32379");
    return stryMutAct_9fa48("32380") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("32380"), actions.some(stryMutAct_9fa48("32381") ? () => undefined : (stryCov_9fa48("32381"), action => stryMutAct_9fa48("32384") ? action.kind !== "skip" : stryMutAct_9fa48("32383") ? false : stryMutAct_9fa48("32382") ? true : (stryCov_9fa48("32382", "32383", "32384"), action.kind === (stryMutAct_9fa48("32385") ? "" : (stryCov_9fa48("32385"), "skip"))))));
  }
}

/** Bytes to take from the current chunk into the remaining read window. */
export function clampStreamChunkTake(chunkLength: number, remaining: number): number {
  if (stryMutAct_9fa48("32386")) {
    {}
  } else {
    stryCov_9fa48("32386");
    return stryMutAct_9fa48("32387") ? Math.max(chunkLength, remaining) : (stryCov_9fa48("32387"), Math.min(chunkLength, remaining));
  }
}

/**
 * Stream chunk-take clamp is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `clampStreamChunkTake`
 * reads beside the step).
 */
export type ClampStreamChunkTakeState = Record<string, never>;
export type ClampStreamChunkTakeEvent = Event | {
  readonly kind: "stream/chunk-take-gate";
  readonly chunkLength: number;
  readonly remaining: number;
};
export type ClampStreamChunkTakeAction = {
  readonly kind: "use-take";
  readonly take: number;
};
export interface ClampStreamChunkTakeStepResult {
  readonly state: ClampStreamChunkTakeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClampStreamChunkTakeAction[];
}
export function initialClampStreamChunkTakeState(): ClampStreamChunkTakeState {
  if (stryMutAct_9fa48("32388")) {
    {}
  } else {
    stryCov_9fa48("32388");
    return {};
  }
}
export function stepClampStreamChunkTakeWithActions(state: ClampStreamChunkTakeState, event: ClampStreamChunkTakeEvent): ClampStreamChunkTakeStepResult {
  if (stryMutAct_9fa48("32389")) {
    {}
  } else {
    stryCov_9fa48("32389");
    if (stryMutAct_9fa48("32392") ? event.kind !== "stream/chunk-take-gate" : stryMutAct_9fa48("32391") ? false : stryMutAct_9fa48("32390") ? true : (stryCov_9fa48("32390", "32391", "32392"), event.kind === (stryMutAct_9fa48("32393") ? "" : (stryCov_9fa48("32393"), "stream/chunk-take-gate")))) {
      if (stryMutAct_9fa48("32394")) {
        {}
      } else {
        stryCov_9fa48("32394");
        return stryMutAct_9fa48("32395") ? {} : (stryCov_9fa48("32395"), {
          state,
          intents: stryMutAct_9fa48("32396") ? ["Stryker was here"] : (stryCov_9fa48("32396"), []),
          actions: stryMutAct_9fa48("32397") ? [] : (stryCov_9fa48("32397"), [stryMutAct_9fa48("32398") ? {} : (stryCov_9fa48("32398"), {
            kind: stryMutAct_9fa48("32399") ? "" : (stryCov_9fa48("32399"), "use-take"),
            take: clampStreamChunkTake(event.chunkLength, event.remaining)
          })])
        });
      }
    }
    return stryMutAct_9fa48("32400") ? {} : (stryCov_9fa48("32400"), {
      state,
      intents: stryMutAct_9fa48("32401") ? ["Stryker was here"] : (stryCov_9fa48("32401"), []),
      actions: stryMutAct_9fa48("32402") ? ["Stryker was here"] : (stryCov_9fa48("32402"), [])
    });
  }
}
export function shouldUseStreamChunkTake(actions: ReadonlyArray<ClampStreamChunkTakeAction>): boolean {
  if (stryMutAct_9fa48("32403")) {
    {}
  } else {
    stryCov_9fa48("32403");
    return stryMutAct_9fa48("32404") ? actions.every(action => action.kind === "use-take") : (stryCov_9fa48("32404"), actions.some(stryMutAct_9fa48("32405") ? () => undefined : (stryCov_9fa48("32405"), action => stryMutAct_9fa48("32408") ? action.kind !== "use-take" : stryMutAct_9fa48("32407") ? false : stryMutAct_9fa48("32406") ? true : (stryCov_9fa48("32406", "32407", "32408"), action.kind === (stryMutAct_9fa48("32409") ? "" : (stryCov_9fa48("32409"), "use-take"))))));
  }
}

/** Extract clamped chunk take from step actions; null when no `use-take`. */
export function streamChunkTakeFromActions(actions: ReadonlyArray<ClampStreamChunkTakeAction>): number | null {
  if (stryMutAct_9fa48("32410")) {
    {}
  } else {
    stryCov_9fa48("32410");
    const action = actions.find(stryMutAct_9fa48("32411") ? () => undefined : (stryCov_9fa48("32411"), entry => stryMutAct_9fa48("32414") ? entry.kind !== "use-take" : stryMutAct_9fa48("32413") ? false : stryMutAct_9fa48("32412") ? true : (stryCov_9fa48("32412", "32413", "32414"), entry.kind === (stryMutAct_9fa48("32415") ? "" : (stryCov_9fa48("32415"), "use-take")))));
    return (stryMutAct_9fa48("32418") ? action?.kind !== "use-take" : stryMutAct_9fa48("32417") ? false : stryMutAct_9fa48("32416") ? true : (stryCov_9fa48("32416", "32417", "32418"), (stryMutAct_9fa48("32419") ? action.kind : (stryCov_9fa48("32419"), action?.kind)) === (stryMutAct_9fa48("32420") ? "" : (stryCov_9fa48("32420"), "use-take")))) ? action.take : null;
  }
}

/** Whether the taken bytes consume the entire front chunk (shift vs residual slice). */
export function shouldConsumeStreamChunk(take: number, chunkLength: number): boolean {
  if (stryMutAct_9fa48("32421")) {
    {}
  } else {
    stryCov_9fa48("32421");
    return stryMutAct_9fa48("32424") ? take !== chunkLength : stryMutAct_9fa48("32423") ? false : stryMutAct_9fa48("32422") ? true : (stryCov_9fa48("32422", "32423", "32424"), take === chunkLength);
  }
}

/**
 * Stream chunk-consume gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldConsumeStreamChunk`
 * reads beside the step).
 */
export type StreamChunkConsumeState = Record<string, never>;
export type StreamChunkConsumeEvent = Event | {
  readonly kind: "stream/chunk-consume-gate";
  readonly take: number;
  readonly chunkLength: number;
};
export type StreamChunkConsumeAction = {
  readonly kind: "consume";
} | {
  readonly kind: "residual";
};
export interface StreamChunkConsumeStepResult {
  readonly state: StreamChunkConsumeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamChunkConsumeAction[];
}
export function initialStreamChunkConsumeState(): StreamChunkConsumeState {
  if (stryMutAct_9fa48("32425")) {
    {}
  } else {
    stryCov_9fa48("32425");
    return {};
  }
}
export function stepStreamChunkConsumeWithActions(state: StreamChunkConsumeState, event: StreamChunkConsumeEvent): StreamChunkConsumeStepResult {
  if (stryMutAct_9fa48("32426")) {
    {}
  } else {
    stryCov_9fa48("32426");
    if (stryMutAct_9fa48("32429") ? event.kind !== "stream/chunk-consume-gate" : stryMutAct_9fa48("32428") ? false : stryMutAct_9fa48("32427") ? true : (stryCov_9fa48("32427", "32428", "32429"), event.kind === (stryMutAct_9fa48("32430") ? "" : (stryCov_9fa48("32430"), "stream/chunk-consume-gate")))) {
      if (stryMutAct_9fa48("32431")) {
        {}
      } else {
        stryCov_9fa48("32431");
        return stryMutAct_9fa48("32432") ? {} : (stryCov_9fa48("32432"), {
          state,
          intents: stryMutAct_9fa48("32433") ? ["Stryker was here"] : (stryCov_9fa48("32433"), []),
          actions: stryMutAct_9fa48("32434") ? [] : (stryCov_9fa48("32434"), [stryMutAct_9fa48("32435") ? {} : (stryCov_9fa48("32435"), {
            kind: shouldConsumeStreamChunk(event.take, event.chunkLength) ? stryMutAct_9fa48("32436") ? "" : (stryCov_9fa48("32436"), "consume") : stryMutAct_9fa48("32437") ? "" : (stryCov_9fa48("32437"), "residual")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32438") ? {} : (stryCov_9fa48("32438"), {
      state,
      intents: stryMutAct_9fa48("32439") ? ["Stryker was here"] : (stryCov_9fa48("32439"), []),
      actions: stryMutAct_9fa48("32440") ? ["Stryker was here"] : (stryCov_9fa48("32440"), [])
    });
  }
}
export function shouldStreamChunkConsume(actions: ReadonlyArray<StreamChunkConsumeAction>): boolean {
  if (stryMutAct_9fa48("32441")) {
    {}
  } else {
    stryCov_9fa48("32441");
    return stryMutAct_9fa48("32442") ? actions.every(action => action.kind === "consume") : (stryCov_9fa48("32442"), actions.some(stryMutAct_9fa48("32443") ? () => undefined : (stryCov_9fa48("32443"), action => stryMutAct_9fa48("32446") ? action.kind !== "consume" : stryMutAct_9fa48("32445") ? false : stryMutAct_9fa48("32444") ? true : (stryCov_9fa48("32444", "32445", "32446"), action.kind === (stryMutAct_9fa48("32447") ? "" : (stryCov_9fa48("32447"), "consume"))))));
  }
}
export function shouldStreamChunkResidual(actions: ReadonlyArray<StreamChunkConsumeAction>): boolean {
  if (stryMutAct_9fa48("32448")) {
    {}
  } else {
    stryCov_9fa48("32448");
    return stryMutAct_9fa48("32449") ? actions.every(action => action.kind === "residual") : (stryCov_9fa48("32449"), actions.some(stryMutAct_9fa48("32450") ? () => undefined : (stryCov_9fa48("32450"), action => stryMutAct_9fa48("32453") ? action.kind !== "residual" : stryMutAct_9fa48("32452") ? false : stryMutAct_9fa48("32451") ? true : (stryCov_9fa48("32451", "32452", "32453"), action.kind === (stryMutAct_9fa48("32454") ? "" : (stryCov_9fa48("32454"), "residual"))))));
  }
}

/** Whether an inbound stream-data message should mark the reader EOF. */
export function shouldMarkStreamEof(eof: boolean): boolean {
  if (stryMutAct_9fa48("32455")) {
    {}
  } else {
    stryCov_9fa48("32455");
    return eof;
  }
}

/**
 * Stream EOF-mark gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldMarkStreamEof`
 * reads beside the step).
 */
export type StreamEofMarkState = Record<string, never>;
export type StreamEofMarkEvent = Event | {
  readonly kind: "stream/eof-mark-gate";
  readonly eof: boolean;
};
export type StreamEofMarkAction = {
  readonly kind: "mark";
} | {
  readonly kind: "skip";
};
export interface StreamEofMarkStepResult {
  readonly state: StreamEofMarkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamEofMarkAction[];
}
export function initialStreamEofMarkState(): StreamEofMarkState {
  if (stryMutAct_9fa48("32456")) {
    {}
  } else {
    stryCov_9fa48("32456");
    return {};
  }
}
export function stepStreamEofMarkWithActions(state: StreamEofMarkState, event: StreamEofMarkEvent): StreamEofMarkStepResult {
  if (stryMutAct_9fa48("32457")) {
    {}
  } else {
    stryCov_9fa48("32457");
    if (stryMutAct_9fa48("32460") ? event.kind !== "stream/eof-mark-gate" : stryMutAct_9fa48("32459") ? false : stryMutAct_9fa48("32458") ? true : (stryCov_9fa48("32458", "32459", "32460"), event.kind === (stryMutAct_9fa48("32461") ? "" : (stryCov_9fa48("32461"), "stream/eof-mark-gate")))) {
      if (stryMutAct_9fa48("32462")) {
        {}
      } else {
        stryCov_9fa48("32462");
        return stryMutAct_9fa48("32463") ? {} : (stryCov_9fa48("32463"), {
          state,
          intents: stryMutAct_9fa48("32464") ? ["Stryker was here"] : (stryCov_9fa48("32464"), []),
          actions: stryMutAct_9fa48("32465") ? [] : (stryCov_9fa48("32465"), [stryMutAct_9fa48("32466") ? {} : (stryCov_9fa48("32466"), {
            kind: shouldMarkStreamEof(event.eof) ? stryMutAct_9fa48("32467") ? "" : (stryCov_9fa48("32467"), "mark") : stryMutAct_9fa48("32468") ? "" : (stryCov_9fa48("32468"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32469") ? {} : (stryCov_9fa48("32469"), {
      state,
      intents: stryMutAct_9fa48("32470") ? ["Stryker was here"] : (stryCov_9fa48("32470"), []),
      actions: stryMutAct_9fa48("32471") ? ["Stryker was here"] : (stryCov_9fa48("32471"), [])
    });
  }
}
export function shouldStreamEofMark(actions: ReadonlyArray<StreamEofMarkAction>): boolean {
  if (stryMutAct_9fa48("32472")) {
    {}
  } else {
    stryCov_9fa48("32472");
    return stryMutAct_9fa48("32473") ? actions.every(action => action.kind === "mark") : (stryCov_9fa48("32473"), actions.some(stryMutAct_9fa48("32474") ? () => undefined : (stryCov_9fa48("32474"), action => stryMutAct_9fa48("32477") ? action.kind !== "mark" : stryMutAct_9fa48("32476") ? false : stryMutAct_9fa48("32475") ? true : (stryCov_9fa48("32475", "32476", "32477"), action.kind === (stryMutAct_9fa48("32478") ? "" : (stryCov_9fa48("32478"), "mark"))))));
  }
}
export function shouldSkipStreamEofMark(actions: ReadonlyArray<StreamEofMarkAction>): boolean {
  if (stryMutAct_9fa48("32479")) {
    {}
  } else {
    stryCov_9fa48("32479");
    return stryMutAct_9fa48("32480") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("32480"), actions.some(stryMutAct_9fa48("32481") ? () => undefined : (stryCov_9fa48("32481"), action => stryMutAct_9fa48("32484") ? action.kind !== "skip" : stryMutAct_9fa48("32483") ? false : stryMutAct_9fa48("32482") ? true : (stryCov_9fa48("32482", "32483", "32484"), action.kind === (stryMutAct_9fa48("32485") ? "" : (stryCov_9fa48("32485"), "skip"))))));
  }
}

/** Whether a stream id has been assigned for packing. */
export function isStreamIdAssigned(streamIdPresent: boolean): boolean {
  if (stryMutAct_9fa48("32486")) {
    {}
  } else {
    stryCov_9fa48("32486");
    return streamIdPresent;
  }
}

/**
 * Stream-id assigned gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isStreamIdAssigned`
 * reads beside the step).
 */
export type StreamIdAssignedState = Record<string, never>;
export type StreamIdAssignedEvent = Event | {
  readonly kind: "stream/id-assigned-gate";
  readonly streamIdPresent: boolean;
};
export type StreamIdAssignedAction = {
  readonly kind: "assigned";
} | {
  readonly kind: "unassigned";
};
export interface StreamIdAssignedStepResult {
  readonly state: StreamIdAssignedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamIdAssignedAction[];
}
export function initialStreamIdAssignedState(): StreamIdAssignedState {
  if (stryMutAct_9fa48("32487")) {
    {}
  } else {
    stryCov_9fa48("32487");
    return {};
  }
}
export function stepStreamIdAssignedWithActions(state: StreamIdAssignedState, event: StreamIdAssignedEvent): StreamIdAssignedStepResult {
  if (stryMutAct_9fa48("32488")) {
    {}
  } else {
    stryCov_9fa48("32488");
    if (stryMutAct_9fa48("32491") ? event.kind !== "stream/id-assigned-gate" : stryMutAct_9fa48("32490") ? false : stryMutAct_9fa48("32489") ? true : (stryCov_9fa48("32489", "32490", "32491"), event.kind === (stryMutAct_9fa48("32492") ? "" : (stryCov_9fa48("32492"), "stream/id-assigned-gate")))) {
      if (stryMutAct_9fa48("32493")) {
        {}
      } else {
        stryCov_9fa48("32493");
        return stryMutAct_9fa48("32494") ? {} : (stryCov_9fa48("32494"), {
          state,
          intents: stryMutAct_9fa48("32495") ? ["Stryker was here"] : (stryCov_9fa48("32495"), []),
          actions: stryMutAct_9fa48("32496") ? [] : (stryCov_9fa48("32496"), [stryMutAct_9fa48("32497") ? {} : (stryCov_9fa48("32497"), {
            kind: isStreamIdAssigned(event.streamIdPresent) ? stryMutAct_9fa48("32498") ? "" : (stryCov_9fa48("32498"), "assigned") : stryMutAct_9fa48("32499") ? "" : (stryCov_9fa48("32499"), "unassigned")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32500") ? {} : (stryCov_9fa48("32500"), {
      state,
      intents: stryMutAct_9fa48("32501") ? ["Stryker was here"] : (stryCov_9fa48("32501"), []),
      actions: stryMutAct_9fa48("32502") ? ["Stryker was here"] : (stryCov_9fa48("32502"), [])
    });
  }
}
export function shouldStreamIdAssigned(actions: ReadonlyArray<StreamIdAssignedAction>): boolean {
  if (stryMutAct_9fa48("32503")) {
    {}
  } else {
    stryCov_9fa48("32503");
    return stryMutAct_9fa48("32504") ? actions.every(action => action.kind === "assigned") : (stryCov_9fa48("32504"), actions.some(stryMutAct_9fa48("32505") ? () => undefined : (stryCov_9fa48("32505"), action => stryMutAct_9fa48("32508") ? action.kind !== "assigned" : stryMutAct_9fa48("32507") ? false : stryMutAct_9fa48("32506") ? true : (stryCov_9fa48("32506", "32507", "32508"), action.kind === (stryMutAct_9fa48("32509") ? "" : (stryCov_9fa48("32509"), "assigned"))))));
  }
}
export function shouldStreamIdUnassigned(actions: ReadonlyArray<StreamIdAssignedAction>): boolean {
  if (stryMutAct_9fa48("32510")) {
    {}
  } else {
    stryCov_9fa48("32510");
    return stryMutAct_9fa48("32511") ? actions.every(action => action.kind === "unassigned") : (stryCov_9fa48("32511"), actions.some(stryMutAct_9fa48("32512") ? () => undefined : (stryCov_9fa48("32512"), action => stryMutAct_9fa48("32515") ? action.kind !== "unassigned" : stryMutAct_9fa48("32514") ? false : stryMutAct_9fa48("32513") ? true : (stryCov_9fa48("32513", "32514", "32515"), action.kind === (stryMutAct_9fa48("32516") ? "" : (stryCov_9fa48("32516"), "unassigned"))))));
  }
}

/** Whether an inbound stream-data message belongs to this reader. */
export function shouldHandleStreamDataMessage(input: {
  readonly messageStreamId: number | null;
  readonly expectedStreamId: number;
}): boolean {
  if (stryMutAct_9fa48("32517")) {
    {}
  } else {
    stryCov_9fa48("32517");
    return stryMutAct_9fa48("32520") ? input.messageStreamId !== input.expectedStreamId : stryMutAct_9fa48("32519") ? false : stryMutAct_9fa48("32518") ? true : (stryCov_9fa48("32518", "32519", "32520"), input.messageStreamId === input.expectedStreamId);
  }
}

/**
 * Stream-data message handle gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldHandleStreamDataMessage`
 * reads beside the step).
 */
export type StreamDataMessageHandleState = Record<string, never>;
export type StreamDataMessageHandleEvent = Event | {
  readonly kind: "stream/data-message-handle-gate";
  readonly messageStreamId: number | null;
  readonly expectedStreamId: number;
};
export type StreamDataMessageHandleAction = {
  readonly kind: "handle";
} | {
  readonly kind: "ignore";
};
export interface StreamDataMessageHandleStepResult {
  readonly state: StreamDataMessageHandleState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StreamDataMessageHandleAction[];
}
export function initialStreamDataMessageHandleState(): StreamDataMessageHandleState {
  if (stryMutAct_9fa48("32521")) {
    {}
  } else {
    stryCov_9fa48("32521");
    return {};
  }
}
export function stepStreamDataMessageHandleWithActions(state: StreamDataMessageHandleState, event: StreamDataMessageHandleEvent): StreamDataMessageHandleStepResult {
  if (stryMutAct_9fa48("32522")) {
    {}
  } else {
    stryCov_9fa48("32522");
    if (stryMutAct_9fa48("32525") ? event.kind !== "stream/data-message-handle-gate" : stryMutAct_9fa48("32524") ? false : stryMutAct_9fa48("32523") ? true : (stryCov_9fa48("32523", "32524", "32525"), event.kind === (stryMutAct_9fa48("32526") ? "" : (stryCov_9fa48("32526"), "stream/data-message-handle-gate")))) {
      if (stryMutAct_9fa48("32527")) {
        {}
      } else {
        stryCov_9fa48("32527");
        return stryMutAct_9fa48("32528") ? {} : (stryCov_9fa48("32528"), {
          state,
          intents: stryMutAct_9fa48("32529") ? ["Stryker was here"] : (stryCov_9fa48("32529"), []),
          actions: stryMutAct_9fa48("32530") ? [] : (stryCov_9fa48("32530"), [stryMutAct_9fa48("32531") ? {} : (stryCov_9fa48("32531"), {
            kind: shouldHandleStreamDataMessage(stryMutAct_9fa48("32532") ? {} : (stryCov_9fa48("32532"), {
              messageStreamId: event.messageStreamId,
              expectedStreamId: event.expectedStreamId
            })) ? stryMutAct_9fa48("32533") ? "" : (stryCov_9fa48("32533"), "handle") : stryMutAct_9fa48("32534") ? "" : (stryCov_9fa48("32534"), "ignore")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32535") ? {} : (stryCov_9fa48("32535"), {
      state,
      intents: stryMutAct_9fa48("32536") ? ["Stryker was here"] : (stryCov_9fa48("32536"), []),
      actions: stryMutAct_9fa48("32537") ? ["Stryker was here"] : (stryCov_9fa48("32537"), [])
    });
  }
}