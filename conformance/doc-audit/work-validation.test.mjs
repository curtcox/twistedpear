import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  validateMetadataShape,
  validateResourcesShape,
} from "../../scripts/work/validate.mjs";
import {
  auditCoverage,
  auditPrerequisites,
  auditVerifyCommands,
} from "../../scripts/work/check.mjs";
import { WorkFixture, meta } from "./work-fixture.mjs";

describe("metadata schema", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
    repo.registers({ A: { status: "open" } });
  });
  afterEach(() => repo.cleanup());

  /** @param {any} entry @returns {string} */
  const problemsFor = (entry) => {
    repo.metadata({ A: entry });
    return validateMetadataShape(repo.root).join("\n");
  };

  it("accepts a well-formed entry", () => {
    expect(problemsFor(meta())).toBe("");
  });

  it("rejects an unknown class", () => {
    expect(problemsFor(meta({ type: "urgent" }))).toContain(
      "type must be one of",
    );
  });

  it("rejects an unknown field", () => {
    expect(problemsFor({ ...meta(), priority: 1 })).toContain(
      'unknown field "priority"',
    );
  });

  it("accepts unattended: true and rejects any other value", () => {
    expect(problemsFor(meta({ unattended: true }))).toBe("");
    expect(problemsFor(meta({ unattended: false }))).toContain(
      "unattended must be true when present",
    );
  });

  it("rejects a missing required field", () => {
    const entry = meta();
    delete entry.verify;
    expect(problemsFor(entry)).toContain('missing "verify"');
  });

  it("rejects an empty verify command", () => {
    expect(problemsFor(meta({ verify: "" }))).toContain(
      "verify must not be empty",
    );
  });

  it("rejects a malformed date", () => {
    expect(problemsFor(meta({ added: "August 2026" }))).toContain(
      "added must be YYYY-MM-DD",
    );
  });

  it("rejects a prerequisite that is neither an id nor a res: token", () => {
    expect(problemsFor(meta({ requires: ["lower-case"] }))).toContain(
      "is neither an item id nor a res:token",
    );
  });

  it("rejects an item that requires itself", () => {
    expect(problemsFor(meta({ requires: ["A"] }))).toContain(
      "item requires itself",
    );
  });

  it("rejects a completed item with no evidence", () => {
    expect(problemsFor(meta({ completed: "2026-01-01" }))).toContain(
      "completed items must cite evidence",
    );
  });

  it("rejects a malformed id", () => {
    repo.registers({ "lower-id": { status: "open" } });
    repo.metadata({ "lower-id": meta() });
    expect(validateMetadataShape(repo.root).join("\n")).toContain(
      "id must be upper-case",
    );
  });
});

describe("resources schema", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
  });
  afterEach(() => repo.cleanup());

  it("requires a boolean availability", () => {
    repo.resources({ kit: { note: "no flag" } });
    expect(validateResourcesShape(repo.root).join("\n")).toContain(
      "available must be a boolean",
    );
  });

  it("rejects a malformed token", () => {
    repo.resources({ Kit_One: { available: true } });
    expect(validateResourcesShape(repo.root).join("\n")).toContain(
      "token must be lower-case",
    );
  });
});

describe("registry consistency", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
  });
  afterEach(() => repo.cleanup());

  it("reports a register row with no metadata", () => {
    repo.registers({ A: { status: "open" } });
    repo.metadata({});
    expect(auditCoverage(repo.root).join("\n")).toContain("no entry in");
  });

  it("reports metadata with no register row", () => {
    repo.registers({});
    repo.metadata({ GHOST: meta() });
    expect(auditCoverage(repo.root).join("\n")).toContain(
      "no matching register row",
    );
  });

  it("reports a prerequisite that does not exist", () => {
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta({ requires: ["MISSING"] }) });
    expect(auditPrerequisites(repo.root).join("\n")).toContain(
      "unknown item MISSING",
    );
  });

  it("reports an undeclared resource token", () => {
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta({ requires: ["res:ghost-kit"] }) });
    expect(auditPrerequisites(repo.root).join("\n")).toContain(
      "undeclared resource ghost-kit",
    );
  });

  it("reports a prerequisite cycle", () => {
    repo.registers({ A: { status: "open" }, B: { status: "open" } });
    repo.metadata({
      A: meta({ requires: ["B"] }),
      B: meta({ requires: ["A"] }),
    });
    expect(auditPrerequisites(repo.root).join("\n")).toContain(
      "prerequisite cycle",
    );
  });

  it("reports a done item whose prerequisite is unfinished", () => {
    repo.registers({ A: { status: "done" }, B: { status: "open" } });
    repo.metadata({
      A: meta({ requires: ["B"], completed: "2026-01-01", evidence: ["work"] }),
      B: meta(),
    });
    expect(auditPrerequisites(repo.root).join("\n")).toContain(
      "done but prerequisite B is not",
    );
  });

  it("reports a verify command naming a script that does not exist", () => {
    repo.write("package.json", '{"scripts":{"test":"vitest"}}\n');
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta({ verify: "npm run does-not-exist" }) });
    expect(auditVerifyCommands(repo.root).join("\n")).toContain(
      'missing script "does-not-exist"',
    );
  });

  it("reports a runbook pointing at a file that does not exist", () => {
    repo.write("package.json", '{"scripts":{}}\n');
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta({ verify: "runbook:NOPE.md#x" }) });
    expect(auditVerifyCommands(repo.root).join("\n")).toContain(
      "runbook NOPE.md does not exist",
    );
  });
});
