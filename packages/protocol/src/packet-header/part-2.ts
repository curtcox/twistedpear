/** Extracted from packet-header.ts; the original module remains the public composition point. */
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
import { PACKET_HEADER_2, TRANSPORT_ID_BYTES } from "../transport-framing.js";
import {
  concatBytes,
  isContextFlag,
  isDestinationTypeCode,
  isHeaderType,
  isPacketType,
  isTransportType,
  packPacketFlags,
  stepPacketFromFieldsInner,
  unpackPacketFlags,
} from "./part-1.js";
import type {
  PacketFromFieldsAction,
  PacketFromFieldsEvent,
  PacketFromFieldsState,
  PacketHeaderFields,
} from "./part-1.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
export function initialPacketFromFieldsState(): PacketFromFieldsState {
  return {};
}

export const stepPacketFromFields: StepFn<PacketFromFieldsState> = (
  state,
  event,
) => {
  const result = stepPacketFromFieldsInner(
    state,
    event as PacketFromFieldsEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function shouldProceedPacketFromFields(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "ok");
}

export function shouldRejectPacketFromFieldsBadHeaderType(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "bad-header-type");
}

export function shouldRejectPacketFromFieldsBadContextFlag(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "bad-context-flag");
}

export function shouldRejectPacketFromFieldsBadTransportType(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "bad-transport-type");
}

export function shouldRejectPacketFromFieldsBadDestinationType(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "bad-destination-type");
}

export function shouldRejectPacketFromFieldsBadPacketType(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "bad-packet-type");
}

export function shouldRejectPacketFromFieldsBadDestinationHash(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "bad-destination-hash");
}

export function shouldRejectPacketFromFieldsHeader2MissingTransportId(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return actions.some(
    (action) => action.kind === "header2-missing-transport-id",
  );
}

export function shouldRejectPacketFromFieldsBadTransportId(
  actions: ReadonlyArray<PacketFromFieldsAction>,
): boolean {
  return hasActionOfKind(actions, "bad-transport-id");
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
    if (
      fields.transportId === null ||
      fields.transportId.length !== TRANSPORT_ID_BYTES
    ) {
      throw new Error(
        `HEADER_2 packets require a ${TRANSPORT_ID_BYTES}-byte transport id`,
      );
    }
  }

  const flags = packPacketFlags(fields);
  const header =
    fields.headerType === PACKET_HEADER_2
      ? concatBytes(
          new Uint8Array([flags, fields.hops & 0xff]),
          fields.transportId!,
          fields.destinationHash,
        )
      : concatBytes(
          new Uint8Array([flags, fields.hops & 0xff]),
          fields.destinationHash,
        );

  return concatBytes(
    header,
    new Uint8Array([fields.context & 0xff]),
    fields.data,
  );
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
      destinationHash: raw.subarray(
        2 + TRANSPORT_ID_BYTES,
        2 + TRANSPORT_ID_BYTES * 2,
      ),
      context: raw[2 + TRANSPORT_ID_BYTES * 2]!,
      data: raw.subarray(3 + TRANSPORT_ID_BYTES * 2),
    };
  }

  return {
    ...unpacked,
    hops,
    transportId: null,
    destinationHash: raw.subarray(2, 2 + TRANSPORT_ID_BYTES),
    context: raw[2 + TRANSPORT_ID_BYTES]!,
    data: raw.subarray(3 + TRANSPORT_ID_BYTES),
  };
}

/** Bytes hashed for packet identity (low nibble of flags + body after header). */
export function packetHashablePart(
  raw: Uint8Array,
  headerType: number,
): Uint8Array {
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
  event: PackPacketFlagsEvent,
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
            packetType: event.packetType,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackPacketFlags(
  actions: ReadonlyArray<PackPacketFlagsAction>,
): boolean {
  return hasActionOfKind(actions, "use-flags");
}

/** Extract packed flags byte from step actions; null when no `use-flags`. */
export function packPacketFlagsFromActions(
  actions: ReadonlyArray<PackPacketFlagsAction>,
): number | null {
  return firstActionOfKind(actions, "use-flags")?.flags ?? null;
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
  event: UnpackPacketFlagsEvent,
): UnpackPacketFlagsStepResult {
  if (event.kind === "packet-header/unpack-flags-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields: unpackPacketFlags(event.flags) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackPacketFlags(
  actions: ReadonlyArray<UnpackPacketFlagsAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/** Extract unpacked flag fields from step actions; null when no `use-fields`. */
export function packetFlagsFieldsFromActions(
  actions: ReadonlyArray<UnpackPacketFlagsAction>,
): PacketFlagsFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
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
  event: PacketHashablePartEvent,
): PacketHashablePartStepResult {
  if (event.kind === "packet-header/hashable-part-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packetHashablePart(event.raw, event.headerType),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePacketHashablePart(
  actions: ReadonlyArray<PacketHashablePartAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract hashable-part bytes from step actions; null when no `use-raw`. */
export function packetHashablePartRawFromActions(
  actions: ReadonlyArray<PacketHashablePartAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
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
  event: EncodePacketRawEvent,
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
              transportId: event.transportId,
            }),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodePacketRaw(
  actions: ReadonlyArray<EncodePacketRawAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectEncodePacketRaw(
  actions: ReadonlyArray<EncodePacketRawAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract packed packet bytes from step actions; null when no `use-raw`. */
export function encodePacketRawFromActions(
  actions: ReadonlyArray<EncodePacketRawAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Packet raw decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodePacketRaw` reads
 * beside the step). Truncated / invalid frames become `reject`.
 */
export type DecodePacketRawState = Record<string, never>;
