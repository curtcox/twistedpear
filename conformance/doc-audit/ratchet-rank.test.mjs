import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../../scripts/doc-audit/repo-root.mjs";
import { SOURCES, collect } from "../../scripts/ratchet/rank/sources.mjs";
import {
  clusterItems,
  rank,
  rollUp,
} from "../../scripts/ratchet/rank/score.mjs";
import {
  applyFilters,
  parseArgs,
  rankedRatchetItems,
} from "../../scripts/ratchet/rank.mjs";

const ROOT = repoRoot();
const RULES = JSON.parse(
  readFileSync(join(ROOT, "ratchet-rules.json"), "utf8"),
);

/**
 * @param {Partial<import("../../scripts/ratchet/rank/sources.mjs").RawItem>} overrides
 * @returns {import("../../scripts/ratchet/rank/sources.mjs").RawItem}
 */
function item(overrides) {
  return {
    ratchet: "lint",
    rule: "no-unused-vars",
    file: "scripts/ratchet/rank.mjs",
    detail: "",
    locatable: true,
    ...overrides,
  };
}

/**
 * @param {import("../../scripts/ratchet/rank/sources.mjs").RawItem[]} items
 * @returns {import("../../scripts/ratchet/rank/score.mjs").Cluster[]}
 */
function ranked(items) {
  return rank(items, { root: ROOT, rules: RULES });
}

describe("ratchet inventory", () => {
  it("declares every committed ratchet baseline", () => {
    const declared = new Set(SOURCES.map((source) => source.file));
    for (const file of [
      "lint-ratchet.json",
      "typed-lint-ratchet.json",
      "complexity-ratchet.json",
      "structure-ratchet.json",
      "format-ratchet.json",
      "size-ratchet.json",
      "license-ratchet.json",
      "sansio-ratchet.json",
      "coverage-ratchet.json",
      "language-ratchets/kotlin.json",
      "language-ratchets/python.json",
      "language-ratchets/rust.json",
      "language-ratchets/shell.json",
      "language-ratchets/swift.json",
    ]) {
      expect(declared).toContain(file);
    }
  });

  it("accounts for every baselined entry exactly once", () => {
    const { items, perRatchet } = collect(ROOT, RULES);
    for (const source of SOURCES) {
      if (source.kind === "coverage") continue;
      const baseline = JSON.parse(
        readFileSync(join(ROOT, source.file), "utf8"),
      );
      const expected =
        source.kind === "sansio"
          ? (baseline.exceptions ?? []).length +
            (baseline.adapterAllowlist ?? []).length +
            (baseline.protocolDependencyAllowlist ?? []).length
          : (baseline.entries ?? []).length;
      expect(perRatchet.get(source.id), source.id).toBe(expected);
    }
    const total = [...perRatchet.values()].reduce((sum, n) => sum + n, 0);
    expect(items).toHaveLength(total);
  });

  it("names a re-measure and a re-record command for every ratchet", () => {
    for (const source of SOURCES) {
      expect(source.check, source.id).toMatch(/\S/);
      expect(source.baseline, source.id).toMatch(/\S/);
    }
  });

  it("gives every item a rule and a file", () => {
    const { items } = collect(ROOT, RULES);
    for (const entry of items) {
      expect(entry.rule, JSON.stringify(entry)).toMatch(/\S/);
      expect(entry.file, JSON.stringify(entry)).toMatch(/\S/);
    }
  });
});

describe("ratchet clustering", () => {
  it("makes one row per rule per file", () => {
    const clusters = clusterItems([
      item({}),
      item({}),
      item({ file: "scripts/ratchet/lib.mjs" }),
      item({ rule: "no-empty" }),
    ]);
    expect(clusters.size).toBe(3);
    expect([...clusters.values()].map((entry) => entry.count).sort()).toEqual([
      1, 1, 2,
    ]);
  });
});

describe("ratchet ranking policy", () => {
  it("prefers the more severe rule when everything else matches", () => {
    const [first] = ranked([
      item({
        ratchet: "typed",
        rule: "@typescript-eslint/no-floating-promises",
      }),
      item({ ratchet: "lint", rule: "no-unused-vars" }),
    ]);
    expect(first.rule).toBe("@typescript-eslint/no-floating-promises");
  });

  it("prefers the cheaper cluster when severity matches", () => {
    const [first] = ranked([
      ...Array.from({ length: 40 }, () =>
        item({ file: "scripts/ratchet/rank/score.mjs" }),
      ),
      item({ file: "scripts/ratchet/lib.mjs" }),
    ]);
    expect(first.file).toBe("scripts/ratchet/lib.mjs");
  });

  it("treats an auto-fixable rule as nearly free", () => {
    const [autofix] = ranked(
      Array.from({ length: 30 }, () =>
        item({ ratchet: "kotlin", rule: "ktlint:standard:indent" }),
      ),
    );
    const [manual] = ranked(
      Array.from({ length: 30 }, () =>
        item({ ratchet: "kotlin", rule: "ktlint:custom:needs-judgement" }),
      ),
    );
    expect(autofix.autofix).toBe(true);
    expect(autofix.difficulty).toBeLessThan(manual.difficulty);
  });

  it("marks the cluster that would empty a rule repository-wide", () => {
    const [only, ...rest] = ranked([
      item({ rule: "no-empty" }),
      item({ rule: "no-unused-vars", file: "scripts/ratchet/lib.mjs" }),
      item({ rule: "no-unused-vars", file: "scripts/ratchet/rank.mjs" }),
    ]);
    expect(only.clearsRule).toBe(true);
    expect(rest.every((cluster) => cluster.clearsRule === false)).toBe(true);
  });

  it("flags an entry whose file no longer exists as stale and free", () => {
    const [stale] = ranked([item({ file: "packages/gone/src/removed.ts" })]);
    expect(stale.stale).toBe(true);
    expect(stale.difficulty).toBe(0);
  });

  it("does not call an unlocatable item stale", () => {
    const [license] = ranked([
      item({
        ratchet: "license",
        rule: "license:UNKNOWN",
        file: "khroma@2.1.0",
        locatable: false,
      }),
    ]);
    expect(license.stale).toBe(false);
  });

  it("scales coverage severity with the size of the remaining gap", () => {
    const near = ranked([
      item({
        ratchet: "coverage",
        rule: "coverage:branches",
        file: "packages/x",
        gap: 1,
        locatable: false,
      }),
    ])[0];
    const far = ranked([
      item({
        ratchet: "coverage",
        rule: "coverage:branches",
        file: "packages/x",
        gap: 40,
        locatable: false,
      }),
    ])[0];
    expect(far.severity).toBeGreaterThan(near.severity);
  });

  it("orders deterministically", () => {
    const items = [
      item({}),
      item({ rule: "no-empty" }),
      item({ ratchet: "typed", rule: "@typescript-eslint/require-await" }),
    ];
    expect(ranked(items).map((c) => c.rule)).toEqual(
      ranked([...items].reverse()).map((c) => c.rule),
    );
  });
});

describe("ratchet roll-ups and filters", () => {
  it("never scores a group above its best member", () => {
    const clusters = ranked([
      item({}),
      item({ file: "scripts/ratchet/lib.mjs" }),
      item({ ratchet: "typed", rule: "@typescript-eslint/await-thenable" }),
    ]);
    for (const group of rollUp(clusters, "ratchet")) {
      const best = Math.max(
        ...clusters
          .filter((cluster) => cluster.ratchet === group.ratchet)
          .map((cluster) => cluster.score),
      );
      expect(group.score).toBeCloseTo(best);
    }
  });

  it("ranks recorded allowances by default, and can drop them", () => {
    const clusters = ranked([
      item({
        ratchet: "sansio",
        rule: "sansio:adapter-allowlist",
        file: "packages/reticulum-ts/src/interfaces/tcp.ts",
        locatable: false,
      }),
      item({}),
    ]);
    expect(applyFilters(clusters, {}).visible).toHaveLength(2);
    expect(applyFilters(clusters, {}).advisory).toEqual({
      shown: 1,
      hidden: 0,
    });

    const dropped = applyFilters(clusters, { "exclude-advisory": true });
    expect(dropped.visible).toHaveLength(1);
    expect(dropped.visible[0].advisory).toBe(false);
    expect(dropped.advisory).toEqual({ shown: 0, hidden: 1 });
  });

  it("keeps the Sans-IO allowlists marked as allowances, not findings", () => {
    const { clusters } = rankedRatchetItems(ROOT);
    const sansio = clusters.filter((cluster) => cluster.ratchet === "sansio");
    expect(sansio.length).toBeGreaterThan(0);
    expect(
      sansio
        .filter((cluster) => cluster.rule !== "sansio:exception")
        .every((cluster) => cluster.advisory),
    ).toBe(true);
    expect(applyFilters(clusters, {}).visible).toEqual(
      expect.arrayContaining(sansio),
    );
  });

  it("filters by ratchet, rule, severity, and staleness", () => {
    const clusters = ranked([
      item({}),
      item({ ratchet: "typed", rule: "@typescript-eslint/await-thenable" }),
      item({ file: "packages/gone/src/removed.ts" }),
    ]);
    expect(
      applyFilters(clusters, { ratchet: "typed" }).visible.map(
        (c) => c.ratchet,
      ),
    ).toEqual(["typed"]);
    expect(applyFilters(clusters, { rule: "await" }).visible).toHaveLength(1);
    expect(
      applyFilters(clusters, { "min-severity": "8" }).visible.every(
        (c) => c.severity >= 8,
      ),
    ).toBe(true);
    expect(
      applyFilters(clusters, { "stale-only": true }).visible.every(
        (c) => c.stale,
      ),
    ).toBe(true);
  });

  it("parses long-form flags", () => {
    expect(parseArgs(["--top=5", "--json", "--rule=no-unused-vars"])).toEqual({
      top: "5",
      json: true,
      rule: "no-unused-vars",
    });
  });
});

describe("ranking the repository as it stands", () => {
  it("produces a non-empty, ordered backlog", () => {
    const { clusters } = rankedRatchetItems(ROOT);
    expect(clusters.length).toBeGreaterThan(0);
    for (let index = 1; index < clusters.length; index += 1) {
      expect(clusters[index - 1].score).toBeGreaterThanOrEqual(
        clusters[index].score,
      );
    }
  });

  it("keeps every score inside the documented 0-100 range", () => {
    const { clusters } = rankedRatchetItems(ROOT);
    for (const cluster of clusters) {
      expect(cluster.score).toBeGreaterThanOrEqual(0);
      expect(cluster.score).toBeLessThanOrEqual(100);
      expect(cluster.severity).toBeLessThanOrEqual(10);
      expect(cluster.difficulty).toBeLessThanOrEqual(10);
      expect(cluster.leverage).toBeLessThanOrEqual(10);
    }
  });

  it("reads its weights from ratchet-rules.json", () => {
    const total = Object.values(RULES.weights).reduce(
      (sum, weight) => sum + Number(weight),
      0,
    );
    expect(total).toBeCloseTo(1);
  });
});
