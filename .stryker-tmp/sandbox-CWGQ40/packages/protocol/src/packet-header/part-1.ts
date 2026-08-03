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
export { PACKET_HEADER_1, PACKET_HEADER_2, TRANSPORT_BROADCAST, TRANSPORT_ID_BYTES, TRANSPORT_TRANSPORT };
export const PACKET_TYPE_DATA = 0x00;
export const PACKET_TYPE_ANNOUNCE = 0x01;
export const PACKET_TYPE_LINKREQUEST = 0x02;
export const PACKET_TYPE_PROOF = 0x03;
export const PACKET_CONTEXT_FLAG_UNSET = 0x00;
export const PACKET_CONTEXT_FLAG_SET = 0x01;
export const PACKET_DEST_TYPE_SINGLE = 0x00;
export const PACKET_DEST_TYPE_GROUP = 0x01;
export const PACKET_DEST_TYPE_PLAIN = 0x02;
export const PACKET_DEST_TYPE_LINK = 0x03;

/** Named packet-type codes (RNS Packet.types). */
export const PacketTypeCode = {
  DATA: PACKET_TYPE_DATA,
  ANNOUNCE: PACKET_TYPE_ANNOUNCE,
  LINKREQUEST: PACKET_TYPE_LINKREQUEST,
  PROOF: PACKET_TYPE_PROOF
} as const;
export type PacketTypeCodeValue = (typeof PacketTypeCode)[keyof typeof PacketTypeCode];

/** Named header-type codes (HEADER_1 / HEADER_2). */
export const PacketHeaderTypeCode = {
  HEADER_1: PACKET_HEADER_1,
  HEADER_2: PACKET_HEADER_2
} as const;
export type PacketHeaderTypeCodeValue = (typeof PacketHeaderTypeCode)[keyof typeof PacketHeaderTypeCode];

/** Named context-flag codes. */
export const PacketContextFlagCode = {
  UNSET: PACKET_CONTEXT_FLAG_UNSET,
  SET: PACKET_CONTEXT_FLAG_SET
} as const;
export type PacketContextFlagCodeValue = (typeof PacketContextFlagCode)[keyof typeof PacketContextFlagCode];

/** Named transport-type codes. */
export const TransportTypeCode = {
  BROADCAST: TRANSPORT_BROADCAST,
  TRANSPORT: TRANSPORT_TRANSPORT
} as const;
export type TransportTypeCodeValue = (typeof TransportTypeCode)[keyof typeof TransportTypeCode];

/** Named destination-type codes (RNS Destination.types). */
export const DestinationTypeCode = {
  SINGLE: PACKET_DEST_TYPE_SINGLE,
  GROUP: PACKET_DEST_TYPE_GROUP,
  PLAIN: PACKET_DEST_TYPE_PLAIN,
  LINK: PACKET_DEST_TYPE_LINK
} as const;
export type DestinationTypeCodeValue = (typeof DestinationTypeCode)[keyof typeof DestinationTypeCode];

/** Named destination-direction codes (RNS Destination.IN / OUT). */
export const DestinationDirectionCode = {
  IN: 0x11,
  OUT: 0x12
} as const;
export type DestinationDirectionCodeValue = (typeof DestinationDirectionCode)[keyof typeof DestinationDirectionCode];
export interface PacketHeaderFields {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
  readonly hops: number;
  readonly transportId: Uint8Array | null;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
}
export function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("22902")) {
    {}
  } else {
    stryCov_9fa48("22902");
    const length = parts.reduce(stryMutAct_9fa48("22903") ? () => undefined : (stryCov_9fa48("22903"), (total, part) => stryMutAct_9fa48("22904") ? total - part.length : (stryCov_9fa48("22904"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("22905")) {
        {}
      } else {
        stryCov_9fa48("22905");
        output.set(part, offset);
        stryMutAct_9fa48("22906") ? offset -= part.length : (stryCov_9fa48("22906"), offset += part.length);
      }
    }
    return output;
  }
}
export function packPacketFlags(input: {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
}): number {
  if (stryMutAct_9fa48("22907")) {
    {}
  } else {
    stryCov_9fa48("22907");
    return (input.headerType & 0x03) << 6 | (input.contextFlag & 0x01) << 5 | (input.transportType & 0x01) << 4 | (input.destinationType & 0x03) << 2 | input.packetType & 0x03;
  }
}
export function unpackPacketFlags(flags: number): {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
} {
  if (stryMutAct_9fa48("22908")) {
    {}
  } else {
    stryCov_9fa48("22908");
    return stryMutAct_9fa48("22909") ? {} : (stryCov_9fa48("22909"), {
      headerType: (flags & 0b11000000) >> 6,
      contextFlag: (flags & 0b00100000) >> 5,
      transportType: (flags & 0b00010000) >> 4,
      destinationType: (flags & 0b00001100) >> 2,
      packetType: flags & 0b00000011
    });
  }
}
export function isHeaderType(value: number): boolean {
  if (stryMutAct_9fa48("22910")) {
    {}
  } else {
    stryCov_9fa48("22910");
    return stryMutAct_9fa48("22913") ? value === PACKET_HEADER_1 && value === PACKET_HEADER_2 : stryMutAct_9fa48("22912") ? false : stryMutAct_9fa48("22911") ? true : (stryCov_9fa48("22911", "22912", "22913"), (stryMutAct_9fa48("22915") ? value !== PACKET_HEADER_1 : stryMutAct_9fa48("22914") ? false : (stryCov_9fa48("22914", "22915"), value === PACKET_HEADER_1)) || (stryMutAct_9fa48("22917") ? value !== PACKET_HEADER_2 : stryMutAct_9fa48("22916") ? false : (stryCov_9fa48("22916", "22917"), value === PACKET_HEADER_2)));
  }
}
export function isContextFlag(value: number): boolean {
  if (stryMutAct_9fa48("22918")) {
    {}
  } else {
    stryCov_9fa48("22918");
    return stryMutAct_9fa48("22921") ? value === PACKET_CONTEXT_FLAG_UNSET && value === PACKET_CONTEXT_FLAG_SET : stryMutAct_9fa48("22920") ? false : stryMutAct_9fa48("22919") ? true : (stryCov_9fa48("22919", "22920", "22921"), (stryMutAct_9fa48("22923") ? value !== PACKET_CONTEXT_FLAG_UNSET : stryMutAct_9fa48("22922") ? false : (stryCov_9fa48("22922", "22923"), value === PACKET_CONTEXT_FLAG_UNSET)) || (stryMutAct_9fa48("22925") ? value !== PACKET_CONTEXT_FLAG_SET : stryMutAct_9fa48("22924") ? false : (stryCov_9fa48("22924", "22925"), value === PACKET_CONTEXT_FLAG_SET)));
  }
}
export function isTransportType(value: number): boolean {
  if (stryMutAct_9fa48("22926")) {
    {}
  } else {
    stryCov_9fa48("22926");
    return stryMutAct_9fa48("22929") ? value === TRANSPORT_BROADCAST && value === TRANSPORT_TRANSPORT : stryMutAct_9fa48("22928") ? false : stryMutAct_9fa48("22927") ? true : (stryCov_9fa48("22927", "22928", "22929"), (stryMutAct_9fa48("22931") ? value !== TRANSPORT_BROADCAST : stryMutAct_9fa48("22930") ? false : (stryCov_9fa48("22930", "22931"), value === TRANSPORT_BROADCAST)) || (stryMutAct_9fa48("22933") ? value !== TRANSPORT_TRANSPORT : stryMutAct_9fa48("22932") ? false : (stryCov_9fa48("22932", "22933"), value === TRANSPORT_TRANSPORT)));
  }
}
export function isDestinationTypeCode(value: number): boolean {
  if (stryMutAct_9fa48("22934")) {
    {}
  } else {
    stryCov_9fa48("22934");
    return stryMutAct_9fa48("22937") ? (value === PACKET_DEST_TYPE_SINGLE || value === PACKET_DEST_TYPE_GROUP || value === PACKET_DEST_TYPE_PLAIN) && value === PACKET_DEST_TYPE_LINK : stryMutAct_9fa48("22936") ? false : stryMutAct_9fa48("22935") ? true : (stryCov_9fa48("22935", "22936", "22937"), (stryMutAct_9fa48("22939") ? (value === PACKET_DEST_TYPE_SINGLE || value === PACKET_DEST_TYPE_GROUP) && value === PACKET_DEST_TYPE_PLAIN : stryMutAct_9fa48("22938") ? false : (stryCov_9fa48("22938", "22939"), (stryMutAct_9fa48("22941") ? value === PACKET_DEST_TYPE_SINGLE && value === PACKET_DEST_TYPE_GROUP : stryMutAct_9fa48("22940") ? false : (stryCov_9fa48("22940", "22941"), (stryMutAct_9fa48("22943") ? value !== PACKET_DEST_TYPE_SINGLE : stryMutAct_9fa48("22942") ? false : (stryCov_9fa48("22942", "22943"), value === PACKET_DEST_TYPE_SINGLE)) || (stryMutAct_9fa48("22945") ? value !== PACKET_DEST_TYPE_GROUP : stryMutAct_9fa48("22944") ? false : (stryCov_9fa48("22944", "22945"), value === PACKET_DEST_TYPE_GROUP)))) || (stryMutAct_9fa48("22947") ? value !== PACKET_DEST_TYPE_PLAIN : stryMutAct_9fa48("22946") ? false : (stryCov_9fa48("22946", "22947"), value === PACKET_DEST_TYPE_PLAIN)))) || (stryMutAct_9fa48("22949") ? value !== PACKET_DEST_TYPE_LINK : stryMutAct_9fa48("22948") ? false : (stryCov_9fa48("22948", "22949"), value === PACKET_DEST_TYPE_LINK)));
  }
}
export function isDestinationDirectionCode(value: number): boolean {
  if (stryMutAct_9fa48("22950")) {
    {}
  } else {
    stryCov_9fa48("22950");
    return stryMutAct_9fa48("22953") ? value === DestinationDirectionCode.IN && value === DestinationDirectionCode.OUT : stryMutAct_9fa48("22952") ? false : stryMutAct_9fa48("22951") ? true : (stryCov_9fa48("22951", "22952", "22953"), (stryMutAct_9fa48("22955") ? value !== DestinationDirectionCode.IN : stryMutAct_9fa48("22954") ? false : (stryCov_9fa48("22954", "22955"), value === DestinationDirectionCode.IN)) || (stryMutAct_9fa48("22957") ? value !== DestinationDirectionCode.OUT : stryMutAct_9fa48("22956") ? false : (stryCov_9fa48("22956", "22957"), value === DestinationDirectionCode.OUT)));
  }
}
export function isPacketType(value: number): boolean {
  if (stryMutAct_9fa48("22958")) {
    {}
  } else {
    stryCov_9fa48("22958");
    return stryMutAct_9fa48("22961") ? (value === PACKET_TYPE_DATA || value === PACKET_TYPE_ANNOUNCE || value === PACKET_TYPE_LINKREQUEST) && value === PACKET_TYPE_PROOF : stryMutAct_9fa48("22960") ? false : stryMutAct_9fa48("22959") ? true : (stryCov_9fa48("22959", "22960", "22961"), (stryMutAct_9fa48("22963") ? (value === PACKET_TYPE_DATA || value === PACKET_TYPE_ANNOUNCE) && value === PACKET_TYPE_LINKREQUEST : stryMutAct_9fa48("22962") ? false : (stryCov_9fa48("22962", "22963"), (stryMutAct_9fa48("22965") ? value === PACKET_TYPE_DATA && value === PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("22964") ? false : (stryCov_9fa48("22964", "22965"), (stryMutAct_9fa48("22967") ? value !== PACKET_TYPE_DATA : stryMutAct_9fa48("22966") ? false : (stryCov_9fa48("22966", "22967"), value === PACKET_TYPE_DATA)) || (stryMutAct_9fa48("22969") ? value !== PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("22968") ? false : (stryCov_9fa48("22968", "22969"), value === PACKET_TYPE_ANNOUNCE)))) || (stryMutAct_9fa48("22971") ? value !== PACKET_TYPE_LINKREQUEST : stryMutAct_9fa48("22970") ? false : (stryCov_9fa48("22970", "22971"), value === PACKET_TYPE_LINKREQUEST)))) || (stryMutAct_9fa48("22973") ? value !== PACKET_TYPE_PROOF : stryMutAct_9fa48("22972") ? false : (stryCov_9fa48("22972", "22973"), value === PACKET_TYPE_PROOF)));
  }
}
export function isHeaderTypeCode(value: number): boolean {
  if (stryMutAct_9fa48("22974")) {
    {}
  } else {
    stryCov_9fa48("22974");
    return isHeaderType(value);
  }
}
export function isContextFlagCode(value: number): boolean {
  if (stryMutAct_9fa48("22975")) {
    {}
  } else {
    stryCov_9fa48("22975");
    return isContextFlag(value);
  }
}
export function isTransportTypeCode(value: number): boolean {
  if (stryMutAct_9fa48("22976")) {
    {}
  } else {
    stryCov_9fa48("22976");
    return isTransportType(value);
  }
}
export function isPacketTypeCode(value: number): boolean {
  if (stryMutAct_9fa48("22977")) {
    {}
  } else {
    stryCov_9fa48("22977");
    return isPacketType(value);
  }
}
export type PacketFromFieldsPlan = "ok" | "bad-header-type" | "bad-context-flag" | "bad-transport-type" | "bad-destination-type" | "bad-packet-type" | "bad-destination-hash" | "header2-missing-transport-id" | "bad-transport-id";

/** Whether Packet.fromFields may proceed (enum codes + HASH / HEADER_2 transport id). */
export function planPacketFromFields(input: {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
  readonly destinationHashLength: number;
  readonly transportIdPresent: boolean;
  readonly transportIdLength: number;
}): PacketFromFieldsPlan {
  if (stryMutAct_9fa48("22978")) {
    {}
  } else {
    stryCov_9fa48("22978");
    if (stryMutAct_9fa48("22981") ? false : stryMutAct_9fa48("22980") ? true : stryMutAct_9fa48("22979") ? isHeaderTypeCode(input.headerType) : (stryCov_9fa48("22979", "22980", "22981"), !isHeaderTypeCode(input.headerType))) {
      if (stryMutAct_9fa48("22982")) {
        {}
      } else {
        stryCov_9fa48("22982");
        return stryMutAct_9fa48("22983") ? "" : (stryCov_9fa48("22983"), "bad-header-type");
      }
    }
    if (stryMutAct_9fa48("22986") ? false : stryMutAct_9fa48("22985") ? true : stryMutAct_9fa48("22984") ? isContextFlagCode(input.contextFlag) : (stryCov_9fa48("22984", "22985", "22986"), !isContextFlagCode(input.contextFlag))) {
      if (stryMutAct_9fa48("22987")) {
        {}
      } else {
        stryCov_9fa48("22987");
        return stryMutAct_9fa48("22988") ? "" : (stryCov_9fa48("22988"), "bad-context-flag");
      }
    }
    if (stryMutAct_9fa48("22991") ? false : stryMutAct_9fa48("22990") ? true : stryMutAct_9fa48("22989") ? isTransportTypeCode(input.transportType) : (stryCov_9fa48("22989", "22990", "22991"), !isTransportTypeCode(input.transportType))) {
      if (stryMutAct_9fa48("22992")) {
        {}
      } else {
        stryCov_9fa48("22992");
        return stryMutAct_9fa48("22993") ? "" : (stryCov_9fa48("22993"), "bad-transport-type");
      }
    }
    if (stryMutAct_9fa48("22996") ? false : stryMutAct_9fa48("22995") ? true : stryMutAct_9fa48("22994") ? isDestinationTypeCode(input.destinationType) : (stryCov_9fa48("22994", "22995", "22996"), !isDestinationTypeCode(input.destinationType))) {
      if (stryMutAct_9fa48("22997")) {
        {}
      } else {
        stryCov_9fa48("22997");
        return stryMutAct_9fa48("22998") ? "" : (stryCov_9fa48("22998"), "bad-destination-type");
      }
    }
    if (stryMutAct_9fa48("23001") ? false : stryMutAct_9fa48("23000") ? true : stryMutAct_9fa48("22999") ? isPacketTypeCode(input.packetType) : (stryCov_9fa48("22999", "23000", "23001"), !isPacketTypeCode(input.packetType))) {
      if (stryMutAct_9fa48("23002")) {
        {}
      } else {
        stryCov_9fa48("23002");
        return stryMutAct_9fa48("23003") ? "" : (stryCov_9fa48("23003"), "bad-packet-type");
      }
    }
    if (stryMutAct_9fa48("23006") ? input.destinationHashLength === TRANSPORT_ID_BYTES : stryMutAct_9fa48("23005") ? false : stryMutAct_9fa48("23004") ? true : (stryCov_9fa48("23004", "23005", "23006"), input.destinationHashLength !== TRANSPORT_ID_BYTES)) {
      if (stryMutAct_9fa48("23007")) {
        {}
      } else {
        stryCov_9fa48("23007");
        return stryMutAct_9fa48("23008") ? "" : (stryCov_9fa48("23008"), "bad-destination-hash");
      }
    }
    if (stryMutAct_9fa48("23011") ? input.headerType !== PACKET_HEADER_2 : stryMutAct_9fa48("23010") ? false : stryMutAct_9fa48("23009") ? true : (stryCov_9fa48("23009", "23010", "23011"), input.headerType === PACKET_HEADER_2)) {
      if (stryMutAct_9fa48("23012")) {
        {}
      } else {
        stryCov_9fa48("23012");
        if (stryMutAct_9fa48("23015") ? false : stryMutAct_9fa48("23014") ? true : stryMutAct_9fa48("23013") ? input.transportIdPresent : (stryCov_9fa48("23013", "23014", "23015"), !input.transportIdPresent)) {
          if (stryMutAct_9fa48("23016")) {
            {}
          } else {
            stryCov_9fa48("23016");
            return stryMutAct_9fa48("23017") ? "" : (stryCov_9fa48("23017"), "header2-missing-transport-id");
          }
        }
        if (stryMutAct_9fa48("23020") ? input.transportIdLength === TRANSPORT_ID_BYTES : stryMutAct_9fa48("23019") ? false : stryMutAct_9fa48("23018") ? true : (stryCov_9fa48("23018", "23019", "23020"), input.transportIdLength !== TRANSPORT_ID_BYTES)) {
          if (stryMutAct_9fa48("23021")) {
            {}
          } else {
            stryCov_9fa48("23021");
            return stryMutAct_9fa48("23022") ? "" : (stryCov_9fa48("23022"), "bad-transport-id");
          }
        }
      }
    }
    return stryMutAct_9fa48("23023") ? "" : (stryCov_9fa48("23023"), "ok");
  }
}

/**
 * Packet-from-fields-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketFromFields` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketFromFieldsWithActions}.
 */
export type PacketFromFieldsPlanState = Record<string, never>;
export type PacketFromFieldsPlanEvent = Event | {
  readonly kind: "packet/from-fields-plan-gate";
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
  readonly destinationHashLength: number;
  readonly transportIdPresent: boolean;
  readonly transportIdLength: number;
};
export type PacketFromFieldsPlanAction = {
  readonly kind: PacketFromFieldsPlan;
};
export interface PacketFromFieldsPlanStepResult {
  readonly state: PacketFromFieldsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketFromFieldsPlanAction[];
}
export function initialPacketFromFieldsPlanState(): PacketFromFieldsPlanState {
  if (stryMutAct_9fa48("23024")) {
    {}
  } else {
    stryCov_9fa48("23024");
    return {};
  }
}
export function stepPacketFromFieldsPlanWithActions(state: PacketFromFieldsPlanState, event: PacketFromFieldsPlanEvent): PacketFromFieldsPlanStepResult {
  if (stryMutAct_9fa48("23025")) {
    {}
  } else {
    stryCov_9fa48("23025");
    if (stryMutAct_9fa48("23028") ? event.kind !== "packet/from-fields-plan-gate" : stryMutAct_9fa48("23027") ? false : stryMutAct_9fa48("23026") ? true : (stryCov_9fa48("23026", "23027", "23028"), event.kind === (stryMutAct_9fa48("23029") ? "" : (stryCov_9fa48("23029"), "packet/from-fields-plan-gate")))) {
      if (stryMutAct_9fa48("23030")) {
        {}
      } else {
        stryCov_9fa48("23030");
        return stryMutAct_9fa48("23031") ? {} : (stryCov_9fa48("23031"), {
          state,
          intents: stryMutAct_9fa48("23032") ? ["Stryker was here"] : (stryCov_9fa48("23032"), []),
          actions: stryMutAct_9fa48("23033") ? [] : (stryCov_9fa48("23033"), [stryMutAct_9fa48("23034") ? {} : (stryCov_9fa48("23034"), {
            kind: planPacketFromFields(stryMutAct_9fa48("23035") ? {} : (stryCov_9fa48("23035"), {
              headerType: event.headerType,
              contextFlag: event.contextFlag,
              transportType: event.transportType,
              destinationType: event.destinationType,
              packetType: event.packetType,
              destinationHashLength: event.destinationHashLength,
              transportIdPresent: event.transportIdPresent,
              transportIdLength: event.transportIdLength
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("23036") ? {} : (stryCov_9fa48("23036"), {
      state,
      intents: stryMutAct_9fa48("23037") ? ["Stryker was here"] : (stryCov_9fa48("23037"), []),
      actions: stryMutAct_9fa48("23038") ? ["Stryker was here"] : (stryCov_9fa48("23038"), [])
    });
  }
}

/** Extract the fromFields plan from actions; null when empty. */
export function packetFromFieldsPlanFromActions(actions: ReadonlyArray<PacketFromFieldsPlanAction>): PacketFromFieldsPlan | null {
  if (stryMutAct_9fa48("23039")) {
    {}
  } else {
    stryCov_9fa48("23039");
    const action = actions.find(stryMutAct_9fa48("23040") ? () => undefined : (stryCov_9fa48("23040"), entry => stryMutAct_9fa48("23043") ? (entry.kind === "ok" || entry.kind === "bad-header-type" || entry.kind === "bad-context-flag" || entry.kind === "bad-transport-type" || entry.kind === "bad-destination-type" || entry.kind === "bad-packet-type" || entry.kind === "bad-destination-hash" || entry.kind === "header2-missing-transport-id") && entry.kind === "bad-transport-id" : stryMutAct_9fa48("23042") ? false : stryMutAct_9fa48("23041") ? true : (stryCov_9fa48("23041", "23042", "23043"), (stryMutAct_9fa48("23045") ? (entry.kind === "ok" || entry.kind === "bad-header-type" || entry.kind === "bad-context-flag" || entry.kind === "bad-transport-type" || entry.kind === "bad-destination-type" || entry.kind === "bad-packet-type" || entry.kind === "bad-destination-hash") && entry.kind === "header2-missing-transport-id" : stryMutAct_9fa48("23044") ? false : (stryCov_9fa48("23044", "23045"), (stryMutAct_9fa48("23047") ? (entry.kind === "ok" || entry.kind === "bad-header-type" || entry.kind === "bad-context-flag" || entry.kind === "bad-transport-type" || entry.kind === "bad-destination-type" || entry.kind === "bad-packet-type") && entry.kind === "bad-destination-hash" : stryMutAct_9fa48("23046") ? false : (stryCov_9fa48("23046", "23047"), (stryMutAct_9fa48("23049") ? (entry.kind === "ok" || entry.kind === "bad-header-type" || entry.kind === "bad-context-flag" || entry.kind === "bad-transport-type" || entry.kind === "bad-destination-type") && entry.kind === "bad-packet-type" : stryMutAct_9fa48("23048") ? false : (stryCov_9fa48("23048", "23049"), (stryMutAct_9fa48("23051") ? (entry.kind === "ok" || entry.kind === "bad-header-type" || entry.kind === "bad-context-flag" || entry.kind === "bad-transport-type") && entry.kind === "bad-destination-type" : stryMutAct_9fa48("23050") ? false : (stryCov_9fa48("23050", "23051"), (stryMutAct_9fa48("23053") ? (entry.kind === "ok" || entry.kind === "bad-header-type" || entry.kind === "bad-context-flag") && entry.kind === "bad-transport-type" : stryMutAct_9fa48("23052") ? false : (stryCov_9fa48("23052", "23053"), (stryMutAct_9fa48("23055") ? (entry.kind === "ok" || entry.kind === "bad-header-type") && entry.kind === "bad-context-flag" : stryMutAct_9fa48("23054") ? false : (stryCov_9fa48("23054", "23055"), (stryMutAct_9fa48("23057") ? entry.kind === "ok" && entry.kind === "bad-header-type" : stryMutAct_9fa48("23056") ? false : (stryCov_9fa48("23056", "23057"), (stryMutAct_9fa48("23059") ? entry.kind !== "ok" : stryMutAct_9fa48("23058") ? false : (stryCov_9fa48("23058", "23059"), entry.kind === (stryMutAct_9fa48("23060") ? "" : (stryCov_9fa48("23060"), "ok")))) || (stryMutAct_9fa48("23062") ? entry.kind !== "bad-header-type" : stryMutAct_9fa48("23061") ? false : (stryCov_9fa48("23061", "23062"), entry.kind === (stryMutAct_9fa48("23063") ? "" : (stryCov_9fa48("23063"), "bad-header-type")))))) || (stryMutAct_9fa48("23065") ? entry.kind !== "bad-context-flag" : stryMutAct_9fa48("23064") ? false : (stryCov_9fa48("23064", "23065"), entry.kind === (stryMutAct_9fa48("23066") ? "" : (stryCov_9fa48("23066"), "bad-context-flag")))))) || (stryMutAct_9fa48("23068") ? entry.kind !== "bad-transport-type" : stryMutAct_9fa48("23067") ? false : (stryCov_9fa48("23067", "23068"), entry.kind === (stryMutAct_9fa48("23069") ? "" : (stryCov_9fa48("23069"), "bad-transport-type")))))) || (stryMutAct_9fa48("23071") ? entry.kind !== "bad-destination-type" : stryMutAct_9fa48("23070") ? false : (stryCov_9fa48("23070", "23071"), entry.kind === (stryMutAct_9fa48("23072") ? "" : (stryCov_9fa48("23072"), "bad-destination-type")))))) || (stryMutAct_9fa48("23074") ? entry.kind !== "bad-packet-type" : stryMutAct_9fa48("23073") ? false : (stryCov_9fa48("23073", "23074"), entry.kind === (stryMutAct_9fa48("23075") ? "" : (stryCov_9fa48("23075"), "bad-packet-type")))))) || (stryMutAct_9fa48("23077") ? entry.kind !== "bad-destination-hash" : stryMutAct_9fa48("23076") ? false : (stryCov_9fa48("23076", "23077"), entry.kind === (stryMutAct_9fa48("23078") ? "" : (stryCov_9fa48("23078"), "bad-destination-hash")))))) || (stryMutAct_9fa48("23080") ? entry.kind !== "header2-missing-transport-id" : stryMutAct_9fa48("23079") ? false : (stryCov_9fa48("23079", "23080"), entry.kind === (stryMutAct_9fa48("23081") ? "" : (stryCov_9fa48("23081"), "header2-missing-transport-id")))))) || (stryMutAct_9fa48("23083") ? entry.kind !== "bad-transport-id" : stryMutAct_9fa48("23082") ? false : (stryCov_9fa48("23082", "23083"), entry.kind === (stryMutAct_9fa48("23084") ? "" : (stryCov_9fa48("23084"), "bad-transport-id")))))));
    return stryMutAct_9fa48("23085") ? action?.kind && null : (stryCov_9fa48("23085"), (stryMutAct_9fa48("23086") ? action.kind : (stryCov_9fa48("23086"), action?.kind)) ?? null);
  }
}
export function shouldProceedPacketFromFieldsPlan(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23087")) {
    {}
  } else {
    stryCov_9fa48("23087");
    return stryMutAct_9fa48("23088") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("23088"), actions.some(stryMutAct_9fa48("23089") ? () => undefined : (stryCov_9fa48("23089"), action => stryMutAct_9fa48("23092") ? action.kind !== "ok" : stryMutAct_9fa48("23091") ? false : stryMutAct_9fa48("23090") ? true : (stryCov_9fa48("23090", "23091", "23092"), action.kind === (stryMutAct_9fa48("23093") ? "" : (stryCov_9fa48("23093"), "ok"))))));
  }
}
export function shouldRejectPacketFromFieldsPlanBadHeaderType(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23094")) {
    {}
  } else {
    stryCov_9fa48("23094");
    return stryMutAct_9fa48("23095") ? actions.every(action => action.kind === "bad-header-type") : (stryCov_9fa48("23095"), actions.some(stryMutAct_9fa48("23096") ? () => undefined : (stryCov_9fa48("23096"), action => stryMutAct_9fa48("23099") ? action.kind !== "bad-header-type" : stryMutAct_9fa48("23098") ? false : stryMutAct_9fa48("23097") ? true : (stryCov_9fa48("23097", "23098", "23099"), action.kind === (stryMutAct_9fa48("23100") ? "" : (stryCov_9fa48("23100"), "bad-header-type"))))));
  }
}
export function shouldRejectPacketFromFieldsPlanBadContextFlag(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23101")) {
    {}
  } else {
    stryCov_9fa48("23101");
    return stryMutAct_9fa48("23102") ? actions.every(action => action.kind === "bad-context-flag") : (stryCov_9fa48("23102"), actions.some(stryMutAct_9fa48("23103") ? () => undefined : (stryCov_9fa48("23103"), action => stryMutAct_9fa48("23106") ? action.kind !== "bad-context-flag" : stryMutAct_9fa48("23105") ? false : stryMutAct_9fa48("23104") ? true : (stryCov_9fa48("23104", "23105", "23106"), action.kind === (stryMutAct_9fa48("23107") ? "" : (stryCov_9fa48("23107"), "bad-context-flag"))))));
  }
}
export function shouldRejectPacketFromFieldsPlanBadTransportType(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23108")) {
    {}
  } else {
    stryCov_9fa48("23108");
    return stryMutAct_9fa48("23109") ? actions.every(action => action.kind === "bad-transport-type") : (stryCov_9fa48("23109"), actions.some(stryMutAct_9fa48("23110") ? () => undefined : (stryCov_9fa48("23110"), action => stryMutAct_9fa48("23113") ? action.kind !== "bad-transport-type" : stryMutAct_9fa48("23112") ? false : stryMutAct_9fa48("23111") ? true : (stryCov_9fa48("23111", "23112", "23113"), action.kind === (stryMutAct_9fa48("23114") ? "" : (stryCov_9fa48("23114"), "bad-transport-type"))))));
  }
}
export function shouldRejectPacketFromFieldsPlanBadDestinationType(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23115")) {
    {}
  } else {
    stryCov_9fa48("23115");
    return stryMutAct_9fa48("23116") ? actions.every(action => action.kind === "bad-destination-type") : (stryCov_9fa48("23116"), actions.some(stryMutAct_9fa48("23117") ? () => undefined : (stryCov_9fa48("23117"), action => stryMutAct_9fa48("23120") ? action.kind !== "bad-destination-type" : stryMutAct_9fa48("23119") ? false : stryMutAct_9fa48("23118") ? true : (stryCov_9fa48("23118", "23119", "23120"), action.kind === (stryMutAct_9fa48("23121") ? "" : (stryCov_9fa48("23121"), "bad-destination-type"))))));
  }
}
export function shouldRejectPacketFromFieldsPlanBadPacketType(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23122")) {
    {}
  } else {
    stryCov_9fa48("23122");
    return stryMutAct_9fa48("23123") ? actions.every(action => action.kind === "bad-packet-type") : (stryCov_9fa48("23123"), actions.some(stryMutAct_9fa48("23124") ? () => undefined : (stryCov_9fa48("23124"), action => stryMutAct_9fa48("23127") ? action.kind !== "bad-packet-type" : stryMutAct_9fa48("23126") ? false : stryMutAct_9fa48("23125") ? true : (stryCov_9fa48("23125", "23126", "23127"), action.kind === (stryMutAct_9fa48("23128") ? "" : (stryCov_9fa48("23128"), "bad-packet-type"))))));
  }
}
export function shouldRejectPacketFromFieldsPlanBadDestinationHash(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23129")) {
    {}
  } else {
    stryCov_9fa48("23129");
    return stryMutAct_9fa48("23130") ? actions.every(action => action.kind === "bad-destination-hash") : (stryCov_9fa48("23130"), actions.some(stryMutAct_9fa48("23131") ? () => undefined : (stryCov_9fa48("23131"), action => stryMutAct_9fa48("23134") ? action.kind !== "bad-destination-hash" : stryMutAct_9fa48("23133") ? false : stryMutAct_9fa48("23132") ? true : (stryCov_9fa48("23132", "23133", "23134"), action.kind === (stryMutAct_9fa48("23135") ? "" : (stryCov_9fa48("23135"), "bad-destination-hash"))))));
  }
}
export function shouldRejectPacketFromFieldsPlanHeader2MissingTransportId(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23136")) {
    {}
  } else {
    stryCov_9fa48("23136");
    return stryMutAct_9fa48("23137") ? actions.every(action => action.kind === "header2-missing-transport-id") : (stryCov_9fa48("23137"), actions.some(stryMutAct_9fa48("23138") ? () => undefined : (stryCov_9fa48("23138"), action => stryMutAct_9fa48("23141") ? action.kind !== "header2-missing-transport-id" : stryMutAct_9fa48("23140") ? false : stryMutAct_9fa48("23139") ? true : (stryCov_9fa48("23139", "23140", "23141"), action.kind === (stryMutAct_9fa48("23142") ? "" : (stryCov_9fa48("23142"), "header2-missing-transport-id"))))));
  }
}
export function shouldRejectPacketFromFieldsPlanBadTransportId(actions: ReadonlyArray<PacketFromFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("23143")) {
    {}
  } else {
    stryCov_9fa48("23143");
    return stryMutAct_9fa48("23144") ? actions.every(action => action.kind === "bad-transport-id") : (stryCov_9fa48("23144"), actions.some(stryMutAct_9fa48("23145") ? () => undefined : (stryCov_9fa48("23145"), action => stryMutAct_9fa48("23148") ? action.kind !== "bad-transport-id" : stryMutAct_9fa48("23147") ? false : stryMutAct_9fa48("23146") ? true : (stryCov_9fa48("23146", "23147", "23148"), action.kind === (stryMutAct_9fa48("23149") ? "" : (stryCov_9fa48("23149"), "bad-transport-id"))))));
  }
}

/**
 * Packet fromFields gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketFromFieldsPlanWithActions}
 * (`ok`|`bad-*`|`header2-missing-transport-id`).
 */
export type PacketFromFieldsState = Record<string, never>;
export type PacketFromFieldsEvent = Event | {
  readonly kind: "packet/from-fields-gate";
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
  readonly destinationHashLength: number;
  readonly transportIdPresent: boolean;
  readonly transportIdLength: number;
};

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepPacketFromFieldsPlanWithActions}
 * (`ok`|`bad-*`|`header2-missing-transport-id`).
 */
export type PacketFromFieldsAction = {
  readonly kind: PacketFromFieldsPlan;
};
export interface PacketFromFieldsStepResult {
  readonly state: PacketFromFieldsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketFromFieldsAction[];
}
export function stepPacketFromFieldsWithActions(state: PacketFromFieldsState, event: PacketFromFieldsEvent): PacketFromFieldsStepResult {
  if (stryMutAct_9fa48("23150")) {
    {}
  } else {
    stryCov_9fa48("23150");
    return stepPacketFromFieldsInner(state, event);
  }
}
export function stepPacketFromFieldsInner(state: PacketFromFieldsState, event: PacketFromFieldsEvent): PacketFromFieldsStepResult {
  if (stryMutAct_9fa48("23151")) {
    {}
  } else {
    stryCov_9fa48("23151");
    if (stryMutAct_9fa48("23154") ? event.kind !== "packet/from-fields-gate" : stryMutAct_9fa48("23153") ? false : stryMutAct_9fa48("23152") ? true : (stryCov_9fa48("23152", "23153", "23154"), event.kind === (stryMutAct_9fa48("23155") ? "" : (stryCov_9fa48("23155"), "packet/from-fields-gate")))) {
      if (stryMutAct_9fa48("23156")) {
        {}
      } else {
        stryCov_9fa48("23156");
        const planActions = stepPacketFromFieldsPlanWithActions(initialPacketFromFieldsPlanState(), stryMutAct_9fa48("23157") ? {} : (stryCov_9fa48("23157"), {
          kind: stryMutAct_9fa48("23158") ? "" : (stryCov_9fa48("23158"), "packet/from-fields-plan-gate"),
          headerType: event.headerType,
          contextFlag: event.contextFlag,
          transportType: event.transportType,
          destinationType: event.destinationType,
          packetType: event.packetType,
          destinationHashLength: event.destinationHashLength,
          transportIdPresent: event.transportIdPresent,
          transportIdLength: event.transportIdLength
        })).actions;
        const plan = packetFromFieldsPlanFromActions(planActions);
        if (stryMutAct_9fa48("23161") ? plan !== null : stryMutAct_9fa48("23160") ? false : stryMutAct_9fa48("23159") ? true : (stryCov_9fa48("23159", "23160", "23161"), plan === null)) {
          if (stryMutAct_9fa48("23162")) {
            {}
          } else {
            stryCov_9fa48("23162");
            return stryMutAct_9fa48("23163") ? {} : (stryCov_9fa48("23163"), {
              state,
              intents: stryMutAct_9fa48("23164") ? ["Stryker was here"] : (stryCov_9fa48("23164"), []),
              actions: stryMutAct_9fa48("23165") ? ["Stryker was here"] : (stryCov_9fa48("23165"), [])
            });
          }
        }
        return stryMutAct_9fa48("23166") ? {} : (stryCov_9fa48("23166"), {
          state,
          intents: stryMutAct_9fa48("23167") ? ["Stryker was here"] : (stryCov_9fa48("23167"), []),
          actions: stryMutAct_9fa48("23168") ? [] : (stryCov_9fa48("23168"), [stryMutAct_9fa48("23169") ? {} : (stryCov_9fa48("23169"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("23170") ? {} : (stryCov_9fa48("23170"), {
      state,
      intents: stryMutAct_9fa48("23171") ? ["Stryker was here"] : (stryCov_9fa48("23171"), []),
      actions: stryMutAct_9fa48("23172") ? ["Stryker was here"] : (stryCov_9fa48("23172"), [])
    });
  }
}