import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildStages,
  commandLine,
  logFileFor,
  parseArgs,
  runStagesForOptions,
  selectedStages
} from "./run.mjs";
import {
  isFailedEntry,
  readLogEntries,
  renderPackage,
  statusCandidates,
  tailText
} from "./triage.mjs";

const tmpRoots = [];

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "tp-mac-validation-"));
  tmpRoots.push(dir);
  return dir;
}

function writeLog(dir, name, body) {
  writeFileSync(join(dir, name), body);
}

afterEach(() => {
  while (tmpRoots.length > 0) {
    rmSync(tmpRoots.pop(), { recursive: true, force: true });
  }
});

describe("mac-validation runner plan", () => {
  it("prepends the doctor gate for the default CI-parity pass", () => {
    const options = parseArgs([]);

    expect(selectedStages(options)).toEqual([1, 2, 3, 4, 5]);
    expect(runStagesForOptions(options)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("supports explicit stage ranges and skip-doctor", () => {
    const options = parseArgs(["--from", "3", "--through", "5", "--skip-doctor"]);

    expect(selectedStages(options)).toEqual([3, 4, 5]);
    expect(runStagesForOptions(options)).toEqual([3, 4, 5]);
  });

  it("keeps the documented Android and plan-duration commands renderable", () => {
    const options = parseArgs(["--full", "--plan-duration"]);
    const stages = buildStages(options);
    const stage7 = stages.get(7).commands.map(commandLine);
    const stage8 = stages.get(8).commands.map(commandLine);

    expect(stage7[0]).toContain("JAVA_HOME=\"$(/usr/libexec/java_home -V");
    expect(stage7[0]).toContain("npm run test:android-native");
    expect(stage7).toContain("ANDROID_EMULATOR_REQUIRED=1 npm run test:android-emulator:e5");
    expect(stage8).toContain("SOAK_DURATION_MS=86400000 IOS_LIFECYCLE_CYCLES=100 npm run test:ios-soak:required");
    expect(stage8).toContain("TRANSPORT_SOAK_DURATION_MS=259200000 npm run test:transport-node-soak");
  });

  it("generates stable sanitized log paths", () => {
    const path = logFileFor("/logs", 8, 0, "SOAK_DURATION_MS=86400000 npm run test:ios-soak:required");

    expect(path).toBe("/logs/stage-8-01-soak-duration-ms-86400000-npm-run-test-ios-soak-required.log");
  });
});

describe("mac-validation triage package", () => {
  it("reads failed, passing, and interrupted logs without losing exit status", () => {
    const dir = tempDir();
    writeLog(dir, "stage-1-01-build.log", [
      "[mac-validation] cwd: /repo",
      "[mac-validation] command: npm run build",
      "",
      "ok",
      "[mac-validation] exit: 0",
      ""
    ].join("\n"));
    writeLog(dir, "stage-4-02-web.log", [
      "[mac-validation] cwd: /repo",
      "[mac-validation] command: INTEROP=1 npm run test:web-interop-browser",
      "",
      "boom",
      "[mac-validation] exit: 1",
      ""
    ].join("\n"));
    writeLog(dir, "stage-8-03-soak.log", [
      "[mac-validation] cwd: /repo",
      "[mac-validation] command: npm run test:integration-soak",
      "",
      "stopped",
      "[mac-validation] exit: SIGTERM",
      ""
    ].join("\n"));

    const entries = readLogEntries(dir);

    expect(entries.map((entry) => entry.exitStatus)).toEqual(["0", "1", "SIGTERM"]);
    expect(entries.filter(isFailedEntry).map((entry) => entry.script)).toEqual([
      "test:web-interop-browser",
      "test:integration-soak"
    ]);
  });

  it("does not treat expected caffeinate helper shutdown as a suite failure", () => {
    const dir = tempDir();
    writeLog(dir, "plan-duration-caffeinate.log", [
      "[mac-validation] cwd: /repo",
      "[mac-validation] command: caffeinate -dimsu",
      "",
      "[mac-validation] exit: SIGTERM",
      ""
    ].join("\n"));
    writeLog(dir, "stage-8-01-caffeinate-wrapper.log", [
      "[mac-validation] cwd: /repo",
      "[mac-validation] command: caffeinate -dimsu",
      "",
      "[mac-validation] helper: caffeinate",
      "[mac-validation] exit: 0",
      ""
    ].join("\n"));
    writeLog(dir, "stage-8-02-soak.log", [
      "[mac-validation] cwd: /repo",
      "[mac-validation] command: npm run test:integration-soak",
      "",
      "boom",
      "[mac-validation] exit: 1",
      ""
    ].join("\n"));

    const entries = readLogEntries(dir);

    expect(entries.filter(isFailedEntry).map((entry) => entry.name)).toEqual([
      "stage-8-02-soak.log"
    ]);
  });

  it("matches status rows and renders bounded evidence", () => {
    const dir = tempDir();
    const status = join(dir, "STATUS-SOFTWARE.md");
    writeFileSync(status, [
      "| Web interop browser | Stage 4 | needs local proof | run test:web-interop-browser | conformance/web-interop-browser/run.mjs |",
      "| Unrelated | Stage X | no | no | no |",
      ""
    ].join("\n"));

    writeLog(dir, "stage-4-01-web.log", [
      "[mac-validation] cwd: /repo",
      "[mac-validation] command: INTEROP=1 npm run test:web-interop-browser",
      "",
      "A".repeat(80),
      "[mac-validation] exit: 1",
      ""
    ].join("\n"));

    const entries = readLogEntries(dir);
    const rows = statusCandidates(status, entries);
    const markdown = renderPackage({
      logDir: dir,
      entries,
      included: entries.filter(isFailedEntry),
      statusRows: rows,
      maxLogBytes: 40
    });

    expect(rows).toHaveLength(1);
    expect(markdown).toContain("Failed or incomplete logs: 1");
    expect(markdown).toContain("test:web-interop-browser");
    expect(markdown).toContain("[tail truncated to 40 bytes]");
  });

  it("does not truncate short log tails", () => {
    expect(tailText("short log", 100)).toBe("short log");
  });
});
