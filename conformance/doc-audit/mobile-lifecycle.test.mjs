import { describe, expect, it } from "vitest";
import {
  auditForbiddenClaims,
  auditLedgerShape,
  auditLedgerTableMatchesDoc,
  auditRevisitTriggers,
} from "../../scripts/doc-audit/mobile-lifecycle.mjs";

const format = (findings) =>
  findings.map((f) => `${f.path}: ${f.message}`).join("\n");

const failures = (findings) => findings.filter((f) => f.level === "fail");

describe("mobile lifecycle ledger", () => {
  it("classifies every row and gives it evidence and one revisit trigger", () => {
    const findings = auditLedgerShape();
    expect(findings, format(findings)).toEqual([]);
  });

  it("keeps the published table identical to the ledger", () => {
    const findings = auditLedgerTableMatchesDoc();
    expect(findings, format(findings)).toEqual([]);
  });

  it("keeps claims the ledger has recorded as false out of the documentation", () => {
    const findings = auditForbiddenClaims();
    expect(findings, format(findings)).toEqual([]);
  });

  // A fired trigger is a row waiting to be reconsidered, which is the point of the
  // ledger: it warns while the decision is fresh and fails once it has been ignored
  // for a quarter.
  it("surfaces rows whose revisit trigger has fired", () => {
    const findings = auditRevisitTriggers();
    const overdue = failures(findings);
    expect(overdue, JSON.stringify(overdue, null, 2)).toEqual([]);
    for (const warn of findings.filter((f) => f.level === "warn")) {
      console.warn(
        `mobile lifecycle revisit due: ${warn.path} — ${warn.message}`,
      );
    }
  });
});
