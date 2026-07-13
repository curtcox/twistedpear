import { describe, expect, it } from "vitest";
import { assembleByteArrays, concatByteArrays } from "../src/bytes.js";

describe("protocol bytes helpers", () => {
  it("concatenates and assembles byte arrays", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3]);
    expect([...concatByteArrays(a, b)]).toEqual([1, 2, 3]);
    expect([...assembleByteArrays([a, b])]).toEqual([1, 2, 3]);
    expect(assembleByteArrays([]).length).toBe(0);
  });
});
