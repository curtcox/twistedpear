/**
 * Host wrap for a sealed policy: store master key under K_n, catalog / grants
 * / app-data under the master. Identity stays on its own passphrase vault.
 */
import { gcm } from "@noble/ciphers/aes.js";
import { canonicalJson } from "@twistedpear/effects";
import {
  POLICY_LANGUAGE_VERSION,
  POLICY_SUBJECTS,
  deriveSealKey,
  nextCommit,
  type PolicyDocument,
} from "@twistedpear/protocol";

export const SEALED_STORE_NAMES = ["catalog", "grants", "app-data"] as const;
export type SealedStoreName = (typeof SEALED_STORE_NAMES)[number];

export const POLICY_SEAL_KIND = "tp-policy-seal" as const;
export const POLICY_SEAL_UNREADABLE = "Sealed store is unreadable";
export const POLICY_SEAL_UNSUPPORTED =
  "Host cannot evaluate this sealed policy";

export class PolicySealError extends Error {
  readonly code: "UNREADABLE" | "UNSUPPORTED";

  constructor(code: "UNREADABLE" | "UNSUPPORTED") {
    super(
      code === "UNSUPPORTED" ? POLICY_SEAL_UNSUPPORTED : POLICY_SEAL_UNREADABLE,
    );
    this.name = "PolicySealError";
    this.code = code;
  }
}

export type PolicySealEnvelope = {
  readonly format: 1;
  readonly kind: typeof POLICY_SEAL_KIND;
  readonly version: number;
  readonly subjects: readonly string[];
  readonly parent: string;
  readonly commit: string;
  readonly nonce: string;
  readonly wrapped: string;
};

export type SealedStoreBlob = {
  readonly store: SealedStoreName;
  readonly nonce: string;
  readonly ciphertext: string;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) {
    throw new PolicySealError("UNREADABLE");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function requireBytes(bytes: Uint8Array, length: number): Uint8Array {
  if (bytes.length !== length) throw new PolicySealError("UNREADABLE");
  return bytes;
}

function subjectsMatch(subjects: readonly string[]): boolean {
  return (
    subjects.length === POLICY_SUBJECTS.length &&
    subjects.every((subject, index) => subject === POLICY_SUBJECTS[index])
  );
}

function wrapAad(fields: {
  version: number;
  subjects: readonly string[];
  parent: string;
  commit: string;
}): Uint8Array {
  return new TextEncoder().encode(
    canonicalJson({
      commit: fields.commit,
      format: 1,
      kind: POLICY_SEAL_KIND,
      parent: fields.parent,
      subjects: [...fields.subjects],
      version: fields.version,
    }),
  );
}

function storeAad(store: SealedStoreName, commit: Uint8Array): Uint8Array {
  const prefix = new TextEncoder().encode(`tp-sealed-store/${store}`);
  const out = new Uint8Array(prefix.length + commit.length);
  out.set(prefix);
  out.set(commit, prefix.length);
  return out;
}

function assertHostCanEvaluate(envelope: PolicySealEnvelope): void {
  if (envelope.format !== 1 || envelope.kind !== POLICY_SEAL_KIND) {
    throw new PolicySealError("UNREADABLE");
  }
  if (
    envelope.version !== POLICY_LANGUAGE_VERSION ||
    !subjectsMatch(envelope.subjects)
  ) {
    throw new PolicySealError("UNSUPPORTED");
  }
}

function encrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
): Uint8Array {
  return gcm(key, nonce, aad).encrypt(plaintext);
}

function decrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  aad: Uint8Array,
): Uint8Array {
  try {
    return gcm(key, nonce, aad).decrypt(ciphertext);
  } catch {
    throw new PolicySealError("UNREADABLE");
  }
}

/** Wrap the store master key under K_n = HKDF(rootSecret, commit). */
export function wrapSealedMaster(options: {
  readonly rootSecret: Uint8Array;
  readonly parent: Uint8Array;
  readonly commit: Uint8Array;
  readonly masterKey: Uint8Array;
  readonly nonce: Uint8Array;
}): PolicySealEnvelope {
  const parent = requireBytes(options.parent, 32);
  const commit = requireBytes(options.commit, 32);
  const masterKey = requireBytes(options.masterKey, 32);
  const nonce = requireBytes(options.nonce, 12);
  const parentHex = bytesToHex(parent);
  const commitHex = bytesToHex(commit);
  const aad = wrapAad({
    version: POLICY_LANGUAGE_VERSION,
    subjects: POLICY_SUBJECTS,
    parent: parentHex,
    commit: commitHex,
  });
  const wrapKey = deriveSealKey(options.rootSecret, commit);
  try {
    return {
      format: 1,
      kind: POLICY_SEAL_KIND,
      version: POLICY_LANGUAGE_VERSION,
      subjects: [...POLICY_SUBJECTS],
      parent: parentHex,
      commit: commitHex,
      nonce: bytesToHex(nonce),
      wrapped: bytesToHex(encrypt(wrapKey, nonce, masterKey, aad)),
    };
  } finally {
    wrapKey.fill(0);
  }
}

/**
 * Recompute the commit from `policy` and unwrap. Tamper, rollback, and a
 * host that cannot evaluate the language all fail closed.
 */
export function unwrapSealedMaster(options: {
  readonly rootSecret: Uint8Array;
  readonly policy: PolicyDocument;
  readonly envelope: PolicySealEnvelope;
}): Uint8Array {
  const { envelope } = options;
  assertHostCanEvaluate(envelope);
  const parent = hexToBytes(envelope.parent);
  const claimed = hexToBytes(envelope.commit);
  const expected = nextCommit(parent, options.policy);
  if (
    claimed.length !== 32 ||
    expected.length !== 32 ||
    !claimed.every((byte, index) => byte === expected[index])
  ) {
    throw new PolicySealError("UNREADABLE");
  }
  const nonce = hexToBytes(envelope.nonce);
  const wrapped = hexToBytes(envelope.wrapped);
  requireBytes(parent, 32);
  requireBytes(nonce, 12);
  const wrapKey = deriveSealKey(options.rootSecret, expected);
  try {
    return decrypt(
      wrapKey,
      nonce,
      wrapped,
      wrapAad({
        version: envelope.version,
        subjects: envelope.subjects,
        parent: envelope.parent,
        commit: envelope.commit,
      }),
    );
  } finally {
    wrapKey.fill(0);
  }
}

/** Advance the chain and wrap the same master under the new commit. */
export function rewrapSealedMaster(options: {
  readonly rootSecret: Uint8Array;
  readonly previous: PolicySealEnvelope;
  readonly nextPolicy: PolicyDocument;
  readonly masterKey: Uint8Array;
  readonly nonce: Uint8Array;
}): PolicySealEnvelope {
  assertHostCanEvaluate(options.previous);
  const parent = hexToBytes(options.previous.commit);
  return wrapSealedMaster({
    rootSecret: options.rootSecret,
    parent,
    commit: nextCommit(parent, options.nextPolicy),
    masterKey: options.masterKey,
    nonce: options.nonce,
  });
}

export function encryptSealedStore(options: {
  readonly masterKey: Uint8Array;
  readonly commit: Uint8Array;
  readonly store: SealedStoreName;
  readonly plaintext: Uint8Array;
  readonly nonce: Uint8Array;
}): SealedStoreBlob {
  const masterKey = requireBytes(options.masterKey, 32);
  const commit = requireBytes(options.commit, 32);
  const nonce = requireBytes(options.nonce, 12);
  return {
    store: options.store,
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(
      encrypt(
        masterKey,
        nonce,
        options.plaintext,
        storeAad(options.store, commit),
      ),
    ),
  };
}

export function decryptSealedStore(options: {
  readonly masterKey: Uint8Array;
  readonly commit: Uint8Array;
  readonly blob: SealedStoreBlob;
}): Uint8Array {
  const masterKey = requireBytes(options.masterKey, 32);
  const commit = requireBytes(options.commit, 32);
  const nonce = hexToBytes(options.blob.nonce);
  requireBytes(nonce, 12);
  return decrypt(
    masterKey,
    nonce,
    hexToBytes(options.blob.ciphertext),
    storeAad(options.blob.store, commit),
  );
}
