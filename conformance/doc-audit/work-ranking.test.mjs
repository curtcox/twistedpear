import { describe, expect, it } from "vitest";
import {
  TYPES,
  blockersFor,
  compareItems,
  findCycles,
  ranked,
} from "../../scripts/work/lib.mjs";

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
    ...overrides,
  };
}

describe("work ranking policy", () => {
  it("orders classes release-gate > bug > quality > docs > feature", () => {
    expect(TYPES).toEqual([
      "release-gate",
      "bug",
      "quality",
      "docs",
      "feature",
    ]);
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
