import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collect,
  gateStatus,
  summarize,
  waiverState,
} from "../../scripts/checks/status.mjs";
import {
  UNVERIFIED_ITEM_ID,
  derivedGateItems,
  gateItemId,
  ranked,
} from "../../scripts/work/lib.mjs";
import { merge } from "../../scripts/checks/import.mjs";
import { auditGates } from "../../scripts/work/audit-gates.mjs";
import { validateMetadataShape } from "../../scripts/work/validate.mjs";

const DAY = 86_400_000;

/**
 * @param {Record<string, any>} gates
 * @param {{ digest?: string; generatedAt?: string; waivers?: any[] }} [options]
 */
function fixture(gates, options = {}) {
  const root = mkdtempSync(join(tmpdir(), "tp-green-gate-"));
  writeFileSync(
    join(root, "checks.json"),
    JSON.stringify({
      version: 1,
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      commit: "abc123",
      digest: options.digest ?? "digest-1",
      gates,
    }),
  );
  if (options.waivers) {
    writeFileSync(
      join(root, "checks-waivers.json"),
      JSON.stringify({ version: 1, waivers: options.waivers }),
    );
  }
  return root;
}

const RED = {
  title: "Coverage ratchet",
  command: "npm run coverage:check",
  ok: false,
  at: "2026-08-10T00:00:00.000Z",
  commit: "abc123",
  detail: "packages/lxmf-ts functions: 72.5 < floor 73.33",
  since: "2026-08-01",
};

const GREEN = {
  title: "Repository lint coverage",
  command: "npm run lint:all",
  ok: true,
  at: "2026-08-10T00:00:00.000Z",
  commit: "abc123",
};

describe("red gates become work items", () => {
  it("derives a broken-gate item for every red gate", () => {
    const items = derivedGateItems(
      fixture({ coverage: RED, "lint-all": GREEN }),
    );
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("GATE-COVERAGE");
    expect(items[0].type).toBe("broken-gate");
    expect(items[0].verify).toBe("npm run coverage:check");
    expect(items[0].title).toContain("72.5 < floor 73.33");
    // The item dates from when the gate went red, not from when it was noticed,
    // so age-based ranking and the audit's staleness clock agree.
    expect(items[0].added).toBe("2026-08-01");
  });

  it("derives nothing while every gate is green", () => {
    expect(derivedGateItems(fixture({ "lint-all": GREEN }))).toEqual([]);
  });

  it("outranks the release gates it would otherwise sit behind", () => {
    const derived = derivedGateItems(fixture({ coverage: RED }));
    const order = ranked([
      {
        id: "RQ-DESKTOP",
        status: "open",
        file: "STATUS-SOFTWARE.md",
        line: 32,
        title: "Desktop host soak",
        type: "release-gate",
        requires: [],
        verify: "npm run test:desktop-soak",
        added: "2026-07-31",
        blockers: [],
        unblocks: 2,
      },
      ...derived,
    ]).map((item) => item.id);
    expect(order[0]).toBe("GATE-COVERAGE");
  });

  it("cannot be shadowed by a hand-filed metadata entry", () => {
    const root = mkdtempSync(join(tmpdir(), "tp-green-gate-meta-"));
    mkdirSync(join(root, "work"), { recursive: true });
    writeFileSync(
      join(root, "work/metadata.json"),
      JSON.stringify({
        version: 1,
        items: {
          "GATE-COVERAGE": {
            type: "docs",
            requires: [],
            verify: "true",
            added: "2026-08-10",
          },
        },
      }),
    );
    const problems = validateMetadataShape(root);
    expect(problems.join("\n")).toMatch(/derived from checks\.json/);
  });

  it("refuses to add either half of the derived namespace", async () => {
    const { addWork } = await import("../../scripts/work/add.mjs");
    const root = fixture({ coverage: RED });
    expect(() =>
      addWork(
        { id: "GATE-COVERAGE", type: "bug", title: "x", verify: "true" },
        root,
      ),
    ).toThrow(/derived from checks\.json/);
    expect(() =>
      addWork(
        { id: "BUG-X", type: "broken-gate", title: "x", verify: "true" },
        root,
      ),
    ).toThrow(/cannot be assigned by hand/);
  });

  it("rejects broken-gate as a hand-assignable type", () => {
    const root = mkdtempSync(join(tmpdir(), "tp-green-gate-type-"));
    mkdirSync(join(root, "work"), { recursive: true });
    writeFileSync(
      join(root, "work/metadata.json"),
      JSON.stringify({
        version: 1,
        items: {
          "BUG-SOMETHING": {
            type: "broken-gate",
            requires: [],
            verify: "true",
            added: "2026-08-10",
          },
        },
      }),
    );
    expect(validateMetadataShape(root).join("\n")).toMatch(
      /not a type work:add may assign/,
    );
  });
});

describe("waivers", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");

  it("treats a future expiry as an active exemption", () => {
    const waivers = [
      {
        gate: "audit-policy",
        reason: "upstream advisory has no fixed release yet",
        recorded: "2026-08-01",
        expires: "2026-08-20",
      },
    ];
    expect(waiverState(waivers, "audit-policy", now).state).toBe("active");
  });

  it("treats a lapsed waiver as no waiver at all", () => {
    const waivers = [
      {
        gate: "audit-policy",
        reason: "upstream advisory has no fixed release yet",
        recorded: "2026-07-01",
        expires: "2026-07-15",
      },
    ];
    expect(waiverState(waivers, "audit-policy", now).state).toBe("expired");
  });

  it("keeps a waived gate out of the work queue but still red", () => {
    const root = fixture(
      { coverage: RED },
      {
        waivers: [
          {
            gate: "coverage",
            reason: "floor is being re-baselined under DOC-123",
            recorded: "2026-08-01",
            expires: "2026-08-20",
          },
        ],
      },
    );
    expect(derivedGateItems(root, now)).toEqual([]);
    const state = gateStatus(root, { now });
    expect(state.red).toHaveLength(1);
    expect(state.blocking).toEqual([]);
    expect(state.waived[0].id).toBe("coverage");
  });

  it("puts an expired waiver's gate back at the top of the queue", () => {
    const root = fixture(
      { coverage: RED },
      {
        waivers: [
          {
            gate: "coverage",
            reason: "floor is being re-baselined under DOC-123",
            recorded: "2026-07-01",
            expires: "2026-07-15",
          },
        ],
      },
    );
    const items = derivedGateItems(root, now);
    expect(items).toHaveLength(1);
    expect(items[0].notes).toMatch(/waiver expired 2026-07-15/);
  });
});

describe("recording gate results", () => {
  it("keeps the day a gate first went red across re-runs", () => {
    const root = fixture({ coverage: { ...RED, since: "2026-08-01" } });
    mkdirSync(join(root, "artifacts/checks"), { recursive: true });
    writeFileSync(
      join(root, "artifacts/checks/coverage.json"),
      JSON.stringify({
        id: "coverage",
        title: "Coverage ratchet",
        command: "npm run coverage:check",
        ok: false,
        commit: "def456",
        finishedAt: "2026-08-10T00:00:00.000Z",
      }),
    );
    const status = collect(root, {
      digest: "digest-2",
      commit: "def456",
      now: new Date("2026-08-10T00:00:00.000Z"),
    });
    expect(status.gates.coverage.since).toBe("2026-08-01");
  });

  it("records a gate that has never run as red rather than assuming green", () => {
    const root = fixture({});
    const status = collect(root, {
      digest: "digest-1",
      commit: "abc123",
      now: new Date("2026-08-10T00:00:00.000Z"),
    });
    const values = Object.values(status.gates);
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((gate) => gate.ok === false)).toBe(true);
    expect(values[0].detail).toMatch(/never produced a result/);
  });

  it("carries the failing lines into the committed record", () => {
    expect(
      summarize(
        "$ npm run coverage:check\nexit: 1\n\nfunctions: 72.5 < 73.33\n",
      ),
    ).toBe("functions: 72.5 < 73.33");
  });

  it("keeps the verdict rather than the reporter's decoration", () => {
    const log = [
      "$ npm run coverage:check",
      "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
      "packages/lxmf-ts functions: 72.5 < floor 73.33",
      '     34|       "release-gate",',
      '     35|       "bug",',
      "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯",
      "exit: 1",
    ].join("\n");
    expect(summarize(log)).toBe(
      "packages/lxmf-ts functions: 72.5 < floor 73.33",
    );
  });

  it("drops a reporter banner that is mostly rule", () => {
    const log = [
      "⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯",
      "FAIL  conformance/x.test.mjs > does the thing",
    ].join("\n");
    expect(summarize(log)).toBe(
      "FAIL  conformance/x.test.mjs > does the thing",
    );
  });

  it("will not claim an artifact from an older commit was measured here", () => {
    // artifacts/ is never cleared, so a gate that could not run on this machine
    // leaves its last result lying there. Re-reading it must not launder a
    // three-commits-ago pass into evidence for the current tree.
    const root = fixture({});
    mkdirSync(join(root, "artifacts/checks"), { recursive: true });
    writeFileSync(
      join(root, "artifacts/checks/coverage.json"),
      JSON.stringify({ id: "coverage", ok: true, commit: "old-commit" }),
    );
    writeFileSync(
      join(root, "artifacts/checks/lint.json"),
      JSON.stringify({ id: "lint", ok: true, commit: "this-commit" }),
    );
    const status = collect(root, {
      digest: "digest-1",
      treeDigest: "tree-1",
      commit: "this-commit",
    });
    expect(status.gates.lint.measuredOn).toBe("tree-1");
    expect(status.gates.coverage.measuredOn).toBeUndefined();
    expect(
      gateStatus(root, { digest: "digest-1", treeDigest: "tree-1" }).stale,
    ).toEqual([]);
  });

  it("reports a carried-forward gate as having no result for this tree", () => {
    const root = fixture(
      {
        coverage: { ...GREEN, measuredOn: "an-older-tree" },
        "lint-all": { ...GREEN, measuredOn: "tree-1" },
      },
      { digest: "digest-1" },
    );
    const state = gateStatus(root, {
      digest: "digest-1",
      treeDigest: "tree-1",
    });
    expect(state.stale.map((gate) => gate.id)).toEqual(["coverage"]);
  });

  it("drops nightly-tier artifacts rather than letting them gate a soak", () => {
    const root = fixture({});
    mkdirSync(join(root, "artifacts/checks"), { recursive: true });
    writeFileSync(
      join(root, "artifacts/checks/mutation.json"),
      JSON.stringify({ id: "mutation", ok: false, title: "Mutation" }),
    );
    const status = collect(root, { digest: "digest-1", commit: "abc123" });
    expect(status.gates.mutation).toBeUndefined();
  });
});

describe("freshness", () => {
  it("accepts a record measured on the same application digest", () => {
    const state = gateStatus(fixture({ "lint-all": GREEN }), {
      digest: "digest-1",
    });
    expect(state.fresh).toBe(true);
    expect(state.staleReason).toBe("");
  });

  it("rejects a record measured on a different tree", () => {
    const state = gateStatus(fixture({ "lint-all": GREEN }), {
      digest: "digest-2",
    });
    expect(state.fresh).toBe(false);
    expect(state.staleReason).toMatch(/not the current digest-2/);
  });

  it("rejects a tree with no recorded results at all", () => {
    const root = mkdtempSync(join(tmpdir(), "tp-green-gate-empty-"));
    expect(gateStatus(root, { digest: "digest-1" }).staleReason).toMatch(
      /no gate results/,
    );
  });
});

describe("the audit's green-gate family", () => {
  const now = Date.parse("2026-08-10T12:00:00.000Z");

  it("escalates a gate that has been red for days", () => {
    const findings = auditGates(fixture({ coverage: RED }), now);
    const long = findings.find((finding) => finding.check === "long-red");
    expect(long?.severity).toBe("high");
    expect(long?.where).toBe(gateItemId("coverage"));
    expect(long?.ask).toMatch(/blocked the queue/);
  });

  it("reports a fresh failure without escalating it", () => {
    const findings = auditGates(
      fixture({ coverage: { ...RED, since: "2026-08-10" } }),
      now,
    );
    expect(findings.find((finding) => finding.check === "red")?.severity).toBe(
      "medium",
    );
  });

  it("flags a waiver that is about to lapse", () => {
    const root = fixture(
      { coverage: RED },
      {
        waivers: [
          {
            gate: "coverage",
            reason: "floor is being re-baselined under DOC-123",
            recorded: "2026-08-01",
            expires: new Date(now + 3 * DAY).toISOString().slice(0, 10),
          },
        ],
      },
    );
    expect(
      auditGates(root, now).some(
        (finding) => finding.check === "waiver-expiring",
      ),
    ).toBe(true);
  });

  it("flags an expired waiver over a still-red gate", () => {
    const root = fixture(
      { coverage: RED },
      {
        waivers: [
          {
            gate: "coverage",
            reason: "floor is being re-baselined under DOC-123",
            recorded: "2026-07-01",
            expires: "2026-07-15",
          },
        ],
      },
    );
    const expired = auditGates(root, now).find(
      (finding) => finding.check === "waiver-expired",
    );
    expect(expired?.severity).toBe("high");
  });

  it("says so when the gates have never been recorded", () => {
    const root = mkdtempSync(join(tmpdir(), "tp-green-gate-none-"));
    expect(
      auditGates(root, now).some((finding) => finding.check === "no-record"),
    ).toBe(true);
  });

  it("asks for a re-run when the record has gone stale", () => {
    const root = fixture(
      { "lint-all": GREEN },
      { generatedAt: new Date(now - 30 * DAY).toISOString() },
    );
    expect(
      auditGates(root, now).some((finding) => finding.check === "stale-record"),
    ).toBe(true);
  });

  it("does not wait two weeks to report a record from another commit", () => {
    const findings = auditGates(fixture({ "lint-all": GREEN }), now, "def456");
    const unverified = findings.find(
      (finding) => finding.check === "unverified-record",
    );
    expect(unverified?.summary).toMatch(/not at HEAD/);
    expect(unverified?.ask).toMatch(/checks:status:import/);
  });
});

describe("a recorded green from another commit is not evidence", () => {
  it("derives one item naming the commit the record actually describes", () => {
    const items = derivedGateItems(
      fixture({ "lint-all": GREEN }),
      new Date(),
      "def456789abc",
    );
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(UNVERIFIED_ITEM_ID);
    expect(items[0].type).toBe("broken-gate");
    expect(items[0].verify).toBe("npm run checks:status");
    expect(items[0].title).toContain("abc123");
    expect(items[0].title).toContain("def456789abc");
    // Derived, so `work:done` and `work:retype` refuse it like any GATE-* item:
    // the only way to clear it is to measure this commit.
    expect(items[0].derived).toBe(true);
  });

  it("stays quiet when the record was measured at this commit", () => {
    expect(
      derivedGateItems(fixture({ "lint-all": GREEN }), new Date(), "abc123"),
    ).toEqual([]);
  });

  it("stays quiet when HEAD cannot be resolved", () => {
    // A tarball checkout knows less than a git one; it does not therefore know
    // the record is wrong.
    expect(
      derivedGateItems(fixture({ "lint-all": GREEN }), new Date(), ""),
    ).toEqual([]);
  });

  it("does not restate a gate that is already red on its own account", () => {
    const items = derivedGateItems(
      fixture({ coverage: RED, "lint-all": GREEN }),
      new Date(),
      "def456",
    );
    expect(items.map((item) => item.id)).toEqual([
      gateItemId("coverage"),
      UNVERIFIED_ITEM_ID,
    ]);
    expect(items[1].title).toContain("1 gate");
  });

  it("ranks behind a gate that is known red, not ahead of it", () => {
    const items = ranked(
      derivedGateItems(
        fixture(
          { coverage: RED, "lint-all": GREEN },
          { generatedAt: "2026-08-09T00:00:00.000Z" },
        ),
        new Date(),
        "def456",
      ),
    );
    expect(items[0].id).toBe(gateItemId("coverage"));
    expect(items[1].id).toBe(UNVERIFIED_ITEM_ID);
  });
});

describe("importing what CI already measured", () => {
  const summary = {
    branchSha: "ci-commit",
    jobs: [
      {
        id: "coverage",
        title: "Coverage ratchet",
        ok: false,
        finishedAt: "2026-08-14T15:51:32.389Z",
        metrics: [
          { label: "Result", value: "fail" },
          { label: "statements", value: "76.84%" },
        ],
      },
      { id: "lint-all", title: "Repository lint coverage", ok: true },
      { id: "not-a-gate", title: "Something else", ok: false },
    ],
  };

  it("imports a CI failure as red, with the detail the summary carried", () => {
    const result = merge(summary, { gates: {} });
    expect(result.red).toEqual(["coverage"]);
    expect(result.gates.coverage.ok).toBe(false);
    expect(result.gates.coverage.detail).toContain("statements: 76.84%");
    expect(result.gates.coverage.commit).toBe("ci-commit");
  });

  it("keeps the day a gate first went red rather than restarting the clock", () => {
    const result = merge(summary, {
      gates: { coverage: { ...RED, since: "2026-08-01" } },
    });
    expect(result.gates.coverage.since).toBe("2026-08-01");
  });

  it("imports a CI pass without claiming it measured this tree", () => {
    const result = merge(summary, { gates: {} });
    expect(result.gates["lint-all"].ok).toBe(true);
    // No measuredOn: the run's tree digest is not in the summary, so the
    // unverified rule is what decides whether this pass still applies.
    expect(result.gates["lint-all"].measuredOn).toBeUndefined();
  });

  it("ignores a job that is not a registered gate", () => {
    const result = merge(summary, { gates: {} });
    expect(result.gates["not-a-gate"]).toBeUndefined();
    expect(result.ignored).toContain("not-a-gate");
  });

  it("refuses to import a skipped job as a pass", () => {
    const result = merge(
      { branchSha: "ci", jobs: [{ id: "coverage", ok: true, skipped: true }] },
      { gates: {} },
    );
    expect(result.gates.coverage).toBeUndefined();
    expect(result.imported).toEqual([]);
  });
});
