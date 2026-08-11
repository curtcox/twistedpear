import { gcm } from "@noble/ciphers/aes.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import {
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import type { CryptoProvider, Identity } from "@twistedpear/reticulum-ts";
import { Identity as RnsIdentity } from "@twistedpear/reticulum-ts";

const MAGIC = new TextEncoder().encode("TPIDBK01");
const HEADER_BYTES = 58;
const PRIVATE_KEY_BYTES = 64;
const CONTAINER_BYTES = 138;
const SALT_OFFSET = 14;
const NONCE_OFFSET = 30;
const HASH_OFFSET = 42;
const CIPHERTEXT_OFFSET = HEADER_BYTES;

export const IDENTITY_BACKUP_EXTENSION = ".tpidentity";
export const IDENTITY_BACKUP_ERROR =
  "Wrong passphrase or damaged identity backup";
export const IDENTITY_PASSPHRASE_MIN_CODE_POINTS = 12;
export const IDENTITY_SCRYPT_PARAMS = Object.freeze({
  N: 32_768,
  r: 8,
  p: 3,
  dkLen: 32,
});

export interface IdentityBackupEntropy {
  readonly salt?: Uint8Array;
  readonly nonce?: Uint8Array;
}

export interface IdentityRecoveryWords {
  readonly first: string;
  readonly second: string;
}

function normalizedPassphrase(passphrase: string): Uint8Array {
  if ([...passphrase].length === 0) {
    throw new Error("Identity passphrase cannot be empty");
  }
  return new TextEncoder().encode(passphrase.normalize("NFKC"));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

function assertSized(
  bytes: Uint8Array,
  length: number,
  label: string,
): Uint8Array {
  if (bytes.length !== length)
    throw new Error(`${label} must be ${length} bytes`);
  return bytes.slice();
}

function deriveKey(passphrase: string, salt: Uint8Array): Uint8Array {
  const encoded = normalizedPassphrase(passphrase);
  try {
    return scrypt(encoded, salt, IDENTITY_SCRYPT_PARAMS);
  } finally {
    encoded.fill(0);
  }
}

export function validateNewIdentityPassphrase(
  passphrase: string,
  confirmation: string,
): void {
  if (
    [...passphrase.normalize("NFKC")].length <
    IDENTITY_PASSPHRASE_MIN_CODE_POINTS
  ) {
    throw new Error(
      `Identity passphrase must contain at least ${IDENTITY_PASSPHRASE_MIN_CODE_POINTS} characters`,
    );
  }
  if (passphrase.normalize("NFKC") !== confirmation.normalize("NFKC")) {
    throw new Error("Identity passphrase confirmation does not match");
  }
}

export function encryptIdentityBackup(
  provider: CryptoProvider,
  identity: Identity,
  passphrase: string,
  entropy: IdentityBackupEntropy = {},
): Uint8Array {
  const privateKey = assertSized(
    identity.getPrivateKey(),
    PRIVATE_KEY_BYTES,
    "Identity private key",
  );
  const salt = assertSized(
    entropy.salt ?? provider.randomBytes(16),
    16,
    "scrypt salt",
  );
  const nonce = assertSized(
    entropy.nonce ?? provider.randomBytes(12),
    12,
    "AES-GCM nonce",
  );
  const header = new Uint8Array(HEADER_BYTES);
  header.set(MAGIC);
  header[8] = 0;
  header[9] = 15;
  new DataView(header.buffer).setUint16(10, 8, false);
  new DataView(header.buffer).setUint16(12, 3, false);
  header.set(salt, SALT_OFFSET);
  header.set(nonce, NONCE_OFFSET);
  header.set(assertSized(identity.hash, 16, "Identity hash"), HASH_OFFSET);
  const key = deriveKey(passphrase, salt);
  try {
    const ciphertext = gcm(key, nonce, header).encrypt(privateKey);
    const container = new Uint8Array(CONTAINER_BYTES);
    container.set(header);
    container.set(ciphertext, CIPHERTEXT_OFFSET);
    return container;
  } finally {
    privateKey.fill(0);
    key.fill(0);
  }
}

export function decryptIdentityBackup(
  provider: CryptoProvider,
  container: Uint8Array,
  passphrase: string,
): Identity {
  let key: Uint8Array | undefined;
  let privateKey: Uint8Array | undefined;
  try {
    if (
      container.length !== CONTAINER_BYTES ||
      !equalBytes(container.subarray(0, 8), MAGIC)
    )
      throw new Error();
    const view = new DataView(
      container.buffer,
      container.byteOffset,
      container.byteLength,
    );
    if (
      container[8] !== 0 ||
      container[9] !== 15 ||
      view.getUint16(10, false) !== 8 ||
      view.getUint16(12, false) !== 3
    ) {
      throw new Error();
    }
    const header = container.subarray(0, HEADER_BYTES);
    const salt = container.subarray(SALT_OFFSET, NONCE_OFFSET);
    const nonce = container.subarray(NONCE_OFFSET, HASH_OFFSET);
    key = deriveKey(passphrase, salt);
    privateKey = gcm(key, nonce, header).decrypt(
      container.subarray(CIPHERTEXT_OFFSET),
    );
    const identity = RnsIdentity.fromBytes(provider, privateKey.slice());
    if (
      identity === null ||
      !equalBytes(identity.hash, container.subarray(HASH_OFFSET, HEADER_BYTES))
    )
      throw new Error();
    return identity;
  } catch {
    throw new Error(IDENTITY_BACKUP_ERROR);
  } finally {
    key?.fill(0);
    privateKey?.fill(0);
  }
}

export function identityToRecoveryWords(
  identity: Identity,
): IdentityRecoveryWords {
  const privateKey = assertSized(
    identity.getPrivateKey(),
    PRIVATE_KEY_BYTES,
    "Identity private key",
  );
  try {
    return {
      first: entropyToMnemonic(privateKey.subarray(0, 32), wordlist),
      second: entropyToMnemonic(privateKey.subarray(32), wordlist),
    };
  } finally {
    privateKey.fill(0);
  }
}

export function identityFromRecoveryWords(
  provider: CryptoProvider,
  recovery: IdentityRecoveryWords,
): Identity {
  if (
    !validateMnemonic(recovery.first.normalize("NFKD"), wordlist) ||
    !validateMnemonic(recovery.second.normalize("NFKD"), wordlist)
  ) {
    throw new Error("Invalid identity recovery words");
  }
  const first = mnemonicToEntropy(recovery.first.normalize("NFKD"), wordlist);
  const second = mnemonicToEntropy(recovery.second.normalize("NFKD"), wordlist);
  const privateKey = new Uint8Array(PRIVATE_KEY_BYTES);
  privateKey.set(first);
  privateKey.set(second, 32);
  try {
    const identity = RnsIdentity.fromBytes(provider, privateKey.slice());
    if (identity === null) throw new Error("Invalid identity recovery words");
    return identity;
  } finally {
    first.fill(0);
    second.fill(0);
    privateKey.fill(0);
  }
}

export function isEncryptedIdentityBackup(bytes: Uint8Array): boolean {
  return (
    bytes.length >= MAGIC.length &&
    equalBytes(bytes.subarray(0, MAGIC.length), MAGIC)
  );
}
