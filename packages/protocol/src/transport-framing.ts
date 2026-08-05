/**
 * Pure RNS transport header wrap / strip / relay framing.
 * Packet construction and iface send stay at the adapter edge.
 * Wrap / strip / relay / hop-rewrite conclusions leave via machine actions
 * (no ad-hoc `wrapTransportPacketBytes` / `stripTransportHeadersBytes` /
 * `relayTransportPacketBytes` / `rewritePacketHopsBytes` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const PACKET_HEADER_1 = 0x00;
export const PACKET_HEADER_2 = 0x01;
export const TRANSPORT_BROADCAST = 0x00;
export const TRANSPORT_TRANSPORT = 0x01;
export const TRANSPORT_ID_BYTES = 16;

/** Low nibble of packed packet flags (destination type + packet type). */
export function packetFlagsLowNibble(packedFlags: number): number {
  return packedFlags & 0x0f;
}

export function wrapTransportPacketBytes(input: {
  readonly packedFlags: number;
  readonly hops: number;
  readonly raw: Uint8Array;
  readonly nextHop: Uint8Array;
}): Uint8Array {
  if (input.nextHop.length !== TRANSPORT_ID_BYTES) {
    throw new Error(`nextHop must be ${TRANSPORT_ID_BYTES} bytes`);
  }
  if (input.raw.length < 2) {
    throw new Error("packet raw too short");
  }

  const flags =
    (PACKET_HEADER_2 << 6) |
    (TRANSPORT_TRANSPORT << 4) |
    packetFlagsLowNibble(input.packedFlags);
  const header = new Uint8Array([flags, input.hops & 0xff]);
  const rest = input.raw.subarray(2);
  const wrapped = new Uint8Array(header.length + input.nextHop.length + rest.length);
  wrapped.set(header, 0);
  wrapped.set(input.nextHop, header.length);
  wrapped.set(rest, header.length + input.nextHop.length);
  return wrapped;
}

export function stripTransportHeadersBytes(raw: Uint8Array): Uint8Array {
  if (raw.length < 2 + TRANSPORT_ID_BYTES) {
    throw new Error("transport packet too short to strip");
  }

  const flags =
    ((raw[0]! & 0b00001111) | (PACKET_HEADER_1 << 6) | (TRANSPORT_BROADCAST << 4)) & 0xff;
  const output = new Uint8Array(raw.length - TRANSPORT_ID_BYTES);
  output[0] = flags;
  output[1] = raw[1]!;
  output.set(raw.subarray(2 + TRANSPORT_ID_BYTES), 2);
  return output;
}

export function relayTransportPacketBytes(input: {
  readonly raw: Uint8Array;
  readonly hops: number;
  readonly remainingHops: number;
  readonly nextHop: Uint8Array;
}): Uint8Array {
  if (input.remainingHops > 1) {
    if (input.nextHop.length !== TRANSPORT_ID_BYTES) {
      throw new Error(`nextHop must be ${TRANSPORT_ID_BYTES} bytes`);
    }
    if (input.raw.length < 2 + TRANSPORT_ID_BYTES) {
      throw new Error("transport packet too short to relay");
    }
    const raw = new Uint8Array(input.raw.length);
    raw[0] = input.raw[0]!;
    raw[1] = input.hops & 0xff;
    raw.set(input.nextHop, 2);
    raw.set(input.raw.subarray(2 + TRANSPORT_ID_BYTES), 2 + TRANSPORT_ID_BYTES);
    return raw;
  }

  if (input.remainingHops === 1) {
    return stripTransportHeadersBytes(input.raw);
  }

  if (input.raw.length < 2 + TRANSPORT_ID_BYTES) {
    throw new Error("transport packet too short to deliver");
  }
  const raw = new Uint8Array(input.raw.length - TRANSPORT_ID_BYTES);
  raw[0] = input.raw[0]!;
  raw[1] = input.hops & 0xff;
  raw.set(input.raw.subarray(2 + TRANSPORT_ID_BYTES), 2);
  return raw;
}

/** Rewrite only the hops byte of an already-framed packet (forward / reverse relay). */
export function rewritePacketHopsBytes(raw: Uint8Array, hops: number): Uint8Array {
  if (raw.length < 2) {
    throw new Error("packet raw too short");
  }
  const output = new Uint8Array(raw.length);
  output[0] = raw[0]!;
  output[1] = hops & 0xff;
  output.set(raw.subarray(2), 2);
  return output;
}

/**
 * Transport wrap framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `wrapTransportPacketBytes`
 * reads beside the step).
 */
export type WrapTransportPacketState = Record<string, never>;

export type WrapTransportPacketEvent =
  | Event
  | {
      readonly kind: "transport/wrap-packet-gate";
      readonly packedFlags: number;
      readonly hops: number;
      readonly raw: Uint8Array;
      readonly nextHop: Uint8Array;
    };

export type WrapTransportPacketAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface WrapTransportPacketStepResult {
  readonly state: WrapTransportPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly WrapTransportPacketAction[];
}

export function initialWrapTransportPacketState(): WrapTransportPacketState {
  return {};
}

export function stepWrapTransportPacketWithActions(
  state: WrapTransportPacketState,
  event: WrapTransportPacketEvent
): WrapTransportPacketStepResult {
  if (event.kind === "transport/wrap-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: wrapTransportPacketBytes({
            packedFlags: event.packedFlags,
            hops: event.hops,
            raw: event.raw,
            nextHop: event.nextHop
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseWrapTransportPacket(
  actions: ReadonlyArray<WrapTransportPacketAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract wrap framing bytes from step actions; null when no `use-raw` action. */
export function wrapTransportPacketRawFromActions(
  actions: ReadonlyArray<WrapTransportPacketAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Transport header strip framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `stripTransportHeadersBytes`
 * reads beside the step).
 */
export type StripTransportHeadersState = Record<string, never>;

export type StripTransportHeadersEvent =
  | Event
  | {
      readonly kind: "transport/strip-headers-gate";
      readonly raw: Uint8Array;
    };

export type StripTransportHeadersAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface StripTransportHeadersStepResult {
  readonly state: StripTransportHeadersState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StripTransportHeadersAction[];
}

export function initialStripTransportHeadersState(): StripTransportHeadersState {
  return {};
}

export function stepStripTransportHeadersWithActions(
  state: StripTransportHeadersState,
  event: StripTransportHeadersEvent
): StripTransportHeadersStepResult {
  if (event.kind === "transport/strip-headers-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: stripTransportHeadersBytes(event.raw) }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseStripTransportHeaders(
  actions: ReadonlyArray<StripTransportHeadersAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract strip framing bytes from step actions; null when no `use-raw` action. */
export function stripTransportHeadersRawFromActions(
  actions: ReadonlyArray<StripTransportHeadersAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Transport relay byte framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `relayTransportPacketBytes`
 * reads beside the step).
 */
export type RelayTransportPacketState = Record<string, never>;

export type RelayTransportPacketEvent =
  | Event
  | {
      readonly kind: "transport/relay-packet-bytes-gate";
      readonly raw: Uint8Array;
      readonly hops: number;
      readonly remainingHops: number;
      readonly nextHop: Uint8Array;
    };

export type RelayTransportPacketAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface RelayTransportPacketStepResult {
  readonly state: RelayTransportPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RelayTransportPacketAction[];
}

export function initialRelayTransportPacketState(): RelayTransportPacketState {
  return {};
}

export function stepRelayTransportPacketWithActions(
  state: RelayTransportPacketState,
  event: RelayTransportPacketEvent
): RelayTransportPacketStepResult {
  if (event.kind === "transport/relay-packet-bytes-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: relayTransportPacketBytes({
            raw: event.raw,
            hops: event.hops,
            remainingHops: event.remainingHops,
            nextHop: event.nextHop
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseRelayTransportPacket(
  actions: ReadonlyArray<RelayTransportPacketAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract relay framing bytes from step actions; null when no `use-raw` action. */
export function relayTransportPacketRawFromActions(
  actions: ReadonlyArray<RelayTransportPacketAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Packet hop-byte rewrite is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `rewritePacketHopsBytes`
 * reads beside the step).
 */
export type RewritePacketHopsState = Record<string, never>;

export type RewritePacketHopsEvent =
  | Event
  | {
      readonly kind: "transport/rewrite-packet-hops-gate";
      readonly raw: Uint8Array;
      readonly hops: number;
    };

export type RewritePacketHopsAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface RewritePacketHopsStepResult {
  readonly state: RewritePacketHopsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RewritePacketHopsAction[];
}

export function initialRewritePacketHopsState(): RewritePacketHopsState {
  return {};
}

export function stepRewritePacketHopsWithActions(
  state: RewritePacketHopsState,
  event: RewritePacketHopsEvent
): RewritePacketHopsStepResult {
  if (event.kind === "transport/rewrite-packet-hops-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: rewritePacketHopsBytes(event.raw, event.hops) }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseRewritePacketHops(
  actions: ReadonlyArray<RewritePacketHopsAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract hop-rewrite framing bytes from step actions; null when no `use-raw` action. */
export function rewritePacketHopsRawFromActions(
  actions: ReadonlyArray<RewritePacketHopsAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
