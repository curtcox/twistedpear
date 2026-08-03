// @ts-nocheck
import { describe, expect, it } from "vitest";
import { auditRegisterScripts } from "../../scripts/doc-audit/scripts.mjs";

describe("doc-audit register scripts", () => {
  it("resolves npm run scripts cited in status registers", () => {
    const findings = auditRegisterScripts();
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });
});
