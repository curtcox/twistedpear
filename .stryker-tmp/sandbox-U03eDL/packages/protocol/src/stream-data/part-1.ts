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
export const STREAM_DATA_HEADER_SIZE = 2;
export const STREAM_ID_MAX = 0x3fff;
export const STREAM_DATA_FLAG_EOF = 0x8000;
export const STREAM_DATA_FLAG_COMPRESSED = 0x4000;

/** Mirrors RNS/Buffer.py StreamDataMessage system message type. */
export const STREAM_DATA_MSGTYPE = 0xff00;
export const StreamSystemMessageTypes = {
  SMT_STREAM_DATA: STREAM_DATA_MSGTYPE
} as const;
export type StreamSystemMessageTypeValue = (typeof StreamSystemMessageTypes)[keyof typeof StreamSystemMessageTypes];
export interface StreamDataFields {
  readonly streamId: number;
  readonly data: Uint8Array;
  readonly eof: boolean;
  readonly compressed: boolean;
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("32057")) {
    {}
  } else {
    stryCov_9fa48("32057");
    const length = parts.reduce(stryMutAct_9fa48("32058") ? () => undefined : (stryCov_9fa48("32058"), (total, part) => stryMutAct_9fa48("32059") ? total - part.length : (stryCov_9fa48("32059"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("32060")) {
        {}
      } else {
        stryCov_9fa48("32060");
        output.set(part, offset);
        stryMutAct_9fa48("32061") ? offset -= part.length : (stryCov_9fa48("32061"), offset += part.length);
      }
    }
    return output;
  }
}
export function packStreamDataMessage(fields: {
  readonly streamId: number;
  readonly data: Uint8Array;
  readonly eof?: boolean;
  readonly compressed?: boolean;
}): Uint8Array {
  if (stryMutAct_9fa48("32062")) {
    {}
  } else {
    stryCov_9fa48("32062");
    if (stryMutAct_9fa48("32065") ? fields.streamId < 0 && fields.streamId > STREAM_ID_MAX : stryMutAct_9fa48("32064") ? false : stryMutAct_9fa48("32063") ? true : (stryCov_9fa48("32063", "32064", "32065"), (stryMutAct_9fa48("32068") ? fields.streamId >= 0 : stryMutAct_9fa48("32067") ? fields.streamId <= 0 : stryMutAct_9fa48("32066") ? false : (stryCov_9fa48("32066", "32067", "32068"), fields.streamId < 0)) || (stryMutAct_9fa48("32071") ? fields.streamId <= STREAM_ID_MAX : stryMutAct_9fa48("32070") ? fields.streamId >= STREAM_ID_MAX : stryMutAct_9fa48("32069") ? false : (stryCov_9fa48("32069", "32070", "32071"), fields.streamId > STREAM_ID_MAX)))) {
      if (stryMutAct_9fa48("32072")) {
        {}
      } else {
        stryCov_9fa48("32072");
        throw new Error(stryMutAct_9fa48("32073") ? `` : (stryCov_9fa48("32073"), `stream_id must be between 0 and ${STREAM_ID_MAX}`));
      }
    }
    let headerValue = fields.streamId & STREAM_ID_MAX;
    if (stryMutAct_9fa48("32076") ? fields.eof !== true : stryMutAct_9fa48("32075") ? false : stryMutAct_9fa48("32074") ? true : (stryCov_9fa48("32074", "32075", "32076"), fields.eof === (stryMutAct_9fa48("32077") ? false : (stryCov_9fa48("32077"), true)))) {
      if (stryMutAct_9fa48("32078")) {
        {}
      } else {
        stryCov_9fa48("32078");
        stryMutAct_9fa48("32079") ? headerValue &= STREAM_DATA_FLAG_EOF : (stryCov_9fa48("32079"), headerValue |= STREAM_DATA_FLAG_EOF);
      }
    }
    if (stryMutAct_9fa48("32082") ? fields.compressed !== true : stryMutAct_9fa48("32081") ? false : stryMutAct_9fa48("32080") ? true : (stryCov_9fa48("32080", "32081", "32082"), fields.compressed === (stryMutAct_9fa48("32083") ? false : (stryCov_9fa48("32083"), true)))) {
      if (stryMutAct_9fa48("32084")) {
        {}
      } else {
        stryCov_9fa48("32084");
        stryMutAct_9fa48("32085") ? headerValue &= STREAM_DATA_FLAG_COMPRESSED : (stryCov_9fa48("32085"), headerValue |= STREAM_DATA_FLAG_COMPRESSED);
      }
    }
    const header = new Uint8Array(STREAM_DATA_HEADER_SIZE);
    const view = new DataView(header.buffer);
    view.setUint16(0, headerValue, stryMutAct_9fa48("32086") ? true : (stryCov_9fa48("32086"), false));
    return concatBytes(header, fields.data);
  }
}
export function unpackStreamDataMessage(raw: Uint8Array): StreamDataFields {
  if (stryMutAct_9fa48("32087")) {
    {}
  } else {
    stryCov_9fa48("32087");
    if (stryMutAct_9fa48("32091") ? raw.length >= STREAM_DATA_HEADER_SIZE : stryMutAct_9fa48("32090") ? raw.length <= STREAM_DATA_HEADER_SIZE : stryMutAct_9fa48("32089") ? false : stryMutAct_9fa48("32088") ? true : (stryCov_9fa48("32088", "32089", "32090", "32091"), raw.length < STREAM_DATA_HEADER_SIZE)) {
      if (stryMutAct_9fa48("32092")) {
        {}
      } else {
        stryCov_9fa48("32092");
        throw new Error(stryMutAct_9fa48("32093") ? "" : (stryCov_9fa48("32093"), "StreamDataMessage is truncated"));
      }
    }
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const headerValue = view.getUint16(0, stryMutAct_9fa48("32094") ? true : (stryCov_9fa48("32094"), false));
    return stryMutAct_9fa48("32095") ? {} : (stryCov_9fa48("32095"), {
      eof: stryMutAct_9fa48("32099") ? (headerValue & STREAM_DATA_FLAG_EOF) <= 0 : stryMutAct_9fa48("32098") ? (headerValue & STREAM_DATA_FLAG_EOF) >= 0 : stryMutAct_9fa48("32097") ? false : stryMutAct_9fa48("32096") ? true : (stryCov_9fa48("32096", "32097", "32098", "32099"), (headerValue & STREAM_DATA_FLAG_EOF) > 0),
      compressed: stryMutAct_9fa48("32103") ? (headerValue & STREAM_DATA_FLAG_COMPRESSED) <= 0 : stryMutAct_9fa48("32102") ? (headerValue & STREAM_DATA_FLAG_COMPRESSED) >= 0 : stryMutAct_9fa48("32101") ? false : stryMutAct_9fa48("32100") ? true : (stryCov_9fa48("32100", "32101", "32102", "32103"), (headerValue & STREAM_DATA_FLAG_COMPRESSED) > 0),
      streamId: headerValue & STREAM_ID_MAX,
      data: raw.subarray(STREAM_DATA_HEADER_SIZE)
    });
  }
}

/**
 * StreamDataMessage pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packStreamDataMessage`
 * reads beside the step). Invalid stream ids become `reject` (helper may throw).
 */
export type PackStreamDataMessageState = Record<string, never>;
export type PackStreamDataMessageEvent = Event | {
  readonly kind: "stream-data/pack-gate";
  readonly streamId: number;
  readonly data: Uint8Array;
  readonly eof?: boolean;
  readonly compressed?: boolean;
};
export type PackStreamDataMessageAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackStreamDataMessageStepResult {
  readonly state: PackStreamDataMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackStreamDataMessageAction[];
}
export function initialPackStreamDataMessageState(): PackStreamDataMessageState {
  if (stryMutAct_9fa48("32104")) {
    {}
  } else {
    stryCov_9fa48("32104");
    return {};
  }
}
export function stepPackStreamDataMessageWithActions(state: PackStreamDataMessageState, event: PackStreamDataMessageEvent): PackStreamDataMessageStepResult {
  if (stryMutAct_9fa48("32105")) {
    {}
  } else {
    stryCov_9fa48("32105");
    if (stryMutAct_9fa48("32108") ? event.kind !== "stream-data/pack-gate" : stryMutAct_9fa48("32107") ? false : stryMutAct_9fa48("32106") ? true : (stryCov_9fa48("32106", "32107", "32108"), event.kind === (stryMutAct_9fa48("32109") ? "" : (stryCov_9fa48("32109"), "stream-data/pack-gate")))) {
      if (stryMutAct_9fa48("32110")) {
        {}
      } else {
        stryCov_9fa48("32110");
        try {
          if (stryMutAct_9fa48("32111")) {
            {}
          } else {
            stryCov_9fa48("32111");
            return stryMutAct_9fa48("32112") ? {} : (stryCov_9fa48("32112"), {
              state,
              intents: stryMutAct_9fa48("32113") ? ["Stryker was here"] : (stryCov_9fa48("32113"), []),
              actions: stryMutAct_9fa48("32114") ? [] : (stryCov_9fa48("32114"), [stryMutAct_9fa48("32115") ? {} : (stryCov_9fa48("32115"), {
                kind: stryMutAct_9fa48("32116") ? "" : (stryCov_9fa48("32116"), "use-raw"),
                raw: packStreamDataMessage(stryMutAct_9fa48("32117") ? {} : (stryCov_9fa48("32117"), {
                  streamId: event.streamId,
                  data: event.data,
                  ...((stryMutAct_9fa48("32120") ? event.eof === undefined : stryMutAct_9fa48("32119") ? false : stryMutAct_9fa48("32118") ? true : (stryCov_9fa48("32118", "32119", "32120"), event.eof !== undefined)) ? stryMutAct_9fa48("32121") ? {} : (stryCov_9fa48("32121"), {
                    eof: event.eof
                  }) : {}),
                  ...((stryMutAct_9fa48("32124") ? event.compressed === undefined : stryMutAct_9fa48("32123") ? false : stryMutAct_9fa48("32122") ? true : (stryCov_9fa48("32122", "32123", "32124"), event.compressed !== undefined)) ? stryMutAct_9fa48("32125") ? {} : (stryCov_9fa48("32125"), {
                    compressed: event.compressed
                  }) : {})
                }))
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("32126")) {
            {}
          } else {
            stryCov_9fa48("32126");
            return stryMutAct_9fa48("32127") ? {} : (stryCov_9fa48("32127"), {
              state,
              intents: stryMutAct_9fa48("32128") ? ["Stryker was here"] : (stryCov_9fa48("32128"), []),
              actions: stryMutAct_9fa48("32129") ? [] : (stryCov_9fa48("32129"), [stryMutAct_9fa48("32130") ? {} : (stryCov_9fa48("32130"), {
                kind: stryMutAct_9fa48("32131") ? "" : (stryCov_9fa48("32131"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("32132") ? {} : (stryCov_9fa48("32132"), {
      state,
      intents: stryMutAct_9fa48("32133") ? ["Stryker was here"] : (stryCov_9fa48("32133"), []),
      actions: stryMutAct_9fa48("32134") ? ["Stryker was here"] : (stryCov_9fa48("32134"), [])
    });
  }
}
export function shouldUsePackStreamDataMessage(actions: ReadonlyArray<PackStreamDataMessageAction>): boolean {
  if (stryMutAct_9fa48("32135")) {
    {}
  } else {
    stryCov_9fa48("32135");
    return stryMutAct_9fa48("32136") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("32136"), actions.some(stryMutAct_9fa48("32137") ? () => undefined : (stryCov_9fa48("32137"), action => stryMutAct_9fa48("32140") ? action.kind !== "use-raw" : stryMutAct_9fa48("32139") ? false : stryMutAct_9fa48("32138") ? true : (stryCov_9fa48("32138", "32139", "32140"), action.kind === (stryMutAct_9fa48("32141") ? "" : (stryCov_9fa48("32141"), "use-raw"))))));
  }
}
export function shouldRejectPackStreamDataMessage(actions: ReadonlyArray<PackStreamDataMessageAction>): boolean {
  if (stryMutAct_9fa48("32142")) {
    {}
  } else {
    stryCov_9fa48("32142");
    return stryMutAct_9fa48("32143") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("32143"), actions.some(stryMutAct_9fa48("32144") ? () => undefined : (stryCov_9fa48("32144"), action => stryMutAct_9fa48("32147") ? action.kind !== "reject" : stryMutAct_9fa48("32146") ? false : stryMutAct_9fa48("32145") ? true : (stryCov_9fa48("32145", "32146", "32147"), action.kind === (stryMutAct_9fa48("32148") ? "" : (stryCov_9fa48("32148"), "reject"))))));
  }
}

/** Extract packed stream-data bytes from step actions; null when no `use-raw`. */
export function packStreamDataMessageRawFromActions(actions: ReadonlyArray<PackStreamDataMessageAction>): Uint8Array | null {
  if (stryMutAct_9fa48("32149")) {
    {}
  } else {
    stryCov_9fa48("32149");
    const action = actions.find(stryMutAct_9fa48("32150") ? () => undefined : (stryCov_9fa48("32150"), entry => stryMutAct_9fa48("32153") ? entry.kind !== "use-raw" : stryMutAct_9fa48("32152") ? false : stryMutAct_9fa48("32151") ? true : (stryCov_9fa48("32151", "32152", "32153"), entry.kind === (stryMutAct_9fa48("32154") ? "" : (stryCov_9fa48("32154"), "use-raw")))));
    return (stryMutAct_9fa48("32157") ? action?.kind !== "use-raw" : stryMutAct_9fa48("32156") ? false : stryMutAct_9fa48("32155") ? true : (stryCov_9fa48("32155", "32156", "32157"), (stryMutAct_9fa48("32158") ? action.kind : (stryCov_9fa48("32158"), action?.kind)) === (stryMutAct_9fa48("32159") ? "" : (stryCov_9fa48("32159"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * StreamDataMessage unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackStreamDataMessage`
 * reads beside the step). Truncated frames become `reject` (helper may throw).
 */
export type UnpackStreamDataMessageState = Record<string, never>;
export type UnpackStreamDataMessageEvent = Event | {
  readonly kind: "stream-data/unpack-gate";
  readonly data: Uint8Array;
};
export type UnpackStreamDataMessageAction = {
  readonly kind: "use-fields";
  readonly fields: StreamDataFields;
} | {
  readonly kind: "reject";
};
export interface UnpackStreamDataMessageStepResult {
  readonly state: UnpackStreamDataMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackStreamDataMessageAction[];
}
export function initialUnpackStreamDataMessageState(): UnpackStreamDataMessageState {
  if (stryMutAct_9fa48("32160")) {
    {}
  } else {
    stryCov_9fa48("32160");
    return {};
  }
}
export function stepUnpackStreamDataMessageWithActions(state: UnpackStreamDataMessageState, event: UnpackStreamDataMessageEvent): UnpackStreamDataMessageStepResult {
  if (stryMutAct_9fa48("32161")) {
    {}
  } else {
    stryCov_9fa48("32161");
    if (stryMutAct_9fa48("32164") ? event.kind !== "stream-data/unpack-gate" : stryMutAct_9fa48("32163") ? false : stryMutAct_9fa48("32162") ? true : (stryCov_9fa48("32162", "32163", "32164"), event.kind === (stryMutAct_9fa48("32165") ? "" : (stryCov_9fa48("32165"), "stream-data/unpack-gate")))) {
      if (stryMutAct_9fa48("32166")) {
        {}
      } else {
        stryCov_9fa48("32166");
        try {
          if (stryMutAct_9fa48("32167")) {
            {}
          } else {
            stryCov_9fa48("32167");
            const fields = unpackStreamDataMessage(event.data);
            return stryMutAct_9fa48("32168") ? {} : (stryCov_9fa48("32168"), {
              state,
              intents: stryMutAct_9fa48("32169") ? ["Stryker was here"] : (stryCov_9fa48("32169"), []),
              actions: stryMutAct_9fa48("32170") ? [] : (stryCov_9fa48("32170"), [stryMutAct_9fa48("32171") ? {} : (stryCov_9fa48("32171"), {
                kind: stryMutAct_9fa48("32172") ? "" : (stryCov_9fa48("32172"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("32173")) {
            {}
          } else {
            stryCov_9fa48("32173");
            return stryMutAct_9fa48("32174") ? {} : (stryCov_9fa48("32174"), {
              state,
              intents: stryMutAct_9fa48("32175") ? ["Stryker was here"] : (stryCov_9fa48("32175"), []),
              actions: stryMutAct_9fa48("32176") ? [] : (stryCov_9fa48("32176"), [stryMutAct_9fa48("32177") ? {} : (stryCov_9fa48("32177"), {
                kind: stryMutAct_9fa48("32178") ? "" : (stryCov_9fa48("32178"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("32179") ? {} : (stryCov_9fa48("32179"), {
      state,
      intents: stryMutAct_9fa48("32180") ? ["Stryker was here"] : (stryCov_9fa48("32180"), []),
      actions: stryMutAct_9fa48("32181") ? ["Stryker was here"] : (stryCov_9fa48("32181"), [])
    });
  }
}
export function shouldUseUnpackStreamDataMessage(actions: ReadonlyArray<UnpackStreamDataMessageAction>): boolean {
  if (stryMutAct_9fa48("32182")) {
    {}
  } else {
    stryCov_9fa48("32182");
    return stryMutAct_9fa48("32183") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("32183"), actions.some(stryMutAct_9fa48("32184") ? () => undefined : (stryCov_9fa48("32184"), action => stryMutAct_9fa48("32187") ? action.kind !== "use-fields" : stryMutAct_9fa48("32186") ? false : stryMutAct_9fa48("32185") ? true : (stryCov_9fa48("32185", "32186", "32187"), action.kind === (stryMutAct_9fa48("32188") ? "" : (stryCov_9fa48("32188"), "use-fields"))))));
  }
}
export function shouldRejectUnpackStreamDataMessage(actions: ReadonlyArray<UnpackStreamDataMessageAction>): boolean {
  if (stryMutAct_9fa48("32189")) {
    {}
  } else {
    stryCov_9fa48("32189");
    return stryMutAct_9fa48("32190") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("32190"), actions.some(stryMutAct_9fa48("32191") ? () => undefined : (stryCov_9fa48("32191"), action => stryMutAct_9fa48("32194") ? action.kind !== "reject" : stryMutAct_9fa48("32193") ? false : stryMutAct_9fa48("32192") ? true : (stryCov_9fa48("32192", "32193", "32194"), action.kind === (stryMutAct_9fa48("32195") ? "" : (stryCov_9fa48("32195"), "reject"))))));
  }
}

/** Extract unpacked stream-data fields from step actions; null when no `use-fields`. */
export function streamDataMessageFieldsFromActions(actions: ReadonlyArray<UnpackStreamDataMessageAction>): StreamDataFields | null {
  if (stryMutAct_9fa48("32196")) {
    {}
  } else {
    stryCov_9fa48("32196");
    const action = actions.find(stryMutAct_9fa48("32197") ? () => undefined : (stryCov_9fa48("32197"), entry => stryMutAct_9fa48("32200") ? entry.kind !== "use-fields" : stryMutAct_9fa48("32199") ? false : stryMutAct_9fa48("32198") ? true : (stryCov_9fa48("32198", "32199", "32200"), entry.kind === (stryMutAct_9fa48("32201") ? "" : (stryCov_9fa48("32201"), "use-fields")))));
    return (stryMutAct_9fa48("32204") ? action?.kind !== "use-fields" : stryMutAct_9fa48("32203") ? false : stryMutAct_9fa48("32202") ? true : (stryCov_9fa48("32202", "32203", "32204"), (stryMutAct_9fa48("32205") ? action.kind : (stryCov_9fa48("32205"), action?.kind)) === (stryMutAct_9fa48("32206") ? "" : (stryCov_9fa48("32206"), "use-fields")))) ? action.fields : null;
  }
}

/** Clamp a write buffer to stream max data length and writer max chunk length. */
export function clampStreamDataChunkLength(length: number, maxDataLen: number, maxChunkLen: number): number {
  if (stryMutAct_9fa48("32207")) {
    {}
  } else {
    stryCov_9fa48("32207");
    return stryMutAct_9fa48("32208") ? Math.max(length, maxDataLen, maxChunkLen) : (stryCov_9fa48("32208"), Math.min(length, maxDataLen, maxChunkLen));
  }
}

/**
 * Stream write chunk-length clamp is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `clampStreamDataChunkLength`
 * reads beside the step).
 */
export type ClampStreamDataChunkLengthState = Record<string, never>;
export type ClampStreamDataChunkLengthEvent = Event | {
  readonly kind: "stream/data-chunk-length-gate";
  readonly length: number;
  readonly maxDataLen: number;
  readonly maxChunkLen: number;
};
export type ClampStreamDataChunkLengthAction = {
  readonly kind: "use-length";
  readonly length: number;
};
export interface ClampStreamDataChunkLengthStepResult {
  readonly state: ClampStreamDataChunkLengthState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClampStreamDataChunkLengthAction[];
}
export function initialClampStreamDataChunkLengthState(): ClampStreamDataChunkLengthState {
  if (stryMutAct_9fa48("32209")) {
    {}
  } else {
    stryCov_9fa48("32209");
    return {};
  }
}
export function stepClampStreamDataChunkLengthWithActions(state: ClampStreamDataChunkLengthState, event: ClampStreamDataChunkLengthEvent): ClampStreamDataChunkLengthStepResult {
  if (stryMutAct_9fa48("32210")) {
    {}
  } else {
    stryCov_9fa48("32210");
    if (stryMutAct_9fa48("32213") ? event.kind !== "stream/data-chunk-length-gate" : stryMutAct_9fa48("32212") ? false : stryMutAct_9fa48("32211") ? true : (stryCov_9fa48("32211", "32212", "32213"), event.kind === (stryMutAct_9fa48("32214") ? "" : (stryCov_9fa48("32214"), "stream/data-chunk-length-gate")))) {
      if (stryMutAct_9fa48("32215")) {
        {}
      } else {
        stryCov_9fa48("32215");
        return stryMutAct_9fa48("32216") ? {} : (stryCov_9fa48("32216"), {
          state,
          intents: stryMutAct_9fa48("32217") ? ["Stryker was here"] : (stryCov_9fa48("32217"), []),
          actions: stryMutAct_9fa48("32218") ? [] : (stryCov_9fa48("32218"), [stryMutAct_9fa48("32219") ? {} : (stryCov_9fa48("32219"), {
            kind: stryMutAct_9fa48("32220") ? "" : (stryCov_9fa48("32220"), "use-length"),
            length: clampStreamDataChunkLength(event.length, event.maxDataLen, event.maxChunkLen)
          })])
        });
      }
    }
    return stryMutAct_9fa48("32221") ? {} : (stryCov_9fa48("32221"), {
      state,
      intents: stryMutAct_9fa48("32222") ? ["Stryker was here"] : (stryCov_9fa48("32222"), []),
      actions: stryMutAct_9fa48("32223") ? ["Stryker was here"] : (stryCov_9fa48("32223"), [])
    });
  }
}
export function shouldUseStreamDataChunkLength(actions: ReadonlyArray<ClampStreamDataChunkLengthAction>): boolean {
  if (stryMutAct_9fa48("32224")) {
    {}
  } else {
    stryCov_9fa48("32224");
    return stryMutAct_9fa48("32225") ? actions.every(action => action.kind === "use-length") : (stryCov_9fa48("32225"), actions.some(stryMutAct_9fa48("32226") ? () => undefined : (stryCov_9fa48("32226"), action => stryMutAct_9fa48("32229") ? action.kind !== "use-length" : stryMutAct_9fa48("32228") ? false : stryMutAct_9fa48("32227") ? true : (stryCov_9fa48("32227", "32228", "32229"), action.kind === (stryMutAct_9fa48("32230") ? "" : (stryCov_9fa48("32230"), "use-length"))))));
  }
}

/** Extract clamped write chunk length from step actions; null when no `use-length`. */
export function streamDataChunkLengthFromActions(actions: ReadonlyArray<ClampStreamDataChunkLengthAction>): number | null {
  if (stryMutAct_9fa48("32231")) {
    {}
  } else {
    stryCov_9fa48("32231");
    const action = actions.find(stryMutAct_9fa48("32232") ? () => undefined : (stryCov_9fa48("32232"), entry => stryMutAct_9fa48("32235") ? entry.kind !== "use-length" : stryMutAct_9fa48("32234") ? false : stryMutAct_9fa48("32233") ? true : (stryCov_9fa48("32233", "32234", "32235"), entry.kind === (stryMutAct_9fa48("32236") ? "" : (stryCov_9fa48("32236"), "use-length")))));
    return (stryMutAct_9fa48("32239") ? action?.kind !== "use-length" : stryMutAct_9fa48("32238") ? false : stryMutAct_9fa48("32237") ? true : (stryCov_9fa48("32237", "32238", "32239"), (stryMutAct_9fa48("32240") ? action.kind : (stryCov_9fa48("32240"), action?.kind)) === (stryMutAct_9fa48("32241") ? "" : (stryCov_9fa48("32241"), "use-length")))) ? action.length : null;
  }
}

/** Whether inbound stream payload bytes should be appended to the reader buffer. */
export function shouldAppendStreamData(length: number): boolean {
  if (stryMutAct_9fa48("32242")) {
    {}
  } else {
    stryCov_9fa48("32242");
    return stryMutAct_9fa48("32246") ? length <= 0 : stryMutAct_9fa48("32245") ? length >= 0 : stryMutAct_9fa48("32244") ? false : stryMutAct_9fa48("32243") ? true : (stryCov_9fa48("32243", "32244", "32245", "32246"), length > 0);
  }
}

/**
 * Stream append gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAppendStreamData`
 * reads beside the step).
 */
export type AppendStreamDataState = Record<string, never>;
export type AppendStreamDataEvent = Event | {
  readonly kind: "stream/append-gate";
  readonly length: number;
};
export type AppendStreamDataAction = {
  readonly kind: "append";
} | {
  readonly kind: "skip";
};
export interface AppendStreamDataStepResult {
  readonly state: AppendStreamDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AppendStreamDataAction[];
}
export function initialAppendStreamDataState(): AppendStreamDataState {
  if (stryMutAct_9fa48("32247")) {
    {}
  } else {
    stryCov_9fa48("32247");
    return {};
  }
}
export function stepAppendStreamDataWithActions(state: AppendStreamDataState, event: AppendStreamDataEvent): AppendStreamDataStepResult {
  if (stryMutAct_9fa48("32248")) {
    {}
  } else {
    stryCov_9fa48("32248");
    if (stryMutAct_9fa48("32251") ? event.kind !== "stream/append-gate" : stryMutAct_9fa48("32250") ? false : stryMutAct_9fa48("32249") ? true : (stryCov_9fa48("32249", "32250", "32251"), event.kind === (stryMutAct_9fa48("32252") ? "" : (stryCov_9fa48("32252"), "stream/append-gate")))) {
      if (stryMutAct_9fa48("32253")) {
        {}
      } else {
        stryCov_9fa48("32253");
        return stryMutAct_9fa48("32254") ? {} : (stryCov_9fa48("32254"), {
          state,
          intents: stryMutAct_9fa48("32255") ? ["Stryker was here"] : (stryCov_9fa48("32255"), []),
          actions: stryMutAct_9fa48("32256") ? [] : (stryCov_9fa48("32256"), [stryMutAct_9fa48("32257") ? {} : (stryCov_9fa48("32257"), {
            kind: shouldAppendStreamData(event.length) ? stryMutAct_9fa48("32258") ? "" : (stryCov_9fa48("32258"), "append") : stryMutAct_9fa48("32259") ? "" : (stryCov_9fa48("32259"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32260") ? {} : (stryCov_9fa48("32260"), {
      state,
      intents: stryMutAct_9fa48("32261") ? ["Stryker was here"] : (stryCov_9fa48("32261"), []),
      actions: stryMutAct_9fa48("32262") ? ["Stryker was here"] : (stryCov_9fa48("32262"), [])
    });
  }
}
export function shouldPerformStreamAppend(actions: ReadonlyArray<AppendStreamDataAction>): boolean {
  if (stryMutAct_9fa48("32263")) {
    {}
  } else {
    stryCov_9fa48("32263");
    return stryMutAct_9fa48("32264") ? actions.every(action => action.kind === "append") : (stryCov_9fa48("32264"), actions.some(stryMutAct_9fa48("32265") ? () => undefined : (stryCov_9fa48("32265"), action => stryMutAct_9fa48("32268") ? action.kind !== "append" : stryMutAct_9fa48("32267") ? false : stryMutAct_9fa48("32266") ? true : (stryCov_9fa48("32266", "32267", "32268"), action.kind === (stryMutAct_9fa48("32269") ? "" : (stryCov_9fa48("32269"), "append"))))));
  }
}
export function shouldSkipStreamAppend(actions: ReadonlyArray<AppendStreamDataAction>): boolean {
  if (stryMutAct_9fa48("32270")) {
    {}
  } else {
    stryCov_9fa48("32270");
    return stryMutAct_9fa48("32271") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("32271"), actions.some(stryMutAct_9fa48("32272") ? () => undefined : (stryCov_9fa48("32272"), action => stryMutAct_9fa48("32275") ? action.kind !== "skip" : stryMutAct_9fa48("32274") ? false : stryMutAct_9fa48("32273") ? true : (stryCov_9fa48("32273", "32274", "32275"), action.kind === (stryMutAct_9fa48("32276") ? "" : (stryCov_9fa48("32276"), "skip"))))));
  }
}

/** Clamp a reader request size to available buffered bytes. */
export function clampStreamReadSize(size: number, bufferLength: number): number {
  if (stryMutAct_9fa48("32277")) {
    {}
  } else {
    stryCov_9fa48("32277");
    return stryMutAct_9fa48("32278") ? Math.max(size, bufferLength) : (stryCov_9fa48("32278"), Math.min(size, bufferLength));
  }
}

/**
 * Stream read-size clamp is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `clampStreamReadSize`
 * reads beside the step).
 */
export type ClampStreamReadSizeState = Record<string, never>;
export type ClampStreamReadSizeEvent = Event | {
  readonly kind: "stream/read-size-gate";
  readonly size: number;
  readonly bufferLength: number;
};
export type ClampStreamReadSizeAction = {
  readonly kind: "use-size";
  readonly size: number;
};
export interface ClampStreamReadSizeStepResult {
  readonly state: ClampStreamReadSizeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClampStreamReadSizeAction[];
}
export function initialClampStreamReadSizeState(): ClampStreamReadSizeState {
  if (stryMutAct_9fa48("32279")) {
    {}
  } else {
    stryCov_9fa48("32279");
    return {};
  }
}
export function stepClampStreamReadSizeWithActions(state: ClampStreamReadSizeState, event: ClampStreamReadSizeEvent): ClampStreamReadSizeStepResult {
  if (stryMutAct_9fa48("32280")) {
    {}
  } else {
    stryCov_9fa48("32280");
    if (stryMutAct_9fa48("32283") ? event.kind !== "stream/read-size-gate" : stryMutAct_9fa48("32282") ? false : stryMutAct_9fa48("32281") ? true : (stryCov_9fa48("32281", "32282", "32283"), event.kind === (stryMutAct_9fa48("32284") ? "" : (stryCov_9fa48("32284"), "stream/read-size-gate")))) {
      if (stryMutAct_9fa48("32285")) {
        {}
      } else {
        stryCov_9fa48("32285");
        return stryMutAct_9fa48("32286") ? {} : (stryCov_9fa48("32286"), {
          state,
          intents: stryMutAct_9fa48("32287") ? ["Stryker was here"] : (stryCov_9fa48("32287"), []),
          actions: stryMutAct_9fa48("32288") ? [] : (stryCov_9fa48("32288"), [stryMutAct_9fa48("32289") ? {} : (stryCov_9fa48("32289"), {
            kind: stryMutAct_9fa48("32290") ? "" : (stryCov_9fa48("32290"), "use-size"),
            size: clampStreamReadSize(event.size, event.bufferLength)
          })])
        });
      }
    }
    return stryMutAct_9fa48("32291") ? {} : (stryCov_9fa48("32291"), {
      state,
      intents: stryMutAct_9fa48("32292") ? ["Stryker was here"] : (stryCov_9fa48("32292"), []),
      actions: stryMutAct_9fa48("32293") ? ["Stryker was here"] : (stryCov_9fa48("32293"), [])
    });
  }
}
export function shouldUseStreamReadSize(actions: ReadonlyArray<ClampStreamReadSizeAction>): boolean {
  if (stryMutAct_9fa48("32294")) {
    {}
  } else {
    stryCov_9fa48("32294");
    return stryMutAct_9fa48("32295") ? actions.every(action => action.kind === "use-size") : (stryCov_9fa48("32295"), actions.some(stryMutAct_9fa48("32296") ? () => undefined : (stryCov_9fa48("32296"), action => stryMutAct_9fa48("32299") ? action.kind !== "use-size" : stryMutAct_9fa48("32298") ? false : stryMutAct_9fa48("32297") ? true : (stryCov_9fa48("32297", "32298", "32299"), action.kind === (stryMutAct_9fa48("32300") ? "" : (stryCov_9fa48("32300"), "use-size"))))));
  }
}

/** Extract clamped read size from step actions; null when no `use-size`. */
export function streamReadSizeFromActions(actions: ReadonlyArray<ClampStreamReadSizeAction>): number | null {
  if (stryMutAct_9fa48("32301")) {
    {}
  } else {
    stryCov_9fa48("32301");
    const action = actions.find(stryMutAct_9fa48("32302") ? () => undefined : (stryCov_9fa48("32302"), entry => stryMutAct_9fa48("32305") ? entry.kind !== "use-size" : stryMutAct_9fa48("32304") ? false : stryMutAct_9fa48("32303") ? true : (stryCov_9fa48("32303", "32304", "32305"), entry.kind === (stryMutAct_9fa48("32306") ? "" : (stryCov_9fa48("32306"), "use-size")))));
    return (stryMutAct_9fa48("32309") ? action?.kind !== "use-size" : stryMutAct_9fa48("32308") ? false : stryMutAct_9fa48("32307") ? true : (stryCov_9fa48("32307", "32308", "32309"), (stryMutAct_9fa48("32310") ? action.kind : (stryCov_9fa48("32310"), action?.kind)) === (stryMutAct_9fa48("32311") ? "" : (stryCov_9fa48("32311"), "use-size")))) ? action.size : null;
  }
}

/** Whether a read should wait for more data (empty buffer before EOF). */
export function shouldDeferStreamRead(bufferLength: number, eof: boolean): boolean {
  if (stryMutAct_9fa48("32312")) {
    {}
  } else {
    stryCov_9fa48("32312");
    return stryMutAct_9fa48("32315") ? bufferLength === 0 || !eof : stryMutAct_9fa48("32314") ? false : stryMutAct_9fa48("32313") ? true : (stryCov_9fa48("32313", "32314", "32315"), (stryMutAct_9fa48("32317") ? bufferLength !== 0 : stryMutAct_9fa48("32316") ? true : (stryCov_9fa48("32316", "32317"), bufferLength === 0)) && (stryMutAct_9fa48("32318") ? eof : (stryCov_9fa48("32318"), !eof)));
  }
}

/**
 * Stream read-defer gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldDeferStreamRead`
 * reads beside the step).
 */
export type StreamReadDeferState = Record<string, never>;