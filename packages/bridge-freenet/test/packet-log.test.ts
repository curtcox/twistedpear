import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hexToBytes } from "@twistedpear/reticulum-ts";
import {
  decodePacketLogParameters,
  decodePacketLogState,
  encodePacketLogParameters,
  encodePacketLogState,
  mergePacketLogStates
} from "../src/index.js";

const vector = JSON.parse(
  readFileSync(
    new URL(
      "../../../specs/spec-freenet/vectors/packet-log-state.json",
      import.meta.url
    ),
    "utf8"
  )
) as {
  parametersHex: string;
  cases: Array<{
    name: string;
    retentionPerDirection: number;
    leftHex: string;
    rightHex: string;
    mergedHex: string;
    mergedIndexes: Array<[number, number]>;
  }>;
};

describe("Freenet packet-log state", () => {
  it("encodes retention parameters", () => {
    const encoded = encodePacketLogParameters({ retentionPerDirection: 8 });
    expect(Buffer.from(encoded).toString("hex")).toBe(vector.parametersHex);
    expect(decodePacketLogParameters(encoded)).toEqual({
      retentionPerDirection: 8
    });
  });

  for (const testCase of vector.cases) {
    it(testCase.name, () => {
      const left = hexToBytes(testCase.leftHex);
      const right = hexToBytes(testCase.rightHex);
      const leftRight = mergePacketLogStates(
        testCase.retentionPerDirection,
        left,
        right
      );
      const rightLeft = mergePacketLogStates(
        testCase.retentionPerDirection,
        right,
        left
      );
      expect(Buffer.from(leftRight).toString("hex")).toBe(testCase.mergedHex);
      expect(Buffer.from(rightLeft).toString("hex")).toBe(testCase.mergedHex);
      expect(
        decodePacketLogState(leftRight, testCase.retentionPerDirection).map(
          (entry) => [entry.direction, Number(entry.index)]
        )
      ).toEqual(testCase.mergedIndexes);
    });
  }

  it("rejects non-canonical encodings", () => {
    expect(() =>
      encodePacketLogState([
        { direction: 0, index: 1n, payload: new Uint8Array([1]) },
        { direction: 0, index: 0n, payload: new Uint8Array([2]) }
      ])
    ).toThrow("not canonical");
  });

  it("is idempotent under merge", () => {
    const encoded = encodePacketLogState([
      { direction: 0, index: 0n, payload: new Uint8Array([0x61]) },
      { direction: 0, index: 3n, payload: new Uint8Array([0x64]) }
    ]);
    expect(
      Buffer.from(mergePacketLogStates(8, encoded, encoded)).toString("hex")
    ).toBe(Buffer.from(encoded).toString("hex"));
  });
});
