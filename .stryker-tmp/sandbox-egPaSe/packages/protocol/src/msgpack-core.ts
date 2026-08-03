/**
 * Shared pure msgpack primitives (no TextEncoder / DOM).
 * Higher-level RNS/LXMF codecs build on these in their packages.
 * Float64 pack / float unpack (link RTT) conclusions leave via machine
 * actions (no ad-hoc `msgpackPackFloat64` / `msgpackUnpackFloat` reads
 * beside the step).
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
import { utf8Decode, utf8Encode } from "./utf8.js";
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("22309")) {
    {}
  } else {
    stryCov_9fa48("22309");
    const length = parts.reduce(stryMutAct_9fa48("22310") ? () => undefined : (stryCov_9fa48("22310"), (total, part) => stryMutAct_9fa48("22311") ? total - part.length : (stryCov_9fa48("22311"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("22312")) {
        {}
      } else {
        stryCov_9fa48("22312");
        output.set(part, offset);
        stryMutAct_9fa48("22313") ? offset -= part.length : (stryCov_9fa48("22313"), offset += part.length);
      }
    }
    return output;
  }
}
export function msgpackPackNil(): Uint8Array {
  if (stryMutAct_9fa48("22314")) {
    {}
  } else {
    stryCov_9fa48("22314");
    return new Uint8Array(stryMutAct_9fa48("22315") ? [] : (stryCov_9fa48("22315"), [0xc0]));
  }
}
export function msgpackPackUInt(value: number): Uint8Array {
  if (stryMutAct_9fa48("22316")) {
    {}
  } else {
    stryCov_9fa48("22316");
    if (stryMutAct_9fa48("22319") ? value >= 0 || value <= 0x7f : stryMutAct_9fa48("22318") ? false : stryMutAct_9fa48("22317") ? true : (stryCov_9fa48("22317", "22318", "22319"), (stryMutAct_9fa48("22322") ? value < 0 : stryMutAct_9fa48("22321") ? value > 0 : stryMutAct_9fa48("22320") ? true : (stryCov_9fa48("22320", "22321", "22322"), value >= 0)) && (stryMutAct_9fa48("22325") ? value > 0x7f : stryMutAct_9fa48("22324") ? value < 0x7f : stryMutAct_9fa48("22323") ? true : (stryCov_9fa48("22323", "22324", "22325"), value <= 0x7f)))) {
      if (stryMutAct_9fa48("22326")) {
        {}
      } else {
        stryCov_9fa48("22326");
        return new Uint8Array(stryMutAct_9fa48("22327") ? [] : (stryCov_9fa48("22327"), [value]));
      }
    }
    if (stryMutAct_9fa48("22331") ? value > 0xff : stryMutAct_9fa48("22330") ? value < 0xff : stryMutAct_9fa48("22329") ? false : stryMutAct_9fa48("22328") ? true : (stryCov_9fa48("22328", "22329", "22330", "22331"), value <= 0xff)) {
      if (stryMutAct_9fa48("22332")) {
        {}
      } else {
        stryCov_9fa48("22332");
        return new Uint8Array(stryMutAct_9fa48("22333") ? [] : (stryCov_9fa48("22333"), [0xcc, value]));
      }
    }
    if (stryMutAct_9fa48("22337") ? value > 0xffff : stryMutAct_9fa48("22336") ? value < 0xffff : stryMutAct_9fa48("22335") ? false : stryMutAct_9fa48("22334") ? true : (stryCov_9fa48("22334", "22335", "22336", "22337"), value <= 0xffff)) {
      if (stryMutAct_9fa48("22338")) {
        {}
      } else {
        stryCov_9fa48("22338");
        const output = new Uint8Array(3);
        output[0] = 0xcd;
        output[1] = value >> 8 & 0xff;
        output[2] = value & 0xff;
        return output;
      }
    }
    const output = new Uint8Array(5);
    output[0] = 0xce;
    output[1] = value >>> 24 & 0xff;
    output[2] = value >>> 16 & 0xff;
    output[3] = value >>> 8 & 0xff;
    output[4] = value & 0xff;
    return output;
  }
}
export function msgpackPackBin(bytes: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("22339")) {
    {}
  } else {
    stryCov_9fa48("22339");
    const length = bytes.length;
    if (stryMutAct_9fa48("22343") ? length > 0xff : stryMutAct_9fa48("22342") ? length < 0xff : stryMutAct_9fa48("22341") ? false : stryMutAct_9fa48("22340") ? true : (stryCov_9fa48("22340", "22341", "22342", "22343"), length <= 0xff)) {
      if (stryMutAct_9fa48("22344")) {
        {}
      } else {
        stryCov_9fa48("22344");
        const output = new Uint8Array(stryMutAct_9fa48("22345") ? 2 - length : (stryCov_9fa48("22345"), 2 + length));
        output[0] = 0xc4;
        output[1] = length;
        output.set(bytes, 2);
        return output;
      }
    }
    const output = new Uint8Array(stryMutAct_9fa48("22346") ? 3 - length : (stryCov_9fa48("22346"), 3 + length));
    output[0] = 0xc5;
    output[1] = length >> 8 & 0xff;
    output[2] = length & 0xff;
    output.set(bytes, 3);
    return output;
  }
}
export function msgpackPackFloat64(value: number): Uint8Array {
  if (stryMutAct_9fa48("22347")) {
    {}
  } else {
    stryCov_9fa48("22347");
    const buffer = new ArrayBuffer(9);
    const view = new DataView(buffer);
    view.setUint8(0, 0xcb);
    view.setFloat64(1, value, stryMutAct_9fa48("22348") ? true : (stryCov_9fa48("22348"), false));
    return new Uint8Array(buffer);
  }
}

/** Decode msgpack float32 or float64 (RNS link RTT payloads). */
export function msgpackUnpackFloat(bytes: Uint8Array): number {
  if (stryMutAct_9fa48("22349")) {
    {}
  } else {
    stryCov_9fa48("22349");
    if (stryMutAct_9fa48("22352") ? bytes.length >= 9 || bytes[0] === 0xcb : stryMutAct_9fa48("22351") ? false : stryMutAct_9fa48("22350") ? true : (stryCov_9fa48("22350", "22351", "22352"), (stryMutAct_9fa48("22355") ? bytes.length < 9 : stryMutAct_9fa48("22354") ? bytes.length > 9 : stryMutAct_9fa48("22353") ? true : (stryCov_9fa48("22353", "22354", "22355"), bytes.length >= 9)) && (stryMutAct_9fa48("22357") ? bytes[0] !== 0xcb : stryMutAct_9fa48("22356") ? true : (stryCov_9fa48("22356", "22357"), bytes[0] === 0xcb)))) {
      if (stryMutAct_9fa48("22358")) {
        {}
      } else {
        stryCov_9fa48("22358");
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return view.getFloat64(1, stryMutAct_9fa48("22359") ? true : (stryCov_9fa48("22359"), false));
      }
    }
    if (stryMutAct_9fa48("22362") ? bytes.length >= 5 || bytes[0] === 0xca : stryMutAct_9fa48("22361") ? false : stryMutAct_9fa48("22360") ? true : (stryCov_9fa48("22360", "22361", "22362"), (stryMutAct_9fa48("22365") ? bytes.length < 5 : stryMutAct_9fa48("22364") ? bytes.length > 5 : stryMutAct_9fa48("22363") ? true : (stryCov_9fa48("22363", "22364", "22365"), bytes.length >= 5)) && (stryMutAct_9fa48("22367") ? bytes[0] !== 0xca : stryMutAct_9fa48("22366") ? true : (stryCov_9fa48("22366", "22367"), bytes[0] === 0xca)))) {
      if (stryMutAct_9fa48("22368")) {
        {}
      } else {
        stryCov_9fa48("22368");
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return view.getFloat32(1, stryMutAct_9fa48("22369") ? true : (stryCov_9fa48("22369"), false));
      }
    }
    throw new Error(stryMutAct_9fa48("22370") ? "" : (stryCov_9fa48("22370"), "Expected msgpack float"));
  }
}

/**
 * Msgpack float64 pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackPackFloat64`
 * reads beside the step).
 */
export type PackMsgpackFloat64State = Record<string, never>;
export type PackMsgpackFloat64Event = Event | {
  readonly kind: "msgpack-float/pack-gate";
  readonly value: number;
};
export type PackMsgpackFloat64Action = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackMsgpackFloat64StepResult {
  readonly state: PackMsgpackFloat64State;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackMsgpackFloat64Action[];
}
export function initialPackMsgpackFloat64State(): PackMsgpackFloat64State {
  if (stryMutAct_9fa48("22371")) {
    {}
  } else {
    stryCov_9fa48("22371");
    return {};
  }
}
export function stepPackMsgpackFloat64WithActions(state: PackMsgpackFloat64State, event: PackMsgpackFloat64Event): PackMsgpackFloat64StepResult {
  if (stryMutAct_9fa48("22372")) {
    {}
  } else {
    stryCov_9fa48("22372");
    if (stryMutAct_9fa48("22375") ? event.kind !== "msgpack-float/pack-gate" : stryMutAct_9fa48("22374") ? false : stryMutAct_9fa48("22373") ? true : (stryCov_9fa48("22373", "22374", "22375"), event.kind === (stryMutAct_9fa48("22376") ? "" : (stryCov_9fa48("22376"), "msgpack-float/pack-gate")))) {
      if (stryMutAct_9fa48("22377")) {
        {}
      } else {
        stryCov_9fa48("22377");
        return stryMutAct_9fa48("22378") ? {} : (stryCov_9fa48("22378"), {
          state,
          intents: stryMutAct_9fa48("22379") ? ["Stryker was here"] : (stryCov_9fa48("22379"), []),
          actions: stryMutAct_9fa48("22380") ? [] : (stryCov_9fa48("22380"), [stryMutAct_9fa48("22381") ? {} : (stryCov_9fa48("22381"), {
            kind: stryMutAct_9fa48("22382") ? "" : (stryCov_9fa48("22382"), "use-raw"),
            raw: msgpackPackFloat64(event.value)
          })])
        });
      }
    }
    return stryMutAct_9fa48("22383") ? {} : (stryCov_9fa48("22383"), {
      state,
      intents: stryMutAct_9fa48("22384") ? ["Stryker was here"] : (stryCov_9fa48("22384"), []),
      actions: stryMutAct_9fa48("22385") ? ["Stryker was here"] : (stryCov_9fa48("22385"), [])
    });
  }
}
export function shouldUsePackMsgpackFloat64(actions: ReadonlyArray<PackMsgpackFloat64Action>): boolean {
  if (stryMutAct_9fa48("22386")) {
    {}
  } else {
    stryCov_9fa48("22386");
    return stryMutAct_9fa48("22387") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("22387"), actions.some(stryMutAct_9fa48("22388") ? () => undefined : (stryCov_9fa48("22388"), action => stryMutAct_9fa48("22391") ? action.kind !== "use-raw" : stryMutAct_9fa48("22390") ? false : stryMutAct_9fa48("22389") ? true : (stryCov_9fa48("22389", "22390", "22391"), action.kind === (stryMutAct_9fa48("22392") ? "" : (stryCov_9fa48("22392"), "use-raw"))))));
  }
}

/** Extract packed msgpack float64 from step actions; null when no `use-raw`. */
export function packMsgpackFloat64RawFromActions(actions: ReadonlyArray<PackMsgpackFloat64Action>): Uint8Array | null {
  if (stryMutAct_9fa48("22393")) {
    {}
  } else {
    stryCov_9fa48("22393");
    const action = actions.find(stryMutAct_9fa48("22394") ? () => undefined : (stryCov_9fa48("22394"), entry => stryMutAct_9fa48("22397") ? entry.kind !== "use-raw" : stryMutAct_9fa48("22396") ? false : stryMutAct_9fa48("22395") ? true : (stryCov_9fa48("22395", "22396", "22397"), entry.kind === (stryMutAct_9fa48("22398") ? "" : (stryCov_9fa48("22398"), "use-raw")))));
    return (stryMutAct_9fa48("22401") ? action?.kind !== "use-raw" : stryMutAct_9fa48("22400") ? false : stryMutAct_9fa48("22399") ? true : (stryCov_9fa48("22399", "22400", "22401"), (stryMutAct_9fa48("22402") ? action.kind : (stryCov_9fa48("22402"), action?.kind)) === (stryMutAct_9fa48("22403") ? "" : (stryCov_9fa48("22403"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Msgpack float unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackUnpackFloat`
 * reads beside the step). Non-float payloads become `reject`.
 */
export type UnpackMsgpackFloatState = Record<string, never>;
export type UnpackMsgpackFloatEvent = Event | {
  readonly kind: "msgpack-float/unpack-gate";
  readonly bytes: Uint8Array;
};
export type UnpackMsgpackFloatAction = {
  readonly kind: "use-fields";
  readonly value: number;
} | {
  readonly kind: "reject";
};
export interface UnpackMsgpackFloatStepResult {
  readonly state: UnpackMsgpackFloatState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackMsgpackFloatAction[];
}
export function initialUnpackMsgpackFloatState(): UnpackMsgpackFloatState {
  if (stryMutAct_9fa48("22404")) {
    {}
  } else {
    stryCov_9fa48("22404");
    return {};
  }
}
export function stepUnpackMsgpackFloatWithActions(state: UnpackMsgpackFloatState, event: UnpackMsgpackFloatEvent): UnpackMsgpackFloatStepResult {
  if (stryMutAct_9fa48("22405")) {
    {}
  } else {
    stryCov_9fa48("22405");
    if (stryMutAct_9fa48("22408") ? event.kind !== "msgpack-float/unpack-gate" : stryMutAct_9fa48("22407") ? false : stryMutAct_9fa48("22406") ? true : (stryCov_9fa48("22406", "22407", "22408"), event.kind === (stryMutAct_9fa48("22409") ? "" : (stryCov_9fa48("22409"), "msgpack-float/unpack-gate")))) {
      if (stryMutAct_9fa48("22410")) {
        {}
      } else {
        stryCov_9fa48("22410");
        try {
          if (stryMutAct_9fa48("22411")) {
            {}
          } else {
            stryCov_9fa48("22411");
            return stryMutAct_9fa48("22412") ? {} : (stryCov_9fa48("22412"), {
              state,
              intents: stryMutAct_9fa48("22413") ? ["Stryker was here"] : (stryCov_9fa48("22413"), []),
              actions: stryMutAct_9fa48("22414") ? [] : (stryCov_9fa48("22414"), [stryMutAct_9fa48("22415") ? {} : (stryCov_9fa48("22415"), {
                kind: stryMutAct_9fa48("22416") ? "" : (stryCov_9fa48("22416"), "use-fields"),
                value: msgpackUnpackFloat(event.bytes)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("22417")) {
            {}
          } else {
            stryCov_9fa48("22417");
            return stryMutAct_9fa48("22418") ? {} : (stryCov_9fa48("22418"), {
              state,
              intents: stryMutAct_9fa48("22419") ? ["Stryker was here"] : (stryCov_9fa48("22419"), []),
              actions: stryMutAct_9fa48("22420") ? [] : (stryCov_9fa48("22420"), [stryMutAct_9fa48("22421") ? {} : (stryCov_9fa48("22421"), {
                kind: stryMutAct_9fa48("22422") ? "" : (stryCov_9fa48("22422"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("22423") ? {} : (stryCov_9fa48("22423"), {
      state,
      intents: stryMutAct_9fa48("22424") ? ["Stryker was here"] : (stryCov_9fa48("22424"), []),
      actions: stryMutAct_9fa48("22425") ? ["Stryker was here"] : (stryCov_9fa48("22425"), [])
    });
  }
}
export function shouldUseUnpackMsgpackFloat(actions: ReadonlyArray<UnpackMsgpackFloatAction>): boolean {
  if (stryMutAct_9fa48("22426")) {
    {}
  } else {
    stryCov_9fa48("22426");
    return stryMutAct_9fa48("22427") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("22427"), actions.some(stryMutAct_9fa48("22428") ? () => undefined : (stryCov_9fa48("22428"), action => stryMutAct_9fa48("22431") ? action.kind !== "use-fields" : stryMutAct_9fa48("22430") ? false : stryMutAct_9fa48("22429") ? true : (stryCov_9fa48("22429", "22430", "22431"), action.kind === (stryMutAct_9fa48("22432") ? "" : (stryCov_9fa48("22432"), "use-fields"))))));
  }
}
export function shouldRejectUnpackMsgpackFloat(actions: ReadonlyArray<UnpackMsgpackFloatAction>): boolean {
  if (stryMutAct_9fa48("22433")) {
    {}
  } else {
    stryCov_9fa48("22433");
    return stryMutAct_9fa48("22434") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("22434"), actions.some(stryMutAct_9fa48("22435") ? () => undefined : (stryCov_9fa48("22435"), action => stryMutAct_9fa48("22438") ? action.kind !== "reject" : stryMutAct_9fa48("22437") ? false : stryMutAct_9fa48("22436") ? true : (stryCov_9fa48("22436", "22437", "22438"), action.kind === (stryMutAct_9fa48("22439") ? "" : (stryCov_9fa48("22439"), "reject"))))));
  }
}

/** Extract unpacked msgpack float from step actions; null when no `use-fields`. */
export function msgpackFloatFromActions(actions: ReadonlyArray<UnpackMsgpackFloatAction>): number | null {
  if (stryMutAct_9fa48("22440")) {
    {}
  } else {
    stryCov_9fa48("22440");
    const action = actions.find(stryMutAct_9fa48("22441") ? () => undefined : (stryCov_9fa48("22441"), entry => stryMutAct_9fa48("22444") ? entry.kind !== "use-fields" : stryMutAct_9fa48("22443") ? false : stryMutAct_9fa48("22442") ? true : (stryCov_9fa48("22442", "22443", "22444"), entry.kind === (stryMutAct_9fa48("22445") ? "" : (stryCov_9fa48("22445"), "use-fields")))));
    return (stryMutAct_9fa48("22448") ? action?.kind !== "use-fields" : stryMutAct_9fa48("22447") ? false : stryMutAct_9fa48("22446") ? true : (stryCov_9fa48("22446", "22447", "22448"), (stryMutAct_9fa48("22449") ? action.kind : (stryCov_9fa48("22449"), action?.kind)) === (stryMutAct_9fa48("22450") ? "" : (stryCov_9fa48("22450"), "use-fields")))) ? action.value : null;
  }
}
export function msgpackPackArray(items: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("22451")) {
    {}
  } else {
    stryCov_9fa48("22451");
    if (stryMutAct_9fa48("22455") ? items.length <= 15 : stryMutAct_9fa48("22454") ? items.length >= 15 : stryMutAct_9fa48("22453") ? false : stryMutAct_9fa48("22452") ? true : (stryCov_9fa48("22452", "22453", "22454", "22455"), items.length > 15)) {
      if (stryMutAct_9fa48("22456")) {
        {}
      } else {
        stryCov_9fa48("22456");
        throw new Error(stryMutAct_9fa48("22457") ? "" : (stryCov_9fa48("22457"), "msgpackPackArray supports at most 15 items"));
      }
    }
    const body = concatBytes(...items);
    const output = new Uint8Array(stryMutAct_9fa48("22458") ? 1 - body.length : (stryCov_9fa48("22458"), 1 + body.length));
    output[0] = 0x90 | items.length;
    output.set(body, 1);
    return output;
  }
}

/** Pack a small map with integer keys (LXMF fields). */
export function msgpackPackIntMap(entries: ReadonlyArray<[number, Uint8Array]>): Uint8Array {
  if (stryMutAct_9fa48("22459")) {
    {}
  } else {
    stryCov_9fa48("22459");
    if (stryMutAct_9fa48("22463") ? entries.length <= 15 : stryMutAct_9fa48("22462") ? entries.length >= 15 : stryMutAct_9fa48("22461") ? false : stryMutAct_9fa48("22460") ? true : (stryCov_9fa48("22460", "22461", "22462", "22463"), entries.length > 15)) {
      if (stryMutAct_9fa48("22464")) {
        {}
      } else {
        stryCov_9fa48("22464");
        throw new Error(stryMutAct_9fa48("22465") ? "" : (stryCov_9fa48("22465"), "msgpackPackIntMap supports at most 15 entries"));
      }
    }
    const parts = entries.flatMap(stryMutAct_9fa48("22466") ? () => undefined : (stryCov_9fa48("22466"), ([key, value]) => stryMutAct_9fa48("22467") ? [] : (stryCov_9fa48("22467"), [msgpackPackUInt(key), msgpackPackBin(value)])));
    const body = concatBytes(...parts);
    const output = new Uint8Array(stryMutAct_9fa48("22468") ? 1 - body.length : (stryCov_9fa48("22468"), 1 + body.length));
    output[0] = 0x80 | entries.length;
    output.set(body, 1);
    return output;
  }
}
export function msgpackPackString(value: string): Uint8Array {
  if (stryMutAct_9fa48("22469")) {
    {}
  } else {
    stryCov_9fa48("22469");
    const bytes = utf8Encode(value);
    if (stryMutAct_9fa48("22473") ? bytes.length > 31 : stryMutAct_9fa48("22472") ? bytes.length < 31 : stryMutAct_9fa48("22471") ? false : stryMutAct_9fa48("22470") ? true : (stryCov_9fa48("22470", "22471", "22472", "22473"), bytes.length <= 31)) {
      if (stryMutAct_9fa48("22474")) {
        {}
      } else {
        stryCov_9fa48("22474");
        const output = new Uint8Array(stryMutAct_9fa48("22475") ? 1 - bytes.length : (stryCov_9fa48("22475"), 1 + bytes.length));
        output[0] = 0xa0 | bytes.length;
        output.set(bytes, 1);
        return output;
      }
    }
    if (stryMutAct_9fa48("22479") ? bytes.length <= 0xff : stryMutAct_9fa48("22478") ? bytes.length >= 0xff : stryMutAct_9fa48("22477") ? false : stryMutAct_9fa48("22476") ? true : (stryCov_9fa48("22476", "22477", "22478", "22479"), bytes.length > 0xff)) {
      if (stryMutAct_9fa48("22480")) {
        {}
      } else {
        stryCov_9fa48("22480");
        throw new Error(stryMutAct_9fa48("22481") ? "" : (stryCov_9fa48("22481"), "msgpackPackString supports at most 255 UTF-8 bytes"));
      }
    }
    const output = new Uint8Array(stryMutAct_9fa48("22482") ? 2 - bytes.length : (stryCov_9fa48("22482"), 2 + bytes.length));
    output[0] = 0xd9;
    output[1] = bytes.length;
    output.set(bytes, 2);
    return output;
  }
}

/** Pack a small map with string keys (RNS resource advertisements). */
export function msgpackPackStringMap(entries: ReadonlyArray<[string, Uint8Array]>): Uint8Array {
  if (stryMutAct_9fa48("22483")) {
    {}
  } else {
    stryCov_9fa48("22483");
    if (stryMutAct_9fa48("22487") ? entries.length <= 15 : stryMutAct_9fa48("22486") ? entries.length >= 15 : stryMutAct_9fa48("22485") ? false : stryMutAct_9fa48("22484") ? true : (stryCov_9fa48("22484", "22485", "22486", "22487"), entries.length > 15)) {
      if (stryMutAct_9fa48("22488")) {
        {}
      } else {
        stryCov_9fa48("22488");
        throw new Error(stryMutAct_9fa48("22489") ? "" : (stryCov_9fa48("22489"), "msgpackPackStringMap supports at most 15 entries"));
      }
    }
    const parts = entries.flatMap(stryMutAct_9fa48("22490") ? () => undefined : (stryCov_9fa48("22490"), ([key, value]) => stryMutAct_9fa48("22491") ? [] : (stryCov_9fa48("22491"), [msgpackPackString(key), value])));
    const body = concatBytes(...parts);
    const output = new Uint8Array(stryMutAct_9fa48("22492") ? 1 - body.length : (stryCov_9fa48("22492"), 1 + body.length));
    output[0] = 0x80 | entries.length;
    output.set(body, 1);
    return output;
  }
}
export type MsgpackValue = {
  readonly type: "nil";
} | {
  readonly type: "int";
  readonly int: number;
} | {
  readonly type: "bin";
  readonly bin: Uint8Array;
} | {
  readonly type: "float";
  readonly float: number;
} | {
  readonly type: "array";
  readonly array: ReadonlyArray<MsgpackValue>;
} | {
  readonly type: "map";
  readonly map: ReadonlyMap<number, MsgpackValue>;
};
export type MsgpackScalar = {
  readonly type: "nil";
} | {
  readonly type: "int";
  readonly int: number;
} | {
  readonly type: "bin";
  readonly bin: Uint8Array;
} | {
  readonly type: "float";
  readonly float: number;
};
export function msgpackUnpack(bytes: Uint8Array): MsgpackValue {
  if (stryMutAct_9fa48("22493")) {
    {}
  } else {
    stryCov_9fa48("22493");
    const [value] = msgpackUnpackAt(bytes, 0);
    return value;
  }
}
export function msgpackUnpackScalar(bytes: Uint8Array): MsgpackScalar {
  if (stryMutAct_9fa48("22494")) {
    {}
  } else {
    stryCov_9fa48("22494");
    const value = msgpackUnpack(bytes);
    if (stryMutAct_9fa48("22497") ? value.type === "array" && value.type === "map" : stryMutAct_9fa48("22496") ? false : stryMutAct_9fa48("22495") ? true : (stryCov_9fa48("22495", "22496", "22497"), (stryMutAct_9fa48("22499") ? value.type !== "array" : stryMutAct_9fa48("22498") ? false : (stryCov_9fa48("22498", "22499"), value.type === (stryMutAct_9fa48("22500") ? "" : (stryCov_9fa48("22500"), "array")))) || (stryMutAct_9fa48("22502") ? value.type !== "map" : stryMutAct_9fa48("22501") ? false : (stryCov_9fa48("22501", "22502"), value.type === (stryMutAct_9fa48("22503") ? "" : (stryCov_9fa48("22503"), "map")))))) {
      if (stryMutAct_9fa48("22504")) {
        {}
      } else {
        stryCov_9fa48("22504");
        throw new Error(stryMutAct_9fa48("22505") ? "" : (stryCov_9fa48("22505"), "expected msgpack scalar"));
      }
    }
    return value;
  }
}
function unpackStringAt(bytes: Uint8Array, offset: number): [string, number] {
  if (stryMutAct_9fa48("22506")) {
    {}
  } else {
    stryCov_9fa48("22506");
    const tag = bytes[offset];
    if (stryMutAct_9fa48("22509") ? tag !== undefined : stryMutAct_9fa48("22508") ? false : stryMutAct_9fa48("22507") ? true : (stryCov_9fa48("22507", "22508", "22509"), tag === undefined)) {
      if (stryMutAct_9fa48("22510")) {
        {}
      } else {
        stryCov_9fa48("22510");
        throw new Error(stryMutAct_9fa48("22511") ? "" : (stryCov_9fa48("22511"), "Unexpected end of msgpack input"));
      }
    }
    if (stryMutAct_9fa48("22514") ? (tag & 0xe0) !== 0xa0 : stryMutAct_9fa48("22513") ? false : stryMutAct_9fa48("22512") ? true : (stryCov_9fa48("22512", "22513", "22514"), (tag & 0xe0) === 0xa0)) {
      if (stryMutAct_9fa48("22515")) {
        {}
      } else {
        stryCov_9fa48("22515");
        const length = tag & 0x1f;
        const stringBytes = bytes.subarray(stryMutAct_9fa48("22516") ? offset - 1 : (stryCov_9fa48("22516"), offset + 1), stryMutAct_9fa48("22517") ? offset + 1 - length : (stryCov_9fa48("22517"), (stryMutAct_9fa48("22518") ? offset - 1 : (stryCov_9fa48("22518"), offset + 1)) + length));
        return stryMutAct_9fa48("22519") ? [] : (stryCov_9fa48("22519"), [utf8Decode(stringBytes), stryMutAct_9fa48("22520") ? offset + 1 - length : (stryCov_9fa48("22520"), (stryMutAct_9fa48("22521") ? offset - 1 : (stryCov_9fa48("22521"), offset + 1)) + length)]);
      }
    }
    if (stryMutAct_9fa48("22524") ? tag !== 0xd9 : stryMutAct_9fa48("22523") ? false : stryMutAct_9fa48("22522") ? true : (stryCov_9fa48("22522", "22523", "22524"), tag === 0xd9)) {
      if (stryMutAct_9fa48("22525")) {
        {}
      } else {
        stryCov_9fa48("22525");
        const length = bytes[stryMutAct_9fa48("22526") ? offset - 1 : (stryCov_9fa48("22526"), offset + 1)]!;
        const stringBytes = bytes.subarray(stryMutAct_9fa48("22527") ? offset - 2 : (stryCov_9fa48("22527"), offset + 2), stryMutAct_9fa48("22528") ? offset + 2 - length : (stryCov_9fa48("22528"), (stryMutAct_9fa48("22529") ? offset - 2 : (stryCov_9fa48("22529"), offset + 2)) + length));
        return stryMutAct_9fa48("22530") ? [] : (stryCov_9fa48("22530"), [utf8Decode(stringBytes), stryMutAct_9fa48("22531") ? offset + 2 - length : (stryCov_9fa48("22531"), (stryMutAct_9fa48("22532") ? offset - 2 : (stryCov_9fa48("22532"), offset + 2)) + length)]);
      }
    }
    throw new Error(stryMutAct_9fa48("22533") ? `` : (stryCov_9fa48("22533"), `Expected msgpack string tag, got 0x${tag.toString(16)}`));
  }
}
function unpackScalarAt(bytes: Uint8Array, offset: number): [MsgpackScalar, number] {
  if (stryMutAct_9fa48("22534")) {
    {}
  } else {
    stryCov_9fa48("22534");
    const [value, next] = msgpackUnpackAt(bytes, offset);
    if (stryMutAct_9fa48("22537") ? value.type === "array" && value.type === "map" : stryMutAct_9fa48("22536") ? false : stryMutAct_9fa48("22535") ? true : (stryCov_9fa48("22535", "22536", "22537"), (stryMutAct_9fa48("22539") ? value.type !== "array" : stryMutAct_9fa48("22538") ? false : (stryCov_9fa48("22538", "22539"), value.type === (stryMutAct_9fa48("22540") ? "" : (stryCov_9fa48("22540"), "array")))) || (stryMutAct_9fa48("22542") ? value.type !== "map" : stryMutAct_9fa48("22541") ? false : (stryCov_9fa48("22541", "22542"), value.type === (stryMutAct_9fa48("22543") ? "" : (stryCov_9fa48("22543"), "map")))))) {
      if (stryMutAct_9fa48("22544")) {
        {}
      } else {
        stryCov_9fa48("22544");
        throw new Error(stryMutAct_9fa48("22545") ? "" : (stryCov_9fa48("22545"), "expected msgpack scalar"));
      }
    }
    return stryMutAct_9fa48("22546") ? [] : (stryCov_9fa48("22546"), [value, next]);
  }
}

/** Unpack a fixmap with string keys and scalar values. */
export function msgpackUnpackStringKeyedMap(bytes: Uint8Array): ReadonlyMap<string, MsgpackScalar> {
  if (stryMutAct_9fa48("22547")) {
    {}
  } else {
    stryCov_9fa48("22547");
    const tag = bytes[0];
    if (stryMutAct_9fa48("22550") ? tag === undefined && (tag & 0xf0) !== 0x80 : stryMutAct_9fa48("22549") ? false : stryMutAct_9fa48("22548") ? true : (stryCov_9fa48("22548", "22549", "22550"), (stryMutAct_9fa48("22552") ? tag !== undefined : stryMutAct_9fa48("22551") ? false : (stryCov_9fa48("22551", "22552"), tag === undefined)) || (stryMutAct_9fa48("22554") ? (tag & 0xf0) === 0x80 : stryMutAct_9fa48("22553") ? false : (stryCov_9fa48("22553", "22554"), (tag & 0xf0) !== 0x80)))) {
      if (stryMutAct_9fa48("22555")) {
        {}
      } else {
        stryCov_9fa48("22555");
        throw new Error(stryMutAct_9fa48("22556") ? "" : (stryCov_9fa48("22556"), "Expected msgpack fixmap"));
      }
    }
    const count = tag & 0x0f;
    const map = new Map<string, MsgpackScalar>();
    let offset = 1;
    for (let index = 0; stryMutAct_9fa48("22559") ? index >= count : stryMutAct_9fa48("22558") ? index <= count : stryMutAct_9fa48("22557") ? false : (stryCov_9fa48("22557", "22558", "22559"), index < count); stryMutAct_9fa48("22560") ? index -= 1 : (stryCov_9fa48("22560"), index += 1)) {
      if (stryMutAct_9fa48("22561")) {
        {}
      } else {
        stryCov_9fa48("22561");
        const [key, keyOffset] = unpackStringAt(bytes, offset);
        const [value, valueOffset] = unpackScalarAt(bytes, keyOffset);
        map.set(key, value);
        offset = valueOffset;
      }
    }
    return map;
  }
}
export function msgpackUnpackAt(bytes: Uint8Array, offset: number): [MsgpackValue, number] {
  if (stryMutAct_9fa48("22562")) {
    {}
  } else {
    stryCov_9fa48("22562");
    const tag = bytes[offset];
    if (stryMutAct_9fa48("22565") ? tag !== undefined : stryMutAct_9fa48("22564") ? false : stryMutAct_9fa48("22563") ? true : (stryCov_9fa48("22563", "22564", "22565"), tag === undefined)) {
      if (stryMutAct_9fa48("22566")) {
        {}
      } else {
        stryCov_9fa48("22566");
        throw new Error(stryMutAct_9fa48("22567") ? "" : (stryCov_9fa48("22567"), "Unexpected end of msgpack input"));
      }
    }
    if (stryMutAct_9fa48("22570") ? tag !== 0xc0 : stryMutAct_9fa48("22569") ? false : stryMutAct_9fa48("22568") ? true : (stryCov_9fa48("22568", "22569", "22570"), tag === 0xc0)) {
      if (stryMutAct_9fa48("22571")) {
        {}
      } else {
        stryCov_9fa48("22571");
        return stryMutAct_9fa48("22572") ? [] : (stryCov_9fa48("22572"), [stryMutAct_9fa48("22573") ? {} : (stryCov_9fa48("22573"), {
          type: stryMutAct_9fa48("22574") ? "" : (stryCov_9fa48("22574"), "nil")
        }), stryMutAct_9fa48("22575") ? offset - 1 : (stryCov_9fa48("22575"), offset + 1)]);
      }
    }
    if (stryMutAct_9fa48("22578") ? tag !== 0xcb : stryMutAct_9fa48("22577") ? false : stryMutAct_9fa48("22576") ? true : (stryCov_9fa48("22576", "22577", "22578"), tag === 0xcb)) {
      if (stryMutAct_9fa48("22579")) {
        {}
      } else {
        stryCov_9fa48("22579");
        const view = new DataView(bytes.buffer, stryMutAct_9fa48("22580") ? bytes.byteOffset - offset : (stryCov_9fa48("22580"), bytes.byteOffset + offset), stryMutAct_9fa48("22581") ? bytes.byteLength + offset : (stryCov_9fa48("22581"), bytes.byteLength - offset));
        return stryMutAct_9fa48("22582") ? [] : (stryCov_9fa48("22582"), [stryMutAct_9fa48("22583") ? {} : (stryCov_9fa48("22583"), {
          type: stryMutAct_9fa48("22584") ? "" : (stryCov_9fa48("22584"), "float"),
          float: view.getFloat64(1, stryMutAct_9fa48("22585") ? true : (stryCov_9fa48("22585"), false))
        }), stryMutAct_9fa48("22586") ? offset - 9 : (stryCov_9fa48("22586"), offset + 9)]);
      }
    }
    if (stryMutAct_9fa48("22589") ? tag !== 0xc4 : stryMutAct_9fa48("22588") ? false : stryMutAct_9fa48("22587") ? true : (stryCov_9fa48("22587", "22588", "22589"), tag === 0xc4)) {
      if (stryMutAct_9fa48("22590")) {
        {}
      } else {
        stryCov_9fa48("22590");
        const length = bytes[stryMutAct_9fa48("22591") ? offset - 1 : (stryCov_9fa48("22591"), offset + 1)]!;
        const bin = bytes.subarray(stryMutAct_9fa48("22592") ? offset - 2 : (stryCov_9fa48("22592"), offset + 2), stryMutAct_9fa48("22593") ? offset + 2 - length : (stryCov_9fa48("22593"), (stryMutAct_9fa48("22594") ? offset - 2 : (stryCov_9fa48("22594"), offset + 2)) + length));
        return stryMutAct_9fa48("22595") ? [] : (stryCov_9fa48("22595"), [stryMutAct_9fa48("22596") ? {} : (stryCov_9fa48("22596"), {
          type: stryMutAct_9fa48("22597") ? "" : (stryCov_9fa48("22597"), "bin"),
          bin: Uint8Array.from(bin)
        }), stryMutAct_9fa48("22598") ? offset + 2 - length : (stryCov_9fa48("22598"), (stryMutAct_9fa48("22599") ? offset - 2 : (stryCov_9fa48("22599"), offset + 2)) + length)]);
      }
    }
    if (stryMutAct_9fa48("22602") ? tag !== 0xc5 : stryMutAct_9fa48("22601") ? false : stryMutAct_9fa48("22600") ? true : (stryCov_9fa48("22600", "22601", "22602"), tag === 0xc5)) {
      if (stryMutAct_9fa48("22603")) {
        {}
      } else {
        stryCov_9fa48("22603");
        const length = bytes[stryMutAct_9fa48("22604") ? offset - 1 : (stryCov_9fa48("22604"), offset + 1)]! << 8 | bytes[stryMutAct_9fa48("22605") ? offset - 2 : (stryCov_9fa48("22605"), offset + 2)]!;
        const bin = bytes.subarray(stryMutAct_9fa48("22606") ? offset - 3 : (stryCov_9fa48("22606"), offset + 3), stryMutAct_9fa48("22607") ? offset + 3 - length : (stryCov_9fa48("22607"), (stryMutAct_9fa48("22608") ? offset - 3 : (stryCov_9fa48("22608"), offset + 3)) + length));
        return stryMutAct_9fa48("22609") ? [] : (stryCov_9fa48("22609"), [stryMutAct_9fa48("22610") ? {} : (stryCov_9fa48("22610"), {
          type: stryMutAct_9fa48("22611") ? "" : (stryCov_9fa48("22611"), "bin"),
          bin: Uint8Array.from(bin)
        }), stryMutAct_9fa48("22612") ? offset + 3 - length : (stryCov_9fa48("22612"), (stryMutAct_9fa48("22613") ? offset - 3 : (stryCov_9fa48("22613"), offset + 3)) + length)]);
      }
    }
    if (stryMutAct_9fa48("22616") ? (tag & 0xf0) !== 0x90 : stryMutAct_9fa48("22615") ? false : stryMutAct_9fa48("22614") ? true : (stryCov_9fa48("22614", "22615", "22616"), (tag & 0xf0) === 0x90)) {
      if (stryMutAct_9fa48("22617")) {
        {}
      } else {
        stryCov_9fa48("22617");
        const count = tag & 0x0f;
        const array: MsgpackValue[] = stryMutAct_9fa48("22618") ? ["Stryker was here"] : (stryCov_9fa48("22618"), []);
        let nextOffset = stryMutAct_9fa48("22619") ? offset - 1 : (stryCov_9fa48("22619"), offset + 1);
        for (let index = 0; stryMutAct_9fa48("22622") ? index >= count : stryMutAct_9fa48("22621") ? index <= count : stryMutAct_9fa48("22620") ? false : (stryCov_9fa48("22620", "22621", "22622"), index < count); stryMutAct_9fa48("22623") ? index -= 1 : (stryCov_9fa48("22623"), index += 1)) {
          if (stryMutAct_9fa48("22624")) {
            {}
          } else {
            stryCov_9fa48("22624");
            const [item, itemOffset] = msgpackUnpackAt(bytes, nextOffset);
            array.push(item);
            nextOffset = itemOffset;
          }
        }
        return stryMutAct_9fa48("22625") ? [] : (stryCov_9fa48("22625"), [stryMutAct_9fa48("22626") ? {} : (stryCov_9fa48("22626"), {
          type: stryMutAct_9fa48("22627") ? "" : (stryCov_9fa48("22627"), "array"),
          array
        }), nextOffset]);
      }
    }
    if (stryMutAct_9fa48("22630") ? (tag & 0xf0) !== 0x80 : stryMutAct_9fa48("22629") ? false : stryMutAct_9fa48("22628") ? true : (stryCov_9fa48("22628", "22629", "22630"), (tag & 0xf0) === 0x80)) {
      if (stryMutAct_9fa48("22631")) {
        {}
      } else {
        stryCov_9fa48("22631");
        const count = tag & 0x0f;
        const map = new Map<number, MsgpackValue>();
        let nextOffset = stryMutAct_9fa48("22632") ? offset - 1 : (stryCov_9fa48("22632"), offset + 1);
        for (let index = 0; stryMutAct_9fa48("22635") ? index >= count : stryMutAct_9fa48("22634") ? index <= count : stryMutAct_9fa48("22633") ? false : (stryCov_9fa48("22633", "22634", "22635"), index < count); stryMutAct_9fa48("22636") ? index -= 1 : (stryCov_9fa48("22636"), index += 1)) {
          if (stryMutAct_9fa48("22637")) {
            {}
          } else {
            stryCov_9fa48("22637");
            const [keyValue, keyOffset] = msgpackUnpackAt(bytes, nextOffset);
            const [entryValue, entryOffset] = msgpackUnpackAt(bytes, keyOffset);
            if (stryMutAct_9fa48("22640") ? keyValue.type !== "int" : stryMutAct_9fa48("22639") ? false : stryMutAct_9fa48("22638") ? true : (stryCov_9fa48("22638", "22639", "22640"), keyValue.type === (stryMutAct_9fa48("22641") ? "" : (stryCov_9fa48("22641"), "int")))) {
              if (stryMutAct_9fa48("22642")) {
                {}
              } else {
                stryCov_9fa48("22642");
                map.set(keyValue.int, entryValue);
              }
            }
            nextOffset = entryOffset;
          }
        }
        return stryMutAct_9fa48("22643") ? [] : (stryCov_9fa48("22643"), [stryMutAct_9fa48("22644") ? {} : (stryCov_9fa48("22644"), {
          type: stryMutAct_9fa48("22645") ? "" : (stryCov_9fa48("22645"), "map"),
          map
        }), nextOffset]);
      }
    }
    if (stryMutAct_9fa48("22648") ? tag !== 0xcc : stryMutAct_9fa48("22647") ? false : stryMutAct_9fa48("22646") ? true : (stryCov_9fa48("22646", "22647", "22648"), tag === 0xcc)) {
      if (stryMutAct_9fa48("22649")) {
        {}
      } else {
        stryCov_9fa48("22649");
        return stryMutAct_9fa48("22650") ? [] : (stryCov_9fa48("22650"), [stryMutAct_9fa48("22651") ? {} : (stryCov_9fa48("22651"), {
          type: stryMutAct_9fa48("22652") ? "" : (stryCov_9fa48("22652"), "int"),
          int: bytes[stryMutAct_9fa48("22653") ? offset - 1 : (stryCov_9fa48("22653"), offset + 1)]!
        }), stryMutAct_9fa48("22654") ? offset - 2 : (stryCov_9fa48("22654"), offset + 2)]);
      }
    }
    if (stryMutAct_9fa48("22657") ? tag !== 0xcd : stryMutAct_9fa48("22656") ? false : stryMutAct_9fa48("22655") ? true : (stryCov_9fa48("22655", "22656", "22657"), tag === 0xcd)) {
      if (stryMutAct_9fa48("22658")) {
        {}
      } else {
        stryCov_9fa48("22658");
        const value = bytes[stryMutAct_9fa48("22659") ? offset - 1 : (stryCov_9fa48("22659"), offset + 1)]! << 8 | bytes[stryMutAct_9fa48("22660") ? offset - 2 : (stryCov_9fa48("22660"), offset + 2)]!;
        return stryMutAct_9fa48("22661") ? [] : (stryCov_9fa48("22661"), [stryMutAct_9fa48("22662") ? {} : (stryCov_9fa48("22662"), {
          type: stryMutAct_9fa48("22663") ? "" : (stryCov_9fa48("22663"), "int"),
          int: value
        }), stryMutAct_9fa48("22664") ? offset - 3 : (stryCov_9fa48("22664"), offset + 3)]);
      }
    }
    if (stryMutAct_9fa48("22667") ? tag !== 0xce : stryMutAct_9fa48("22666") ? false : stryMutAct_9fa48("22665") ? true : (stryCov_9fa48("22665", "22666", "22667"), tag === 0xce)) {
      if (stryMutAct_9fa48("22668")) {
        {}
      } else {
        stryCov_9fa48("22668");
        const view = new DataView(bytes.buffer, stryMutAct_9fa48("22669") ? bytes.byteOffset - offset : (stryCov_9fa48("22669"), bytes.byteOffset + offset), stryMutAct_9fa48("22670") ? bytes.byteLength + offset : (stryCov_9fa48("22670"), bytes.byteLength - offset));
        return stryMutAct_9fa48("22671") ? [] : (stryCov_9fa48("22671"), [stryMutAct_9fa48("22672") ? {} : (stryCov_9fa48("22672"), {
          type: stryMutAct_9fa48("22673") ? "" : (stryCov_9fa48("22673"), "int"),
          int: view.getUint32(1, stryMutAct_9fa48("22674") ? true : (stryCov_9fa48("22674"), false))
        }), stryMutAct_9fa48("22675") ? offset - 5 : (stryCov_9fa48("22675"), offset + 5)]);
      }
    }
    if (stryMutAct_9fa48("22679") ? tag > 0x7f : stryMutAct_9fa48("22678") ? tag < 0x7f : stryMutAct_9fa48("22677") ? false : stryMutAct_9fa48("22676") ? true : (stryCov_9fa48("22676", "22677", "22678", "22679"), tag <= 0x7f)) {
      if (stryMutAct_9fa48("22680")) {
        {}
      } else {
        stryCov_9fa48("22680");
        return stryMutAct_9fa48("22681") ? [] : (stryCov_9fa48("22681"), [stryMutAct_9fa48("22682") ? {} : (stryCov_9fa48("22682"), {
          type: stryMutAct_9fa48("22683") ? "" : (stryCov_9fa48("22683"), "int"),
          int: tag
        }), stryMutAct_9fa48("22684") ? offset - 1 : (stryCov_9fa48("22684"), offset + 1)]);
      }
    }
    throw new Error(stryMutAct_9fa48("22685") ? `` : (stryCov_9fa48("22685"), `Unsupported msgpack tag 0x${tag.toString(16)}`));
  }
}