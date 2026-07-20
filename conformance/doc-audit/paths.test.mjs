import { describe, expect, it } from "vitest";
import { auditRegisterPaths } from "../../scripts/doc-audit/paths.mjs";

describe("doc-audit register paths", () => {
  it("resolves evidence paths in status registers (strict)", () => {
    const findings = auditRegisterPaths(undefined, { strictBasenames: true });
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });
});
