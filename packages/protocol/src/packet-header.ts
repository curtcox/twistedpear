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
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  TRANSPORT_BROADCAST,
  TRANSPORT_ID_BYTES,
  TRANSPORT_TRANSPORT
} from "./transport-framing.js";

export {
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  TRANSPORT_BROADCAST,
  TRANSPORT_ID_BYTES,
  TRANSPORT_TRANSPORT
};

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

export type PacketHeaderTypeCodeValue =
  (typeof PacketHeaderTypeCode)[keyof typeof PacketHeaderTypeCode];

/** Named context-flag codes. */
export const PacketContextFlagCode = {
  UNSET: PACKET_CONTEXT_FLAG_UNSET,
  SET: PACKET_CONTEXT_FLAG_SET
} as const;

export type PacketContextFlagCodeValue =
  (typeof PacketContextFlagCode)[keyof typeof PacketContextFlagCode];

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

export type DestinationTypeCodeValue =
  (typeof DestinationTypeCode)[keyof typeof DestinationTypeCode];

/** Named destination-direction codes (RNS Destination.IN / OUT). */
export const DestinationDirectionCode = {
  IN: 0x11,
  OUT: 0x12
} as const;

export type DestinationDirectionCodeValue =
  (typeof DestinationDirectionCode)[keyof typeof DestinationDirectionCode];

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

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function packPacketFlags(input: {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
}): number {
  return (
    ((input.headerType & 0x03) << 6) |
    ((input.contextFlag & 0x01) << 5) |
    ((input.transportType & 0x01) << 4) |
    ((input.destinationType & 0x03) << 2) |
    (input.packetType & 0x03)
  );
}

export function unpackPacketFlags(flags: number): {
  readonly headerType: number;
  readonly contextFlag: number;
  readonly transportType: number;
  readonly destinationType: number;
  readonly packetType: number;
} {
  return {
    headerType: (flags & 0b11000000) >> 6,
    contextFlag: (flags & 0b00100000) >> 5,
    transportType: (flags & 0b00010000) >> 4,
    destinationType: (flags & 0b00001100) >> 2,
    packetType: flags & 0b00000011
  };
}

function isHeaderType(value: number): boolean {
  return value === PACKET_HEADER_1 || value === PACKET_HEADER_2;
}

function isContextFlag(value: number): boolean {
  return value === PACKET_CONTEXT_FLAG_UNSET || value === PACKET_CONTEXT_FLAG_SET;
}

function isTransportType(value: number): boolean {
  return value === TRANSPORT_BROADCAST || value === TRANSPORT_TRANSPORT;
}

export function isDestinationTypeCode(value: number): boolean {
  return (
    value === PACKET_DEST_TYPE_SINGLE ||
    value === PACKET_DEST_TYPE_GROUP ||
    value === PACKET_DEST_TYPE_PLAIN ||
    value === PACKET_DEST_TYPE_LINK
  );
}

export function isDestinationDirectionCode(value: number): boolean {
  return (
    value === DestinationDirectionCode.IN || value === DestinationDirectionCode.OUT
  );
}

function isPacketType(value: number): boolean {
  return (
    value === PACKET_TYPE_DATA ||
    value === PACKET_TYPE_ANNOUNCE ||
    value === PACKET_TYPE_LINKREQUEST ||
    value === PACKET_TYPE_PROOF
  );
}

export function isHeaderTypeCode(value: number): boolean {
  return isHeaderType(value);
}

export function isContextFlagCode(value: number): boolean {
  return isContextFlag(value);
}

export function isTransportTypeCode(value: number): boolean {
  return isTransportType(value);
}

export function isPacketTypeCode(value: number): boolean {
  return isPacketType(value);
}

export type PacketFromFieldsPlan =
  | "ok"
  | "bad-header-type"
  | "bad-context-flag"
  | "bad-transport-type"
  | "bad-destination-type"
  | "bad-packet-type"
  | "bad-destination-hash"
  | "header2-missing-transport-id"
  | "bad-transport-id";

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
  if (!isHeaderTypeCode(input.headerType)) {
    return "bad-header-type";
  }
  if (!isContextFlagCode(input.contextFlag)) {
    return "bad-context-flag";
  }
  if (!isTransportTypeCode(input.transportType)) {
    return "bad-transport-type";
  }
  if (!isDestinationTypeCode(input.destinationType)) {
    return "bad-destination-type";
  }
  if (!isPacketTypeCode(input.packetType)) {
    return "bad-packet-type";
  }
  if (input.destinationHashLength !== TRANSPORT_ID_BYTES) {
    return "bad-destination-hash";
  }
  if (input.headerType === PACKET_HEADER_2) {
    if (!input.transportIdPresent) {
      return "header2-missing-transport-id";
    }
    if (input.transportIdLength !== TRANSPORT_ID_BYTES) {
      return "bad-transport-id";
    }
  }
  return "ok";
}

/**
 * Packet-from-fields-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketFromFields` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketFromFieldsWithActions}.
 */
export type PacketFromFieldsPlanState = Record<string, never>;

export type PacketFromFieldsPlanEvent =
  | Event
  | {
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

export type PacketFromFieldsPlanAction = { readonly kind: PacketFromFieldsPlan };

export interface PacketFromFieldsPlanStepResult {
  readonly state: PacketFromFieldsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketFromFieldsPlanAction[];
}

export function initialPacketFromFieldsPlanState(): PacketFromFieldsPlanState {
  return {};
}

export function stepPacketFromFieldsPlanWithActions(
  state: PacketFromFieldsPlanState,
  event: PacketFromFieldsPlanEvent
): PacketFromFieldsPlanStepResult {
  if (event.kind === "packet/from-fields-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planPacketFromFields({
            headerType: event.headerType,
            contextFlag: event.contextFlag,
            transportType: event.transportType,
            destinationType: event.destinationType,
            packetType: event.packetType,
            destinationHashLength: event.destinationHashLength,
            transportIdPresent: event.transportIdPresent,
            transportIdLength: event.transportIdLength
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the fromFields plan from actions; null when empty. */
export function packetFromFieldsPlanFromActions(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): PacketFromFieldsPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "bad-header-type" ||
      entry.kind === "bad-context-flag" ||
      entry.kind === "bad-transport-type" ||
      entry.kind === "bad-destination-type" ||
      entry.kind === "bad-packet-type" ||
      entry.kind === "bad-destination-hash" ||
      entry.kind === "header2-missing-transport-id" ||
      entry.kind === "bad-transport-id"
  );
  return action?.kind ?? null;
}

export function shouldProceedPacketFromFieldsPlan(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectPacketFromFieldsPlanBadHeaderType(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "bad-header-type");
}

export function shouldRejectPacketFromFieldsPlanBadContextFlag(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "bad-context-flag");
}

export function shouldRejectPacketFromFieldsPlanBadTransportType(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "bad-transport-type");
}

export function shouldRejectPacketFromFieldsPlanBadDestinationType(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "bad-destination-type");
}

export function shouldRejectPacketFromFieldsPlanBadPacketType(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "bad-packet-type");
}

export function shouldRejectPacketFromFieldsPlanBadDestinationHash(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "bad-destination-hash");
}

export function shouldRejectPacketFromFieldsPlanHeader2MissingTransportId(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "header2-missing-transport-id");
}

export function shouldRejectPacketFromFieldsPlanBadTransportId(
  actions: ReadonlyArray<PacketFromFieldsPlanAction>
): boolean {
  return actions.some((action) => action.kind === "bad-transport-id");
}

/**
 * Packet fromFields gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketFromFieldsPlanWithActions}
 * (`ok`|`bad-*`|`header2-missing-transport-id`).
 */
export type PacketFromFieldsState = Record<string, never>;

export type PacketFromFieldsEvent =
  | Event
  | {
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
export type PacketFromFieldsAction = { readonly kind: PacketFromFieldsPlan };

export interface PacketFromFieldsStepResult {
  readonly state: PacketFromFieldsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketFromFieldsAction[];
}

export function initialPacketFromFieldsState(): PacketFromFieldsState {
  return {};
}

export const stepPacketFromFields: StepFn<PacketFromFieldsState> = (state, event) => {
  const result = stepPacketFromFieldsInner(state, event as PacketFromFieldsEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPacketFromFieldsWithActions(
  state: PacketFromFieldsState,
  event: PacketFromFieldsEvent
): PacketFromFieldsStepResult {
  return stepPacketFromFieldsInner(state, event);
}

export function shouldProceedPacketFromFields(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectPacketFromFieldsBadHeaderType(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "bad-header-type");
}

export function shouldRejectPacketFromFieldsBadContextFlag(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "bad-context-flag");
}

export function shouldRejectPacketFromFieldsBadTransportType(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "bad-transport-type");
}

export function shouldRejectPacketFromFieldsBadDestinationType(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "bad-destination-type");
}

export function shouldRejectPacketFromFieldsBadPacketType(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "bad-packet-type");
}

export function shouldRejectPacketFromFieldsBadDestinationHash(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "bad-destination-hash");
}

export function shouldRejectPacketFromFieldsHeader2MissingTransportId(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "header2-missing-transport-id");
}

export function shouldRejectPacketFromFieldsBadTransportId(
  actions: ReadonlyArray<PacketFromFieldsAction>
): boolean {
  return actions.some((action) => action.kind === "bad-transport-id");
}

function stepPacketFromFieldsInner(
  state: PacketFromFieldsState,
  event: PacketFromFieldsEvent
): PacketFromFieldsStepResult {
  if (event.kind === "packet/from-fields-gate") {
    const planActions = stepPacketFromFieldsPlanWithActions(initialPacketFromFieldsPlanState(), {
      kind: "packet/from-fields-plan-gate",
      headerType: event.headerType,
      contextFlag: event.contextFlag,
      transportType: event.transportType,
      destinationType: event.destinationType,
      packetType: event.packetType,
      destinationHashLength: event.destinationHashLength,
      transportIdPresent: event.transportIdPresent,
      transportIdLength: event.transportIdLength
    }).actions;
    const plan = packetFromFieldsPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
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
  if (fields.destinationHash.length !== TRANSPORT_ID_BYTES) {
    throw new Error(`destination hash must be ${TRANSPORT_ID_BYTES} bytes`);
  }
  if (fields.headerType === PACKET_HEADER_2) {
    if (fields.transportId === null || fields.transportId.length !== TRANSPORT_ID_BYTES) {
      throw new Error(`HEADER_2 packets require a ${TRANSPORT_ID_BYTES}-byte transport id`);
    }
  }

  const flags = packPacketFlags(fields);
  const header =
    fields.headerType === PACKET_HEADER_2
      ? concatBytes(
          new Uint8Array([flags, fields.hops & 0xff]),
          fields.transportId!,
          fields.destinationHash
        )
      : concatBytes(new Uint8Array([flags, fields.hops & 0xff]), fields.destinationHash);

  return concatBytes(header, new Uint8Array([fields.context & 0xff]), fields.data);
}

export function decodePacketRaw(raw: Uint8Array): PacketHeaderFields | null {
  if (raw.length < 2 + TRANSPORT_ID_BYTES + 1) {
    return null;
  }

  const unpacked = unpackPacketFlags(raw[0]!);
  const hops = raw[1]!;

  if (
    !isHeaderType(unpacked.headerType) ||
    !isContextFlag(unpacked.contextFlag) ||
    !isTransportType(unpacked.transportType) ||
    !isDestinationTypeCode(unpacked.destinationType) ||
    !isPacketType(unpacked.packetType)
  ) {
    return null;
  }

  if (unpacked.headerType === PACKET_HEADER_2) {
    if (raw.length < 2 + TRANSPORT_ID_BYTES * 2 + 1) {
      return null;
    }
    return {
      ...unpacked,
      hops,
      transportId: raw.subarray(2, 2 + TRANSPORT_ID_BYTES),
      destinationHash: raw.subarray(2 + TRANSPORT_ID_BYTES, 2 + TRANSPORT_ID_BYTES * 2),
      context: raw[2 + TRANSPORT_ID_BYTES * 2]!,
      data: raw.subarray(3 + TRANSPORT_ID_BYTES * 2)
    };
  }

  return {
    ...unpacked,
    hops,
    transportId: null,
    destinationHash: raw.subarray(2, 2 + TRANSPORT_ID_BYTES),
    context: raw[2 + TRANSPORT_ID_BYTES]!,
    data: raw.subarray(3 + TRANSPORT_ID_BYTES)
  };
}

/** Bytes hashed for packet identity (low nibble of flags + body after header). */
export function packetHashablePart(raw: Uint8Array, headerType: number): Uint8Array {
  const maskedFlags = new Uint8Array([raw[0]! & 0b00001111]);
  if (headerType === PACKET_HEADER_2) {
    return concatBytes(maskedFlags, raw.subarray(TRANSPORT_ID_BYTES + 2));
  }
  return concatBytes(maskedFlags, raw.subarray(2));
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

export type PackPacketFlagsEvent =
  | Event
  | ({
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
  return {};
}

export function stepPackPacketFlagsWithActions(
  state: PackPacketFlagsState,
  event: PackPacketFlagsEvent
): PackPacketFlagsStepResult {
  if (event.kind === "packet-header/pack-flags-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-flags",
          flags: packPacketFlags({
            headerType: event.headerType,
            contextFlag: event.contextFlag,
            transportType: event.transportType,
            destinationType: event.destinationType,
            packetType: event.packetType
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackPacketFlags(
  actions: ReadonlyArray<PackPacketFlagsAction>
): boolean {
  return actions.some((action) => action.kind === "use-flags");
}

/** Extract packed flags byte from step actions; null when no `use-flags`. */
export function packPacketFlagsFromActions(
  actions: ReadonlyArray<PackPacketFlagsAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-flags");
  return action?.kind === "use-flags" ? action.flags : null;
}

/**
 * Packet flag unpacking is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackPacketFlags` reads
 * beside the step).
 */
export type UnpackPacketFlagsState = Record<string, never>;

export type UnpackPacketFlagsEvent =
  | Event
  | {
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
  return {};
}

export function stepUnpackPacketFlagsWithActions(
  state: UnpackPacketFlagsState,
  event: UnpackPacketFlagsEvent
): UnpackPacketFlagsStepResult {
  if (event.kind === "packet-header/unpack-flags-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields: unpackPacketFlags(event.flags) }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackPacketFlags(
  actions: ReadonlyArray<UnpackPacketFlagsAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract unpacked flag fields from step actions; null when no `use-fields`. */
export function packetFlagsFieldsFromActions(
  actions: ReadonlyArray<UnpackPacketFlagsAction>
): PacketFlagsFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Packet hashable-part framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packetHashablePart` reads
 * beside the step).
 */
export type PacketHashablePartState = Record<string, never>;

export type PacketHashablePartEvent =
  | Event
  | {
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
  return {};
}

export function stepPacketHashablePartWithActions(
  state: PacketHashablePartState,
  event: PacketHashablePartEvent
): PacketHashablePartStepResult {
  if (event.kind === "packet-header/hashable-part-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packetHashablePart(event.raw, event.headerType)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePacketHashablePart(
  actions: ReadonlyArray<PacketHashablePartAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract hashable-part bytes from step actions; null when no `use-raw`. */
export function packetHashablePartRawFromActions(
  actions: ReadonlyArray<PacketHashablePartAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
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

export type EncodePacketRawEvent =
  | Event
  | ({
      readonly kind: "packet-header/encode-gate";
    } & EncodePacketRawFields);

export type EncodePacketRawAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface EncodePacketRawStepResult {
  readonly state: EncodePacketRawState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodePacketRawAction[];
}

export function initialEncodePacketRawState(): EncodePacketRawState {
  return {};
}

export function stepEncodePacketRawWithActions(
  state: EncodePacketRawState,
  event: EncodePacketRawEvent
): EncodePacketRawStepResult {
  if (event.kind === "packet-header/encode-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: encodePacketRaw({
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
            })
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodePacketRaw(
  actions: ReadonlyArray<EncodePacketRawAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectEncodePacketRaw(
  actions: ReadonlyArray<EncodePacketRawAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed packet bytes from step actions; null when no `use-raw`. */
export function encodePacketRawFromActions(
  actions: ReadonlyArray<EncodePacketRawAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Packet raw decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodePacketRaw` reads
 * beside the step). Truncated / invalid frames become `reject`.
 */
export type DecodePacketRawState = Record<string, never>;

export type DecodePacketRawEvent =
  | Event
  | {
      readonly kind: "packet-header/decode-gate";
      readonly raw: Uint8Array;
    };

export type DecodePacketRawAction =
  | { readonly kind: "use-fields"; readonly fields: PacketHeaderFields }
  | { readonly kind: "reject" };

export interface DecodePacketRawStepResult {
  readonly state: DecodePacketRawState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodePacketRawAction[];
}

export function initialDecodePacketRawState(): DecodePacketRawState {
  return {};
}

export function stepDecodePacketRawWithActions(
  state: DecodePacketRawState,
  event: DecodePacketRawEvent
): DecodePacketRawStepResult {
  if (event.kind === "packet-header/decode-gate") {
    const fields = decodePacketRaw(event.raw);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodePacketRaw(
  actions: ReadonlyArray<DecodePacketRawAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectDecodePacketRaw(
  actions: ReadonlyArray<DecodePacketRawAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract decoded packet header fields from step actions; null when no `use-fields`. */
export function packetHeaderFieldsFromActions(
  actions: ReadonlyArray<DecodePacketRawAction>
): PacketHeaderFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
