/** Maximum bytes carried by one rendered QR/color-code frame. */
export const OPTICAL_CHUNK_PAYLOAD_BYTES = 200;
const HEADER_BYTES = 8;

function transferId(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function xorInto(target: Uint8Array, source: Uint8Array): void {
  for (let index = 0; index < source.length; index += 1)
    target[index] = target[index]! ^ source[index]!;
}

function frame(
  index: number,
  total: number,
  length: number,
  id: number,
  payload: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(HEADER_BYTES + payload.length);
  const view = new DataView(out.buffer);
  out[0] = 0x54; // T
  out[1] = 0x4f; // O
  out[2] = index;
  out[3] = total;
  view.setUint16(4, length, false);
  view.setUint16(6, id & 0xffff, false);
  out.set(payload, HEADER_BYTES);
  return out;
}

/**
 * Systematic optical erasure framing. Source frames are followed by one XOR
 * repair frame, so any one missing source frame can be reconstructed without
 * a back-channel. The short content-derived transfer id prevents interleaved
 * displays with equal chunk counts from contaminating one another.
 */
export function sliceForDisplay(
  encoded: Uint8Array,
  frameBytes = OPTICAL_CHUNK_PAYLOAD_BYTES,
): ReadonlyArray<Uint8Array> {
  const blockBytes = frameBytes - HEADER_BYTES;
  if (blockBytes < 1) throw new Error("Optical frame budget is too small");
  const total = Math.max(1, Math.ceil(encoded.length / blockBytes));
  if (total > 254 || encoded.length > 0xffff)
    throw new Error("Optical payload exceeds framing budget");
  const id = transferId(encoded);
  const sources: Uint8Array[] = [];
  const parity = new Uint8Array(blockBytes);
  for (let index = 0; index < total; index += 1) {
    const block = new Uint8Array(blockBytes);
    block.set(
      encoded.subarray(
        index * blockBytes,
        Math.min((index + 1) * blockBytes, encoded.length),
      ),
    );
    xorInto(parity, block);
    sources.push(frame(index, total, encoded.length, id, block));
  }
  return [...sources, frame(total, total, encoded.length, id, parity)];
}

export interface OpticalReassemblyState {
  id: number | null;
  total: number | null;
  length: number | null;
  received: Map<number, Uint8Array>;
}

export function createOpticalReassemblyState(): OpticalReassemblyState {
  return { id: null, total: null, length: null, received: new Map() };
}

function recoverMissing(
  state: OpticalReassemblyState,
  total: number,
  missing: number,
): boolean {
  const parity = state.received.get(total);
  if (parity === undefined) return false;
  const recovered = parity.slice();
  for (let index = 0; index < total; index += 1) {
    if (index !== missing) xorInto(recovered, state.received.get(index)!);
  }
  state.received.set(missing, recovered);
  return true;
}

function sourceBlocksReady(
  state: OpticalReassemblyState,
  total: number,
): boolean {
  const missing: number[] = [];
  for (let index = 0; index < total; index += 1)
    if (!state.received.has(index)) missing.push(index);
  if (missing.length === 0) return true;
  return missing.length === 1 && recoverMissing(state, total, missing[0]!);
}

function assemble(state: OpticalReassemblyState): Uint8Array | null {
  const total = state.total;
  const length = state.length;
  if (total === null || length === null || !sourceBlocksReady(state, total))
    return null;
  const blockBytes = state.received.get(0)?.length;
  if (blockBytes === undefined) return null;
  const out = new Uint8Array(total * blockBytes);
  for (let index = 0; index < total; index += 1)
    out.set(state.received.get(index)!, index * blockBytes);
  return out.slice(0, length);
}

export function reassembleOpticalChunk(
  state: OpticalReassemblyState,
  chunk: Uint8Array,
): { state: OpticalReassemblyState; payload: Uint8Array | null } {
  if (chunk.length <= HEADER_BYTES || chunk[0] !== 0x54 || chunk[1] !== 0x4f)
    return { state, payload: null };
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  const index = chunk[2]!;
  const total = chunk[3]!;
  const length = view.getUint16(4, false);
  const id = view.getUint16(6, false);
  if (total === 0 || index > total) return { state, payload: null };
  if (state.id !== id || state.total !== total || state.length !== length) {
    state = { id, total, length, received: new Map() };
  }
  state.received.set(index, chunk.slice(HEADER_BYTES));
  const payload = assemble(state);
  return payload === null
    ? { state, payload: null }
    : { state: createOpticalReassemblyState(), payload };
}
