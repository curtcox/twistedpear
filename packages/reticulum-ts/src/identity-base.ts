import {
  encodeIdentityRatchetRecordRawFromActions,
  IDENTITY_KEY_ENTROPY_SIZE,
  IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
  PROTOCOL_IDENTITY_KEY_SIZE,
  IDENTITY_RATCHET_BYTES,
  IDENTITY_RATCHET_EXPIRY_SECONDS,
  identityEntropyFieldsFromActions,
  identityPrivateKeyFieldsFromActions,
  identityPublicKeyFieldsFromActions,
  identityRatchetRecordFromActions,
  identityRatchetStoreKey,
  initialCommitRestoredIdentityRatchetState,
  initialDecodeIdentityRatchetRecordState,
  initialEncodeIdentityRatchetRecordState,
  initialIdentityHashAllowState,
  initialIdentityRatchetLookupState,
  initialIdentityRatchetRecordUsableState,
  initialIdentityRecallAppDataState,
  initialIdentityRecallState,
  initialIdentityUsePrivateKeyState,
  initialIdentityUsePublicKeyState,
  initialLoadIdentityKeyMaterialState,
  initialPackIdentityPublicKeyState,
  initialPersistIdentityRatchetState,
  initialSplitIdentityEntropyState,
  initialSplitIdentityPrivateKeyState,
  initialSplitIdentityPublicKeyState,
  initialTruncateHashBytesState,
  NAME_HASH_BITS,
  NAME_HASH_BYTES,
  shouldAllowIdentityHash,
  shouldAllowIdentityUsePrivateKey,
  shouldAllowIdentityUsePublicKey,
  shouldAllowLoadIdentityKeyMaterial,
  shouldCommitRestoredIdentityRatchetNow,
  shouldHitIdentityRecall,
  shouldHitIdentityRecallAppData,
  shouldMissIdentityRatchetNoStore,
  packIdentityPublicKeyRawFromActions,
  shouldPersistIdentityRatchetNow,
  shouldRejectEncodeIdentityRatchetRecord,
  shouldRejectPackIdentityPublicKey,
  shouldRejectSplitIdentityEntropy,
  shouldRejectTruncateHashBytes,
  shouldRestoreIdentityRatchetLookup,
  shouldTreatIdentityRatchetRecordUsable,
  shouldUseCachedIdentityRatchet,
  shouldUseDecodeIdentityRatchetRecord,
  shouldUseEncodeIdentityRatchetRecord,
  shouldUsePackIdentityPublicKey,
  shouldUseSplitIdentityEntropy,
  shouldUseSplitIdentityPrivateKey,
  shouldUseSplitIdentityPublicKey,
  shouldUseTruncateHashBytes,
  stepCommitRestoredIdentityRatchetWithActions,
  stepDecodeIdentityRatchetRecordWithActions,
  stepEncodeIdentityRatchetRecordWithActions,
  stepIdentityHashAllowWithActions,
  stepIdentityRatchetLookupWithActions,
  stepIdentityRatchetRecordUsableWithActions,
  stepIdentityRecallAppDataWithActions,
  stepIdentityRecallWithActions,
  stepIdentityUsePrivateKeyWithActions,
  stepIdentityUsePublicKeyWithActions,
  stepLoadIdentityKeyMaterialWithActions,
  stepPackIdentityPublicKeyWithActions,
  stepPersistIdentityRatchetWithActions,
  stepSplitIdentityEntropyWithActions,
  stepSplitIdentityPrivateKeyWithActions,
  stepSplitIdentityPublicKeyWithActions,
  stepTruncateHashBytesWithActions,
  TRUNCATED_HASH_BITS,
  TRUNCATED_HASH_BYTES,
  truncateHashBytesRawFromActions,
} from "./identity-protocol.js";
import { bytesToHex } from "./crypto/bytes.js";
import type { CryptoProvider } from "./crypto/provider.js";
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

export class IdentityBase {
  protected static readonly knownRatchets = new Map<string, Uint8Array>();
  protected static readonly knownDestinations = new Map<
    string,
    KnownDestinationRecord
  >();

  protected prvBytes: Uint8Array | null = null;
  protected sigPrvBytes: Uint8Array | null = null;
  protected pubBytes: Uint8Array | null = null;
  protected sigPubBytes: Uint8Array | null = null;
  protected identityHash: Uint8Array | null = null;

  constructor(
    protected readonly provider: CryptoProvider,
    createKeysOrOptions: IdentityCreateOptions = true,
  ) {
    const createKeys =
      typeof createKeysOrOptions === "boolean"
        ? createKeysOrOptions
        : createKeysOrOptions.createKeys !== false;
    const entropy =
      typeof createKeysOrOptions === "object"
        ? createKeysOrOptions.entropy
        : undefined;
    if (createKeys) {
      this.createKeys(entropy);
    }
  }

  createKeys(entropy?: Entropy): void {
    const stepped = stepSplitIdentityEntropyWithActions(
      initialSplitIdentityEntropyState(),
      {
        kind: "identity-key/split-entropy-gate",
        entropy:
          entropy !== undefined
            ? entropy.randomBytes(IDENTITY_KEY_ENTROPY_SIZE)
            : this.provider.randomBytes(IDENTITY_KEY_ENTROPY_SIZE),
      },
    );
    const material = identityEntropyFieldsFromActions(stepped.actions);
    if (
      shouldRejectSplitIdentityEntropy(stepped.actions) ||
      !shouldUseSplitIdentityEntropy(stepped.actions) ||
      material === null
    ) {
      throw new Error(
        `Identity key entropy must be at least ${IDENTITY_KEY_ENTROPY_SIZE} bytes`,
      );
    }
    this.prvBytes = material.privateKey;
    this.sigPrvBytes = material.signaturePrivateKey;
    this.updatePublicMaterial();
  }

  loadPrivateKey(privateKeyBytes: Uint8Array): boolean {
    const splitStepped = stepSplitIdentityPrivateKeyWithActions(
      initialSplitIdentityPrivateKeyState(),
      {
        kind: "identity-key/split-private-gate",
        privateKeyBytes,
      },
    );
    const split = shouldUseSplitIdentityPrivateKey(splitStepped.actions)
      ? identityPrivateKeyFieldsFromActions(splitStepped.actions)
      : null;
    if (
      !shouldAllowLoadIdentityKeyMaterial(
        stepLoadIdentityKeyMaterialWithActions(
          initialLoadIdentityKeyMaterialState(),
          {
            kind: "identity/load-key-material-gate",
            splitOk: split !== null,
          },
        ).actions,
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
        publicKeyBytes,
      },
    );
    const split = shouldUseSplitIdentityPublicKey(splitStepped.actions)
      ? identityPublicKeyFieldsFromActions(splitStepped.actions)
      : null;
    if (
      !shouldAllowLoadIdentityKeyMaterial(
        stepLoadIdentityKeyMaterialWithActions(
          initialLoadIdentityKeyMaterialState(),
          {
            kind: "identity/load-key-material-gate",
            splitOk: split !== null,
          },
        ).actions,
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

  static fromBytes(
    provider: CryptoProvider,
    privateKeyBytes: Uint8Array,
  ): IdentityBase | null {
    const identity = new IdentityBase(provider, false);
    return identity.loadPrivateKey(privateKeyBytes) ? identity : null;
  }

  static fromPublicKey(
    provider: CryptoProvider,
    publicKeyBytes: Uint8Array,
  ): IdentityBase | null {
    const identity = new IdentityBase(provider, false);
    return identity.loadPublicKey(publicKeyBytes) ? identity : null;
  }

  static getRandomHash(
    provider: CryptoProvider,
    entropy?: Entropy,
  ): Uint8Array {
    return entropy !== undefined
      ? entropy.randomBytes(TRUNCATED_HASH_BYTES)
      : provider.randomBytes(TRUNCATED_HASH_BYTES);
  }

  static fullHash(provider: CryptoProvider, data: Uint8Array): Uint8Array {
    return provider.sha256(data);
  }

  static truncatedHash(provider: CryptoProvider, data: Uint8Array): Uint8Array {
    const stepped = stepTruncateHashBytesWithActions(
      initialTruncateHashBytesState(),
      {
        kind: "hash-truncate/truncate-gate",
        digest: IdentityBase.fullHash(provider, data),
      },
    );
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

  static ratchetPublicBytes(
    provider: CryptoProvider,
    ratchetPrivate: Uint8Array,
  ): Uint8Array {
    return provider.x25519PublicFromPrivate(ratchetPrivate);
  }

  static ratchetId(
    provider: CryptoProvider,
    ratchetPublicBytes: Uint8Array,
  ): Uint8Array {
    const stepped = stepTruncateHashBytesWithActions(
      initialTruncateHashBytesState(),
      {
        kind: "hash-truncate/truncate-gate",
        digest: IdentityBase.fullHash(provider, ratchetPublicBytes),
        length: NAME_HASH_BYTES,
      },
    );
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
    store?: KeyValueStore,
  ): void {
    const key = bytesToHex(destinationHash);
    IdentityBase.knownRatchets.set(key, Uint8Array.from(ratchet));

    if (
      shouldPersistIdentityRatchetNow(
        stepPersistIdentityRatchetWithActions(
          initialPersistIdentityRatchetState(),
          {
            kind: "identity/persist-ratchet-gate",
            storePresent: store !== undefined,
          },
        ).actions,
      )
    ) {
      const encodeStepped = stepEncodeIdentityRatchetRecordWithActions(
        initialEncodeIdentityRatchetRecordState(),
        {
          kind: "identity-ratchet/encode-gate",
          record: { ratchet, received: receivedAt },
        },
      );
      if (
        shouldRejectEncodeIdentityRatchetRecord(encodeStepped.actions) ||
        !shouldUseEncodeIdentityRatchetRecord(encodeStepped.actions)
      ) {
        return;
      }
      const payload = encodeIdentityRatchetRecordRawFromActions(
        encodeStepped.actions,
      );
      if (payload === null) {
        return;
      }
      void store!.set(identityRatchetStoreKey(key), payload);
    }
  }

  static async getRatchet(
    destinationHash: Uint8Array,
    nowSeconds: number,
    store?: KeyValueStore,
  ): Promise<Uint8Array | null> {
    const key = bytesToHex(destinationHash);
    const cached = IdentityBase.knownRatchets.get(key);
    const beforeStore = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      {
        kind: "identity/ratchet-lookup-gate",
        cachedPresent: cached !== undefined,
        storePresent: store !== undefined,
        storedPresent: false,
        usable: false,
      },
    );
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
          bytes: stored,
        },
      );
      if (shouldUseDecodeIdentityRatchetRecord(decodeStepped.actions)) {
        record = identityRatchetRecordFromActions(decodeStepped.actions);
      }
    }
    const usable =
      record !== null &&
      shouldTreatIdentityRatchetRecordUsable(
        stepIdentityRatchetRecordUsableWithActions(
          initialIdentityRatchetRecordUsableState(),
          {
            kind: "identity-ratchet/usable-gate",
            record,
            nowSeconds,
          },
        ).actions,
      );
    const afterStore = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      {
        kind: "identity/ratchet-lookup-gate",
        cachedPresent: false,
        storePresent: true,
        storedPresent: record !== null,
        usable,
      },
    );
    if (
      !shouldCommitRestoredIdentityRatchetNow(
        stepCommitRestoredIdentityRatchetWithActions(
          initialCommitRestoredIdentityRatchetState(),
          {
            kind: "identity/commit-restored-ratchet-gate",
            planRestore: shouldRestoreIdentityRatchetLookup(afterStore.actions),
            recordPresent: record !== null,
          },
        ).actions,
      )
    ) {
      return null;
    }

    IdentityBase.knownRatchets.set(key, Uint8Array.from(record!.ratchet));
    return record!.ratchet;
  }

  static rememberDestination(
    destinationHash: Uint8Array,
    receivedFrom: Uint8Array,
    publicKey: Uint8Array,
    appData: Uint8Array | null,
    timestamp: number,
  ): void {
    IdentityBase.knownDestinations.set(bytesToHex(destinationHash), {
      timestamp,
      receivedFrom: Uint8Array.from(receivedFrom),
      publicKey: Uint8Array.from(publicKey),
      appData: appData === null ? null : Uint8Array.from(appData),
    });
  }

  static recall(
    provider: CryptoProvider,
    destinationHash: Uint8Array,
  ): IdentityBase | null {
    const record = IdentityBase.knownDestinations.get(
      bytesToHex(destinationHash),
    );
    const identity = new IdentityBase(provider, false);
    const publicKeyLoaded =
      record !== undefined ? identity.loadPublicKey(record.publicKey) : false;
    const gate = stepIdentityRecallWithActions(initialIdentityRecallState(), {
      kind: "identity/recall-gate",
      recordPresent: record !== undefined,
      publicKeyLoaded,
    });
    return shouldHitIdentityRecall(gate.actions) ? identity : null;
  }

  static recallAppData(destinationHash: Uint8Array): Uint8Array | null {
    const record = IdentityBase.knownDestinations.get(
      bytesToHex(destinationHash),
    );
    const gate = stepIdentityRecallAppDataWithActions(
      initialIdentityRecallAppDataState(),
      {
        kind: "identity/recall-app-data-gate",
        recordPresent: record !== undefined,
        appDataPresent: record?.appData !== undefined,
      },
    );
    return shouldHitIdentityRecallAppData(gate.actions)
      ? record!.appData!
      : null;
  }

  get hash(): Uint8Array {
    if (
      !shouldAllowIdentityHash(
        stepIdentityHashAllowWithActions(initialIdentityHashAllowState(), {
          kind: "identity/hash-allow-gate",
          identityHashPresent: this.identityHash !== null,
        }).actions,
      )
    ) {
      throw new Error("Identity has no loaded key material");
    }

    return this.identityHash!;
  }

  protected updatePublicMaterial(): void {
    this.pubBytes = this.provider.x25519PublicFromPrivate(this.prvBytes!);
    this.sigPubBytes = this.provider.ed25519PublicFromPrivate(
      this.sigPrvBytes!,
    );
    this.updateHashes();
  }

  protected updateHashes(): void {
    this.identityHash = IdentityBase.truncatedHash(
      this.provider,
      this.getPublicKey(),
    );
  }

  getPublicKey(): Uint8Array {
    this.requirePublicKey();
    const packStepped = stepPackIdentityPublicKeyWithActions(
      initialPackIdentityPublicKeyState(),
      {
        kind: "identity-key/pack-public-gate",
        publicKey: this.pubBytes!,
        signaturePublicKey: this.sigPubBytes!,
      },
    );
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

  protected requirePrivateKey(): void {
    if (
      !shouldAllowIdentityUsePrivateKey(
        stepIdentityUsePrivateKeyWithActions(
          initialIdentityUsePrivateKeyState(),
          {
            kind: "identity/use-private-key-gate",
            privateKeyPresent: this.prvBytes !== null,
            signaturePrivatePresent: this.sigPrvBytes !== null,
          },
        ).actions,
      )
    ) {
      throw new Error("Identity does not hold a private key");
    }
  }

  protected requirePublicKey(): void {
    if (
      !shouldAllowIdentityUsePublicKey(
        stepIdentityUsePublicKeyWithActions(
          initialIdentityUsePublicKeyState(),
          {
            kind: "identity/use-public-key-gate",
            publicKeyPresent: this.pubBytes !== null,
            signaturePublicPresent: this.sigPubBytes !== null,
          },
        ).actions,
      )
    ) {
      throw new Error("Identity does not hold a public key");
    }
  }
}
