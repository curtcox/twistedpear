import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  Identity,
  NodeCryptoProvider,
  hexToBytes,
} from "@twistedpear/reticulum-ts";
import { encode256t, signCasLocator } from "@twistedpear/cas-256t";
import {
  decodeFreenetLocatorState,
  encodeFreenetLocatorState,
  FreenetClient,
  FreenetPackageFetcher,
  locatorContractParameters,
  publishPackageToFreenet,
} from "../src/index.js";

const PRIVATE_KEY =
  "04264798bb32f059dad1fa5eeb624195d9d698eecbf173a17535774e254f4132ac8f933df951884d7c826861a215cbd5b71db024632c620e893b98702a3b3072";
const vector = JSON.parse(
  readFileSync(
    new URL(
      "../../../specs/spec-freenet/vectors/locator-state.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  contractArtifact: {
    bytes: number;
    sha256Hex: string;
    codeHashHex: string;
  };
  keyDerivation: {
    wasmHex: string;
    parametersHex: string;
    codeHashHex: string;
    instanceIdHex: string;
  };
  cases: Array<{ stateHex: string }>;
};
const locatorVector = vector.cases[0]!;

describe("Freenet locator contract state", () => {
  const provider = new NodeCryptoProvider();
  const identity = Identity.fromBytes(provider, hexToBytes(PRIVATE_KEY));
  if (identity === null) throw new Error("invalid fixture identity");
  const archiveBytes = new Uint8Array(128).map(
    (_, index) => (index * 17) & 0xff,
  );
  const t256 = encode256t(archiveBytes, (bytes) => provider.sha512(bytes));
  const locator = signCasLocator(identity, {
    t256,
    appId: "vector.app",
    version: "1.0.0",
    driveKey: "12".repeat(32),
    packageHash: "34".repeat(32),
    packageSize: archiveBytes.length,
  });

  it("has a stable golden encoding and round-trips", () => {
    const encoded = encodeFreenetLocatorState({ locator, archiveBytes });
    expect(Buffer.from(encoded).toString("hex")).toBe(locatorVector.stateHex);
    expect(decodeFreenetLocatorState(encoded)).toEqual({
      locator,
      archiveBytes,
    });
  });

  it("uses the 256t id as contract parameters", () => {
    expect(new TextDecoder().decode(locatorContractParameters(t256))).toBe(
      t256,
    );
    expect(() => locatorContractParameters("not-a-256t-id")).toThrow("94-byte");
  });

  it("pins Freenet's contract-key derivation", () => {
    const derived = FreenetClient.deriveKey({
      wasm: hexToBytes(vector.keyDerivation.wasmHex),
      parameters: hexToBytes(vector.keyDerivation.parametersHex),
    });
    expect(Buffer.from(derived.codeHash).toString("hex")).toBe(
      vector.keyDerivation.codeHashHex,
    );
    expect(Buffer.from(derived.key).toString("hex")).toBe(
      vector.keyDerivation.instanceIdHex,
    );
  });

  it("pins the generated locator contract artifact", () => {
    const wasm = Uint8Array.from(
      readFileSync(
        new URL("../contract/locator/locator-contract.wasm", import.meta.url),
      ),
    );
    expect(wasm).toHaveLength(vector.contractArtifact.bytes);
    expect(Buffer.from(provider.sha256(wasm)).toString("hex")).toBe(
      vector.contractArtifact.sha256Hex,
    );
    expect(
      Buffer.from(
        FreenetClient.deriveKey({ wasm, parameters: new Uint8Array() })
          .codeHash,
      ).toString("hex"),
    ).toBe(vector.contractArtifact.codeHashHex);
  });

  it("rejects truncated state", () => {
    const encoded = encodeFreenetLocatorState({ locator, archiveBytes });
    expect(() => decodeFreenetLocatorState(encoded.subarray(0, -1))).toThrow(
      "length",
    );
  });

  it("fetches only an exact signed locator and matching 256t archive", async () => {
    const state = encodeFreenetLocatorState({ locator, archiveBytes });
    const client = {
      async get() {
        return { key: new Uint8Array(32), codeHash: new Uint8Array(32), state };
      },
    } as unknown as FreenetClient;
    const fetcher = new FreenetPackageFetcher({
      provider,
      client,
      locatorContractWasm: new Uint8Array([0, 97, 115, 109]),
    });
    await expect(fetcher.fetchLocator(locator)).resolves.toEqual(archiveBytes);

    const tampered = Uint8Array.from(state);
    tampered[tampered.length - 1] ^= 1;
    const tamperedClient = {
      async get() {
        return {
          key: new Uint8Array(32),
          codeHash: new Uint8Array(32),
          state: tampered,
        };
      },
    } as unknown as FreenetClient;
    await expect(
      new FreenetPackageFetcher({
        provider,
        client: tamperedClient,
        locatorContractWasm: new Uint8Array([0, 97, 115, 109]),
      }).fetchLocator(locator),
    ).rejects.toThrow("256t");
  });

  it("validates locator integrity before publishing irreversible state", async () => {
    const put = vi.fn(async () => new Uint8Array(32).fill(0x42));
    const client = { put } as unknown as FreenetClient;
    await expect(
      publishPackageToFreenet({
        provider,
        client,
        locatorContractWasm: new Uint8Array([0, 97, 115, 109]),
        locator,
        archiveBytes,
      }),
    ).resolves.toMatchObject({
      contractKey: new Uint8Array(32).fill(0x42),
    });
    expect(put).toHaveBeenCalledOnce();

    const wrongArchive = Uint8Array.from(archiveBytes);
    wrongArchive[0] ^= 1;
    await expect(
      publishPackageToFreenet({
        provider,
        client,
        locatorContractWasm: new Uint8Array([0, 97, 115, 109]),
        locator,
        archiveBytes: wrongArchive,
      }),
    ).rejects.toThrow("256t");
    expect(put).toHaveBeenCalledOnce();
  });
});
