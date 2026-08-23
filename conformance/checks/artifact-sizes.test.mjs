import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  evaluate,
  formatBytes,
  matchesPattern,
  unbudgeted,
} from "../../scripts/analysis/artifact-sizes.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const rules = JSON.parse(
  fs.readFileSync(path.join(root, "artifact-size-rules.json"), "utf8"),
);

/** A measure function over a fixed table, so the cases do not need real files. */
const measuring = (table) => (relative) => table[relative] ?? null;

describe("shipped artifact byte budgets", () => {
  it("passes on the tree as committed", () => {
    const result = spawnSync(
      globalThis.process.execPath,
      ["scripts/analysis/artifact-sizes.mjs"],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.stdout).toContain("artifact-sizes: PASS");
    expect(result.status).toBe(0);
  });

  it("budgets every artifact above its current size", () => {
    for (const artifact of rules.artifacts) {
      const actual = fs.statSync(path.join(root, artifact.path)).size;
      expect(actual, `${artifact.path} exists`).toBeGreaterThan(0);
      expect(
        artifact.budgetBytes,
        `${artifact.path} budget must leave headroom`,
      ).toBeGreaterThanOrEqual(actual);
      // A recorded measurement that has drifted far from reality makes the warn
      // band meaningless, so it is checked rather than trusted.
      expect(artifact.bytes, `${artifact.path} recorded size`).toBe(actual);
    }
  });

  it("fails an artifact over its budget", () => {
    const { failures } = evaluate(
      {
        ...rules,
        artifacts: [{ path: "a.bundle", budgetBytes: 100, bytes: 90 }],
      },
      measuring({ "a.bundle": 150 }),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("exceeds its");
  });

  // A renamed bundle would otherwise retire its budget in silence — the same
  // shape of hole the gate exists to close.
  it("fails a budgeted artifact that has gone missing", () => {
    const { failures } = evaluate(
      {
        ...rules,
        artifacts: [{ path: "gone.bundle", budgetBytes: 100, bytes: 90 }],
      },
      measuring({}),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("missing");
  });

  it("warns on drift without failing while still under budget", () => {
    const { failures, warnings } = evaluate(
      {
        ...rules,
        warnRatio: 1.05,
        artifacts: [{ path: "a.bundle", budgetBytes: 1000, bytes: 100 }],
      },
      measuring({ "a.bundle": 120 }),
    );
    expect(failures).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("20.0% above");
  });

  it("stays quiet for growth inside the warn band", () => {
    const { failures, warnings } = evaluate(
      {
        ...rules,
        warnRatio: 1.05,
        artifacts: [{ path: "a.bundle", budgetBytes: 1000, bytes: 100 }],
      },
      measuring({ "a.bundle": 103 }),
    );
    expect(failures).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  // The rule that keeps the list from going stale.
  it("fails a large tracked artifact that is neither budgeted nor excluded", () => {
    const found = unbudgeted(
      rules,
      ["packages/example/huge.generated.js"],
      measuring({ "packages/example/huge.generated.js": 500000 }),
    );
    expect(found).toHaveLength(1);
    expect(found[0].path).toBe("packages/example/huge.generated.js");
  });

  it("ignores files below the census threshold and files excluded with a reason", () => {
    expect(
      unbudgeted(
        rules,
        ["packages/example/small.js"],
        measuring({ "packages/example/small.js": 1000 }),
      ),
    ).toHaveLength(0);
    expect(
      unbudgeted(
        rules,
        ["packages/reticulum-ts/dist/index.js"],
        measuring({ "packages/reticulum-ts/dist/index.js": 500000 }),
      ),
    ).toHaveLength(0);
  });

  it("matches exclusion patterns at the right depth", () => {
    expect(
      matchesPattern("packages/*/dist/**", "packages/cli/dist/a/b.js"),
    ).toBe(true);
    expect(matchesPattern("packages/*/dist/**", "packages/cli/src/b.js")).toBe(
      false,
    );
    expect(
      matchesPattern(
        "apps/harness-mobile/worklet/*-wasm.generated.mjs",
        "apps/harness-mobile/worklet/packet-log-wasm.generated.mjs",
      ),
    ).toBe(true);
  });

  it("gives every exclusion a reason", () => {
    expect(rules.excluded.length).toBeGreaterThan(0);
    for (const entry of rules.excluded) {
      expect(entry.pattern).toBeTruthy();
      expect(entry.reason, entry.pattern).toBeTruthy();
    }
  });

  it("formats sizes a person can act on", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024 * 1024 * 11 + 1024)).toContain("MiB");
  });
});
