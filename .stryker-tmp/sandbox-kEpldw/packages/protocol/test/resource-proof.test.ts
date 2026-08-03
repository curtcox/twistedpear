// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  RESOURCE_PROOF_SIZE,
  RESOURCE_RANDOM_HASH_SIZE,
  initialAcceptResourceProofPayloadState,
  initialAcceptResourceProofSplitState,
  initialPackResourceProofState,
  initialResourceRandomHashLengthValidState,
  initialSplitResourceDecryptedPayloadState,
  initialSplitResourceProofState,
  isValidResourceProof,
  isValidResourceRandomHashLength,
  packResourceProof,
  packResourceProofRawFromActions,
  resourceDecryptedPayloadFromActions,
  resourceProofFieldsFromActions,
  shouldAcceptResourceProofPayload,
  shouldAcceptResourceProofPayloadNow,
  shouldAcceptResourceProofSplit,
  shouldAcceptResourceProofSplitNow,
  shouldAcceptResourceRandomHashLength,
  shouldRejectResourceRandomHashLength,
  shouldRejectSplitResourceDecryptedPayload,
  shouldRejectSplitResourceProof,
  shouldSkipAcceptResourceProofPayload,
  shouldSkipAcceptResourceProofSplit,
  shouldUsePackResourceProof,
  shouldUseSplitResourceDecryptedPayload,
  shouldUseSplitResourceProof,
  splitResourceDecryptedPayload,
  splitResourceProof,
  stepAcceptResourceProofPayloadWithActions,
  stepAcceptResourceProofSplitWithActions,
  stepPackResourceProofWithActions,
  stepResourceRandomHashLengthValidWithActions,
  stepSplitResourceDecryptedPayloadWithActions,
  stepSplitResourceProofWithActions
} from "../src/resource-proof.js";

describe("protocol resource proof", () => {
  const hash = new Uint8Array(32).fill(1);
  const proof = new Uint8Array(32).fill(2);

  it("packs and splits proof payloads", () => {
    const packed = packResourceProof(hash, proof);
    expect(packed.length).toBe(RESOURCE_PROOF_SIZE);
    const split = splitResourceProof(packed);
    expect([...split!.resourceHash]).toEqual([...hash]);
    expect([...split!.proofHash]).toEqual([...proof]);
  });

  it("gates proof payload length and random-hash size", () => {
    expect(shouldAcceptResourceProofPayload(RESOURCE_PROOF_SIZE)).toBe(true);
    expect(shouldAcceptResourceProofPayload(10)).toBe(false);
    expect(
      shouldAcceptResourceProofPayloadNow(
        stepAcceptResourceProofPayloadWithActions(
          initialAcceptResourceProofPayloadState(),
          {
            kind: "resource-proof/accept-payload-gate",
            dataLength: RESOURCE_PROOF_SIZE
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldSkipAcceptResourceProofPayload(
        stepAcceptResourceProofPayloadWithActions(
          initialAcceptResourceProofPayloadState(),
          {
            kind: "resource-proof/accept-payload-gate",
            dataLength: 10
          }
        ).actions
      )
    ).toBe(true);
    expect(shouldAcceptResourceProofSplit(true)).toBe(true);
    expect(shouldAcceptResourceProofSplit(false)).toBe(false);
    expect(
      shouldAcceptResourceProofSplitNow(
        stepAcceptResourceProofSplitWithActions(initialAcceptResourceProofSplitState(), {
          kind: "resource-proof/accept-split-gate",
          splitOk: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipAcceptResourceProofSplit(
        stepAcceptResourceProofSplitWithActions(initialAcceptResourceProofSplitState(), {
          kind: "resource-proof/accept-split-gate",
          splitOk: false
        }).actions
      )
    ).toBe(true);
    expect(isValidResourceRandomHashLength(RESOURCE_RANDOM_HASH_SIZE)).toBe(true);
    expect(isValidResourceRandomHashLength(3)).toBe(false);
    expect(
      shouldAcceptResourceRandomHashLength(
        stepResourceRandomHashLengthValidWithActions(
          initialResourceRandomHashLengthValidState(),
          {
            kind: "resource-proof/random-hash-length-valid-gate",
            length: RESOURCE_RANDOM_HASH_SIZE
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldRejectResourceRandomHashLength(
        stepResourceRandomHashLengthValidWithActions(
          initialResourceRandomHashLengthValidState(),
          {
            kind: "resource-proof/random-hash-length-valid-gate",
            length: 3
          }
        ).actions
      )
    ).toBe(true);
  });

  it("validates expected proof bytes", () => {
    const packed = packResourceProof(hash, proof);
    expect(isValidResourceProof(packed, proof)).toBe(true);
    expect(isValidResourceProof(packed, new Uint8Array(32).fill(9))).toBe(false);
    expect(isValidResourceProof(new Uint8Array(10), proof)).toBe(false);
  });

  it("splits decrypted payload after random hash prefix", () => {
    const decrypted = new Uint8Array([1, 2, 3, 4, 9, 8, 7]);
    expect([...splitResourceDecryptedPayload(decrypted)!]).toEqual([9, 8, 7]);
    expect(splitResourceDecryptedPayload(new Uint8Array([1, 2]))).toBeNull();
  });

  it("emits pack framing bytes from WithActions steps", () => {
    const stepped = stepPackResourceProofWithActions(initialPackResourceProofState(), {
      kind: "resource-proof/pack-gate",
      resourceHash: hash,
      proofHash: proof
    });
    expect(shouldUsePackResourceProof(stepped.actions)).toBe(true);
    const packed = packResourceProofRawFromActions(stepped.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([...packResourceProof(hash, proof)]);
  });

  it("emits split fields or reject from WithActions steps", () => {
    const packed = packResourceProof(hash, proof);
    const ok = stepSplitResourceProofWithActions(initialSplitResourceProofState(), {
      kind: "resource-proof/split-gate",
      proofData: packed
    });
    expect(shouldUseSplitResourceProof(ok.actions)).toBe(true);
    expect(shouldRejectSplitResourceProof(ok.actions)).toBe(false);
    const fields = resourceProofFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.resourceHash]).toEqual([...hash]);
    expect([...fields!.proofHash]).toEqual([...proof]);

    const rejected = stepSplitResourceProofWithActions(initialSplitResourceProofState(), {
      kind: "resource-proof/split-gate",
      proofData: new Uint8Array(10)
    });
    expect(shouldRejectSplitResourceProof(rejected.actions)).toBe(true);
    expect(shouldUseSplitResourceProof(rejected.actions)).toBe(false);
    expect(resourceProofFieldsFromActions(rejected.actions)).toBeNull();
  });

  it("emits decrypted payload or reject from WithActions steps", () => {
    const decrypted = new Uint8Array([1, 2, 3, 4, 9, 8, 7]);
    const ok = stepSplitResourceDecryptedPayloadWithActions(
      initialSplitResourceDecryptedPayloadState(),
      {
        kind: "resource-proof/split-decrypted-gate",
        decrypted
      }
    );
    expect(shouldUseSplitResourceDecryptedPayload(ok.actions)).toBe(true);
    expect(shouldRejectSplitResourceDecryptedPayload(ok.actions)).toBe(false);
    const payload = resourceDecryptedPayloadFromActions(ok.actions);
    expect(payload).not.toBeNull();
    expect([...payload!]).toEqual([9, 8, 7]);

    const rejected = stepSplitResourceDecryptedPayloadWithActions(
      initialSplitResourceDecryptedPayloadState(),
      {
        kind: "resource-proof/split-decrypted-gate",
        decrypted: new Uint8Array([1, 2])
      }
    );
    expect(shouldRejectSplitResourceDecryptedPayload(rejected.actions)).toBe(true);
    expect(shouldUseSplitResourceDecryptedPayload(rejected.actions)).toBe(false);
    expect(resourceDecryptedPayloadFromActions(rejected.actions)).toBeNull();
  });
});
