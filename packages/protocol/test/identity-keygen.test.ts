import { describe, expect, it } from "vitest";
import {
  IDENTITY_HALF_KEY_SIZE,
  IDENTITY_KEY_ENTROPY_SIZE,
  IDENTITY_KEY_SIZE,
  identityEntropyFieldsFromActions,
  identityPrivateKeyFieldsFromActions,
  identityPublicKeyFieldsFromActions,
  initialPackIdentityPrivateKeyState,
  initialPackIdentityPublicKeyState,
  initialSplitIdentityEntropyState,
  initialSplitIdentityPrivateKeyState,
  initialSplitIdentityPublicKeyState,
  packIdentityPrivateKey,
  packIdentityPrivateKeyRawFromActions,
  packIdentityPublicKey,
  packIdentityPublicKeyRawFromActions,
  shouldRejectPackIdentityPrivateKey,
  shouldRejectPackIdentityPublicKey,
  shouldRejectSplitIdentityEntropy,
  shouldRejectSplitIdentityPrivateKey,
  shouldRejectSplitIdentityPublicKey,
  shouldUsePackIdentityPrivateKey,
  shouldUsePackIdentityPublicKey,
  shouldUseSplitIdentityEntropy,
  shouldUseSplitIdentityPrivateKey,
  shouldUseSplitIdentityPublicKey,
  splitIdentityEntropy,
  splitIdentityPrivateKey,
  splitIdentityPublicKey,
  stepPackIdentityPrivateKeyWithActions,
  stepPackIdentityPublicKeyWithActions,
  stepSplitIdentityEntropyWithActions,
  stepSplitIdentityPrivateKeyWithActions,
  stepSplitIdentityPublicKeyWithActions,
} from "../src/identity-keygen.js";

describe("protocol identity keygen entropy", () => {
  it("splits 64-byte entropy into two 32-byte keys", () => {
    const entropy = new Uint8Array(IDENTITY_KEY_ENTROPY_SIZE).map(
      (_, i) => i + 1,
    );
    const keys = splitIdentityEntropy(entropy);
    expect([...keys.privateKey]).toEqual([...entropy.subarray(0, 32)]);
    expect([...keys.signaturePrivateKey]).toEqual([
      ...entropy.subarray(32, 64),
    ]);
  });

  it("rejects short entropy", () => {
    expect(() => splitIdentityEntropy(new Uint8Array(63))).toThrow(
      /at least 64/,
    );
  });

  it("emits use-fields|reject actions for identity entropy split", () => {
    const entropy = new Uint8Array(IDENTITY_KEY_ENTROPY_SIZE).map(
      (_, i) => i + 1,
    );
    const ok = stepSplitIdentityEntropyWithActions(
      initialSplitIdentityEntropyState(),
      {
        kind: "identity-key/split-entropy-gate",
        entropy,
      },
    );
    expect(shouldUseSplitIdentityEntropy(ok.actions)).toBe(true);
    expect(shouldRejectSplitIdentityEntropy(ok.actions)).toBe(false);
    const fields = identityEntropyFieldsFromActions(ok.actions)!;
    expect([...fields.privateKey]).toEqual([...entropy.subarray(0, 32)]);
    expect([...fields.signaturePrivateKey]).toEqual([
      ...entropy.subarray(32, 64),
    ]);

    const rejected = stepSplitIdentityEntropyWithActions(
      initialSplitIdentityEntropyState(),
      {
        kind: "identity-key/split-entropy-gate",
        entropy: new Uint8Array(63),
      },
    );
    expect(shouldRejectSplitIdentityEntropy(rejected.actions)).toBe(true);
    expect(identityEntropyFieldsFromActions(rejected.actions)).toBeNull();
  });

  it("packs and splits identity key material", () => {
    const left = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(1);
    const right = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(2);
    const packedPrivate = packIdentityPrivateKey(left, right);
    expect(packedPrivate.length).toBe(IDENTITY_KEY_SIZE);
    const splitPrivate = splitIdentityPrivateKey(packedPrivate);
    expect(splitPrivate).not.toBeNull();
    expect([...splitPrivate!.privateKey]).toEqual([...left]);
    expect([...splitPrivate!.signaturePrivateKey]).toEqual([...right]);

    const packedPublic = packIdentityPublicKey(left, right);
    const splitPublic = splitIdentityPublicKey(packedPublic);
    expect(splitPublic).not.toBeNull();
    expect([...splitPublic!.publicKey]).toEqual([...left]);
    expect([...splitPublic!.signaturePublicKey]).toEqual([...right]);
    expect(splitIdentityPrivateKey(new Uint8Array(8))).toBeNull();
  });

  it("emits pack/split actions for private key material", () => {
    const left = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(1);
    const right = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(2);
    const packed = packIdentityPrivateKey(left, right);

    const packOk = stepPackIdentityPrivateKeyWithActions(
      initialPackIdentityPrivateKeyState(),
      {
        kind: "identity-key/pack-private-gate",
        privateKey: left,
        signaturePrivateKey: right,
      },
    );
    expect(shouldUsePackIdentityPrivateKey(packOk.actions)).toBe(true);
    expect([...packIdentityPrivateKeyRawFromActions(packOk.actions)!]).toEqual([
      ...packed,
    ]);

    const packReject = stepPackIdentityPrivateKeyWithActions(
      initialPackIdentityPrivateKeyState(),
      {
        kind: "identity-key/pack-private-gate",
        privateKey: new Uint8Array(8),
        signaturePrivateKey: right,
      },
    );
    expect(shouldRejectPackIdentityPrivateKey(packReject.actions)).toBe(true);
    expect(packIdentityPrivateKeyRawFromActions(packReject.actions)).toBeNull();

    const splitOk = stepSplitIdentityPrivateKeyWithActions(
      initialSplitIdentityPrivateKeyState(),
      {
        kind: "identity-key/split-private-gate",
        privateKeyBytes: packed,
      },
    );
    expect(shouldUseSplitIdentityPrivateKey(splitOk.actions)).toBe(true);
    const fields = identityPrivateKeyFieldsFromActions(splitOk.actions)!;
    expect([...fields.privateKey]).toEqual([...left]);
    expect([...fields.signaturePrivateKey]).toEqual([...right]);

    const splitReject = stepSplitIdentityPrivateKeyWithActions(
      initialSplitIdentityPrivateKeyState(),
      {
        kind: "identity-key/split-private-gate",
        privateKeyBytes: new Uint8Array(8),
      },
    );
    expect(shouldRejectSplitIdentityPrivateKey(splitReject.actions)).toBe(true);
    expect(identityPrivateKeyFieldsFromActions(splitReject.actions)).toBeNull();
  });

  it("emits pack/split actions for public key material", () => {
    const left = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(3);
    const right = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(4);
    const packed = packIdentityPublicKey(left, right);

    const packOk = stepPackIdentityPublicKeyWithActions(
      initialPackIdentityPublicKeyState(),
      {
        kind: "identity-key/pack-public-gate",
        publicKey: left,
        signaturePublicKey: right,
      },
    );
    expect(shouldUsePackIdentityPublicKey(packOk.actions)).toBe(true);
    expect([...packIdentityPublicKeyRawFromActions(packOk.actions)!]).toEqual([
      ...packed,
    ]);

    const packReject = stepPackIdentityPublicKeyWithActions(
      initialPackIdentityPublicKeyState(),
      {
        kind: "identity-key/pack-public-gate",
        publicKey: left,
        signaturePublicKey: new Uint8Array(8),
      },
    );
    expect(shouldRejectPackIdentityPublicKey(packReject.actions)).toBe(true);

    const splitOk = stepSplitIdentityPublicKeyWithActions(
      initialSplitIdentityPublicKeyState(),
      {
        kind: "identity-key/split-public-gate",
        publicKeyBytes: packed,
      },
    );
    expect(shouldUseSplitIdentityPublicKey(splitOk.actions)).toBe(true);
    const fields = identityPublicKeyFieldsFromActions(splitOk.actions)!;
    expect([...fields.publicKey]).toEqual([...left]);
    expect([...fields.signaturePublicKey]).toEqual([...right]);

    const splitReject = stepSplitIdentityPublicKeyWithActions(
      initialSplitIdentityPublicKeyState(),
      {
        kind: "identity-key/split-public-gate",
        publicKeyBytes: new Uint8Array(8),
      },
    );
    expect(shouldRejectSplitIdentityPublicKey(splitReject.actions)).toBe(true);
    expect(identityPublicKeyFieldsFromActions(splitReject.actions)).toBeNull();
  });

  it("is deterministic for identical identity-key events", () => {
    const entropy = new Uint8Array(IDENTITY_KEY_ENTROPY_SIZE).fill(7);
    const entropyEvent = {
      kind: "identity-key/split-entropy-gate" as const,
      entropy,
    };
    const entropyA = stepSplitIdentityEntropyWithActions(
      initialSplitIdentityEntropyState(),
      entropyEvent,
    );
    const entropyB = stepSplitIdentityEntropyWithActions(
      initialSplitIdentityEntropyState(),
      entropyEvent,
    );
    expect(entropyA).toEqual(entropyB);

    const left = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(5);
    const right = new Uint8Array(IDENTITY_HALF_KEY_SIZE).fill(6);
    const event = {
      kind: "identity-key/pack-public-gate" as const,
      publicKey: left,
      signaturePublicKey: right,
    };
    const a = stepPackIdentityPublicKeyWithActions(
      initialPackIdentityPublicKeyState(),
      event,
    );
    const b = stepPackIdentityPublicKeyWithActions(
      initialPackIdentityPublicKeyState(),
      event,
    );
    expect(a).toEqual(b);
  });
});
