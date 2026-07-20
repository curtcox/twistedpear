import { describe, expect, it } from "vitest";
import {
  auditLifecycleHeaders,
  auditStaleness
} from "../../scripts/doc-audit/staleness.mjs";

describe("doc-audit lifecycle headers", () => {
  it("requires tp-doc on tracked markdown and keeps historical docs under archive/", () => {
    const { missing, invalid, historicalOutsideArchive } = auditLifecycleHeaders();
    expect(missing, `missing tp-doc: ${missing.join(", ")}`).toEqual([]);
    expect(invalid, JSON.stringify(invalid, null, 2)).toEqual([]);
    expect(historicalOutsideArchive).toEqual([]);
  });

  it("warns or fails when live registers are stale vs git", () => {
    const findings = auditStaleness();
    const failures = findings.filter((f) => f.level === "fail");
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    for (const warn of findings.filter((f) => f.level === "warn")) {
      console.warn(`doc staleness: ${warn.path} — ${warn.message}`);
    }
  });
});
