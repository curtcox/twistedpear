import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createValidator } from "../../../conformance/tools/mini-json-schema.mjs";
import {
  AppTraceFormatError,
  hashAppTrace,
  parseAppTrace,
  serializeAppTrace,
  type AppTrace,
} from "../src/trace-format.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const schemaPath = join(
  repo,
  "specs",
  "spec-app-trace",
  "schema",
  "app-session.schema.json",
);
const vectorsPath = join(
  repo,
  "specs",
  "spec-app-trace",
  "vectors",
  "app-session.json",
);

interface VectorFile {
  readonly vectors: ReadonlyArray<{
    readonly name: string;
    readonly hash: string;
    readonly trace: unknown;
  }>;
}

const vectors = (JSON.parse(readFileSync(vectorsPath, "utf8")) as VectorFile)
  .vectors;
const validate = createValidator(schemaPath);

describe("mini-app session trace format", () => {
  it("round-trips the three Cookbook shape traces", () => {
    expect(vectors.map((vector) => vector.name)).toEqual([
      "dice-table-shape",
      "pocket-notes-shape",
      "unit-converter-shape",
    ]);
    for (const vector of vectors) {
      expect(validate(vector.trace), vector.name).toEqual([]);
      const parsed = parseAppTrace(vector.trace);
      const serialized = serializeAppTrace(parsed);
      expect(validate(JSON.parse(serialized)), vector.name).toEqual([]);
      expect(parseAppTrace(JSON.parse(serialized))).toEqual(parsed);
      expect(hashAppTrace(parsed), vector.name).toBe(vector.hash);
      const scrambled = JSON.parse(serialized) as AppTrace;
      expect(hashAppTrace(parseAppTrace(scrambled))).toBe(vector.hash);
    }
  });

  it("hashes independently of producer key order", () => {
    const first = vectors[0];
    if (first === undefined) throw new Error("missing vectors");
    const parsed = parseAppTrace(first.trace);
    const canonical = serializeAppTrace(parsed);
    expect(canonical).toContain('"format":1');
    const reordered = {
      entries: parsed.entries,
      grants: parsed.grants,
      host: parsed.host,
      identity: parsed.identity,
      hostApiVersion: parsed.hostApiVersion,
      mode: parsed.mode,
      kind: parsed.kind,
      format: parsed.format,
    };
    expect(hashAppTrace(parseAppTrace(reordered))).toBe(hashAppTrace(parsed));
  });

  it("rejects payload-bearing documents in shape mode", () => {
    const first = vectors[0];
    if (first === undefined) throw new Error("missing vectors");
    const poisoned = {
      ...(first.trace as Record<string, unknown>),
      entries: [
        {
          t: "broker",
          at: 1,
          namespace: "storage",
          method: "get",
          capability: "storage:kv",
          outcome: "allowed",
          payload: { key: "notes" },
        },
      ],
    };
    expect(() => parseAppTrace(poisoned)).toThrow(AppTraceFormatError);
    expect(validate(poisoned).length).toBeGreaterThan(0);
  });
});
