#!/usr/bin/env node
/**
 * The formal gate.
 *
 * The three formal checks already ran on every PR, but as a hand-written CI job
 * rather than a registry gate — so their result never reached `/results/` and
 * nobody could ask the published site whether the proofs still hold. This
 * script is the registry-shaped wrapper: it runs the same three checks, writes
 * a structured artifact, and exits non-zero if any of them fails.
 *
 * The checks, in the order a failure is cheapest to diagnose:
 *
 *   1. executable/model conformance — every TLA+ `Edges` relation still matches
 *      the TypeScript authority table it twins;
 *   2. symbolic model inventory — the Tamarin/ProVerif models are all present;
 *   3. TLC model checking — type, safety and liveness for each model.
 *
 * TLC needs Java; the rest do not. That split is deliberate upstream (see
 * `formal/README.md`), so a missing JVM skips only the third stage and says so,
 * rather than failing a gate that has genuinely checked what it could. The
 * artifact records which stages actually ran, so a skip is visible on the
 * published page instead of looking like a pass.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const FORMAL = path.join(ROOT, "formal");
const JAR = path.join(FORMAL, "tla2tools.jar");
// Pinned upstream build. A different jar is a different prover, and a prover
// nobody pinned is not evidence.
const JAR_SHA1 = "bee4a54f3ee3d4afc347c3240ec2d9e93b075104";

/** TLA+ models to check, relative to `formal/`. */
const MODELS = [
  {
    id: "grant",
    config: "../specs/spec-cap/model/grant.cfg",
    spec: "../specs/spec-cap/model/grant.tla",
  },
  {
    id: "escrow",
    config: "../specs/spec-authority/model/escrow.cfg",
    spec: "../specs/spec-authority/model/escrow.tla",
  },
  {
    id: "recovery-quorum",
    config: "../specs/spec-authority/model/recovery-quorum.cfg",
    spec: "../specs/spec-authority/model/recovery_quorum.tla",
  },
];

function run(command, args, cwd = ROOT) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  return { status: result.status ?? 1, output };
}

function hasJava() {
  return spawnSync("java", ["-version"], { encoding: "utf8" }).status === 0;
}

const stages = [];
let failed = false;

function record(stage) {
  stages.push(stage);
  if (stage.ok === false) failed = true;
  return stage;
}

// 1. Executable/model conformance.
{
  const { status, output } = run("npm", ["run", "--silent", "formal:all"]);
  // "grant TLA+ relation conforms across 7 legal edges"
  const machines = [
    ...output.matchAll(
      /^(\S+) TLA\+ relation conforms across (\d+) legal edges$/gm,
    ),
  ].map(([, id, edges]) => ({ id, edges: Number(edges) }));
  record({
    id: "machine-conformance",
    title: "Executable/model conformance",
    ok: status === 0,
    machines: machines.length,
    edges: machines.reduce((sum, machine) => sum + machine.edges, 0),
    detail: machines,
  });
}

// 2. Symbolic model inventory.
{
  const { status, output } = run("npm", [
    "run",
    "--silent",
    "formal:symbolic:lint",
  ]);
  const inventory = output.match(
    /symbolic model inventory is complete \((\d+) models\)/,
  );
  record({
    id: "symbolic-inventory",
    title: "Symbolic model inventory",
    ok: status === 0,
    models: inventory ? Number(inventory[1]) : 0,
  });
}

// 3. TLC model checking.
if (!fs.existsSync(JAR)) {
  record({
    id: "tlc",
    title: "TLA+ model checking",
    ok: false,
    skipped: false,
    reason: `missing ${path.relative(ROOT, JAR)}`,
  });
} else if (!hasJava()) {
  // Not a failure: `formal/README.md` keeps the conformance check runnable
  // without a Java toolchain on purpose. CI always has one.
  record({
    id: "tlc",
    title: "TLA+ model checking",
    ok: null,
    skipped: true,
    reason: "no java on PATH; install Java 17+ to model-check locally",
  });
  console.log("formal: skipping TLC model checking — no java on PATH.");
} else {
  const digest = createHash("sha1").update(fs.readFileSync(JAR)).digest("hex");
  if (digest !== JAR_SHA1) {
    record({
      id: "tlc",
      title: "TLA+ model checking",
      ok: false,
      reason: `tla2tools.jar sha1 ${digest} does not match pinned ${JAR_SHA1}`,
    });
    console.error(`formal: tla2tools.jar sha1 ${digest} != ${JAR_SHA1}`);
  } else {
    const checked = [];
    let allOk = true;
    for (const model of MODELS) {
      const { status, output } = run(
        "java",
        [
          "-XX:+UseParallelGC",
          "-cp",
          "tla2tools.jar",
          "tlc2.TLC",
          "-deadlock",
          "-config",
          model.config,
          model.spec,
        ],
        FORMAL,
      );
      const states = output.match(
        /(\d+) states generated, (\d+) distinct states found/,
      );
      const ok =
        status === 0 &&
        /Model checking completed\. No error has been found\./.test(output);
      if (!ok) allOk = false;
      checked.push({
        id: model.id,
        ok,
        statesGenerated: states ? Number(states[1]) : null,
        distinctStates: states ? Number(states[2]) : null,
      });
    }
    record({
      id: "tlc",
      title: "TLA+ model checking",
      ok: allOk,
      jarSha1: digest,
      models: checked.length,
      distinctStates: checked.reduce(
        (sum, model) => sum + (model.distinctStates ?? 0),
        0,
      ),
      detail: checked,
    });
  }
}

const output = path.join(ROOT, "artifacts", "formal", "formal.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), ok: !failed, stages }, null, 2)}\n`,
);

const summary = stages
  .map(
    (stage) =>
      `${stage.id}=${stage.skipped ? "skipped" : stage.ok ? "ok" : "FAILED"}`,
  )
  .join(", ");
console.log(`formal: ${summary}`);
if (failed) process.exit(1);
