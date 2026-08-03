/**
 * Pure RNS link request/response msgpack payloads.
 * Pack / unpack conclusions leave via machine actions (no ad-hoc
 * `msgpackPackLinkRequest` / `msgpackPackLinkResponse` /
 * `msgpackUnpackLinkRequest` / `msgpackUnpackLinkResponse` reads beside the step).
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
import { msgpackPackArray, msgpackPackBin, msgpackPackFloat64, msgpackPackNil, msgpackPackUInt, msgpackUnpack, msgpackUnpackAt, type MsgpackValue } from "./msgpack-core.js";
export interface LinkRequestFields {
  readonly requestedAt: number;
  readonly pathHash: Uint8Array;
  readonly data: Uint8Array | null;
}
export interface LinkResponseFields {
  readonly requestId: Uint8Array;
  readonly response: Uint8Array | null;
}
export function msgpackPackLinkRequest(requestedAt: number, pathHash: Uint8Array, data: Uint8Array | null): Uint8Array {
  if (stryMutAct_9fa48("16713")) {
    {}
  } else {
    stryCov_9fa48("16713");
    // `data` is already a msgpack-encoded value (e.g. LXMF `[None, None]` or
    // `msgpackPackBin(raw)` for opaque payloads). Embed it directly so Python
    // umsgpack.unpackb yields a native object, not a bytes blob.
    return msgpackPackArray(stryMutAct_9fa48("16714") ? [] : (stryCov_9fa48("16714"), [msgpackPackFloat64(requestedAt), msgpackPackBin(pathHash), (stryMutAct_9fa48("16717") ? data !== null : stryMutAct_9fa48("16716") ? false : stryMutAct_9fa48("16715") ? true : (stryCov_9fa48("16715", "16716", "16717"), data === null)) ? msgpackPackNil() : data]));
  }
}
export function msgpackPackLinkResponse(requestId: Uint8Array, response: Uint8Array | null): Uint8Array {
  if (stryMutAct_9fa48("16718")) {
    {}
  } else {
    stryCov_9fa48("16718");
    // `response` is already a msgpack-encoded value (e.g. a packed ID list). Embed it
    // directly so Python umsgpack.unpackb yields a native object, not a bytes blob.
    return msgpackPackArray(stryMutAct_9fa48("16719") ? [] : (stryCov_9fa48("16719"), [msgpackPackBin(requestId), (stryMutAct_9fa48("16722") ? response !== null : stryMutAct_9fa48("16721") ? false : stryMutAct_9fa48("16720") ? true : (stryCov_9fa48("16720", "16721", "16722"), response === null)) ? msgpackPackNil() : response]));
  }
}
export function msgpackUnpackLinkRequest(bytes: Uint8Array): LinkRequestFields {
  if (stryMutAct_9fa48("16723")) {
    {}
  } else {
    stryCov_9fa48("16723");
    const [value, endOffset] = msgpackUnpackAt(bytes, 0);
    if (stryMutAct_9fa48("16726") ? (value.type !== "array" || value.array.length !== 3) && endOffset !== bytes.length : stryMutAct_9fa48("16725") ? false : stryMutAct_9fa48("16724") ? true : (stryCov_9fa48("16724", "16725", "16726"), (stryMutAct_9fa48("16728") ? value.type !== "array" && value.array.length !== 3 : stryMutAct_9fa48("16727") ? false : (stryCov_9fa48("16727", "16728"), (stryMutAct_9fa48("16730") ? value.type === "array" : stryMutAct_9fa48("16729") ? false : (stryCov_9fa48("16729", "16730"), value.type !== (stryMutAct_9fa48("16731") ? "" : (stryCov_9fa48("16731"), "array")))) || (stryMutAct_9fa48("16733") ? value.array.length === 3 : stryMutAct_9fa48("16732") ? false : (stryCov_9fa48("16732", "16733"), value.array.length !== 3)))) || (stryMutAct_9fa48("16735") ? endOffset === bytes.length : stryMutAct_9fa48("16734") ? false : (stryCov_9fa48("16734", "16735"), endOffset !== bytes.length)))) {
      if (stryMutAct_9fa48("16736")) {
        {}
      } else {
        stryCov_9fa48("16736");
        throw new Error(stryMutAct_9fa48("16737") ? "" : (stryCov_9fa48("16737"), "Invalid request payload"));
      }
    }
    const [requestedAtValue, pathHashValue, dataValue] = value.array;
    if (stryMutAct_9fa48("16740") ? (requestedAtValue === undefined || pathHashValue === undefined || dataValue === undefined || requestedAtValue.type !== "float") && pathHashValue.type !== "bin" : stryMutAct_9fa48("16739") ? false : stryMutAct_9fa48("16738") ? true : (stryCov_9fa48("16738", "16739", "16740"), (stryMutAct_9fa48("16742") ? (requestedAtValue === undefined || pathHashValue === undefined || dataValue === undefined) && requestedAtValue.type !== "float" : stryMutAct_9fa48("16741") ? false : (stryCov_9fa48("16741", "16742"), (stryMutAct_9fa48("16744") ? (requestedAtValue === undefined || pathHashValue === undefined) && dataValue === undefined : stryMutAct_9fa48("16743") ? false : (stryCov_9fa48("16743", "16744"), (stryMutAct_9fa48("16746") ? requestedAtValue === undefined && pathHashValue === undefined : stryMutAct_9fa48("16745") ? false : (stryCov_9fa48("16745", "16746"), (stryMutAct_9fa48("16748") ? requestedAtValue !== undefined : stryMutAct_9fa48("16747") ? false : (stryCov_9fa48("16747", "16748"), requestedAtValue === undefined)) || (stryMutAct_9fa48("16750") ? pathHashValue !== undefined : stryMutAct_9fa48("16749") ? false : (stryCov_9fa48("16749", "16750"), pathHashValue === undefined)))) || (stryMutAct_9fa48("16752") ? dataValue !== undefined : stryMutAct_9fa48("16751") ? false : (stryCov_9fa48("16751", "16752"), dataValue === undefined)))) || (stryMutAct_9fa48("16754") ? requestedAtValue.type === "float" : stryMutAct_9fa48("16753") ? false : (stryCov_9fa48("16753", "16754"), requestedAtValue.type !== (stryMutAct_9fa48("16755") ? "" : (stryCov_9fa48("16755"), "float")))))) || (stryMutAct_9fa48("16757") ? pathHashValue.type === "bin" : stryMutAct_9fa48("16756") ? false : (stryCov_9fa48("16756", "16757"), pathHashValue.type !== (stryMutAct_9fa48("16758") ? "" : (stryCov_9fa48("16758"), "bin")))))) {
      if (stryMutAct_9fa48("16759")) {
        {}
      } else {
        stryCov_9fa48("16759");
        throw new Error(stryMutAct_9fa48("16760") ? "" : (stryCov_9fa48("16760"), "Invalid request payload fields"));
      }
    }

    // RNS embeds `data` as either nil, a binary frame (TS clients), or a nested
    // msgpack value (Python clients pass lists like [None, None] directly).
    let data: Uint8Array | null;
    if (stryMutAct_9fa48("16763") ? dataValue.type !== "nil" : stryMutAct_9fa48("16762") ? false : stryMutAct_9fa48("16761") ? true : (stryCov_9fa48("16761", "16762", "16763"), dataValue.type === (stryMutAct_9fa48("16764") ? "" : (stryCov_9fa48("16764"), "nil")))) {
      if (stryMutAct_9fa48("16765")) {
        {}
      } else {
        stryCov_9fa48("16765");
        data = null;
      }
    } else if (stryMutAct_9fa48("16768") ? dataValue.type !== "bin" : stryMutAct_9fa48("16767") ? false : stryMutAct_9fa48("16766") ? true : (stryCov_9fa48("16766", "16767", "16768"), dataValue.type === (stryMutAct_9fa48("16769") ? "" : (stryCov_9fa48("16769"), "bin")))) {
      if (stryMutAct_9fa48("16770")) {
        {}
      } else {
        stryCov_9fa48("16770");
        data = Uint8Array.from(dataValue.bin);
      }
    } else {
      if (stryMutAct_9fa48("16771")) {
        {}
      } else {
        stryCov_9fa48("16771");
        data = msgpackRepackValue(dataValue);
      }
    }
    return stryMutAct_9fa48("16772") ? {} : (stryCov_9fa48("16772"), {
      requestedAt: requestedAtValue.float,
      pathHash: Uint8Array.from(pathHashValue.bin),
      data
    });
  }
}

/** Re-encode a decoded msgpack value so nested Python payloads become byte frames. */
function msgpackRepackValue(value: MsgpackValue): Uint8Array {
  if (stryMutAct_9fa48("16773")) {
    {}
  } else {
    stryCov_9fa48("16773");
    switch (value.type) {
      case stryMutAct_9fa48("16775") ? "" : (stryCov_9fa48("16775"), "nil"):
        if (stryMutAct_9fa48("16774")) {} else {
          stryCov_9fa48("16774");
          return msgpackPackNil();
        }
      case stryMutAct_9fa48("16777") ? "" : (stryCov_9fa48("16777"), "bin"):
        if (stryMutAct_9fa48("16776")) {} else {
          stryCov_9fa48("16776");
          return msgpackPackBin(value.bin);
        }
      case stryMutAct_9fa48("16779") ? "" : (stryCov_9fa48("16779"), "float"):
        if (stryMutAct_9fa48("16778")) {} else {
          stryCov_9fa48("16778");
          return msgpackPackFloat64(value.float);
        }
      case stryMutAct_9fa48("16781") ? "" : (stryCov_9fa48("16781"), "int"):
        if (stryMutAct_9fa48("16780")) {} else {
          stryCov_9fa48("16780");
          return msgpackPackUInt(value.int);
        }
      case stryMutAct_9fa48("16783") ? "" : (stryCov_9fa48("16783"), "array"):
        if (stryMutAct_9fa48("16782")) {} else {
          stryCov_9fa48("16782");
          return msgpackPackArray(value.array.map(stryMutAct_9fa48("16784") ? () => undefined : (stryCov_9fa48("16784"), entry => msgpackRepackValue(entry))));
        }
      default:
        if (stryMutAct_9fa48("16785")) {} else {
          stryCov_9fa48("16785");
          throw new Error(stryMutAct_9fa48("16786") ? "" : (stryCov_9fa48("16786"), "Unsupported link-request data msgpack type"));
        }
    }
  }
}
export function msgpackUnpackLinkResponse(bytes: Uint8Array): LinkResponseFields {
  if (stryMutAct_9fa48("16787")) {
    {}
  } else {
    stryCov_9fa48("16787");
    const value = msgpackUnpack(bytes);
    if (stryMutAct_9fa48("16790") ? value.type !== "array" && value.array.length !== 2 : stryMutAct_9fa48("16789") ? false : stryMutAct_9fa48("16788") ? true : (stryCov_9fa48("16788", "16789", "16790"), (stryMutAct_9fa48("16792") ? value.type === "array" : stryMutAct_9fa48("16791") ? false : (stryCov_9fa48("16791", "16792"), value.type !== (stryMutAct_9fa48("16793") ? "" : (stryCov_9fa48("16793"), "array")))) || (stryMutAct_9fa48("16795") ? value.array.length === 2 : stryMutAct_9fa48("16794") ? false : (stryCov_9fa48("16794", "16795"), value.array.length !== 2)))) {
      if (stryMutAct_9fa48("16796")) {
        {}
      } else {
        stryCov_9fa48("16796");
        throw new Error(stryMutAct_9fa48("16797") ? "" : (stryCov_9fa48("16797"), "Invalid response payload"));
      }
    }
    const [requestIdValue, responseValue] = value.array;
    if (stryMutAct_9fa48("16800") ? (requestIdValue === undefined || responseValue === undefined) && requestIdValue.type !== "bin" : stryMutAct_9fa48("16799") ? false : stryMutAct_9fa48("16798") ? true : (stryCov_9fa48("16798", "16799", "16800"), (stryMutAct_9fa48("16802") ? requestIdValue === undefined && responseValue === undefined : stryMutAct_9fa48("16801") ? false : (stryCov_9fa48("16801", "16802"), (stryMutAct_9fa48("16804") ? requestIdValue !== undefined : stryMutAct_9fa48("16803") ? false : (stryCov_9fa48("16803", "16804"), requestIdValue === undefined)) || (stryMutAct_9fa48("16806") ? responseValue !== undefined : stryMutAct_9fa48("16805") ? false : (stryCov_9fa48("16805", "16806"), responseValue === undefined)))) || (stryMutAct_9fa48("16808") ? requestIdValue.type === "bin" : stryMutAct_9fa48("16807") ? false : (stryCov_9fa48("16807", "16808"), requestIdValue.type !== (stryMutAct_9fa48("16809") ? "" : (stryCov_9fa48("16809"), "bin")))))) {
      if (stryMutAct_9fa48("16810")) {
        {}
      } else {
        stryCov_9fa48("16810");
        throw new Error(stryMutAct_9fa48("16811") ? "" : (stryCov_9fa48("16811"), "Invalid response payload fields"));
      }
    }
    let response: Uint8Array | null;
    if (stryMutAct_9fa48("16814") ? responseValue.type !== "nil" : stryMutAct_9fa48("16813") ? false : stryMutAct_9fa48("16812") ? true : (stryCov_9fa48("16812", "16813", "16814"), responseValue.type === (stryMutAct_9fa48("16815") ? "" : (stryCov_9fa48("16815"), "nil")))) {
      if (stryMutAct_9fa48("16816")) {
        {}
      } else {
        stryCov_9fa48("16816");
        response = null;
      }
    } else if (stryMutAct_9fa48("16819") ? responseValue.type !== "bin" : stryMutAct_9fa48("16818") ? false : stryMutAct_9fa48("16817") ? true : (stryCov_9fa48("16817", "16818", "16819"), responseValue.type === (stryMutAct_9fa48("16820") ? "" : (stryCov_9fa48("16820"), "bin")))) {
      if (stryMutAct_9fa48("16821")) {
        {}
      } else {
        stryCov_9fa48("16821");
        // Older TS peers framed the payload as bin; keep accepting that form.
        response = Uint8Array.from(responseValue.bin);
      }
    } else {
      if (stryMutAct_9fa48("16822")) {
        {}
      } else {
        stryCov_9fa48("16822");
        response = msgpackRepackValue(responseValue);
      }
    }
    return stryMutAct_9fa48("16823") ? {} : (stryCov_9fa48("16823"), {
      requestId: Uint8Array.from(requestIdValue.bin),
      response
    });
  }
}

/** Tuple form matching legacy reticulum-ts helpers. */
export function msgpackUnpackLinkRequestTuple(bytes: Uint8Array): [number, Uint8Array, Uint8Array | null] {
  if (stryMutAct_9fa48("16824")) {
    {}
  } else {
    stryCov_9fa48("16824");
    const unpacked = msgpackUnpackLinkRequest(bytes);
    return stryMutAct_9fa48("16825") ? [] : (stryCov_9fa48("16825"), [unpacked.requestedAt, unpacked.pathHash, unpacked.data]);
  }
}
export function msgpackUnpackLinkResponseTuple(bytes: Uint8Array): [Uint8Array, Uint8Array | null] {
  if (stryMutAct_9fa48("16826")) {
    {}
  } else {
    stryCov_9fa48("16826");
    const unpacked = msgpackUnpackLinkResponse(bytes);
    return stryMutAct_9fa48("16827") ? [] : (stryCov_9fa48("16827"), [unpacked.requestId, unpacked.response]);
  }
}

/**
 * Link-request pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackPackLinkRequest`
 * reads beside the step).
 */
export type PackLinkRequestState = Record<string, never>;
export type PackLinkRequestEvent = Event | {
  readonly kind: "link-request-codec/pack-gate";
  readonly requestedAt: number;
  readonly pathHash: Uint8Array;
  readonly data: Uint8Array | null;
};
export type PackLinkRequestAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackLinkRequestStepResult {
  readonly state: PackLinkRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkRequestAction[];
}
export function initialPackLinkRequestState(): PackLinkRequestState {
  if (stryMutAct_9fa48("16828")) {
    {}
  } else {
    stryCov_9fa48("16828");
    return {};
  }
}
export function stepPackLinkRequestWithActions(state: PackLinkRequestState, event: PackLinkRequestEvent): PackLinkRequestStepResult {
  if (stryMutAct_9fa48("16829")) {
    {}
  } else {
    stryCov_9fa48("16829");
    if (stryMutAct_9fa48("16832") ? event.kind !== "link-request-codec/pack-gate" : stryMutAct_9fa48("16831") ? false : stryMutAct_9fa48("16830") ? true : (stryCov_9fa48("16830", "16831", "16832"), event.kind === (stryMutAct_9fa48("16833") ? "" : (stryCov_9fa48("16833"), "link-request-codec/pack-gate")))) {
      if (stryMutAct_9fa48("16834")) {
        {}
      } else {
        stryCov_9fa48("16834");
        return stryMutAct_9fa48("16835") ? {} : (stryCov_9fa48("16835"), {
          state,
          intents: stryMutAct_9fa48("16836") ? ["Stryker was here"] : (stryCov_9fa48("16836"), []),
          actions: stryMutAct_9fa48("16837") ? [] : (stryCov_9fa48("16837"), [stryMutAct_9fa48("16838") ? {} : (stryCov_9fa48("16838"), {
            kind: stryMutAct_9fa48("16839") ? "" : (stryCov_9fa48("16839"), "use-raw"),
            raw: msgpackPackLinkRequest(event.requestedAt, event.pathHash, event.data)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16840") ? {} : (stryCov_9fa48("16840"), {
      state,
      intents: stryMutAct_9fa48("16841") ? ["Stryker was here"] : (stryCov_9fa48("16841"), []),
      actions: stryMutAct_9fa48("16842") ? ["Stryker was here"] : (stryCov_9fa48("16842"), [])
    });
  }
}
export function shouldUsePackLinkRequest(actions: ReadonlyArray<PackLinkRequestAction>): boolean {
  if (stryMutAct_9fa48("16843")) {
    {}
  } else {
    stryCov_9fa48("16843");
    return stryMutAct_9fa48("16844") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("16844"), actions.some(stryMutAct_9fa48("16845") ? () => undefined : (stryCov_9fa48("16845"), action => stryMutAct_9fa48("16848") ? action.kind !== "use-raw" : stryMutAct_9fa48("16847") ? false : stryMutAct_9fa48("16846") ? true : (stryCov_9fa48("16846", "16847", "16848"), action.kind === (stryMutAct_9fa48("16849") ? "" : (stryCov_9fa48("16849"), "use-raw"))))));
  }
}

/** Extract link-request pack bytes from step actions; null when no `use-raw`. */
export function packLinkRequestRawFromActions(actions: ReadonlyArray<PackLinkRequestAction>): Uint8Array | null {
  if (stryMutAct_9fa48("16850")) {
    {}
  } else {
    stryCov_9fa48("16850");
    const action = actions.find(stryMutAct_9fa48("16851") ? () => undefined : (stryCov_9fa48("16851"), entry => stryMutAct_9fa48("16854") ? entry.kind !== "use-raw" : stryMutAct_9fa48("16853") ? false : stryMutAct_9fa48("16852") ? true : (stryCov_9fa48("16852", "16853", "16854"), entry.kind === (stryMutAct_9fa48("16855") ? "" : (stryCov_9fa48("16855"), "use-raw")))));
    return (stryMutAct_9fa48("16858") ? action?.kind !== "use-raw" : stryMutAct_9fa48("16857") ? false : stryMutAct_9fa48("16856") ? true : (stryCov_9fa48("16856", "16857", "16858"), (stryMutAct_9fa48("16859") ? action.kind : (stryCov_9fa48("16859"), action?.kind)) === (stryMutAct_9fa48("16860") ? "" : (stryCov_9fa48("16860"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Link-response pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackPackLinkResponse`
 * reads beside the step).
 */
export type PackLinkResponseState = Record<string, never>;
export type PackLinkResponseEvent = Event | {
  readonly kind: "link-response-codec/pack-gate";
  readonly requestId: Uint8Array;
  readonly response: Uint8Array | null;
};
export type PackLinkResponseAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackLinkResponseStepResult {
  readonly state: PackLinkResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkResponseAction[];
}
export function initialPackLinkResponseState(): PackLinkResponseState {
  if (stryMutAct_9fa48("16861")) {
    {}
  } else {
    stryCov_9fa48("16861");
    return {};
  }
}
export function stepPackLinkResponseWithActions(state: PackLinkResponseState, event: PackLinkResponseEvent): PackLinkResponseStepResult {
  if (stryMutAct_9fa48("16862")) {
    {}
  } else {
    stryCov_9fa48("16862");
    if (stryMutAct_9fa48("16865") ? event.kind !== "link-response-codec/pack-gate" : stryMutAct_9fa48("16864") ? false : stryMutAct_9fa48("16863") ? true : (stryCov_9fa48("16863", "16864", "16865"), event.kind === (stryMutAct_9fa48("16866") ? "" : (stryCov_9fa48("16866"), "link-response-codec/pack-gate")))) {
      if (stryMutAct_9fa48("16867")) {
        {}
      } else {
        stryCov_9fa48("16867");
        return stryMutAct_9fa48("16868") ? {} : (stryCov_9fa48("16868"), {
          state,
          intents: stryMutAct_9fa48("16869") ? ["Stryker was here"] : (stryCov_9fa48("16869"), []),
          actions: stryMutAct_9fa48("16870") ? [] : (stryCov_9fa48("16870"), [stryMutAct_9fa48("16871") ? {} : (stryCov_9fa48("16871"), {
            kind: stryMutAct_9fa48("16872") ? "" : (stryCov_9fa48("16872"), "use-raw"),
            raw: msgpackPackLinkResponse(event.requestId, event.response)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16873") ? {} : (stryCov_9fa48("16873"), {
      state,
      intents: stryMutAct_9fa48("16874") ? ["Stryker was here"] : (stryCov_9fa48("16874"), []),
      actions: stryMutAct_9fa48("16875") ? ["Stryker was here"] : (stryCov_9fa48("16875"), [])
    });
  }
}
export function shouldUsePackLinkResponse(actions: ReadonlyArray<PackLinkResponseAction>): boolean {
  if (stryMutAct_9fa48("16876")) {
    {}
  } else {
    stryCov_9fa48("16876");
    return stryMutAct_9fa48("16877") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("16877"), actions.some(stryMutAct_9fa48("16878") ? () => undefined : (stryCov_9fa48("16878"), action => stryMutAct_9fa48("16881") ? action.kind !== "use-raw" : stryMutAct_9fa48("16880") ? false : stryMutAct_9fa48("16879") ? true : (stryCov_9fa48("16879", "16880", "16881"), action.kind === (stryMutAct_9fa48("16882") ? "" : (stryCov_9fa48("16882"), "use-raw"))))));
  }
}

/** Extract link-response pack bytes from step actions; null when no `use-raw`. */
export function packLinkResponseRawFromActions(actions: ReadonlyArray<PackLinkResponseAction>): Uint8Array | null {
  if (stryMutAct_9fa48("16883")) {
    {}
  } else {
    stryCov_9fa48("16883");
    const action = actions.find(stryMutAct_9fa48("16884") ? () => undefined : (stryCov_9fa48("16884"), entry => stryMutAct_9fa48("16887") ? entry.kind !== "use-raw" : stryMutAct_9fa48("16886") ? false : stryMutAct_9fa48("16885") ? true : (stryCov_9fa48("16885", "16886", "16887"), entry.kind === (stryMutAct_9fa48("16888") ? "" : (stryCov_9fa48("16888"), "use-raw")))));
    return (stryMutAct_9fa48("16891") ? action?.kind !== "use-raw" : stryMutAct_9fa48("16890") ? false : stryMutAct_9fa48("16889") ? true : (stryCov_9fa48("16889", "16890", "16891"), (stryMutAct_9fa48("16892") ? action.kind : (stryCov_9fa48("16892"), action?.kind)) === (stryMutAct_9fa48("16893") ? "" : (stryCov_9fa48("16893"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Link-request unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackUnpackLinkRequest`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackLinkRequestState = Record<string, never>;
export type UnpackLinkRequestEvent = Event | {
  readonly kind: "link-request-codec/unpack-gate";
  readonly data: Uint8Array;
};
export type UnpackLinkRequestAction = {
  readonly kind: "use-fields";
  readonly fields: LinkRequestFields;
} | {
  readonly kind: "reject";
};
export interface UnpackLinkRequestStepResult {
  readonly state: UnpackLinkRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLinkRequestAction[];
}
export function initialUnpackLinkRequestState(): UnpackLinkRequestState {
  if (stryMutAct_9fa48("16894")) {
    {}
  } else {
    stryCov_9fa48("16894");
    return {};
  }
}
export function stepUnpackLinkRequestWithActions(state: UnpackLinkRequestState, event: UnpackLinkRequestEvent): UnpackLinkRequestStepResult {
  if (stryMutAct_9fa48("16895")) {
    {}
  } else {
    stryCov_9fa48("16895");
    if (stryMutAct_9fa48("16898") ? event.kind !== "link-request-codec/unpack-gate" : stryMutAct_9fa48("16897") ? false : stryMutAct_9fa48("16896") ? true : (stryCov_9fa48("16896", "16897", "16898"), event.kind === (stryMutAct_9fa48("16899") ? "" : (stryCov_9fa48("16899"), "link-request-codec/unpack-gate")))) {
      if (stryMutAct_9fa48("16900")) {
        {}
      } else {
        stryCov_9fa48("16900");
        try {
          if (stryMutAct_9fa48("16901")) {
            {}
          } else {
            stryCov_9fa48("16901");
            const fields = msgpackUnpackLinkRequest(event.data);
            return stryMutAct_9fa48("16902") ? {} : (stryCov_9fa48("16902"), {
              state,
              intents: stryMutAct_9fa48("16903") ? ["Stryker was here"] : (stryCov_9fa48("16903"), []),
              actions: stryMutAct_9fa48("16904") ? [] : (stryCov_9fa48("16904"), [stryMutAct_9fa48("16905") ? {} : (stryCov_9fa48("16905"), {
                kind: stryMutAct_9fa48("16906") ? "" : (stryCov_9fa48("16906"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("16907")) {
            {}
          } else {
            stryCov_9fa48("16907");
            return stryMutAct_9fa48("16908") ? {} : (stryCov_9fa48("16908"), {
              state,
              intents: stryMutAct_9fa48("16909") ? ["Stryker was here"] : (stryCov_9fa48("16909"), []),
              actions: stryMutAct_9fa48("16910") ? [] : (stryCov_9fa48("16910"), [stryMutAct_9fa48("16911") ? {} : (stryCov_9fa48("16911"), {
                kind: stryMutAct_9fa48("16912") ? "" : (stryCov_9fa48("16912"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("16913") ? {} : (stryCov_9fa48("16913"), {
      state,
      intents: stryMutAct_9fa48("16914") ? ["Stryker was here"] : (stryCov_9fa48("16914"), []),
      actions: stryMutAct_9fa48("16915") ? ["Stryker was here"] : (stryCov_9fa48("16915"), [])
    });
  }
}
export function shouldUseUnpackLinkRequest(actions: ReadonlyArray<UnpackLinkRequestAction>): boolean {
  if (stryMutAct_9fa48("16916")) {
    {}
  } else {
    stryCov_9fa48("16916");
    return stryMutAct_9fa48("16917") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("16917"), actions.some(stryMutAct_9fa48("16918") ? () => undefined : (stryCov_9fa48("16918"), action => stryMutAct_9fa48("16921") ? action.kind !== "use-fields" : stryMutAct_9fa48("16920") ? false : stryMutAct_9fa48("16919") ? true : (stryCov_9fa48("16919", "16920", "16921"), action.kind === (stryMutAct_9fa48("16922") ? "" : (stryCov_9fa48("16922"), "use-fields"))))));
  }
}
export function shouldRejectUnpackLinkRequest(actions: ReadonlyArray<UnpackLinkRequestAction>): boolean {
  if (stryMutAct_9fa48("16923")) {
    {}
  } else {
    stryCov_9fa48("16923");
    return stryMutAct_9fa48("16924") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("16924"), actions.some(stryMutAct_9fa48("16925") ? () => undefined : (stryCov_9fa48("16925"), action => stryMutAct_9fa48("16928") ? action.kind !== "reject" : stryMutAct_9fa48("16927") ? false : stryMutAct_9fa48("16926") ? true : (stryCov_9fa48("16926", "16927", "16928"), action.kind === (stryMutAct_9fa48("16929") ? "" : (stryCov_9fa48("16929"), "reject"))))));
  }
}

/** Extract unpacked link-request fields from step actions; null when no `use-fields`. */
export function linkRequestFieldsFromActions(actions: ReadonlyArray<UnpackLinkRequestAction>): LinkRequestFields | null {
  if (stryMutAct_9fa48("16930")) {
    {}
  } else {
    stryCov_9fa48("16930");
    const action = actions.find(stryMutAct_9fa48("16931") ? () => undefined : (stryCov_9fa48("16931"), entry => stryMutAct_9fa48("16934") ? entry.kind !== "use-fields" : stryMutAct_9fa48("16933") ? false : stryMutAct_9fa48("16932") ? true : (stryCov_9fa48("16932", "16933", "16934"), entry.kind === (stryMutAct_9fa48("16935") ? "" : (stryCov_9fa48("16935"), "use-fields")))));
    return (stryMutAct_9fa48("16938") ? action?.kind !== "use-fields" : stryMutAct_9fa48("16937") ? false : stryMutAct_9fa48("16936") ? true : (stryCov_9fa48("16936", "16937", "16938"), (stryMutAct_9fa48("16939") ? action.kind : (stryCov_9fa48("16939"), action?.kind)) === (stryMutAct_9fa48("16940") ? "" : (stryCov_9fa48("16940"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Link-response unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackUnpackLinkResponse`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackLinkResponseState = Record<string, never>;
export type UnpackLinkResponseEvent = Event | {
  readonly kind: "link-response-codec/unpack-gate";
  readonly data: Uint8Array;
};
export type UnpackLinkResponseAction = {
  readonly kind: "use-fields";
  readonly fields: LinkResponseFields;
} | {
  readonly kind: "reject";
};
export interface UnpackLinkResponseStepResult {
  readonly state: UnpackLinkResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLinkResponseAction[];
}
export function initialUnpackLinkResponseState(): UnpackLinkResponseState {
  if (stryMutAct_9fa48("16941")) {
    {}
  } else {
    stryCov_9fa48("16941");
    return {};
  }
}
export function stepUnpackLinkResponseWithActions(state: UnpackLinkResponseState, event: UnpackLinkResponseEvent): UnpackLinkResponseStepResult {
  if (stryMutAct_9fa48("16942")) {
    {}
  } else {
    stryCov_9fa48("16942");
    if (stryMutAct_9fa48("16945") ? event.kind !== "link-response-codec/unpack-gate" : stryMutAct_9fa48("16944") ? false : stryMutAct_9fa48("16943") ? true : (stryCov_9fa48("16943", "16944", "16945"), event.kind === (stryMutAct_9fa48("16946") ? "" : (stryCov_9fa48("16946"), "link-response-codec/unpack-gate")))) {
      if (stryMutAct_9fa48("16947")) {
        {}
      } else {
        stryCov_9fa48("16947");
        try {
          if (stryMutAct_9fa48("16948")) {
            {}
          } else {
            stryCov_9fa48("16948");
            const fields = msgpackUnpackLinkResponse(event.data);
            return stryMutAct_9fa48("16949") ? {} : (stryCov_9fa48("16949"), {
              state,
              intents: stryMutAct_9fa48("16950") ? ["Stryker was here"] : (stryCov_9fa48("16950"), []),
              actions: stryMutAct_9fa48("16951") ? [] : (stryCov_9fa48("16951"), [stryMutAct_9fa48("16952") ? {} : (stryCov_9fa48("16952"), {
                kind: stryMutAct_9fa48("16953") ? "" : (stryCov_9fa48("16953"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("16954")) {
            {}
          } else {
            stryCov_9fa48("16954");
            return stryMutAct_9fa48("16955") ? {} : (stryCov_9fa48("16955"), {
              state,
              intents: stryMutAct_9fa48("16956") ? ["Stryker was here"] : (stryCov_9fa48("16956"), []),
              actions: stryMutAct_9fa48("16957") ? [] : (stryCov_9fa48("16957"), [stryMutAct_9fa48("16958") ? {} : (stryCov_9fa48("16958"), {
                kind: stryMutAct_9fa48("16959") ? "" : (stryCov_9fa48("16959"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("16960") ? {} : (stryCov_9fa48("16960"), {
      state,
      intents: stryMutAct_9fa48("16961") ? ["Stryker was here"] : (stryCov_9fa48("16961"), []),
      actions: stryMutAct_9fa48("16962") ? ["Stryker was here"] : (stryCov_9fa48("16962"), [])
    });
  }
}
export function shouldUseUnpackLinkResponse(actions: ReadonlyArray<UnpackLinkResponseAction>): boolean {
  if (stryMutAct_9fa48("16963")) {
    {}
  } else {
    stryCov_9fa48("16963");
    return stryMutAct_9fa48("16964") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("16964"), actions.some(stryMutAct_9fa48("16965") ? () => undefined : (stryCov_9fa48("16965"), action => stryMutAct_9fa48("16968") ? action.kind !== "use-fields" : stryMutAct_9fa48("16967") ? false : stryMutAct_9fa48("16966") ? true : (stryCov_9fa48("16966", "16967", "16968"), action.kind === (stryMutAct_9fa48("16969") ? "" : (stryCov_9fa48("16969"), "use-fields"))))));
  }
}
export function shouldRejectUnpackLinkResponse(actions: ReadonlyArray<UnpackLinkResponseAction>): boolean {
  if (stryMutAct_9fa48("16970")) {
    {}
  } else {
    stryCov_9fa48("16970");
    return stryMutAct_9fa48("16971") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("16971"), actions.some(stryMutAct_9fa48("16972") ? () => undefined : (stryCov_9fa48("16972"), action => stryMutAct_9fa48("16975") ? action.kind !== "reject" : stryMutAct_9fa48("16974") ? false : stryMutAct_9fa48("16973") ? true : (stryCov_9fa48("16973", "16974", "16975"), action.kind === (stryMutAct_9fa48("16976") ? "" : (stryCov_9fa48("16976"), "reject"))))));
  }
}

/** Extract unpacked link-response fields from step actions; null when no `use-fields`. */
export function linkResponseFieldsFromActions(actions: ReadonlyArray<UnpackLinkResponseAction>): LinkResponseFields | null {
  if (stryMutAct_9fa48("16977")) {
    {}
  } else {
    stryCov_9fa48("16977");
    const action = actions.find(stryMutAct_9fa48("16978") ? () => undefined : (stryCov_9fa48("16978"), entry => stryMutAct_9fa48("16981") ? entry.kind !== "use-fields" : stryMutAct_9fa48("16980") ? false : stryMutAct_9fa48("16979") ? true : (stryCov_9fa48("16979", "16980", "16981"), entry.kind === (stryMutAct_9fa48("16982") ? "" : (stryCov_9fa48("16982"), "use-fields")))));
    return (stryMutAct_9fa48("16985") ? action?.kind !== "use-fields" : stryMutAct_9fa48("16984") ? false : stryMutAct_9fa48("16983") ? true : (stryCov_9fa48("16983", "16984", "16985"), (stryMutAct_9fa48("16986") ? action.kind : (stryCov_9fa48("16986"), action?.kind)) === (stryMutAct_9fa48("16987") ? "" : (stryCov_9fa48("16987"), "use-fields")))) ? action.fields : null;
  }
}