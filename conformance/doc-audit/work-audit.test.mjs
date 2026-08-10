import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditRegistry } from "../../scripts/work/audit-registry.mjs";
import { auditClosedWork } from "../../scripts/work/audit-closed.mjs";
import { auditOutputs } from "../../scripts/work/audit-outputs.mjs";
import { auditDocs } from "../../scripts/work/audit-docs.mjs";
import { runAudit } from "../../scripts/work/audit.mjs";
import { resetCommitDateCache } from "../../scripts/work/audit-lib.mjs";
import { WorkFixture, meta } from "./work-fixture.mjs";
import { NOW, ago, checks, dayAgo, only } from "./work-audit-fixture.mjs";

describe("registry health audit", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
    repo.registers({
      STALE: { status: "open" },
      FRESH: { status: "open" },
      TOUCHED: { status: "open" },
      PARKED: { status: "open" },
      WEAK: { status: "open" },
      BOOKKEEPING: { status: "open" },
      SHUT: { status: "done" },
    });
    // `meta()` verifies with `true`, which the audit rightly calls a non-check;
    // these fixtures carry a real command so each case tests one thing.
    const verify = "npm test";
    repo.metadata({
      STALE: meta({ verify, added: dayAgo(200) }),
      FRESH: meta({ verify, added: dayAgo(3) }),
      TOUCHED: meta({ verify, added: dayAgo(200) }),
      PARKED: meta({ verify, added: dayAgo(200), requires: ["res:kit"] }),
      WEAK: meta({
        type: "bug",
        verify: "npm run work:check",
        added: dayAgo(3),
      }),
      BOOKKEEPING: meta({
        type: "docs",
        verify: "npm run work:check",
        added: dayAgo(3),
      }),
      SHUT: meta({
        verify,
        added: dayAgo(300),
        completed: dayAgo(1),
        evidence: ["work"],
      }),
    });
    repo.resources({
      kit: { available: false, note: "an RNode pair" },
      spare: { available: true },
    });
    repo.journal([
      { at: ago(2), actor: "t", action: "retype", id: "TOUCHED", reason: "x" },
    ]);
  });
  afterEach(() => repo.cleanup());

  it("reports an unblocked item nobody has touched, once", () => {
    const findings = only(auditRegistry(repo.root, NOW), "stale-open");
    expect(findings).toHaveLength(1);
    expect(findings[0].summary).toMatch(/^STALE has been unblocked/);
  });

  it("does not report a done item, a fresh one, or one with journal activity", () => {
    const summaries = only(auditRegistry(repo.root, NOW), "stale-open")
      .map((finding) => finding.summary)
      .join(" ");
    expect(summaries).not.toMatch(/FRESH|TOUCHED|SHUT/);
  });

  it("reports work parked behind a resource nobody is acquiring", () => {
    const findings = only(auditRegistry(repo.root, NOW), "parked");
    expect(findings).toHaveLength(1);
    expect(findings[0].summary).toMatch(/PARKED has waited .* res:kit/);
    expect(findings[0].ask).toMatch(/deferred/);
  });

  it("reports a verification that only checks the registry", () => {
    const findings = only(auditRegistry(repo.root, NOW), "weak-verify");
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].summary).toMatch(/^WEAK \(bug\)/);
  });

  it("accepts a registry-level verification for a docs item", () => {
    const summaries = only(auditRegistry(repo.root, NOW), "weak-verify")
      .map((finding) => finding.summary)
      .join(" ");
    expect(summaries).not.toMatch(/BOOKKEEPING/);
  });

  it("reports a declared resource that nothing requires", () => {
    const findings = only(auditRegistry(repo.root, NOW), "orphan-resource");
    expect(findings.map((finding) => finding.where)).toEqual([
      "work/resources.json spare",
    ]);
  });

  it("reports one verification shared by several open items", () => {
    const shared = {};
    const rows = {};
    for (const id of ["S1", "S2", "S3", "S4"]) {
      rows[id] = { status: "open" };
      shared[id] = meta({ verify: "npm test", added: dayAgo(1) });
    }
    repo.registers(rows);
    repo.metadata(shared);
    repo.resources({});
    const findings = only(auditRegistry(repo.root, NOW), "shared-verify");
    expect(findings).toHaveLength(1);
    expect(findings[0].summary).toMatch(/S1, S2, S3, S4/);
  });
});

describe("closed-work review", () => {
  /** @type {WorkFixture} */
  let repo;

  /** @param {object[]} events */
  const closes = (events) => {
    repo.journal(events);
    return auditClosedWork(repo.root, NOW);
  };

  beforeEach(() => {
    repo = new WorkFixture();
    repo.registers({ SHUT: { status: "done" } });
    repo.metadata({
      SHUT: meta({ type: "bug", completed: dayAgo(10), evidence: ["work"] }),
    });
    mkdirSync(join(repo.root, "release/evidence-logs"), { recursive: true });
    writeFileSync(join(repo.root, "release/evidence-logs/run.log"), "ok\n");
  });
  afterEach(() => {
    repo.cleanup();
    resetCommitDateCache();
  });

  /** @param {object} extra */
  const close = (extra) => ({
    at: ago(10),
    actor: "t",
    action: "close",
    id: "SHUT",
    type: "bug",
    verify: "npm test",
    verified: true,
    verifiedFrom: "run",
    durationMs: 60000,
    ...extra,
  });

  it("reports a close that ran no verification", () => {
    const findings = closes([
      close({ verified: false, verifiedFrom: "none", reason: "ran by hand" }),
    ]);
    expect(checks(findings)).toContain("unverified-close");
    expect(only(findings, "unverified-close")[0].summary).toMatch(
      /ran by hand/,
    );
  });

  it("re-hashes the evidence log and reports a record that no longer matches", () => {
    const digest = `sha256:${createHash("sha256").update("something else").digest("hex")}`;
    const findings = closes([
      close({ log: "release/evidence-logs/run.log", digest }),
    ]);
    expect(only(findings, "digest-mismatch")).toHaveLength(1);
  });

  it("accepts a log that still hashes to the recorded digest", () => {
    const digest = `sha256:${createHash("sha256").update("ok\n").digest("hex")}`;
    const findings = closes([
      close({ log: "release/evidence-logs/run.log", digest }),
    ]);
    expect(checks(findings)).toEqual([]);
  });

  it("reports a cited evidence log that has left the tree", () => {
    const findings = closes([
      close({ log: "release/evidence-logs/gone.log", digest: "sha256:x" }),
    ]);
    expect(only(findings, "missing-evidence-log")).toHaveLength(1);
  });

  it("reports a load-bearing item closed on an instant verification", () => {
    const findings = closes([close({ durationMs: 40 })]);
    expect(only(findings, "instant-verification")).toHaveLength(1);
  });

  it("leaves an instant verification alone for lighter classes", () => {
    repo.metadata({
      SHUT: meta({ type: "docs", completed: dayAgo(10), evidence: ["work"] }),
    });
    const findings = closes([close({ type: "docs", durationMs: 40 })]);
    expect(checks(findings)).toEqual([]);
  });

  it("reports evidence that changed after the close", () => {
    repo.write("proof.txt", "before\n");
    repo.metadata({
      SHUT: meta({
        type: "bug",
        completed: dayAgo(10),
        evidence: ["proof.txt"],
      }),
    });
    repo.commit();
    const now = Date.now();
    repo.journal([{ ...close({}), at: ago(30, now) }]);
    const findings = auditClosedWork(repo.root, now);
    expect(only(findings, "evidence-drift")).toHaveLength(1);
  });
});

describe("generated-output audit", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta() });
    ratchet(repo, "lint-ratchet.json", 30);
    ratchet(repo, "typed-lint-ratchet.json", 0);
    ratchet(repo, "complexity-ratchet.json", 0);
  });
  afterEach(() => {
    repo.cleanup();
    resetCommitDateCache();
  });

  it("reports a ratchet that grew since the last audit", () => {
    const previous = { ratchets: { "lint-ratchet.json": 4 } };
    const findings = only(
      auditOutputs(repo.root, { previous }, NOW),
      "ratchet-growth",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].summary).toMatch(/grew from 4 to 30/);
  });

  it("says nothing about a ratchet that shrank", () => {
    const previous = { ratchets: { "lint-ratchet.json": 90 } };
    const findings = auditOutputs(repo.root, { previous }, NOW);
    expect(checks(findings)).not.toContain("ratchet-growth");
  });

  it("proposes a work item for untracked baselined debt", () => {
    const findings = only(auditOutputs(repo.root, {}, NOW), "untracked-debt");
    expect(findings).toHaveLength(1);
    expect(findings[0].proposal).toMatchObject({
      id: "QL-LINT-NO-UNUSED-VARS",
      type: "quality",
    });
  });

  it("warns before an advisory exception expires, not after", () => {
    repo.write(
      "audit-allowlist.json",
      JSON.stringify({
        version: 1,
        entries: [{ id: "vite", expires: dayAgo(-10), reason: "pending" }],
      }),
    );
    const findings = only(auditOutputs(repo.root, {}, NOW), "advisory-expiry");
    expect(findings).toHaveLength(1);
    expect(findings[0].summary).toMatch(/expires in 10 day\(s\)/);
    expect(findings[0].proposal.id).toBe("SEC-VITE");
  });
});

describe("report assembly", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
    repo.registers({ WEAK: { status: "open" }, STALE: { status: "open" } });
    repo.metadata({
      WEAK: meta({ type: "bug", verify: "true", added: dayAgo(1) }),
      STALE: meta({ verify: "npm test", added: dayAgo(200) }),
    });
    repo.resources({});
    repo.journal([]);
    repo.commit();
  });
  afterEach(() => repo.cleanup());

  it("orders findings by severity and counts them", () => {
    const report = runAudit({ family: ["registry"] }, repo.root, NOW);
    expect(report.findings[0].severity).toBe("high");
    expect(report.counts).toMatchObject({ total: 2, high: 1, medium: 1 });
  });

  it("filters by minimum severity", () => {
    const report = runAudit(
      { family: ["registry"], severity: "high" },
      repo.root,
      NOW,
    );
    expect(checks(report.findings)).toEqual(["weak-verify"]);
  });

  it("carries a ratchet snapshot forward for the next run", () => {
    ratchet(repo, "lint-ratchet.json", 7);
    const report = runAudit({ family: ["registry"] }, repo.root, NOW);
    expect(report.ratchets).toEqual({ "lint-ratchet.json": 7 });
  });

  it("proposes without changing any register row or metadata", () => {
    const before = repo.git("status", "--porcelain").stdout;
    runAudit({ family: ["registry", "docs"] }, repo.root, NOW);
    expect(repo.git("status", "--porcelain").stdout).toBe(before);
  });
});
describe("document drift audit", () => {
  it("reports a plan whose live counterpart has moved on", () => {
    const repo = new WorkFixture();
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta() });
    mkdirSync(join(repo.root, "docs"), { recursive: true });
    repo.write(
      "docs/topic.md",
      tpDoc("live", "2026-01-01", "docs/topic-plan.md"),
    );
    repo.write(
      "docs/topic-plan.md",
      tpDoc("planned", "2020-01-01", "docs/topic.md"),
    );
    repo.commit();
    resetCommitDateCache();

    const findings = only(auditDocs(repo.root, NOW), "overtaken-plan");
    expect(findings).toHaveLength(1);
    expect(findings[0].where).toBe("docs/topic-plan.md");
    repo.cleanup();
    resetCommitDateCache();
  });
});

/**
 * @param {string} lifecycle @param {string} audited @param {string} counterpart
 * @returns {string}
 */
function tpDoc(lifecycle, audited, counterpart) {
  return `# Doc\n\n<!-- tp-doc\nlifecycle: ${lifecycle}\naudited: ${audited}\nregister: none\ncounterpart: ${counterpart}\n-->\n`;
}

/**
 * @param {WorkFixture} repo
 * @param {string} file
 * @param {number} count entries, all of one rule, in the ESLint ratchet format
 */
function ratchet(repo, file, count) {
  const entries = Array.from(
    { length: count },
    (_, i) => `src/f${i}.ts:no-unused-vars:unused:occurrence-1`,
  );
  repo.write(file, JSON.stringify({ version: 1, entries }));
}
