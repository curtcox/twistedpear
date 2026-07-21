#!/usr/bin/env node
/**
 * Run unit tests and static/formal analysis, capturing structured results.
 * Continues after failures so all sections are published.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, RESULTS_DIR } from "./paths.mjs";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function gitSha() {
  const r = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  return (r.stdout || "unknown").trim();
}

/**
 * @param {{ id: string, title: string, command: string[], cwd?: string, env?: Record<string,string>, copyOutputs?: string[] }} job
 */
function runJob(job) {
  const startedAt = nowIso();
  const logPath = path.join(RESULTS_DIR, "logs", `${job.id}.log`);
  ensureDir(path.dirname(logPath));

  const result = spawnSync(job.command[0], job.command.slice(1), {
    cwd: job.cwd ?? ROOT,
    encoding: "utf8",
    env: { ...process.env, ...(job.env ?? {}) },
    maxBuffer: 64 * 1024 * 1024
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const log = [
    `$ ${job.command.join(" ")}`,
    `cwd: ${job.cwd ?? ROOT}`,
    `exit: ${result.status ?? 1}`,
    "",
    stdout,
    stderr ? `\n--- stderr ---\n${stderr}` : ""
  ].join("\n");
  fs.writeFileSync(logPath, log);

  for (const rel of job.copyOutputs ?? []) {
    const src = path.join(ROOT, rel);
    if (fs.existsSync(src)) {
      const dest = path.join(RESULTS_DIR, "artifacts", path.basename(rel));
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
    }
  }

  return {
    id: job.id,
    title: job.title,
    command: job.command.join(" "),
    startedAt,
    finishedAt: nowIso(),
    exitCode: result.status ?? 1,
    ok: (result.status ?? 1) === 0,
    logFile: `logs/${job.id}.log`,
    durationMs: Date.parse(nowIso()) - Date.parse(startedAt)
  };
}

function summarizeDependencyGraph() {
  const graphPath = path.join(ROOT, "dependency-graph.json");
  if (!fs.existsSync(graphPath)) {
    return { present: false };
  }
  const dest = path.join(RESULTS_DIR, "artifacts", "dependency-graph.json");
  ensureDir(path.dirname(dest));
  fs.copyFileSync(graphPath, dest);
  try {
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    const modules = graph.modules ?? graph;
    const count = Array.isArray(modules) ? modules.length : Object.keys(modules).length;
    return {
      present: true,
      moduleCount: count,
      artifact: "artifacts/dependency-graph.json"
    };
  } catch {
    return { present: true, artifact: "artifacts/dependency-graph.json" };
  }
}

function main() {
  ensureDir(RESULTS_DIR);
  ensureDir(path.join(RESULTS_DIR, "logs"));
  ensureDir(path.join(RESULTS_DIR, "artifacts"));

  const meta = {
    generatedAt: nowIso(),
    commit: gitSha(),
    node: process.version,
    ref: process.env.GITHUB_REF ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null
  };

  /** @type {ReturnType<typeof runJob>[]} */
  const jobs = [];

  // Build protocol/effects first so formal + sansio have dist output.
  jobs.push(
    runJob({
      id: "build-protocol-effects",
      title: "Build protocol + effects",
      command: [
        "npm",
        "run",
        "build",
        "--workspace=@twistedpear/effects",
        "--workspace=@twistedpear/protocol"
      ]
    })
  );

  // Unit tests with Vitest JSON reporter
  const vitestJson = path.join(RESULTS_DIR, "artifacts", "vitest.json");
  ensureDir(path.dirname(vitestJson));
  jobs.push(
    runJob({
      id: "unit-tests",
      title: "Unit tests (vitest)",
      command: [
        "npx",
        "vitest",
        "run",
        "--reporter=default",
        "--reporter=json",
        `--outputFile.json=${vitestJson}`
      ]
    })
  );

  jobs.push(
    runJob({
      id: "typescript",
      title: "TypeScript (tsc -b)",
      command: ["npm", "run", "lint"]
    })
  );

  // Sans-IO gates individually so each appears in the report
  jobs.push(
    runJob({
      id: "sansio-inventory",
      title: "Sans-IO inventory",
      command: ["npm", "run", "sansio:inventory"],
      copyOutputs: ["violations.json"]
    })
  );
  jobs.push(
    runJob({
      id: "sansio-ratchet",
      title: "Sans-IO ratchet",
      command: ["npm", "run", "sansio:ratchet"]
    })
  );
  jobs.push(
    runJob({
      id: "sansio-eslint",
      title: "Sans-IO ESLint",
      command: ["npm", "run", "sansio:eslint"]
    })
  );
  jobs.push(
    runJob({
      id: "sansio-depcruise",
      title: "Sans-IO dependency-cruiser",
      command: ["npm", "run", "sansio:depcruise"],
      copyOutputs: ["dependency-graph.json"]
    })
  );
  jobs.push(
    runJob({
      id: "sansio-canary",
      title: "Sans-IO canary",
      command: ["npm", "run", "sansio:canary"],
      copyOutputs: ["sansio-canary.json"]
    })
  );
  jobs.push(
    runJob({
      id: "sansio-determinism",
      title: "Sans-IO determinism tests",
      command: ["npm", "run", "sansio:determinism"]
    })
  );

  jobs.push(
    runJob({
      id: "formal-all",
      title: "Formal machine conformance (formal:all)",
      command: ["npm", "run", "formal:all"]
    })
  );

  jobs.push(
    runJob({
      id: "formal-symbolic-lint",
      title: "Symbolic model lint",
      command: ["npm", "run", "formal:symbolic:lint"]
    })
  );

  const tlcJobs = [
    {
      id: "tlc-grant",
      title: "TLC: grant.tla",
      args: [
        "-XX:+UseParallelGC",
        "-cp",
        "tla2tools.jar",
        "tlc2.TLC",
        "-deadlock",
        "-config",
        "../specs/spec-cap/model/grant.cfg",
        "../specs/spec-cap/model/grant.tla"
      ]
    },
    {
      id: "tlc-escrow",
      title: "TLC: escrow.tla",
      args: [
        "-XX:+UseParallelGC",
        "-cp",
        "tla2tools.jar",
        "tlc2.TLC",
        "-deadlock",
        "-config",
        "../specs/spec-authority/model/escrow.cfg",
        "../specs/spec-authority/model/escrow.tla"
      ]
    },
    {
      id: "tlc-recovery",
      title: "TLC: recovery_quorum.tla",
      args: [
        "-XX:+UseParallelGC",
        "-cp",
        "tla2tools.jar",
        "tlc2.TLC",
        "-deadlock",
        "-config",
        "../specs/spec-authority/model/recovery-quorum.cfg",
        "../specs/spec-authority/model/recovery_quorum.tla"
      ]
    }
  ];

  for (const t of tlcJobs) {
    jobs.push(
      runJob({
        id: t.id,
        title: t.title,
        command: ["java", ...t.args],
        cwd: path.join(ROOT, "formal")
      })
    );
  }

  const dependencyGraph = summarizeDependencyGraph();

  let vitestSummary = null;
  if (fs.existsSync(vitestJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(vitestJson, "utf8"));
      vitestSummary = {
        numTotalTests: data.numTotalTests,
        numPassedTests: data.numPassedTests,
        numFailedTests: data.numFailedTests,
        numPendingTests: data.numPendingTests,
        success: data.success,
        artifact: "artifacts/vitest.json"
      };
    } catch {
      vitestSummary = { artifact: "artifacts/vitest.json", parseError: true };
    }
  }

  const report = {
    ...meta,
    jobs,
    vitest: vitestSummary,
    dependencyGraph,
    ok: jobs.every((j) => j.ok),
    failed: jobs.filter((j) => !j.ok).map((j) => j.id)
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, "summary.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

  console.log(
    `Wrote ${path.join(RESULTS_DIR, "summary.json")} — ${report.ok ? "PASS" : "FAIL"} (${report.failed.length} failed)`
  );
  if (!report.ok) {
    console.log(`Failed jobs: ${report.failed.join(", ")}`);
  }

  // Exit 0 here; aggregate gate is checked after site deploy in CI.
  process.exit(0);
}

main();
