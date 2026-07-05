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

export function decodeHdlcFrames(input: Uint8Array, state: HdlcDecodeState = {}): HdlcDecodeResult {
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
    inEscape
  };
}
