/**
 * 256t identifiers (https://256t.org/): a 94-character base64url string whose
 * first 8 characters encode a 48-bit big-endian content length and whose last
 * 86 characters encode a 64-byte field — the content itself (zero-padded) when
 * the length is <= 64 bytes, otherwise the SHA-512 hash of the content.
 */

export const T256_ID_LENGTH = 94;
export const T256_LENGTH_PREFIX_CHARS = 8;
export const T256_FIELD_CHARS = 86;
export const T256_INLINE_MAX_BYTES = 64;
export const T256_MAX_CONTENT_BYTES = 2 ** 48 - 1;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const CHAR_TO_VALUE = new Map<string, number>([...ALPHABET].map((char, index) => [char, index]));

export class T256Error extends Error {
  constructor(
    readonly code: "INVALID_ID" | "CONTENT_TOO_LARGE" | "HASH_MISMATCH",
    message: string
  ) {
    super(message);
    this.name = "T256Error";
  }
}

export interface Decoded256t {
  readonly length: number;
  readonly inline: Uint8Array | null;
  readonly sha512: Uint8Array | null;
}

export type Sha512Fn = (data: Uint8Array) => Uint8Array;

function base64UrlEncode(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const b0 = bytes[index]!;
    const b1 = index + 1 < bytes.length ? bytes[index + 1]! : 0;
    const b2 = index + 2 < bytes.length ? bytes[index + 2]! : 0;
    out += ALPHABET[b0 >> 2]!;
    out += ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)]!;
    if (index + 1 < bytes.length) {
      out += ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)]!;
    }
    if (index + 2 < bytes.length) {
      out += ALPHABET[b2 & 0x3f]!;
    }
  }

  return out;
}

function base64UrlDecode(text: string, expectedBytes: number): Uint8Array {
  const out = new Uint8Array(expectedBytes);
  let outIndex = 0;
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = CHAR_TO_VALUE.get(char);
    if (value === undefined) {
      throw new T256Error("INVALID_ID", `Invalid base64url character: ${char}`);
    }

    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (outIndex < expectedBytes) {
        out[outIndex] = (buffer >> bits) & 0xff;
        outIndex += 1;
      }
    }
  }

  if (outIndex !== expectedBytes) {
    throw new T256Error("INVALID_ID", `Expected ${expectedBytes} bytes, decoded ${outIndex}`);
  }

  // Trailing bits beyond whole bytes must be zero (canonical encoding).
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) {
    throw new T256Error("INVALID_ID", "Non-canonical base64url tail bits");
  }

  return out;
}

function encodeLengthPrefix(length: number): string {
  const bytes = new Uint8Array(6);
  let remaining = length;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }

  return base64UrlEncode(bytes);
}

export function encode256tParts(length: number, field: Uint8Array): string {
  if (!Number.isInteger(length) || length < 0 || length > T256_MAX_CONTENT_BYTES) {
    throw new T256Error("CONTENT_TOO_LARGE", `Content length out of range: ${length}`);
  }

  if (field.length !== 64) {
    throw new T256Error("INVALID_ID", `256t field must be 64 bytes, got ${field.length}`);
  }

  return `${encodeLengthPrefix(length)}${base64UrlEncode(field)}`;
}

export function encode256t(content: Uint8Array, sha512: Sha512Fn): string {
  if (content.length <= T256_INLINE_MAX_BYTES) {
    const field = new Uint8Array(64);
    field.set(content, 0);
    return encode256tParts(content.length, field);
  }

  const digest = sha512(content);
  if (digest.length !== 64) {
    throw new T256Error("INVALID_ID", "sha512 function must return 64 bytes");
  }

  return encode256tParts(content.length, digest);
}

export function decode256t(id: string): Decoded256t {
  if (typeof id !== "string" || id.length !== T256_ID_LENGTH) {
    throw new T256Error("INVALID_ID", `256t id must be ${T256_ID_LENGTH} characters`);
  }

  const lengthBytes = base64UrlDecode(id.slice(0, T256_LENGTH_PREFIX_CHARS), 6);
  let length = 0;
  for (const byte of lengthBytes) {
    length = length * 256 + byte;
  }

  const field = base64UrlDecode(id.slice(T256_LENGTH_PREFIX_CHARS), 64);
  if (length <= T256_INLINE_MAX_BYTES) {
    for (let index = length; index < 64; index += 1) {
      if (field[index] !== 0) {
        throw new T256Error("INVALID_ID", "Inline 256t content has non-zero padding");
      }
    }

    return { length, inline: field.slice(0, length), sha512: null };
  }

  return { length, inline: null, sha512: field };
}

export function verify256t(id: string, content: Uint8Array, sha512: Sha512Fn): boolean {
  let decoded: Decoded256t;
  try {
    decoded = decode256t(id);
  } catch {
    return false;
  }

  if (decoded.length !== content.length) {
    return false;
  }

  if (decoded.inline !== null) {
    return equalBytes(decoded.inline, content);
  }

  return decoded.sha512 !== null && equalBytes(decoded.sha512, sha512(content));
}

export function sha512Hex(id: string): string | null {
  const decoded = decode256t(id);
  if (decoded.sha512 === null) {
    return null;
  }

  return [...decoded.sha512].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index]! ^ b[index]!;
  }

  return diff === 0;
}
