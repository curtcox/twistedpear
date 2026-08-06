/**
 * Pure HDLC byte stuffing for Reticulum interface framing.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeHdlcFrame` / `decodeHdlcFrames` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const HDLC_FLAG = 0x7e;
export const HDLC_ESCAPE = 0x7d;
export const HDLC_ESCAPE_MASK = 0x20;

export interface HdlcDecodeResult {
  readonly frames: ReadonlyArray<Uint8Array>;
  readonly buffer: Uint8Array;
  readonly inEscape: boolean;
}

export interface HdlcDecodeState {
  readonly buffer?: Uint8Array;
  readonly inEscape?: boolean;
}

export function encodeHdlcFrame(payload: Uint8Array): Uint8Array {
  const output: number[] = [HDLC_FLAG];

  for (const byte of payload) {
    if (byte === HDLC_FLAG || byte === HDLC_ESCAPE) {
      output.push(HDLC_ESCAPE, byte ^ HDLC_ESCAPE_MASK);
    } else {
      output.push(byte);
    }
  }

  output.push(HDLC_FLAG);
  return Uint8Array.from(output);
}

export function decodeHdlcFrames(
  input: Uint8Array,
  state: HdlcDecodeState = {},
): HdlcDecodeResult {
  const frames: Uint8Array[] = [];
  const buffer = Array.from(state.buffer ?? new Uint8Array());
  let inEscape = state.inEscape ?? false;

  for (const byte of input) {
    if (inEscape) {
      buffer.push(byte ^ HDLC_ESCAPE_MASK);
      inEscape = false;
      continue;
    }

    if (byte === HDLC_ESCAPE) {
      inEscape = true;
      continue;
    }

    if (byte === HDLC_FLAG) {
      if (buffer.length > 0) {
        frames.push(Uint8Array.from(buffer));
        buffer.length = 0;
      }
      continue;
    }

    buffer.push(byte);
  }

  return {
    frames,
    buffer: Uint8Array.from(buffer),
    inEscape,
  };
}

/** Streaming HDLC decode state for sim / step usage. */
export interface HdlcStreamState {
  readonly buffer: Uint8Array;
  readonly inEscape: boolean;
  readonly frames: ReadonlyArray<Uint8Array>;
}

export function initialHdlcStreamState(): HdlcStreamState {
  return { buffer: new Uint8Array(), inEscape: false, frames: [] };
}

export function pushHdlcBytes(
  state: HdlcStreamState,
  input: Uint8Array,
): HdlcStreamState {
  const decoded = decodeHdlcFrames(input, {
    buffer: state.buffer,
    inEscape: state.inEscape,
  });
  return {
    buffer: decoded.buffer,
    inEscape: decoded.inEscape,
    frames: [...state.frames, ...decoded.frames],
  };
}

/**
 * HDLC encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeHdlcFrame`
 * reads beside the step).
 */
export type EncodeHdlcFrameState = Record<string, never>;

export type EncodeHdlcFrameEvent =
  | Event
  | {
      readonly kind: "hdlc/encode-gate";
      readonly payload: Uint8Array;
    };

export type EncodeHdlcFrameAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface EncodeHdlcFrameStepResult {
  readonly state: EncodeHdlcFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeHdlcFrameAction[];
}

export function initialEncodeHdlcFrameState(): EncodeHdlcFrameState {
  return {};
}

export function stepEncodeHdlcFrameWithActions(
  state: EncodeHdlcFrameState,
  event: EncodeHdlcFrameEvent,
): EncodeHdlcFrameStepResult {
  if (event.kind === "hdlc/encode-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: encodeHdlcFrame(event.payload) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeHdlcFrame(
  actions: ReadonlyArray<EncodeHdlcFrameAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract encoded HDLC frame from step actions; null when no `use-raw`. */
export function encodeHdlcFrameRawFromActions(
  actions: ReadonlyArray<EncodeHdlcFrameAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * HDLC decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeHdlcFrames`
 * reads beside the step). Streaming always yields `use-fields` (partial
 * buffers are carry state, not rejects).
 */
export type DecodeHdlcFramesState = Record<string, never>;

export type DecodeHdlcFramesEvent =
  | Event
  | {
      readonly kind: "hdlc/decode-gate";
      readonly input: Uint8Array;
      readonly decodeState?: HdlcDecodeState;
    };

export type DecodeHdlcFramesAction = {
  readonly kind: "use-fields";
  readonly fields: HdlcDecodeResult;
};

export interface DecodeHdlcFramesStepResult {
  readonly state: DecodeHdlcFramesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeHdlcFramesAction[];
}

export function initialDecodeHdlcFramesState(): DecodeHdlcFramesState {
  return {};
}

export function stepDecodeHdlcFramesWithActions(
  state: DecodeHdlcFramesState,
  event: DecodeHdlcFramesEvent,
): DecodeHdlcFramesStepResult {
  if (event.kind === "hdlc/decode-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          fields: decodeHdlcFrames(event.input, event.decodeState ?? {}),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodeHdlcFrames(
  actions: ReadonlyArray<DecodeHdlcFramesAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract decoded HDLC result from step actions; null when no `use-fields`. */
export function hdlcDecodeResultFromActions(
  actions: ReadonlyArray<DecodeHdlcFramesAction>,
): HdlcDecodeResult | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
