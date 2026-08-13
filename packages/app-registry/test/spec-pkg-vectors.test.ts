import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  NodeCryptoProvider,
  PureCryptoProvider,
  hexToBytes,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";
import { PackageError, unpackPackage, verifyPackage } from "../src/index.js";
// @ts-expect-error — the runtime package is built before this cross-package test.
import {
  CapabilityError,
  assertCapabilityAllowed,
} from "../../miniapp-runtime/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const vectorsPath = join(
  here,
  "..",
  "..",
  "..",
  "specs",
  "spec-pkg",
  "vectors",
  "packages.json",
);

interface GoldenVector {
  name: string;
  archive: string;
  packageHash: string;
  manifest: { name: string; version: string; capabilities: string[] };
}

interface HostileVector {
  name: string;
  archive: string;
  reject: string;
  verifyOptions?: {
    expectedPublisherKey?: string;
    minVersion?: string;
    hostApiVersion?: string;
  };
}

interface GrantRejectVector {
  name: string;
  archive: string;
  capability: string;
  error: string;
}

const doc = JSON.parse(readFileSync(vectorsPath, "utf8")) as {
  golden: GoldenVector[];
  hostile: HostileVector[];
  grantReject: GrantRejectVector[];
};

const unhex = (value: string): Uint8Array => hexToBytes(value);

function providers(): CryptoProvider[] {
  return [new NodeCryptoProvider(), new PureCryptoProvider()];
}

describe("SPEC-PKG package vectors", () => {
  it("covers the reject classes", () => {
    const codes = new Set(doc.hostile.map((vector) => vector.reject));
    for (const code of [
      "INVALID_MAGIC",
      "MANIFEST_INVALID",
      "FILE_HASH_MISMATCH",
      "SIGNATURE_INVALID",
      "TRUNCATED",
      "WRONG_KEY",
      "DOWNGRADE",
      "MIN_HOST_API",
    ]) {
      expect([...codes], `missing reject class ${code}`).toContain(code);
    }
    expect(doc.golden.length).toBeGreaterThanOrEqual(2);
  });

  for (const provider of providers()) {
    const label = provider.constructor.name;

    for (const vector of doc.golden) {
      it(`${label} golden: ${vector.name}`, () => {
        const result = unpackPackage(provider, unhex(vector.archive));
        expect(result.packageHash).toBe(vector.packageHash);
        expect(result.manifest).toEqual(vector.manifest);
      });
    }

    for (const vector of doc.hostile) {
      it(`${label} hostile: ${vector.name}`, () => {
        const archive = unhex(vector.archive);
        const attempt = (): void => {
          if (vector.verifyOptions === undefined) {
            unpackPackage(provider, archive);
            return;
          }
          const options = {
            ...(vector.verifyOptions.expectedPublisherKey === undefined
              ? {}
              : {
                  expectedPublisherKey: unhex(
                    vector.verifyOptions.expectedPublisherKey,
                  ),
                }),
            ...(vector.verifyOptions.minVersion === undefined
              ? {}
              : { minVersion: vector.verifyOptions.minVersion }),
            ...(vector.verifyOptions.hostApiVersion === undefined
              ? {}
              : { hostApiVersion: vector.verifyOptions.hostApiVersion }),
          };
          verifyPackage(provider, archive, options);
        };
        expect(attempt).toThrowError(PackageError);
        try {
          attempt();
        } catch (error) {
          expect((error as PackageError).code, vector.name).toBe(vector.reject);
        }
      });
    }
  }

  for (const vector of doc.grantReject) {
    it(`grant-time: ${vector.name}`, () => {
      const provider = new NodeCryptoProvider();
      const result = unpackPackage(provider, unhex(vector.archive));
      expect(result.manifest.capabilities).toContain(vector.capability);
      const attempt = (): void => {
        assertCapabilityAllowed({
          capability: vector.capability,
          declared: result.manifest.capabilities,
          granted: result.manifest.capabilities,
        });
      };
      expect(attempt).toThrowError(CapabilityError as ErrorConstructor);
      try {
        attempt();
      } catch (error) {
        expect((error as { code: string }).code).toBe(vector.error);
      }
    });
  }
});
