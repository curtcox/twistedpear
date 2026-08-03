/**
 * Pure RNS resource advertisement msgpack codec and flag bits.
 * Hashing / link IO stay at the adapter edge.
 * Pack / unpack / role-flag / flag encode-decode / request-response classify
 * conclusions leave via machine actions (no ad-hoc
 * `packResourceAdvertisement` / `unpackResourceAdvertisement` /
 * `planResourceAdvertisementRoleFlags` / `encodeResourceAdvertisementFlags` /
 * `decodeResourceAdvertisementFlags` / `isResourceAdvertisementRequest` /
 * `isResourceAdvertisementResponse` reads beside the step).
 * Role-flag plan nested via {@link stepResourceAdvertisementRoleFlagsPlanWithActions}.
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
import { msgpackPackBin, msgpackPackNil, msgpackPackStringMap, msgpackPackUInt, msgpackUnpackStringKeyedMap, type MsgpackScalar } from "./msgpack-core.js";
export interface ResourceAdvertisementFields {
  readonly t: number;
  readonly d: number;
  readonly n: number;
  readonly h: Uint8Array;
  readonly r: Uint8Array;
  readonly o: Uint8Array;
  readonly m: Uint8Array;
  readonly f: number;
  readonly i: number;
  readonly l: number;
  readonly q: Uint8Array | null;
}
export interface ResourceAdvertisementFlags {
  readonly e: boolean;
  readonly c: boolean;
  readonly s: boolean;
  readonly u: boolean;
  readonly p: boolean;
  readonly x: boolean;
}
export function encodeResourceAdvertisementFlags(flags: ResourceAdvertisementFlags): number {
  if (stryMutAct_9fa48("28880")) {
    {}
  } else {
    stryCov_9fa48("28880");
    return 0x00 | (flags.x ? 1 << 5 : 0) | (flags.p ? 1 << 4 : 0) | (flags.u ? 1 << 3 : 0) | (flags.s ? 1 << 2 : 0) | (flags.c ? 1 << 1 : 0) | (flags.e ? 1 : 0);
  }
}
export function decodeResourceAdvertisementFlags(f: number): ResourceAdvertisementFlags {
  if (stryMutAct_9fa48("28881")) {
    {}
  } else {
    stryCov_9fa48("28881");
    return stryMutAct_9fa48("28882") ? {} : (stryCov_9fa48("28882"), {
      e: stryMutAct_9fa48("28885") ? (f & 0x01) !== 0x01 : stryMutAct_9fa48("28884") ? false : stryMutAct_9fa48("28883") ? true : (stryCov_9fa48("28883", "28884", "28885"), (f & 0x01) === 0x01),
      c: stryMutAct_9fa48("28888") ? (f >> 1 & 0x01) !== 0x01 : stryMutAct_9fa48("28887") ? false : stryMutAct_9fa48("28886") ? true : (stryCov_9fa48("28886", "28887", "28888"), (f >> 1 & 0x01) === 0x01),
      s: stryMutAct_9fa48("28891") ? (f >> 2 & 0x01) !== 0x01 : stryMutAct_9fa48("28890") ? false : stryMutAct_9fa48("28889") ? true : (stryCov_9fa48("28889", "28890", "28891"), (f >> 2 & 0x01) === 0x01),
      u: stryMutAct_9fa48("28894") ? (f >> 3 & 0x01) !== 0x01 : stryMutAct_9fa48("28893") ? false : stryMutAct_9fa48("28892") ? true : (stryCov_9fa48("28892", "28893", "28894"), (f >> 3 & 0x01) === 0x01),
      p: stryMutAct_9fa48("28897") ? (f >> 4 & 0x01) !== 0x01 : stryMutAct_9fa48("28896") ? false : stryMutAct_9fa48("28895") ? true : (stryCov_9fa48("28895", "28896", "28897"), (f >> 4 & 0x01) === 0x01),
      x: stryMutAct_9fa48("28900") ? (f >> 5 & 0x01) !== 0x01 : stryMutAct_9fa48("28899") ? false : stryMutAct_9fa48("28898") ? true : (stryCov_9fa48("28898", "28899", "28900"), (f >> 5 & 0x01) === 0x01)
    });
  }
}
export function packResourceAdvertisement(fields: ResourceAdvertisementFields): Uint8Array {
  if (stryMutAct_9fa48("28901")) {
    {}
  } else {
    stryCov_9fa48("28901");
    return msgpackPackStringMap(stryMutAct_9fa48("28902") ? [] : (stryCov_9fa48("28902"), [stryMutAct_9fa48("28903") ? [] : (stryCov_9fa48("28903"), [stryMutAct_9fa48("28904") ? "" : (stryCov_9fa48("28904"), "t"), msgpackPackUInt(fields.t)]), stryMutAct_9fa48("28905") ? [] : (stryCov_9fa48("28905"), [stryMutAct_9fa48("28906") ? "" : (stryCov_9fa48("28906"), "d"), msgpackPackUInt(fields.d)]), stryMutAct_9fa48("28907") ? [] : (stryCov_9fa48("28907"), [stryMutAct_9fa48("28908") ? "" : (stryCov_9fa48("28908"), "n"), msgpackPackUInt(fields.n)]), stryMutAct_9fa48("28909") ? [] : (stryCov_9fa48("28909"), [stryMutAct_9fa48("28910") ? "" : (stryCov_9fa48("28910"), "h"), msgpackPackBin(fields.h)]), stryMutAct_9fa48("28911") ? [] : (stryCov_9fa48("28911"), [stryMutAct_9fa48("28912") ? "" : (stryCov_9fa48("28912"), "r"), msgpackPackBin(fields.r)]), stryMutAct_9fa48("28913") ? [] : (stryCov_9fa48("28913"), [stryMutAct_9fa48("28914") ? "" : (stryCov_9fa48("28914"), "o"), msgpackPackBin(fields.o)]), stryMutAct_9fa48("28915") ? [] : (stryCov_9fa48("28915"), [stryMutAct_9fa48("28916") ? "" : (stryCov_9fa48("28916"), "i"), msgpackPackUInt(fields.i)]), stryMutAct_9fa48("28917") ? [] : (stryCov_9fa48("28917"), [stryMutAct_9fa48("28918") ? "" : (stryCov_9fa48("28918"), "l"), msgpackPackUInt(fields.l)]), stryMutAct_9fa48("28919") ? [] : (stryCov_9fa48("28919"), [stryMutAct_9fa48("28920") ? "" : (stryCov_9fa48("28920"), "q"), (stryMutAct_9fa48("28923") ? fields.q !== null : stryMutAct_9fa48("28922") ? false : stryMutAct_9fa48("28921") ? true : (stryCov_9fa48("28921", "28922", "28923"), fields.q === null)) ? msgpackPackNil() : msgpackPackBin(fields.q)]), stryMutAct_9fa48("28924") ? [] : (stryCov_9fa48("28924"), [stryMutAct_9fa48("28925") ? "" : (stryCov_9fa48("28925"), "f"), msgpackPackUInt(fields.f)]), stryMutAct_9fa48("28926") ? [] : (stryCov_9fa48("28926"), [stryMutAct_9fa48("28927") ? "" : (stryCov_9fa48("28927"), "m"), msgpackPackBin(fields.m)])]));
  }
}
function readInt(value: MsgpackScalar | undefined): number {
  if (stryMutAct_9fa48("28928")) {
    {}
  } else {
    stryCov_9fa48("28928");
    if (stryMutAct_9fa48("28931") ? value === undefined && value.type !== "int" : stryMutAct_9fa48("28930") ? false : stryMutAct_9fa48("28929") ? true : (stryCov_9fa48("28929", "28930", "28931"), (stryMutAct_9fa48("28933") ? value !== undefined : stryMutAct_9fa48("28932") ? false : (stryCov_9fa48("28932", "28933"), value === undefined)) || (stryMutAct_9fa48("28935") ? value.type === "int" : stryMutAct_9fa48("28934") ? false : (stryCov_9fa48("28934", "28935"), value.type !== (stryMutAct_9fa48("28936") ? "" : (stryCov_9fa48("28936"), "int")))))) {
      if (stryMutAct_9fa48("28937")) {
        {}
      } else {
        stryCov_9fa48("28937");
        throw new Error(stryMutAct_9fa48("28938") ? "" : (stryCov_9fa48("28938"), "Expected msgpack int"));
      }
    }
    return value.int;
  }
}
function readBin(value: MsgpackScalar | undefined): Uint8Array {
  if (stryMutAct_9fa48("28939")) {
    {}
  } else {
    stryCov_9fa48("28939");
    if (stryMutAct_9fa48("28942") ? value === undefined && value.type !== "bin" : stryMutAct_9fa48("28941") ? false : stryMutAct_9fa48("28940") ? true : (stryCov_9fa48("28940", "28941", "28942"), (stryMutAct_9fa48("28944") ? value !== undefined : stryMutAct_9fa48("28943") ? false : (stryCov_9fa48("28943", "28944"), value === undefined)) || (stryMutAct_9fa48("28946") ? value.type === "bin" : stryMutAct_9fa48("28945") ? false : (stryCov_9fa48("28945", "28946"), value.type !== (stryMutAct_9fa48("28947") ? "" : (stryCov_9fa48("28947"), "bin")))))) {
      if (stryMutAct_9fa48("28948")) {
        {}
      } else {
        stryCov_9fa48("28948");
        throw new Error(stryMutAct_9fa48("28949") ? "" : (stryCov_9fa48("28949"), "Expected msgpack bin"));
      }
    }
    return Uint8Array.from(value.bin);
  }
}
function readOptionalBin(value: MsgpackScalar | undefined): Uint8Array | null {
  if (stryMutAct_9fa48("28950")) {
    {}
  } else {
    stryCov_9fa48("28950");
    if (stryMutAct_9fa48("28953") ? value === undefined && value.type === "nil" : stryMutAct_9fa48("28952") ? false : stryMutAct_9fa48("28951") ? true : (stryCov_9fa48("28951", "28952", "28953"), (stryMutAct_9fa48("28955") ? value !== undefined : stryMutAct_9fa48("28954") ? false : (stryCov_9fa48("28954", "28955"), value === undefined)) || (stryMutAct_9fa48("28957") ? value.type !== "nil" : stryMutAct_9fa48("28956") ? false : (stryCov_9fa48("28956", "28957"), value.type === (stryMutAct_9fa48("28958") ? "" : (stryCov_9fa48("28958"), "nil")))))) {
      if (stryMutAct_9fa48("28959")) {
        {}
      } else {
        stryCov_9fa48("28959");
        return null;
      }
    }
    return readBin(value);
  }
}
export function unpackResourceAdvertisement(data: Uint8Array): ResourceAdvertisementFields {
  if (stryMutAct_9fa48("28960")) {
    {}
  } else {
    stryCov_9fa48("28960");
    const map = msgpackUnpackStringKeyedMap(data);
    return stryMutAct_9fa48("28961") ? {} : (stryCov_9fa48("28961"), {
      t: readInt(map.get(stryMutAct_9fa48("28962") ? "" : (stryCov_9fa48("28962"), "t"))),
      d: readInt(map.get(stryMutAct_9fa48("28963") ? "" : (stryCov_9fa48("28963"), "d"))),
      n: readInt(map.get(stryMutAct_9fa48("28964") ? "" : (stryCov_9fa48("28964"), "n"))),
      h: readBin(map.get(stryMutAct_9fa48("28965") ? "" : (stryCov_9fa48("28965"), "h"))),
      r: readBin(map.get(stryMutAct_9fa48("28966") ? "" : (stryCov_9fa48("28966"), "r"))),
      o: readBin(map.get(stryMutAct_9fa48("28967") ? "" : (stryCov_9fa48("28967"), "o"))),
      m: readBin(map.get(stryMutAct_9fa48("28968") ? "" : (stryCov_9fa48("28968"), "m"))),
      f: readInt(map.get(stryMutAct_9fa48("28969") ? "" : (stryCov_9fa48("28969"), "f"))),
      i: readInt(map.get(stryMutAct_9fa48("28970") ? "" : (stryCov_9fa48("28970"), "i"))),
      l: readInt(map.get(stryMutAct_9fa48("28971") ? "" : (stryCov_9fa48("28971"), "l"))),
      q: readOptionalBin(map.get(stryMutAct_9fa48("28972") ? "" : (stryCov_9fa48("28972"), "q")))
    });
  }
}
export function isResourceAdvertisementRequest(fields: ResourceAdvertisementFields): boolean {
  if (stryMutAct_9fa48("28973")) {
    {}
  } else {
    stryCov_9fa48("28973");
    const flags = decodeResourceAdvertisementFlags(fields.f);
    return stryMutAct_9fa48("28976") ? fields.q !== null || flags.u : stryMutAct_9fa48("28975") ? false : stryMutAct_9fa48("28974") ? true : (stryCov_9fa48("28974", "28975", "28976"), (stryMutAct_9fa48("28978") ? fields.q === null : stryMutAct_9fa48("28977") ? true : (stryCov_9fa48("28977", "28978"), fields.q !== null)) && flags.u);
  }
}
export function isResourceAdvertisementResponse(fields: ResourceAdvertisementFields): boolean {
  if (stryMutAct_9fa48("28979")) {
    {}
  } else {
    stryCov_9fa48("28979");
    const flags = decodeResourceAdvertisementFlags(fields.f);
    return stryMutAct_9fa48("28982") ? fields.q !== null || flags.p : stryMutAct_9fa48("28981") ? false : stryMutAct_9fa48("28980") ? true : (stryCov_9fa48("28980", "28981", "28982"), (stryMutAct_9fa48("28984") ? fields.q === null : stryMutAct_9fa48("28983") ? true : (stryCov_9fa48("28983", "28984"), fields.q !== null)) && flags.p);
  }
}

/**
 * Resource advertisement flag encoding is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `encodeResourceAdvertisementFlags` reads beside the step).
 */
export type EncodeResourceAdvertisementFlagsState = Record<string, never>;
export type EncodeResourceAdvertisementFlagsEvent = Event | {
  readonly kind: "resource-advertisement/encode-flags-gate";
  readonly flags: ResourceAdvertisementFlags;
};
export type EncodeResourceAdvertisementFlagsAction = {
  readonly kind: "use-flags";
  readonly flags: number;
};
export interface EncodeResourceAdvertisementFlagsStepResult {
  readonly state: EncodeResourceAdvertisementFlagsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeResourceAdvertisementFlagsAction[];
}
export function initialEncodeResourceAdvertisementFlagsState(): EncodeResourceAdvertisementFlagsState {
  if (stryMutAct_9fa48("28985")) {
    {}
  } else {
    stryCov_9fa48("28985");
    return {};
  }
}
export function stepEncodeResourceAdvertisementFlagsWithActions(state: EncodeResourceAdvertisementFlagsState, event: EncodeResourceAdvertisementFlagsEvent): EncodeResourceAdvertisementFlagsStepResult {
  if (stryMutAct_9fa48("28986")) {
    {}
  } else {
    stryCov_9fa48("28986");
    if (stryMutAct_9fa48("28989") ? event.kind !== "resource-advertisement/encode-flags-gate" : stryMutAct_9fa48("28988") ? false : stryMutAct_9fa48("28987") ? true : (stryCov_9fa48("28987", "28988", "28989"), event.kind === (stryMutAct_9fa48("28990") ? "" : (stryCov_9fa48("28990"), "resource-advertisement/encode-flags-gate")))) {
      if (stryMutAct_9fa48("28991")) {
        {}
      } else {
        stryCov_9fa48("28991");
        return stryMutAct_9fa48("28992") ? {} : (stryCov_9fa48("28992"), {
          state,
          intents: stryMutAct_9fa48("28993") ? ["Stryker was here"] : (stryCov_9fa48("28993"), []),
          actions: stryMutAct_9fa48("28994") ? [] : (stryCov_9fa48("28994"), [stryMutAct_9fa48("28995") ? {} : (stryCov_9fa48("28995"), {
            kind: stryMutAct_9fa48("28996") ? "" : (stryCov_9fa48("28996"), "use-flags"),
            flags: encodeResourceAdvertisementFlags(event.flags)
          })])
        });
      }
    }
    return stryMutAct_9fa48("28997") ? {} : (stryCov_9fa48("28997"), {
      state,
      intents: stryMutAct_9fa48("28998") ? ["Stryker was here"] : (stryCov_9fa48("28998"), []),
      actions: stryMutAct_9fa48("28999") ? ["Stryker was here"] : (stryCov_9fa48("28999"), [])
    });
  }
}
export function shouldUseEncodeResourceAdvertisementFlags(actions: ReadonlyArray<EncodeResourceAdvertisementFlagsAction>): boolean {
  if (stryMutAct_9fa48("29000")) {
    {}
  } else {
    stryCov_9fa48("29000");
    return stryMutAct_9fa48("29001") ? actions.every(action => action.kind === "use-flags") : (stryCov_9fa48("29001"), actions.some(stryMutAct_9fa48("29002") ? () => undefined : (stryCov_9fa48("29002"), action => stryMutAct_9fa48("29005") ? action.kind !== "use-flags" : stryMutAct_9fa48("29004") ? false : stryMutAct_9fa48("29003") ? true : (stryCov_9fa48("29003", "29004", "29005"), action.kind === (stryMutAct_9fa48("29006") ? "" : (stryCov_9fa48("29006"), "use-flags"))))));
  }
}

/** Extract packed advertisement flags from step actions; null when no `use-flags`. */
export function encodeResourceAdvertisementFlagsFromActions(actions: ReadonlyArray<EncodeResourceAdvertisementFlagsAction>): number | null {
  if (stryMutAct_9fa48("29007")) {
    {}
  } else {
    stryCov_9fa48("29007");
    const action = actions.find(stryMutAct_9fa48("29008") ? () => undefined : (stryCov_9fa48("29008"), entry => stryMutAct_9fa48("29011") ? entry.kind !== "use-flags" : stryMutAct_9fa48("29010") ? false : stryMutAct_9fa48("29009") ? true : (stryCov_9fa48("29009", "29010", "29011"), entry.kind === (stryMutAct_9fa48("29012") ? "" : (stryCov_9fa48("29012"), "use-flags")))));
    return (stryMutAct_9fa48("29015") ? action?.kind !== "use-flags" : stryMutAct_9fa48("29014") ? false : stryMutAct_9fa48("29013") ? true : (stryCov_9fa48("29013", "29014", "29015"), (stryMutAct_9fa48("29016") ? action.kind : (stryCov_9fa48("29016"), action?.kind)) === (stryMutAct_9fa48("29017") ? "" : (stryCov_9fa48("29017"), "use-flags")))) ? action.flags : null;
  }
}

/**
 * Resource advertisement flag decoding is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `decodeResourceAdvertisementFlags` reads beside the step).
 */
export type DecodeResourceAdvertisementFlagsState = Record<string, never>;
export type DecodeResourceAdvertisementFlagsEvent = Event | {
  readonly kind: "resource-advertisement/decode-flags-gate";
  readonly flags: number;
};
export type DecodeResourceAdvertisementFlagsAction = {
  readonly kind: "use-fields";
  readonly fields: ResourceAdvertisementFlags;
};
export interface DecodeResourceAdvertisementFlagsStepResult {
  readonly state: DecodeResourceAdvertisementFlagsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeResourceAdvertisementFlagsAction[];
}
export function initialDecodeResourceAdvertisementFlagsState(): DecodeResourceAdvertisementFlagsState {
  if (stryMutAct_9fa48("29018")) {
    {}
  } else {
    stryCov_9fa48("29018");
    return {};
  }
}
export function stepDecodeResourceAdvertisementFlagsWithActions(state: DecodeResourceAdvertisementFlagsState, event: DecodeResourceAdvertisementFlagsEvent): DecodeResourceAdvertisementFlagsStepResult {
  if (stryMutAct_9fa48("29019")) {
    {}
  } else {
    stryCov_9fa48("29019");
    if (stryMutAct_9fa48("29022") ? event.kind !== "resource-advertisement/decode-flags-gate" : stryMutAct_9fa48("29021") ? false : stryMutAct_9fa48("29020") ? true : (stryCov_9fa48("29020", "29021", "29022"), event.kind === (stryMutAct_9fa48("29023") ? "" : (stryCov_9fa48("29023"), "resource-advertisement/decode-flags-gate")))) {
      if (stryMutAct_9fa48("29024")) {
        {}
      } else {
        stryCov_9fa48("29024");
        return stryMutAct_9fa48("29025") ? {} : (stryCov_9fa48("29025"), {
          state,
          intents: stryMutAct_9fa48("29026") ? ["Stryker was here"] : (stryCov_9fa48("29026"), []),
          actions: stryMutAct_9fa48("29027") ? [] : (stryCov_9fa48("29027"), [stryMutAct_9fa48("29028") ? {} : (stryCov_9fa48("29028"), {
            kind: stryMutAct_9fa48("29029") ? "" : (stryCov_9fa48("29029"), "use-fields"),
            fields: decodeResourceAdvertisementFlags(event.flags)
          })])
        });
      }
    }
    return stryMutAct_9fa48("29030") ? {} : (stryCov_9fa48("29030"), {
      state,
      intents: stryMutAct_9fa48("29031") ? ["Stryker was here"] : (stryCov_9fa48("29031"), []),
      actions: stryMutAct_9fa48("29032") ? ["Stryker was here"] : (stryCov_9fa48("29032"), [])
    });
  }
}
export function shouldUseDecodeResourceAdvertisementFlags(actions: ReadonlyArray<DecodeResourceAdvertisementFlagsAction>): boolean {
  if (stryMutAct_9fa48("29033")) {
    {}
  } else {
    stryCov_9fa48("29033");
    return stryMutAct_9fa48("29034") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("29034"), actions.some(stryMutAct_9fa48("29035") ? () => undefined : (stryCov_9fa48("29035"), action => stryMutAct_9fa48("29038") ? action.kind !== "use-fields" : stryMutAct_9fa48("29037") ? false : stryMutAct_9fa48("29036") ? true : (stryCov_9fa48("29036", "29037", "29038"), action.kind === (stryMutAct_9fa48("29039") ? "" : (stryCov_9fa48("29039"), "use-fields"))))));
  }
}

/** Extract decoded advertisement flag fields from step actions; null when no `use-fields`. */
export function resourceAdvertisementFlagFieldsFromActions(actions: ReadonlyArray<DecodeResourceAdvertisementFlagsAction>): ResourceAdvertisementFlags | null {
  if (stryMutAct_9fa48("29040")) {
    {}
  } else {
    stryCov_9fa48("29040");
    const action = actions.find(stryMutAct_9fa48("29041") ? () => undefined : (stryCov_9fa48("29041"), entry => stryMutAct_9fa48("29044") ? entry.kind !== "use-fields" : stryMutAct_9fa48("29043") ? false : stryMutAct_9fa48("29042") ? true : (stryCov_9fa48("29042", "29043", "29044"), entry.kind === (stryMutAct_9fa48("29045") ? "" : (stryCov_9fa48("29045"), "use-fields")))));
    return (stryMutAct_9fa48("29048") ? action?.kind !== "use-fields" : stryMutAct_9fa48("29047") ? false : stryMutAct_9fa48("29046") ? true : (stryCov_9fa48("29046", "29047", "29048"), (stryMutAct_9fa48("29049") ? action.kind : (stryCov_9fa48("29049"), action?.kind)) === (stryMutAct_9fa48("29050") ? "" : (stryCov_9fa48("29050"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Resource advertisement request/response classification is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `isResourceAdvertisementRequest` / `isResourceAdvertisementResponse` reads
 * beside the step).
 */
export type ClassifyResourceAdvertisementState = Record<string, never>;
export type ClassifyResourceAdvertisementEvent = Event | {
  readonly kind: "resource-advertisement/classify-gate";
  readonly fields: ResourceAdvertisementFields;
};
export type ClassifyResourceAdvertisementAction = {
  readonly kind: "request";
} | {
  readonly kind: "response";
} | {
  readonly kind: "reject";
};
export interface ClassifyResourceAdvertisementStepResult {
  readonly state: ClassifyResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClassifyResourceAdvertisementAction[];
}
export function initialClassifyResourceAdvertisementState(): ClassifyResourceAdvertisementState {
  if (stryMutAct_9fa48("29051")) {
    {}
  } else {
    stryCov_9fa48("29051");
    return {};
  }
}
export function stepClassifyResourceAdvertisementWithActions(state: ClassifyResourceAdvertisementState, event: ClassifyResourceAdvertisementEvent): ClassifyResourceAdvertisementStepResult {
  if (stryMutAct_9fa48("29052")) {
    {}
  } else {
    stryCov_9fa48("29052");
    if (stryMutAct_9fa48("29055") ? event.kind !== "resource-advertisement/classify-gate" : stryMutAct_9fa48("29054") ? false : stryMutAct_9fa48("29053") ? true : (stryCov_9fa48("29053", "29054", "29055"), event.kind === (stryMutAct_9fa48("29056") ? "" : (stryCov_9fa48("29056"), "resource-advertisement/classify-gate")))) {
      if (stryMutAct_9fa48("29057")) {
        {}
      } else {
        stryCov_9fa48("29057");
        if (stryMutAct_9fa48("29059") ? false : stryMutAct_9fa48("29058") ? true : (stryCov_9fa48("29058", "29059"), isResourceAdvertisementRequest(event.fields))) {
          if (stryMutAct_9fa48("29060")) {
            {}
          } else {
            stryCov_9fa48("29060");
            return stryMutAct_9fa48("29061") ? {} : (stryCov_9fa48("29061"), {
              state,
              intents: stryMutAct_9fa48("29062") ? ["Stryker was here"] : (stryCov_9fa48("29062"), []),
              actions: stryMutAct_9fa48("29063") ? [] : (stryCov_9fa48("29063"), [stryMutAct_9fa48("29064") ? {} : (stryCov_9fa48("29064"), {
                kind: stryMutAct_9fa48("29065") ? "" : (stryCov_9fa48("29065"), "request")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("29067") ? false : stryMutAct_9fa48("29066") ? true : (stryCov_9fa48("29066", "29067"), isResourceAdvertisementResponse(event.fields))) {
          if (stryMutAct_9fa48("29068")) {
            {}
          } else {
            stryCov_9fa48("29068");
            return stryMutAct_9fa48("29069") ? {} : (stryCov_9fa48("29069"), {
              state,
              intents: stryMutAct_9fa48("29070") ? ["Stryker was here"] : (stryCov_9fa48("29070"), []),
              actions: stryMutAct_9fa48("29071") ? [] : (stryCov_9fa48("29071"), [stryMutAct_9fa48("29072") ? {} : (stryCov_9fa48("29072"), {
                kind: stryMutAct_9fa48("29073") ? "" : (stryCov_9fa48("29073"), "response")
              })])
            });
          }
        }
        return stryMutAct_9fa48("29074") ? {} : (stryCov_9fa48("29074"), {
          state,
          intents: stryMutAct_9fa48("29075") ? ["Stryker was here"] : (stryCov_9fa48("29075"), []),
          actions: stryMutAct_9fa48("29076") ? [] : (stryCov_9fa48("29076"), [stryMutAct_9fa48("29077") ? {} : (stryCov_9fa48("29077"), {
            kind: stryMutAct_9fa48("29078") ? "" : (stryCov_9fa48("29078"), "reject")
          })])
        });
      }
    }
    return stryMutAct_9fa48("29079") ? {} : (stryCov_9fa48("29079"), {
      state,
      intents: stryMutAct_9fa48("29080") ? ["Stryker was here"] : (stryCov_9fa48("29080"), []),
      actions: stryMutAct_9fa48("29081") ? ["Stryker was here"] : (stryCov_9fa48("29081"), [])
    });
  }
}
export function shouldClassifyResourceAdvertisementRequest(actions: ReadonlyArray<ClassifyResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("29082")) {
    {}
  } else {
    stryCov_9fa48("29082");
    return stryMutAct_9fa48("29083") ? actions.every(action => action.kind === "request") : (stryCov_9fa48("29083"), actions.some(stryMutAct_9fa48("29084") ? () => undefined : (stryCov_9fa48("29084"), action => stryMutAct_9fa48("29087") ? action.kind !== "request" : stryMutAct_9fa48("29086") ? false : stryMutAct_9fa48("29085") ? true : (stryCov_9fa48("29085", "29086", "29087"), action.kind === (stryMutAct_9fa48("29088") ? "" : (stryCov_9fa48("29088"), "request"))))));
  }
}
export function shouldClassifyResourceAdvertisementResponse(actions: ReadonlyArray<ClassifyResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("29089")) {
    {}
  } else {
    stryCov_9fa48("29089");
    return stryMutAct_9fa48("29090") ? actions.every(action => action.kind === "response") : (stryCov_9fa48("29090"), actions.some(stryMutAct_9fa48("29091") ? () => undefined : (stryCov_9fa48("29091"), action => stryMutAct_9fa48("29094") ? action.kind !== "response" : stryMutAct_9fa48("29093") ? false : stryMutAct_9fa48("29092") ? true : (stryCov_9fa48("29092", "29093", "29094"), action.kind === (stryMutAct_9fa48("29095") ? "" : (stryCov_9fa48("29095"), "response"))))));
  }
}
export function shouldRejectClassifyResourceAdvertisement(actions: ReadonlyArray<ClassifyResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("29096")) {
    {}
  } else {
    stryCov_9fa48("29096");
    return stryMutAct_9fa48("29097") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("29097"), actions.some(stryMutAct_9fa48("29098") ? () => undefined : (stryCov_9fa48("29098"), action => stryMutAct_9fa48("29101") ? action.kind !== "reject" : stryMutAct_9fa48("29100") ? false : stryMutAct_9fa48("29099") ? true : (stryCov_9fa48("29099", "29100", "29101"), action.kind === (stryMutAct_9fa48("29102") ? "" : (stryCov_9fa48("29102"), "reject"))))));
  }
}

/**
 * Plan request (u) / response (p) role flags for a resource advertisement.
 * Encoder packing stays at the adapter edge.
 */
export function planResourceAdvertisementRoleFlags(input: {
  readonly requestIdPresent: boolean;
  readonly isResponse: boolean;
}): {
  readonly u: boolean;
  readonly p: boolean;
} {
  if (stryMutAct_9fa48("29103")) {
    {}
  } else {
    stryCov_9fa48("29103");
    return stryMutAct_9fa48("29104") ? {} : (stryCov_9fa48("29104"), {
      u: stryMutAct_9fa48("29107") ? input.requestIdPresent || !input.isResponse : stryMutAct_9fa48("29106") ? false : stryMutAct_9fa48("29105") ? true : (stryCov_9fa48("29105", "29106", "29107"), input.requestIdPresent && (stryMutAct_9fa48("29108") ? input.isResponse : (stryCov_9fa48("29108"), !input.isResponse))),
      p: stryMutAct_9fa48("29111") ? input.requestIdPresent || input.isResponse : stryMutAct_9fa48("29110") ? false : stryMutAct_9fa48("29109") ? true : (stryCov_9fa48("29109", "29110", "29111"), input.requestIdPresent && input.isResponse)
    });
  }
}

/**
 * Resource advertisement role-flag plan leaf is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `planResourceAdvertisementRoleFlags` reads beside the step). Nested under
 * {@link stepResourceAdvertisementRoleFlagsWithActions}.
 */
export type ResourceAdvertisementRoleFlagsPlanState = Record<string, never>;
export type ResourceAdvertisementRoleFlagsPlanEvent = Event | {
  readonly kind: "resource/advertisement-role-flags-plan-gate";
  readonly requestIdPresent: boolean;
  readonly isResponse: boolean;
};
export type ResourceAdvertisementRoleFlagsPlanAction = {
  readonly kind: "use-flags";
  readonly u: boolean;
  readonly p: boolean;
};
export interface ResourceAdvertisementRoleFlagsPlanStepResult {
  readonly state: ResourceAdvertisementRoleFlagsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAdvertisementRoleFlagsPlanAction[];
}
export function initialResourceAdvertisementRoleFlagsPlanState(): ResourceAdvertisementRoleFlagsPlanState {
  if (stryMutAct_9fa48("29112")) {
    {}
  } else {
    stryCov_9fa48("29112");
    return {};
  }
}
export function stepResourceAdvertisementRoleFlagsPlanWithActions(state: ResourceAdvertisementRoleFlagsPlanState, event: ResourceAdvertisementRoleFlagsPlanEvent): ResourceAdvertisementRoleFlagsPlanStepResult {
  if (stryMutAct_9fa48("29113")) {
    {}
  } else {
    stryCov_9fa48("29113");
    if (stryMutAct_9fa48("29116") ? event.kind !== "resource/advertisement-role-flags-plan-gate" : stryMutAct_9fa48("29115") ? false : stryMutAct_9fa48("29114") ? true : (stryCov_9fa48("29114", "29115", "29116"), event.kind === (stryMutAct_9fa48("29117") ? "" : (stryCov_9fa48("29117"), "resource/advertisement-role-flags-plan-gate")))) {
      if (stryMutAct_9fa48("29118")) {
        {}
      } else {
        stryCov_9fa48("29118");
        const flags = planResourceAdvertisementRoleFlags(stryMutAct_9fa48("29119") ? {} : (stryCov_9fa48("29119"), {
          requestIdPresent: event.requestIdPresent,
          isResponse: event.isResponse
        }));
        return stryMutAct_9fa48("29120") ? {} : (stryCov_9fa48("29120"), {
          state,
          intents: stryMutAct_9fa48("29121") ? ["Stryker was here"] : (stryCov_9fa48("29121"), []),
          actions: stryMutAct_9fa48("29122") ? [] : (stryCov_9fa48("29122"), [stryMutAct_9fa48("29123") ? {} : (stryCov_9fa48("29123"), {
            kind: stryMutAct_9fa48("29124") ? "" : (stryCov_9fa48("29124"), "use-flags"),
            u: flags.u,
            p: flags.p
          })])
        });
      }
    }
    return stryMutAct_9fa48("29125") ? {} : (stryCov_9fa48("29125"), {
      state,
      intents: stryMutAct_9fa48("29126") ? ["Stryker was here"] : (stryCov_9fa48("29126"), []),
      actions: stryMutAct_9fa48("29127") ? ["Stryker was here"] : (stryCov_9fa48("29127"), [])
    });
  }
}
export function shouldUseResourceAdvertisementRoleFlagsPlan(actions: ReadonlyArray<ResourceAdvertisementRoleFlagsPlanAction>): boolean {
  if (stryMutAct_9fa48("29128")) {
    {}
  } else {
    stryCov_9fa48("29128");
    return stryMutAct_9fa48("29129") ? actions.every(action => action.kind === "use-flags") : (stryCov_9fa48("29129"), actions.some(stryMutAct_9fa48("29130") ? () => undefined : (stryCov_9fa48("29130"), action => stryMutAct_9fa48("29133") ? action.kind !== "use-flags" : stryMutAct_9fa48("29132") ? false : stryMutAct_9fa48("29131") ? true : (stryCov_9fa48("29131", "29132", "29133"), action.kind === (stryMutAct_9fa48("29134") ? "" : (stryCov_9fa48("29134"), "use-flags"))))));
  }
}

/** Extract role flags from plan actions; null when no `use-flags` action. */
export function resourceAdvertisementRoleFlagsPlanFromActions(actions: ReadonlyArray<ResourceAdvertisementRoleFlagsPlanAction>): {
  readonly u: boolean;
  readonly p: boolean;
} | null {
  if (stryMutAct_9fa48("29135")) {
    {}
  } else {
    stryCov_9fa48("29135");
    const action = actions.find(stryMutAct_9fa48("29136") ? () => undefined : (stryCov_9fa48("29136"), entry => stryMutAct_9fa48("29139") ? entry.kind !== "use-flags" : stryMutAct_9fa48("29138") ? false : stryMutAct_9fa48("29137") ? true : (stryCov_9fa48("29137", "29138", "29139"), entry.kind === (stryMutAct_9fa48("29140") ? "" : (stryCov_9fa48("29140"), "use-flags")))));
    return (stryMutAct_9fa48("29143") ? action?.kind !== "use-flags" : stryMutAct_9fa48("29142") ? false : stryMutAct_9fa48("29141") ? true : (stryCov_9fa48("29141", "29142", "29143"), (stryMutAct_9fa48("29144") ? action.kind : (stryCov_9fa48("29144"), action?.kind)) === (stryMutAct_9fa48("29145") ? "" : (stryCov_9fa48("29145"), "use-flags")))) ? stryMutAct_9fa48("29146") ? {} : (stryCov_9fa48("29146"), {
      u: action.u,
      p: action.p
    }) : null;
  }
}

/**
 * Resource advertisement role-flag selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planResourceAdvertisementRoleFlags` reads beside the step).
 * Plan nested via {@link stepResourceAdvertisementRoleFlagsPlanWithActions}
 * (`use-flags`).
 */
export type ResourceAdvertisementRoleFlagsState = Record<string, never>;
export type ResourceAdvertisementRoleFlagsEvent = Event | {
  readonly kind: "resource/advertisement-role-flags-gate";
  readonly requestIdPresent: boolean;
  readonly isResponse: boolean;
};
export type ResourceAdvertisementRoleFlagsAction = {
  readonly kind: "use-flags";
  readonly u: boolean;
  readonly p: boolean;
};
export interface ResourceAdvertisementRoleFlagsStepResult {
  readonly state: ResourceAdvertisementRoleFlagsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAdvertisementRoleFlagsAction[];
}
export function initialResourceAdvertisementRoleFlagsState(): ResourceAdvertisementRoleFlagsState {
  if (stryMutAct_9fa48("29147")) {
    {}
  } else {
    stryCov_9fa48("29147");
    return {};
  }
}
export function stepResourceAdvertisementRoleFlagsWithActions(state: ResourceAdvertisementRoleFlagsState, event: ResourceAdvertisementRoleFlagsEvent): ResourceAdvertisementRoleFlagsStepResult {
  if (stryMutAct_9fa48("29148")) {
    {}
  } else {
    stryCov_9fa48("29148");
    if (stryMutAct_9fa48("29151") ? event.kind !== "resource/advertisement-role-flags-gate" : stryMutAct_9fa48("29150") ? false : stryMutAct_9fa48("29149") ? true : (stryCov_9fa48("29149", "29150", "29151"), event.kind === (stryMutAct_9fa48("29152") ? "" : (stryCov_9fa48("29152"), "resource/advertisement-role-flags-gate")))) {
      if (stryMutAct_9fa48("29153")) {
        {}
      } else {
        stryCov_9fa48("29153");
        const planActions = stepResourceAdvertisementRoleFlagsPlanWithActions(initialResourceAdvertisementRoleFlagsPlanState(), stryMutAct_9fa48("29154") ? {} : (stryCov_9fa48("29154"), {
          kind: stryMutAct_9fa48("29155") ? "" : (stryCov_9fa48("29155"), "resource/advertisement-role-flags-plan-gate"),
          requestIdPresent: event.requestIdPresent,
          isResponse: event.isResponse
        })).actions;
        const flags = resourceAdvertisementRoleFlagsPlanFromActions(planActions);
        if (stryMutAct_9fa48("29158") ? flags !== null : stryMutAct_9fa48("29157") ? false : stryMutAct_9fa48("29156") ? true : (stryCov_9fa48("29156", "29157", "29158"), flags === null)) {
          if (stryMutAct_9fa48("29159")) {
            {}
          } else {
            stryCov_9fa48("29159");
            return stryMutAct_9fa48("29160") ? {} : (stryCov_9fa48("29160"), {
              state,
              intents: stryMutAct_9fa48("29161") ? ["Stryker was here"] : (stryCov_9fa48("29161"), []),
              actions: stryMutAct_9fa48("29162") ? ["Stryker was here"] : (stryCov_9fa48("29162"), [])
            });
          }
        }
        return stryMutAct_9fa48("29163") ? {} : (stryCov_9fa48("29163"), {
          state,
          intents: stryMutAct_9fa48("29164") ? ["Stryker was here"] : (stryCov_9fa48("29164"), []),
          actions: stryMutAct_9fa48("29165") ? [] : (stryCov_9fa48("29165"), [stryMutAct_9fa48("29166") ? {} : (stryCov_9fa48("29166"), {
            kind: stryMutAct_9fa48("29167") ? "" : (stryCov_9fa48("29167"), "use-flags"),
            u: flags.u,
            p: flags.p
          })])
        });
      }
    }
    return stryMutAct_9fa48("29168") ? {} : (stryCov_9fa48("29168"), {
      state,
      intents: stryMutAct_9fa48("29169") ? ["Stryker was here"] : (stryCov_9fa48("29169"), []),
      actions: stryMutAct_9fa48("29170") ? ["Stryker was here"] : (stryCov_9fa48("29170"), [])
    });
  }
}
export function shouldUseResourceAdvertisementRoleFlags(actions: ReadonlyArray<ResourceAdvertisementRoleFlagsAction>): boolean {
  if (stryMutAct_9fa48("29171")) {
    {}
  } else {
    stryCov_9fa48("29171");
    return stryMutAct_9fa48("29172") ? actions.every(action => action.kind === "use-flags") : (stryCov_9fa48("29172"), actions.some(stryMutAct_9fa48("29173") ? () => undefined : (stryCov_9fa48("29173"), action => stryMutAct_9fa48("29176") ? action.kind !== "use-flags" : stryMutAct_9fa48("29175") ? false : stryMutAct_9fa48("29174") ? true : (stryCov_9fa48("29174", "29175", "29176"), action.kind === (stryMutAct_9fa48("29177") ? "" : (stryCov_9fa48("29177"), "use-flags"))))));
  }
}

/** Extract role flags from step actions; null when no `use-flags` action. */
export function resourceAdvertisementRoleFlagsFromActions(actions: ReadonlyArray<ResourceAdvertisementRoleFlagsAction>): {
  readonly u: boolean;
  readonly p: boolean;
} | null {
  if (stryMutAct_9fa48("29178")) {
    {}
  } else {
    stryCov_9fa48("29178");
    const action = actions.find(stryMutAct_9fa48("29179") ? () => undefined : (stryCov_9fa48("29179"), entry => stryMutAct_9fa48("29182") ? entry.kind !== "use-flags" : stryMutAct_9fa48("29181") ? false : stryMutAct_9fa48("29180") ? true : (stryCov_9fa48("29180", "29181", "29182"), entry.kind === (stryMutAct_9fa48("29183") ? "" : (stryCov_9fa48("29183"), "use-flags")))));
    return (stryMutAct_9fa48("29186") ? action?.kind !== "use-flags" : stryMutAct_9fa48("29185") ? false : stryMutAct_9fa48("29184") ? true : (stryCov_9fa48("29184", "29185", "29186"), (stryMutAct_9fa48("29187") ? action.kind : (stryCov_9fa48("29187"), action?.kind)) === (stryMutAct_9fa48("29188") ? "" : (stryCov_9fa48("29188"), "use-flags")))) ? stryMutAct_9fa48("29189") ? {} : (stryCov_9fa48("29189"), {
      u: action.u,
      p: action.p
    }) : null;
  }
}

/**
 * Resource advertisement pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceAdvertisement`
 * reads beside the step).
 */
export type PackResourceAdvertisementState = Record<string, never>;
export type PackResourceAdvertisementEvent = Event | {
  readonly kind: "resource-advertisement/pack-gate";
  readonly fields: ResourceAdvertisementFields;
};
export type PackResourceAdvertisementAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackResourceAdvertisementStepResult {
  readonly state: PackResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceAdvertisementAction[];
}
export function initialPackResourceAdvertisementState(): PackResourceAdvertisementState {
  if (stryMutAct_9fa48("29190")) {
    {}
  } else {
    stryCov_9fa48("29190");
    return {};
  }
}
export function stepPackResourceAdvertisementWithActions(state: PackResourceAdvertisementState, event: PackResourceAdvertisementEvent): PackResourceAdvertisementStepResult {
  if (stryMutAct_9fa48("29191")) {
    {}
  } else {
    stryCov_9fa48("29191");
    if (stryMutAct_9fa48("29194") ? event.kind !== "resource-advertisement/pack-gate" : stryMutAct_9fa48("29193") ? false : stryMutAct_9fa48("29192") ? true : (stryCov_9fa48("29192", "29193", "29194"), event.kind === (stryMutAct_9fa48("29195") ? "" : (stryCov_9fa48("29195"), "resource-advertisement/pack-gate")))) {
      if (stryMutAct_9fa48("29196")) {
        {}
      } else {
        stryCov_9fa48("29196");
        return stryMutAct_9fa48("29197") ? {} : (stryCov_9fa48("29197"), {
          state,
          intents: stryMutAct_9fa48("29198") ? ["Stryker was here"] : (stryCov_9fa48("29198"), []),
          actions: stryMutAct_9fa48("29199") ? [] : (stryCov_9fa48("29199"), [stryMutAct_9fa48("29200") ? {} : (stryCov_9fa48("29200"), {
            kind: stryMutAct_9fa48("29201") ? "" : (stryCov_9fa48("29201"), "use-raw"),
            raw: packResourceAdvertisement(event.fields)
          })])
        });
      }
    }
    return stryMutAct_9fa48("29202") ? {} : (stryCov_9fa48("29202"), {
      state,
      intents: stryMutAct_9fa48("29203") ? ["Stryker was here"] : (stryCov_9fa48("29203"), []),
      actions: stryMutAct_9fa48("29204") ? ["Stryker was here"] : (stryCov_9fa48("29204"), [])
    });
  }
}
export function shouldUsePackResourceAdvertisement(actions: ReadonlyArray<PackResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("29205")) {
    {}
  } else {
    stryCov_9fa48("29205");
    return stryMutAct_9fa48("29206") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("29206"), actions.some(stryMutAct_9fa48("29207") ? () => undefined : (stryCov_9fa48("29207"), action => stryMutAct_9fa48("29210") ? action.kind !== "use-raw" : stryMutAct_9fa48("29209") ? false : stryMutAct_9fa48("29208") ? true : (stryCov_9fa48("29208", "29209", "29210"), action.kind === (stryMutAct_9fa48("29211") ? "" : (stryCov_9fa48("29211"), "use-raw"))))));
  }
}

/** Extract advertisement pack bytes from step actions; null when no `use-raw`. */
export function packResourceAdvertisementRawFromActions(actions: ReadonlyArray<PackResourceAdvertisementAction>): Uint8Array | null {
  if (stryMutAct_9fa48("29212")) {
    {}
  } else {
    stryCov_9fa48("29212");
    const action = actions.find(stryMutAct_9fa48("29213") ? () => undefined : (stryCov_9fa48("29213"), entry => stryMutAct_9fa48("29216") ? entry.kind !== "use-raw" : stryMutAct_9fa48("29215") ? false : stryMutAct_9fa48("29214") ? true : (stryCov_9fa48("29214", "29215", "29216"), entry.kind === (stryMutAct_9fa48("29217") ? "" : (stryCov_9fa48("29217"), "use-raw")))));
    return (stryMutAct_9fa48("29220") ? action?.kind !== "use-raw" : stryMutAct_9fa48("29219") ? false : stryMutAct_9fa48("29218") ? true : (stryCov_9fa48("29218", "29219", "29220"), (stryMutAct_9fa48("29221") ? action.kind : (stryCov_9fa48("29221"), action?.kind)) === (stryMutAct_9fa48("29222") ? "" : (stryCov_9fa48("29222"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource advertisement unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackResourceAdvertisement`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackResourceAdvertisementState = Record<string, never>;
export type UnpackResourceAdvertisementEvent = Event | {
  readonly kind: "resource-advertisement/unpack-gate";
  readonly data: Uint8Array;
};
export type UnpackResourceAdvertisementAction = {
  readonly kind: "use-fields";
  readonly fields: ResourceAdvertisementFields;
} | {
  readonly kind: "reject";
};
export interface UnpackResourceAdvertisementStepResult {
  readonly state: UnpackResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackResourceAdvertisementAction[];
}
export function initialUnpackResourceAdvertisementState(): UnpackResourceAdvertisementState {
  if (stryMutAct_9fa48("29223")) {
    {}
  } else {
    stryCov_9fa48("29223");
    return {};
  }
}
export function stepUnpackResourceAdvertisementWithActions(state: UnpackResourceAdvertisementState, event: UnpackResourceAdvertisementEvent): UnpackResourceAdvertisementStepResult {
  if (stryMutAct_9fa48("29224")) {
    {}
  } else {
    stryCov_9fa48("29224");
    if (stryMutAct_9fa48("29227") ? event.kind !== "resource-advertisement/unpack-gate" : stryMutAct_9fa48("29226") ? false : stryMutAct_9fa48("29225") ? true : (stryCov_9fa48("29225", "29226", "29227"), event.kind === (stryMutAct_9fa48("29228") ? "" : (stryCov_9fa48("29228"), "resource-advertisement/unpack-gate")))) {
      if (stryMutAct_9fa48("29229")) {
        {}
      } else {
        stryCov_9fa48("29229");
        try {
          if (stryMutAct_9fa48("29230")) {
            {}
          } else {
            stryCov_9fa48("29230");
            const fields = unpackResourceAdvertisement(event.data);
            return stryMutAct_9fa48("29231") ? {} : (stryCov_9fa48("29231"), {
              state,
              intents: stryMutAct_9fa48("29232") ? ["Stryker was here"] : (stryCov_9fa48("29232"), []),
              actions: stryMutAct_9fa48("29233") ? [] : (stryCov_9fa48("29233"), [stryMutAct_9fa48("29234") ? {} : (stryCov_9fa48("29234"), {
                kind: stryMutAct_9fa48("29235") ? "" : (stryCov_9fa48("29235"), "use-fields"),
                fields
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("29236")) {
            {}
          } else {
            stryCov_9fa48("29236");
            return stryMutAct_9fa48("29237") ? {} : (stryCov_9fa48("29237"), {
              state,
              intents: stryMutAct_9fa48("29238") ? ["Stryker was here"] : (stryCov_9fa48("29238"), []),
              actions: stryMutAct_9fa48("29239") ? [] : (stryCov_9fa48("29239"), [stryMutAct_9fa48("29240") ? {} : (stryCov_9fa48("29240"), {
                kind: stryMutAct_9fa48("29241") ? "" : (stryCov_9fa48("29241"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("29242") ? {} : (stryCov_9fa48("29242"), {
      state,
      intents: stryMutAct_9fa48("29243") ? ["Stryker was here"] : (stryCov_9fa48("29243"), []),
      actions: stryMutAct_9fa48("29244") ? ["Stryker was here"] : (stryCov_9fa48("29244"), [])
    });
  }
}
export function shouldUseUnpackResourceAdvertisement(actions: ReadonlyArray<UnpackResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("29245")) {
    {}
  } else {
    stryCov_9fa48("29245");
    return stryMutAct_9fa48("29246") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("29246"), actions.some(stryMutAct_9fa48("29247") ? () => undefined : (stryCov_9fa48("29247"), action => stryMutAct_9fa48("29250") ? action.kind !== "use-fields" : stryMutAct_9fa48("29249") ? false : stryMutAct_9fa48("29248") ? true : (stryCov_9fa48("29248", "29249", "29250"), action.kind === (stryMutAct_9fa48("29251") ? "" : (stryCov_9fa48("29251"), "use-fields"))))));
  }
}
export function shouldRejectUnpackResourceAdvertisement(actions: ReadonlyArray<UnpackResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("29252")) {
    {}
  } else {
    stryCov_9fa48("29252");
    return stryMutAct_9fa48("29253") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("29253"), actions.some(stryMutAct_9fa48("29254") ? () => undefined : (stryCov_9fa48("29254"), action => stryMutAct_9fa48("29257") ? action.kind !== "reject" : stryMutAct_9fa48("29256") ? false : stryMutAct_9fa48("29255") ? true : (stryCov_9fa48("29255", "29256", "29257"), action.kind === (stryMutAct_9fa48("29258") ? "" : (stryCov_9fa48("29258"), "reject"))))));
  }
}

/** Extract unpacked advertisement fields from step actions; null when no `use-fields`. */
export function resourceAdvertisementFieldsFromActions(actions: ReadonlyArray<UnpackResourceAdvertisementAction>): ResourceAdvertisementFields | null {
  if (stryMutAct_9fa48("29259")) {
    {}
  } else {
    stryCov_9fa48("29259");
    const action = actions.find(stryMutAct_9fa48("29260") ? () => undefined : (stryCov_9fa48("29260"), entry => stryMutAct_9fa48("29263") ? entry.kind !== "use-fields" : stryMutAct_9fa48("29262") ? false : stryMutAct_9fa48("29261") ? true : (stryCov_9fa48("29261", "29262", "29263"), entry.kind === (stryMutAct_9fa48("29264") ? "" : (stryCov_9fa48("29264"), "use-fields")))));
    return (stryMutAct_9fa48("29267") ? action?.kind !== "use-fields" : stryMutAct_9fa48("29266") ? false : stryMutAct_9fa48("29265") ? true : (stryCov_9fa48("29265", "29266", "29267"), (stryMutAct_9fa48("29268") ? action.kind : (stryCov_9fa48("29268"), action?.kind)) === (stryMutAct_9fa48("29269") ? "" : (stryCov_9fa48("29269"), "use-fields")))) ? action.fields : null;
  }
}