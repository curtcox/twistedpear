import {
  IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
  IDENTITY_KEY_ENTROPY_SIZE,
  IDENTITY_KEY_SIZE as PROTOCOL_IDENTITY_KEY_SIZE,
  IDENTITY_RATCHET_BYTES,
  IDENTITY_RATCHET_EXPIRY_SECONDS,
  decodeIdentityRatchetRecord,
  encodeIdentityRatchetRecord,
  identityRatchetStoreKey,
  isIdentityRatchetRecordUsable,
  packIdentityCiphertext,
  packIdentityPrivateKey,
  packIdentityPublicKey,
  packPacketProof,
  splitIdentityCiphertext,
  splitIdentityEntropy,
  splitIdentityPrivateKey,
  splitIdentityPublicKey
} from "@twistedpear/protocol";
import { bytesToHex } from "./crypto/bytes.js";
import { rnsHkdf } from "./crypto/hkdf.js";
import type { CryptoProvider } from "./crypto/provider.js";
import { Token } from "./crypto/token.js";
import type { Entropy, KeyValueStore } from "./runtime/runtime.js";

/** Mirrors RNS/Identity.py constants and core identity operations. */
export const IDENTITY_KEY_SIZE = PROTOCOL_IDENTITY_KEY_SIZE;
export const IDENTITY_HALF_KEY_SIZE = IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE;
export const TRUNCATED_HASH_LENGTH = 128;
export const NAME_HASH_LENGTH = 80;
export const RATCHET_SIZE = IDENTITY_RATCHET_BYTES * 8;
export const RATCHET_EXPIRY_SECONDS = IDENTITY_RATCHET_EXPIRY_SECONDS;

export interface RatchetRecord {
  readonly ratchet: Uint8Array;
  readonly received: number;
}

export interface KnownDestinationRecord {
  readonly timestamp: number;
  readonly receivedFrom: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly appData: Uint8Array | null;
}

export interface EncryptOptions {
  /** X25519 public key bytes for ratchet-targeted encryption. Mirrors RNS Identity.encrypt(ratchet=...). */
  readonly ratchetPublicKey?: Uint8Array;
  readonly ephemeralPrivateKey?: Uint8Array;
  /** Fixed Token IV for deterministic conformance vectors. */
  readonly tokenIv?: Uint8Array;
  /** Preferred entropy when ephemeral key / token IV are not supplied. */
  readonly entropy?: Entropy;
}

export type IdentityCreateOptions =
  | boolean
  | {
      readonly createKeys?: boolean;
      readonly entropy?: Entropy;
    };


export interface DecryptOptions {
  readonly ratchets?: ReadonlyArray<Uint8Array>;
  readonly enforceRatchets?: boolean;
}

export interface DecryptResult {
  readonly plaintext: Uint8Array | null;
  readonly ratchetId: Uint8Array | null;
}

export class Identity {
  private static readonly knownRatchets = new Map<string, Uint8Array>();
  private static readonly knownDestinations = new Map<string, KnownDestinationRecord>();

  private prvBytes: Uint8Array | null = null;
  private sigPrvBytes: Uint8Array | null = null;
  private pubBytes: Uint8Array | null = null;
  private sigPubBytes: Uint8Array | null = null;
  private identityHash: Uint8Array | null = null;

  constructor(
    private readonly provider: CryptoProvider,
    createKeysOrOptions: IdentityCreateOptions = true
  ) {
    const createKeys =
      typeof createKeysOrOptions === "boolean"
        ? createKeysOrOptions
        : createKeysOrOptions.createKeys !== false;
    const entropy =
      typeof createKeysOrOptions === "object" ? createKeysOrOptions.entropy : undefined;
    if (createKeys) {
      this.createKeys(entropy);
    }
  }

  static fromBytes(provider: CryptoProvider, privateKeyBytes: Uint8Array): Identity | null {
    const identity = new Identity(provider, false);
    return identity.loadPrivateKey(privateKeyBytes) ? identity : null;
  }

  static fromPublicKey(provider: CryptoProvider, publicKeyBytes: Uint8Array): Identity | null {
    const identity = new Identity(provider, false);
    return identity.loadPublicKey(publicKeyBytes) ? identity : null;
  }

  static getRandomHash(provider: CryptoProvider, entropy?: Entropy): Uint8Array {
    return entropy !== undefined
      ? entropy.randomBytes(TRUNCATED_HASH_LENGTH / 8)
      : provider.randomBytes(TRUNCATED_HASH_LENGTH / 8);
  }

  static fullHash(provider: CryptoProvider, data: Uint8Array): Uint8Array {
    return provider.sha256(data);
  }

  static truncatedHash(provider: CryptoProvider, data: Uint8Array): Uint8Array {
    return Identity.fullHash(provider, data).subarray(0, TRUNCATED_HASH_LENGTH / 8);
  }

  static ratchetPublicBytes(provider: CryptoProvider, ratchetPrivate: Uint8Array): Uint8Array {
    return provider.x25519PublicFromPrivate(ratchetPrivate);
  }

  static ratchetId(provider: CryptoProvider, ratchetPublicBytes: Uint8Array): Uint8Array {
    return Identity.fullHash(provider, ratchetPublicBytes).subarray(0, NAME_HASH_LENGTH / 8);
  }

  static rememberRatchet(
    destinationHash: Uint8Array,
    ratchet: Uint8Array,
    receivedAt: number,
    store?: KeyValueStore
  ): void {
    const key = bytesToHex(destinationHash);
    Identity.knownRatchets.set(key, Uint8Array.from(ratchet));

    if (store !== undefined) {
      const payload = encodeIdentityRatchetRecord({ ratchet, received: receivedAt });
      void store.set(identityRatchetStoreKey(key), payload);
    }
  }

  static async getRatchet(
    destinationHash: Uint8Array,
    nowSeconds: number,
    store?: KeyValueStore
  ): Promise<Uint8Array | null> {
    const key = bytesToHex(destinationHash);
    const cached = Identity.knownRatchets.get(key);
    if (cached !== undefined) {
      return Uint8Array.from(cached);
    }

    if (store === undefined) {
      return null;
    }

    const stored = await store.get(identityRatchetStoreKey(key));
    if (stored === undefined) {
      return null;
    }

    const record = decodeIdentityRatchetRecord(stored);
    if (!isIdentityRatchetRecordUsable(record, nowSeconds)) {
      return null;
    }

    Identity.knownRatchets.set(key, Uint8Array.from(record.ratchet));
    return record.ratchet;
  }

  static rememberDestination(
    destinationHash: Uint8Array,
    receivedFrom: Uint8Array,
    publicKey: Uint8Array,
    appData: Uint8Array | null,
    timestamp: number
  ): void {
    Identity.knownDestinations.set(bytesToHex(destinationHash), {
      timestamp,
      receivedFrom: Uint8Array.from(receivedFrom),
      publicKey: Uint8Array.from(publicKey),
      appData: appData === null ? null : Uint8Array.from(appData)
    });
  }

  static recall(provider: CryptoProvider, destinationHash: Uint8Array): Identity | null {
    const record = Identity.knownDestinations.get(bytesToHex(destinationHash));
    if (record === undefined) {
      return null;
    }

    const identity = new Identity(provider, false);
    return identity.loadPublicKey(record.publicKey) ? identity : null;
  }

  static recallAppData(destinationHash: Uint8Array): Uint8Array | null {
    const record = Identity.knownDestinations.get(bytesToHex(destinationHash));
    return record?.appData ?? null;
  }

  get hash(): Uint8Array {
    if (this.identityHash === null) {
      throw new Error("Identity has no loaded key material");
    }

    return this.identityHash;
  }

  createKeys(entropy?: Entropy): void {
    const material = splitIdentityEntropy(
      entropy !== undefined
        ? entropy.randomBytes(IDENTITY_KEY_ENTROPY_SIZE)
        : this.provider.randomBytes(IDENTITY_KEY_ENTROPY_SIZE)
    );
    this.prvBytes = material.privateKey;
    this.sigPrvBytes = material.signaturePrivateKey;
    this.updatePublicMaterial();
  }

  getPrivateKey(): Uint8Array {
    this.requirePrivateKey();
    return packIdentityPrivateKey(this.prvBytes!, this.sigPrvBytes!);
  }

  getPublicKey(): Uint8Array {
    this.requirePublicKey();
    return packIdentityPublicKey(this.pubBytes!, this.sigPubBytes!);
  }

  loadPrivateKey(privateKeyBytes: Uint8Array): boolean {
    const split = splitIdentityPrivateKey(privateKeyBytes);
    if (split === null) {
      return false;
    }

    this.prvBytes = split.privateKey;
    this.sigPrvBytes = split.signaturePrivateKey;
    this.updatePublicMaterial();
    return true;
  }

  loadPublicKey(publicKeyBytes: Uint8Array): boolean {
    const split = splitIdentityPublicKey(publicKeyBytes);
    if (split === null) {
      return false;
    }

    this.prvBytes = null;
    this.sigPrvBytes = null;
    this.pubBytes = split.publicKey;
    this.sigPubBytes = split.signaturePublicKey;
    this.updateHashes();
    return true;
  }

  sign(message: Uint8Array): Uint8Array {
    this.requirePrivateKey();
    return this.provider.ed25519Sign(this.sigPrvBytes!, message);
  }

  validate(signature: Uint8Array, message: Uint8Array): boolean {
    this.requirePublicKey();
    return this.provider.ed25519Verify(this.sigPubBytes!, message, signature);
  }

  encrypt(plaintext: Uint8Array, options: EncryptOptions = {}): Uint8Array {
    this.requirePublicKey();

    const ephemeralPrivateKey =
      options.ephemeralPrivateKey ??
      (options.entropy !== undefined
        ? options.entropy.randomBytes(32)
        : this.provider.randomBytes(32));
    const ephemeralPublicBytes = this.provider.x25519PublicFromPrivate(ephemeralPrivateKey);
    const targetPublicKey =
      options.ratchetPublicKey === undefined ? this.pubBytes! : options.ratchetPublicKey;

    const sharedKey = this.provider.x25519SharedSecret(ephemeralPrivateKey, targetPublicKey);
    const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
    const token = new Token(this.provider, derivedKey);
    const ciphertext = token.encrypt(plaintext, {
      ...(options.tokenIv === undefined ? {} : { iv: options.tokenIv }),
      ...(options.entropy === undefined ? {} : { entropy: options.entropy })
    });
    return packIdentityCiphertext(ephemeralPublicBytes, ciphertext);
  }

  decrypt(ciphertextToken: Uint8Array, options: DecryptOptions = {}): DecryptResult {
    this.requirePrivateKey();

    const split = splitIdentityCiphertext(ciphertextToken);
    if (split === null) {
      return { plaintext: null, ratchetId: null };
    }

    const peerPublicBytes = split.ephemeralPublicKey;
    const ciphertext = split.tokenCiphertext;
    let plaintext: Uint8Array | null = null;
    let ratchetId: Uint8Array | null = null;

    if (options.ratchets !== undefined) {
      for (const ratchet of options.ratchets) {
        try {
          const ratchetPublicBytes = Identity.ratchetPublicBytes(this.provider, ratchet);
          ratchetId = Identity.ratchetId(this.provider, ratchetPublicBytes);
          const sharedKey = this.provider.x25519SharedSecret(ratchet, peerPublicBytes);
          const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
          plaintext = new Token(this.provider, derivedKey).decrypt(ciphertext);
          break;
        } catch {
          plaintext = null;
          ratchetId = null;
        }
      }
    }

    if (options.enforceRatchets === true && plaintext === null) {
      return { plaintext: null, ratchetId: null };
    }

    if (plaintext === null) {
      try {
        const sharedKey = this.provider.x25519SharedSecret(this.prvBytes!, peerPublicBytes);
        const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
        plaintext = new Token(this.provider, derivedKey).decrypt(ciphertext);
        ratchetId = null;
      } catch {
        return { plaintext: null, ratchetId: null };
      }
    }

    return { plaintext, ratchetId };
  }

  prove(
    packetHash: Uint8Array,
    proofDestinationHash: Uint8Array,
    sendProof: (destinationHash: Uint8Array, proofData: Uint8Array) => Promise<void>,
    useImplicitProof = true
  ): Promise<void> {
    const signature = this.sign(packetHash);
    const proofData = packPacketProof(packetHash, signature, !useImplicitProof);
    return sendProof(proofDestinationHash, proofData);
  }

  private updatePublicMaterial(): void {
    this.pubBytes = this.provider.x25519PublicFromPrivate(this.prvBytes!);
    this.sigPubBytes = this.provider.ed25519PublicFromPrivate(this.sigPrvBytes!);
    this.updateHashes();
  }

  private updateHashes(): void {
    this.identityHash = Identity.truncatedHash(this.provider, this.getPublicKey());
  }

  private requirePrivateKey(): void {
    if (this.prvBytes === null || this.sigPrvBytes === null) {
      throw new Error("Identity does not hold a private key");
    }
  }

  private requirePublicKey(): void {
    if (this.pubBytes === null || this.sigPubBytes === null) {
      throw new Error("Identity does not hold a public key");
    }
  }
}
