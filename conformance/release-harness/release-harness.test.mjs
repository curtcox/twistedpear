import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { calculate, render } from "../../scripts/release/status.mjs";
import { record } from "../../scripts/release/record.mjs";
import { classify, scan } from "../../scripts/release/watch-soaks.mjs";
import { plan } from "../../scripts/release/start-soaks.mjs";
import {
  applicationFingerprint,
  captureBaseline,
  isReleaseBranch,
  treeFingerprint,
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

  test("counts a suite CI reaches through the checks registry as wired", () => {
    const root = fixture();
    // The real ci.yml never names test:release-harness: gate-plan expands the
    // checks registry into the static-analysis matrix instead.
    writeFileSync(
      join(root, ".github/workflows/ci.yml"),
      "test:hostile-apps\ntest:sim-fixed-replay\n",
    );
    mkdirSync(join(root, "scripts/checks"), { recursive: true });
    writeFileSync(
      join(root, "scripts/checks/registry.mjs"),
      'gate("release-harness", "Release harness", "test:release-harness", "pr");\n',
    );
    expect(calculate(root).stages[0]).toBe(true);
  });

  test("a red gate preempts every stage action, including starting soaks", () => {
    const root = fixture();
    // Drive the driver to S2, where its next action is to start the soaks.
    const log = join(root, "baseline.log");
    writeFileSync(log, "baseline\n");
    record({ root, id: "baseline:S1", status: "passed", log });
    record({ root, id: "ci:baseline", status: "passed", log });
    expect(calculate(root).next).toContain("release:start-soaks");
    writeFileSync(
      join(root, "checks.json"),
      JSON.stringify({
        version: 1,
        generatedAt: new Date().toISOString(),
        commit: "abc123",
        digest: "digest-1",
        gates: {
          coverage: {
            title: "Coverage ratchet",
            command: "npm run coverage:check",
            ok: false,
            at: new Date().toISOString(),
            commit: "abc123",
            since: "2026-08-01",
          },
        },
      }),
    );
    const state = calculate(root);
    expect(state.next).toMatch(/Fix the red gate\(s\) before anything else/);
    expect(state.next).toContain("coverage");
    expect(render(state)).toContain("since 2026-08-01");
  });

  test("a waived gate does not displace the stage action", () => {
    const root = fixture();
    writeFileSync(
      join(root, "checks.json"),
      JSON.stringify({
        version: 1,
        generatedAt: new Date().toISOString(),
        commit: "abc123",
        digest: "digest-1",
        gates: {
          "audit-policy": {
            title: "Advisory allowlist policy",
            command: "npm run audit:policy",
            ok: false,
            at: new Date().toISOString(),
            commit: "abc123",
            since: "2026-08-01",
          },
        },
      }),
    );
    writeFileSync(
      join(root, "checks-waivers.json"),
      JSON.stringify({
        version: 1,
        waivers: [
          {
            gate: "audit-policy",
            reason: "upstream advisory has no fixed release yet",
            recorded: "2026-08-01",
            expires: "2999-01-01",
          },
        ],
      }),
    );
    const state = calculate(root);
    expect(state.next).not.toMatch(/Fix the red gate/);
    // Still visible: waived is not green.
    expect(render(state)).toContain("waived until 2999-01-01");
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
    recordGates(root, { lint: true });
    return { root, git };
  }

  /**
   * Write the committed gate record for the tree as it stands. checks.json is
   * outside APPLICATION_PATHS, so recording gates never perturbs the digest it
   * is being recorded against.
   * @param {string} root
   * @param {Record<string, boolean>} gates
   * @param {{ digest?: string; waivers?: any[] }} [options]
   */
  function recordGates(root, gates, options = {}) {
    const fingerprint = applicationFingerprint(root);
    if (options.waivers)
      writeFileSync(
        join(root, "checks-waivers.json"),
        JSON.stringify({ version: 1, waivers: options.waivers }),
      );
    writeFileSync(
      join(root, "checks.json"),
      JSON.stringify({
        version: 1,
        generatedAt: new Date().toISOString(),
        commit: fingerprint.head,
        digest: options.digest ?? fingerprint.digest,
        treeDigest: options.treeDigest ?? treeFingerprint(root),
        gates: Object.fromEntries(
          Object.entries(gates).map(([id, ok]) => [
            id,
            {
              title: id,
              command: `npm run ${id}`,
              ok,
              at: new Date().toISOString(),
              commit: fingerprint.head,
              ...(ok ? {} : { detail: `${id} failed`, since: "2026-08-01" }),
              measuredOn: options.treeDigest ?? treeFingerprint(root),
            },
          ]),
        ),
      }),
    );
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

  test("refuses to soak a tree with a red gate", () => {
    const { root } = repo();
    recordGates(root, { lint: true, coverage: false });
    expect(() => captureBaseline(root)).toThrow(/1 red gate\(s\)/);
    expect(() => captureBaseline(root)).toThrow(/coverage/);
  });

  test("refuses a gate record measured on different application code", () => {
    const { root } = repo();
    recordGates(root, { lint: true }, { digest: "measured-somewhere-else" });
    expect(() => captureBaseline(root)).toThrow(/application digest/);
  });

  test("refuses when something outside the application paths has changed", () => {
    // The gates read scripts/, docs/, and the registers; the application digest
    // deliberately ignores them. Without the tree digest, editing a script could
    // turn a gate red while the record still looked fresh.
    const { root } = repo();
    recordGates(root, { lint: true });
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(join(root, "scripts/triage.mjs"), "export const x = 1;\n");
    expect(() => captureBaseline(root)).toThrow(
      /outside the application paths/,
    );
  });

  test("refuses a gate whose green result came from another tree", () => {
    // The local run skipped it (no toolchain), so its old result was carried
    // forward. Carried forward is not measured.
    const { root } = repo();
    recordGates(root, { lint: true, swift: true });
    const record = JSON.parse(readFileSync(join(root, "checks.json"), "utf8"));
    record.gates.swift.measuredOn = "a-tree-from-three-commits-ago";
    writeFileSync(join(root, "checks.json"), JSON.stringify(record));
    expect(() => captureBaseline(root)).toThrow(/no result for this tree/);
    expect(() => captureBaseline(root)).toThrow(/swift/);
  });

  test("accepts an unmeasurable gate once the reason is recorded", () => {
    const { root } = repo();
    recordGates(
      root,
      { lint: true, swift: true },
      {
        waivers: [
          {
            gate: "swift",
            reason: "no Swift toolchain on the soak host; CI covers it",
            recorded: "2026-08-01",
            expires: "2999-01-01",
          },
        ],
      },
    );
    const record = JSON.parse(readFileSync(join(root, "checks.json"), "utf8"));
    record.gates.swift.measuredOn = "a-tree-from-three-commits-ago";
    writeFileSync(join(root, "checks.json"), JSON.stringify(record));
    expect(captureBaseline(root).head).toBeTruthy();
  });

  test("refuses a record written before the tree digest existed", () => {
    const { root } = repo();
    const fingerprint = applicationFingerprint(root);
    writeFileSync(
      join(root, "checks.json"),
      JSON.stringify({
        version: 1,
        generatedAt: new Date().toISOString(),
        commit: fingerprint.head,
        digest: fingerprint.digest,
        gates: {
          lint: { title: "lint", command: "x", ok: true, at: "", commit: "" },
        },
      }),
    );
    expect(() => captureBaseline(root)).toThrow(/predates the tree digest/);
  });

  test("refuses a tree whose gates have never been recorded", () => {
    const { root } = repo();
    rmSync(join(root, "checks.json"));
    expect(() => captureBaseline(root)).toThrow(/no gate results/);
  });

  test("starts under an active waiver, and reports what was waived", () => {
    const { root } = repo();
    recordGates(
      root,
      { lint: true, "audit-policy": false },
      {
        waivers: [
          {
            gate: "audit-policy",
            reason: "upstream advisory has no fixed release yet",
            recorded: "2026-08-01",
            expires: "2999-01-01",
          },
        ],
      },
    );
    expect(captureBaseline(root).waivedGates).toEqual(["audit-policy"]);
  });

  test("refuses again once the waiver expires", () => {
    const { root } = repo();
    recordGates(
      root,
      { lint: true, "audit-policy": false },
      {
        waivers: [
          {
            gate: "audit-policy",
            reason: "upstream advisory has no fixed release yet",
            recorded: "2026-07-01",
            expires: "2026-07-15",
          },
        ],
      },
    );
    expect(() => captureBaseline(root, undefined, { now: new Date() })).toThrow(
      /waiver expired 2026-07-15/,
    );
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
