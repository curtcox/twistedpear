/**
 * Pure HDLC byte stuffing for Reticulum interface framing.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeHdlcFrame` / `decodeHdlcFrames` reads beside the step).
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
export const HDLC_FLAG = 0x7e;
export const HDLC_ESCAPE = 0x7d;
export const HDLC_ESCAPE_MASK = 0x20;
export interface HdlcDecodeResult {
  readonly frames: ReadonlyArray<Uint8Array>;
  readonly buffer: Uint8Array;
  readonly inEscape: boolean;
}
export interface HdlcDecodeState {
  readonly buffer?: Uint8Array;
  readonly inEscape?: boolean;
}
export function encodeHdlcFrame(payload: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("9757")) {
    {}
  } else {
    stryCov_9fa48("9757");
    const output: number[] = stryMutAct_9fa48("9758") ? [] : (stryCov_9fa48("9758"), [HDLC_FLAG]);
    for (const byte of payload) {
      if (stryMutAct_9fa48("9759")) {
        {}
      } else {
        stryCov_9fa48("9759");
        if (stryMutAct_9fa48("9762") ? byte === HDLC_FLAG && byte === HDLC_ESCAPE : stryMutAct_9fa48("9761") ? false : stryMutAct_9fa48("9760") ? true : (stryCov_9fa48("9760", "9761", "9762"), (stryMutAct_9fa48("9764") ? byte !== HDLC_FLAG : stryMutAct_9fa48("9763") ? false : (stryCov_9fa48("9763", "9764"), byte === HDLC_FLAG)) || (stryMutAct_9fa48("9766") ? byte !== HDLC_ESCAPE : stryMutAct_9fa48("9765") ? false : (stryCov_9fa48("9765", "9766"), byte === HDLC_ESCAPE)))) {
          if (stryMutAct_9fa48("9767")) {
            {}
          } else {
            stryCov_9fa48("9767");
            output.push(HDLC_ESCAPE, byte ^ HDLC_ESCAPE_MASK);
          }
        } else {
          if (stryMutAct_9fa48("9768")) {
            {}
          } else {
            stryCov_9fa48("9768");
            output.push(byte);
          }
        }
      }
    }
    output.push(HDLC_FLAG);
    return Uint8Array.from(output);
  }
}
export function decodeHdlcFrames(input: Uint8Array, state: HdlcDecodeState = {}): HdlcDecodeResult {
  if (stryMutAct_9fa48("9769")) {
    {}
  } else {
    stryCov_9fa48("9769");
    const frames: Uint8Array[] = stryMutAct_9fa48("9770") ? ["Stryker was here"] : (stryCov_9fa48("9770"), []);
    const buffer = Array.from(stryMutAct_9fa48("9771") ? state.buffer && new Uint8Array() : (stryCov_9fa48("9771"), state.buffer ?? new Uint8Array()));
    let inEscape = stryMutAct_9fa48("9772") ? state.inEscape && false : (stryCov_9fa48("9772"), state.inEscape ?? (stryMutAct_9fa48("9773") ? true : (stryCov_9fa48("9773"), false)));
    for (const byte of input) {
      if (stryMutAct_9fa48("9774")) {
        {}
      } else {
        stryCov_9fa48("9774");
        if (stryMutAct_9fa48("9776") ? false : stryMutAct_9fa48("9775") ? true : (stryCov_9fa48("9775", "9776"), inEscape)) {
          if (stryMutAct_9fa48("9777")) {
            {}
          } else {
            stryCov_9fa48("9777");
            buffer.push(byte ^ HDLC_ESCAPE_MASK);
            inEscape = stryMutAct_9fa48("9778") ? true : (stryCov_9fa48("9778"), false);
            continue;
          }
        }
        if (stryMutAct_9fa48("9781") ? byte !== HDLC_ESCAPE : stryMutAct_9fa48("9780") ? false : stryMutAct_9fa48("9779") ? true : (stryCov_9fa48("9779", "9780", "9781"), byte === HDLC_ESCAPE)) {
          if (stryMutAct_9fa48("9782")) {
            {}
          } else {
            stryCov_9fa48("9782");
            inEscape = stryMutAct_9fa48("9783") ? false : (stryCov_9fa48("9783"), true);
            continue;
          }
        }
        if (stryMutAct_9fa48("9786") ? byte !== HDLC_FLAG : stryMutAct_9fa48("9785") ? false : stryMutAct_9fa48("9784") ? true : (stryCov_9fa48("9784", "9785", "9786"), byte === HDLC_FLAG)) {
          if (stryMutAct_9fa48("9787")) {
            {}
          } else {
            stryCov_9fa48("9787");
            if (stryMutAct_9fa48("9791") ? buffer.length <= 0 : stryMutAct_9fa48("9790") ? buffer.length >= 0 : stryMutAct_9fa48("9789") ? false : stryMutAct_9fa48("9788") ? true : (stryCov_9fa48("9788", "9789", "9790", "9791"), buffer.length > 0)) {
              if (stryMutAct_9fa48("9792")) {
                {}
              } else {
                stryCov_9fa48("9792");
                frames.push(Uint8Array.from(buffer));
                buffer.length = 0;
              }
            }
            continue;
          }
        }
        buffer.push(byte);
      }
    }
    return stryMutAct_9fa48("9793") ? {} : (stryCov_9fa48("9793"), {
      frames,
      buffer: Uint8Array.from(buffer),
      inEscape
    });
  }
}

/** Streaming HDLC decode state for sim / step usage. */
export interface HdlcStreamState {
  readonly buffer: Uint8Array;
  readonly inEscape: boolean;
  readonly frames: ReadonlyArray<Uint8Array>;
}
export function initialHdlcStreamState(): HdlcStreamState {
  if (stryMutAct_9fa48("9794")) {
    {}
  } else {
    stryCov_9fa48("9794");
    return stryMutAct_9fa48("9795") ? {} : (stryCov_9fa48("9795"), {
      buffer: new Uint8Array(),
      inEscape: stryMutAct_9fa48("9796") ? true : (stryCov_9fa48("9796"), false),
      frames: stryMutAct_9fa48("9797") ? ["Stryker was here"] : (stryCov_9fa48("9797"), [])
    });
  }
}
export function pushHdlcBytes(state: HdlcStreamState, input: Uint8Array): HdlcStreamState {
  if (stryMutAct_9fa48("9798")) {
    {}
  } else {
    stryCov_9fa48("9798");
    const decoded = decodeHdlcFrames(input, stryMutAct_9fa48("9799") ? {} : (stryCov_9fa48("9799"), {
      buffer: state.buffer,
      inEscape: state.inEscape
    }));
    return stryMutAct_9fa48("9800") ? {} : (stryCov_9fa48("9800"), {
      buffer: decoded.buffer,
      inEscape: decoded.inEscape,
      frames: stryMutAct_9fa48("9801") ? [] : (stryCov_9fa48("9801"), [...state.frames, ...decoded.frames])
    });
  }
}

/**
 * HDLC encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeHdlcFrame`
 * reads beside the step).
 */
export type EncodeHdlcFrameState = Record<string, never>;
export type EncodeHdlcFrameEvent = Event | {
  readonly kind: "hdlc/encode-gate";
  readonly payload: Uint8Array;
};
export type EncodeHdlcFrameAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface EncodeHdlcFrameStepResult {
  readonly state: EncodeHdlcFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeHdlcFrameAction[];
}
export function initialEncodeHdlcFrameState(): EncodeHdlcFrameState {
  if (stryMutAct_9fa48("9802")) {
    {}
  } else {
    stryCov_9fa48("9802");
    return {};
  }
}
export function stepEncodeHdlcFrameWithActions(state: EncodeHdlcFrameState, event: EncodeHdlcFrameEvent): EncodeHdlcFrameStepResult {
  if (stryMutAct_9fa48("9803")) {
    {}
  } else {
    stryCov_9fa48("9803");
    if (stryMutAct_9fa48("9806") ? event.kind !== "hdlc/encode-gate" : stryMutAct_9fa48("9805") ? false : stryMutAct_9fa48("9804") ? true : (stryCov_9fa48("9804", "9805", "9806"), event.kind === (stryMutAct_9fa48("9807") ? "" : (stryCov_9fa48("9807"), "hdlc/encode-gate")))) {
      if (stryMutAct_9fa48("9808")) {
        {}
      } else {
        stryCov_9fa48("9808");
        return stryMutAct_9fa48("9809") ? {} : (stryCov_9fa48("9809"), {
          state,
          intents: stryMutAct_9fa48("9810") ? ["Stryker was here"] : (stryCov_9fa48("9810"), []),
          actions: stryMutAct_9fa48("9811") ? [] : (stryCov_9fa48("9811"), [stryMutAct_9fa48("9812") ? {} : (stryCov_9fa48("9812"), {
            kind: stryMutAct_9fa48("9813") ? "" : (stryCov_9fa48("9813"), "use-raw"),
            raw: encodeHdlcFrame(event.payload)
          })])
        });
      }
    }
    return stryMutAct_9fa48("9814") ? {} : (stryCov_9fa48("9814"), {
      state,
      intents: stryMutAct_9fa48("9815") ? ["Stryker was here"] : (stryCov_9fa48("9815"), []),
      actions: stryMutAct_9fa48("9816") ? ["Stryker was here"] : (stryCov_9fa48("9816"), [])
    });
  }
}
export function shouldUseEncodeHdlcFrame(actions: ReadonlyArray<EncodeHdlcFrameAction>): boolean {
  if (stryMutAct_9fa48("9817")) {
    {}
  } else {
    stryCov_9fa48("9817");
    return stryMutAct_9fa48("9818") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("9818"), actions.some(stryMutAct_9fa48("9819") ? () => undefined : (stryCov_9fa48("9819"), action => stryMutAct_9fa48("9822") ? action.kind !== "use-raw" : stryMutAct_9fa48("9821") ? false : stryMutAct_9fa48("9820") ? true : (stryCov_9fa48("9820", "9821", "9822"), action.kind === (stryMutAct_9fa48("9823") ? "" : (stryCov_9fa48("9823"), "use-raw"))))));
  }
}

/** Extract encoded HDLC frame from step actions; null when no `use-raw`. */
export function encodeHdlcFrameRawFromActions(actions: ReadonlyArray<EncodeHdlcFrameAction>): Uint8Array | null {
  if (stryMutAct_9fa48("9824")) {
    {}
  } else {
    stryCov_9fa48("9824");
    const action = actions.find(stryMutAct_9fa48("9825") ? () => undefined : (stryCov_9fa48("9825"), entry => stryMutAct_9fa48("9828") ? entry.kind !== "use-raw" : stryMutAct_9fa48("9827") ? false : stryMutAct_9fa48("9826") ? true : (stryCov_9fa48("9826", "9827", "9828"), entry.kind === (stryMutAct_9fa48("9829") ? "" : (stryCov_9fa48("9829"), "use-raw")))));
    return (stryMutAct_9fa48("9832") ? action?.kind !== "use-raw" : stryMutAct_9fa48("9831") ? false : stryMutAct_9fa48("9830") ? true : (stryCov_9fa48("9830", "9831", "9832"), (stryMutAct_9fa48("9833") ? action.kind : (stryCov_9fa48("9833"), action?.kind)) === (stryMutAct_9fa48("9834") ? "" : (stryCov_9fa48("9834"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * HDLC decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeHdlcFrames`
 * reads beside the step). Streaming always yields `use-fields` (partial
 * buffers are carry state, not rejects).
 */
export type DecodeHdlcFramesState = Record<string, never>;
export type DecodeHdlcFramesEvent = Event | {
  readonly kind: "hdlc/decode-gate";
  readonly input: Uint8Array;
  readonly decodeState?: HdlcDecodeState;
};
export type DecodeHdlcFramesAction = {
  readonly kind: "use-fields";
  readonly fields: HdlcDecodeResult;
};
export interface DecodeHdlcFramesStepResult {
  readonly state: DecodeHdlcFramesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeHdlcFramesAction[];
}
export function initialDecodeHdlcFramesState(): DecodeHdlcFramesState {
  if (stryMutAct_9fa48("9835")) {
    {}
  } else {
    stryCov_9fa48("9835");
    return {};
  }
}
export function stepDecodeHdlcFramesWithActions(state: DecodeHdlcFramesState, event: DecodeHdlcFramesEvent): DecodeHdlcFramesStepResult {
  if (stryMutAct_9fa48("9836")) {
    {}
  } else {
    stryCov_9fa48("9836");
    if (stryMutAct_9fa48("9839") ? event.kind !== "hdlc/decode-gate" : stryMutAct_9fa48("9838") ? false : stryMutAct_9fa48("9837") ? true : (stryCov_9fa48("9837", "9838", "9839"), event.kind === (stryMutAct_9fa48("9840") ? "" : (stryCov_9fa48("9840"), "hdlc/decode-gate")))) {
      if (stryMutAct_9fa48("9841")) {
        {}
      } else {
        stryCov_9fa48("9841");
        return stryMutAct_9fa48("9842") ? {} : (stryCov_9fa48("9842"), {
          state,
          intents: stryMutAct_9fa48("9843") ? ["Stryker was here"] : (stryCov_9fa48("9843"), []),
          actions: stryMutAct_9fa48("9844") ? [] : (stryCov_9fa48("9844"), [stryMutAct_9fa48("9845") ? {} : (stryCov_9fa48("9845"), {
            kind: stryMutAct_9fa48("9846") ? "" : (stryCov_9fa48("9846"), "use-fields"),
            fields: decodeHdlcFrames(event.input, stryMutAct_9fa48("9847") ? event.decodeState && {} : (stryCov_9fa48("9847"), event.decodeState ?? {}))
          })])
        });
      }
    }
    return stryMutAct_9fa48("9848") ? {} : (stryCov_9fa48("9848"), {
      state,
      intents: stryMutAct_9fa48("9849") ? ["Stryker was here"] : (stryCov_9fa48("9849"), []),
      actions: stryMutAct_9fa48("9850") ? ["Stryker was here"] : (stryCov_9fa48("9850"), [])
    });
  }
}
export function shouldUseDecodeHdlcFrames(actions: ReadonlyArray<DecodeHdlcFramesAction>): boolean {
  if (stryMutAct_9fa48("9851")) {
    {}
  } else {
    stryCov_9fa48("9851");
    return stryMutAct_9fa48("9852") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("9852"), actions.some(stryMutAct_9fa48("9853") ? () => undefined : (stryCov_9fa48("9853"), action => stryMutAct_9fa48("9856") ? action.kind !== "use-fields" : stryMutAct_9fa48("9855") ? false : stryMutAct_9fa48("9854") ? true : (stryCov_9fa48("9854", "9855", "9856"), action.kind === (stryMutAct_9fa48("9857") ? "" : (stryCov_9fa48("9857"), "use-fields"))))));
  }
}

/** Extract decoded HDLC result from step actions; null when no `use-fields`. */
export function hdlcDecodeResultFromActions(actions: ReadonlyArray<DecodeHdlcFramesAction>): HdlcDecodeResult | null {
  if (stryMutAct_9fa48("9858")) {
    {}
  } else {
    stryCov_9fa48("9858");
    const action = actions.find(stryMutAct_9fa48("9859") ? () => undefined : (stryCov_9fa48("9859"), entry => stryMutAct_9fa48("9862") ? entry.kind !== "use-fields" : stryMutAct_9fa48("9861") ? false : stryMutAct_9fa48("9860") ? true : (stryCov_9fa48("9860", "9861", "9862"), entry.kind === (stryMutAct_9fa48("9863") ? "" : (stryCov_9fa48("9863"), "use-fields")))));
    return (stryMutAct_9fa48("9866") ? action?.kind !== "use-fields" : stryMutAct_9fa48("9865") ? false : stryMutAct_9fa48("9864") ? true : (stryCov_9fa48("9864", "9865", "9866"), (stryMutAct_9fa48("9867") ? action.kind : (stryCov_9fa48("9867"), action?.kind)) === (stryMutAct_9fa48("9868") ? "" : (stryCov_9fa48("9868"), "use-fields")))) ? action.fields : null;
  }
}