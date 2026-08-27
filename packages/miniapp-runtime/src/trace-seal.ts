import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { canonicalJson } from "@twistedpear/effects";
import { asRecord } from "./trace-assertions.js";
import {
  APP_TRACE_FORMAT,
  APP_TRACE_KIND,
  AppTraceFormatError,
  parseAppTrace,
  serializeAppTrace,
  type AppTrace,
  type AppTraceIdentity,
} from "./trace-format.js";
import {
  APP_TRACE_MODE_PAYLOAD,
  parsePayloadAppTrace,
  serializePayloadAppTrace,
  type PayloadAppTrace,
} from "./trace-payload.js";

export const APP_TRACE_MODE_SEALED = "sealed" as const;
export const APP_TRACE_SEAL_ALG = "x25519-chacha20poly1305-v1" as const;

const HEX = /^[0-9a-f]+$/;

export interface TraceEntropy {
  randomBytes(size: number): Uint8Array;
}

export interface SealedAppTrace {
  readonly format: typeof APP_TRACE_FORMAT;
  readonly kind: typeof APP_TRACE_KIND;
  readonly mode: typeof APP_TRACE_MODE_SEALED;
  readonly identity: AppTraceIdentity;
  readonly recipientKey: string;
  readonly alg: typeof APP_TRACE_SEAL_ALG;
  readonly eph: string;
  readonly nonce: string;
  readonly ct: string;
}

export function sealAppTrace(
  trace: AppTrace | PayloadAppTrace,
  recipientPublicKey: Uint8Array,
  entropy: TraceEntropy,
): SealedAppTrace {
  const recipient = requireBytes(recipientPublicKey, 32, "recipientPublicKey");
  const ephPrivate = requireBytes(
    entropy.randomBytes(32),
    32,
    "ephemeral private key",
  );
  const nonce = requireBytes(entropy.randomBytes(12), 12, "nonce");
  const ephPublic = x25519PublicFromPrivate(ephPrivate);
  const shared = x25519Shared(ephPrivate, recipient);
  const key = deriveSealKey(shared, ephPublic, recipient);
  const plaintext = new TextEncoder().encode(
    trace.mode === APP_TRACE_MODE_PAYLOAD
      ? serializePayloadAppTrace(trace)
      : serializeAppTrace(trace),
  );
  const identity = trace.identity;
  const aad = sealAad({
    identity,
    recipientKey: bytesToHex(recipient),
    eph: bytesToHex(ephPublic),
    nonce: bytesToHex(nonce),
  });
  const ct = aeadEncrypt(key, nonce, plaintext, aad);
  return {
    format: APP_TRACE_FORMAT,
    kind: APP_TRACE_KIND,
    mode: APP_TRACE_MODE_SEALED,
    identity,
    recipientKey: bytesToHex(recipient),
    alg: APP_TRACE_SEAL_ALG,
    eph: bytesToHex(ephPublic),
    nonce: bytesToHex(nonce),
    ct: bytesToHex(ct),
  };
}

export function parseSealedAppTrace(input: unknown): SealedAppTrace {
  const root = asRecord(input, "trace");
  if (root.format !== APP_TRACE_FORMAT) {
    throw new AppTraceFormatError(`unsupported format ${String(root.format)}`);
  }
  if (root.kind !== APP_TRACE_KIND) {
    throw new AppTraceFormatError(`unsupported kind ${String(root.kind)}`);
  }
  if (root.mode !== APP_TRACE_MODE_SEALED) {
    throw new AppTraceFormatError(
      `sealed traces must use mode "${APP_TRACE_MODE_SEALED}"`,
    );
  }
  if (root.alg !== APP_TRACE_SEAL_ALG) {
    throw new AppTraceFormatError(`unsupported seal alg ${String(root.alg)}`);
  }
  const identity = parseIdentity(root.identity);
  return {
    format: APP_TRACE_FORMAT,
    kind: APP_TRACE_KIND,
    mode: APP_TRACE_MODE_SEALED,
    identity,
    recipientKey: asHex(root.recipientKey, "recipientKey", 64),
    alg: APP_TRACE_SEAL_ALG,
    eph: asHex(root.eph, "eph", 64),
    nonce: asHex(root.nonce, "nonce", 24),
    ct: asHex(root.ct, "ct"),
  };
}

export function openSealedAppTrace(
  sealed: SealedAppTrace,
  recipientPrivateKey: Uint8Array,
): AppTrace | PayloadAppTrace {
  const parsed = parseSealedAppTrace(sealed);
  const privateKey = requireBytes(
    recipientPrivateKey,
    32,
    "recipientPrivateKey",
  );
  const eph = hexToBytes(parsed.eph, "eph");
  const nonce = hexToBytes(parsed.nonce, "nonce");
  const ct = hexToBytes(parsed.ct, "ct");
  const recipientPublic = x25519PublicFromPrivate(privateKey);
  if (bytesToHex(recipientPublic) !== parsed.recipientKey) {
    throw new AppTraceFormatError("sealed trace recipient key mismatch");
  }
  const shared = x25519Shared(privateKey, eph);
  const key = deriveSealKey(shared, eph, recipientPublic);
  const aad = sealAad({
    identity: parsed.identity,
    recipientKey: parsed.recipientKey,
    eph: parsed.eph,
    nonce: parsed.nonce,
  });
  const plain = new TextDecoder().decode(aeadDecrypt(key, nonce, ct, aad));
  const inner: unknown = JSON.parse(plain);
  const mode =
    typeof inner === "object" && inner !== null && "mode" in inner
      ? (inner as { mode: unknown }).mode
      : undefined;
  return mode === APP_TRACE_MODE_PAYLOAD
    ? parsePayloadAppTrace(inner)
    : parseAppTrace(inner);
}

function parseIdentity(input: unknown): AppTraceIdentity {
  return parseAppTrace({
    format: 1,
    kind: APP_TRACE_KIND,
    mode: "shape",
    hostApiVersion: "0",
    identity: input,
    host: { platform: "node", hostVersion: "0", hostApiVersion: "0" },
    grants: [],
    entries: [],
  }).identity;
}

function sealAad(fields: {
  identity: AppTraceIdentity;
  recipientKey: string;
  eph: string;
  nonce: string;
}): Uint8Array {
  return new TextEncoder().encode(
    canonicalJson({
      alg: APP_TRACE_SEAL_ALG,
      eph: fields.eph,
      format: APP_TRACE_FORMAT,
      identity: fields.identity,
      kind: APP_TRACE_KIND,
      mode: APP_TRACE_MODE_SEALED,
      nonce: fields.nonce,
      recipientKey: fields.recipientKey,
    }),
  );
}

function deriveSealKey(
  shared: Uint8Array,
  ephPublic: Uint8Array,
  recipient: Uint8Array,
): Uint8Array {
  const info = new TextEncoder().encode("tp-app-trace-seal-v1");
  return hkdf(
    sha256,
    shared,
    ephPublic,
    new Uint8Array([...info, ...recipient]),
    32,
  );
}

function aeadEncrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plain: Uint8Array,
  aad: Uint8Array,
): Uint8Array {
  return chacha20poly1305(key, nonce, aad).encrypt(plain);
}

function aeadDecrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ct: Uint8Array,
  aad: Uint8Array,
): Uint8Array {
  if (ct.byteLength < 16) {
    throw new AppTraceFormatError("sealed ciphertext is truncated");
  }
  try {
    return chacha20poly1305(key, nonce, aad).decrypt(ct);
  } catch {
    throw new AppTraceFormatError("sealed trace authentication failed");
  }
}

function x25519PublicFromPrivate(privateKey: Uint8Array): Uint8Array {
  return x25519.getPublicKey(privateKey);
}

function x25519Shared(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array {
  return x25519.getSharedSecret(privateKey, publicKey);
}

function requireBytes(
  value: Uint8Array,
  size: number,
  path: string,
): Uint8Array {
  if (value.byteLength !== size) {
    throw new AppTraceFormatError(`${path} must be ${size} bytes`);
  }
  return value;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string, path: string): Uint8Array {
  const validated = asHex(hex, path);
  const out = new Uint8Array(validated.length / 2);
  for (let i = 0; i < validated.length; i += 2) {
    out[i / 2] = Number.parseInt(validated.slice(i, i + 2), 16);
  }
  return out;
}

function asHex(value: unknown, path: string, length?: number): string {
  if (typeof value !== "string" || !HEX.test(value) || value.length % 2 !== 0) {
    throw new AppTraceFormatError(`${path} must be lowercase hex`);
  }
  if (length !== undefined && value.length !== length) {
    throw new AppTraceFormatError(`${path} must be ${length} hex characters`);
  }
  return value;
}
