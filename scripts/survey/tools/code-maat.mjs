import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { ROOT, run } from "../lib.mjs";
import { edgeKey, importEdges, isTestPair } from "../graph.mjs";

/**
 * Temporal coupling: which files change together, from git history alone.
 *
 * Every other structural measurement here reads the import graph, so all of
 * them are blind to the same thing — two modules that must be edited in
 * lockstep while sharing no import at all. A protocol constant duplicated into
 * a fixture, a state machine and the switch that mirrors it, a schema and the
 * three places that hand-write it. Nothing static sees those; the commit log
 * sees nothing else.
 *
 * The report therefore classifies each pair rather than just listing it:
 *
 *   testPair      — a module and its own test. Working as intended.
 *   importRelated — they change together and one imports the other. Expected.
 *   (neither)     — **this is the finding.** Coupled in fact, uncoupled in
 *                   structure, and nothing in the codebase records the link.
 *
 * Needs a JVM and real git history. A shallow clone produces a near-empty
 * result rather than an error, so the workflow checks out with `fetch-depth: 0`
 * and the summary reports the commit count it actually saw.
 */
const VERSION = "1.0.4";
const JAR_SHA256 =
  "4287ae2034901844450f769547bc4497a0da1a6d1c7fa6fadc858705e6743b5f";
const JAR_URL = `https://github.com/adamtornhill/code-maat/releases/download/v${VERSION}/code-maat-${VERSION}-standalone.jar`;
const JAR_PATH = path.join(
  ROOT,
  ".tmp/code-maat",
  `code-maat-${VERSION}-standalone.jar`,
);
const DAYS = 180;

const tool = {
  id: "code-maat",
  title: "Temporal coupling from git history",
  question: "Which files change together without importing each other?",
  output: "reports/code-maat.json",
  version: () => VERSION,
  run() {
    if (!hasJava())
      throw new Error(
        "java not found on PATH; code-maat needs a JVM (see docs/audit-tooling.md)",
      );
    ensureJar();

    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "survey-maat-"));
    try {
      const logFile = path.join(scratch, "git.log");
      // code-maat's `git2` parser expects exactly this pretty-format. Renames
      // are disabled because it keys on path, and a renamed file arriving as
      // `{old => new}` is a path it cannot match against anything else.
      const log = run("git", [
        "log",
        `--since=${DAYS}.days.ago`,
        "--numstat",
        "--date=short",
        "--pretty=format:--%h--%ad--%aN",
        "--no-renames",
      ]);
      if (log.status !== 0)
        throw new Error(`git log failed: ${log.stderr.slice(0, 300)}`);
      fs.writeFileSync(logFile, log.stdout);
      const commits = (log.stdout.match(/^--[0-9a-f]+--/gm) ?? []).length;

      const result = run("java", [
        "-jar",
        JAR_PATH,
        "-l",
        logFile,
        "-c",
        "git2",
        "-a",
        "coupling",
      ]);
      if (!result.stdout.trim().startsWith("entity,"))
        throw new Error(
          `code-maat produced no coupling table (exit ${result.status}): ${(result.stderr || result.stdout).trim().slice(0, 300)}`,
        );

      const imports = importEdges();
      const findings = [];
      for (const row of parseCsv(result.stdout)) {
        const first = row.entity;
        const second = row.coupled;
        const testPair = isTestPair(first, second);
        const importRelated = imports.has(edgeKey(first, second));
        findings.push({
          first,
          second,
          // Percentage of commits touching one that also touch the other.
          degree: Number(row.degree),
          averageRevisions: Number(row["average-revs"]),
          testPair,
          importRelated,
          unexplained: !testPair && !importRelated,
        });
      }
      findings.sort(
        (a, b) =>
          Number(b.unexplained) - Number(a.unexplained) ||
          b.degree - a.degree ||
          b.averageRevisions - a.averageRevisions,
      );
      const unexplained = findings.filter((finding) => finding.unexplained);
      return {
        summary: {
          windowDays: DAYS,
          commitsAnalysed: commits,
          // A shallow clone yields a handful of commits and a near-empty table.
          // Saying so here is cheaper than wondering why the trend went flat.
          shallow: isShallow(),
          pairs: findings.length,
          unexplainedPairs: unexplained.length,
          testPairs: findings.filter((finding) => finding.testPair).length,
          importRelatedPairs: findings.filter(
            (finding) => finding.importRelated,
          ).length,
        },
        findings,
      };
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  },
};

function hasJava() {
  return run("java", ["-version"]).status === 0;
}

function isShallow() {
  return fs.existsSync(path.join(ROOT, ".git/shallow"));
}

/**
 * Fetch the pinned jar once, and refuse anything that is not it.
 *
 * The digest is the point. This downloads an executable from a release host at
 * analysis time; without a pin, "what ran" is whatever that URL served today.
 */
function ensureJar() {
  if (fs.existsSync(JAR_PATH) && digestOf(JAR_PATH) === JAR_SHA256) return;
  fs.mkdirSync(path.dirname(JAR_PATH), { recursive: true });
  const result = run("curl", ["-fsSL", "-o", JAR_PATH, JAR_URL]);
  if (result.status !== 0)
    throw new Error(
      `could not download code-maat ${VERSION} from ${JAR_URL}: ${result.stderr.slice(0, 200)}`,
    );
  const digest = digestOf(JAR_PATH);
  if (digest !== JAR_SHA256) {
    fs.rmSync(JAR_PATH, { force: true });
    throw new Error(
      `code-maat jar digest mismatch: expected ${JAR_SHA256}, got ${digest}`,
    );
  }
}

/** @param {string} file */
function digestOf(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

/** @param {string} text */
function parseCsv(text) {
  const [header, ...lines] = text.trim().split("\n");
  const columns = header.split(",");
  return lines
    .filter((line) => line.trim() !== "")
    .map((line) =>
      Object.fromEntries(
        line.split(",").map((cell, index) => [columns[index], cell]),
      ),
    );
}

export default tool;
