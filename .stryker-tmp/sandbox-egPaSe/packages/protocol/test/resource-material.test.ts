// @ts-nocheck
import { describe, expect, it } from "vitest";
import { RESOURCE_RANDOM_HASH_SIZE } from "../src/resource-proof.js";
import {
  computeResourceTotalParts,
  initialComputeResourceTotalPartsState,
  initialResourceEncryptMaterialState,
  initialResourceExpectedProofMaterialState,
  initialResourceHashMaterialState,
  initialResourcePartMapHashMaterialState,
  resourceEncryptMaterial,
  resourceEncryptMaterialRawFromActions,
  resourceExpectedProofMaterial,
  resourceExpectedProofMaterialRawFromActions,
  resourceHashMaterial,
  resourceHashMaterialRawFromActions,
  resourcePartMapHashMaterial,
  resourcePartMapHashMaterialRawFromActions,
  resourceTotalPartsFromActions,
  shouldRejectResourceEncryptMaterial,
  shouldRejectResourceHashMaterial,
  shouldRejectResourcePartMapHashMaterial,
  shouldUseComputeResourceTotalParts,
  shouldUseResourceEncryptMaterial,
  shouldUseResourceExpectedProofMaterial,
  shouldUseResourceHashMaterial,
  shouldUseResourcePartMapHashMaterial,
  stepComputeResourceTotalPartsWithActions,
  stepResourceEncryptMaterialWithActions,
  stepResourceExpectedProofMaterialWithActions,
  stepResourceHashMaterialWithActions,
  stepResourcePartMapHashMaterialWithActions
} from "../src/resource-material.js";

describe("protocol resource materials", () => {
  it("builds encrypt / hash / proof / part materials", () => {
    const randomHash = new Uint8Array(RESOURCE_RANDOM_HASH_SIZE).fill(1);
    const data = new Uint8Array([2, 3, 4]);
    const hash = new Uint8Array(32).fill(5);
    const part = new Uint8Array([6, 7]);

    expect([...resourceEncryptMaterial(randomHash, data)]).toEqual([...randomHash, ...data]);
    expect([...resourceHashMaterial(data, randomHash)]).toEqual([...data, ...randomHash]);
    expect([...resourceExpectedProofMaterial(data, hash)]).toEqual([...data, ...hash]);
    expect([...resourcePartMapHashMaterial(part, randomHash)]).toEqual([...part, ...randomHash]);
  });

  it("computes total parts from payload length and SDU", () => {
    expect(computeResourceTotalParts(0, 100)).toBe(0);
    expect(computeResourceTotalParts(100, 100)).toBe(1);
    expect(computeResourceTotalParts(101, 100)).toBe(2);
    expect(computeResourceTotalParts(250, 100)).toBe(3);
  });

  it("emits encrypt / hash / proof / part materials from WithActions steps", () => {
    const randomHash = new Uint8Array(RESOURCE_RANDOM_HASH_SIZE).fill(1);
    const data = new Uint8Array([2, 3, 4]);
    const hash = new Uint8Array(32).fill(5);
    const part = new Uint8Array([6, 7]);

    const encryptStepped = stepResourceEncryptMaterialWithActions(
      initialResourceEncryptMaterialState(),
      {
        kind: "resource-material/encrypt-gate",
        randomHash,
        data
      }
    );
    expect(shouldUseResourceEncryptMaterial(encryptStepped.actions)).toBe(true);
    expect([...resourceEncryptMaterialRawFromActions(encryptStepped.actions)!]).toEqual([
      ...randomHash,
      ...data
    ]);
    expect(shouldRejectResourceEncryptMaterial(encryptStepped.actions)).toBe(false);

    const badEncrypt = stepResourceEncryptMaterialWithActions(
      initialResourceEncryptMaterialState(),
      {
        kind: "resource-material/encrypt-gate",
        randomHash: new Uint8Array(1),
        data
      }
    );
    expect(shouldRejectResourceEncryptMaterial(badEncrypt.actions)).toBe(true);
    expect(shouldUseResourceEncryptMaterial(badEncrypt.actions)).toBe(false);

    const hashStepped = stepResourceHashMaterialWithActions(initialResourceHashMaterialState(), {
      kind: "resource-material/hash-gate",
      data,
      randomHash
    });
    expect(shouldUseResourceHashMaterial(hashStepped.actions)).toBe(true);
    expect([...resourceHashMaterialRawFromActions(hashStepped.actions)!]).toEqual([
      ...data,
      ...randomHash
    ]);

    const badHash = stepResourceHashMaterialWithActions(initialResourceHashMaterialState(), {
      kind: "resource-material/hash-gate",
      data,
      randomHash: new Uint8Array(1)
    });
    expect(shouldRejectResourceHashMaterial(badHash.actions)).toBe(true);

    const proofStepped = stepResourceExpectedProofMaterialWithActions(
      initialResourceExpectedProofMaterialState(),
      {
        kind: "resource-material/expected-proof-gate",
        data,
        resourceHash: hash
      }
    );
    expect(shouldUseResourceExpectedProofMaterial(proofStepped.actions)).toBe(true);
    expect([...resourceExpectedProofMaterialRawFromActions(proofStepped.actions)!]).toEqual([
      ...data,
      ...hash
    ]);

    const partStepped = stepResourcePartMapHashMaterialWithActions(
      initialResourcePartMapHashMaterialState(),
      {
        kind: "resource-material/part-map-hash-gate",
        partData: part,
        randomHash
      }
    );
    expect(shouldUseResourcePartMapHashMaterial(partStepped.actions)).toBe(true);
    expect([...resourcePartMapHashMaterialRawFromActions(partStepped.actions)!]).toEqual([
      ...part,
      ...randomHash
    ]);

    const badPart = stepResourcePartMapHashMaterialWithActions(
      initialResourcePartMapHashMaterialState(),
      {
        kind: "resource-material/part-map-hash-gate",
        partData: part,
        randomHash: new Uint8Array(1)
      }
    );
    expect(shouldRejectResourcePartMapHashMaterial(badPart.actions)).toBe(true);

    expect(
      stepResourceEncryptMaterialWithActions(initialResourceEncryptMaterialState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("emits total parts from WithActions step", () => {
    const stepped = stepComputeResourceTotalPartsWithActions(
      initialComputeResourceTotalPartsState(),
      {
        kind: "resource-material/total-parts-gate",
        length: 250,
        sdu: 100
      }
    );
    expect(shouldUseComputeResourceTotalParts(stepped.actions)).toBe(true);
    expect(resourceTotalPartsFromActions(stepped.actions)).toBe(3);
    expect(resourceTotalPartsFromActions(stepped.actions)).toBe(
      computeResourceTotalParts(250, 100)
    );
  });
});
