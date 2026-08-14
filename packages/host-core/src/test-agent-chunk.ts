/** `LXMF_ENCRYPTED_PACKET_MAX_CONTENT`: the opportunistic single-packet budget. */
const LXMF_OPPORTUNISTIC_MAX_CONTENT = 295;
/** `:<index>:<count>:` with four-digit fields. */
const CHUNK_HEADER_SLACK = 12;
/** LXMF measures the packed title plus content, so leave msgpack room. */
const CHUNK_MSGPACK_SLACK = 16;
const MAX_CHUNKS = 512;
const MAX_CHUNKED_PAYLOAD_HEX = 262_144;

/** One frame of a `<nonce>:<index>:<count>:<hex>` chunked body. */
export interface ChunkFrame {
  readonly nonce: string;
  readonly index: number;
  readonly count: number;
  readonly chunk: string;
}

/** Splits a chunked body without letting a nonce hide colons. */
export function parseChunkedBody(body: string): ChunkFrame | null {
  const parts = body.split(":");
  if (parts.length !== 4) return null;
  const [nonce, rawIndex, rawCount, chunk] = parts as [
    string,
    string,
    string,
    string,
  ];
  if (
    !isChunkNonce(nonce) ||
    !isChunkCounter(rawIndex) ||
    !isChunkCounter(rawCount) ||
    !isHexChunk(chunk)
  ) {
    return null;
  }
  return { nonce, index: Number(rawIndex), count: Number(rawCount), chunk };
}

function isChunkNonce(value: string): boolean {
  return value.length >= 1 && value.length <= 160;
}

function isChunkCounter(value: string): boolean {
  return /^\d{1,4}$/.test(value);
}

function isHexChunk(value: string): boolean {
  return /^[0-9a-f]*$/i.test(value) && value.length % 2 === 0;
}

export function chunkSeriesPlan(
  title: string,
  prefix: string,
  nonce: string,
  payloadHex: string,
): { readonly perChunk: number; readonly count: number } {
  if (
    !/^[0-9a-f]*$/i.test(payloadHex) ||
    payloadHex.length > MAX_CHUNKED_PAYLOAD_HEX
  ) {
    throw new Error("chunked test payload is malformed");
  }
  if (nonce.length < 1 || nonce.length > 160 || nonce.includes(":")) {
    throw new Error("chunked test payload is malformed");
  }
  const room =
    LXMF_OPPORTUNISTIC_MAX_CONTENT -
    title.length -
    CHUNK_MSGPACK_SLACK -
    prefix.length -
    nonce.length -
    CHUNK_HEADER_SLACK;
  const perChunk = room - (room % 2);
  if (perChunk < 32) {
    throw new Error("chunked test payload nonce leaves no room for content");
  }
  const count = Math.max(1, Math.ceil(payloadHex.length / perChunk));
  if (count > MAX_CHUNKS) {
    throw new Error("chunked test payload exceeds the chunk ceiling");
  }
  return { perChunk, count };
}

export function assembleChunkSeries(
  frame: ChunkFrame,
  pending: { parts: Array<string | null> } | undefined,
): { parts: Array<string | null>; complete: boolean } | null {
  const { index, count, chunk } = frame;
  if (count < 1 || count > MAX_CHUNKS || index < 0 || index >= count) {
    return null;
  }
  const parts =
    pending?.parts.length === count
      ? pending.parts
      : new Array<string | null>(count).fill(null);
  parts[index] = chunk;
  return { parts, complete: !parts.some((part) => part === null) };
}

export function assembledPayloadHex(
  parts: Array<string | null>,
): string | null {
  const payloadHex = parts.join("");
  return payloadHex.length > MAX_CHUNKED_PAYLOAD_HEX ? null : payloadHex;
}
