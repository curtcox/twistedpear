import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import { randomBytes as nobleRandomBytes } from "@noble/hashes/utils.js";

export class CryptoServiceError extends Error {
  constructor(
    readonly code: "CRYPTO_BAD_REQUEST" | "CRYPTO_TOO_LARGE",
    message: string,
  ) {
    super(message);
    this.name = "CryptoServiceError";
  }
}

const CRYPTO_MAX_RANDOM_BYTES = 256;
const CRYPTO_MAX_INPUT_BYTES = 64 * 1024;
const CRYPTO_HASH_ALGS = ["sha256", "sha512"] as const;
const CRYPTO_HMAC_ALGS = ["sha256"] as const;

type CryptoHashAlg = (typeof CRYPTO_HASH_ALGS)[number];
type CryptoHmacAlg = (typeof CRYPTO_HMAC_ALGS)[number];

export interface CryptoEntropy {
  randomBytes(n: number): Uint8Array;
}

const HASH_FUNCS = {
  sha256,
  sha512,
} as const;

const defaultEntropy: CryptoEntropy = {
  randomBytes(n) {
    return nobleRandomBytes(n);
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
    return Uint8Array.from(HASH_FUNCS[algorithm](input));
  }

  hmac(alg: unknown, key: unknown, bytes: unknown): Uint8Array {
    requireAlg(alg, CRYPTO_HMAC_ALGS, "hmac");
    const keyBytes = requireBytes(key, "key");
    const input = requireBytes(bytes, "bytes");
    return Uint8Array.from(hmac(sha256, keyBytes, input));
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
    return timingSafeEqualBytes(left, right);
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

function requireBytes(value: unknown, field: string): Uint8Array {
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

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function coerceJsonBuffer(value: unknown): Uint8Array | null {
  if (
    value === null ||
    typeof value !== "object" ||
    !("type" in value) ||
    (value as { type?: string }).type !== "Buffer"
  ) {
    return null;
  }
  const data = (value as { data?: unknown }).data;
  return isNumberArray(data) ? Uint8Array.from(data) : null;
}

function coerceBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return Uint8Array.from(value);
  if (isNumberArray(value)) return Uint8Array.from(value);
  return coerceJsonBuffer(value);
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}
