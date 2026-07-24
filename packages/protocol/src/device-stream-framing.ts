/**
 * Device stream sidecar framing — compact binary frames for raw sample data.
 * Control messages are forbidden on this channel (enforced by message kind).
 */

const MAGIC = new Uint8Array([0x54, 0x50, 0x44, 0x31]); // TPD1
const HEADER_BYTES = 24;
export const MAX_DEVICE_STREAM_PAYLOAD_BYTES = 1_048_576;
export const MAX_DEVICE_STREAM_CHUNK_BYTES = 65_536;

export type DeviceStreamSampleKind = 1 | 2 | 3 | 4;
/** 1=camera-frame, 2=pcm, 3=motion-samples, 4=screen-frame */

export const DEVICE_STREAM_KIND = {
  cameraFrame: 1,
  pcm: 2,
  motionSamples: 3,
  screenFrame: 4
} as const;

export interface DeviceStreamFrame {
  readonly version: 1;
  readonly sampleKind: DeviceStreamSampleKind;
  readonly sessionToken: number;
  readonly sequence: number;
  readonly payload: Uint8Array;
}

export class DeviceStreamFrameError extends Error {
  constructor(
    readonly code: "MALFORMED" | "OVERSIZED" | "CONTROL_FORBIDDEN",
    message: string
  ) {
    super(message);
    this.name = "DeviceStreamFrameError";
  }
}

export function encodeDeviceStreamFrame(frame: DeviceStreamFrame): Uint8Array {
  if (frame.version !== 1) {
    throw new DeviceStreamFrameError("MALFORMED", "Unsupported device stream version.");
  }
  if (![1, 2, 3, 4].includes(frame.sampleKind)) {
    throw new DeviceStreamFrameError(
      "CONTROL_FORBIDDEN",
      "Device stream sidecar refuses control messages."
    );
  }
  if (!Number.isSafeInteger(frame.sessionToken) || frame.sessionToken < 0) {
    throw new DeviceStreamFrameError("MALFORMED", "Invalid session token.");
  }
  if (!Number.isSafeInteger(frame.sequence) || frame.sequence < 0) {
    throw new DeviceStreamFrameError("MALFORMED", "Invalid sequence.");
  }
  if (frame.payload.length > MAX_DEVICE_STREAM_PAYLOAD_BYTES) {
    throw new DeviceStreamFrameError("OVERSIZED", "Device stream payload exceeds max size.");
  }

  const body = new Uint8Array(HEADER_BYTES + frame.payload.length);
  body.set(MAGIC, 0);
  body[4] = frame.version;
  body[5] = frame.sampleKind;
  const view = new DataView(body.buffer);
  view.setUint32(8, frame.sessionToken >>> 0, false);
  view.setUint32(12, frame.sequence >>> 0, false);
  view.setUint32(16, frame.payload.length >>> 0, false);
  view.setUint32(20, crc32(frame.payload), false);
  body.set(frame.payload, HEADER_BYTES);
  return body;
}

export function decodeDeviceStreamFrame(bytes: Uint8Array): DeviceStreamFrame {
  if (bytes.length < HEADER_BYTES) {
    throw new DeviceStreamFrameError("MALFORMED", "Device stream frame too short.");
  }
  if (!equal(bytes.subarray(0, 4), MAGIC)) {
    throw new DeviceStreamFrameError("MALFORMED", "Bad device stream magic.");
  }
  const version = bytes[4];
  const sampleKind = bytes[5] as DeviceStreamSampleKind;
  if (version !== 1) {
    throw new DeviceStreamFrameError("MALFORMED", "Unsupported device stream version.");
  }
  // Kind 0 and any non-sample kind are treated as control and refused.
  if (sampleKind < 1 || sampleKind > 4) {
    throw new DeviceStreamFrameError(
      "CONTROL_FORBIDDEN",
      "Device stream sidecar refuses control messages."
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sessionToken = view.getUint32(8, false);
  const sequence = view.getUint32(12, false);
  const payloadLength = view.getUint32(16, false);
  const payloadCrc = view.getUint32(20, false);
  if (payloadLength !== bytes.length - HEADER_BYTES) {
    throw new DeviceStreamFrameError("MALFORMED", "Device stream payload length mismatch.");
  }
  if (payloadLength > MAX_DEVICE_STREAM_PAYLOAD_BYTES) {
    throw new DeviceStreamFrameError("OVERSIZED", "Device stream payload exceeds max size.");
  }
  const payload = bytes.slice(HEADER_BYTES);
  if (crc32(payload) !== payloadCrc) {
    throw new DeviceStreamFrameError("MALFORMED", "Device stream payload CRC mismatch.");
  }
  return { version: 1, sampleKind, sessionToken, sequence, payload };
}

/** Split a large payload into chunked sidecar frames (fixed header + payload). */
export function frameDeviceStreamPayload(
  sessionToken: number,
  sampleKind: DeviceStreamSampleKind,
  payload: Uint8Array,
  chunkBytes = MAX_DEVICE_STREAM_CHUNK_BYTES
): ReadonlyArray<Uint8Array> {
  if (payload.length < 1) {
    throw new DeviceStreamFrameError("MALFORMED", "Empty device stream payload.");
  }
  if (chunkBytes < 64 || chunkBytes > MAX_DEVICE_STREAM_CHUNK_BYTES) {
    throw new DeviceStreamFrameError("OVERSIZED", "Invalid device stream chunk size.");
  }
  const frames: Uint8Array[] = [];
  let sequence = 0;
  for (let offset = 0; offset < payload.length; offset += chunkBytes) {
    frames.push(
      encodeDeviceStreamFrame({
        version: 1,
        sampleKind,
        sessionToken,
        sequence,
        payload: payload.subarray(offset, Math.min(payload.length, offset + chunkBytes))
      })
    );
    sequence += 1;
  }
  return frames;
}

function equal(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb8_8320 : 0);
    }
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}
