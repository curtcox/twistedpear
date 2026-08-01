/** Maximum bytes per QR/color code payload chunk. */
export const OPTICAL_CHUNK_PAYLOAD_BYTES = 200;
/** Header: 1 byte sequence number + 1 byte total count. */
const OPTICAL_CHUNK_HEADER_BYTES = 2;

/**
 * Slice an HDLC-encoded frame into sequence-numbered chunks suitable for
 * individual QR code display. Each chunk: [seq, total, ...payload].
 */
export function sliceForDisplay(encoded: Uint8Array, chunkPayloadBytes = OPTICAL_CHUNK_PAYLOAD_BYTES): ReadonlyArray<Uint8Array> {
  const maxPayload = chunkPayloadBytes - OPTICAL_CHUNK_HEADER_BYTES;
  const totalChunks = Math.max(1, Math.ceil(encoded.length / maxPayload));
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * maxPayload;
    const end = Math.min(start + maxPayload, encoded.length);
    const payload = encoded.subarray(start, end);
    const chunk = new Uint8Array(OPTICAL_CHUNK_HEADER_BYTES + payload.length);
    chunk[0] = i;
    chunk[1] = totalChunks;
    chunk.set(payload, OPTICAL_CHUNK_HEADER_BYTES);
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * Reassemble chunks produced by `sliceForDisplay` back into the original payload.
 * Returns null if the assembly is incomplete.
 */
export interface OpticalReassemblyState {
  total: number | null;
  received: Map<number, Uint8Array>;
}

export function createOpticalReassemblyState(): OpticalReassemblyState {
  return { total: null, received: new Map() };
}

export function reassembleOpticalChunk(
  state: OpticalReassemblyState,
  chunk: Uint8Array
): { state: OpticalReassemblyState; payload: Uint8Array | null } {
  if (chunk.length < OPTICAL_CHUNK_HEADER_BYTES) {
    return { state, payload: null };
  }
  const seq = chunk[0]!;
  const total = chunk[1]!;
  if (total === 0) return { state, payload: null };

  // Reset state if total changes (new frame)
  if (state.total !== null && state.total !== total) {
    state = createOpticalReassemblyState();
  }
  state.total = total;
  state.received.set(seq, chunk.subarray(OPTICAL_CHUNK_HEADER_BYTES));

  if (state.received.size >= total) {
    const parts: Uint8Array[] = [];
    for (let i = 0; i < total; i++) {
      const part = state.received.get(i);
      if (part === undefined) return { state, payload: null };
      parts.push(part);
    }
    const size = parts.reduce((sum, p) => sum + p.length, 0);
    const assembled = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      assembled.set(part, offset);
      offset += part.length;
    }
    return { state: createOpticalReassemblyState(), payload: assembled };
  }

  return { state, payload: null };
}
