/**
 * KISS framing and RNode command constants.
 * Mirrors RNS/Interfaces/RNodeInterface.py KISS class.
 */

export const KISS_FEND = 0xc0;
export const KISS_FESC = 0xdb;
export const KISS_TFEND = 0xdc;
export const KISS_TFESC = 0xdd;

export const KISS_CMD_UNKNOWN = 0xfe;
export const KISS_CMD_DATA = 0x00;
export const KISS_CMD_FREQUENCY = 0x01;
export const KISS_CMD_BANDWIDTH = 0x02;
export const KISS_CMD_TXPOWER = 0x03;
export const KISS_CMD_SF = 0x04;
export const KISS_CMD_CR = 0x05;
export const KISS_CMD_RADIO_STATE = 0x06;
export const KISS_CMD_RADIO_LOCK = 0x07;
export const KISS_CMD_DETECT = 0x08;
export const KISS_CMD_LEAVE = 0x0a;
export const KISS_CMD_READY = 0x0f;
export const KISS_CMD_FW_VERSION = 0x50;
export const KISS_CMD_PLATFORM = 0x48;
export const KISS_CMD_MCU = 0x49;

export const KISS_DETECT_REQ = 0x73;
export const KISS_DETECT_RESP = 0x46;

export const KISS_RADIO_STATE_OFF = 0x00;
export const KISS_RADIO_STATE_ON = 0x01;
export const KISS_RADIO_STATE_ASK = 0xff;

export interface KissFrame {
  readonly command: number;
  readonly payload: Uint8Array;
}

export interface KissDecodeState {
  buffer: Uint8Array;
  inEscape: boolean;
}

export function kissEscape(data: Uint8Array): Uint8Array {
  const escaped: number[] = [];
  for (const byte of data) {
    if (byte === KISS_FESC) {
      escaped.push(KISS_FESC, KISS_TFESC);
    } else if (byte === KISS_FEND) {
      escaped.push(KISS_FESC, KISS_TFEND);
    } else {
      escaped.push(byte);
    }
  }

  return Uint8Array.from(escaped);
}

export function encodeKissFrame(command: number, payload: Uint8Array = new Uint8Array(0)): Uint8Array {
  const body = new Uint8Array(1 + payload.length);
  body[0] = command;
  body.set(payload, 1);
  const escaped = kissEscape(body);
  const frame = new Uint8Array(escaped.length + 2);
  frame[0] = KISS_FEND;
  frame.set(escaped, 1);
  frame[frame.length - 1] = KISS_FEND;
  return frame;
}

export function createKissDecodeState(): KissDecodeState {
  return { buffer: new Uint8Array(0), inEscape: false };
}

export function decodeKissFrames(bytes: Uint8Array, state: KissDecodeState): { readonly frames: ReadonlyArray<KissFrame>; readonly state: KissDecodeState } {
  const frames: KissFrame[] = [];
  let buffer = state.buffer;
  let inEscape = state.inEscape;

  const merged = new Uint8Array(buffer.length + bytes.length);
  merged.set(buffer);
  merged.set(bytes, buffer.length);

  let start = 0;
  for (let index = 0; index < merged.length; index += 1) {
    const byte = merged[index] ?? 0;
    if (byte === KISS_FEND) {
      if (index > start) {
        const body = merged.subarray(start, index);
        const decoded = unescapeKissBody(body, inEscape);
        if (decoded !== null && decoded.length > 0) {
          frames.push({ command: decoded[0] ?? KISS_CMD_UNKNOWN, payload: decoded.subarray(1) });
        }
      }

      start = index + 1;
      inEscape = false;
    }
  }

  buffer = merged.subarray(start);
  return { frames, state: { buffer, inEscape } };
}

function unescapeKissBody(body: Uint8Array, initialEscape: boolean): Uint8Array | null {
  const output: number[] = [];
  let inEscape = initialEscape;

  for (const byte of body) {
    if (inEscape) {
      if (byte === KISS_TFEND) {
        output.push(KISS_FEND);
      } else if (byte === KISS_TFESC) {
        output.push(KISS_FESC);
      } else {
        return null;
      }

      inEscape = false;
      continue;
    }

    if (byte === KISS_FESC) {
      inEscape = true;
      continue;
    }

    output.push(byte);
  }

  return inEscape ? null : Uint8Array.from(output);
}

export function encodeDetectRequest(): Uint8Array {
  return encodeKissFrame(KISS_CMD_DETECT, Uint8Array.from([KISS_DETECT_REQ]));
}

export function encodeRadioStateAsk(): Uint8Array {
  return encodeKissFrame(KISS_CMD_RADIO_STATE, Uint8Array.from([KISS_RADIO_STATE_ASK]));
}

export function encodeFrequencyCommand(frequencyHz: number): Uint8Array {
  const payload = new Uint8Array(4);
  const view = new DataView(payload.buffer);
  view.setUint32(0, frequencyHz, false);
  return encodeKissFrame(KISS_CMD_FREQUENCY, payload);
}

export function parseFirmwareVersion(payload: Uint8Array): string | null {
  if (payload.length < 2) {
    return null;
  }

  return `${payload[0]}.${payload[1]}`;
}
