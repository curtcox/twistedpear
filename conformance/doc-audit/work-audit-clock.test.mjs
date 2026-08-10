import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUDIT_INTERVAL_CLOSES,
  AUDIT_INTERVAL_DAYS,
  auditDebt,
} from "../../scripts/work/audit-clock.mjs";
import {
  auditJournalAgainstRegisters,
  auditJournalShape,
} from "../../scripts/work/journal.mjs";
import { loadWork } from "../../scripts/work/lib.mjs";
import { WorkFixture, meta } from "./work-fixture.mjs";
import { NOW, ago } from "./work-audit-fixture.mjs";

describe("audit clock", () => {
  /** @type {WorkFixture} */
  let repo;
  beforeEach(() => {
    repo = new WorkFixture();
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta() });
  });
  afterEach(() => repo.cleanup());

  it("is due when no audit has ever been recorded", () => {
    repo.journal([]);
    expect(auditDebt(repo.root, NOW)).toMatchObject({
      due: true,
      last: null,
      reason: expect.stringMatching(/no audit has ever been recorded/),
    });
  });

  it("is not due shortly after an audit with few closes", () => {
    repo.journal([{ at: ago(1), actor: "t", action: "audit", id: "-" }]);
    expect(auditDebt(repo.root, NOW).due).toBe(false);
  });

  it("comes due again after the interval elapses", () => {
    repo.journal([
      {
        at: ago(AUDIT_INTERVAL_DAYS + 1),
        actor: "t",
        action: "audit",
        id: "-",
      },
    ]);
    const debt = auditDebt(repo.root, NOW);
    expect(debt.due).toBe(true);
    expect(debt.reason).toMatch(/day\(s\) ago/);
  });

  it("comes due again after enough closes, however recent the audit", () => {
    const closes = Array.from({ length: AUDIT_INTERVAL_CLOSES }, (_, i) => ({
      at: ago(1 - i / 100),
      actor: "t",
      action: "close",
      id: "A",
    }));
    repo.journal([
      { at: ago(2), actor: "t", action: "audit", id: "-" },
      ...closes,
    ]);
    const debt = auditDebt(repo.root, NOW);
    expect(debt.closes).toBe(AUDIT_INTERVAL_CLOSES);
    expect(debt.due).toBe(true);
    expect(debt.reason).toMatch(/closed since the last audit/);
  });

  it("counts only the closes that follow the last audit", () => {
    repo.journal([
      { at: ago(30), actor: "t", action: "close", id: "A" },
      { at: ago(10), actor: "t", action: "audit", id: "-" },
      { at: ago(5), actor: "t", action: "close", id: "A" },
    ]);
    expect(auditDebt(repo.root, NOW).closes).toBe(1);
  });
});

describe("journalling an audit", () => {
  /** @type {WorkFixture} */
  let repo;
  afterEach(() => repo.cleanup());

  it("is a recognised action that names no item", () => {
    repo = new WorkFixture();
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta() });
    const commit = repo.commit();
    repo.journal([
      {
        at: ago(9),
        actor: "t",
        action: "epoch",
        id: "-",
        commit,
        grandfathered: [],
      },
      {
        at: ago(1),
        actor: "t",
        action: "audit",
        id: "-",
        findings: 3,
        report: "work/audit-report.json",
      },
    ]);
    const { index } = loadWork(repo.root);
    expect(auditJournalShape(repo.root)).toEqual([]);
    expect(auditJournalAgainstRegisters(index, repo.root)).toEqual([]);
  });
});
