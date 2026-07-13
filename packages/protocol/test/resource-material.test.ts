import { describe, expect, it } from "vitest";
import { RESOURCE_RANDOM_HASH_SIZE } from "../src/resource-proof.js";
import {
  resourceEncryptMaterial,
  resourceExpectedProofMaterial,
  resourceHashMaterial,
  resourcePartMapHashMaterial
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
});
