// @ts-nocheck
import {
  IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
  IDENTITY_KEY_ENTROPY_SIZE,
  IDENTITY_KEY_SIZE as PROTOCOL_IDENTITY_KEY_SIZE,
  IDENTITY_RATCHET_BYTES,
  IDENTITY_RATCHET_EXPIRY_SECONDS,
  NAME_HASH_BITS,
  TRUNCATED_HASH_BITS,
  TRUNCATED_HASH_BYTES,
  encodeIdentityRatchetRecordRawFromActions,
  identityCiphertextFieldsFromActions,
  identityEntropyFieldsFromActions,
  identityPrivateKeyFieldsFromActions,
  identityPublicKeyFieldsFromActions,
  identityRatchetRecordFromActions,
  identityRatchetStoreKey,
  initialAcceptIdentityCiphertextFrameState,
  initialAcceptIdentityDecryptPlaintextState,
  initialAttemptIdentityRatchetDecryptState,
  initialCommitRestoredIdentityRatchetState,
  initialDecodeIdentityRatchetRecordState,
  initialEncodeIdentityRatchetRecordState,
  initialIdentityDecryptState,
  initialIdentityHashAllowState,
  initialIdentityRatchetLookupState,
  initialIdentityRatchetRecordUsableState,
  initialIdentityRecallAppDataState,
  initialIdentityRecallState,
  initialIdentityUsePrivateKeyState,
  initialIdentityUsePublicKeyState,
  initialLoadIdentityKeyMaterialState,
  initialPackIdentityCiphertextState,
  initialPackIdentityPrivateKeyState,
  initialPackIdentityPublicKeyState,
  initialPackPacketProofState,
  initialPersistIdentityRatchetState,
  initialSplitIdentityCiphertextState,
  initialSplitIdentityEntropyState,
  initialSplitIdentityPrivateKeyState,
  initialSplitIdentityPublicKeyState,
  packIdentityCiphertextRawFromActions,
  packIdentityPrivateKeyRawFromActions,
  packIdentityPublicKeyRawFromActions,
  packPacketProofRawFromActions,
  shouldAcceptIdentityDecrypt,
  shouldAcceptIdentityCiphertextFrameNow,
  shouldAcceptIdentityDecryptPlaintextNow,
  shouldAllowIdentityHash,
  shouldAllowIdentityUsePrivateKey,
  shouldAllowIdentityUsePublicKey,
  shouldAllowLoadIdentityKeyMaterial,
  shouldAttemptIdentityRatchetDecryptNow,
  shouldCommitRestoredIdentityRatchetNow,
  shouldHitIdentityRecall,
  shouldHitIdentityRecallAppData,
  shouldMissIdentityRatchetNoStore,
  shouldPersistIdentityRatchetNow,
  shouldRestoreIdentityRatchetLookup,
  shouldRejectEncodeIdentityRatchetRecord,
  shouldRejectIdentityDecryptEnforced,
  shouldRejectIdentityDecryptFrame,
  shouldRejectPackIdentityCiphertext,
  shouldRejectPackIdentityPrivateKey,
  shouldRejectPackIdentityPublicKey,
  shouldRejectSplitIdentityEntropy,
  shouldTreatIdentityRatchetRecordUsable,
  shouldTryIdentityDecrypt,
  shouldUseCachedIdentityRatchet,
  shouldUseDecodeIdentityRatchetRecord,
  shouldUseEncodeIdentityRatchetRecord,
  shouldUsePackIdentityCiphertext,
  shouldUsePackIdentityPrivateKey,
  shouldUsePackIdentityPublicKey,
  shouldUsePackPacketProof,
  shouldUseSplitIdentityCiphertext,
  shouldUseSplitIdentityEntropy,
  shouldUseSplitIdentityPrivateKey,
  shouldUseSplitIdentityPublicKey,
  stepDecodeIdentityRatchetRecordWithActions,
  stepEncodeIdentityRatchetRecordWithActions,
  stepAcceptIdentityCiphertextFrameWithActions,
  stepAcceptIdentityDecryptPlaintextWithActions,
  stepAttemptIdentityRatchetDecryptWithActions,
  stepCommitRestoredIdentityRatchetWithActions,
  stepIdentityDecryptWithActions,
  stepIdentityHashAllowWithActions,
  stepIdentityRatchetLookupWithActions,
  stepIdentityRatchetRecordUsableWithActions,
  stepIdentityRecallAppDataWithActions,
  stepIdentityRecallWithActions,
  stepIdentityUsePrivateKeyWithActions,
  stepIdentityUsePublicKeyWithActions,
  stepLoadIdentityKeyMaterialWithActions,
  stepPackIdentityCiphertextWithActions,
  stepPackIdentityPrivateKeyWithActions,
  stepPackIdentityPublicKeyWithActions,
  stepPackPacketProofWithActions,
  stepPersistIdentityRatchetWithActions,
  stepSplitIdentityCiphertextWithActions,
  stepSplitIdentityEntropyWithActions,
  stepSplitIdentityPrivateKeyWithActions,
  stepSplitIdentityPublicKeyWithActions,
  stepTruncateHashBytesWithActions,
  truncateHashBytesRawFromActions,
  shouldRejectTruncateHashBytes,
  shouldUseTruncateHashBytes,
  NAME_HASH_BYTES,
  initialTruncateHashBytesState
} from "@twistedpear/protocol";
import { bytesToHex } from "./crypto/bytes.js";
import { rnsHkdf } from "./crypto/hkdf.js";
import type { CryptoProvider } from "./crypto/provider.js";
import { Token } from "./crypto/token.js";
import type { Entropy, KeyValueStore } from "./runtime/runtime.js";

/** Mirrors RNS/Identity.py constants and core identity operations. */
export const IDENTITY_KEY_SIZE = PROTOCOL_IDENTITY_KEY_SIZE;
export const IDENTITY_HALF_KEY_SIZE = IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE;
export const TRUNCATED_HASH_LENGTH = TRUNCATED_HASH_BITS;
export const NAME_HASH_LENGTH = NAME_HASH_BITS;
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
      ? entropy.randomBytes(TRUNCATED_HASH_BYTES)
      : provider.randomBytes(TRUNCATED_HASH_BYTES);
  }

  static fullHash(provider: CryptoProvider, data: Uint8Array): Uint8Array {
    return provider.sha256(data);
  }

  static truncatedHash(provider: CryptoProvider, data: Uint8Array): Uint8Array {
    const stepped = stepTruncateHashBytesWithActions(initialTruncateHashBytesState(), {
      kind: "hash-truncate/truncate-gate",
      digest: Identity.fullHash(provider, data)
    });
    const raw = truncateHashBytesRawFromActions(stepped.actions);
    if (
      shouldRejectTruncateHashBytes(stepped.actions) ||
      !shouldUseTruncateHashBytes(stepped.actions) ||
      raw === null
    ) {
      throw new Error(`digest must be at least ${TRUNCATED_HASH_BYTES} bytes`);
    }
    return raw;
  }

  static ratchetPublicBytes(provider: CryptoProvider, ratchetPrivate: Uint8Array): Uint8Array {
    return provider.x25519PublicFromPrivate(ratchetPrivate);
  }

  static ratchetId(provider: CryptoProvider, ratchetPublicBytes: Uint8Array): Uint8Array {
    const stepped = stepTruncateHashBytesWithActions(initialTruncateHashBytesState(), {
      kind: "hash-truncate/truncate-gate",
      digest: Identity.fullHash(provider, ratchetPublicBytes),
      length: NAME_HASH_BYTES
    });
    const raw = truncateHashBytesRawFromActions(stepped.actions);
    if (
      shouldRejectTruncateHashBytes(stepped.actions) ||
      !shouldUseTruncateHashBytes(stepped.actions) ||
      raw === null
    ) {
      throw new Error(`digest must be at least ${NAME_HASH_BYTES} bytes`);
    }
    return raw;
  }

  static rememberRatchet(
    destinationHash: Uint8Array,
    ratchet: Uint8Array,
    receivedAt: number,
    store?: KeyValueStore
  ): void {
    const key = bytesToHex(destinationHash);
    Identity.knownRatchets.set(key, Uint8Array.from(ratchet));

    if (
      shouldPersistIdentityRatchetNow(
        stepPersistIdentityRatchetWithActions(initialPersistIdentityRatchetState(), {
          kind: "identity/persist-ratchet-gate",
          storePresent: store !== undefined
        }).actions
      )
    ) {
      const encodeStepped = stepEncodeIdentityRatchetRecordWithActions(
        initialEncodeIdentityRatchetRecordState(),
        {
          kind: "identity-ratchet/encode-gate",
          record: { ratchet, received: receivedAt }
        }
      );
      if (
        shouldRejectEncodeIdentityRatchetRecord(encodeStepped.actions) ||
        !shouldUseEncodeIdentityRatchetRecord(encodeStepped.actions)
      ) {
        return;
      }
      const payload = encodeIdentityRatchetRecordRawFromActions(encodeStepped.actions);
      if (payload === null) {
        return;
      }
      void store!.set(identityRatchetStoreKey(key), payload);
    }
  }

  static async getRatchet(
    destinationHash: Uint8Array,
    nowSeconds: number,
    store?: KeyValueStore
  ): Promise<Uint8Array | null> {
    const key = bytesToHex(destinationHash);
    const cached = Identity.knownRatchets.get(key);
    const beforeStore = stepIdentityRatchetLookupWithActions(initialIdentityRatchetLookupState(), {
      kind: "identity/ratchet-lookup-gate",
      cachedPresent: cached !== undefined,
      storePresent: store !== undefined,
      storedPresent: false,
      usable: false
    });
    if (shouldUseCachedIdentityRatchet(beforeStore.actions)) {
      return Uint8Array.from(cached!);
    }
    if (shouldMissIdentityRatchetNoStore(beforeStore.actions)) {
      return null;
    }

    const stored = await store!.get(identityRatchetStoreKey(key));
    let record = null;
    if (stored !== undefined) {
      const decodeStepped = stepDecodeIdentityRatchetRecordWithActions(
        initialDecodeIdentityRatchetRecordState(),
        {
          kind: "identity-ratchet/decode-gate",
          bytes: stored
        }
      );
      if (shouldUseDecodeIdentityRatchetRecord(decodeStepped.actions)) {
        record = identityRatchetRecordFromActions(decodeStepped.actions);
      }
    }
    const usable =
      record !== null &&
      shouldTreatIdentityRatchetRecordUsable(
        stepIdentityRatchetRecordUsableWithActions(initialIdentityRatchetRecordUsableState(), {
          kind: "identity-ratchet/usable-gate",
          record,
          nowSeconds
        }).actions
      );
    const afterStore = stepIdentityRatchetLookupWithActions(initialIdentityRatchetLookupState(), {
      kind: "identity/ratchet-lookup-gate",
      cachedPresent: false,
      storePresent: true,
      storedPresent: record !== null,
      usable
    });
    if (
      !shouldCommitRestoredIdentityRatchetNow(
        stepCommitRestoredIdentityRatchetWithActions(initialCommitRestoredIdentityRatchetState(), {
          kind: "identity/commit-restored-ratchet-gate",
          planRestore: shouldRestoreIdentityRatchetLookup(afterStore.actions),
          recordPresent: record !== null
        }).actions
      )
    ) {
      return null;
    }

    Identity.knownRatchets.set(key, Uint8Array.from(record!.ratchet));
    return record!.ratchet;
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
    const identity = new Identity(provider, false);
    const publicKeyLoaded =
      record !== undefined ? identity.loadPublicKey(record.publicKey) : false;
    const gate = stepIdentityRecallWithActions(initialIdentityRecallState(), {
      kind: "identity/recall-gate",
      recordPresent: record !== undefined,
      publicKeyLoaded
    });
    return shouldHitIdentityRecall(gate.actions) ? identity : null;
  }

  static recallAppData(destinationHash: Uint8Array): Uint8Array | null {
    const record = Identity.knownDestinations.get(bytesToHex(destinationHash));
    const gate = stepIdentityRecallAppDataWithActions(initialIdentityRecallAppDataState(), {
      kind: "identity/recall-app-data-gate",
      recordPresent: record !== undefined,
      appDataPresent: record?.appData !== undefined
    });
    return shouldHitIdentityRecallAppData(gate.actions) ? record!.appData! : null;
  }

  get hash(): Uint8Array {
    if (
      !shouldAllowIdentityHash(
        stepIdentityHashAllowWithActions(initialIdentityHashAllowState(), {
          kind: "identity/hash-allow-gate",
          identityHashPresent: this.identityHash !== null
        }).actions
      )
    ) {
      throw new Error("Identity has no loaded key material");
    }

    return this.identityHash!;
  }

  createKeys(entropy?: Entropy): void {
    const stepped = stepSplitIdentityEntropyWithActions(initialSplitIdentityEntropyState(), {
      kind: "identity-key/split-entropy-gate",
      entropy:
        entropy !== undefined
          ? entropy.randomBytes(IDENTITY_KEY_ENTROPY_SIZE)
          : this.provider.randomBytes(IDENTITY_KEY_ENTROPY_SIZE)
    });
    const material = identityEntropyFieldsFromActions(stepped.actions);
    if (
      shouldRejectSplitIdentityEntropy(stepped.actions) ||
      !shouldUseSplitIdentityEntropy(stepped.actions) ||
      material === null
    ) {
      throw new Error(
        `Identity key entropy must be at least ${IDENTITY_KEY_ENTROPY_SIZE} bytes`
      );
    }
    this.prvBytes = material.privateKey;
    this.sigPrvBytes = material.signaturePrivateKey;
    this.updatePublicMaterial();
  }

  getPrivateKey(): Uint8Array {
    this.requirePrivateKey();
    const packStepped = stepPackIdentityPrivateKeyWithActions(initialPackIdentityPrivateKeyState(), {
      kind: "identity-key/pack-private-gate",
      privateKey: this.prvBytes!,
      signaturePrivateKey: this.sigPrvBytes!
    });
    if (
      shouldRejectPackIdentityPrivateKey(packStepped.actions) ||
      !shouldUsePackIdentityPrivateKey(packStepped.actions)
    ) {
      throw new Error("Identity.getPrivateKey: missing use-raw action");
    }
    const packed = packIdentityPrivateKeyRawFromActions(packStepped.actions);
    if (packed === null) {
      throw new Error("Identity.getPrivateKey: missing use-raw action");
    }
    return packed;
  }

  getPublicKey(): Uint8Array {
    this.requirePublicKey();
    const packStepped = stepPackIdentityPublicKeyWithActions(initialPackIdentityPublicKeyState(), {
      kind: "identity-key/pack-public-gate",
      publicKey: this.pubBytes!,
      signaturePublicKey: this.sigPubBytes!
    });
    if (
      shouldRejectPackIdentityPublicKey(packStepped.actions) ||
      !shouldUsePackIdentityPublicKey(packStepped.actions)
    ) {
      throw new Error("Identity.getPublicKey: missing use-raw action");
    }
    const packed = packIdentityPublicKeyRawFromActions(packStepped.actions);
    if (packed === null) {
      throw new Error("Identity.getPublicKey: missing use-raw action");
    }
    return packed;
  }

  loadPrivateKey(privateKeyBytes: Uint8Array): boolean {
    const splitStepped = stepSplitIdentityPrivateKeyWithActions(
      initialSplitIdentityPrivateKeyState(),
      {
        kind: "identity-key/split-private-gate",
        privateKeyBytes
      }
    );
    const split = shouldUseSplitIdentityPrivateKey(splitStepped.actions)
      ? identityPrivateKeyFieldsFromActions(splitStepped.actions)
      : null;
    if (
      !shouldAllowLoadIdentityKeyMaterial(
        stepLoadIdentityKeyMaterialWithActions(initialLoadIdentityKeyMaterialState(), {
          kind: "identity/load-key-material-gate",
          splitOk: split !== null
        }).actions
      )
    ) {
      return false;
    }

    this.prvBytes = split!.privateKey;
    this.sigPrvBytes = split!.signaturePrivateKey;
    this.updatePublicMaterial();
    return true;
  }

  loadPublicKey(publicKeyBytes: Uint8Array): boolean {
    const splitStepped = stepSplitIdentityPublicKeyWithActions(
      initialSplitIdentityPublicKeyState(),
      {
        kind: "identity-key/split-public-gate",
        publicKeyBytes
      }
    );
    const split = shouldUseSplitIdentityPublicKey(splitStepped.actions)
      ? identityPublicKeyFieldsFromActions(splitStepped.actions)
      : null;
    if (
      !shouldAllowLoadIdentityKeyMaterial(
        stepLoadIdentityKeyMaterialWithActions(initialLoadIdentityKeyMaterialState(), {
          kind: "identity/load-key-material-gate",
          splitOk: split !== null
        }).actions
      )
    ) {
      return false;
    }

    this.prvBytes = null;
    this.sigPrvBytes = null;
    this.pubBytes = split!.publicKey;
    this.sigPubBytes = split!.signaturePublicKey;
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
    const packStepped = stepPackIdentityCiphertextWithActions(initialPackIdentityCiphertextState(), {
      kind: "identity-ciphertext/pack-gate",
      ephemeralPublicKey: ephemeralPublicBytes,
      tokenCiphertext: ciphertext
    });
    if (
      shouldRejectPackIdentityCiphertext(packStepped.actions) ||
      !shouldUsePackIdentityCiphertext(packStepped.actions)
    ) {
      throw new Error(
        `ephemeral public key must be ${IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE} bytes`
      );
    }
    const packed = packIdentityCiphertextRawFromActions(packStepped.actions);
    if (packed === null) {
      throw new Error(
        `ephemeral public key must be ${IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE} bytes`
      );
    }
    return packed;
  }

  decrypt(ciphertextToken: Uint8Array, options: DecryptOptions = {}): DecryptResult {
    this.requirePrivateKey();

    const splitStepped = stepSplitIdentityCiphertextWithActions(
      initialSplitIdentityCiphertextState(),
      {
        kind: "identity-ciphertext/split-gate",
        ciphertextToken
      }
    );
    const split = identityCiphertextFieldsFromActions(splitStepped.actions);
    /** Adapt ciphertext-frame accept via protocol actions (no ad-hoc
     * `shouldAcceptIdentityCiphertextFrame` reads). */
    const frameStepped = stepAcceptIdentityCiphertextFrameWithActions(
      initialAcceptIdentityCiphertextFrameState(),
      {
        kind: "identity-ciphertext/accept-frame-gate",
        splitOk:
          shouldUseSplitIdentityCiphertext(splitStepped.actions) && split !== null
      }
    );
    const frameOk = shouldAcceptIdentityCiphertextFrameNow(frameStepped.actions);
    let plaintext: Uint8Array | null = null;
    let ratchetId: Uint8Array | null = null;

    if (frameOk) {
      const peerPublicBytes = split!.ephemeralPublicKey;
      const ciphertext = split!.tokenCiphertext;

      if (
        shouldAttemptIdentityRatchetDecryptNow(
          stepAttemptIdentityRatchetDecryptWithActions(
            initialAttemptIdentityRatchetDecryptState(),
            {
              kind: "identity/attempt-ratchet-decrypt-gate",
              ratchetsPresent: options.ratchets !== undefined
            }
          ).actions
        )
      ) {
        for (const ratchet of options.ratchets!) {
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
    }

    const afterRatchets = stepIdentityDecryptWithActions(initialIdentityDecryptState(), {
      kind: "identity/decrypt-gate",
      frameOk,
      ratchetPlaintextPresent: plaintext !== null,
      enforceRatchets: options.enforceRatchets === true,
      identityFallbackDone: false,
      identityPlaintextPresent: false
    });
    if (
      shouldRejectIdentityDecryptFrame(afterRatchets.actions) ||
      shouldRejectIdentityDecryptEnforced(afterRatchets.actions)
    ) {
      return { plaintext: null, ratchetId: null };
    }
    if (shouldAcceptIdentityDecrypt(afterRatchets.actions)) {
      const plaintextStepped = stepAcceptIdentityDecryptPlaintextWithActions(
        initialAcceptIdentityDecryptPlaintextState(),
        {
          kind: "identity-ciphertext/accept-plaintext-gate",
          planAccept: plaintext !== null
        }
      );
      if (shouldAcceptIdentityDecryptPlaintextNow(plaintextStepped.actions)) {
        return { plaintext, ratchetId };
      }
      return { plaintext: null, ratchetId: null };
    }
    if (!shouldTryIdentityDecrypt(afterRatchets.actions)) {
      return { plaintext: null, ratchetId: null };
    }

    try {
      const sharedKey = this.provider.x25519SharedSecret(
        this.prvBytes!,
        split!.ephemeralPublicKey
      );
      const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
      plaintext = new Token(this.provider, derivedKey).decrypt(split!.tokenCiphertext);
      ratchetId = null;
    } catch {
      plaintext = null;
      ratchetId = null;
    }

    const afterIdentity = stepIdentityDecryptWithActions(initialIdentityDecryptState(), {
      kind: "identity/decrypt-gate",
      frameOk: true,
      ratchetPlaintextPresent: false,
      enforceRatchets: false,
      identityFallbackDone: true,
      identityPlaintextPresent: plaintext !== null
    });
    if (!shouldAcceptIdentityDecrypt(afterIdentity.actions)) {
      return { plaintext: null, ratchetId: null };
    }
    const plaintextStepped = stepAcceptIdentityDecryptPlaintextWithActions(
      initialAcceptIdentityDecryptPlaintextState(),
      {
        kind: "identity-ciphertext/accept-plaintext-gate",
        planAccept: plaintext !== null
      }
    );
    if (!shouldAcceptIdentityDecryptPlaintextNow(plaintextStepped.actions)) {
      return { plaintext: null, ratchetId: null };
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
    const stepped = stepPackPacketProofWithActions(initialPackPacketProofState(), {
      kind: "packet-proof/pack-gate",
      packetHash,
      signature,
      explicit: !useImplicitProof
    });
    const proofData =
      shouldUsePackPacketProof(stepped.actions)
        ? packPacketProofRawFromActions(stepped.actions)
        : null;
    if (proofData === null) {
      throw new Error("Identity.prove: missing use-raw action");
    }
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
    if (
      !shouldAllowIdentityUsePrivateKey(
        stepIdentityUsePrivateKeyWithActions(initialIdentityUsePrivateKeyState(), {
          kind: "identity/use-private-key-gate",
          privateKeyPresent: this.prvBytes !== null,
          signaturePrivatePresent: this.sigPrvBytes !== null
        }).actions
      )
    ) {
      throw new Error("Identity does not hold a private key");
    }
  }

  private requirePublicKey(): void {
    if (
      !shouldAllowIdentityUsePublicKey(
        stepIdentityUsePublicKeyWithActions(initialIdentityUsePublicKeyState(), {
          kind: "identity/use-public-key-gate",
          publicKeyPresent: this.pubBytes !== null,
          signaturePublicPresent: this.sigPubBytes !== null
        }).actions
      )
    ) {
      throw new Error("Identity does not hold a public key");
    }
  }
}
