import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HISTORY_DIR,
  finishRun,
  gateOutcome,
  pruneRuns,
  readGateRuns,
  recordGateRun,
  runIdFor,
  runsToPrune,
  startRun,
  summarizeGateRuns,
} from "../../scripts/checks/history.mjs";

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tp-check-runs-"));
}

/** @param {string} id @param {Partial<{ outcome: string; durationMs: number }>} rest */
function record(id, rest = {}) {
  return { id, outcome: "passed", durationMs: 1000, ...rest };
}

describe("run id", () => {
  it("sorts by start time and names the commit", () => {
    expect(runIdFor("2026-08-28T13:05:01.234Z", "b26d8c01aaaa1111")).toBe(
      "20260828T130501234Z-b26d8c01aaaa",
    );
  });

  it("separates two runs started within the same second", () => {
    // Two --only runs 336 ms apart collided under a second-resolution id: one
    // manifest overwrote the other and both gates landed in one directory.
    expect(runIdFor("2026-08-28T13:38:55.491Z", "b26d8c017ee0")).not.toBe(
      runIdFor("2026-08-28T13:38:55.827Z", "b26d8c017ee0"),
    );
  });

  it("stays sortable across runs", () => {
    const earlier = runIdFor("2026-08-28T13:05:01.000Z", "aaaaaaaaaaaa");
    const later = runIdFor("2026-08-28T14:00:00.000Z", "000000000000");
    expect([later, earlier].sort()).toEqual([earlier, later]);
  });

  it("does not pretend to know a commit it was not given", () => {
    expect(runIdFor("2026-08-28T13:05:01.000Z", "")).toMatch(/-unknown$/);
  });
});

describe("gate outcome", () => {
  it("keeps skips and refusals out of passes and failures", () => {
    expect(gateOutcome({ ok: true })).toBe("passed");
    expect(gateOutcome({ ok: false })).toBe("failed");
    expect(gateOutcome({ ok: true, skipped: true })).toBe("skipped");
    // A refusal is recorded with ok:false, and is still not a gate finding.
    expect(gateOutcome({ ok: false, refused: true })).toBe("refused");
  });
});

describe("run summary", () => {
  it("counts each outcome and ranks the slowest gates", () => {
    const summary = summarizeGateRuns([
      record("lint", { durationMs: 3000 }),
      record("coverage", { durationMs: 408_000 }),
      record("unit-tests", { outcome: "failed", durationMs: 216_000 }),
      record("swift", { outcome: "skipped", durationMs: 0 }),
      record("kotlin-coverage", { outcome: "refused", durationMs: 12 }),
    ]);

    expect(summary).toMatchObject({
      gates: 5,
      passed: 2,
      failed: 1,
      skipped: 1,
      refused: 1,
      durationMs: 627_012,
    });
    expect(summary.slowest.map((entry) => entry.id)).toEqual([
      "coverage",
      "unit-tests",
      "lint",
      "kotlin-coverage",
      "swift",
    ]);
  });
});

describe("pruning", () => {
  it("keeps the newest runs and drops the oldest", () => {
    const ids = [
      "20260101T000000Z-a",
      "20260301T000000Z-c",
      "20260201T000000Z-b",
    ];
    expect(runsToPrune(ids, 2)).toEqual(["20260101T000000Z-a"]);
    expect(runsToPrune(ids, 5)).toEqual([]);
  });

  it("removes only the pruned directories from disk", () => {
    const root = fixture();
    for (const id of ["20260101T000000Z-a", "20260201T000000Z-b"]) {
      startRun(root, { runId: id, startedAt: "2026-01-01T00:00:00.000Z" });
      recordGateRun(root, id, record("lint"));
    }

    expect(pruneRuns(root, 1)).toEqual(["20260101T000000Z-a"]);
    expect(fs.readdirSync(path.join(root, HISTORY_DIR))).toEqual([
      "20260201T000000Z-b",
    ]);
  });
});

describe("one recorded run", () => {
  it("writes the manifest before any gate runs", () => {
    const root = fixture();
    startRun(root, {
      runId: "20260828T130501Z-b26d8c01aaaa",
      startedAt: "2026-08-28T13:05:01.000Z",
      tier: "pr",
      selection: ["lint", "coverage"],
      localhostBind: "available",
    });

    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          HISTORY_DIR,
          "20260828T130501Z-b26d8c01aaaa",
          "manifest.json",
        ),
        "utf8",
      ),
    );
    // An interrupted run — a kernel panic on the validation host, say — must
    // still leave behind what it was measuring and where.
    expect(manifest).toMatchObject({
      version: 1,
      status: "running",
      tier: "pr",
      selection: ["lint", "coverage"],
      localhostBind: "available",
    });
  });

  it("folds the gate records into the manifest when the run closes", () => {
    const root = fixture();
    const runId = "20260828T130501Z-b26d8c01aaaa";
    startRun(root, {
      runId,
      startedAt: "2026-08-28T13:05:01.000Z",
      tier: "pr",
      treeDigest: "abc123",
    });
    recordGateRun(root, runId, record("lint", { durationMs: 3218 }));
    recordGateRun(root, runId, record("coverage", { durationMs: 407_700 }));

    const manifest = finishRun(root, runId, {
      finishedAt: "2026-08-28T13:12:12.000Z",
      exitCode: 0,
    });

    expect(manifest).toMatchObject({
      status: "finished",
      exitCode: 0,
      treeDigest: "abc123",
      durationMs: 431_000,
      summary: { gates: 2, passed: 2, durationMs: 410_918 },
    });
    expect(
      readGateRuns(root, runId)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(["coverage", "lint"]);
  });

  it("reads back nothing for a run that was never recorded", () => {
    expect(readGateRuns(fixture(), "20260828T130501Z-nope")).toEqual([]);
  });
});
