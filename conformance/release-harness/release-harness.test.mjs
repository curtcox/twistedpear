import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { calculate, render } from "../../scripts/release/status.mjs";
import { record } from "../../scripts/release/record.mjs";
import { classify, scan } from "../../scripts/release/watch-soaks.mjs";
import { plan } from "../../scripts/release/start-soaks.mjs";
import {
  captureBaseline,
  isReleaseBranch,
  verifyBaseline,
} from "../../scripts/release/soak-guard.mjs";
import { verifySamples } from "../../scripts/release/h20.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "tp-release-"));
  mkdirSync(join(root, "scripts/release"), { recursive: true });
  for (const name of [
    "status.mjs",
    "start-soaks.mjs",
    "watch-soaks.mjs",
    "h20.mjs",
    "record.mjs",
  ])
    writeFileSync(join(root, "scripts/release", name), "");
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    "test:release-harness\ntest:hostile-apps\ntest:sim-fixed-replay\n",
  );
  writeFileSync(join(root, "STATUS-COMPLETE.md"), "# Complete\n");
  writeFileSync(
    join(root, "STATUS-HARDWARE.md"),
    "| H1 | phone | 2 | test |\n",
  );
  writeFileSync(
    join(root, "STATUS-SOFTWARE.md"),
    "| Link keepalive soak | short | long |\n",
  );
  return root;
}

describe("release driver", () => {
  test("reports S1 as the single next action after a complete harness", () => {
    const state = calculate(fixture());
    expect(state.stages[0]).toBe(true);
    expect(state.next).toContain("full PR-tier baseline");
    expect(render(state)).toContain("Active stage: S1");
  });

  test("a failed soak preempts the serial stage action", () => {
    const root = fixture();
    const run = join(root, ".tmp/mac-validation/run-1/soak-triage");
    mkdirSync(run, { recursive: true });
    writeFileSync(
      join(run, "status.json"),
      JSON.stringify({ results: [{ status: "failed", log: "transport.log" }] }),
    );
    expect(calculate(root).next).toContain("transport.log");
  });
});

describe("evidence recorder", () => {
  test("creates a self-contained attestation log for a started manual wait", () => {
    const root = fixture();
    const path = record({
      root,
      id: "account:H12",
      status: "started",
      note: "enrollment submitted",
    });
    expect(readFileSync(path, "utf8")).toContain('"status": "started"');
    expect(
      readFileSync(
        join(root, "release/evidence-logs/account-h12-started.log"),
        "utf8",
      ),
    ).toContain("enrollment submitted");
  });

  test("records, archives, and strikes a passed hardware row", () => {
    const root = fixture();
    writeFileSync(join(root, "h1.log"), "device session passed\n");
    record({
      root,
      id: "hardware:H1",
      status: "passed",
      log: "h1.log",
      at: "2026-07-19T00:00:00.000Z",
    });
    expect(readFileSync(join(root, "STATUS-HARDWARE.md"), "utf8")).toContain(
      "~~H1~~",
    );
    expect(readFileSync(join(root, "STATUS-COMPLETE.md"), "utf8")).toContain(
      "hardware:H1",
    );
  });

  test("refuses a failed mac-validation log marked passed", () => {
    const root = fixture();
    writeFileSync(join(root, "bad.log"), "[mac-validation] exit: 1\n");
    expect(() =>
      record({ root, id: "baseline:S1", status: "passed", log: "bad.log" }),
    ).toThrow(/refusing/);
  });
});

describe("plan-duration launcher", () => {
  test("builds a deterministic Stage-8 command and log directory", () => {
    const prepared = plan(new Date("2026-07-19T03:00:00.000Z"));
    expect(prepared.args).toContain("--plan-duration");
    expect(prepared.logDir).toContain("release-2026-07-19T03-00-00-000Z");
  });
});

describe("H20 verifier", () => {
  const status = (uptimeMs, pathTableCount, propagationStoreBytes) => ({
    running: true,
    propagationEnabled: true,
    uptimeMs,
    pathTableCount,
    propagationStoreBytes,
    propagationMessageCount: 2,
    propagationEvictions: 0,
  });

  test("accepts continuous samples spanning the committed duration", () => {
    const summary = verifySamples(
      [
        {
          at: "2026-07-01T00:00:00.000Z",
          rssKiB: 1000,
          status: status(100, 1, 20),
        },
        {
          at: "2026-07-01T01:00:00.000Z",
          rssKiB: 1020,
          status: status(3_600_100, 2, 30),
        },
      ],
      { durationMs: 3_600_000, intervalMs: 3_600_000 },
    );
    expect(summary.rssKiB.growth).toBe(20);
  });

  test("rejects a restart or monitoring gap", () => {
    expect(() =>
      verifySamples(
        [
          {
            at: "2026-07-01T00:00:00.000Z",
            rssKiB: 1000,
            status: status(5000, 1, 20),
          },
          {
            at: "2026-07-01T01:00:00.000Z",
            rssKiB: 1020,
            status: status(100, 2, 30),
          },
        ],
        { durationMs: 3_600_000, intervalMs: 3_600_000 },
      ),
    ).toThrow(/restarted/);
  });
});

describe("soak guard", () => {
  function repo(branch = "release/v1.0.0") {
    const root = mkdtempSync(join(tmpdir(), "tp-soak-guard-"));
    const git = (...args) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git("init", "--quiet");
    git("config", "user.email", "soak@example.invalid");
    git("config", "user.name", "Soak Guard Test");
    mkdirSync(join(root, "packages/reticulum-ts/src"), { recursive: true });
    writeFileSync(
      join(root, "packages/reticulum-ts/src/index.ts"),
      "export {};\n",
    );
    writeFileSync(join(root, "package.json"), '{"name":"fixture"}\n');
    git("add", "-A");
    git("commit", "--quiet", "-m", "baseline");
    git("switch", "--quiet", "-c", branch);
    return { root, git };
  }

  test("accepts release branches and rejects everything else", () => {
    expect(isReleaseBranch("release/v1.0.0")).toBe(true);
    expect(isReleaseBranch("release/1.0-rc1")).toBe(true);
    expect(isReleaseBranch("main")).toBe(false);
    expect(isReleaseBranch("codex/release-plan-s1")).toBe(false);
    expect(isReleaseBranch("release")).toBe(false);
  });

  test("refuses to start a plan-duration soak off a release branch", () => {
    const { root } = repo("feature/faster-links");
    expect(() => captureBaseline(root)).toThrow(/only from a release branch/);
  });

  test("refuses to soak an uncommitted application tree", () => {
    const { root } = repo();
    writeFileSync(
      join(root, "packages/reticulum-ts/src/index.ts"),
      "export const x = 1;\n",
    );
    expect(() => captureBaseline(root)).toThrow(/uncommitted application tree/);
  });

  test("holds while the application tree is untouched", () => {
    const { root } = repo();
    const baseline = captureBaseline(root);
    writeFileSync(
      join(root, "notes.md"),
      "docs churn is not application code\n",
    );
    expect(verifyBaseline(baseline, root).ok).toBe(true);
  });

  test("fails when application code is committed after the soak starts", () => {
    const { root, git } = repo();
    const baseline = captureBaseline(root);
    writeFileSync(
      join(root, "packages/reticulum-ts/src/index.ts"),
      "export const x = 1;\n",
    );
    git("add", "-A");
    git("commit", "--quiet", "-m", "mid-soak change");
    const result = verifyBaseline(baseline, root);
    expect(result.ok).toBe(false);
    expect(result.changed).toContain("packages/reticulum-ts/src/index.ts");
    expect(result.reason).toMatch(/changed after the soak started/);
  });

  test("fails on an uncommitted edit and on a new source file alike", () => {
    const { root } = repo();
    const baseline = captureBaseline(root);
    writeFileSync(
      join(root, "packages/reticulum-ts/src/link.ts"),
      "export const y = 2;\n",
    );
    const result = verifyBaseline(baseline, root);
    expect(result.ok).toBe(false);
    expect(result.changed).toContain("packages/reticulum-ts/src/link.ts");
  });

  test("fails when the run leaves the branch it started on", () => {
    const { root, git } = repo();
    const baseline = captureBaseline(root);
    git("switch", "--quiet", "-c", "release/v1.0.1");
    expect(verifyBaseline(baseline, root).reason).toMatch(/branch moved/);
  });

  test("surfaces drift to the driver as a failed soak result", () => {
    const { root } = repo();
    const baseline = captureBaseline(root);
    const logs = join(root, "logs");
    mkdirSync(logs);
    writeFileSync(join(logs, "soak-baseline.json"), JSON.stringify(baseline));
    writeFileSync(
      join(root, "packages/reticulum-ts/src/index.ts"),
      "export const x = 1;\n",
    );
    const results = scan(logs, join(logs, "soak-triage"), root);
    expect(results[0]).toMatchObject({
      status: "failed",
      category: "code-drift",
    });
  });
});

describe("soak watcher", () => {
  test("classifies failures and writes a minimal reproducer", () => {
    const root = fixture();
    const logs = join(root, "logs");
    mkdirSync(logs);
    writeFileSync(
      join(logs, "stage-8-01-link.log"),
      "[mac-validation] command: npm run test:link-soak\nAssertionError: expected true\n[mac-validation] exit: 1\n",
    );
    const results = scan(logs);
    expect(results[0]).toMatchObject({
      status: "failed",
      category: "assertion",
    });
    expect(readFileSync(results[0].reproducer, "utf8")).toContain(
      "npm run test:link-soak",
    );
  });

  test("distinguishes running and passing logs", () => {
    expect(classify("still going").status).toBe("running");
    expect(classify("[mac-validation] exit: 0\n").status).toBe("passed");
  });
});
