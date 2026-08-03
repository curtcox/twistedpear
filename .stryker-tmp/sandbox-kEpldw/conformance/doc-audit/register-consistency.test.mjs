// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  auditRegisterConsistency,
  auditTodoMarkers
} from "../../scripts/doc-audit/register.mjs";

describe("doc-audit register consistency", () => {
  it("has no conflicting ID status across registers", () => {
    const { conflicts } = auditRegisterConsistency();
    expect(conflicts, conflicts.join("\n")).toEqual([]);
  });

  it("aligns vitest register todos with done/open rows", () => {
    const problems = auditTodoMarkers().filter((p) => !p.startsWith("warn:"));
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
