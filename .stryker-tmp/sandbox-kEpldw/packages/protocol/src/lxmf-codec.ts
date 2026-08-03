/**
 * Pure LXMF msgpack payload codecs built on msgpack-core.
 * Pack / unpack conclusions leave via machine actions (no ad-hoc
 * `packLxmPayload` / `unpackLxmPayload` / `packPropagationRequest` /
 * `unpackPropagationRequest` / `packPropagationEnvelope` /
 * `unpackPropagationEnvelope` / `unpackBinList` reads beside the step).
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
import { msgpackPackArray, msgpackPackBin, msgpackPackFloat64, msgpackPackIntMap, msgpackPackNil, msgpackUnpack, type MsgpackValue } from "./msgpack-core.js";
export type LxmFields = Readonly<Record<number, Uint8Array>>;
export function packLxmFields(fields: LxmFields): Uint8Array {
  if (stryMutAct_9fa48("18424")) {
    {}
  } else {
    stryCov_9fa48("18424");
    const entries = Object.entries(fields).map(stryMutAct_9fa48("18425") ? () => undefined : (stryCov_9fa48("18425"), ([key, value]) => [Number.parseInt(key, 10), value] as [number, Uint8Array]));
    return msgpackPackIntMap(entries);
  }
}
export function packLxmPayload(timestamp: number, title: Uint8Array, content: Uint8Array, fields: LxmFields, stamp?: Uint8Array | null): Uint8Array {
  if (stryMutAct_9fa48("18426")) {
    {}
  } else {
    stryCov_9fa48("18426");
    const items = stryMutAct_9fa48("18427") ? [] : (stryCov_9fa48("18427"), [msgpackPackFloat64(timestamp), msgpackPackBin(title), msgpackPackBin(content), packLxmFields(fields)]);
    if (stryMutAct_9fa48("18430") ? stamp !== undefined || stamp !== null : stryMutAct_9fa48("18429") ? false : stryMutAct_9fa48("18428") ? true : (stryCov_9fa48("18428", "18429", "18430"), (stryMutAct_9fa48("18432") ? stamp === undefined : stryMutAct_9fa48("18431") ? true : (stryCov_9fa48("18431", "18432"), stamp !== undefined)) && (stryMutAct_9fa48("18434") ? stamp === null : stryMutAct_9fa48("18433") ? true : (stryCov_9fa48("18433", "18434"), stamp !== null)))) {
      if (stryMutAct_9fa48("18435")) {
        {}
      } else {
        stryCov_9fa48("18435");
        items.push(msgpackPackBin(stamp));
      }
    }
    return msgpackPackArray(items);
  }
}
export interface UnpackedLxmPayload {
  readonly timestamp: number;
  readonly title: Uint8Array;
  readonly content: Uint8Array;
  readonly fields: LxmFields;
  readonly stamp: Uint8Array | null;
}
export function unpackLxmPayload(bytes: Uint8Array): UnpackedLxmPayload {
  if (stryMutAct_9fa48("18436")) {
    {}
  } else {
    stryCov_9fa48("18436");
    const value = msgpackUnpack(bytes);
    if (stryMutAct_9fa48("18439") ? value.type !== "array" && value.array.length < 4 : stryMutAct_9fa48("18438") ? false : stryMutAct_9fa48("18437") ? true : (stryCov_9fa48("18437", "18438", "18439"), (stryMutAct_9fa48("18441") ? value.type === "array" : stryMutAct_9fa48("18440") ? false : (stryCov_9fa48("18440", "18441"), value.type !== (stryMutAct_9fa48("18442") ? "" : (stryCov_9fa48("18442"), "array")))) || (stryMutAct_9fa48("18445") ? value.array.length >= 4 : stryMutAct_9fa48("18444") ? value.array.length <= 4 : stryMutAct_9fa48("18443") ? false : (stryCov_9fa48("18443", "18444", "18445"), value.array.length < 4)))) {
      if (stryMutAct_9fa48("18446")) {
        {}
      } else {
        stryCov_9fa48("18446");
        throw new Error(stryMutAct_9fa48("18447") ? "" : (stryCov_9fa48("18447"), "Invalid LXMF payload"));
      }
    }
    const [timestampValue, titleValue, contentValue, fieldsValue, stampValue] = value.array;
    if (stryMutAct_9fa48("18450") ? (timestampValue === undefined || titleValue === undefined || contentValue === undefined || fieldsValue === undefined || timestampValue.type !== "float" || titleValue.type !== "bin" || contentValue.type !== "bin") && fieldsValue.type !== "map" : stryMutAct_9fa48("18449") ? false : stryMutAct_9fa48("18448") ? true : (stryCov_9fa48("18448", "18449", "18450"), (stryMutAct_9fa48("18452") ? (timestampValue === undefined || titleValue === undefined || contentValue === undefined || fieldsValue === undefined || timestampValue.type !== "float" || titleValue.type !== "bin") && contentValue.type !== "bin" : stryMutAct_9fa48("18451") ? false : (stryCov_9fa48("18451", "18452"), (stryMutAct_9fa48("18454") ? (timestampValue === undefined || titleValue === undefined || contentValue === undefined || fieldsValue === undefined || timestampValue.type !== "float") && titleValue.type !== "bin" : stryMutAct_9fa48("18453") ? false : (stryCov_9fa48("18453", "18454"), (stryMutAct_9fa48("18456") ? (timestampValue === undefined || titleValue === undefined || contentValue === undefined || fieldsValue === undefined) && timestampValue.type !== "float" : stryMutAct_9fa48("18455") ? false : (stryCov_9fa48("18455", "18456"), (stryMutAct_9fa48("18458") ? (timestampValue === undefined || titleValue === undefined || contentValue === undefined) && fieldsValue === undefined : stryMutAct_9fa48("18457") ? false : (stryCov_9fa48("18457", "18458"), (stryMutAct_9fa48("18460") ? (timestampValue === undefined || titleValue === undefined) && contentValue === undefined : stryMutAct_9fa48("18459") ? false : (stryCov_9fa48("18459", "18460"), (stryMutAct_9fa48("18462") ? timestampValue === undefined && titleValue === undefined : stryMutAct_9fa48("18461") ? false : (stryCov_9fa48("18461", "18462"), (stryMutAct_9fa48("18464") ? timestampValue !== undefined : stryMutAct_9fa48("18463") ? false : (stryCov_9fa48("18463", "18464"), timestampValue === undefined)) || (stryMutAct_9fa48("18466") ? titleValue !== undefined : stryMutAct_9fa48("18465") ? false : (stryCov_9fa48("18465", "18466"), titleValue === undefined)))) || (stryMutAct_9fa48("18468") ? contentValue !== undefined : stryMutAct_9fa48("18467") ? false : (stryCov_9fa48("18467", "18468"), contentValue === undefined)))) || (stryMutAct_9fa48("18470") ? fieldsValue !== undefined : stryMutAct_9fa48("18469") ? false : (stryCov_9fa48("18469", "18470"), fieldsValue === undefined)))) || (stryMutAct_9fa48("18472") ? timestampValue.type === "float" : stryMutAct_9fa48("18471") ? false : (stryCov_9fa48("18471", "18472"), timestampValue.type !== (stryMutAct_9fa48("18473") ? "" : (stryCov_9fa48("18473"), "float")))))) || (stryMutAct_9fa48("18475") ? titleValue.type === "bin" : stryMutAct_9fa48("18474") ? false : (stryCov_9fa48("18474", "18475"), titleValue.type !== (stryMutAct_9fa48("18476") ? "" : (stryCov_9fa48("18476"), "bin")))))) || (stryMutAct_9fa48("18478") ? contentValue.type === "bin" : stryMutAct_9fa48("18477") ? false : (stryCov_9fa48("18477", "18478"), contentValue.type !== (stryMutAct_9fa48("18479") ? "" : (stryCov_9fa48("18479"), "bin")))))) || (stryMutAct_9fa48("18481") ? fieldsValue.type === "map" : stryMutAct_9fa48("18480") ? false : (stryCov_9fa48("18480", "18481"), fieldsValue.type !== (stryMutAct_9fa48("18482") ? "" : (stryCov_9fa48("18482"), "map")))))) {
      if (stryMutAct_9fa48("18483")) {
        {}
      } else {
        stryCov_9fa48("18483");
        throw new Error(stryMutAct_9fa48("18484") ? "" : (stryCov_9fa48("18484"), "Invalid LXMF payload fields"));
      }
    }
    const fields: Record<number, Uint8Array> = {};
    for (const [key, entryValue] of fieldsValue.map) {
      if (stryMutAct_9fa48("18485")) {
        {}
      } else {
        stryCov_9fa48("18485");
        if (stryMutAct_9fa48("18488") ? entryValue.type !== "bin" : stryMutAct_9fa48("18487") ? false : stryMutAct_9fa48("18486") ? true : (stryCov_9fa48("18486", "18487", "18488"), entryValue.type === (stryMutAct_9fa48("18489") ? "" : (stryCov_9fa48("18489"), "bin")))) {
          if (stryMutAct_9fa48("18490")) {
            {}
          } else {
            stryCov_9fa48("18490");
            fields[key] = Uint8Array.from(entryValue.bin);
          }
        }
      }
    }
    const stamp = (stryMutAct_9fa48("18493") ? stampValue === undefined && stampValue.type === "nil" : stryMutAct_9fa48("18492") ? false : stryMutAct_9fa48("18491") ? true : (stryCov_9fa48("18491", "18492", "18493"), (stryMutAct_9fa48("18495") ? stampValue !== undefined : stryMutAct_9fa48("18494") ? false : (stryCov_9fa48("18494", "18495"), stampValue === undefined)) || (stryMutAct_9fa48("18497") ? stampValue.type !== "nil" : stryMutAct_9fa48("18496") ? false : (stryCov_9fa48("18496", "18497"), stampValue.type === (stryMutAct_9fa48("18498") ? "" : (stryCov_9fa48("18498"), "nil")))))) ? null : (stryMutAct_9fa48("18501") ? stampValue.type !== "bin" : stryMutAct_9fa48("18500") ? false : stryMutAct_9fa48("18499") ? true : (stryCov_9fa48("18499", "18500", "18501"), stampValue.type === (stryMutAct_9fa48("18502") ? "" : (stryCov_9fa48("18502"), "bin")))) ? Uint8Array.from(stampValue.bin) : null;
    return stryMutAct_9fa48("18503") ? {} : (stryCov_9fa48("18503"), {
      timestamp: timestampValue.float,
      title: Uint8Array.from(titleValue.bin),
      content: Uint8Array.from(contentValue.bin),
      fields,
      stamp
    });
  }
}
export function packPropagationRequest(wants: ReadonlyArray<Uint8Array> | null, haves: ReadonlyArray<Uint8Array> | null, transferLimitKb?: number | null): Uint8Array {
  if (stryMutAct_9fa48("18504")) {
    {}
  } else {
    stryCov_9fa48("18504");
    const items = stryMutAct_9fa48("18505") ? [] : (stryCov_9fa48("18505"), [(stryMutAct_9fa48("18508") ? wants !== null : stryMutAct_9fa48("18507") ? false : stryMutAct_9fa48("18506") ? true : (stryCov_9fa48("18506", "18507", "18508"), wants === null)) ? msgpackPackNil() : msgpackPackArray(wants.map(stryMutAct_9fa48("18509") ? () => undefined : (stryCov_9fa48("18509"), entry => msgpackPackBin(entry)))), (stryMutAct_9fa48("18512") ? haves !== null : stryMutAct_9fa48("18511") ? false : stryMutAct_9fa48("18510") ? true : (stryCov_9fa48("18510", "18511", "18512"), haves === null)) ? msgpackPackNil() : msgpackPackArray(haves.map(stryMutAct_9fa48("18513") ? () => undefined : (stryCov_9fa48("18513"), entry => msgpackPackBin(entry))))]);
    if (stryMutAct_9fa48("18516") ? transferLimitKb !== undefined || transferLimitKb !== null : stryMutAct_9fa48("18515") ? false : stryMutAct_9fa48("18514") ? true : (stryCov_9fa48("18514", "18515", "18516"), (stryMutAct_9fa48("18518") ? transferLimitKb === undefined : stryMutAct_9fa48("18517") ? true : (stryCov_9fa48("18517", "18518"), transferLimitKb !== undefined)) && (stryMutAct_9fa48("18520") ? transferLimitKb === null : stryMutAct_9fa48("18519") ? true : (stryCov_9fa48("18519", "18520"), transferLimitKb !== null)))) {
      if (stryMutAct_9fa48("18521")) {
        {}
      } else {
        stryCov_9fa48("18521");
        items.push(msgpackPackFloat64(transferLimitKb));
      }
    }
    return msgpackPackArray(items);
  }
}
export interface UnpackedPropagationRequest {
  readonly wants: ReadonlyArray<Uint8Array> | null;
  readonly haves: ReadonlyArray<Uint8Array> | null;
  readonly transferLimitKb: number | null;
}
export function unpackPropagationRequest(bytes: Uint8Array): [ReadonlyArray<Uint8Array> | null, ReadonlyArray<Uint8Array> | null, number | null] {
  if (stryMutAct_9fa48("18522")) {
    {}
  } else {
    stryCov_9fa48("18522");
    const fields = unpackPropagationRequestFields(bytes);
    return stryMutAct_9fa48("18523") ? [] : (stryCov_9fa48("18523"), [fields.wants, fields.haves, fields.transferLimitKb]);
  }
}
export function unpackPropagationRequestFields(bytes: Uint8Array): UnpackedPropagationRequest {
  if (stryMutAct_9fa48("18524")) {
    {}
  } else {
    stryCov_9fa48("18524");
    const value = msgpackUnpack(bytes);
    if (stryMutAct_9fa48("18527") ? value.type !== "array" && value.array.length < 2 : stryMutAct_9fa48("18526") ? false : stryMutAct_9fa48("18525") ? true : (stryCov_9fa48("18525", "18526", "18527"), (stryMutAct_9fa48("18529") ? value.type === "array" : stryMutAct_9fa48("18528") ? false : (stryCov_9fa48("18528", "18529"), value.type !== (stryMutAct_9fa48("18530") ? "" : (stryCov_9fa48("18530"), "array")))) || (stryMutAct_9fa48("18533") ? value.array.length >= 2 : stryMutAct_9fa48("18532") ? value.array.length <= 2 : stryMutAct_9fa48("18531") ? false : (stryCov_9fa48("18531", "18532", "18533"), value.array.length < 2)))) {
      if (stryMutAct_9fa48("18534")) {
        {}
      } else {
        stryCov_9fa48("18534");
        throw new Error(stryMutAct_9fa48("18535") ? "" : (stryCov_9fa48("18535"), "Invalid propagation request payload"));
      }
    }
    const [wantsValue, havesValue, limitValue] = value.array;
    const decodeList = (entry: MsgpackValue | undefined): ReadonlyArray<Uint8Array> | null => {
      if (stryMutAct_9fa48("18536")) {
        {}
      } else {
        stryCov_9fa48("18536");
        if (stryMutAct_9fa48("18539") ? entry === undefined && entry.type === "nil" : stryMutAct_9fa48("18538") ? false : stryMutAct_9fa48("18537") ? true : (stryCov_9fa48("18537", "18538", "18539"), (stryMutAct_9fa48("18541") ? entry !== undefined : stryMutAct_9fa48("18540") ? false : (stryCov_9fa48("18540", "18541"), entry === undefined)) || (stryMutAct_9fa48("18543") ? entry.type !== "nil" : stryMutAct_9fa48("18542") ? false : (stryCov_9fa48("18542", "18543"), entry.type === (stryMutAct_9fa48("18544") ? "" : (stryCov_9fa48("18544"), "nil")))))) {
          if (stryMutAct_9fa48("18545")) {
            {}
          } else {
            stryCov_9fa48("18545");
            return null;
          }
        }
        if (stryMutAct_9fa48("18548") ? entry.type === "array" : stryMutAct_9fa48("18547") ? false : stryMutAct_9fa48("18546") ? true : (stryCov_9fa48("18546", "18547", "18548"), entry.type !== (stryMutAct_9fa48("18549") ? "" : (stryCov_9fa48("18549"), "array")))) {
          if (stryMutAct_9fa48("18550")) {
            {}
          } else {
            stryCov_9fa48("18550");
            throw new Error(stryMutAct_9fa48("18551") ? "" : (stryCov_9fa48("18551"), "Invalid propagation request list"));
          }
        }
        return entry.array.map(item => {
          if (stryMutAct_9fa48("18552")) {
            {}
          } else {
            stryCov_9fa48("18552");
            if (stryMutAct_9fa48("18555") ? item.type === "bin" : stryMutAct_9fa48("18554") ? false : stryMutAct_9fa48("18553") ? true : (stryCov_9fa48("18553", "18554", "18555"), item.type !== (stryMutAct_9fa48("18556") ? "" : (stryCov_9fa48("18556"), "bin")))) {
              if (stryMutAct_9fa48("18557")) {
                {}
              } else {
                stryCov_9fa48("18557");
                throw new Error(stryMutAct_9fa48("18558") ? "" : (stryCov_9fa48("18558"), "Invalid propagation request list entry"));
              }
            }
            return Uint8Array.from(item.bin);
          }
        });
      }
    };
    const transferLimitKb = (stryMutAct_9fa48("18561") ? limitValue === undefined && limitValue.type === "nil" : stryMutAct_9fa48("18560") ? false : stryMutAct_9fa48("18559") ? true : (stryCov_9fa48("18559", "18560", "18561"), (stryMutAct_9fa48("18563") ? limitValue !== undefined : stryMutAct_9fa48("18562") ? false : (stryCov_9fa48("18562", "18563"), limitValue === undefined)) || (stryMutAct_9fa48("18565") ? limitValue.type !== "nil" : stryMutAct_9fa48("18564") ? false : (stryCov_9fa48("18564", "18565"), limitValue.type === (stryMutAct_9fa48("18566") ? "" : (stryCov_9fa48("18566"), "nil")))))) ? null : (stryMutAct_9fa48("18569") ? limitValue.type !== "float" : stryMutAct_9fa48("18568") ? false : stryMutAct_9fa48("18567") ? true : (stryCov_9fa48("18567", "18568", "18569"), limitValue.type === (stryMutAct_9fa48("18570") ? "" : (stryCov_9fa48("18570"), "float")))) ? limitValue.float : null;
    return stryMutAct_9fa48("18571") ? {} : (stryCov_9fa48("18571"), {
      wants: decodeList(wantsValue),
      haves: decodeList(havesValue),
      transferLimitKb
    });
  }
}
export function packPropagationEnvelope(timestamp: number, messages: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("18572")) {
    {}
  } else {
    stryCov_9fa48("18572");
    return msgpackPackArray(stryMutAct_9fa48("18573") ? [] : (stryCov_9fa48("18573"), [msgpackPackFloat64(timestamp), msgpackPackArray(messages.map(stryMutAct_9fa48("18574") ? () => undefined : (stryCov_9fa48("18574"), message => msgpackPackBin(message))))]));
  }
}
export interface UnpackedPropagationEnvelope {
  readonly messages: ReadonlyArray<Uint8Array>;
}
export function unpackPropagationEnvelope(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
  if (stryMutAct_9fa48("18575")) {
    {}
  } else {
    stryCov_9fa48("18575");
    return unpackPropagationEnvelopeFields(bytes).messages;
  }
}
export function unpackPropagationEnvelopeFields(bytes: Uint8Array): UnpackedPropagationEnvelope {
  if (stryMutAct_9fa48("18576")) {
    {}
  } else {
    stryCov_9fa48("18576");
    const value = msgpackUnpack(bytes);
    if (stryMutAct_9fa48("18579") ? value.type !== "array" && value.array.length !== 2 : stryMutAct_9fa48("18578") ? false : stryMutAct_9fa48("18577") ? true : (stryCov_9fa48("18577", "18578", "18579"), (stryMutAct_9fa48("18581") ? value.type === "array" : stryMutAct_9fa48("18580") ? false : (stryCov_9fa48("18580", "18581"), value.type !== (stryMutAct_9fa48("18582") ? "" : (stryCov_9fa48("18582"), "array")))) || (stryMutAct_9fa48("18584") ? value.array.length === 2 : stryMutAct_9fa48("18583") ? false : (stryCov_9fa48("18583", "18584"), value.array.length !== 2)))) {
      if (stryMutAct_9fa48("18585")) {
        {}
      } else {
        stryCov_9fa48("18585");
        throw new Error(stryMutAct_9fa48("18586") ? "" : (stryCov_9fa48("18586"), "Invalid propagation envelope"));
      }
    }
    const messagesValue = value.array[1];
    if (stryMutAct_9fa48("18589") ? messagesValue === undefined && messagesValue.type !== "array" : stryMutAct_9fa48("18588") ? false : stryMutAct_9fa48("18587") ? true : (stryCov_9fa48("18587", "18588", "18589"), (stryMutAct_9fa48("18591") ? messagesValue !== undefined : stryMutAct_9fa48("18590") ? false : (stryCov_9fa48("18590", "18591"), messagesValue === undefined)) || (stryMutAct_9fa48("18593") ? messagesValue.type === "array" : stryMutAct_9fa48("18592") ? false : (stryCov_9fa48("18592", "18593"), messagesValue.type !== (stryMutAct_9fa48("18594") ? "" : (stryCov_9fa48("18594"), "array")))))) {
      if (stryMutAct_9fa48("18595")) {
        {}
      } else {
        stryCov_9fa48("18595");
        throw new Error(stryMutAct_9fa48("18596") ? "" : (stryCov_9fa48("18596"), "Invalid propagation envelope messages"));
      }
    }
    return stryMutAct_9fa48("18597") ? {} : (stryCov_9fa48("18597"), {
      messages: messagesValue.array.map(item => {
        if (stryMutAct_9fa48("18598")) {
          {}
        } else {
          stryCov_9fa48("18598");
          if (stryMutAct_9fa48("18601") ? item.type === "bin" : stryMutAct_9fa48("18600") ? false : stryMutAct_9fa48("18599") ? true : (stryCov_9fa48("18599", "18600", "18601"), item.type !== (stryMutAct_9fa48("18602") ? "" : (stryCov_9fa48("18602"), "bin")))) {
            if (stryMutAct_9fa48("18603")) {
              {}
            } else {
              stryCov_9fa48("18603");
              throw new Error(stryMutAct_9fa48("18604") ? "" : (stryCov_9fa48("18604"), "Invalid propagation envelope message"));
            }
          }
          return Uint8Array.from(item.bin);
        }
      })
    });
  }
}
export interface UnpackedBinList {
  readonly entries: ReadonlyArray<Uint8Array>;
}
export function unpackBinList(bytes: Uint8Array, label: string): ReadonlyArray<Uint8Array> {
  if (stryMutAct_9fa48("18605")) {
    {}
  } else {
    stryCov_9fa48("18605");
    return unpackBinListFields(bytes, label).entries;
  }
}
export function unpackBinListFields(bytes: Uint8Array, label: string): UnpackedBinList {
  if (stryMutAct_9fa48("18606")) {
    {}
  } else {
    stryCov_9fa48("18606");
    const value = msgpackUnpack(bytes);
    if (stryMutAct_9fa48("18609") ? value.type !== "int" : stryMutAct_9fa48("18608") ? false : stryMutAct_9fa48("18607") ? true : (stryCov_9fa48("18607", "18608", "18609"), value.type === (stryMutAct_9fa48("18610") ? "" : (stryCov_9fa48("18610"), "int")))) {
      if (stryMutAct_9fa48("18611")) {
        {}
      } else {
        stryCov_9fa48("18611");
        throw new Error(stryMutAct_9fa48("18612") ? `` : (stryCov_9fa48("18612"), `${label} returned an error code`));
      }
    }
    if (stryMutAct_9fa48("18615") ? value.type === "array" : stryMutAct_9fa48("18614") ? false : stryMutAct_9fa48("18613") ? true : (stryCov_9fa48("18613", "18614", "18615"), value.type !== (stryMutAct_9fa48("18616") ? "" : (stryCov_9fa48("18616"), "array")))) {
      if (stryMutAct_9fa48("18617")) {
        {}
      } else {
        stryCov_9fa48("18617");
        throw new Error(stryMutAct_9fa48("18618") ? `` : (stryCov_9fa48("18618"), `Invalid ${label}`));
      }
    }
    return stryMutAct_9fa48("18619") ? {} : (stryCov_9fa48("18619"), {
      entries: value.array.map(item => {
        if (stryMutAct_9fa48("18620")) {
          {}
        } else {
          stryCov_9fa48("18620");
          if (stryMutAct_9fa48("18623") ? item.type === "bin" : stryMutAct_9fa48("18622") ? false : stryMutAct_9fa48("18621") ? true : (stryCov_9fa48("18621", "18622", "18623"), item.type !== (stryMutAct_9fa48("18624") ? "" : (stryCov_9fa48("18624"), "bin")))) {
            if (stryMutAct_9fa48("18625")) {
              {}
            } else {
              stryCov_9fa48("18625");
              throw new Error(stryMutAct_9fa48("18626") ? `` : (stryCov_9fa48("18626"), `Invalid ${label} entry`));
            }
          }
          return Uint8Array.from(item.bin);
        }
      })
    });
  }
}

/**
 * LXM payload pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLxmPayload` reads
 * beside the step).
 */
export type PackLxmPayloadState = Record<string, never>;
export type PackLxmPayloadEvent = Event | {
  readonly kind: "lxmf-codec/pack-payload-gate";
  readonly timestamp: number;
  readonly title: Uint8Array;
  readonly content: Uint8Array;
  readonly fields: LxmFields;
  readonly stamp?: Uint8Array | null;
};
export type PackLxmPayloadAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackLxmPayloadStepResult {
  readonly state: PackLxmPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLxmPayloadAction[];
}
export function initialPackLxmPayloadState(): PackLxmPayloadState {
  if (stryMutAct_9fa48("18627")) {
    {}
  } else {
    stryCov_9fa48("18627");
    return {};
  }
}
export function stepPackLxmPayloadWithActions(state: PackLxmPayloadState, event: PackLxmPayloadEvent): PackLxmPayloadStepResult {
  if (stryMutAct_9fa48("18628")) {
    {}
  } else {
    stryCov_9fa48("18628");
    if (stryMutAct_9fa48("18631") ? event.kind !== "lxmf-codec/pack-payload-gate" : stryMutAct_9fa48("18630") ? false : stryMutAct_9fa48("18629") ? true : (stryCov_9fa48("18629", "18630", "18631"), event.kind === (stryMutAct_9fa48("18632") ? "" : (stryCov_9fa48("18632"), "lxmf-codec/pack-payload-gate")))) {
      if (stryMutAct_9fa48("18633")) {
        {}
      } else {
        stryCov_9fa48("18633");
        return stryMutAct_9fa48("18634") ? {} : (stryCov_9fa48("18634"), {
          state,
          intents: stryMutAct_9fa48("18635") ? ["Stryker was here"] : (stryCov_9fa48("18635"), []),
          actions: stryMutAct_9fa48("18636") ? [] : (stryCov_9fa48("18636"), [stryMutAct_9fa48("18637") ? {} : (stryCov_9fa48("18637"), {
            kind: stryMutAct_9fa48("18638") ? "" : (stryCov_9fa48("18638"), "use-raw"),
            raw: packLxmPayload(event.timestamp, event.title, event.content, event.fields, event.stamp)
          })])
        });
      }
    }
    return stryMutAct_9fa48("18639") ? {} : (stryCov_9fa48("18639"), {
      state,
      intents: stryMutAct_9fa48("18640") ? ["Stryker was here"] : (stryCov_9fa48("18640"), []),
      actions: stryMutAct_9fa48("18641") ? ["Stryker was here"] : (stryCov_9fa48("18641"), [])
    });
  }
}
export function shouldUsePackLxmPayload(actions: ReadonlyArray<PackLxmPayloadAction>): boolean {
  if (stryMutAct_9fa48("18642")) {
    {}
  } else {
    stryCov_9fa48("18642");
    return stryMutAct_9fa48("18643") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("18643"), actions.some(stryMutAct_9fa48("18644") ? () => undefined : (stryCov_9fa48("18644"), action => stryMutAct_9fa48("18647") ? action.kind !== "use-raw" : stryMutAct_9fa48("18646") ? false : stryMutAct_9fa48("18645") ? true : (stryCov_9fa48("18645", "18646", "18647"), action.kind === (stryMutAct_9fa48("18648") ? "" : (stryCov_9fa48("18648"), "use-raw"))))));
  }
}

/** Extract LXM payload pack bytes from step actions; null when no `use-raw`. */
export function packLxmPayloadRawFromActions(actions: ReadonlyArray<PackLxmPayloadAction>): Uint8Array | null {
  if (stryMutAct_9fa48("18649")) {
    {}
  } else {
    stryCov_9fa48("18649");
    const action = actions.find(stryMutAct_9fa48("18650") ? () => undefined : (stryCov_9fa48("18650"), entry => stryMutAct_9fa48("18653") ? entry.kind !== "use-raw" : stryMutAct_9fa48("18652") ? false : stryMutAct_9fa48("18651") ? true : (stryCov_9fa48("18651", "18652", "18653"), entry.kind === (stryMutAct_9fa48("18654") ? "" : (stryCov_9fa48("18654"), "use-raw")))));
    return (stryMutAct_9fa48("18657") ? action?.kind !== "use-raw" : stryMutAct_9fa48("18656") ? false : stryMutAct_9fa48("18655") ? true : (stryCov_9fa48("18655", "18656", "18657"), (stryMutAct_9fa48("18658") ? action.kind : (stryCov_9fa48("18658"), action?.kind)) === (stryMutAct_9fa48("18659") ? "" : (stryCov_9fa48("18659"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * LXM payload unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackLxmPayload` reads
 * beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackLxmPayloadState = Record<string, never>;
export type UnpackLxmPayloadEvent = Event | {
  readonly kind: "lxmf-codec/unpack-payload-gate";
  readonly data: Uint8Array;
};
export type UnpackLxmPayloadAction = {
  readonly kind: "use-fields";
  readonly fields: UnpackedLxmPayload;
} | {
  readonly kind: "reject";
};
export interface UnpackLxmPayloadStepResult {
  readonly state: UnpackLxmPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLxmPayloadAction[];
}
export function initialUnpackLxmPayloadState(): UnpackLxmPayloadState {
  if (stryMutAct_9fa48("18660")) {
    {}
  } else {
    stryCov_9fa48("18660");
    return {};
  }
}
export function stepUnpackLxmPayloadWithActions(state: UnpackLxmPayloadState, event: UnpackLxmPayloadEvent): UnpackLxmPayloadStepResult {
  if (stryMutAct_9fa48("18661")) {
    {}
  } else {
    stryCov_9fa48("18661");
    if (stryMutAct_9fa48("18664") ? event.kind !== "lxmf-codec/unpack-payload-gate" : stryMutAct_9fa48("18663") ? false : stryMutAct_9fa48("18662") ? true : (stryCov_9fa48("18662", "18663", "18664"), event.kind === (stryMutAct_9fa48("18665") ? "" : (stryCov_9fa48("18665"), "lxmf-codec/unpack-payload-gate")))) {
      if (stryMutAct_9fa48("18666")) {
        {}
      } else {
        stryCov_9fa48("18666");
        try {
          if (stryMutAct_9fa48("18667")) {
            {}
          } else {
            stryCov_9fa48("18667");
            const fields = unpackLxmPayload(event.data);
            return stryMutAct_9fa48("18668") ? {} : (stryCov_9fa48("18668"), {
              state,
              intents: stryMutAct_9fa48("18669") ? ["Stryker was here"] : (stryCov_9fa48("18669"), []),
              actions: stryMutAct_9fa48("18670") ? [] : (stryCov_9fa48("18670"), [stryMutAct_9fa48("18671") ? {} : (stryCov_9fa48("18671"), {
                kind: stryMutAct_9fa48("18672") ? "" : (stryCov_9fa48("18672"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("18673")) {
            {}
          } else {
            stryCov_9fa48("18673");
            return stryMutAct_9fa48("18674") ? {} : (stryCov_9fa48("18674"), {
              state,
              intents: stryMutAct_9fa48("18675") ? ["Stryker was here"] : (stryCov_9fa48("18675"), []),
              actions: stryMutAct_9fa48("18676") ? [] : (stryCov_9fa48("18676"), [stryMutAct_9fa48("18677") ? {} : (stryCov_9fa48("18677"), {
                kind: stryMutAct_9fa48("18678") ? "" : (stryCov_9fa48("18678"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("18679") ? {} : (stryCov_9fa48("18679"), {
      state,
      intents: stryMutAct_9fa48("18680") ? ["Stryker was here"] : (stryCov_9fa48("18680"), []),
      actions: stryMutAct_9fa48("18681") ? ["Stryker was here"] : (stryCov_9fa48("18681"), [])
    });
  }
}
export function shouldUseUnpackLxmPayload(actions: ReadonlyArray<UnpackLxmPayloadAction>): boolean {
  if (stryMutAct_9fa48("18682")) {
    {}
  } else {
    stryCov_9fa48("18682");
    return stryMutAct_9fa48("18683") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("18683"), actions.some(stryMutAct_9fa48("18684") ? () => undefined : (stryCov_9fa48("18684"), action => stryMutAct_9fa48("18687") ? action.kind !== "use-fields" : stryMutAct_9fa48("18686") ? false : stryMutAct_9fa48("18685") ? true : (stryCov_9fa48("18685", "18686", "18687"), action.kind === (stryMutAct_9fa48("18688") ? "" : (stryCov_9fa48("18688"), "use-fields"))))));
  }
}
export function shouldRejectUnpackLxmPayload(actions: ReadonlyArray<UnpackLxmPayloadAction>): boolean {
  if (stryMutAct_9fa48("18689")) {
    {}
  } else {
    stryCov_9fa48("18689");
    return stryMutAct_9fa48("18690") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("18690"), actions.some(stryMutAct_9fa48("18691") ? () => undefined : (stryCov_9fa48("18691"), action => stryMutAct_9fa48("18694") ? action.kind !== "reject" : stryMutAct_9fa48("18693") ? false : stryMutAct_9fa48("18692") ? true : (stryCov_9fa48("18692", "18693", "18694"), action.kind === (stryMutAct_9fa48("18695") ? "" : (stryCov_9fa48("18695"), "reject"))))));
  }
}

/** Extract unpacked LXM payload from step actions; null when no `use-fields`. */
export function lxmPayloadFieldsFromActions(actions: ReadonlyArray<UnpackLxmPayloadAction>): UnpackedLxmPayload | null {
  if (stryMutAct_9fa48("18696")) {
    {}
  } else {
    stryCov_9fa48("18696");
    const action = actions.find(stryMutAct_9fa48("18697") ? () => undefined : (stryCov_9fa48("18697"), entry => stryMutAct_9fa48("18700") ? entry.kind !== "use-fields" : stryMutAct_9fa48("18699") ? false : stryMutAct_9fa48("18698") ? true : (stryCov_9fa48("18698", "18699", "18700"), entry.kind === (stryMutAct_9fa48("18701") ? "" : (stryCov_9fa48("18701"), "use-fields")))));
    return (stryMutAct_9fa48("18704") ? action?.kind !== "use-fields" : stryMutAct_9fa48("18703") ? false : stryMutAct_9fa48("18702") ? true : (stryCov_9fa48("18702", "18703", "18704"), (stryMutAct_9fa48("18705") ? action.kind : (stryCov_9fa48("18705"), action?.kind)) === (stryMutAct_9fa48("18706") ? "" : (stryCov_9fa48("18706"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Propagation-request pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packPropagationRequest`
 * reads beside the step).
 */
export type PackPropagationRequestState = Record<string, never>;
export type PackPropagationRequestEvent = Event | {
  readonly kind: "lxmf-codec/pack-propagation-request-gate";
  readonly wants: ReadonlyArray<Uint8Array> | null;
  readonly haves: ReadonlyArray<Uint8Array> | null;
  readonly transferLimitKb?: number | null;
};
export type PackPropagationRequestAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackPropagationRequestStepResult {
  readonly state: PackPropagationRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPropagationRequestAction[];
}
export function initialPackPropagationRequestState(): PackPropagationRequestState {
  if (stryMutAct_9fa48("18707")) {
    {}
  } else {
    stryCov_9fa48("18707");
    return {};
  }
}
export function stepPackPropagationRequestWithActions(state: PackPropagationRequestState, event: PackPropagationRequestEvent): PackPropagationRequestStepResult {
  if (stryMutAct_9fa48("18708")) {
    {}
  } else {
    stryCov_9fa48("18708");
    if (stryMutAct_9fa48("18711") ? event.kind !== "lxmf-codec/pack-propagation-request-gate" : stryMutAct_9fa48("18710") ? false : stryMutAct_9fa48("18709") ? true : (stryCov_9fa48("18709", "18710", "18711"), event.kind === (stryMutAct_9fa48("18712") ? "" : (stryCov_9fa48("18712"), "lxmf-codec/pack-propagation-request-gate")))) {
      if (stryMutAct_9fa48("18713")) {
        {}
      } else {
        stryCov_9fa48("18713");
        return stryMutAct_9fa48("18714") ? {} : (stryCov_9fa48("18714"), {
          state,
          intents: stryMutAct_9fa48("18715") ? ["Stryker was here"] : (stryCov_9fa48("18715"), []),
          actions: stryMutAct_9fa48("18716") ? [] : (stryCov_9fa48("18716"), [stryMutAct_9fa48("18717") ? {} : (stryCov_9fa48("18717"), {
            kind: stryMutAct_9fa48("18718") ? "" : (stryCov_9fa48("18718"), "use-raw"),
            raw: packPropagationRequest(event.wants, event.haves, event.transferLimitKb)
          })])
        });
      }
    }
    return stryMutAct_9fa48("18719") ? {} : (stryCov_9fa48("18719"), {
      state,
      intents: stryMutAct_9fa48("18720") ? ["Stryker was here"] : (stryCov_9fa48("18720"), []),
      actions: stryMutAct_9fa48("18721") ? ["Stryker was here"] : (stryCov_9fa48("18721"), [])
    });
  }
}
export function shouldUsePackPropagationRequest(actions: ReadonlyArray<PackPropagationRequestAction>): boolean {
  if (stryMutAct_9fa48("18722")) {
    {}
  } else {
    stryCov_9fa48("18722");
    return stryMutAct_9fa48("18723") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("18723"), actions.some(stryMutAct_9fa48("18724") ? () => undefined : (stryCov_9fa48("18724"), action => stryMutAct_9fa48("18727") ? action.kind !== "use-raw" : stryMutAct_9fa48("18726") ? false : stryMutAct_9fa48("18725") ? true : (stryCov_9fa48("18725", "18726", "18727"), action.kind === (stryMutAct_9fa48("18728") ? "" : (stryCov_9fa48("18728"), "use-raw"))))));
  }
}

/** Extract propagation-request pack bytes from step actions; null when no `use-raw`. */
export function packPropagationRequestRawFromActions(actions: ReadonlyArray<PackPropagationRequestAction>): Uint8Array | null {
  if (stryMutAct_9fa48("18729")) {
    {}
  } else {
    stryCov_9fa48("18729");
    const action = actions.find(stryMutAct_9fa48("18730") ? () => undefined : (stryCov_9fa48("18730"), entry => stryMutAct_9fa48("18733") ? entry.kind !== "use-raw" : stryMutAct_9fa48("18732") ? false : stryMutAct_9fa48("18731") ? true : (stryCov_9fa48("18731", "18732", "18733"), entry.kind === (stryMutAct_9fa48("18734") ? "" : (stryCov_9fa48("18734"), "use-raw")))));
    return (stryMutAct_9fa48("18737") ? action?.kind !== "use-raw" : stryMutAct_9fa48("18736") ? false : stryMutAct_9fa48("18735") ? true : (stryCov_9fa48("18735", "18736", "18737"), (stryMutAct_9fa48("18738") ? action.kind : (stryCov_9fa48("18738"), action?.kind)) === (stryMutAct_9fa48("18739") ? "" : (stryCov_9fa48("18739"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Propagation-request unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackPropagationRequest`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackPropagationRequestState = Record<string, never>;
export type UnpackPropagationRequestEvent = Event | {
  readonly kind: "lxmf-codec/unpack-propagation-request-gate";
  readonly data: Uint8Array;
};
export type UnpackPropagationRequestAction = {
  readonly kind: "use-fields";
  readonly fields: UnpackedPropagationRequest;
} | {
  readonly kind: "reject";
};
export interface UnpackPropagationRequestStepResult {
  readonly state: UnpackPropagationRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackPropagationRequestAction[];
}
export function initialUnpackPropagationRequestState(): UnpackPropagationRequestState {
  if (stryMutAct_9fa48("18740")) {
    {}
  } else {
    stryCov_9fa48("18740");
    return {};
  }
}
export function stepUnpackPropagationRequestWithActions(state: UnpackPropagationRequestState, event: UnpackPropagationRequestEvent): UnpackPropagationRequestStepResult {
  if (stryMutAct_9fa48("18741")) {
    {}
  } else {
    stryCov_9fa48("18741");
    if (stryMutAct_9fa48("18744") ? event.kind !== "lxmf-codec/unpack-propagation-request-gate" : stryMutAct_9fa48("18743") ? false : stryMutAct_9fa48("18742") ? true : (stryCov_9fa48("18742", "18743", "18744"), event.kind === (stryMutAct_9fa48("18745") ? "" : (stryCov_9fa48("18745"), "lxmf-codec/unpack-propagation-request-gate")))) {
      if (stryMutAct_9fa48("18746")) {
        {}
      } else {
        stryCov_9fa48("18746");
        try {
          if (stryMutAct_9fa48("18747")) {
            {}
          } else {
            stryCov_9fa48("18747");
            const fields = unpackPropagationRequestFields(event.data);
            return stryMutAct_9fa48("18748") ? {} : (stryCov_9fa48("18748"), {
              state,
              intents: stryMutAct_9fa48("18749") ? ["Stryker was here"] : (stryCov_9fa48("18749"), []),
              actions: stryMutAct_9fa48("18750") ? [] : (stryCov_9fa48("18750"), [stryMutAct_9fa48("18751") ? {} : (stryCov_9fa48("18751"), {
                kind: stryMutAct_9fa48("18752") ? "" : (stryCov_9fa48("18752"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("18753")) {
            {}
          } else {
            stryCov_9fa48("18753");
            return stryMutAct_9fa48("18754") ? {} : (stryCov_9fa48("18754"), {
              state,
              intents: stryMutAct_9fa48("18755") ? ["Stryker was here"] : (stryCov_9fa48("18755"), []),
              actions: stryMutAct_9fa48("18756") ? [] : (stryCov_9fa48("18756"), [stryMutAct_9fa48("18757") ? {} : (stryCov_9fa48("18757"), {
                kind: stryMutAct_9fa48("18758") ? "" : (stryCov_9fa48("18758"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("18759") ? {} : (stryCov_9fa48("18759"), {
      state,
      intents: stryMutAct_9fa48("18760") ? ["Stryker was here"] : (stryCov_9fa48("18760"), []),
      actions: stryMutAct_9fa48("18761") ? ["Stryker was here"] : (stryCov_9fa48("18761"), [])
    });
  }
}
export function shouldUseUnpackPropagationRequest(actions: ReadonlyArray<UnpackPropagationRequestAction>): boolean {
  if (stryMutAct_9fa48("18762")) {
    {}
  } else {
    stryCov_9fa48("18762");
    return stryMutAct_9fa48("18763") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("18763"), actions.some(stryMutAct_9fa48("18764") ? () => undefined : (stryCov_9fa48("18764"), action => stryMutAct_9fa48("18767") ? action.kind !== "use-fields" : stryMutAct_9fa48("18766") ? false : stryMutAct_9fa48("18765") ? true : (stryCov_9fa48("18765", "18766", "18767"), action.kind === (stryMutAct_9fa48("18768") ? "" : (stryCov_9fa48("18768"), "use-fields"))))));
  }
}
export function shouldRejectUnpackPropagationRequest(actions: ReadonlyArray<UnpackPropagationRequestAction>): boolean {
  if (stryMutAct_9fa48("18769")) {
    {}
  } else {
    stryCov_9fa48("18769");
    return stryMutAct_9fa48("18770") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("18770"), actions.some(stryMutAct_9fa48("18771") ? () => undefined : (stryCov_9fa48("18771"), action => stryMutAct_9fa48("18774") ? action.kind !== "reject" : stryMutAct_9fa48("18773") ? false : stryMutAct_9fa48("18772") ? true : (stryCov_9fa48("18772", "18773", "18774"), action.kind === (stryMutAct_9fa48("18775") ? "" : (stryCov_9fa48("18775"), "reject"))))));
  }
}

/** Extract unpacked propagation-request fields from step actions; null when no `use-fields`. */
export function propagationRequestFieldsFromActions(actions: ReadonlyArray<UnpackPropagationRequestAction>): UnpackedPropagationRequest | null {
  if (stryMutAct_9fa48("18776")) {
    {}
  } else {
    stryCov_9fa48("18776");
    const action = actions.find(stryMutAct_9fa48("18777") ? () => undefined : (stryCov_9fa48("18777"), entry => stryMutAct_9fa48("18780") ? entry.kind !== "use-fields" : stryMutAct_9fa48("18779") ? false : stryMutAct_9fa48("18778") ? true : (stryCov_9fa48("18778", "18779", "18780"), entry.kind === (stryMutAct_9fa48("18781") ? "" : (stryCov_9fa48("18781"), "use-fields")))));
    return (stryMutAct_9fa48("18784") ? action?.kind !== "use-fields" : stryMutAct_9fa48("18783") ? false : stryMutAct_9fa48("18782") ? true : (stryCov_9fa48("18782", "18783", "18784"), (stryMutAct_9fa48("18785") ? action.kind : (stryCov_9fa48("18785"), action?.kind)) === (stryMutAct_9fa48("18786") ? "" : (stryCov_9fa48("18786"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Propagation-envelope pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packPropagationEnvelope`
 * reads beside the step).
 */
export type PackPropagationEnvelopeState = Record<string, never>;
export type PackPropagationEnvelopeEvent = Event | {
  readonly kind: "lxmf-codec/pack-propagation-envelope-gate";
  readonly timestamp: number;
  readonly messages: ReadonlyArray<Uint8Array>;
};
export type PackPropagationEnvelopeAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackPropagationEnvelopeStepResult {
  readonly state: PackPropagationEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPropagationEnvelopeAction[];
}
export function initialPackPropagationEnvelopeState(): PackPropagationEnvelopeState {
  if (stryMutAct_9fa48("18787")) {
    {}
  } else {
    stryCov_9fa48("18787");
    return {};
  }
}
export function stepPackPropagationEnvelopeWithActions(state: PackPropagationEnvelopeState, event: PackPropagationEnvelopeEvent): PackPropagationEnvelopeStepResult {
  if (stryMutAct_9fa48("18788")) {
    {}
  } else {
    stryCov_9fa48("18788");
    if (stryMutAct_9fa48("18791") ? event.kind !== "lxmf-codec/pack-propagation-envelope-gate" : stryMutAct_9fa48("18790") ? false : stryMutAct_9fa48("18789") ? true : (stryCov_9fa48("18789", "18790", "18791"), event.kind === (stryMutAct_9fa48("18792") ? "" : (stryCov_9fa48("18792"), "lxmf-codec/pack-propagation-envelope-gate")))) {
      if (stryMutAct_9fa48("18793")) {
        {}
      } else {
        stryCov_9fa48("18793");
        return stryMutAct_9fa48("18794") ? {} : (stryCov_9fa48("18794"), {
          state,
          intents: stryMutAct_9fa48("18795") ? ["Stryker was here"] : (stryCov_9fa48("18795"), []),
          actions: stryMutAct_9fa48("18796") ? [] : (stryCov_9fa48("18796"), [stryMutAct_9fa48("18797") ? {} : (stryCov_9fa48("18797"), {
            kind: stryMutAct_9fa48("18798") ? "" : (stryCov_9fa48("18798"), "use-raw"),
            raw: packPropagationEnvelope(event.timestamp, event.messages)
          })])
        });
      }
    }
    return stryMutAct_9fa48("18799") ? {} : (stryCov_9fa48("18799"), {
      state,
      intents: stryMutAct_9fa48("18800") ? ["Stryker was here"] : (stryCov_9fa48("18800"), []),
      actions: stryMutAct_9fa48("18801") ? ["Stryker was here"] : (stryCov_9fa48("18801"), [])
    });
  }
}
export function shouldUsePackPropagationEnvelope(actions: ReadonlyArray<PackPropagationEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("18802")) {
    {}
  } else {
    stryCov_9fa48("18802");
    return stryMutAct_9fa48("18803") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("18803"), actions.some(stryMutAct_9fa48("18804") ? () => undefined : (stryCov_9fa48("18804"), action => stryMutAct_9fa48("18807") ? action.kind !== "use-raw" : stryMutAct_9fa48("18806") ? false : stryMutAct_9fa48("18805") ? true : (stryCov_9fa48("18805", "18806", "18807"), action.kind === (stryMutAct_9fa48("18808") ? "" : (stryCov_9fa48("18808"), "use-raw"))))));
  }
}

/** Extract propagation-envelope pack bytes from step actions; null when no `use-raw`. */
export function packPropagationEnvelopeRawFromActions(actions: ReadonlyArray<PackPropagationEnvelopeAction>): Uint8Array | null {
  if (stryMutAct_9fa48("18809")) {
    {}
  } else {
    stryCov_9fa48("18809");
    const action = actions.find(stryMutAct_9fa48("18810") ? () => undefined : (stryCov_9fa48("18810"), entry => stryMutAct_9fa48("18813") ? entry.kind !== "use-raw" : stryMutAct_9fa48("18812") ? false : stryMutAct_9fa48("18811") ? true : (stryCov_9fa48("18811", "18812", "18813"), entry.kind === (stryMutAct_9fa48("18814") ? "" : (stryCov_9fa48("18814"), "use-raw")))));
    return (stryMutAct_9fa48("18817") ? action?.kind !== "use-raw" : stryMutAct_9fa48("18816") ? false : stryMutAct_9fa48("18815") ? true : (stryCov_9fa48("18815", "18816", "18817"), (stryMutAct_9fa48("18818") ? action.kind : (stryCov_9fa48("18818"), action?.kind)) === (stryMutAct_9fa48("18819") ? "" : (stryCov_9fa48("18819"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Propagation-envelope unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackPropagationEnvelope`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackPropagationEnvelopeState = Record<string, never>;
export type UnpackPropagationEnvelopeEvent = Event | {
  readonly kind: "lxmf-codec/unpack-propagation-envelope-gate";
  readonly data: Uint8Array;
};
export type UnpackPropagationEnvelopeAction = {
  readonly kind: "use-fields";
  readonly fields: UnpackedPropagationEnvelope;
} | {
  readonly kind: "reject";
};
export interface UnpackPropagationEnvelopeStepResult {
  readonly state: UnpackPropagationEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackPropagationEnvelopeAction[];
}
export function initialUnpackPropagationEnvelopeState(): UnpackPropagationEnvelopeState {
  if (stryMutAct_9fa48("18820")) {
    {}
  } else {
    stryCov_9fa48("18820");
    return {};
  }
}
export function stepUnpackPropagationEnvelopeWithActions(state: UnpackPropagationEnvelopeState, event: UnpackPropagationEnvelopeEvent): UnpackPropagationEnvelopeStepResult {
  if (stryMutAct_9fa48("18821")) {
    {}
  } else {
    stryCov_9fa48("18821");
    if (stryMutAct_9fa48("18824") ? event.kind !== "lxmf-codec/unpack-propagation-envelope-gate" : stryMutAct_9fa48("18823") ? false : stryMutAct_9fa48("18822") ? true : (stryCov_9fa48("18822", "18823", "18824"), event.kind === (stryMutAct_9fa48("18825") ? "" : (stryCov_9fa48("18825"), "lxmf-codec/unpack-propagation-envelope-gate")))) {
      if (stryMutAct_9fa48("18826")) {
        {}
      } else {
        stryCov_9fa48("18826");
        try {
          if (stryMutAct_9fa48("18827")) {
            {}
          } else {
            stryCov_9fa48("18827");
            const fields = unpackPropagationEnvelopeFields(event.data);
            return stryMutAct_9fa48("18828") ? {} : (stryCov_9fa48("18828"), {
              state,
              intents: stryMutAct_9fa48("18829") ? ["Stryker was here"] : (stryCov_9fa48("18829"), []),
              actions: stryMutAct_9fa48("18830") ? [] : (stryCov_9fa48("18830"), [stryMutAct_9fa48("18831") ? {} : (stryCov_9fa48("18831"), {
                kind: stryMutAct_9fa48("18832") ? "" : (stryCov_9fa48("18832"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("18833")) {
            {}
          } else {
            stryCov_9fa48("18833");
            return stryMutAct_9fa48("18834") ? {} : (stryCov_9fa48("18834"), {
              state,
              intents: stryMutAct_9fa48("18835") ? ["Stryker was here"] : (stryCov_9fa48("18835"), []),
              actions: stryMutAct_9fa48("18836") ? [] : (stryCov_9fa48("18836"), [stryMutAct_9fa48("18837") ? {} : (stryCov_9fa48("18837"), {
                kind: stryMutAct_9fa48("18838") ? "" : (stryCov_9fa48("18838"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("18839") ? {} : (stryCov_9fa48("18839"), {
      state,
      intents: stryMutAct_9fa48("18840") ? ["Stryker was here"] : (stryCov_9fa48("18840"), []),
      actions: stryMutAct_9fa48("18841") ? ["Stryker was here"] : (stryCov_9fa48("18841"), [])
    });
  }
}
export function shouldUseUnpackPropagationEnvelope(actions: ReadonlyArray<UnpackPropagationEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("18842")) {
    {}
  } else {
    stryCov_9fa48("18842");
    return stryMutAct_9fa48("18843") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("18843"), actions.some(stryMutAct_9fa48("18844") ? () => undefined : (stryCov_9fa48("18844"), action => stryMutAct_9fa48("18847") ? action.kind !== "use-fields" : stryMutAct_9fa48("18846") ? false : stryMutAct_9fa48("18845") ? true : (stryCov_9fa48("18845", "18846", "18847"), action.kind === (stryMutAct_9fa48("18848") ? "" : (stryCov_9fa48("18848"), "use-fields"))))));
  }
}
export function shouldRejectUnpackPropagationEnvelope(actions: ReadonlyArray<UnpackPropagationEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("18849")) {
    {}
  } else {
    stryCov_9fa48("18849");
    return stryMutAct_9fa48("18850") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("18850"), actions.some(stryMutAct_9fa48("18851") ? () => undefined : (stryCov_9fa48("18851"), action => stryMutAct_9fa48("18854") ? action.kind !== "reject" : stryMutAct_9fa48("18853") ? false : stryMutAct_9fa48("18852") ? true : (stryCov_9fa48("18852", "18853", "18854"), action.kind === (stryMutAct_9fa48("18855") ? "" : (stryCov_9fa48("18855"), "reject"))))));
  }
}

/** Extract unpacked propagation-envelope fields from step actions; null when no `use-fields`. */
export function propagationEnvelopeFieldsFromActions(actions: ReadonlyArray<UnpackPropagationEnvelopeAction>): UnpackedPropagationEnvelope | null {
  if (stryMutAct_9fa48("18856")) {
    {}
  } else {
    stryCov_9fa48("18856");
    const action = actions.find(stryMutAct_9fa48("18857") ? () => undefined : (stryCov_9fa48("18857"), entry => stryMutAct_9fa48("18860") ? entry.kind !== "use-fields" : stryMutAct_9fa48("18859") ? false : stryMutAct_9fa48("18858") ? true : (stryCov_9fa48("18858", "18859", "18860"), entry.kind === (stryMutAct_9fa48("18861") ? "" : (stryCov_9fa48("18861"), "use-fields")))));
    return (stryMutAct_9fa48("18864") ? action?.kind !== "use-fields" : stryMutAct_9fa48("18863") ? false : stryMutAct_9fa48("18862") ? true : (stryCov_9fa48("18862", "18863", "18864"), (stryMutAct_9fa48("18865") ? action.kind : (stryCov_9fa48("18865"), action?.kind)) === (stryMutAct_9fa48("18866") ? "" : (stryCov_9fa48("18866"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Bin-list unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackBinList` reads
 * beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackBinListState = Record<string, never>;
export type UnpackBinListEvent = Event | {
  readonly kind: "lxmf-codec/unpack-bin-list-gate";
  readonly data: Uint8Array;
  readonly label: string;
};
export type UnpackBinListAction = {
  readonly kind: "use-fields";
  readonly fields: UnpackedBinList;
} | {
  readonly kind: "reject";
};
export interface UnpackBinListStepResult {
  readonly state: UnpackBinListState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackBinListAction[];
}
export function initialUnpackBinListState(): UnpackBinListState {
  if (stryMutAct_9fa48("18867")) {
    {}
  } else {
    stryCov_9fa48("18867");
    return {};
  }
}
export function stepUnpackBinListWithActions(state: UnpackBinListState, event: UnpackBinListEvent): UnpackBinListStepResult {
  if (stryMutAct_9fa48("18868")) {
    {}
  } else {
    stryCov_9fa48("18868");
    if (stryMutAct_9fa48("18871") ? event.kind !== "lxmf-codec/unpack-bin-list-gate" : stryMutAct_9fa48("18870") ? false : stryMutAct_9fa48("18869") ? true : (stryCov_9fa48("18869", "18870", "18871"), event.kind === (stryMutAct_9fa48("18872") ? "" : (stryCov_9fa48("18872"), "lxmf-codec/unpack-bin-list-gate")))) {
      if (stryMutAct_9fa48("18873")) {
        {}
      } else {
        stryCov_9fa48("18873");
        try {
          if (stryMutAct_9fa48("18874")) {
            {}
          } else {
            stryCov_9fa48("18874");
            const fields = unpackBinListFields(event.data, event.label);
            return stryMutAct_9fa48("18875") ? {} : (stryCov_9fa48("18875"), {
              state,
              intents: stryMutAct_9fa48("18876") ? ["Stryker was here"] : (stryCov_9fa48("18876"), []),
              actions: stryMutAct_9fa48("18877") ? [] : (stryCov_9fa48("18877"), [stryMutAct_9fa48("18878") ? {} : (stryCov_9fa48("18878"), {
                kind: stryMutAct_9fa48("18879") ? "" : (stryCov_9fa48("18879"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("18880")) {
            {}
          } else {
            stryCov_9fa48("18880");
            return stryMutAct_9fa48("18881") ? {} : (stryCov_9fa48("18881"), {
              state,
              intents: stryMutAct_9fa48("18882") ? ["Stryker was here"] : (stryCov_9fa48("18882"), []),
              actions: stryMutAct_9fa48("18883") ? [] : (stryCov_9fa48("18883"), [stryMutAct_9fa48("18884") ? {} : (stryCov_9fa48("18884"), {
                kind: stryMutAct_9fa48("18885") ? "" : (stryCov_9fa48("18885"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("18886") ? {} : (stryCov_9fa48("18886"), {
      state,
      intents: stryMutAct_9fa48("18887") ? ["Stryker was here"] : (stryCov_9fa48("18887"), []),
      actions: stryMutAct_9fa48("18888") ? ["Stryker was here"] : (stryCov_9fa48("18888"), [])
    });
  }
}
export function shouldUseUnpackBinList(actions: ReadonlyArray<UnpackBinListAction>): boolean {
  if (stryMutAct_9fa48("18889")) {
    {}
  } else {
    stryCov_9fa48("18889");
    return stryMutAct_9fa48("18890") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("18890"), actions.some(stryMutAct_9fa48("18891") ? () => undefined : (stryCov_9fa48("18891"), action => stryMutAct_9fa48("18894") ? action.kind !== "use-fields" : stryMutAct_9fa48("18893") ? false : stryMutAct_9fa48("18892") ? true : (stryCov_9fa48("18892", "18893", "18894"), action.kind === (stryMutAct_9fa48("18895") ? "" : (stryCov_9fa48("18895"), "use-fields"))))));
  }
}
export function shouldRejectUnpackBinList(actions: ReadonlyArray<UnpackBinListAction>): boolean {
  if (stryMutAct_9fa48("18896")) {
    {}
  } else {
    stryCov_9fa48("18896");
    return stryMutAct_9fa48("18897") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("18897"), actions.some(stryMutAct_9fa48("18898") ? () => undefined : (stryCov_9fa48("18898"), action => stryMutAct_9fa48("18901") ? action.kind !== "reject" : stryMutAct_9fa48("18900") ? false : stryMutAct_9fa48("18899") ? true : (stryCov_9fa48("18899", "18900", "18901"), action.kind === (stryMutAct_9fa48("18902") ? "" : (stryCov_9fa48("18902"), "reject"))))));
  }
}

/** Extract unpacked bin-list fields from step actions; null when no `use-fields`. */
export function binListFieldsFromActions(actions: ReadonlyArray<UnpackBinListAction>): UnpackedBinList | null {
  if (stryMutAct_9fa48("18903")) {
    {}
  } else {
    stryCov_9fa48("18903");
    const action = actions.find(stryMutAct_9fa48("18904") ? () => undefined : (stryCov_9fa48("18904"), entry => stryMutAct_9fa48("18907") ? entry.kind !== "use-fields" : stryMutAct_9fa48("18906") ? false : stryMutAct_9fa48("18905") ? true : (stryCov_9fa48("18905", "18906", "18907"), entry.kind === (stryMutAct_9fa48("18908") ? "" : (stryCov_9fa48("18908"), "use-fields")))));
    return (stryMutAct_9fa48("18911") ? action?.kind !== "use-fields" : stryMutAct_9fa48("18910") ? false : stryMutAct_9fa48("18909") ? true : (stryCov_9fa48("18909", "18910", "18911"), (stryMutAct_9fa48("18912") ? action.kind : (stryCov_9fa48("18912"), action?.kind)) === (stryMutAct_9fa48("18913") ? "" : (stryCov_9fa48("18913"), "use-fields")))) ? action.fields : null;
  }
}