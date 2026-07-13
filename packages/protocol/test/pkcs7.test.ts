import { describe, expect, it } from "vitest";
import { PKCS7_BLOCK_SIZE, pkcs7Pad, pkcs7Unpad } from "../src/pkcs7.js";

describe("protocol pkcs7", () => {
  it("pads to the next block and round-trips", () => {
    const data = new Uint8Array([1, 2, 3]);
    const padded = pkcs7Pad(data);
    expect(padded.length % PKCS7_BLOCK_SIZE).toBe(0);
    expect(padded[padded.length - 1]).toBe(PKCS7_BLOCK_SIZE - 3);
    expect([...pkcs7Unpad(padded)]).toEqual([1, 2, 3]);
  });

  it("pads a full block when already aligned", () => {
    const data = new Uint8Array(PKCS7_BLOCK_SIZE).fill(9);
    const padded = pkcs7Pad(data);
    expect(padded.length).toBe(PKCS7_BLOCK_SIZE * 2);
    expect([...pkcs7Unpad(padded)]).toEqual([...data]);
  });

  it("rejects invalid padding", () => {
    expect(() => pkcs7Unpad(new Uint8Array())).toThrow(/empty/);
    expect(() => pkcs7Unpad(new Uint8Array([1, 2, 0]))).toThrow(/invalid padding/);
  });
});
