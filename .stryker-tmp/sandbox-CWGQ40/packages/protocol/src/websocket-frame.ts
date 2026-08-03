/**
 * Pure binary frame encode/decode for the RNS WS interface.
 * Socket IO stays at the adapter edge.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeWsBinaryFrame` / `decodeWsClientFrame` reads beside the step).
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
export const WS_OPCODE_BINARY = 0x2;
export const WS_OPCODE_CLOSE = 0x8;
export const WS_FIN_BINARY = 0x82;
export interface WsBinaryFrame {
  readonly opcode: number;
  readonly payload: Uint8Array;
  readonly consumed: number;
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("34933")) {
    {}
  } else {
    stryCov_9fa48("34933");
    const length = parts.reduce(stryMutAct_9fa48("34934") ? () => undefined : (stryCov_9fa48("34934"), (total, part) => stryMutAct_9fa48("34935") ? total - part.length : (stryCov_9fa48("34935"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("34936")) {
        {}
      } else {
        stryCov_9fa48("34936");
        output.set(part, offset);
        stryMutAct_9fa48("34937") ? offset -= part.length : (stryCov_9fa48("34937"), offset += part.length);
      }
    }
    return output;
  }
}

/** Encode an unmasked server→client binary frame. */
export function encodeWsBinaryFrame(data: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("34938")) {
    {}
  } else {
    stryCov_9fa48("34938");
    if (stryMutAct_9fa48("34942") ? data.length >= 126 : stryMutAct_9fa48("34941") ? data.length <= 126 : stryMutAct_9fa48("34940") ? false : stryMutAct_9fa48("34939") ? true : (stryCov_9fa48("34939", "34940", "34941", "34942"), data.length < 126)) {
      if (stryMutAct_9fa48("34943")) {
        {}
      } else {
        stryCov_9fa48("34943");
        return concatBytes(new Uint8Array(stryMutAct_9fa48("34944") ? [] : (stryCov_9fa48("34944"), [WS_FIN_BINARY, data.length])), data);
      }
    }
    if (stryMutAct_9fa48("34948") ? data.length > 0xffff : stryMutAct_9fa48("34947") ? data.length < 0xffff : stryMutAct_9fa48("34946") ? false : stryMutAct_9fa48("34945") ? true : (stryCov_9fa48("34945", "34946", "34947", "34948"), data.length <= 0xffff)) {
      if (stryMutAct_9fa48("34949")) {
        {}
      } else {
        stryCov_9fa48("34949");
        const header = new Uint8Array(4);
        header[0] = WS_FIN_BINARY;
        header[1] = 126;
        header[2] = data.length >> 8 & 0xff;
        header[3] = data.length & 0xff;
        return concatBytes(header, data);
      }
    }
    const header = new Uint8Array(10);
    header[0] = WS_FIN_BINARY;
    header[1] = 127;
    const view = new DataView(header.buffer);
    view.setBigUint64(2, BigInt(data.length), stryMutAct_9fa48("34950") ? true : (stryCov_9fa48("34950"), false));
    return concatBytes(header, data);
  }
}

/** Decode a masked client→server frame; returns null if incomplete. */
export function decodeWsClientFrame(buffer: Uint8Array): WsBinaryFrame | null {
  if (stryMutAct_9fa48("34951")) {
    {}
  } else {
    stryCov_9fa48("34951");
    if (stryMutAct_9fa48("34955") ? buffer.length >= 2 : stryMutAct_9fa48("34954") ? buffer.length <= 2 : stryMutAct_9fa48("34953") ? false : stryMutAct_9fa48("34952") ? true : (stryCov_9fa48("34952", "34953", "34954", "34955"), buffer.length < 2)) {
      if (stryMutAct_9fa48("34956")) {
        {}
      } else {
        stryCov_9fa48("34956");
        return null;
      }
    }
    const opcode = buffer[0]! & 0x0f;
    const masked = stryMutAct_9fa48("34959") ? (buffer[1]! & 0x80) === 0 : stryMutAct_9fa48("34958") ? false : stryMutAct_9fa48("34957") ? true : (stryCov_9fa48("34957", "34958", "34959"), (buffer[1]! & 0x80) !== 0);
    let length = buffer[1]! & 0x7f;
    let offset = 2;
    if (stryMutAct_9fa48("34962") ? length !== 126 : stryMutAct_9fa48("34961") ? false : stryMutAct_9fa48("34960") ? true : (stryCov_9fa48("34960", "34961", "34962"), length === 126)) {
      if (stryMutAct_9fa48("34963")) {
        {}
      } else {
        stryCov_9fa48("34963");
        if (stryMutAct_9fa48("34967") ? buffer.length >= offset + 2 : stryMutAct_9fa48("34966") ? buffer.length <= offset + 2 : stryMutAct_9fa48("34965") ? false : stryMutAct_9fa48("34964") ? true : (stryCov_9fa48("34964", "34965", "34966", "34967"), buffer.length < (stryMutAct_9fa48("34968") ? offset - 2 : (stryCov_9fa48("34968"), offset + 2)))) {
          if (stryMutAct_9fa48("34969")) {
            {}
          } else {
            stryCov_9fa48("34969");
            return null;
          }
        }
        length = buffer[offset]! << 8 | buffer[stryMutAct_9fa48("34970") ? offset - 1 : (stryCov_9fa48("34970"), offset + 1)]!;
        stryMutAct_9fa48("34971") ? offset -= 2 : (stryCov_9fa48("34971"), offset += 2);
      }
    } else if (stryMutAct_9fa48("34974") ? length !== 127 : stryMutAct_9fa48("34973") ? false : stryMutAct_9fa48("34972") ? true : (stryCov_9fa48("34972", "34973", "34974"), length === 127)) {
      if (stryMutAct_9fa48("34975")) {
        {}
      } else {
        stryCov_9fa48("34975");
        if (stryMutAct_9fa48("34979") ? buffer.length >= offset + 8 : stryMutAct_9fa48("34978") ? buffer.length <= offset + 8 : stryMutAct_9fa48("34977") ? false : stryMutAct_9fa48("34976") ? true : (stryCov_9fa48("34976", "34977", "34978", "34979"), buffer.length < (stryMutAct_9fa48("34980") ? offset - 8 : (stryCov_9fa48("34980"), offset + 8)))) {
          if (stryMutAct_9fa48("34981")) {
            {}
          } else {
            stryCov_9fa48("34981");
            return null;
          }
        }
        const view = new DataView(buffer.buffer, stryMutAct_9fa48("34982") ? buffer.byteOffset - offset : (stryCov_9fa48("34982"), buffer.byteOffset + offset), 8);
        const bigLength = view.getBigUint64(0, stryMutAct_9fa48("34983") ? true : (stryCov_9fa48("34983"), false));
        if (stryMutAct_9fa48("34987") ? bigLength <= BigInt(Number.MAX_SAFE_INTEGER) : stryMutAct_9fa48("34986") ? bigLength >= BigInt(Number.MAX_SAFE_INTEGER) : stryMutAct_9fa48("34985") ? false : stryMutAct_9fa48("34984") ? true : (stryCov_9fa48("34984", "34985", "34986", "34987"), bigLength > BigInt(Number.MAX_SAFE_INTEGER))) {
          if (stryMutAct_9fa48("34988")) {
            {}
          } else {
            stryCov_9fa48("34988");
            return null;
          }
        }
        length = Number(bigLength);
        stryMutAct_9fa48("34989") ? offset -= 8 : (stryCov_9fa48("34989"), offset += 8);
      }
    }
    if (stryMutAct_9fa48("34992") ? !masked && buffer.length < offset + 4 + length : stryMutAct_9fa48("34991") ? false : stryMutAct_9fa48("34990") ? true : (stryCov_9fa48("34990", "34991", "34992"), (stryMutAct_9fa48("34993") ? masked : (stryCov_9fa48("34993"), !masked)) || (stryMutAct_9fa48("34996") ? buffer.length >= offset + 4 + length : stryMutAct_9fa48("34995") ? buffer.length <= offset + 4 + length : stryMutAct_9fa48("34994") ? false : (stryCov_9fa48("34994", "34995", "34996"), buffer.length < (stryMutAct_9fa48("34997") ? offset + 4 - length : (stryCov_9fa48("34997"), (stryMutAct_9fa48("34998") ? offset - 4 : (stryCov_9fa48("34998"), offset + 4)) + length)))))) {
      if (stryMutAct_9fa48("34999")) {
        {}
      } else {
        stryCov_9fa48("34999");
        return null;
      }
    }
    const mask = buffer.subarray(offset, stryMutAct_9fa48("35000") ? offset - 4 : (stryCov_9fa48("35000"), offset + 4));
    stryMutAct_9fa48("35001") ? offset -= 4 : (stryCov_9fa48("35001"), offset += 4);
    const payload = Uint8Array.from(buffer.subarray(offset, stryMutAct_9fa48("35002") ? offset - length : (stryCov_9fa48("35002"), offset + length)));
    for (let index = 0; stryMutAct_9fa48("35005") ? index >= payload.length : stryMutAct_9fa48("35004") ? index <= payload.length : stryMutAct_9fa48("35003") ? false : (stryCov_9fa48("35003", "35004", "35005"), index < payload.length); stryMutAct_9fa48("35006") ? index -= 1 : (stryCov_9fa48("35006"), index += 1)) {
      if (stryMutAct_9fa48("35007")) {
        {}
      } else {
        stryCov_9fa48("35007");
        payload[index] = payload[index]! ^ mask[stryMutAct_9fa48("35008") ? index * 4 : (stryCov_9fa48("35008"), index % 4)]!;
      }
    }
    return stryMutAct_9fa48("35009") ? {} : (stryCov_9fa48("35009"), {
      opcode,
      payload,
      consumed: stryMutAct_9fa48("35010") ? offset - length : (stryCov_9fa48("35010"), offset + length)
    });
  }
}

/**
 * WS binary encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeWsBinaryFrame`
 * reads beside the step).
 */
export type EncodeWsBinaryFrameState = Record<string, never>;
export type EncodeWsBinaryFrameEvent = Event | {
  readonly kind: "ws-frame/encode-gate";
  readonly data: Uint8Array;
};
export type EncodeWsBinaryFrameAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface EncodeWsBinaryFrameStepResult {
  readonly state: EncodeWsBinaryFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeWsBinaryFrameAction[];
}
export function initialEncodeWsBinaryFrameState(): EncodeWsBinaryFrameState {
  if (stryMutAct_9fa48("35011")) {
    {}
  } else {
    stryCov_9fa48("35011");
    return {};
  }
}
export function stepEncodeWsBinaryFrameWithActions(state: EncodeWsBinaryFrameState, event: EncodeWsBinaryFrameEvent): EncodeWsBinaryFrameStepResult {
  if (stryMutAct_9fa48("35012")) {
    {}
  } else {
    stryCov_9fa48("35012");
    if (stryMutAct_9fa48("35015") ? event.kind !== "ws-frame/encode-gate" : stryMutAct_9fa48("35014") ? false : stryMutAct_9fa48("35013") ? true : (stryCov_9fa48("35013", "35014", "35015"), event.kind === (stryMutAct_9fa48("35016") ? "" : (stryCov_9fa48("35016"), "ws-frame/encode-gate")))) {
      if (stryMutAct_9fa48("35017")) {
        {}
      } else {
        stryCov_9fa48("35017");
        return stryMutAct_9fa48("35018") ? {} : (stryCov_9fa48("35018"), {
          state,
          intents: stryMutAct_9fa48("35019") ? ["Stryker was here"] : (stryCov_9fa48("35019"), []),
          actions: stryMutAct_9fa48("35020") ? [] : (stryCov_9fa48("35020"), [stryMutAct_9fa48("35021") ? {} : (stryCov_9fa48("35021"), {
            kind: stryMutAct_9fa48("35022") ? "" : (stryCov_9fa48("35022"), "use-raw"),
            raw: encodeWsBinaryFrame(event.data)
          })])
        });
      }
    }
    return stryMutAct_9fa48("35023") ? {} : (stryCov_9fa48("35023"), {
      state,
      intents: stryMutAct_9fa48("35024") ? ["Stryker was here"] : (stryCov_9fa48("35024"), []),
      actions: stryMutAct_9fa48("35025") ? ["Stryker was here"] : (stryCov_9fa48("35025"), [])
    });
  }
}
export function shouldUseEncodeWsBinaryFrame(actions: ReadonlyArray<EncodeWsBinaryFrameAction>): boolean {
  if (stryMutAct_9fa48("35026")) {
    {}
  } else {
    stryCov_9fa48("35026");
    return stryMutAct_9fa48("35027") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("35027"), actions.some(stryMutAct_9fa48("35028") ? () => undefined : (stryCov_9fa48("35028"), action => stryMutAct_9fa48("35031") ? action.kind !== "use-raw" : stryMutAct_9fa48("35030") ? false : stryMutAct_9fa48("35029") ? true : (stryCov_9fa48("35029", "35030", "35031"), action.kind === (stryMutAct_9fa48("35032") ? "" : (stryCov_9fa48("35032"), "use-raw"))))));
  }
}

/** Extract encoded WS binary frame from step actions; null when no `use-raw`. */
export function encodeWsBinaryFrameRawFromActions(actions: ReadonlyArray<EncodeWsBinaryFrameAction>): Uint8Array | null {
  if (stryMutAct_9fa48("35033")) {
    {}
  } else {
    stryCov_9fa48("35033");
    const action = actions.find(stryMutAct_9fa48("35034") ? () => undefined : (stryCov_9fa48("35034"), entry => stryMutAct_9fa48("35037") ? entry.kind !== "use-raw" : stryMutAct_9fa48("35036") ? false : stryMutAct_9fa48("35035") ? true : (stryCov_9fa48("35035", "35036", "35037"), entry.kind === (stryMutAct_9fa48("35038") ? "" : (stryCov_9fa48("35038"), "use-raw")))));
    return (stryMutAct_9fa48("35041") ? action?.kind !== "use-raw" : stryMutAct_9fa48("35040") ? false : stryMutAct_9fa48("35039") ? true : (stryCov_9fa48("35039", "35040", "35041"), (stryMutAct_9fa48("35042") ? action.kind : (stryCov_9fa48("35042"), action?.kind)) === (stryMutAct_9fa48("35043") ? "" : (stryCov_9fa48("35043"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * WS client-frame decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeWsClientFrame`
 * reads beside the step). Incomplete or oversized frames become `reject`.
 */
export type DecodeWsClientFrameState = Record<string, never>;
export type DecodeWsClientFrameEvent = Event | {
  readonly kind: "ws-frame/decode-gate";
  readonly buffer: Uint8Array;
};
export type DecodeWsClientFrameAction = {
  readonly kind: "use-fields";
  readonly fields: WsBinaryFrame;
} | {
  readonly kind: "reject";
};
export interface DecodeWsClientFrameStepResult {
  readonly state: DecodeWsClientFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeWsClientFrameAction[];
}
export function initialDecodeWsClientFrameState(): DecodeWsClientFrameState {
  if (stryMutAct_9fa48("35044")) {
    {}
  } else {
    stryCov_9fa48("35044");
    return {};
  }
}
export function stepDecodeWsClientFrameWithActions(state: DecodeWsClientFrameState, event: DecodeWsClientFrameEvent): DecodeWsClientFrameStepResult {
  if (stryMutAct_9fa48("35045")) {
    {}
  } else {
    stryCov_9fa48("35045");
    if (stryMutAct_9fa48("35048") ? event.kind !== "ws-frame/decode-gate" : stryMutAct_9fa48("35047") ? false : stryMutAct_9fa48("35046") ? true : (stryCov_9fa48("35046", "35047", "35048"), event.kind === (stryMutAct_9fa48("35049") ? "" : (stryCov_9fa48("35049"), "ws-frame/decode-gate")))) {
      if (stryMutAct_9fa48("35050")) {
        {}
      } else {
        stryCov_9fa48("35050");
        try {
          if (stryMutAct_9fa48("35051")) {
            {}
          } else {
            stryCov_9fa48("35051");
            const fields = decodeWsClientFrame(event.buffer);
            if (stryMutAct_9fa48("35054") ? fields !== null : stryMutAct_9fa48("35053") ? false : stryMutAct_9fa48("35052") ? true : (stryCov_9fa48("35052", "35053", "35054"), fields === null)) {
              if (stryMutAct_9fa48("35055")) {
                {}
              } else {
                stryCov_9fa48("35055");
                return stryMutAct_9fa48("35056") ? {} : (stryCov_9fa48("35056"), {
                  state,
                  intents: stryMutAct_9fa48("35057") ? ["Stryker was here"] : (stryCov_9fa48("35057"), []),
                  actions: stryMutAct_9fa48("35058") ? [] : (stryCov_9fa48("35058"), [stryMutAct_9fa48("35059") ? {} : (stryCov_9fa48("35059"), {
                    kind: stryMutAct_9fa48("35060") ? "" : (stryCov_9fa48("35060"), "reject")
                  })])
                });
              }
            }
            return stryMutAct_9fa48("35061") ? {} : (stryCov_9fa48("35061"), {
              state,
              intents: stryMutAct_9fa48("35062") ? ["Stryker was here"] : (stryCov_9fa48("35062"), []),
              actions: stryMutAct_9fa48("35063") ? [] : (stryCov_9fa48("35063"), [stryMutAct_9fa48("35064") ? {} : (stryCov_9fa48("35064"), {
                kind: stryMutAct_9fa48("35065") ? "" : (stryCov_9fa48("35065"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("35066")) {
            {}
          } else {
            stryCov_9fa48("35066");
            return stryMutAct_9fa48("35067") ? {} : (stryCov_9fa48("35067"), {
              state,
              intents: stryMutAct_9fa48("35068") ? ["Stryker was here"] : (stryCov_9fa48("35068"), []),
              actions: stryMutAct_9fa48("35069") ? [] : (stryCov_9fa48("35069"), [stryMutAct_9fa48("35070") ? {} : (stryCov_9fa48("35070"), {
                kind: stryMutAct_9fa48("35071") ? "" : (stryCov_9fa48("35071"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("35072") ? {} : (stryCov_9fa48("35072"), {
      state,
      intents: stryMutAct_9fa48("35073") ? ["Stryker was here"] : (stryCov_9fa48("35073"), []),
      actions: stryMutAct_9fa48("35074") ? ["Stryker was here"] : (stryCov_9fa48("35074"), [])
    });
  }
}
export function shouldUseDecodeWsClientFrame(actions: ReadonlyArray<DecodeWsClientFrameAction>): boolean {
  if (stryMutAct_9fa48("35075")) {
    {}
  } else {
    stryCov_9fa48("35075");
    return stryMutAct_9fa48("35076") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("35076"), actions.some(stryMutAct_9fa48("35077") ? () => undefined : (stryCov_9fa48("35077"), action => stryMutAct_9fa48("35080") ? action.kind !== "use-fields" : stryMutAct_9fa48("35079") ? false : stryMutAct_9fa48("35078") ? true : (stryCov_9fa48("35078", "35079", "35080"), action.kind === (stryMutAct_9fa48("35081") ? "" : (stryCov_9fa48("35081"), "use-fields"))))));
  }
}
export function shouldRejectDecodeWsClientFrame(actions: ReadonlyArray<DecodeWsClientFrameAction>): boolean {
  if (stryMutAct_9fa48("35082")) {
    {}
  } else {
    stryCov_9fa48("35082");
    return stryMutAct_9fa48("35083") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("35083"), actions.some(stryMutAct_9fa48("35084") ? () => undefined : (stryCov_9fa48("35084"), action => stryMutAct_9fa48("35087") ? action.kind !== "reject" : stryMutAct_9fa48("35086") ? false : stryMutAct_9fa48("35085") ? true : (stryCov_9fa48("35085", "35086", "35087"), action.kind === (stryMutAct_9fa48("35088") ? "" : (stryCov_9fa48("35088"), "reject"))))));
  }
}

/** Extract decoded WS client frame from step actions; null when no `use-fields`. */
export function wsClientFrameFromActions(actions: ReadonlyArray<DecodeWsClientFrameAction>): WsBinaryFrame | null {
  if (stryMutAct_9fa48("35089")) {
    {}
  } else {
    stryCov_9fa48("35089");
    const action = actions.find(stryMutAct_9fa48("35090") ? () => undefined : (stryCov_9fa48("35090"), entry => stryMutAct_9fa48("35093") ? entry.kind !== "use-fields" : stryMutAct_9fa48("35092") ? false : stryMutAct_9fa48("35091") ? true : (stryCov_9fa48("35091", "35092", "35093"), entry.kind === (stryMutAct_9fa48("35094") ? "" : (stryCov_9fa48("35094"), "use-fields")))));
    return (stryMutAct_9fa48("35097") ? action?.kind !== "use-fields" : stryMutAct_9fa48("35096") ? false : stryMutAct_9fa48("35095") ? true : (stryCov_9fa48("35095", "35096", "35097"), (stryMutAct_9fa48("35098") ? action.kind : (stryCov_9fa48("35098"), action?.kind)) === (stryMutAct_9fa48("35099") ? "" : (stryCov_9fa48("35099"), "use-fields")))) ? action.fields : null;
  }
}