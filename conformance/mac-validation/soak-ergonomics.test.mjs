import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  formatProgress,
  lastProgress,
  soakProgress,
} from "../soak-progress.mjs";
import {
  alreadyPassed,
  recordedExit,
  resumePlan,
  wasSkipped,
} from "./resume.mjs";
import { launchEnvironment, plan } from "../../scripts/release/start-soaks.mjs";
import { classify } from "../../scripts/release/watch-soaks.mjs";
import {
  evidencePathFor,
  passedSoaks,
} from "../../scripts/release/record-soaks.mjs";
import {
  SOAK_ITEMS,
  TOTAL_PLAN_MS,
  remainingPlanMs,
} from "../../scripts/release/soak-plan.mjs";
import { buildStages, parseArgs } from "./run.mjs";
import { humanDuration } from "../../scripts/release/soak-status.mjs";

describe("soak progress heartbeat", () => {
  it("emits immediately, then throttles to the interval", () => {
    let clock = 1000;
    const lines = [];
    const progress = soakProgress({
      total: 10_000,
      intervalMs: 2000,
      now: () => clock,
      write: (line) => lines.push(line),
    });

    progress.report(0);
    clock = 1500;
    progress.report(500); // inside the interval — suppressed
    clock = 3200;
    progress.report(2200);

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("(22.0%)");
  });

  it("projects the ETA from the observed rate, not the nominal duration", () => {
    // Half done after 10s => 10s remaining, regardless of the declared total.
    const line = formatProgress({
      done: 50,
      total: 100,
      unit: "cycles",
      started: 0,
      at: 10_000,
    });
    expect(line).toContain("(50.0%)");
    expect(line).toContain(new Date(20_000).toISOString());
  });

  it("reports an unknown ETA before any progress is made", () => {
    expect(
      formatProgress({ done: 0, total: 100, unit: "ms", started: 0, at: 5 }),
    ).toContain("eta unknown");
  });

  it("round-trips through the parser the watcher uses", () => {
    const text = [
      "noise",
      formatProgress({
        done: 1,
        total: 4,
        unit: "cycles",
        started: 0,
        at: 1000,
      }),
      formatProgress({
        done: 3,
        total: 4,
        unit: "cycles",
        started: 0,
        at: 3000,
      }),
    ].join("\n");
    expect(lastProgress(text)).toMatchObject({
      done: 3,
      total: 4,
      unit: "cycles",
      percent: 75,
    });
  });

  it("returns null when a log carries no heartbeat", () => {
    expect(lastProgress("nothing here")).toBeNull();
  });
});

describe("resume", () => {
  /** @type {string} */
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "soak-resume-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** @param {string} name @param {string} body */
  const log = (name, body) => {
    const path = join(dir, name);
    writeFileSync(path, body);
    return path;
  };

  it("skips only commands that recorded a zero exit", () => {
    const passed = log("a.log", "work\n\n[mac-validation] exit: 0\n");
    const failed = log("b.log", "work\n\n[mac-validation] exit: 1\n");
    // Killed mid-command: the marker was never written.
    const interrupted = log("c.log", "[soak] progress 5/10 ms (50.0%)\n");

    expect(alreadyPassed(passed)).toBe(true);
    expect(alreadyPassed(failed)).toBe(false);
    expect(alreadyPassed(interrupted)).toBe(false);
    expect(recordedExit(interrupted)).toBeNull();
    expect(recordedExit(join(dir, "missing.log"))).toBeNull();
  });

  it("splits a run into skipped and pending", () => {
    const entries = [
      { label: "one", logPath: log("1.log", "\n[mac-validation] exit: 0\n") },
      { label: "two", logPath: log("2.log", "\n[mac-validation] exit: 1\n") },
      { label: "three", logPath: join(dir, "3.log") },
    ];
    expect(resumePlan(entries)).toEqual({
      skipped: ["one"],
      pending: ["two", "three"],
    });
  });
});

describe("plan-duration launch arguments", () => {
  it("keeps going after a failure so one bad soak cannot discard the rest", () => {
    expect(plan(new Date()).args).toContain("--continue-on-failure");
  });

  it("passes --resume and reuses the log directory when resuming", () => {
    const prepared = plan(new Date(), { resume: true, logDir: "/tmp/prev" });
    expect(prepared.args).toContain("--resume");
    expect(prepared.logDir).toBe("/tmp/prev");
    expect(prepared.args).toContain("/tmp/prev");
  });

  it("does not pass --resume by default", () => {
    expect(plan(new Date()).args).not.toContain("--resume");
  });

  it("accepts --resume on the runner itself", () => {
    expect(parseArgs(["--resume"]).resume).toBe(true);
    expect(parseArgs([]).resume).toBe(false);
  });
});

describe("soak plan", () => {
  it("covers every plan-duration Stage 8 command, in order", () => {
    const stage8 = buildStages(parseArgs(["--plan-duration"]))
      .get(8)
      .commands.map((command) => command.label);
    expect(SOAK_ITEMS.map((item) => item.script)).toEqual(stage8);
  });

  it("totals the documented eleven days", () => {
    // 1 h + 24 h x 5 + 72 h + 72 h = 265 h.
    expect(TOTAL_PLAN_MS).toBe(954_000_000);
    expect(humanDuration(TOTAL_PLAN_MS)).toBe("265h 00m");
  });

  it("discounts finished soaks and the elapsed part of the running one", () => {
    const rows = [
      { id: "RQ-LINK", status: "passed" },
      { id: "RQ-INTEGRATION", status: "running", percent: 50 },
    ];
    const expected = TOTAL_PLAN_MS - 3_600_000 - 86_400_000 / 2;
    expect(remainingPlanMs(rows)).toBe(expected);
  });
});

describe("a skipped soak is never a pass", () => {
  /** @type {string} */
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "soak-skip-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const SKIPPED = [
    "[mac-validation] command: npm run test:link-soak",
    "link-soak: skipped (set INTEROP=1 with docker)",
    "",
    "[mac-validation] exit: 0",
    "",
  ].join("\n");

  it("detects the skip marker", () => {
    expect(wasSkipped(SKIPPED)).toBe(true);
    expect(wasSkipped("link-soak: 42 pings, zero teardowns")).toBe(false);
  });

  it("classifies a skip as skipped even though it exited 0", () => {
    expect(classify(SKIPPED)).toEqual({
      status: "skipped",
      category: "prerequisite",
    });
  });

  it("re-runs a skipped soak on resume instead of stepping over it", () => {
    const path = join(dir, "stage-8-01-test-link-soak.log");
    writeFileSync(path, SKIPPED);
    expect(recordedExit(path)).toBe(0);
    expect(alreadyPassed(path)).toBe(false);
  });

  it("keeps the registry recorder away from skipped soaks", () => {
    writeFileSync(join(dir, "stage-8-01-test-link-soak.log"), SKIPPED);
    expect(passedSoaks(dir)).toEqual([]);
  });

  it("sets INTEROP=1 so the soaks that need Docker actually run", () => {
    expect(launchEnvironment().INTEROP).toBe("1");
  });
});

describe("soak evidence is durable", () => {
  it("cites a tracked path, not the gitignored .tmp log", () => {
    const path = evidencePathFor("RQ-LINK", new Date("2026-09-01T00:00:00Z"));
    expect(path).toBe("release/evidence-logs/2026-09-01-rq-link-soak.log");
    expect(path.startsWith(".tmp")).toBe(false);
  });
});
