export const PEER_QR_FRAME_VERSION = 1;
export const MAX_PEER_QR_FRAME_PAYLOAD_BYTES = 256;
export const MAX_PEER_QR_FRAMES = 128;
export const MAX_PEER_QR_ASSEMBLED_BYTES = 16_384;
const MAGIC = new Uint8Array([0x54, 0x50, 0x51, 0x52]); // TPQR

export interface PeerQrFrame {
  readonly sessionId: Uint8Array;
  readonly sequence: number;
  readonly total: number;
  readonly payload: Uint8Array;
}

export class PeerQrFrameError extends Error {
  constructor(readonly code: "MALFORMED" | "CRC_MISMATCH" | "MIXED_SESSION" | "CONFLICTING_FRAME" | "EXPIRED" | "OVERSIZED", message: string) {
    super(message);
    this.name = "PeerQrFrameError";
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

export function peerQrCrc32(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb8_8320 & -(crc & 1));
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

function validateFrame(frame: PeerQrFrame): void {
  if (frame.sessionId.length < 16 || frame.sessionId.length > 32) throw new PeerQrFrameError("MALFORMED", "QR session id must be 16..32 bytes");
  if (!Number.isInteger(frame.total) || frame.total < 1 || frame.total > MAX_PEER_QR_FRAMES) throw new PeerQrFrameError("MALFORMED", "invalid QR frame total");
  if (!Number.isInteger(frame.sequence) || frame.sequence < 0 || frame.sequence >= frame.total) throw new PeerQrFrameError("MALFORMED", "invalid QR frame sequence");
  if (frame.payload.length < 1 || frame.payload.length > MAX_PEER_QR_FRAME_PAYLOAD_BYTES) throw new PeerQrFrameError("MALFORMED", "invalid QR frame payload size");
}

export function encodePeerQrFrame(frame: PeerQrFrame): Uint8Array {
  validateFrame(frame);
  const headerLength = 12 + frame.sessionId.length;
  const output = new Uint8Array(headerLength + frame.payload.length + 4);
  output.set(MAGIC, 0);
  output[4] = PEER_QR_FRAME_VERSION;
  output[5] = frame.sessionId.length;
  const view = new DataView(output.buffer);
  view.setUint16(6, frame.sequence, false);
  view.setUint16(8, frame.total, false);
  view.setUint16(10, frame.payload.length, false);
  output.set(frame.sessionId, 12);
  output.set(frame.payload, headerLength);
  view.setUint32(headerLength + frame.payload.length, peerQrCrc32(output.subarray(0, headerLength + frame.payload.length)), false);
  return output;
}

export function decodePeerQrFrame(bytes: Uint8Array): PeerQrFrame {
  if (bytes.length < 33 || !sameBytes(bytes.subarray(0, 4), MAGIC) || bytes[4] !== PEER_QR_FRAME_VERSION) throw new PeerQrFrameError("MALFORMED", "invalid QR frame header");
  const sessionLength = bytes[5] ?? 0;
  if (sessionLength < 16 || sessionLength > 32) throw new PeerQrFrameError("MALFORMED", "invalid QR session id length");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sequence = view.getUint16(6, false);
  const total = view.getUint16(8, false);
  const payloadLength = view.getUint16(10, false);
  const headerLength = 12 + sessionLength;
  if (bytes.length !== headerLength + payloadLength + 4) throw new PeerQrFrameError("MALFORMED", "QR frame length mismatch");
  const expected = view.getUint32(bytes.length - 4, false);
  if (peerQrCrc32(bytes.subarray(0, -4)) !== expected) throw new PeerQrFrameError("CRC_MISMATCH", "QR frame checksum mismatch");
  const frame = { sessionId: bytes.slice(12, headerLength), sequence, total, payload: bytes.slice(headerLength, -4) };
  validateFrame(frame);
  return frame;
}

export function framePeerQrPayload(sessionId: Uint8Array, payload: Uint8Array, framePayloadBytes = MAX_PEER_QR_FRAME_PAYLOAD_BYTES): ReadonlyArray<Uint8Array> {
  if (payload.length < 1 || payload.length > MAX_PEER_QR_ASSEMBLED_BYTES) throw new PeerQrFrameError("OVERSIZED", "QR payload exceeds assembly budget");
  if (!Number.isInteger(framePayloadBytes) || framePayloadBytes < 1 || framePayloadBytes > MAX_PEER_QR_FRAME_PAYLOAD_BYTES) throw new PeerQrFrameError("MALFORMED", "invalid QR chunk size");
  const total = Math.ceil(payload.length / framePayloadBytes);
  if (total > MAX_PEER_QR_FRAMES) throw new PeerQrFrameError("OVERSIZED", "QR payload requires too many frames");
  return Array.from({ length: total }, (_, sequence) => encodePeerQrFrame({ sessionId, sequence, total, payload: payload.slice(sequence * framePayloadBytes, Math.min(payload.length, (sequence + 1) * framePayloadBytes)) }));
}

export interface PeerQrAssemblyState {
  readonly sessionId: Uint8Array | null;
  readonly total: number | null;
  readonly expiresAt: number;
  readonly chunks: ReadonlyArray<Uint8Array | null>;
  readonly received: number;
}
export type PeerQrAssemblyResult = { readonly state: PeerQrAssemblyState; readonly payload: Uint8Array | null; };
export function initialPeerQrAssemblyState(expiresAt: number): PeerQrAssemblyState { return { sessionId: null, total: null, expiresAt, chunks: [], received: 0 }; }
export function stepPeerQrAssembly(state: PeerQrAssemblyState, encodedFrame: Uint8Array, now: number): PeerQrAssemblyResult {
  if (now >= state.expiresAt) throw new PeerQrFrameError("EXPIRED", "QR assembly expired");
  const frame = decodePeerQrFrame(encodedFrame);
  if (state.sessionId !== null && !sameBytes(state.sessionId, frame.sessionId)) throw new PeerQrFrameError("MIXED_SESSION", "QR frames belong to different sessions");
  if (state.total !== null && state.total !== frame.total) throw new PeerQrFrameError("MIXED_SESSION", "QR frame totals do not match");
  const chunks = state.chunks.length === 0 ? Array<Uint8Array | null>(frame.total).fill(null) : [...state.chunks];
  const existing = chunks[frame.sequence];
  if (existing !== null && existing !== undefined) {
    if (!sameBytes(existing, frame.payload)) throw new PeerQrFrameError("CONFLICTING_FRAME", "duplicate QR frame has different payload");
    return { state, payload: null };
  }
  chunks[frame.sequence] = frame.payload;
  const received = state.received + 1;
  const next: PeerQrAssemblyState = { sessionId: frame.sessionId, total: frame.total, expiresAt: state.expiresAt, chunks, received };
  if (received !== frame.total) return { state: next, payload: null };
  const size = chunks.reduce((sum, chunk) => sum + (chunk?.length ?? 0), 0);
  if (size > MAX_PEER_QR_ASSEMBLED_BYTES) throw new PeerQrFrameError("OVERSIZED", "assembled QR payload exceeds budget");
  const payload = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { if (chunk === null) throw new PeerQrFrameError("MALFORMED", "QR assembly is incomplete"); payload.set(chunk, offset); offset += chunk.length; }
  return { state: next, payload };
}
