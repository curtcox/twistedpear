/**
 * The differential fuzzer's comparison logic, tested without Docker.
 *
 * The gate itself needs the pinned reference container, which not every machine
 * has — the same situation as `kotlin-tests` and `freenet-real-node`, and the
 * same answer: the risky logic lives in a pure module and is tested directly.
 * What is risky here is not the container. It is the classifier: if it collapsed
 * two different disagreements into one kind, or reported agreement on inputs the
 * two implementations answered differently, the gate would be green and the
 * comparison meaningless — the "measurement that cannot fail" failure mode the
 * old fuzzers had.
 */
import { describe, expect, it } from "vitest";

import {
  DIFFERENTIAL_TARGETS,
  classifyDivergence,
  firstDifferingField,
  generateCases,
  hexToBytes,
  loadAllowances,
  normalisePythonReason,
  normaliseTsReason,
  summariseDivergences,
} from "../fuzz/differential.mjs";

const accepted = (canonical) => ({ accepted: true, canonical, error: null });
const rejected = (error) => ({ accepted: false, canonical: null, error });

describe("classifyDivergence", () => {
  it("reports agreement when both accept the same value", () => {
    expect(
      classifyDivergence("msgpack", accepted("i:1"), accepted("i:1")),
    ).toBeNull();
  });

  it("reports agreement when both reject, whatever their reasons", () => {
    // Two implementations are entitled to their own error messages. Demanding
    // they match would make every message edit look like a protocol change.
    expect(
      classifyDivergence(
        "msgpack",
        rejected("Unsupported msgpack tag 0xc7"),
        rejected("InsufficientDataException"),
      ),
    ).toBeNull();
  });

  it("names the direction when we accept what the reference refuses", () => {
    const divergence = classifyDivergence(
      "msgpack",
      accepted("x:dead"),
      rejected("InsufficientDataException"),
    );
    expect(divergence).toMatchObject({
      kind: "msgpack:ts-accepts:insufficient-data",
      direction: "ts-accepts",
    });
  });

  it("names the direction when the reference accepts what we refuse", () => {
    const divergence = classifyDivergence(
      "msgpack",
      rejected("Unsupported msgpack tag 0xd9"),
      accepted("s:616263"),
    );
    expect(divergence).toMatchObject({
      kind: "msgpack:python-accepts:unsupported-tag",
      direction: "python-accepts",
    });
  });

  it("separates a value mismatch by the field that differs", () => {
    const ours = accepted("m{context=i:9,data=x:00,hops=i:2}");
    const theirs = accepted("m{context=i:9,data=x:00,hops=i:3}");
    expect(classifyDivergence("packet-unpack", ours, theirs)).toMatchObject({
      kind: "packet-unpack:value-mismatch:hops",
      direction: "value-mismatch",
    });
  });

  it("does not let one field's mismatch hide behind another's agreement", () => {
    // Both sides accept, and eleven of twelve fields agree. Nothing except this
    // comparison reports the twelfth, which is why a differential fuzzer exists
    // at all.
    const ours = accepted("m{data=x:0102,hops=i:2}");
    const theirs = accepted("m{data=x:01,hops=i:2}");
    expect(classifyDivergence("packet-unpack", ours, theirs)?.kind).toBe(
      "packet-unpack:value-mismatch:data",
    );
  });
});

describe("firstDifferingField", () => {
  it("falls back to a whole-value mismatch for non-map canonicals", () => {
    expect(firstDifferingField("i:1", "i:2")).toBe("value");
  });

  it("does not split on commas inside a nested value", () => {
    expect(
      firstDifferingField("m{a=[i:1,i:2],b=i:1}", "m{a=[i:1,i:2],b=i:9}"),
    ).toBe("b");
  });

  it("treats a field present on one side only as differing", () => {
    expect(firstDifferingField("m{a=i:1}", "m{a=i:1,b=i:2}")).toBe("b");
  });
});

describe("reason normalisation", () => {
  it("folds the offending byte out of our tag errors", () => {
    // Keying divergence kinds on the raw message would mint a new class per bad
    // byte, and the allowance file would grow without bound.
    expect(normaliseTsReason("Unsupported msgpack tag 0xc7")).toBe(
      normaliseTsReason("Unsupported msgpack tag 0xd9"),
    );
  });

  it("treats a null return as a rejection with no message", () => {
    expect(normaliseTsReason(null)).toBe("rejected");
    expect(normalisePythonReason(null)).toBe("rejected");
  });

  it("kebabs a Python exception class and drops its suffix", () => {
    expect(normalisePythonReason("InsufficientDataException")).toBe(
      "insufficient-data",
    );
    expect(normalisePythonReason("KeyError")).toBe("key");
  });
});

describe("summariseDivergences", () => {
  const allowance = (kind) => ({ kind, reason: "recorded for this test" });

  it("passes a run whose every kind is recorded", () => {
    const summary = summariseDivergences(
      [{ kind: "a" }, { kind: "a" }, { kind: "b" }],
      [allowance("a"), allowance("b")],
    );
    expect(summary.unrecorded).toEqual([]);
    expect(summary.kinds).toEqual([
      { kind: "a", count: 2 },
      { kind: "b", count: 1 },
    ]);
  });

  it("fails a run that found a kind nobody has written a reason for", () => {
    const summary = summariseDivergences([{ kind: "c" }], [allowance("a")]);
    expect(summary.unrecorded).toEqual(["c"]);
  });

  it("reports an unreached allowance without failing on it", () => {
    // Which kinds a run reaches depends on the seed and the iteration count, so
    // failing here would make raising DIFFERENTIAL_ITERATIONS turn the gate red
    // for no reason — the noisy-measurement trap benchmark-rules.json documents.
    const summary = summariseDivergences([], [allowance("a")]);
    expect(summary.unused).toEqual(["a"]);
    expect(summary.unrecorded).toEqual([]);
  });
});

describe("generateCases", () => {
  it("is reproducible from its seed", () => {
    const first = generateCases({ seed: 7, iterations: 4 });
    const second = generateCases({ seed: 7, iterations: 4 });
    expect(first).toEqual(second);
  });

  it("draws different bytes for a different seed", () => {
    const first = generateCases({ seed: 7, iterations: 16 });
    const second = generateCases({ seed: 8, iterations: 16 });
    expect(first).not.toEqual(second);
  });

  it("includes every unmutated seed, so a clean frame must also agree", () => {
    const cases = generateCases({ seed: 7, iterations: 1 });
    for (const target of DIFFERENTIAL_TARGETS) {
      for (const hex of target.seeds) {
        expect(
          cases.some(
            (entry) => entry.target === target.id && entry.inputHex === hex,
          ),
        ).toBe(true);
      }
    }
  });

  it("reaches many distinct values at a given byte position", () => {
    // The lesson the previous round paid for: the old mutation strategy drew the
    // position and the value from one seed, confining each position to its own
    // residue class — 4.76 distinct values out of 256. A generator that cannot
    // produce a byte cannot find the bug behind it. This draw reaches 47, an
    // order of magnitude more, spread over the whole space rather than confined
    // to one residue class; the floor is set below that so the assertion pins
    // the property and not one particular seed's arithmetic.
    const cases = generateCases({ seed: 20260815, iterations: 512 }).filter(
      (entry) => entry.target === "packet-unpack",
    );
    const seen = new Set();
    for (const entry of cases) {
      const bytes = hexToBytes(entry.inputHex);
      if (bytes.length > 2) seen.add(bytes[2]);
    }
    expect(seen.size).toBeGreaterThan(32);
  });
});

describe("the committed allowance file", () => {
  it("gives every allowed divergence a reason, not just a kind", () => {
    // An allowance with no reason is an unexamined bug with a green light on it.
    const allowances = loadAllowances();
    expect(allowances.length).toBeGreaterThan(0);
    for (const entry of allowances) {
      expect(entry.kind).toMatch(
        /^[a-z-]+:(ts-accepts|python-accepts|value-mismatch):[a-z0-9-]+$/u,
      );
      expect(entry.reason.length).toBeGreaterThan(80);
    }
  });
});
