import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hexToBytes } from "@twistedpear/reticulum-ts";
import {
  decodePropagationSetParameters,
  decodePropagationSetState,
  encodePropagationSetParameters,
  encodePropagationSetState,
  mergePropagationSetStates
} from "../src/index.js";

const vector = JSON.parse(
  readFileSync(
    new URL(
      "../../../specs/spec-freenet/vectors/propagation-set-state.json",
      import.meta.url
    ),
    "utf8"
  )
) as {
  parametersHex: string;
  cases: Array<{
    name: string;
    leftHex: string;
    rightHex: string;
    mergedHex: string;
    mergedTransientSuffixes: number[];
  }>;
};

describe("Freenet propagation-set state", () => {
  it("encodes destination-hash parameters", () => {
    const encoded = encodePropagationSetParameters({
      destinationHash: hexToBytes(vector.parametersHex)
    });
    expect(Buffer.from(encoded).toString("hex")).toBe(vector.parametersHex);
    expect(decodePropagationSetParameters(encoded).destinationHash).toEqual(
      hexToBytes(vector.parametersHex)
    );
  });

  for (const testCase of vector.cases) {
    it(testCase.name, () => {
      const left = hexToBytes(testCase.leftHex);
      const right = hexToBytes(testCase.rightHex);
      const leftRight = mergePropagationSetStates(left, right);
      const rightLeft = mergePropagationSetStates(right, left);
      expect(Buffer.from(leftRight).toString("hex")).toBe(testCase.mergedHex);
      expect(Buffer.from(rightLeft).toString("hex")).toBe(testCase.mergedHex);
      expect(
        decodePropagationSetState(leftRight).map(
          (entry) => entry.transientId[31]
        )
      ).toEqual(testCase.mergedTransientSuffixes);
    });
  }

  it("is idempotent under merge", () => {
    const encoded = encodePropagationSetState([
      {
        transientId: new Uint8Array(32).fill(1),
        storedAt: 10n,
        lxmfData: new Uint8Array([0xaa])
      }
    ]);
    expect(
      Buffer.from(mergePropagationSetStates(encoded, encoded)).toString("hex")
    ).toBe(Buffer.from(encoded).toString("hex"));
  });
});
