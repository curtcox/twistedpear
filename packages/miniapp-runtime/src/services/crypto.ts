import {
  createHash,
  createHmac,
  randomBytes as nodeRandomBytes,
  timingSafeEqual as nodeTimingSafeEqual,
} from "node:crypto";

export class CryptoServiceError extends Error {
  constructor(
    readonly code: "CRYPTO_BAD_REQUEST" | "CRYPTO_TOO_LARGE",
    message: string,
  ) {
    super(message);
    this.name = "CryptoServiceError";
  }
}

export const CRYPTO_MAX_RANDOM_BYTES = 256;
export const CRYPTO_MAX_INPUT_BYTES = 64 * 1024;
export const CRYPTO_HASH_ALGS = ["sha256", "sha512"] as const;
export const CRYPTO_HMAC_ALGS = ["sha256"] as const;

export type CryptoHashAlg = (typeof CRYPTO_HASH_ALGS)[number];
export type CryptoHmacAlg = (typeof CRYPTO_HMAC_ALGS)[number];

export interface CryptoEntropy {
  randomBytes(n: number): Uint8Array;
}

const defaultEntropy: CryptoEntropy = {
  randomBytes(n) {
    return Uint8Array.from(nodeRandomBytes(n));
  },
};

export class CryptoService {
  private readonly entropy: CryptoEntropy;

  constructor(entropy?: CryptoEntropy) {
    this.entropy = entropy ?? defaultEntropy;
  }

  randomBytes(n: unknown): Uint8Array {
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1) {
      throw new CryptoServiceError(
        "CRYPTO_BAD_REQUEST",
        "randomBytes requires a positive integer length.",
      );
    }
    if (n > CRYPTO_MAX_RANDOM_BYTES) {
      throw new CryptoServiceError(
        "CRYPTO_TOO_LARGE",
        `randomBytes is capped at ${CRYPTO_MAX_RANDOM_BYTES} bytes.`,
      );
    }
    return this.entropy.randomBytes(n);
  }

  hash(alg: unknown, bytes: unknown): Uint8Array {
    const algorithm = requireAlg(alg, CRYPTO_HASH_ALGS, "hash");
    const input = requireBytes(bytes, "bytes");
    return Uint8Array.from(createHash(algorithm).update(input).digest());
  }

  hmac(alg: unknown, key: unknown, bytes: unknown): Uint8Array {
    const algorithm = requireAlg(alg, CRYPTO_HMAC_ALGS, "hmac");
    const keyBytes = requireBytes(key, "key");
    const input = requireBytes(bytes, "bytes");
    return Uint8Array.from(createHmac(algorithm, keyBytes).update(input).digest());
  }

  timingSafeEqual(a: unknown, b: unknown): boolean {
    const left = requireBytes(a, "a");
    const right = requireBytes(b, "b");
    if (left.byteLength !== right.byteLength) {
      throw new CryptoServiceError(
        "CRYPTO_BAD_REQUEST",
        "timingSafeEqual requires equal-length inputs.",
      );
    }
    return nodeTimingSafeEqual(left, right);
  }
}

function requireAlg<T extends string>(
  value: unknown,
  allowed: ReadonlyArray<T>,
  field: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new CryptoServiceError(
      "CRYPTO_BAD_REQUEST",
      `${field} algorithm must be one of ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

function requireBytes(value: unknown, field: string): Buffer {
  const bytes = coerceBytes(value);
  if (bytes === null) {
    throw new CryptoServiceError(
      "CRYPTO_BAD_REQUEST",
      `${field} must be bytes.`,
    );
  }
  if (bytes.byteLength > CRYPTO_MAX_INPUT_BYTES) {
    throw new CryptoServiceError(
      "CRYPTO_TOO_LARGE",
      `${field} exceeds ${CRYPTO_MAX_INPUT_BYTES} bytes.`,
    );
  }
  return bytes;
}

function coerceBytes(value: unknown): Buffer | null {
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return Buffer.from(value);
  }
  if (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    (value as { type?: string }).type === "Buffer" &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    const data = (value as { data?: unknown }).data;
    if (Array.isArray(data) && data.every((item) => typeof item === "number")) {
      return Buffer.from(data);
    }
  }
  return null;
}
