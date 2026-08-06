import {
  encodeIdentityRatchetRecordRawFromActions,
  IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE,
  IDENTITY_KEY_ENTROPY_SIZE,
  PROTOCOL_IDENTITY_KEY_SIZE,
  IDENTITY_RATCHET_BYTES,
  IDENTITY_RATCHET_EXPIRY_SECONDS,
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
  initialTruncateHashBytesState,
  NAME_HASH_BITS,
  NAME_HASH_BYTES,
  packIdentityCiphertextRawFromActions,
  packIdentityPrivateKeyRawFromActions,
  packIdentityPublicKeyRawFromActions,
  packPacketProofRawFromActions,
  shouldAcceptIdentityCiphertextFrameNow,
  shouldAcceptIdentityDecrypt,
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
  shouldRejectEncodeIdentityRatchetRecord,
  shouldRejectIdentityDecryptEnforced,
  shouldRejectIdentityDecryptFrame,
  shouldRejectPackIdentityCiphertext,
  shouldRejectPackIdentityPrivateKey,
  shouldRejectPackIdentityPublicKey,
  shouldRejectSplitIdentityEntropy,
  shouldRejectTruncateHashBytes,
  shouldRestoreIdentityRatchetLookup,
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
  shouldUseTruncateHashBytes,
  stepAcceptIdentityCiphertextFrameWithActions,
  stepAcceptIdentityDecryptPlaintextWithActions,
  stepAttemptIdentityRatchetDecryptWithActions,
  stepCommitRestoredIdentityRatchetWithActions,
  stepDecodeIdentityRatchetRecordWithActions,
  stepEncodeIdentityRatchetRecordWithActions,
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
  TRUNCATED_HASH_BITS,
  TRUNCATED_HASH_BYTES,
  truncateHashBytesRawFromActions,
} from "./identity-protocol.js";

export * from "./identity-base.js";
export type * from "./identity-base.js";

import { Token } from "./crypto/token.js";
import { rnsHkdf } from "./crypto/hkdf.js";
import { bytesToHex } from "./crypto/bytes.js";
import type { CryptoProvider } from "./crypto/provider.js";
import { IdentityBase } from "./identity-base.js";
import type {
  DecryptOptions,
  DecryptResult,
  EncryptOptions,
} from "./identity-base.js";
import type { Entropy, KeyValueStore } from "./runtime/runtime.js";

export class Identity extends IdentityBase {
  static override fromBytes(
    provider: CryptoProvider,
    privateKeyBytes: Uint8Array,
  ): Identity | null {
    const identity = new Identity(provider, false);
    return identity.loadPrivateKey(privateKeyBytes) ? identity : null;
  }

  static override fromPublicKey(
    provider: CryptoProvider,
    publicKeyBytes: Uint8Array,
  ): Identity | null {
    const identity = new Identity(provider, false);
    return identity.loadPublicKey(publicKeyBytes) ? identity : null;
  }

  static override recall(
    provider: CryptoProvider,
    destinationHash: Uint8Array,
  ): Identity | null {
    const record = IdentityBase.knownDestinations.get(
      bytesToHex(destinationHash),
    );
    const identity = new Identity(provider, false);
    const publicKeyLoaded =
      record !== undefined ? identity.loadPublicKey(record.publicKey) : false;
    const gate = stepIdentityRecallWithActions(initialIdentityRecallState(), {
      kind: "identity/recall-gate",
      recordPresent: record !== undefined,
      publicKeyLoaded,
    });
    return shouldHitIdentityRecall(gate.actions) ? identity : null;
  }

  getPrivateKey(): Uint8Array {
    this.requirePrivateKey();
    const packStepped = stepPackIdentityPrivateKeyWithActions(
      initialPackIdentityPrivateKeyState(),
      {
        kind: "identity-key/pack-private-gate",
        privateKey: this.prvBytes!,
        signaturePrivateKey: this.sigPrvBytes!,
      },
    );
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
    const ephemeralPublicBytes =
      this.provider.x25519PublicFromPrivate(ephemeralPrivateKey);
    const targetPublicKey =
      options.ratchetPublicKey === undefined
        ? this.pubBytes!
        : options.ratchetPublicKey;

    const sharedKey = this.provider.x25519SharedSecret(
      ephemeralPrivateKey,
      targetPublicKey,
    );
    const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
    const token = new Token(this.provider, derivedKey);
    const ciphertext = token.encrypt(plaintext, {
      ...(options.tokenIv === undefined ? {} : { iv: options.tokenIv }),
      ...(options.entropy === undefined ? {} : { entropy: options.entropy }),
    });
    const packStepped = stepPackIdentityCiphertextWithActions(
      initialPackIdentityCiphertextState(),
      {
        kind: "identity-ciphertext/pack-gate",
        ephemeralPublicKey: ephemeralPublicBytes,
        tokenCiphertext: ciphertext,
      },
    );
    if (
      shouldRejectPackIdentityCiphertext(packStepped.actions) ||
      !shouldUsePackIdentityCiphertext(packStepped.actions)
    ) {
      throw new Error(
        `ephemeral public key must be ${IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE} bytes`,
      );
    }
    const packed = packIdentityCiphertextRawFromActions(packStepped.actions);
    if (packed === null) {
      throw new Error(
        `ephemeral public key must be ${IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE} bytes`,
      );
    }
    return packed;
  }

  decrypt(
    ciphertextToken: Uint8Array,
    options: DecryptOptions = {},
  ): DecryptResult {
    this.requirePrivateKey();

    const splitStepped = stepSplitIdentityCiphertextWithActions(
      initialSplitIdentityCiphertextState(),
      {
        kind: "identity-ciphertext/split-gate",
        ciphertextToken,
      },
    );
    const split = identityCiphertextFieldsFromActions(splitStepped.actions);
    /** Adapt ciphertext-frame accept via protocol actions (no ad-hoc
     * `shouldAcceptIdentityCiphertextFrame` reads). */
    const frameStepped = stepAcceptIdentityCiphertextFrameWithActions(
      initialAcceptIdentityCiphertextFrameState(),
      {
        kind: "identity-ciphertext/accept-frame-gate",
        splitOk:
          shouldUseSplitIdentityCiphertext(splitStepped.actions) &&
          split !== null,
      },
    );
    const frameOk = shouldAcceptIdentityCiphertextFrameNow(
      frameStepped.actions,
    );
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
              ratchetsPresent: options.ratchets !== undefined,
            },
          ).actions,
        )
      ) {
        for (const ratchet of options.ratchets!) {
          try {
            const ratchetPublicBytes = IdentityBase.ratchetPublicBytes(
              this.provider,
              ratchet,
            );
            ratchetId = IdentityBase.ratchetId(
              this.provider,
              ratchetPublicBytes,
            );
            const sharedKey = this.provider.x25519SharedSecret(
              ratchet,
              peerPublicBytes,
            );
            const derivedKey = rnsHkdf(
              this.provider,
              32,
              sharedKey,
              this.hash,
              null,
            );
            plaintext = new Token(this.provider, derivedKey).decrypt(
              ciphertext,
            );
            break;
          } catch {
            plaintext = null;
            ratchetId = null;
          }
        }
      }
    }

    const afterRatchets = stepIdentityDecryptWithActions(
      initialIdentityDecryptState(),
      {
        kind: "identity/decrypt-gate",
        frameOk,
        ratchetPlaintextPresent: plaintext !== null,
        enforceRatchets: options.enforceRatchets === true,
        identityFallbackDone: false,
        identityPlaintextPresent: false,
      },
    );
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
          planAccept: plaintext !== null,
        },
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
        split!.ephemeralPublicKey,
      );
      const derivedKey = rnsHkdf(this.provider, 32, sharedKey, this.hash, null);
      plaintext = new Token(this.provider, derivedKey).decrypt(
        split!.tokenCiphertext,
      );
      ratchetId = null;
    } catch {
      plaintext = null;
      ratchetId = null;
    }

    const afterIdentity = stepIdentityDecryptWithActions(
      initialIdentityDecryptState(),
      {
        kind: "identity/decrypt-gate",
        frameOk: true,
        ratchetPlaintextPresent: false,
        enforceRatchets: false,
        identityFallbackDone: true,
        identityPlaintextPresent: plaintext !== null,
      },
    );
    if (!shouldAcceptIdentityDecrypt(afterIdentity.actions)) {
      return { plaintext: null, ratchetId: null };
    }
    const plaintextStepped = stepAcceptIdentityDecryptPlaintextWithActions(
      initialAcceptIdentityDecryptPlaintextState(),
      {
        kind: "identity-ciphertext/accept-plaintext-gate",
        planAccept: plaintext !== null,
      },
    );
    if (!shouldAcceptIdentityDecryptPlaintextNow(plaintextStepped.actions)) {
      return { plaintext: null, ratchetId: null };
    }
    return { plaintext, ratchetId };
  }

  prove(
    packetHash: Uint8Array,
    proofDestinationHash: Uint8Array,
    sendProof: (
      destinationHash: Uint8Array,
      proofData: Uint8Array,
    ) => Promise<void>,
    useImplicitProof = true,
  ): Promise<void> {
    const signature = this.sign(packetHash);
    const stepped = stepPackPacketProofWithActions(
      initialPackPacketProofState(),
      {
        kind: "packet-proof/pack-gate",
        packetHash,
        signature,
        explicit: !useImplicitProof,
      },
    );
    const proofData = shouldUsePackPacketProof(stepped.actions)
      ? packPacketProofRawFromActions(stepped.actions)
      : null;
    if (proofData === null) {
      throw new Error("Identity.prove: missing use-raw action");
    }
    return sendProof(proofDestinationHash, proofData);
  }
}
