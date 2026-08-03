// @ts-nocheck
import {
  initialPackWebIdentityRecordState,
  initialSplitWebIdentityRecordState,
  packWebIdentityRecordRawFromActions,
  shouldRejectPackWebIdentityRecord,
  shouldRejectSplitWebIdentityRecord,
  shouldUsePackWebIdentityRecord,
  shouldUseSplitWebIdentityRecord,
  stepPackWebIdentityRecordWithActions,
  stepSplitWebIdentityRecordWithActions,
  stepUtf8EncodeWithActions,
  initialUtf8EncodeState,
  shouldUseUtf8Encode,
  utf8EncodeRawFromActions,
  WEB_IDENTITY_IV_BYTES,
  WEB_IDENTITY_SALT_BYTES,
  webIdentityRecordFieldsFromActions
} from "@twistedpear/protocol";
import type { CryptoProvider } from "./crypto/provider.js";
import { Identity } from "./identity.js";
import type { WebIndexedDB } from "./runtime/web/runtime.js";

const IDENTITY_DB_VERSION = 1;
const IDENTITY_OBJECT_STORE = "identity";
const IDENTITY_RECORD_KEY = "private-key";
const SALT_BYTES = WEB_IDENTITY_SALT_BYTES;
const IV_BYTES = WEB_IDENTITY_IV_BYTES;
const PBKDF2_ITERATIONS = 100_000;

export interface WebIdentityOptions {
  readonly storeName?: string;
  readonly indexedDB?: WebIndexedDB;
  readonly subtle?: WebCryptoSubtle;
}

export interface WebIdentityUnlockOptions extends WebIdentityOptions {
  readonly passphrase: string;
}

export async function loadOrCreateWebIdentity(
  provider: CryptoProvider,
  options: WebIdentityUnlockOptions
): Promise<Identity> {
  const store = await openIdentityStore(options);
  const encrypted = await store.get(IDENTITY_RECORD_KEY);
  if (encrypted === undefined) {
    const identity = new Identity(provider);
    await persistWebIdentity(identity, options);
    return identity;
  }

  const privateKey = await decryptPrivateKey(encrypted, options);
  const identity = Identity.fromBytes(provider, privateKey);
  if (identity === null) {
    throw new Error("Stored web identity could not be decrypted or parsed");
  }

  return identity;
}

export async function persistWebIdentity(identity: Identity, options: WebIdentityUnlockOptions): Promise<void> {
  const store = await openIdentityStore(options);
  const encrypted = await encryptPrivateKey(identity.getPrivateKey(), options);
  await store.set(IDENTITY_RECORD_KEY, encrypted);
}

export async function hasWebIdentity(options: WebIdentityOptions): Promise<boolean> {
  const store = await openIdentityStore(options);
  return (await store.get(IDENTITY_RECORD_KEY)) !== undefined;
}

export async function resetWebIdentity(options: WebIdentityOptions): Promise<void> {
  const store = await openIdentityStore(options);
  await store.delete(IDENTITY_RECORD_KEY);
}

async function encryptPrivateKey(privateKey: Uint8Array, options: WebIdentityUnlockOptions): Promise<Uint8Array> {
  const subtle = requireSubtle(options);
  const salt = cryptoRandomBytes(SALT_BYTES);
  const iv = cryptoRandomBytes(IV_BYTES);
  const key = await deriveKey(subtle, options.passphrase, salt);
  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv }, key, Uint8Array.from(privateKey))
  );

  const packStepped = stepPackWebIdentityRecordWithActions(initialPackWebIdentityRecordState(), {
    kind: "web-identity/pack-gate",
    salt,
    iv,
    ciphertext
  });
  if (
    shouldRejectPackWebIdentityRecord(packStepped.actions) ||
    !shouldUsePackWebIdentityRecord(packStepped.actions)
  ) {
    throw new Error("web identity: missing use-raw action");
  }
  const packed = packWebIdentityRecordRawFromActions(packStepped.actions);
  if (packed === null) {
    throw new Error("web identity: missing use-raw action");
  }
  return packed;
}

async function decryptPrivateKey(packed: Uint8Array, options: WebIdentityUnlockOptions): Promise<Uint8Array> {
  const splitStepped = stepSplitWebIdentityRecordWithActions(initialSplitWebIdentityRecordState(), {
    kind: "web-identity/split-gate",
    packed
  });
  if (
    shouldRejectSplitWebIdentityRecord(splitStepped.actions) ||
    !shouldUseSplitWebIdentityRecord(splitStepped.actions)
  ) {
    throw new Error("Stored web identity record is truncated");
  }
  const fields = webIdentityRecordFieldsFromActions(splitStepped.actions);
  if (fields === null) {
    throw new Error("Stored web identity record is truncated");
  }
  const { salt, iv, ciphertext } = fields;
  const subtle = requireSubtle(options);
  const key = await deriveKey(subtle, options.passphrase, salt);
  const plaintext = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext));
  return plaintext;
}

async function deriveKey(subtle: WebCryptoSubtle, passphrase: string, salt: Uint8Array): Promise<WebCryptoKey> {
  const encodeStepped = stepUtf8EncodeWithActions(initialUtf8EncodeState(), {
    kind: "utf8/encode-gate",
    value: passphrase
  });
  const passphraseBytes = utf8EncodeRawFromActions(encodeStepped.actions);
  if (!shouldUseUtf8Encode(encodeStepped.actions) || passphraseBytes === null) {
    throw new Error("deriveKey: missing utf8 use-raw action");
  }
  const baseKey = await subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

interface IdentityKeyValueStore {
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

async function openIdentityStore(options: WebIdentityOptions): Promise<IdentityKeyValueStore> {
  const indexedDB = options.indexedDB ?? (globalThis as { readonly indexedDB?: WebIndexedDB }).indexedDB;
  if (indexedDB === undefined) {
    throw new Error("IndexedDB is required for web identity storage");
  }

  const database = await new Promise<WebIdentityDatabase>((resolve, reject) => {
    const request = indexedDB.open(options.storeName ?? "twistedpear-web-identity", IDENTITY_DB_VERSION);
    request.onupgradeneeded = (event) => {
      event.target?.result.createObjectStore(IDENTITY_OBJECT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open web identity database"));
  });

  return {
    async get(key) {
      const request = database.transaction(IDENTITY_OBJECT_STORE, "readonly").objectStore(IDENTITY_OBJECT_STORE).get(key);
      const value = await requestToPromise(request);
      if (value === undefined) {
        return undefined;
      }

      return value instanceof Uint8Array ? Uint8Array.from(value) : new Uint8Array(value as ArrayBuffer);
    },
    async set(key, value) {
      const request = database
        .transaction(IDENTITY_OBJECT_STORE, "readwrite")
        .objectStore(IDENTITY_OBJECT_STORE)
        .put(Uint8Array.from(value), key);
      await requestToPromise(request);
    },
    async delete(key) {
      const request = database
        .transaction(IDENTITY_OBJECT_STORE, "readwrite")
        .objectStore(IDENTITY_OBJECT_STORE)
        .delete(key);
      await requestToPromise(request);
    }
  };
}

function requestToPromise<T>(request: WebIdentityRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function requireSubtle(options: WebIdentityOptions): WebCryptoSubtle {
  const subtle = options.subtle ?? (globalThis as { readonly crypto?: { readonly subtle?: WebCryptoSubtle } }).crypto?.subtle;
  if (subtle === undefined) {
    throw new Error("WebCrypto subtle is required for web identity encryption");
  }

  return subtle;
}

function cryptoRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const cryptoApi = (globalThis as { readonly crypto?: WebCryptoApi }).crypto;
  if (cryptoApi?.getRandomValues === undefined) {
    throw new Error("crypto.getRandomValues is required for web identity encryption");
  }

  cryptoApi.getRandomValues(bytes);
  return bytes;
}

interface WebIdentityDatabase {
  createObjectStore(name: string): void;
  transaction(name: string, mode: "readonly" | "readwrite"): WebIdentityTransaction;
}

interface WebIdentityTransaction {
  objectStore(name: string): WebIdentityObjectStore;
}

interface WebIdentityObjectStore {
  get(key: string): WebIdentityRequest<Uint8Array | ArrayBuffer | undefined>;
  put(value: Uint8Array, key: string): WebIdentityRequest<unknown>;
  delete(key: string): WebIdentityRequest<unknown>;
}

interface WebIdentityRequest<T> {
  readonly result: T;
  readonly error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

interface WebCryptoApi {
  getRandomValues<T extends Uint8Array>(array: T): T;
}

type WebBufferSource = Uint8Array | ArrayBuffer;

interface WebCryptoKey {
  readonly type: string;
}

interface WebCryptoSubtle {
  importKey(
    format: "raw",
    keyData: WebBufferSource,
    algorithm: string,
    extractable: boolean,
    keyUsages: ReadonlyArray<string>
  ): Promise<WebCryptoKey>;
  deriveKey(
    algorithm: {
      readonly name: "PBKDF2";
      readonly salt: WebBufferSource;
      readonly iterations: number;
      readonly hash: string;
    },
    baseKey: WebCryptoKey,
    derivedKeyAlgorithm: { readonly name: "AES-GCM"; readonly length: number },
    extractable: boolean,
    keyUsages: ReadonlyArray<string>
  ): Promise<WebCryptoKey>;
  encrypt(
    algorithm: { readonly name: "AES-GCM"; readonly iv: WebBufferSource },
    key: WebCryptoKey,
    data: WebBufferSource
  ): Promise<ArrayBuffer>;
  decrypt(
    algorithm: { readonly name: "AES-GCM"; readonly iv: WebBufferSource },
    key: WebCryptoKey,
    data: WebBufferSource
  ): Promise<ArrayBuffer>;
}
