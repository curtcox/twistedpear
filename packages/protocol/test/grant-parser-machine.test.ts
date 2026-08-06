import { enumerateCells } from "@twistedpear/effects";
import vectors from "../../../conformance/vectors/grant-parser.json";
import { decodeGrantRecord, encodeGrantRecord } from "../src/grants.js";
import { grantParserMachine } from "../src/grant-parser-machine.js";
import { utf8Encode } from "../src/utf8.js";
import { describe, expect, it } from "vitest";

describe("grant parser transition table", () => {
  it("commits a vector for every parser table cell", () => {
    expect(vectors.cells).toHaveLength(
      enumerateCells(grantParserMachine).length,
    );
    expect(vectors.cells).toHaveLength(
      grantParserMachine.states.length * grantParserMachine.events.length,
    );
    expect(vectors.cells.filter((cell) => cell.legal)).toHaveLength(
      grantParserMachine.table.length,
    );
  });

  it("accepts its canonical vector and rejects every curated near miss", () => {
    const canonical = utf8Encode(vectors.canonical);
    expect([...encodeGrantRecord(decodeGrantRecord(canonical))]).toEqual([
      ...canonical,
    ]);
    for (const nearMiss of vectors.nearMisses) {
      expect(nearMiss.expected).toBe("reject");
      expect(() => decodeGrantRecord(utf8Encode(nearMiss.text))).toThrow();
    }
  });
});
