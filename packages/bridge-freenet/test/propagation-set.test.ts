import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hexToBytes, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  FreenetClient,
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
  contractArtifact: {
    bytes: number;
    sha256Hex: string;
    codeHashHex: string;
  };
  keyDerivation: {
    parametersHex: string;
    codeHashHex: string;
    instanceIdHex: string;
  };
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
  const provider = new NodeCryptoProvider();

  it("encodes destination-hash parameters", () => {
    const encoded = encodePropagationSetParameters({
      destinationHash: hexToBytes(vector.parametersHex)
    });
    expect(Buffer.from(encoded).toString("hex")).toBe(vector.parametersHex);
    expect(decodePropagationSetParameters(encoded).destinationHash).toEqual(
      hexToBytes(vector.parametersHex)
    );
  });

  it("pins Freenet's contract-key derivation for the propagation artifact", () => {
    const wasm = Uint8Array.from(
      readFileSync(
        new URL(
          "../contract/propagation-set/propagation-set-contract.wasm",
          import.meta.url
        )
      )
    );
    const derived = FreenetClient.deriveKey({
      wasm,
      parameters: hexToBytes(vector.keyDerivation.parametersHex)
    });
    expect(Buffer.from(derived.codeHash).toString("hex")).toBe(
      vector.keyDerivation.codeHashHex
    );
    expect(Buffer.from(derived.key).toString("hex")).toBe(
      vector.keyDerivation.instanceIdHex
    );
  });

  it("pins the generated propagation-set contract artifact", () => {
    const wasm = Uint8Array.from(
      readFileSync(
        new URL(
          "../contract/propagation-set/propagation-set-contract.wasm",
          import.meta.url
        )
      )
    );
    expect(wasm).toHaveLength(vector.contractArtifact.bytes);
    expect(Buffer.from(provider.sha256(wasm)).toString("hex")).toBe(
      vector.contractArtifact.sha256Hex
    );
    expect(
      Buffer.from(
        FreenetClient.deriveKey({ wasm, parameters: new Uint8Array() }).codeHash
      ).toString("hex")
    ).toBe(vector.contractArtifact.codeHashHex);
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
