import { describe, expect, it } from "vitest";
import {
  TYPES,
  blockersFor,
  compareItems,
  findCycles,
  ranked,
} from "../../scripts/work/lib.mjs";
import { effortOf } from "../../scripts/work/effort.mjs";

/**
 * @param {Partial<import("../../scripts/work/lib.mjs").WorkItem>} overrides
 * @returns {import("../../scripts/work/lib.mjs").WorkItem}
 */
function item(overrides) {
  return {
    id: "X",
    status: "open",
    file: "STATUS-SOFTWARE.md",
    line: 1,
    title: "",
    type: "feature",
    requires: [],
    verify: "npm run test",
    added: "2026-01-01",
    blockers: [],
    unblocks: 0,
    effort: 1,
    ...overrides,
  };
}

describe("work ranking policy", () => {
  it("orders classes broken-gate > release-gate > bug > quality > docs > feature", () => {
    expect(TYPES).toEqual([
      "broken-gate",
      "release-gate",
      "bug",
      "quality",
      "docs",
      "feature",
    ]);
  });

  it("never proposes a release gate while a gate is red", () => {
    const order = ranked([
      item({ id: "RQ-DESKTOP", type: "release-gate", unblocks: 9 }),
      item({ id: "GATE-COVERAGE", type: "broken-gate", unblocks: 0 }),
    ]).map((entry) => entry.id);
    expect(order).toEqual(["GATE-COVERAGE", "RQ-DESKTOP"]);
  });

  it("never proposes a feature ahead of a bug", () => {
    const order = ranked([
      item({ id: "FEATURE", type: "feature", added: "2020-01-01" }),
      item({ id: "BUG", type: "bug", added: "2026-12-31" }),
    ]).map((entry) => entry.id);
    expect(order).toEqual(["BUG", "FEATURE"]);
  });

  it("never proposes a feature ahead of a quality improvement", () => {
    const order = ranked([
      item({ id: "FEATURE", type: "feature", unblocks: 99 }),
      item({ id: "QUALITY", type: "quality", unblocks: 0 }),
    ]).map((entry) => entry.id);
    expect(order).toEqual(["QUALITY", "FEATURE"]);
  });

  it("breaks class ties by how much work the item unblocks", () => {
    const order = ranked([
      item({ id: "NARROW", type: "bug", unblocks: 1 }),
      item({ id: "WIDE", type: "bug", unblocks: 4 }),
    ]).map((entry) => entry.id);
    expect(order).toEqual(["WIDE", "NARROW"]);
  });

  it("breaks remaining ties by effort so a small fix outranks a sprawling one", () => {
    const order = ranked([
      item({ id: "QL-SPRAWL", type: "quality", effort: 164 }),
      item({ id: "QL-SMALL", type: "quality", effort: 5 }),
    ]).map((entry) => entry.id);
    expect(order).toEqual(["QL-SMALL", "QL-SPRAWL"]);
  });

  it("does not let effort outrank unblock count", () => {
    const order = ranked([
      item({ id: "NARROW", type: "quality", unblocks: 1, effort: 1 }),
      item({ id: "WIDE", type: "quality", unblocks: 4, effort: 100 }),
    ]).map((entry) => entry.id);
    expect(order).toEqual(["WIDE", "NARROW"]);
  });

  it("breaks remaining ties by age, then id, so the order is total", () => {
    const older = item({ id: "B", type: "bug", added: "2026-01-01" });
    const newer = item({ id: "A", type: "bug", added: "2026-06-01" });
    expect(compareItems(older, newer)).toBeLessThan(0);

    const sameDay = [
      item({ id: "B", type: "bug" }),
      item({ id: "A", type: "bug" }),
    ];
    expect(ranked(sameDay).map((entry) => entry.id)).toEqual(["A", "B"]);
    expect(ranked([...sameDay].reverse()).map((entry) => entry.id)).toEqual([
      "A",
      "B",
    ]);
  });

  it("sorts untyped items last rather than crashing", () => {
    const order = ranked([
      item({ id: "UNTYPED", type: "" }),
      item({ id: "FEATURE", type: "feature" }),
    ]).map((entry) => entry.id);
    expect(order).toEqual(["FEATURE", "UNTYPED"]);
  });
});

describe("effort", () => {
  const counts = new Map([["lint:no-func-assign", 2]]);

  it("uses remaining ratchet files for imported items and 1 otherwise", () => {
    expect(
      effortOf(
        {
          verify:
            "npm run lint:all && node scripts/work/ratchet-clear.mjs --kind=lint --rule=no-func-assign",
        },
        counts,
      ),
    ).toBe(2);
    expect(effortOf({ verify: "true" }, counts)).toBe(1);
  });

  it("treats a cleared ratchet rule as effort 0 so it ranks first to close", () => {
    expect(
      effortOf(
        {
          verify:
            "npm run complexity:check && node scripts/work/ratchet-clear.mjs --kind=complexity --rule=@typescript-eslint/ban-ts-comment",
        },
        counts,
      ),
    ).toBe(0);
  });
});

describe("blocking", () => {
  const index = new Map([
    ["DONE", item({ id: "DONE", status: "done" })],
    ["OPEN", item({ id: "OPEN", status: "open" })],
  ]);
  const resources = {
    have: { available: true },
    "have-not": { available: false, note: "an RNode pair" },
  };

  it("treats a done prerequisite as satisfied", () => {
    const blockers = blockersFor(
      item({ requires: ["DONE"] }),
      index,
      resources,
    );
    expect(blockers).toEqual([]);
  });

  it("blocks on a prerequisite that is not done", () => {
    const blockers = blockersFor(
      item({ requires: ["OPEN"] }),
      index,
      resources,
    );
    expect(blockers).toEqual([
      { kind: "item", ref: "OPEN", reason: "OPEN is open" },
    ]);
  });

  it("blocks on an unavailable resource and explains what is needed", () => {
    const blockers = blockersFor(
      item({ requires: ["res:have-not"] }),
      index,
      resources,
    );
    expect(blockers).toEqual([
      { kind: "resource", ref: "res:have-not", reason: "needs an RNode pair" },
    ]);
  });

  it("does not block on an available resource", () => {
    expect(
      blockersFor(item({ requires: ["res:have"] }), index, resources),
    ).toEqual([]);
  });

  it("reports an unknown reference as an error, not a permanent block", () => {
    const blockers = blockersFor(
      item({ requires: ["NOPE", "res:nope"] }),
      index,
      resources,
    );
    expect(blockers.map((blocker) => blocker.kind)).toEqual([
      "missing",
      "missing",
    ]);
  });

  it("detects prerequisite cycles", () => {
    const cyclic = new Map([
      ["A", item({ id: "A", requires: ["B"] })],
      ["B", item({ id: "B", requires: ["A"] })],
    ]);
    expect(findCycles(cyclic)).not.toEqual([]);
  });
});
