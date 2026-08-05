import { describe, expect, it } from "vitest";
import { resolveUpdateCodeFields } from "../src/index.js";

describe("resolveUpdateCodeFields", () => {
  const codeHash = Uint8Array.from({ length: 32 }, (_, i) => i);
  const wasm = Uint8Array.from([0, 97, 115, 109, 1, 2, 3]);

  it("uses the protocol-sized hash when no override is set", () => {
    expect(resolveUpdateCodeFields(codeHash)).toEqual({ primary: codeHash });
  });

  it("honors an explicit codeField without a secondary", () => {
    expect(resolveUpdateCodeFields(codeHash, { codeField: codeHash })).toEqual({
      primary: codeHash
    });
    expect(resolveUpdateCodeFields(codeHash, { codeField: wasm })).toEqual({
      primary: wasm
    });
  });

  it("prefers fallback WASM first with the hash as secondary for 0.2.112", () => {
    expect(
      resolveUpdateCodeFields(codeHash, { fallbackCodeField: wasm })
    ).toEqual({ primary: wasm, secondary: codeHash });
  });

  it("ignores fallbackCodeField when codeField is set", () => {
    expect(
      resolveUpdateCodeFields(codeHash, {
        codeField: codeHash,
        fallbackCodeField: wasm
      })
    ).toEqual({ primary: codeHash });
  });
});
