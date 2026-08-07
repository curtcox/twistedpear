import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  auditAppendOnly,
  auditJournalAgainstRegisters,
  auditJournalShape,
} from "../../scripts/work/journal.mjs";
import { loadWork } from "../../scripts/work/lib.mjs";
import { WorkFixture, meta } from "./work-fixture.mjs";

/**
 * These cover the failure modes the real repo can never exercise: the registry
 * is meant to always pass, so only a fixture can prove the guards actually bite.
 */
describe("journal tamper detection", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
  });
  afterEach(() => repo.cleanup());

  /** @param {string[]} ids */
  function epochFor(ids, commit) {
    return {
      at: "2026-01-02T00:00:00.000Z",
      actor: "fixture",
      action: "epoch",
      id: "-",
      commit,
      grandfathered: ids,
    };
  }

  it("accepts a hand-flipped row that the epoch grandfathers", () => {
    repo.registers({ A: { status: "done" } });
    repo.metadata({ A: meta({ completed: "2026-01-01", evidence: ["work"] }) });
    const commit = repo.commit();
    repo.journal([epochFor(["A"], commit)]);

    const { index } = loadWork(repo.root);
    expect(auditJournalAgainstRegisters(index, repo.root)).toEqual([]);
  });

  it("rejects a done row with no closing event and no grandfathering", () => {
    repo.registers({ A: { status: "open" }, B: { status: "open" } });
    repo.metadata({ A: meta(), B: meta() });
    const commit = repo.commit();
    repo.journal([epochFor([], commit)]);
    repo.registers({ A: { status: "done" }, B: { status: "open" } });

    const { index } = loadWork(repo.root);
    const problems = auditJournalAgainstRegisters(index, repo.root);
    expect(problems.join("\n")).toContain("A: marked done");
  });

  it("rejects grandfathering an item that was not done at the epoch commit", () => {
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta() });
    const commit = repo.commit();
    // The backdating attack: flip the row now, then claim it was always done.
    repo.registers({ A: { status: "done" } });
    repo.journal([epochFor(["A"], commit)]);

    const { index } = loadWork(repo.root);
    const problems = auditJournalAgainstRegisters(index, repo.root);
    expect(problems.join("\n")).toContain("grandfathers A");
  });

  it("rejects a journal with no epoch at all", () => {
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta() });
    repo.commit();
    repo.journal([
      { at: "2026-01-02T00:00:00.000Z", actor: "f", action: "add", id: "A" },
    ]);

    const { index } = loadWork(repo.root);
    expect(auditJournalAgainstRegisters(index, repo.root).join("\n")).toContain(
      'no "epoch" event',
    );
  });

  it("rejects a second epoch event", () => {
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta() });
    const commit = repo.commit();
    repo.journal([epochFor([], commit), epochFor([], commit)]);

    const { index } = loadWork(repo.root);
    expect(auditJournalAgainstRegisters(index, repo.root).join("\n")).toContain(
      "a second epoch event",
    );
  });

  it("rejects an epoch declared after work was already closed", () => {
    repo.registers({ A: { status: "done" } });
    repo.metadata({ A: meta({ completed: "2026-01-03", evidence: ["work"] }) });
    const commit = repo.commit();
    repo.journal([
      {
        at: "2026-01-02T00:00:00.000Z",
        actor: "f",
        action: "close",
        id: "A",
        to: "done",
      },
      epochFor([], commit),
    ]);

    const { index } = loadWork(repo.root);
    expect(auditJournalAgainstRegisters(index, repo.root).join("\n")).toContain(
      "grandfathering must precede any close",
    );
  });

  it("rejects an event for an item in no register", () => {
    repo.registers({ A: { status: "open" } });
    repo.metadata({ A: meta() });
    const commit = repo.commit();
    repo.journal([
      epochFor([], commit),
      {
        at: "2026-01-03T00:00:00.000Z",
        actor: "f",
        action: "add",
        id: "GHOST",
      },
    ]);

    const { index } = loadWork(repo.root);
    expect(auditJournalAgainstRegisters(index, repo.root).join("\n")).toContain(
      "unknown item GHOST",
    );
  });
});

describe("journal append-only enforcement", () => {
  /** @type {WorkFixture} */
  let repo;
  const first =
    '{"at":"2026-01-01T00:00:00.000Z","actor":"f","action":"epoch","id":"-"}\n';
  const second =
    '{"at":"2026-01-02T00:00:00.000Z","actor":"f","action":"add","id":"A"}\n';

  beforeEach(() => {
    repo = new WorkFixture();
    repo.write("work/history.jsonl", first + second);
    repo.commit();
  });
  afterEach(() => repo.cleanup());

  it("accepts an unchanged journal", () => {
    expect(auditAppendOnly(repo.root)).toEqual([]);
  });

  it("accepts appended events", () => {
    repo.write(
      "work/history.jsonl",
      `${first}${second}{"at":"2026-01-03T00:00:00.000Z","actor":"f","action":"add","id":"B"}\n`,
    );
    expect(auditAppendOnly(repo.root)).toEqual([]);
  });

  it("rejects a truncated journal", () => {
    repo.write("work/history.jsonl", first);
    expect(auditAppendOnly(repo.root).join("\n")).toContain(
      "not a prefix of the working copy",
    );
  });

  it("rejects a rewritten earlier event", () => {
    repo.write(
      "work/history.jsonl",
      `${first}{"at":"2026-01-02T00:00:00.000Z","actor":"f","action":"add","id":"Z"}\n`,
    );
    expect(auditAppendOnly(repo.root).join("\n")).toContain(
      "not a prefix of the working copy",
    );
  });
});

describe("journal shape", () => {
  /** @type {WorkFixture} */
  let repo;

  beforeEach(() => {
    repo = new WorkFixture();
  });
  afterEach(() => repo.cleanup());

  it("rejects malformed JSON, unknown actions, and backwards time", () => {
    repo.write(
      "work/history.jsonl",
      [
        "{not json}",
        '{"at":"2026-02-01T00:00:00.000Z","actor":"f","action":"teleport","id":"A"}',
        '{"at":"2026-01-01T00:00:00.000Z","actor":"f","action":"add","id":"A"}',
        '{"at":"2026-03-01T00:00:00.000Z","action":"add","id":"A"}',
      ].join("\n"),
    );
    const problems = auditJournalShape(repo.root).join("\n");
    expect(problems).toContain("not valid JSON");
    expect(problems).toContain('unknown action "teleport"');
    expect(problems).toContain("timestamp goes backwards");
    expect(problems).toContain('missing "actor"');
  });
});
