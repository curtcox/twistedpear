/**
 * Hermes Buffer stand-in. Expo 57 Metro rejects Node's `buffer` builtin;
 * b4a and host IPC still expect a Buffer constructor on globalThis.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function asUint8(value) {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError("Buffer: expected binary input");
}

export class Buffer extends Uint8Array {
  static alloc(size, fill = 0) {
    const buf = new Buffer(size);
    buf.fill(fill);
    return buf;
  }

  static allocUnsafe(size) {
    return new Buffer(size);
  }

  static from(data, encoding = "utf8") {
    if (typeof data === "string") {
      if (encoding === "hex") {
        const bytes = new Uint8Array(data.length / 2);
        for (let i = 0; i < bytes.length; i += 1) {
          bytes[i] = Number.parseInt(data.slice(i * 2, i * 2 + 2), 16);
        }
        return new Buffer(bytes);
      }
      if (encoding === "base64") {
        const binary = globalThis.atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1)
          bytes[i] = binary.charCodeAt(i);
        return new Buffer(bytes);
      }
      return new Buffer(encoder.encode(data));
    }
    return new Buffer(asUint8(data));
  }

  static concat(list, totalLength) {
    const parts = list.map((item) => asUint8(item));
    const length =
      totalLength ?? parts.reduce((sum, part) => sum + part.byteLength, 0);
    const out = new Buffer(length);
    let offset = 0;
    for (const part of parts) {
      out.set(part.subarray(0, length - offset), offset);
      offset += part.byteLength;
      if (offset >= length) break;
    }
    return out;
  }

  static isBuffer(value) {
    return value instanceof Buffer;
  }

  toString(encoding = "utf8") {
    if (encoding === "hex") {
      return [...this]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
    if (encoding === "base64") {
      let binary = "";
      for (const byte of this) binary += String.fromCharCode(byte);
      return globalThis.btoa(binary);
    }
    return decoder.decode(this);
  }
}

export default { Buffer };
