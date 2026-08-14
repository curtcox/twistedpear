/**
 * Device stream sidecar framing — compact binary frames for raw sample data.
 * Control messages are forbidden on this channel (enforced by message kind).
 */

const MAGIC_V1 = new Uint8Array([0x54, 0x50, 0x44, 0x31]); // TPD1
const MAGIC_V2 = new Uint8Array([0x54, 0x50, 0x44, 0x32]); // TPD2
const HEADER_BYTES_V1 = 24;
const HEADER_BYTES_V2 = 36;
export const MAX_DEVICE_STREAM_PAYLOAD_BYTES = 1_048_576;
export const MAX_DEVICE_STREAM_CHUNK_BYTES = 65_536;

export type DeviceStreamSampleKind = 1 | 2 | 3 | 4 | 5;
/** 1=camera-frame, 2=pcm, 3=motion-samples, 4=screen-frame, 5=derived-event */

export const DEVICE_STREAM_KIND = {
  cameraFrame: 1,
  pcm: 2,
  motionSamples: 3,
  screenFrame: 4,
  derivedEvent: 5,
} as const;

interface DeviceStreamFrameBase {
  readonly sampleKind: DeviceStreamSampleKind;
  readonly sessionToken: number;
  readonly sequence: number;
  readonly payload: Uint8Array;
}

export type DeviceStreamFrame =
  | (DeviceStreamFrameBase & { readonly version: 1 })
  | (DeviceStreamFrameBase & {
      readonly version: 2;
      readonly captureAtUs: number;
      readonly clockId: number;
    });

export class DeviceStreamFrameError extends Error {
  constructor(
    readonly code: "MALFORMED" | "OVERSIZED" | "CONTROL_FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "DeviceStreamFrameError";
  }
}

function requireNonNegativeInt(value: number, message: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DeviceStreamFrameError("MALFORMED", message);
  }
}

export function encodeDeviceStreamFrame(frame: DeviceStreamFrame): Uint8Array {
  if (frame.version !== 1 && frame.version !== 2) {
    throw new DeviceStreamFrameError(
      "MALFORMED",
      "Unsupported device stream version.",
    );
  }
  if (![1, 2, 3, 4, 5].includes(frame.sampleKind)) {
    throw new DeviceStreamFrameError(
      "CONTROL_FORBIDDEN",
      "Device stream sidecar refuses control messages.",
    );
  }
  requireNonNegativeInt(frame.sessionToken, "Invalid session token.");
  requireNonNegativeInt(frame.sequence, "Invalid sequence.");
  if (frame.payload.length > MAX_DEVICE_STREAM_PAYLOAD_BYTES) {
    throw new DeviceStreamFrameError(
      "OVERSIZED",
      "Device stream payload exceeds max size.",
    );
  }

  const headerBytes = frame.version === 1 ? HEADER_BYTES_V1 : HEADER_BYTES_V2;
  const body = new Uint8Array(headerBytes + frame.payload.length);
  body.set(frame.version === 1 ? MAGIC_V1 : MAGIC_V2, 0);
  body[4] = frame.version;
  body[5] = frame.sampleKind;
  const view = new DataView(body.buffer);
  view.setUint32(8, frame.sessionToken >>> 0, false);
  view.setUint32(12, frame.sequence >>> 0, false);
  view.setUint32(16, frame.payload.length >>> 0, false);
  view.setUint32(20, crc32(frame.payload), false);
  if (frame.version === 2) encodeV2Timing(view, frame);
  body.set(frame.payload, headerBytes);
  return body;
}

function encodeV2Timing(
  view: DataView,
  frame: Extract<DeviceStreamFrame, { version: 2 }>,
): void {
  requireNonNegativeInt(frame.captureAtUs, "Invalid capture timestamp.");
  if (
    !Number.isSafeInteger(frame.clockId) ||
    frame.clockId < 0 ||
    frame.clockId > 0xffff_ffff
  ) {
    throw new DeviceStreamFrameError("MALFORMED", "Invalid clock id.");
  }
  view.setBigUint64(24, BigInt(frame.captureAtUs), false);
  view.setUint32(32, frame.clockId, false);
}

export function decodeDeviceStreamFrame(bytes: Uint8Array): DeviceStreamFrame {
  if (bytes.length < HEADER_BYTES_V1) {
    throw new DeviceStreamFrameError(
      "MALFORMED",
      "Device stream frame too short.",
    );
  }
  const version = decodeStreamVersion(bytes);
  const sampleKind = bytes[5] as DeviceStreamSampleKind;
  if (sampleKind < 1 || sampleKind > 5) {
    throw new DeviceStreamFrameError(
      "CONTROL_FORBIDDEN",
      "Device stream sidecar refuses control messages.",
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sessionToken = view.getUint32(8, false);
  const sequence = view.getUint32(12, false);
  const payload = decodeStreamPayload(bytes, view, version);
  if (version === 1)
    return { version: 1, sampleKind, sessionToken, sequence, payload };
  const captureAtUs = Number(view.getBigUint64(24, false));
  if (!Number.isSafeInteger(captureAtUs)) {
    throw new DeviceStreamFrameError(
      "MALFORMED",
      "Capture timestamp exceeds safe integer range.",
    );
  }
  return {
    version: 2,
    sampleKind,
    sessionToken,
    sequence,
    captureAtUs,
    clockId: view.getUint32(32, false),
    payload,
  };
}

function decodeStreamVersion(bytes: Uint8Array): 1 | 2 {
  const isV1 = equal(bytes.subarray(0, 4), MAGIC_V1);
  const isV2 = equal(bytes.subarray(0, 4), MAGIC_V2);
  if (!isV1 && !isV2) {
    throw new DeviceStreamFrameError("MALFORMED", "Bad device stream magic.");
  }
  const version = bytes[4];
  if ((isV1 && version !== 1) || (isV2 && version !== 2)) {
    throw new DeviceStreamFrameError(
      "MALFORMED",
      "Unsupported device stream version.",
    );
  }
  return version as 1 | 2;
}

function decodeStreamPayload(
  bytes: Uint8Array,
  view: DataView,
  version: 1 | 2,
): Uint8Array {
  const payloadLength = view.getUint32(16, false);
  const payloadCrc = view.getUint32(20, false);
  const headerBytes = version === 1 ? HEADER_BYTES_V1 : HEADER_BYTES_V2;
  if (
    bytes.length < headerBytes ||
    payloadLength !== bytes.length - headerBytes
  ) {
    throw new DeviceStreamFrameError(
      "MALFORMED",
      "Device stream payload length mismatch.",
    );
  }
  if (payloadLength > MAX_DEVICE_STREAM_PAYLOAD_BYTES) {
    throw new DeviceStreamFrameError(
      "OVERSIZED",
      "Device stream payload exceeds max size.",
    );
  }
  const payload = bytes.slice(headerBytes);
  if (crc32(payload) !== payloadCrc) {
    throw new DeviceStreamFrameError(
      "MALFORMED",
      "Device stream payload CRC mismatch.",
    );
  }
  return payload;
}

/** Split a large payload into chunked sidecar frames (fixed header + payload). */
export function frameDeviceStreamPayload(
  sessionToken: number,
  sampleKind: DeviceStreamSampleKind,
  payload: Uint8Array,
  chunkBytes = MAX_DEVICE_STREAM_CHUNK_BYTES,
  timing: { readonly captureAtUs: number; readonly clockId: number } = {
    captureAtUs: 0,
    clockId: 0,
  },
): ReadonlyArray<Uint8Array> {
  if (payload.length < 1) {
    throw new DeviceStreamFrameError(
      "MALFORMED",
      "Empty device stream payload.",
    );
  }
  if (chunkBytes < 64 || chunkBytes > MAX_DEVICE_STREAM_CHUNK_BYTES) {
    throw new DeviceStreamFrameError(
      "OVERSIZED",
      "Invalid device stream chunk size.",
    );
  }
  const frames: Uint8Array[] = [];
  let sequence = 0;
  for (let offset = 0; offset < payload.length; offset += chunkBytes) {
    frames.push(
      encodeDeviceStreamFrame({
        version: 2,
        sampleKind,
        sessionToken,
        sequence,
        ...timing,
        payload: payload.subarray(
          offset,
          Math.min(payload.length, offset + chunkBytes),
        ),
      }),
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
