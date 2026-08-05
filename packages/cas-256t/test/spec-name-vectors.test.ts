import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { T256Error, decode256t, verify256t } from "../src/codec.js";

const here = dirname(fileURLToPath(import.meta.url));
const vectorsPath = join(here, "..", "..", "..", "specs", "spec-name", "vectors", "identifiers.json");

const sha512 = (data: Uint8Array): Uint8Array =>
  new Uint8Array(createHash("sha512").update(data).digest());
const hex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (value: string): Uint8Array => {
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return out;
};

interface DecodeVector {
  name: string;
  id: string;
  expect:
    | { kind: "inline"; length: number; bytes: string }
    | { kind: "hash"; length: number; sha512: string }
    | { kind: "reject"; reason: string };
}

interface ResolutionVector {
  name: string;
  id: string;
  content: string;
  ok: boolean;
}

const doc = JSON.parse(readFileSync(vectorsPath, "utf8")) as {
  decode: DecodeVector[];
  resolution: ResolutionVector[];
};

describe("SPEC-NAME identifier vectors", () => {
  it("covers every expectation kind and reject class", () => {
    const kinds = new Set(doc.decode.map((vector) => vector.expect.kind));
    expect([...kinds].sort()).toEqual(["hash", "inline", "reject"]);
    const reasons = new Set(
      doc.decode.flatMap((vector) => (vector.expect.kind === "reject" ? [vector.expect.reason] : []))
    );
    expect([...reasons].sort()).toEqual([
      "inline-padding",
      "non-alphabet",
      "non-canonical-tail",
      "wrong-length"
    ]);
    expect(doc.resolution.some((vector) => !vector.ok)).toBe(true);
  });

  for (const vector of doc.decode) {
    it(`decode: ${vector.name}`, () => {
      if (vector.expect.kind === "reject") {
        expect(() => decode256t(vector.id)).toThrowError(T256Error);
        try {
          decode256t(vector.id);
        } catch (error) {
          expect((error as T256Error).code).toBe("INVALID_ID");
        }
        return;
      }
      const decoded = decode256t(vector.id);
      expect(decoded.length).toBe(vector.expect.length);
      if (vector.expect.kind === "inline") {
        expect(decoded.sha512).toBeNull();
        expect(decoded.inline).not.toBeNull();
        expect(hex(decoded.inline!)).toBe(vector.expect.bytes);
      } else {
        expect(decoded.inline).toBeNull();
        expect(decoded.sha512).not.toBeNull();
        expect(hex(decoded.sha512!)).toBe(vector.expect.sha512);
      }
    });
  }

  for (const vector of doc.resolution) {
    it(`resolution: ${vector.name}`, () => {
      expect(verify256t(vector.id, unhex(vector.content), sha512)).toBe(vector.ok);
    });
  }
});
