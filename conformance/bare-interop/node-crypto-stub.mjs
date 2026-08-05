/**
 * node:crypto import map target for bare-pack bundles (desktop + interop).
 */
import { hmac } from "@noble/hashes/hmac.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";

export function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function createHash(algorithm) {
  if (algorithm !== "sha256") {
    throw new Error(`Unsupported hash: ${algorithm}`);
  }

  const chunks = [];
  return {
    update(data) {
      chunks.push(data);
      return this;
    },
    digest() {
      return Buffer.from(sha256(concat(chunks)));
    }
  };
}

export function createHmac(algorithm, key) {
  if (algorithm !== "sha256") {
    throw new Error(`Unsupported hmac: ${algorithm}`);
  }

  const chunks = [];
  return {
    update(data) {
      chunks.push(data);
      return this;
    },
    digest() {
      return Buffer.from(hmac(sha256, key, concat(chunks)));
    }
  };
}

export function hkdfSync(digestName, key, salt, info, length) {
  if (digestName !== "sha256") {
    throw new Error(`Unsupported hkdf digest: ${digestName}`);
  }

  return Buffer.from(hkdf(sha256, key, salt, info, length));
}

export function createCipheriv(algorithm, key, iv) {
  if (algorithm !== "chacha20-poly1305") {
    throw new Error(`Unsupported cipher: ${algorithm}`);
  }

  const cipher = chacha20poly1305(key, iv);
  const chunks = [];
  return {
    update(data) {
      chunks.push(data);
      return this;
    },
    final() {
      return Buffer.from(cipher.encrypt(concat(chunks)));
    }
  };
}

export function createDecipheriv(algorithm, key, iv) {
  if (algorithm !== "chacha20-poly1305") {
    throw new Error(`Unsupported cipher: ${algorithm}`);
  }

  const cipher = chacha20poly1305(key, iv);
  const chunks = [];
  return {
    update(data) {
      chunks.push(data);
      return this;
    },
    final() {
      return Buffer.from(cipher.decrypt(concat(chunks)));
    }
  };
}

function concat(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    out.set(bytes, offset);
    offset += bytes.length;
  }

  return out;
}
