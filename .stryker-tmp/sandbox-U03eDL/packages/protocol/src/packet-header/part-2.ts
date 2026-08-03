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
import { concatBytes, isContextFlag, isDestinationTypeCode, isHeaderType, isPacketType, isTransportType, packPacketFlags, stepPacketFromFieldsInner, unpackPacketFlags } from "./part-1.js";
import type { PacketFromFieldsAction, PacketFromFieldsEvent, PacketFromFieldsState, PacketHeaderFields } from "./part-1.js";
export function initialPacketFromFieldsState(): PacketFromFieldsState {
  if (stryMutAct_9fa48("23173")) {
    {}
  } else {
    stryCov_9fa48("23173");
    return {};
  }
}
export const stepPacketFromFields: StepFn<PacketFromFieldsState> = (state, event) => {
  if (stryMutAct_9fa48("23174")) {
    {}
  } else {
    stryCov_9fa48("23174");
    const result = stepPacketFromFieldsInner(state, event as PacketFromFieldsEvent);
    return stryMutAct_9fa48("23175") ? {} : (stryCov_9fa48("23175"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function shouldProceedPacketFromFields(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23176")) {
    {}
  } else {
    stryCov_9fa48("23176");
    return stryMutAct_9fa48("23177") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("23177"), actions.some(stryMutAct_9fa48("23178") ? () => undefined : (stryCov_9fa48("23178"), action => stryMutAct_9fa48("23181") ? action.kind !== "ok" : stryMutAct_9fa48("23180") ? false : stryMutAct_9fa48("23179") ? true : (stryCov_9fa48("23179", "23180", "23181"), action.kind === (stryMutAct_9fa48("23182") ? "" : (stryCov_9fa48("23182"), "ok"))))));
  }
}
export function shouldRejectPacketFromFieldsBadHeaderType(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23183")) {
    {}
  } else {
    stryCov_9fa48("23183");
    return stryMutAct_9fa48("23184") ? actions.every(action => action.kind === "bad-header-type") : (stryCov_9fa48("23184"), actions.some(stryMutAct_9fa48("23185") ? () => undefined : (stryCov_9fa48("23185"), action => stryMutAct_9fa48("23188") ? action.kind !== "bad-header-type" : stryMutAct_9fa48("23187") ? false : stryMutAct_9fa48("23186") ? true : (stryCov_9fa48("23186", "23187", "23188"), action.kind === (stryMutAct_9fa48("23189") ? "" : (stryCov_9fa48("23189"), "bad-header-type"))))));
  }
}
export function shouldRejectPacketFromFieldsBadContextFlag(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23190")) {
    {}
  } else {
    stryCov_9fa48("23190");
    return stryMutAct_9fa48("23191") ? actions.every(action => action.kind === "bad-context-flag") : (stryCov_9fa48("23191"), actions.some(stryMutAct_9fa48("23192") ? () => undefined : (stryCov_9fa48("23192"), action => stryMutAct_9fa48("23195") ? action.kind !== "bad-context-flag" : stryMutAct_9fa48("23194") ? false : stryMutAct_9fa48("23193") ? true : (stryCov_9fa48("23193", "23194", "23195"), action.kind === (stryMutAct_9fa48("23196") ? "" : (stryCov_9fa48("23196"), "bad-context-flag"))))));
  }
}
export function shouldRejectPacketFromFieldsBadTransportType(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23197")) {
    {}
  } else {
    stryCov_9fa48("23197");
    return stryMutAct_9fa48("23198") ? actions.every(action => action.kind === "bad-transport-type") : (stryCov_9fa48("23198"), actions.some(stryMutAct_9fa48("23199") ? () => undefined : (stryCov_9fa48("23199"), action => stryMutAct_9fa48("23202") ? action.kind !== "bad-transport-type" : stryMutAct_9fa48("23201") ? false : stryMutAct_9fa48("23200") ? true : (stryCov_9fa48("23200", "23201", "23202"), action.kind === (stryMutAct_9fa48("23203") ? "" : (stryCov_9fa48("23203"), "bad-transport-type"))))));
  }
}
export function shouldRejectPacketFromFieldsBadDestinationType(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23204")) {
    {}
  } else {
    stryCov_9fa48("23204");
    return stryMutAct_9fa48("23205") ? actions.every(action => action.kind === "bad-destination-type") : (stryCov_9fa48("23205"), actions.some(stryMutAct_9fa48("23206") ? () => undefined : (stryCov_9fa48("23206"), action => stryMutAct_9fa48("23209") ? action.kind !== "bad-destination-type" : stryMutAct_9fa48("23208") ? false : stryMutAct_9fa48("23207") ? true : (stryCov_9fa48("23207", "23208", "23209"), action.kind === (stryMutAct_9fa48("23210") ? "" : (stryCov_9fa48("23210"), "bad-destination-type"))))));
  }
}
export function shouldRejectPacketFromFieldsBadPacketType(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23211")) {
    {}
  } else {
    stryCov_9fa48("23211");
    return stryMutAct_9fa48("23212") ? actions.every(action => action.kind === "bad-packet-type") : (stryCov_9fa48("23212"), actions.some(stryMutAct_9fa48("23213") ? () => undefined : (stryCov_9fa48("23213"), action => stryMutAct_9fa48("23216") ? action.kind !== "bad-packet-type" : stryMutAct_9fa48("23215") ? false : stryMutAct_9fa48("23214") ? true : (stryCov_9fa48("23214", "23215", "23216"), action.kind === (stryMutAct_9fa48("23217") ? "" : (stryCov_9fa48("23217"), "bad-packet-type"))))));
  }
}
export function shouldRejectPacketFromFieldsBadDestinationHash(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23218")) {
    {}
  } else {
    stryCov_9fa48("23218");
    return stryMutAct_9fa48("23219") ? actions.every(action => action.kind === "bad-destination-hash") : (stryCov_9fa48("23219"), actions.some(stryMutAct_9fa48("23220") ? () => undefined : (stryCov_9fa48("23220"), action => stryMutAct_9fa48("23223") ? action.kind !== "bad-destination-hash" : stryMutAct_9fa48("23222") ? false : stryMutAct_9fa48("23221") ? true : (stryCov_9fa48("23221", "23222", "23223"), action.kind === (stryMutAct_9fa48("23224") ? "" : (stryCov_9fa48("23224"), "bad-destination-hash"))))));
  }
}
export function shouldRejectPacketFromFieldsHeader2MissingTransportId(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23225")) {
    {}
  } else {
    stryCov_9fa48("23225");
    return stryMutAct_9fa48("23226") ? actions.every(action => action.kind === "header2-missing-transport-id") : (stryCov_9fa48("23226"), actions.some(stryMutAct_9fa48("23227") ? () => undefined : (stryCov_9fa48("23227"), action => stryMutAct_9fa48("23230") ? action.kind !== "header2-missing-transport-id" : stryMutAct_9fa48("23229") ? false : stryMutAct_9fa48("23228") ? true : (stryCov_9fa48("23228", "23229", "23230"), action.kind === (stryMutAct_9fa48("23231") ? "" : (stryCov_9fa48("23231"), "header2-missing-transport-id"))))));
  }
}
export function shouldRejectPacketFromFieldsBadTransportId(actions: ReadonlyArray<PacketFromFieldsAction>): boolean {
  if (stryMutAct_9fa48("23232")) {
    {}
  } else {
    stryCov_9fa48("23232");
    return stryMutAct_9fa48("23233") ? actions.every(action => action.kind === "bad-transport-id") : (stryCov_9fa48("23233"), actions.some(stryMutAct_9fa48("23234") ? () => undefined : (stryCov_9fa48("23234"), action => stryMutAct_9fa48("23237") ? action.kind !== "bad-transport-id" : stryMutAct_9fa48("23236") ? false : stryMutAct_9fa48("23235") ? true : (stryCov_9fa48("23235", "23236", "23237"), action.kind === (stryMutAct_9fa48("23238") ? "" : (stryCov_9fa48("23238"), "bad-transport-id"))))));
  }
}
export function encodePacketRaw(fields: {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
  readonly hops: number;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
  readonly transportId: Uint8Array | null;
}): Uint8Array {
  if (stryMutAct_9fa48("23239")) {
    {}
  } else {
    stryCov_9fa48("23239");
    if (stryMutAct_9fa48("23242") ? fields.destinationHash.length === TRANSPORT_ID_BYTES : stryMutAct_9fa48("23241") ? false : stryMutAct_9fa48("23240") ? true : (stryCov_9fa48("23240", "23241", "23242"), fields.destinationHash.length !== TRANSPORT_ID_BYTES)) {
      if (stryMutAct_9fa48("23243")) {
        {}
      } else {
        stryCov_9fa48("23243");
        throw new Error(stryMutAct_9fa48("23244") ? `` : (stryCov_9fa48("23244"), `destination hash must be ${TRANSPORT_ID_BYTES} bytes`));
      }
    }
    if (stryMutAct_9fa48("23247") ? fields.headerType !== PACKET_HEADER_2 : stryMutAct_9fa48("23246") ? false : stryMutAct_9fa48("23245") ? true : (stryCov_9fa48("23245", "23246", "23247"), fields.headerType === PACKET_HEADER_2)) {
      if (stryMutAct_9fa48("23248")) {
        {}
      } else {
        stryCov_9fa48("23248");
        if (stryMutAct_9fa48("23251") ? fields.transportId === null && fields.transportId.length !== TRANSPORT_ID_BYTES : stryMutAct_9fa48("23250") ? false : stryMutAct_9fa48("23249") ? true : (stryCov_9fa48("23249", "23250", "23251"), (stryMutAct_9fa48("23253") ? fields.transportId !== null : stryMutAct_9fa48("23252") ? false : (stryCov_9fa48("23252", "23253"), fields.transportId === null)) || (stryMutAct_9fa48("23255") ? fields.transportId.length === TRANSPORT_ID_BYTES : stryMutAct_9fa48("23254") ? false : (stryCov_9fa48("23254", "23255"), fields.transportId.length !== TRANSPORT_ID_BYTES)))) {
          if (stryMutAct_9fa48("23256")) {
            {}
          } else {
            stryCov_9fa48("23256");
            throw new Error(stryMutAct_9fa48("23257") ? `` : (stryCov_9fa48("23257"), `HEADER_2 packets require a ${TRANSPORT_ID_BYTES}-byte transport id`));
          }
        }
      }
    }
    const flags = packPacketFlags(fields);
    const header = (stryMutAct_9fa48("23260") ? fields.headerType !== PACKET_HEADER_2 : stryMutAct_9fa48("23259") ? false : stryMutAct_9fa48("23258") ? true : (stryCov_9fa48("23258", "23259", "23260"), fields.headerType === PACKET_HEADER_2)) ? concatBytes(new Uint8Array(stryMutAct_9fa48("23261") ? [] : (stryCov_9fa48("23261"), [flags, fields.hops & 0xff])), fields.transportId!, fields.destinationHash) : concatBytes(new Uint8Array(stryMutAct_9fa48("23262") ? [] : (stryCov_9fa48("23262"), [flags, fields.hops & 0xff])), fields.destinationHash);
    return concatBytes(header, new Uint8Array(stryMutAct_9fa48("23263") ? [] : (stryCov_9fa48("23263"), [fields.context & 0xff])), fields.data);
  }
}
export function decodePacketRaw(raw: Uint8Array): PacketHeaderFields | null {
  if (stryMutAct_9fa48("23264")) {
    {}
  } else {
    stryCov_9fa48("23264");
    if (stryMutAct_9fa48("23268") ? raw.length >= 2 + TRANSPORT_ID_BYTES + 1 : stryMutAct_9fa48("23267") ? raw.length <= 2 + TRANSPORT_ID_BYTES + 1 : stryMutAct_9fa48("23266") ? false : stryMutAct_9fa48("23265") ? true : (stryCov_9fa48("23265", "23266", "23267", "23268"), raw.length < (stryMutAct_9fa48("23269") ? 2 + TRANSPORT_ID_BYTES - 1 : (stryCov_9fa48("23269"), (stryMutAct_9fa48("23270") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("23270"), 2 + TRANSPORT_ID_BYTES)) + 1)))) {
      if (stryMutAct_9fa48("23271")) {
        {}
      } else {
        stryCov_9fa48("23271");
        return null;
      }
    }
    const unpacked = unpackPacketFlags(raw[0]!);
    const hops = raw[1]!;
    if (stryMutAct_9fa48("23274") ? (!isHeaderType(unpacked.headerType) || !isContextFlag(unpacked.contextFlag) || !isTransportType(unpacked.transportType) || !isDestinationTypeCode(unpacked.destinationType)) && !isPacketType(unpacked.packetType) : stryMutAct_9fa48("23273") ? false : stryMutAct_9fa48("23272") ? true : (stryCov_9fa48("23272", "23273", "23274"), (stryMutAct_9fa48("23276") ? (!isHeaderType(unpacked.headerType) || !isContextFlag(unpacked.contextFlag) || !isTransportType(unpacked.transportType)) && !isDestinationTypeCode(unpacked.destinationType) : stryMutAct_9fa48("23275") ? false : (stryCov_9fa48("23275", "23276"), (stryMutAct_9fa48("23278") ? (!isHeaderType(unpacked.headerType) || !isContextFlag(unpacked.contextFlag)) && !isTransportType(unpacked.transportType) : stryMutAct_9fa48("23277") ? false : (stryCov_9fa48("23277", "23278"), (stryMutAct_9fa48("23280") ? !isHeaderType(unpacked.headerType) && !isContextFlag(unpacked.contextFlag) : stryMutAct_9fa48("23279") ? false : (stryCov_9fa48("23279", "23280"), (stryMutAct_9fa48("23281") ? isHeaderType(unpacked.headerType) : (stryCov_9fa48("23281"), !isHeaderType(unpacked.headerType))) || (stryMutAct_9fa48("23282") ? isContextFlag(unpacked.contextFlag) : (stryCov_9fa48("23282"), !isContextFlag(unpacked.contextFlag))))) || (stryMutAct_9fa48("23283") ? isTransportType(unpacked.transportType) : (stryCov_9fa48("23283"), !isTransportType(unpacked.transportType))))) || (stryMutAct_9fa48("23284") ? isDestinationTypeCode(unpacked.destinationType) : (stryCov_9fa48("23284"), !isDestinationTypeCode(unpacked.destinationType))))) || (stryMutAct_9fa48("23285") ? isPacketType(unpacked.packetType) : (stryCov_9fa48("23285"), !isPacketType(unpacked.packetType))))) {
      if (stryMutAct_9fa48("23286")) {
        {}
      } else {
        stryCov_9fa48("23286");
        return null;
      }
    }
    if (stryMutAct_9fa48("23289") ? unpacked.headerType !== PACKET_HEADER_2 : stryMutAct_9fa48("23288") ? false : stryMutAct_9fa48("23287") ? true : (stryCov_9fa48("23287", "23288", "23289"), unpacked.headerType === PACKET_HEADER_2)) {
      if (stryMutAct_9fa48("23290")) {
        {}
      } else {
        stryCov_9fa48("23290");
        if (stryMutAct_9fa48("23294") ? raw.length >= 2 + TRANSPORT_ID_BYTES * 2 + 1 : stryMutAct_9fa48("23293") ? raw.length <= 2 + TRANSPORT_ID_BYTES * 2 + 1 : stryMutAct_9fa48("23292") ? false : stryMutAct_9fa48("23291") ? true : (stryCov_9fa48("23291", "23292", "23293", "23294"), raw.length < (stryMutAct_9fa48("23295") ? 2 + TRANSPORT_ID_BYTES * 2 - 1 : (stryCov_9fa48("23295"), (stryMutAct_9fa48("23296") ? 2 - TRANSPORT_ID_BYTES * 2 : (stryCov_9fa48("23296"), 2 + (stryMutAct_9fa48("23297") ? TRANSPORT_ID_BYTES / 2 : (stryCov_9fa48("23297"), TRANSPORT_ID_BYTES * 2)))) + 1)))) {
          if (stryMutAct_9fa48("23298")) {
            {}
          } else {
            stryCov_9fa48("23298");
            return null;
          }
        }
        return stryMutAct_9fa48("23299") ? {} : (stryCov_9fa48("23299"), {
          ...unpacked,
          hops,
          transportId: raw.subarray(2, stryMutAct_9fa48("23300") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("23300"), 2 + TRANSPORT_ID_BYTES)),
          destinationHash: raw.subarray(stryMutAct_9fa48("23301") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("23301"), 2 + TRANSPORT_ID_BYTES), stryMutAct_9fa48("23302") ? 2 - TRANSPORT_ID_BYTES * 2 : (stryCov_9fa48("23302"), 2 + (stryMutAct_9fa48("23303") ? TRANSPORT_ID_BYTES / 2 : (stryCov_9fa48("23303"), TRANSPORT_ID_BYTES * 2)))),
          context: raw[stryMutAct_9fa48("23304") ? 2 - TRANSPORT_ID_BYTES * 2 : (stryCov_9fa48("23304"), 2 + (stryMutAct_9fa48("23305") ? TRANSPORT_ID_BYTES / 2 : (stryCov_9fa48("23305"), TRANSPORT_ID_BYTES * 2)))]!,
          data: raw.subarray(stryMutAct_9fa48("23306") ? 3 - TRANSPORT_ID_BYTES * 2 : (stryCov_9fa48("23306"), 3 + (stryMutAct_9fa48("23307") ? TRANSPORT_ID_BYTES / 2 : (stryCov_9fa48("23307"), TRANSPORT_ID_BYTES * 2))))
        });
      }
    }
    return stryMutAct_9fa48("23308") ? {} : (stryCov_9fa48("23308"), {
      ...unpacked,
      hops,
      transportId: null,
      destinationHash: raw.subarray(2, stryMutAct_9fa48("23309") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("23309"), 2 + TRANSPORT_ID_BYTES)),
      context: raw[stryMutAct_9fa48("23310") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("23310"), 2 + TRANSPORT_ID_BYTES)]!,
      data: raw.subarray(stryMutAct_9fa48("23311") ? 3 - TRANSPORT_ID_BYTES : (stryCov_9fa48("23311"), 3 + TRANSPORT_ID_BYTES))
    });
  }
}

/** Bytes hashed for packet identity (low nibble of flags + body after header). */
export function packetHashablePart(raw: Uint8Array, headerType: number): Uint8Array {
  if (stryMutAct_9fa48("23312")) {
    {}
  } else {
    stryCov_9fa48("23312");
    const maskedFlags = new Uint8Array(stryMutAct_9fa48("23313") ? [] : (stryCov_9fa48("23313"), [raw[0]! & 0b00001111]));
    if (stryMutAct_9fa48("23316") ? headerType !== PACKET_HEADER_2 : stryMutAct_9fa48("23315") ? false : stryMutAct_9fa48("23314") ? true : (stryCov_9fa48("23314", "23315", "23316"), headerType === PACKET_HEADER_2)) {
      if (stryMutAct_9fa48("23317")) {
        {}
      } else {
        stryCov_9fa48("23317");
        return concatBytes(maskedFlags, raw.subarray(stryMutAct_9fa48("23318") ? TRANSPORT_ID_BYTES - 2 : (stryCov_9fa48("23318"), TRANSPORT_ID_BYTES + 2)));
      }
    }
    return concatBytes(maskedFlags, raw.subarray(2));
  }
}
export type PacketFlagsFields = {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
};

/**
 * Packet flag packing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packPacketFlags` reads
 * beside the step).
 */
export type PackPacketFlagsState = Record<string, never>;
export type PackPacketFlagsEvent = Event | ({
  readonly kind: "packet-header/pack-flags-gate";
} & PacketFlagsFields);
export type PackPacketFlagsAction = {
  readonly kind: "use-flags";
  readonly flags: number;
};
export interface PackPacketFlagsStepResult {
  readonly state: PackPacketFlagsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPacketFlagsAction[];
}
export function initialPackPacketFlagsState(): PackPacketFlagsState {
  if (stryMutAct_9fa48("23319")) {
    {}
  } else {
    stryCov_9fa48("23319");
    return {};
  }
}
export function stepPackPacketFlagsWithActions(state: PackPacketFlagsState, event: PackPacketFlagsEvent): PackPacketFlagsStepResult {
  if (stryMutAct_9fa48("23320")) {
    {}
  } else {
    stryCov_9fa48("23320");
    if (stryMutAct_9fa48("23323") ? event.kind !== "packet-header/pack-flags-gate" : stryMutAct_9fa48("23322") ? false : stryMutAct_9fa48("23321") ? true : (stryCov_9fa48("23321", "23322", "23323"), event.kind === (stryMutAct_9fa48("23324") ? "" : (stryCov_9fa48("23324"), "packet-header/pack-flags-gate")))) {
      if (stryMutAct_9fa48("23325")) {
        {}
      } else {
        stryCov_9fa48("23325");
        return stryMutAct_9fa48("23326") ? {} : (stryCov_9fa48("23326"), {
          state,
          intents: stryMutAct_9fa48("23327") ? ["Stryker was here"] : (stryCov_9fa48("23327"), []),
          actions: stryMutAct_9fa48("23328") ? [] : (stryCov_9fa48("23328"), [stryMutAct_9fa48("23329") ? {} : (stryCov_9fa48("23329"), {
            kind: stryMutAct_9fa48("23330") ? "" : (stryCov_9fa48("23330"), "use-flags"),
            flags: packPacketFlags(stryMutAct_9fa48("23331") ? {} : (stryCov_9fa48("23331"), {
              headerType: event.headerType,
              contextFlag: event.contextFlag,
              transportType: event.transportType,
              destinationType: event.destinationType,
              packetType: event.packetType
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("23332") ? {} : (stryCov_9fa48("23332"), {
      state,
      intents: stryMutAct_9fa48("23333") ? ["Stryker was here"] : (stryCov_9fa48("23333"), []),
      actions: stryMutAct_9fa48("23334") ? ["Stryker was here"] : (stryCov_9fa48("23334"), [])
    });
  }
}
export function shouldUsePackPacketFlags(actions: ReadonlyArray<PackPacketFlagsAction>): boolean {
  if (stryMutAct_9fa48("23335")) {
    {}
  } else {
    stryCov_9fa48("23335");
    return stryMutAct_9fa48("23336") ? actions.every(action => action.kind === "use-flags") : (stryCov_9fa48("23336"), actions.some(stryMutAct_9fa48("23337") ? () => undefined : (stryCov_9fa48("23337"), action => stryMutAct_9fa48("23340") ? action.kind !== "use-flags" : stryMutAct_9fa48("23339") ? false : stryMutAct_9fa48("23338") ? true : (stryCov_9fa48("23338", "23339", "23340"), action.kind === (stryMutAct_9fa48("23341") ? "" : (stryCov_9fa48("23341"), "use-flags"))))));
  }
}

/** Extract packed flags byte from step actions; null when no `use-flags`. */
export function packPacketFlagsFromActions(actions: ReadonlyArray<PackPacketFlagsAction>): number | null {
  if (stryMutAct_9fa48("23342")) {
    {}
  } else {
    stryCov_9fa48("23342");
    const action = actions.find(stryMutAct_9fa48("23343") ? () => undefined : (stryCov_9fa48("23343"), entry => stryMutAct_9fa48("23346") ? entry.kind !== "use-flags" : stryMutAct_9fa48("23345") ? false : stryMutAct_9fa48("23344") ? true : (stryCov_9fa48("23344", "23345", "23346"), entry.kind === (stryMutAct_9fa48("23347") ? "" : (stryCov_9fa48("23347"), "use-flags")))));
    return (stryMutAct_9fa48("23350") ? action?.kind !== "use-flags" : stryMutAct_9fa48("23349") ? false : stryMutAct_9fa48("23348") ? true : (stryCov_9fa48("23348", "23349", "23350"), (stryMutAct_9fa48("23351") ? action.kind : (stryCov_9fa48("23351"), action?.kind)) === (stryMutAct_9fa48("23352") ? "" : (stryCov_9fa48("23352"), "use-flags")))) ? action.flags : null;
  }
}

/**
 * Packet flag unpacking is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackPacketFlags` reads
 * beside the step).
 */
export type UnpackPacketFlagsState = Record<string, never>;
export type UnpackPacketFlagsEvent = Event | {
  readonly kind: "packet-header/unpack-flags-gate";
  readonly flags: number;
};
export type UnpackPacketFlagsAction = {
  readonly kind: "use-fields";
  readonly fields: PacketFlagsFields;
};
export interface UnpackPacketFlagsStepResult {
  readonly state: UnpackPacketFlagsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackPacketFlagsAction[];
}
export function initialUnpackPacketFlagsState(): UnpackPacketFlagsState {
  if (stryMutAct_9fa48("23353")) {
    {}
  } else {
    stryCov_9fa48("23353");
    return {};
  }
}
export function stepUnpackPacketFlagsWithActions(state: UnpackPacketFlagsState, event: UnpackPacketFlagsEvent): UnpackPacketFlagsStepResult {
  if (stryMutAct_9fa48("23354")) {
    {}
  } else {
    stryCov_9fa48("23354");
    if (stryMutAct_9fa48("23357") ? event.kind !== "packet-header/unpack-flags-gate" : stryMutAct_9fa48("23356") ? false : stryMutAct_9fa48("23355") ? true : (stryCov_9fa48("23355", "23356", "23357"), event.kind === (stryMutAct_9fa48("23358") ? "" : (stryCov_9fa48("23358"), "packet-header/unpack-flags-gate")))) {
      if (stryMutAct_9fa48("23359")) {
        {}
      } else {
        stryCov_9fa48("23359");
        return stryMutAct_9fa48("23360") ? {} : (stryCov_9fa48("23360"), {
          state,
          intents: stryMutAct_9fa48("23361") ? ["Stryker was here"] : (stryCov_9fa48("23361"), []),
          actions: stryMutAct_9fa48("23362") ? [] : (stryCov_9fa48("23362"), [stryMutAct_9fa48("23363") ? {} : (stryCov_9fa48("23363"), {
            kind: stryMutAct_9fa48("23364") ? "" : (stryCov_9fa48("23364"), "use-fields"),
            fields: unpackPacketFlags(event.flags)
          })])
        });
      }
    }
    return stryMutAct_9fa48("23365") ? {} : (stryCov_9fa48("23365"), {
      state,
      intents: stryMutAct_9fa48("23366") ? ["Stryker was here"] : (stryCov_9fa48("23366"), []),
      actions: stryMutAct_9fa48("23367") ? ["Stryker was here"] : (stryCov_9fa48("23367"), [])
    });
  }
}
export function shouldUseUnpackPacketFlags(actions: ReadonlyArray<UnpackPacketFlagsAction>): boolean {
  if (stryMutAct_9fa48("23368")) {
    {}
  } else {
    stryCov_9fa48("23368");
    return stryMutAct_9fa48("23369") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("23369"), actions.some(stryMutAct_9fa48("23370") ? () => undefined : (stryCov_9fa48("23370"), action => stryMutAct_9fa48("23373") ? action.kind !== "use-fields" : stryMutAct_9fa48("23372") ? false : stryMutAct_9fa48("23371") ? true : (stryCov_9fa48("23371", "23372", "23373"), action.kind === (stryMutAct_9fa48("23374") ? "" : (stryCov_9fa48("23374"), "use-fields"))))));
  }
}

/** Extract unpacked flag fields from step actions; null when no `use-fields`. */
export function packetFlagsFieldsFromActions(actions: ReadonlyArray<UnpackPacketFlagsAction>): PacketFlagsFields | null {
  if (stryMutAct_9fa48("23375")) {
    {}
  } else {
    stryCov_9fa48("23375");
    const action = actions.find(stryMutAct_9fa48("23376") ? () => undefined : (stryCov_9fa48("23376"), entry => stryMutAct_9fa48("23379") ? entry.kind !== "use-fields" : stryMutAct_9fa48("23378") ? false : stryMutAct_9fa48("23377") ? true : (stryCov_9fa48("23377", "23378", "23379"), entry.kind === (stryMutAct_9fa48("23380") ? "" : (stryCov_9fa48("23380"), "use-fields")))));
    return (stryMutAct_9fa48("23383") ? action?.kind !== "use-fields" : stryMutAct_9fa48("23382") ? false : stryMutAct_9fa48("23381") ? true : (stryCov_9fa48("23381", "23382", "23383"), (stryMutAct_9fa48("23384") ? action.kind : (stryCov_9fa48("23384"), action?.kind)) === (stryMutAct_9fa48("23385") ? "" : (stryCov_9fa48("23385"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Packet hashable-part framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packetHashablePart` reads
 * beside the step).
 */
export type PacketHashablePartState = Record<string, never>;
export type PacketHashablePartEvent = Event | {
  readonly kind: "packet-header/hashable-part-gate";
  readonly raw: Uint8Array;
  readonly headerType: number;
};
export type PacketHashablePartAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PacketHashablePartStepResult {
  readonly state: PacketHashablePartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketHashablePartAction[];
}
export function initialPacketHashablePartState(): PacketHashablePartState {
  if (stryMutAct_9fa48("23386")) {
    {}
  } else {
    stryCov_9fa48("23386");
    return {};
  }
}
export function stepPacketHashablePartWithActions(state: PacketHashablePartState, event: PacketHashablePartEvent): PacketHashablePartStepResult {
  if (stryMutAct_9fa48("23387")) {
    {}
  } else {
    stryCov_9fa48("23387");
    if (stryMutAct_9fa48("23390") ? event.kind !== "packet-header/hashable-part-gate" : stryMutAct_9fa48("23389") ? false : stryMutAct_9fa48("23388") ? true : (stryCov_9fa48("23388", "23389", "23390"), event.kind === (stryMutAct_9fa48("23391") ? "" : (stryCov_9fa48("23391"), "packet-header/hashable-part-gate")))) {
      if (stryMutAct_9fa48("23392")) {
        {}
      } else {
        stryCov_9fa48("23392");
        return stryMutAct_9fa48("23393") ? {} : (stryCov_9fa48("23393"), {
          state,
          intents: stryMutAct_9fa48("23394") ? ["Stryker was here"] : (stryCov_9fa48("23394"), []),
          actions: stryMutAct_9fa48("23395") ? [] : (stryCov_9fa48("23395"), [stryMutAct_9fa48("23396") ? {} : (stryCov_9fa48("23396"), {
            kind: stryMutAct_9fa48("23397") ? "" : (stryCov_9fa48("23397"), "use-raw"),
            raw: packetHashablePart(event.raw, event.headerType)
          })])
        });
      }
    }
    return stryMutAct_9fa48("23398") ? {} : (stryCov_9fa48("23398"), {
      state,
      intents: stryMutAct_9fa48("23399") ? ["Stryker was here"] : (stryCov_9fa48("23399"), []),
      actions: stryMutAct_9fa48("23400") ? ["Stryker was here"] : (stryCov_9fa48("23400"), [])
    });
  }
}
export function shouldUsePacketHashablePart(actions: ReadonlyArray<PacketHashablePartAction>): boolean {
  if (stryMutAct_9fa48("23401")) {
    {}
  } else {
    stryCov_9fa48("23401");
    return stryMutAct_9fa48("23402") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("23402"), actions.some(stryMutAct_9fa48("23403") ? () => undefined : (stryCov_9fa48("23403"), action => stryMutAct_9fa48("23406") ? action.kind !== "use-raw" : stryMutAct_9fa48("23405") ? false : stryMutAct_9fa48("23404") ? true : (stryCov_9fa48("23404", "23405", "23406"), action.kind === (stryMutAct_9fa48("23407") ? "" : (stryCov_9fa48("23407"), "use-raw"))))));
  }
}

/** Extract hashable-part bytes from step actions; null when no `use-raw`. */
export function packetHashablePartRawFromActions(actions: ReadonlyArray<PacketHashablePartAction>): Uint8Array | null {
  if (stryMutAct_9fa48("23408")) {
    {}
  } else {
    stryCov_9fa48("23408");
    const action = actions.find(stryMutAct_9fa48("23409") ? () => undefined : (stryCov_9fa48("23409"), entry => stryMutAct_9fa48("23412") ? entry.kind !== "use-raw" : stryMutAct_9fa48("23411") ? false : stryMutAct_9fa48("23410") ? true : (stryCov_9fa48("23410", "23411", "23412"), entry.kind === (stryMutAct_9fa48("23413") ? "" : (stryCov_9fa48("23413"), "use-raw")))));
    return (stryMutAct_9fa48("23416") ? action?.kind !== "use-raw" : stryMutAct_9fa48("23415") ? false : stryMutAct_9fa48("23414") ? true : (stryCov_9fa48("23414", "23415", "23416"), (stryMutAct_9fa48("23417") ? action.kind : (stryCov_9fa48("23417"), action?.kind)) === (stryMutAct_9fa48("23418") ? "" : (stryCov_9fa48("23418"), "use-raw")))) ? action.raw : null;
  }
}
export type EncodePacketRawFields = {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
  readonly hops: number;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
  readonly transportId: Uint8Array | null;
};

/**
 * Packet raw encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodePacketRaw` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type EncodePacketRawState = Record<string, never>;
export type EncodePacketRawEvent = Event | ({
  readonly kind: "packet-header/encode-gate";
} & EncodePacketRawFields);
export type EncodePacketRawAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface EncodePacketRawStepResult {
  readonly state: EncodePacketRawState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodePacketRawAction[];
}
export function initialEncodePacketRawState(): EncodePacketRawState {
  if (stryMutAct_9fa48("23419")) {
    {}
  } else {
    stryCov_9fa48("23419");
    return {};
  }
}
export function stepEncodePacketRawWithActions(state: EncodePacketRawState, event: EncodePacketRawEvent): EncodePacketRawStepResult {
  if (stryMutAct_9fa48("23420")) {
    {}
  } else {
    stryCov_9fa48("23420");
    if (stryMutAct_9fa48("23423") ? event.kind !== "packet-header/encode-gate" : stryMutAct_9fa48("23422") ? false : stryMutAct_9fa48("23421") ? true : (stryCov_9fa48("23421", "23422", "23423"), event.kind === (stryMutAct_9fa48("23424") ? "" : (stryCov_9fa48("23424"), "packet-header/encode-gate")))) {
      if (stryMutAct_9fa48("23425")) {
        {}
      } else {
        stryCov_9fa48("23425");
        try {
          if (stryMutAct_9fa48("23426")) {
            {}
          } else {
            stryCov_9fa48("23426");
            return stryMutAct_9fa48("23427") ? {} : (stryCov_9fa48("23427"), {
              state,
              intents: stryMutAct_9fa48("23428") ? ["Stryker was here"] : (stryCov_9fa48("23428"), []),
              actions: stryMutAct_9fa48("23429") ? [] : (stryCov_9fa48("23429"), [stryMutAct_9fa48("23430") ? {} : (stryCov_9fa48("23430"), {
                kind: stryMutAct_9fa48("23431") ? "" : (stryCov_9fa48("23431"), "use-raw"),
                raw: encodePacketRaw(stryMutAct_9fa48("23432") ? {} : (stryCov_9fa48("23432"), {
                  headerType: event.headerType,
                  contextFlag: event.contextFlag,
                  transportType: event.transportType,
                  destinationType: event.destinationType,
                  packetType: event.packetType,
                  hops: event.hops,
                  destinationHash: event.destinationHash,
                  context: event.context,
                  data: event.data,
                  transportId: event.transportId
                }))
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("23433")) {
            {}
          } else {
            stryCov_9fa48("23433");
            return stryMutAct_9fa48("23434") ? {} : (stryCov_9fa48("23434"), {
              state,
              intents: stryMutAct_9fa48("23435") ? ["Stryker was here"] : (stryCov_9fa48("23435"), []),
              actions: stryMutAct_9fa48("23436") ? [] : (stryCov_9fa48("23436"), [stryMutAct_9fa48("23437") ? {} : (stryCov_9fa48("23437"), {
                kind: stryMutAct_9fa48("23438") ? "" : (stryCov_9fa48("23438"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("23439") ? {} : (stryCov_9fa48("23439"), {
      state,
      intents: stryMutAct_9fa48("23440") ? ["Stryker was here"] : (stryCov_9fa48("23440"), []),
      actions: stryMutAct_9fa48("23441") ? ["Stryker was here"] : (stryCov_9fa48("23441"), [])
    });
  }
}
export function shouldUseEncodePacketRaw(actions: ReadonlyArray<EncodePacketRawAction>): boolean {
  if (stryMutAct_9fa48("23442")) {
    {}
  } else {
    stryCov_9fa48("23442");
    return stryMutAct_9fa48("23443") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("23443"), actions.some(stryMutAct_9fa48("23444") ? () => undefined : (stryCov_9fa48("23444"), action => stryMutAct_9fa48("23447") ? action.kind !== "use-raw" : stryMutAct_9fa48("23446") ? false : stryMutAct_9fa48("23445") ? true : (stryCov_9fa48("23445", "23446", "23447"), action.kind === (stryMutAct_9fa48("23448") ? "" : (stryCov_9fa48("23448"), "use-raw"))))));
  }
}
export function shouldRejectEncodePacketRaw(actions: ReadonlyArray<EncodePacketRawAction>): boolean {
  if (stryMutAct_9fa48("23449")) {
    {}
  } else {
    stryCov_9fa48("23449");
    return stryMutAct_9fa48("23450") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("23450"), actions.some(stryMutAct_9fa48("23451") ? () => undefined : (stryCov_9fa48("23451"), action => stryMutAct_9fa48("23454") ? action.kind !== "reject" : stryMutAct_9fa48("23453") ? false : stryMutAct_9fa48("23452") ? true : (stryCov_9fa48("23452", "23453", "23454"), action.kind === (stryMutAct_9fa48("23455") ? "" : (stryCov_9fa48("23455"), "reject"))))));
  }
}

/** Extract packed packet bytes from step actions; null when no `use-raw`. */
export function encodePacketRawFromActions(actions: ReadonlyArray<EncodePacketRawAction>): Uint8Array | null {
  if (stryMutAct_9fa48("23456")) {
    {}
  } else {
    stryCov_9fa48("23456");
    const action = actions.find(stryMutAct_9fa48("23457") ? () => undefined : (stryCov_9fa48("23457"), entry => stryMutAct_9fa48("23460") ? entry.kind !== "use-raw" : stryMutAct_9fa48("23459") ? false : stryMutAct_9fa48("23458") ? true : (stryCov_9fa48("23458", "23459", "23460"), entry.kind === (stryMutAct_9fa48("23461") ? "" : (stryCov_9fa48("23461"), "use-raw")))));
    return (stryMutAct_9fa48("23464") ? action?.kind !== "use-raw" : stryMutAct_9fa48("23463") ? false : stryMutAct_9fa48("23462") ? true : (stryCov_9fa48("23462", "23463", "23464"), (stryMutAct_9fa48("23465") ? action.kind : (stryCov_9fa48("23465"), action?.kind)) === (stryMutAct_9fa48("23466") ? "" : (stryCov_9fa48("23466"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Packet raw decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodePacketRaw` reads
 * beside the step). Truncated / invalid frames become `reject`.
 */
export type DecodePacketRawState = Record<string, never>;