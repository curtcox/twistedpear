import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeWork } from "../../scripts/work/done.mjs";
import { readJournal } from "../../scripts/work/journal.mjs";
import { WorkFixture, meta } from "./work-fixture.mjs";

describe("work:done refuses to close on insufficient evidence", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
    repo.registers({
      OPEN: { status: "open" },
      DEP: { status: "open" },
      BLOCKED: { status: "open" },
      GATED: { status: "open" },
      MANUAL: { status: "open" },
      SHUT: { status: "done" },
    });
    repo.metadata({
      OPEN: meta(),
      DEP: meta(),
      BLOCKED: meta({ requires: ["DEP"] }),
      GATED: meta({ requires: ["res:missing-kit"] }),
      MANUAL: meta({ verify: "runbook:STATUS-HARDWARE.md#manual" }),
      SHUT: meta({ completed: "2026-01-01", evidence: ["work"] }),
    });
    repo.resources({ "missing-kit": { available: false, note: "an RNode" } });
    repo.commit();
  });
  afterEach(() => repo.cleanup());

  /** @param {Record<string, string | boolean>} flags */
  const close = (flags) => () => closeWork(flags, repo.root);

  it("requires an id that exists", () => {
    expect(close({ id: "NOPE", evidence: "work" })).toThrow(
      /not in any register/,
    );
  });

  it("commits unsigned even when the host gitconfig demands signing", () => {
    expect(repo.git("log", "-1", "--format=%G?").stdout.trim()).toBe("N");
  });

  it("refuses an item that is already done", () => {
    expect(close({ id: "SHUT", evidence: "work" })).toThrow(/already done/);
  });

  it("requires evidence", () => {
    expect(close({ id: "OPEN" })).toThrow(/--evidence is required/);
  });

  it("refuses while a prerequisite item is unfinished", () => {
    expect(close({ id: "BLOCKED", evidence: "work" })).toThrow(
      /still depends on DEP/,
    );
  });

  it("refuses while a required resource is marked unavailable", () => {
    expect(close({ id: "GATED", evidence: "work" })).toThrow(
      /marks unavailable/,
    );
  });

  it("refuses a runbook item without an explicit reason", () => {
    expect(close({ id: "MANUAL", evidence: "work" })).toThrow(
      /verified by runbook/,
    );
    expect(
      close({ id: "MANUAL", evidence: "work", "allow-unverified": true }),
    ).toThrow(/--reason/);
  });

  it("refuses when the verification command fails", () => {
    expect(close({ id: "OPEN", evidence: "work", verify: "exit 3" })).toThrow(
      /verification failed with exit 3/,
    );
    const rows = readFileSync(join(repo.root, "STATUS-SOFTWARE.md"), "utf8");
    expect(rows, "the row must stay open after a failed run").toContain(
      "| OPEN | open |",
    );
  });

  it("refuses --from-log pointing at a file that does not exist", () => {
    expect(
      close({ id: "OPEN", evidence: "work", "from-log": "nope.log" }),
    ).toThrow(/does not exist/);
  });

  it("refuses --from-log pointing at an empty file", () => {
    repo.write("empty.log", "");
    expect(
      close({ id: "OPEN", evidence: "work", "from-log": "empty.log" }),
    ).toThrow(/is empty/);
  });

  it("refuses --from-log combined with --allow-unverified", () => {
    repo.write("some.log", "output\n");
    expect(
      close({
        id: "OPEN",
        evidence: "work",
        "from-log": "some.log",
        "allow-unverified": true,
        reason: "x",
      }),
    ).toThrow(/mutually exclusive/);
  });
});

describe("work:done records what it did", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
    repo.registers({ A: { status: "open" }, B: { status: "open" } });
    repo.metadata({ A: meta(), B: meta({ requires: ["A"] }) });
    repo.commit();
  });
  afterEach(() => repo.cleanup());

  it("runs the command, moves the row, and reports what it unblocked", () => {
    const result = closeWork(
      { id: "A", evidence: "work/metadata.json" },
      repo.root,
    );
    expect(result.unblocked).toEqual(["B"]);

    const source = readFileSync(join(repo.root, "STATUS-SOFTWARE.md"), "utf8");
    const archive = readFileSync(join(repo.root, "STATUS-COMPLETE.md"), "utf8");
    expect(source).not.toContain("| A ");
    expect(archive).toContain("| A ");
    expect(archive).toContain("done");

    const event = readJournal(repo.root).at(-1);
    expect(event.action).toBe("close");
    expect(event.verified).toBe(true);
    expect(event.verifiedFrom).toBe("run");
    expect(event.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("fingerprints an ingested log instead of re-running the command", () => {
    repo.write("soak.log", "72h transport soak: 0 failures\n");
    closeWork(
      {
        id: "A",
        evidence: "work/metadata.json",
        "from-log": "soak.log",
        verify: "exit 9",
      },
      repo.root,
    );

    const event = readJournal(repo.root).at(-1);
    expect(event.verifiedFrom, "the failing command must not have run").toBe(
      "log",
    );
    expect(event.log).toBe("soak.log");
    expect(event.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
