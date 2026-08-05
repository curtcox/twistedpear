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
import {
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  TRANSPORT_BROADCAST,
  TRANSPORT_ID_BYTES,
  TRANSPORT_TRANSPORT,
} from "../transport-framing.js";
import { decodePacketRaw } from "./part-2.js";
import type { PacketHeaderFields } from "./part-1.js";
import type { DecodePacketRawState } from "./part-2.js";
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
  event: DecodePacketRawEvent,
): DecodePacketRawStepResult {
  if (event.kind === "packet-header/decode-gate") {
    const fields = decodePacketRaw(event.raw);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodePacketRaw(
  actions: ReadonlyArray<DecodePacketRawAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectDecodePacketRaw(
  actions: ReadonlyArray<DecodePacketRawAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract decoded packet header fields from step actions; null when no `use-fields`. */
export function packetHeaderFieldsFromActions(
  actions: ReadonlyArray<DecodePacketRawAction>,
): PacketHeaderFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
