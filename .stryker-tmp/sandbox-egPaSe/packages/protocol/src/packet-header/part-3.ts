/** Extracted from packet-header.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS packet header flag packing, raw encode/decode, and hashable-part framing.
 * Crypto hashing stays at the adapter edge.
 * fromFields conclusions leave via machine actions (no ad-hoc
 * `planPacketFromFields` / `plan ===` reads beside the step).
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodePacketRaw` / `decodePacketRaw` reads beside the step).
 * Flag pack / unpack and hashable-part conclusions leave via machine actions
 * (no ad-hoc `packPacketFlags` / `unpackPacketFlags` / `packetHashablePart`
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
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PACKET_HEADER_1, PACKET_HEADER_2, TRANSPORT_BROADCAST, TRANSPORT_ID_BYTES, TRANSPORT_TRANSPORT } from "../transport-framing.js";
import { decodePacketRaw } from "./part-2.js";
import type { PacketHeaderFields } from "./part-1.js";
import type { DecodePacketRawState } from "./part-2.js";
export type DecodePacketRawEvent = Event | {
  readonly kind: "packet-header/decode-gate";
  readonly raw: Uint8Array;
};
export type DecodePacketRawAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
} | {
  readonly kind: "reject";
};
export interface DecodePacketRawStepResult {
  readonly state: DecodePacketRawState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodePacketRawAction[];
}
export function initialDecodePacketRawState(): DecodePacketRawState {
  if (stryMutAct_9fa48("23467")) {
    {}
  } else {
    stryCov_9fa48("23467");
    return {};
  }
}
export function stepDecodePacketRawWithActions(state: DecodePacketRawState, event: DecodePacketRawEvent): DecodePacketRawStepResult {
  if (stryMutAct_9fa48("23468")) {
    {}
  } else {
    stryCov_9fa48("23468");
    if (stryMutAct_9fa48("23471") ? event.kind !== "packet-header/decode-gate" : stryMutAct_9fa48("23470") ? false : stryMutAct_9fa48("23469") ? true : (stryCov_9fa48("23469", "23470", "23471"), event.kind === (stryMutAct_9fa48("23472") ? "" : (stryCov_9fa48("23472"), "packet-header/decode-gate")))) {
      if (stryMutAct_9fa48("23473")) {
        {}
      } else {
        stryCov_9fa48("23473");
        const fields = decodePacketRaw(event.raw);
        if (stryMutAct_9fa48("23476") ? fields !== null : stryMutAct_9fa48("23475") ? false : stryMutAct_9fa48("23474") ? true : (stryCov_9fa48("23474", "23475", "23476"), fields === null)) {
          if (stryMutAct_9fa48("23477")) {
            {}
          } else {
            stryCov_9fa48("23477");
            return stryMutAct_9fa48("23478") ? {} : (stryCov_9fa48("23478"), {
              state,
              intents: stryMutAct_9fa48("23479") ? ["Stryker was here"] : (stryCov_9fa48("23479"), []),
              actions: stryMutAct_9fa48("23480") ? [] : (stryCov_9fa48("23480"), [stryMutAct_9fa48("23481") ? {} : (stryCov_9fa48("23481"), {
                kind: stryMutAct_9fa48("23482") ? "" : (stryCov_9fa48("23482"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("23483") ? {} : (stryCov_9fa48("23483"), {
          state,
          intents: stryMutAct_9fa48("23484") ? ["Stryker was here"] : (stryCov_9fa48("23484"), []),
          actions: stryMutAct_9fa48("23485") ? [] : (stryCov_9fa48("23485"), [stryMutAct_9fa48("23486") ? {} : (stryCov_9fa48("23486"), {
            kind: stryMutAct_9fa48("23487") ? "" : (stryCov_9fa48("23487"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("23488") ? {} : (stryCov_9fa48("23488"), {
      state,
      intents: stryMutAct_9fa48("23489") ? ["Stryker was here"] : (stryCov_9fa48("23489"), []),
      actions: stryMutAct_9fa48("23490") ? ["Stryker was here"] : (stryCov_9fa48("23490"), [])
    });
  }
}
export function shouldUseDecodePacketRaw(actions: ReadonlyArray<DecodePacketRawAction>): boolean {
  if (stryMutAct_9fa48("23491")) {
    {}
  } else {
    stryCov_9fa48("23491");
    return stryMutAct_9fa48("23492") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("23492"), actions.some(stryMutAct_9fa48("23493") ? () => undefined : (stryCov_9fa48("23493"), action => stryMutAct_9fa48("23496") ? action.kind !== "use-fields" : stryMutAct_9fa48("23495") ? false : stryMutAct_9fa48("23494") ? true : (stryCov_9fa48("23494", "23495", "23496"), action.kind === (stryMutAct_9fa48("23497") ? "" : (stryCov_9fa48("23497"), "use-fields"))))));
  }
}
export function shouldRejectDecodePacketRaw(actions: ReadonlyArray<DecodePacketRawAction>): boolean {
  if (stryMutAct_9fa48("23498")) {
    {}
  } else {
    stryCov_9fa48("23498");
    return stryMutAct_9fa48("23499") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("23499"), actions.some(stryMutAct_9fa48("23500") ? () => undefined : (stryCov_9fa48("23500"), action => stryMutAct_9fa48("23503") ? action.kind !== "reject" : stryMutAct_9fa48("23502") ? false : stryMutAct_9fa48("23501") ? true : (stryCov_9fa48("23501", "23502", "23503"), action.kind === (stryMutAct_9fa48("23504") ? "" : (stryCov_9fa48("23504"), "reject"))))));
  }
}

/** Extract decoded packet header fields from step actions; null when no `use-fields`. */
export function packetHeaderFieldsFromActions(actions: ReadonlyArray<DecodePacketRawAction>): PacketHeaderFields | null {
  if (stryMutAct_9fa48("23505")) {
    {}
  } else {
    stryCov_9fa48("23505");
    const action = actions.find(stryMutAct_9fa48("23506") ? () => undefined : (stryCov_9fa48("23506"), entry => stryMutAct_9fa48("23509") ? entry.kind !== "use-fields" : stryMutAct_9fa48("23508") ? false : stryMutAct_9fa48("23507") ? true : (stryCov_9fa48("23507", "23508", "23509"), entry.kind === (stryMutAct_9fa48("23510") ? "" : (stryCov_9fa48("23510"), "use-fields")))));
    return (stryMutAct_9fa48("23513") ? action?.kind !== "use-fields" : stryMutAct_9fa48("23512") ? false : stryMutAct_9fa48("23511") ? true : (stryCov_9fa48("23511", "23512", "23513"), (stryMutAct_9fa48("23514") ? action.kind : (stryCov_9fa48("23514"), action?.kind)) === (stryMutAct_9fa48("23515") ? "" : (stryCov_9fa48("23515"), "use-fields")))) ? action.fields : null;
  }
}