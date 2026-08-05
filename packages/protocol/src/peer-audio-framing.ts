const MAGIC = new Uint8Array([0x54, 0x50, 0x41, 0x31]);
const HEADER_BYTES = 40;
const PARITY_FLAG = 1;
export const MAX_PEER_AUDIO_PAYLOAD_BYTES = 16_384;
export const MAX_PEER_AUDIO_CHUNK_BYTES = 192;
export const MAX_PEER_AUDIO_FRAMES = 256;

export type PeerAudioProfile = 1;
export interface PeerAudioFrame {
  readonly profile: PeerAudioProfile;
  readonly sessionId: Uint8Array;
  readonly sequence: number;
  readonly total: number;
  readonly totalLength: number;
  readonly payloadCrc32: number;
  readonly parity: boolean;
  readonly payload: Uint8Array;
}
export interface PeerAudioAssemblyState {
  readonly expiresAt: number;
  readonly profile: PeerAudioProfile | null;
  readonly sessionId: Uint8Array | null;
  readonly total: number | null;
  readonly totalLength: number | null;
  readonly payloadCrc32: number | null;
  readonly chunks: ReadonlyMap<number, Uint8Array>;
  readonly parity: Uint8Array | null;
}
export interface PeerAudioAssemblyResult {
  readonly state: PeerAudioAssemblyState;
  readonly payload: Uint8Array | null;
  readonly received: number;
  readonly total: number | null;
  readonly recovered: boolean;
}

export class PeerAudioFrameError extends Error {
  constructor(
    readonly code:
      "MALFORMED" | "OVERSIZED" | "MIXED_SESSION" | "EXPIRED" | "CRC",
    message: string,
  ) {
    super(message);
    this.name = "PeerAudioFrameError";
  }
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb8_8320 : 0);
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}
function equal(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}
function frameHeader(
  frame: Omit<PeerAudioFrame, "payload">,
  payloadLength: number,
): Uint8Array {
  const header = new Uint8Array(HEADER_BYTES);
  header.set(MAGIC);
  header[4] = frame.profile;
  header[5] = frame.parity ? PARITY_FLAG : 0;
  header.set(frame.sessionId, 6);
  const view = new DataView(header.buffer);
  view.setUint16(22, frame.sequence, false);
  view.setUint16(24, frame.total, false);
  view.setUint32(26, frame.totalLength, false);
  view.setUint16(30, payloadLength, false);
  view.setUint32(32, frame.payloadCrc32, false);
  return header;
}

export function encodePeerAudioFrame(frame: PeerAudioFrame): Uint8Array {
  if (
    frame.profile !== 1 ||
    frame.sessionId.length !== 16 ||
    frame.total < 1 ||
    frame.total > MAX_PEER_AUDIO_FRAMES ||
    frame.sequence < 0 ||
    frame.sequence > frame.total ||
    frame.parity !== (frame.sequence === frame.total) ||
    frame.payload.length < 1 ||
    frame.payload.length > MAX_PEER_AUDIO_CHUNK_BYTES ||
    frame.totalLength < 1 ||
    frame.totalLength > MAX_PEER_AUDIO_PAYLOAD_BYTES
  )
    throw new PeerAudioFrameError(
      "MALFORMED",
      "Invalid peer audio frame fields",
    );
  const header = frameHeader(frame, frame.payload.length);
  const body = new Uint8Array(HEADER_BYTES + frame.payload.length);
  body.set(header);
  body.set(frame.payload, HEADER_BYTES);
  new DataView(body.buffer).setUint32(
    36,
    (crc32(body.subarray(0, 36)) ^ crc32(frame.payload)) >>> 0,
    false,
  );
  return body;
}

export function decodePeerAudioFrame(bytes: Uint8Array): PeerAudioFrame {
  if (
    bytes.length < HEADER_BYTES + 1 ||
    bytes.length > HEADER_BYTES + MAX_PEER_AUDIO_CHUNK_BYTES ||
    !equal(bytes.subarray(0, 4), MAGIC)
  )
    throw new PeerAudioFrameError("MALFORMED", "Malformed peer audio frame");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const profile = bytes[4];
  const flags = bytes[5] ?? 0;
  const sequence = view.getUint16(22, false);
  const total = view.getUint16(24, false);
  const totalLength = view.getUint32(26, false);
  const payloadLength = view.getUint16(30, false);
  const payloadCrc32 = view.getUint32(32, false);
  const parity = (flags & PARITY_FLAG) !== 0;
  if (
    profile !== 1 ||
    (flags & ~PARITY_FLAG) !== 0 ||
    payloadLength !== bytes.length - HEADER_BYTES
  )
    throw new PeerAudioFrameError(
      "MALFORMED",
      "Invalid peer audio frame header",
    );
  const expectedFrameCrc = view.getUint32(36, false);
  const actualFrameCrc =
    (crc32(bytes.subarray(0, 36)) ^ crc32(bytes.subarray(HEADER_BYTES))) >>> 0;
  if (expectedFrameCrc !== actualFrameCrc)
    throw new PeerAudioFrameError("CRC", "Peer audio frame CRC mismatch");
  const frame: PeerAudioFrame = {
    profile,
    sessionId: bytes.slice(6, 22),
    sequence,
    total,
    totalLength,
    payloadCrc32,
    parity,
    payload: bytes.slice(HEADER_BYTES),
  };
  encodePeerAudioFrame(frame);
  return frame;
}

export function framePeerAudioPayload(
  sessionId: Uint8Array,
  payload: Uint8Array,
  chunkBytes = 128,
): ReadonlyArray<Uint8Array> {
  if (
    sessionId.length !== 16 ||
    payload.length < 1 ||
    payload.length > MAX_PEER_AUDIO_PAYLOAD_BYTES ||
    chunkBytes < 16 ||
    chunkBytes > MAX_PEER_AUDIO_CHUNK_BYTES
  )
    throw new PeerAudioFrameError(
      "OVERSIZED",
      "Invalid peer audio payload or chunk budget",
    );
  const total = Math.ceil(payload.length / chunkBytes);
  if (total > MAX_PEER_AUDIO_FRAMES)
    throw new PeerAudioFrameError(
      "OVERSIZED",
      "Peer audio payload requires too many frames",
    );
  const checksum = crc32(payload);
  const chunks = Array.from({ length: total }, (_, sequence) =>
    payload.slice(
      sequence * chunkBytes,
      Math.min(payload.length, (sequence + 1) * chunkBytes),
    ),
  );
  const parity = new Uint8Array(chunkBytes);
  for (const chunk of chunks)
    for (let index = 0; index < chunk.length; index += 1)
      parity[index] = (parity[index] ?? 0) ^ (chunk[index] ?? 0);
  return [
    ...chunks.map((chunk, sequence) =>
      encodePeerAudioFrame({
        profile: 1,
        sessionId,
        sequence,
        total,
        totalLength: payload.length,
        payloadCrc32: checksum,
        parity: false,
        payload: chunk,
      }),
    ),
    encodePeerAudioFrame({
      profile: 1,
      sessionId,
      sequence: total,
      total,
      totalLength: payload.length,
      payloadCrc32: checksum,
      parity: true,
      payload: parity,
    }),
  ];
}

export function initialPeerAudioAssemblyState(
  expiresAt: number,
): PeerAudioAssemblyState {
  return {
    expiresAt,
    profile: null,
    sessionId: null,
    total: null,
    totalLength: null,
    payloadCrc32: null,
    chunks: new Map(),
    parity: null,
  };
}

export function stepPeerAudioAssembly(
  state: PeerAudioAssemblyState,
  encodedFrame: Uint8Array,
  now: number,
): PeerAudioAssemblyResult {
  if (now >= state.expiresAt)
    throw new PeerAudioFrameError("EXPIRED", "Peer audio assembly expired");
  const frame = decodePeerAudioFrame(encodedFrame);
  if (
    state.sessionId !== null &&
    (!equal(state.sessionId, frame.sessionId) ||
      state.profile !== frame.profile ||
      state.total !== frame.total ||
      state.totalLength !== frame.totalLength ||
      state.payloadCrc32 !== frame.payloadCrc32)
  )
    throw new PeerAudioFrameError("MIXED_SESSION", "Mixed peer audio sessions");
  const chunks = new Map(state.chunks);
  let parity = state.parity;
  if (frame.parity) {
    if (parity !== null && !equal(parity, frame.payload))
      throw new PeerAudioFrameError(
        "MALFORMED",
        "Conflicting peer audio parity frame",
      );
    parity = frame.payload;
  } else {
    const existing = chunks.get(frame.sequence);
    if (existing !== undefined && !equal(existing, frame.payload))
      throw new PeerAudioFrameError(
        "MALFORMED",
        "Conflicting peer audio frame",
      );
    chunks.set(frame.sequence, frame.payload);
  }
  const next: PeerAudioAssemblyState = {
    expiresAt: state.expiresAt,
    profile: frame.profile,
    sessionId: frame.sessionId,
    total: frame.total,
    totalLength: frame.totalLength,
    payloadCrc32: frame.payloadCrc32,
    chunks,
    parity,
  };
  let recovered = false;
  if (chunks.size === frame.total - 1 && parity !== null) {
    const missing = Array.from(
      { length: frame.total },
      (_, index) => index,
    ).find((index) => !chunks.has(index));
    if (missing !== undefined) {
      const restored = parity.slice();
      for (const chunk of chunks.values())
        for (let index = 0; index < chunk.length; index += 1)
          restored[index] = (restored[index] ?? 0) ^ (chunk[index] ?? 0);
      const expectedLength =
        missing === frame.total - 1
          ? frame.totalLength - missing * parity.length
          : parity.length;
      chunks.set(missing, restored.slice(0, expectedLength));
      recovered = true;
    }
  }
  if (chunks.size !== frame.total)
    return {
      state: { ...next, chunks },
      payload: null,
      received: chunks.size,
      total: frame.total,
      recovered,
    };
  const payload = new Uint8Array(frame.totalLength);
  let offset = 0;
  for (let index = 0; index < frame.total; index += 1) {
    const chunk = chunks.get(index);
    if (chunk === undefined || offset + chunk.length > payload.length)
      throw new PeerAudioFrameError(
        "MALFORMED",
        "Invalid peer audio chunk layout",
      );
    payload.set(chunk, offset);
    offset += chunk.length;
  }
  if (offset !== payload.length || crc32(payload) !== frame.payloadCrc32)
    throw new PeerAudioFrameError("CRC", "Peer audio payload CRC mismatch");
  return {
    state: { ...next, chunks },
    payload,
    received: chunks.size,
    total: frame.total,
    recovered,
  };
}
