/**
 * BLE reliable half-duplex framing layer.
 * Mirrors docs/ble-interface.md fragmentation/reassembly semantics.
 */

export const BLE_FRAME_HEADER_SIZE = 4;
export const BLE_DEFAULT_PIPE_MTU = 247;
export const BLE_FLAG_MORE = 0x01;
export const BLE_FLAG_ACK_REQ = 0x02;
export const BLE_FLAG_KEEPALIVE = 0x04;
export const BLE_FLAG_IDENTITY = 0x08;

export interface BleFrameHeader {
  readonly sequence: number;
  readonly flags: number;
  readonly payloadLength: number;
}

export interface BleReassemblyState {
  buffer: Uint8Array;
  expectedSequence: number;
  activeSequence: number | null;
}

export function encodeBleFrame(sequence: number, flags: number, payload: Uint8Array): Uint8Array {
  if (payload.length > 0xffff) {
    throw new Error("BLE frame payload exceeds 65535 bytes");
  }

  const frame = new Uint8Array(BLE_FRAME_HEADER_SIZE + payload.length);
  frame[0] = sequence & 0xff;
  frame[1] = flags & 0xff;
  frame[2] = (payload.length >> 8) & 0xff;
  frame[3] = payload.length & 0xff;
  frame.set(payload, BLE_FRAME_HEADER_SIZE);
  return frame;
}

export function decodeBleFrameHeader(bytes: Uint8Array): BleFrameHeader | null {
  if (bytes.length < BLE_FRAME_HEADER_SIZE) {
    return null;
  }

  return {
    sequence: bytes[0] ?? 0,
    flags: bytes[1] ?? 0,
    payloadLength: ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0)
  };
}

export function fragmentForMtu(payload: Uint8Array, mtu: number): ReadonlyArray<Uint8Array> {
  const maxPayload = Math.max(1, mtu - BLE_FRAME_HEADER_SIZE);
  const frames: Uint8Array[] = [];
  let offset = 0;
  let sequence = 0;

  while (offset < payload.length) {
    const chunk = payload.subarray(offset, offset + maxPayload);
    const more = offset + chunk.length < payload.length;
    const flags = more ? BLE_FLAG_MORE : 0;
    frames.push(encodeBleFrame(sequence, flags, chunk));
    offset += chunk.length;
    sequence = (sequence + 1) & 0xff;
  }

  return frames;
}

export function createBleReassemblyState(): BleReassemblyState {
  return {
    buffer: new Uint8Array(0),
    expectedSequence: 0,
    activeSequence: null
  };
}

export function reassembleBleFrames(
  state: BleReassemblyState,
  frameBytes: Uint8Array
): { readonly state: BleReassemblyState; readonly message: Uint8Array | null } {
  const header = decodeBleFrameHeader(frameBytes);
  if (header === null) {
    return { state, message: null };
  }

  const payload = frameBytes.subarray(BLE_FRAME_HEADER_SIZE, BLE_FRAME_HEADER_SIZE + header.payloadLength);
  if (payload.length !== header.payloadLength) {
    return { state, message: null };
  }

  if ((header.flags & BLE_FLAG_KEEPALIVE) !== 0) {
    return { state, message: null };
  }

  if (state.activeSequence !== null && header.sequence !== state.expectedSequence) {
    return {
      state: { buffer: new Uint8Array(0), expectedSequence: 0, activeSequence: null },
      message: null
    };
  }

  if (state.activeSequence === null) {
    state = { ...state, activeSequence: header.sequence, buffer: new Uint8Array(0) };
  }

  const merged = new Uint8Array(state.buffer.length + payload.length);
  merged.set(state.buffer);
  merged.set(payload, state.buffer.length);
  const nextSequence = (header.sequence + 1) & 0xff;

  if ((header.flags & BLE_FLAG_MORE) !== 0) {
    return {
      state: { ...state, buffer: merged, expectedSequence: nextSequence },
      message: null
    };
  }

  return {
    state: { buffer: new Uint8Array(0), expectedSequence: 0, activeSequence: null },
    message: merged
  };
}
