import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain-JS conformance helper without type declarations.
import { createValidator } from "../../../conformance/tools/mini-json-schema.mjs";
// @ts-ignore — see above.
import { generateEventTypes } from "../../../scripts/generate-event-types.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const schemaPath = join(repo, "specs", "spec-events", "schema", "events.schema.json");
const tapePath = join(repo, "specs", "spec-events", "tapes", "all-shapes.json");
const generatedPath = join(repo, "packages", "effects", "src", "types.gen.ts");

interface TapeItem {
  dir: "event" | "intent" | "harness";
  payload: { kind: string; action?: { power: string } };
}

const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as {
  $defs: Record<string, { oneOf?: Array<{ properties: { kind: { const: string } } }> }>;
};
const tape = (JSON.parse(readFileSync(tapePath, "utf8")) as { tape: TapeItem[] }).tape;

function kindsOf(group: string): string[] {
  const defs = schema.$defs[group];
  if (defs?.oneOf === undefined) throw new Error(`group ${group} has no oneOf`);
  return defs.oneOf.map((variant) => variant.properties.kind.const);
}

describe("SPEC-EVENTS example tapes", () => {
  const validators = {
    event: createValidator(`${schemaPath}#/$defs/event`),
    intent: createValidator(`${schemaPath}#/$defs/machineIntent`),
    harness: createValidator(`${schemaPath}#/$defs/harnessIntent`)
  } as Record<string, (value: unknown) => string[]>;

  it("every tape item validates against its group", () => {
    for (const item of tape) {
      const validate = validators[item.dir];
      expect(validate, item.dir).toBeDefined();
      expect(validate!(item.payload), JSON.stringify(item.payload)).toEqual([]);
    }
  });

  it("the tape covers the full alphabet", () => {
    const seen = (dir: TapeItem["dir"]) => new Set(tape.filter((item) => item.dir === dir).map((item) => item.payload.kind));
    expect([...seen("event")].sort()).toEqual(kindsOf("event").sort());
    expect([...seen("intent")].sort()).toEqual(kindsOf("machineIntent").sort());
    expect([...seen("harness")].sort()).toEqual(kindsOf("harnessIntent").sort());
    const powers = new Set(
      tape.filter((item) => item.dir === "harness").map((item) => item.payload.action?.power)
    );
    expect([...powers].sort()).toEqual(["delay", "drop", "duplicate", "inject", "reorder"]);
  });

  it("payloads outside the alphabet are rejected", () => {
    expect(validators.event!({ kind: "no-such-event" })).not.toEqual([]);
    expect(validators.intent!({ kind: "transport/adversary", action: { power: "drop", source: "a", destination: "b" } })).not.toEqual([]);
    expect(validators.intent!({ kind: "log", level: "fatal", message: "x" })).not.toEqual([]);
    expect(validators.event!({ kind: "start", at: 0, extra: true })).not.toEqual([]);
  });
});

describe("SPEC-EVENTS authority inversion", () => {
  it("committed types.gen.ts matches the schema-generated output exactly", () => {
    const committed = readFileSync(generatedPath, "utf8");
    expect(committed).toBe(generateEventTypes() as string);
  });
});
