/**
 * Pure binary frame encode/decode for the RNS WS interface.
 * Socket IO stays at the adapter edge.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeWsBinaryFrame` / `decodeWsClientFrame` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const WS_OPCODE_BINARY = 0x2;
export const WS_OPCODE_CLOSE = 0x8;
export const WS_FIN_BINARY = 0x82;

export interface WsBinaryFrame {
  readonly opcode: number;
  readonly payload: Uint8Array;
  readonly consumed: number;
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

/** Encode an unmasked server→client binary frame. */
export function encodeWsBinaryFrame(data: Uint8Array): Uint8Array {
  if (data.length < 126) {
    return concatBytes(new Uint8Array([WS_FIN_BINARY, data.length]), data);
  }

  if (data.length <= 0xffff) {
    const header = new Uint8Array(4);
    header[0] = WS_FIN_BINARY;
    header[1] = 126;
    header[2] = (data.length >> 8) & 0xff;
    header[3] = data.length & 0xff;
    return concatBytes(header, data);
  }

  const header = new Uint8Array(10);
  header[0] = WS_FIN_BINARY;
  header[1] = 127;
  const view = new DataView(header.buffer);
  view.setBigUint64(2, BigInt(data.length), false);
  return concatBytes(header, data);
}

/** Decode a masked client→server frame; returns null if incomplete. */
export function decodeWsClientFrame(buffer: Uint8Array): WsBinaryFrame | null {
  if (buffer.length < 2) {
    return null;
  }

  const opcode = buffer[0]! & 0x0f;
  const masked = (buffer[1]! & 0x80) !== 0;
  let length = buffer[1]! & 0x7f;
  let offset = 2;

  if (length === 126) {
    if (buffer.length < offset + 2) {
      return null;
    }
    length = (buffer[offset]! << 8) | buffer[offset + 1]!;
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) {
      return null;
    }
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
    const bigLength = view.getBigUint64(0, false);
    if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("binary frame too large");
    }
    length = Number(bigLength);
    offset += 8;
  }

  if (!masked || buffer.length < offset + 4 + length) {
    return null;
  }

  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;
  const payload = Uint8Array.from(buffer.subarray(offset, offset + length));
  for (let index = 0; index < payload.length; index += 1) {
    payload[index] = payload[index]! ^ mask[index % 4]!;
  }

  return { opcode, payload, consumed: offset + length };
}

/**
 * WS binary encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeWsBinaryFrame`
 * reads beside the step).
 */
export type EncodeWsBinaryFrameState = Record<string, never>;

export type EncodeWsBinaryFrameEvent =
  | Event
  | {
      readonly kind: "ws-frame/encode-gate";
      readonly data: Uint8Array;
    };

export type EncodeWsBinaryFrameAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface EncodeWsBinaryFrameStepResult {
  readonly state: EncodeWsBinaryFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeWsBinaryFrameAction[];
}

export function initialEncodeWsBinaryFrameState(): EncodeWsBinaryFrameState {
  return {};
}

export function stepEncodeWsBinaryFrameWithActions(
  state: EncodeWsBinaryFrameState,
  event: EncodeWsBinaryFrameEvent
): EncodeWsBinaryFrameStepResult {
  if (event.kind === "ws-frame/encode-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: encodeWsBinaryFrame(event.data) }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeWsBinaryFrame(
  actions: ReadonlyArray<EncodeWsBinaryFrameAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract encoded WS binary frame from step actions; null when no `use-raw`. */
export function encodeWsBinaryFrameRawFromActions(
  actions: ReadonlyArray<EncodeWsBinaryFrameAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * WS client-frame decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeWsClientFrame`
 * reads beside the step). Incomplete or oversized frames become `reject`.
 */
export type DecodeWsClientFrameState = Record<string, never>;

export type DecodeWsClientFrameEvent =
  | Event
  | {
      readonly kind: "ws-frame/decode-gate";
      readonly buffer: Uint8Array;
    };

export type DecodeWsClientFrameAction =
  | { readonly kind: "use-fields"; readonly fields: WsBinaryFrame }
  | { readonly kind: "reject" };

export interface DecodeWsClientFrameStepResult {
  readonly state: DecodeWsClientFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeWsClientFrameAction[];
}

export function initialDecodeWsClientFrameState(): DecodeWsClientFrameState {
  return {};
}

export function stepDecodeWsClientFrameWithActions(
  state: DecodeWsClientFrameState,
  event: DecodeWsClientFrameEvent
): DecodeWsClientFrameStepResult {
  if (event.kind === "ws-frame/decode-gate") {
    try {
      const fields = decodeWsClientFrame(event.buffer);
      if (fields === null) {
        return { state, intents: [], actions: [{ kind: "reject" }] };
      }
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields }]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodeWsClientFrame(
  actions: ReadonlyArray<DecodeWsClientFrameAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectDecodeWsClientFrame(
  actions: ReadonlyArray<DecodeWsClientFrameAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract decoded WS client frame from step actions; null when no `use-fields`. */
export function wsClientFrameFromActions(
  actions: ReadonlyArray<DecodeWsClientFrameAction>
): WsBinaryFrame | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
