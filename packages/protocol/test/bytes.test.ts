import { describe, expect, it } from "vitest";
import {
  assembleByteArrays,
  assembleByteArraysRawFromActions,
  concatByteArrays,
  initialAssembleByteArraysState,
  shouldUseAssembleByteArrays,
  stepAssembleByteArraysWithActions,
} from "../src/bytes.js";

describe("protocol bytes helpers", () => {
  it("concatenates and assembles byte arrays", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3]);
    expect([...concatByteArrays(a, b)]).toEqual([1, 2, 3]);
    expect([...assembleByteArrays([a, b])]).toEqual([1, 2, 3]);
    expect(assembleByteArrays([]).length).toBe(0);
  });

  it("assembles a part count that would overflow an argument list", () => {
    // A 100 MB resource hashmap carries one entry per part. Spreading that into
    // concatByteArrays used to throw RangeError: Maximum call stack size
    // exceeded, which is how the 100 MB interop transfer failed.
    const parts = Array.from(
      { length: 300_000 },
      (_unused, index) => new Uint8Array([index % 256]),
    );
    const assembled = assembleByteArrays(parts);
    expect(assembled.length).toBe(parts.length);
    expect(assembled[0]).toBe(0);
    expect(assembled[255]).toBe(255);
    expect(assembled[parts.length - 1]).toBe((parts.length - 1) % 256);
  });

  it("assembles byte arrays only from use-raw actions", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3]);
    const stepped = stepAssembleByteArraysWithActions(
      initialAssembleByteArraysState(),
      {
        kind: "bytes/assemble-gate",
        parts: [a, b],
      },
    );
    expect(shouldUseAssembleByteArrays(stepped.actions)).toBe(true);
    const raw = assembleByteArraysRawFromActions(stepped.actions);
    expect(raw).not.toBeNull();
    expect([...raw!]).toEqual([...assembleByteArrays([a, b])]);

    const empty = stepAssembleByteArraysWithActions(
      initialAssembleByteArraysState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseAssembleByteArrays(empty.actions)).toBe(false);
    expect(assembleByteArraysRawFromActions(empty.actions)).toBeNull();
  });
});
