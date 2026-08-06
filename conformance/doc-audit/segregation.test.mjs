import { describe, expect, it } from "vitest";
import {
  auditArchivePlacement,
  auditCounterparts,
  auditLiveDocsHaveNoPlanSections,
  auditPlannedLinksToLive,
} from "../../scripts/doc-audit/segregation.mjs";

const format = (findings) =>
  findings.map((f) => `${f.path}: ${f.message}`).join("\n");

describe("current / planned / historical segregation", () => {
  it("keeps historical documents under archive/ and nothing else there", () => {
    const findings = auditArchivePlacement();
    expect(findings, format(findings)).toEqual([]);
  });

  it("pairs each live document with its plan, in both directions", () => {
    const findings = auditCounterparts();
    expect(findings, format(findings)).toEqual([]);
  });

  it("gives every plan a link to the document describing what ships today", () => {
    const findings = auditPlannedLinksToLive();
    expect(findings, format(findings)).toEqual([]);
  });

  it("keeps planned-work sections out of live documents", () => {
    const findings = auditLiveDocsHaveNoPlanSections();
    expect(findings, format(findings)).toEqual([]);
  });
});
