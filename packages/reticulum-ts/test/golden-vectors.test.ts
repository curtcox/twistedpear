import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes, hashBytes, NodeCryptoProvider } from "../src/index.js";

interface GoldenVectors {
  readonly upstream: {
    readonly reticulumVersion: string;
  };
  readonly sha256: ReadonlyArray<{
    readonly name: string;
    readonly inputHex: string;
    readonly digestHex: string;
  }>;
  readonly hmacSha256: ReadonlyArray<{
    readonly name: string;
    readonly keyHex: string;
    readonly inputHex: string;
    readonly digestHex: string;
  }>;
  readonly hkdfSha256: ReadonlyArray<{
    readonly name: string;
    readonly keyMaterialHex: string;
    readonly saltHex: string;
    readonly infoHex: string;
    readonly length: number;
    readonly outputHex: string;
  }>;
}

const vectorsPath = resolve(import.meta.dirname, "../../../conformance/vectors/crypto.json");
const vectors = JSON.parse(readFileSync(vectorsPath, "utf8")) as GoldenVectors;
const provider = new NodeCryptoProvider();

describe("golden crypto vectors", () => {
  it("records the pinned Python reference version", () => {
    expect(vectors.upstream.reticulumVersion).toBe("0.9.4");
  });

  it.each(vectors.sha256)("matches sha256 vector $name", (vector) => {
    expect(hashBytes(provider, hexToBytes(vector.inputHex))).toBe(vector.digestHex);
  });

  it.each(vectors.hmacSha256)("matches hmac-sha256 vector $name", (vector) => {
    const digest = provider.hmacSha256(hexToBytes(vector.keyHex), hexToBytes(vector.inputHex));
    expect(bytesToHex(digest)).toBe(vector.digestHex);
  });

  it.each(vectors.hkdfSha256)("matches hkdf-sha256 vector $name", (vector) => {
    const output = provider.hkdf({
      hash: "sha256",
      keyMaterial: hexToBytes(vector.keyMaterialHex),
      salt: hexToBytes(vector.saltHex),
      info: hexToBytes(vector.infoHex),
      length: vector.length
    });

    expect(bytesToHex(output)).toBe(vector.outputHex);
  });
});
