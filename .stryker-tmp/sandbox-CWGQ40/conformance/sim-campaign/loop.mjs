// @ts-nocheck
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const loopConfig = JSON.parse(readFileSync("conformance/sim-campaign/loop-config.json", "utf8"));
const temporary = mkdtempSync(join(tmpdir(), "twistedpear-abuse-loop-"));
try {
  run("test:sim-campaign");
  run("test:sim-authored-replay");
  const first = join(temporary, "fixed-a.json");
  const second = join(temporary, "fixed-b.json");
  run("test:sim-fixed-replay", ["--", first]);
  run("test:sim-fixed-replay", ["--", second]);
  if (!readFileSync(first).equals(readFileSync(second))) throw new Error("fixed replay was not byte-identical");
  const fixedReplaySha256 = createHash("sha256").update(readFileSync(first)).digest("hex");
  if (fixedReplaySha256 !== loopConfig.fixedReplaySha256) {
    throw new Error(`fixed replay baseline moved: expected ${loopConfig.fixedReplaySha256}, received ${fixedReplaySha256}`);
  }
  run("sim:report");
  console.log("abuse-resistance loop turn: green, fixed replay byte-identical");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

function run(script, trailing = []) {
  const result = spawnSync(npm, ["run", script, ...trailing], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} failed with exit code ${result.status ?? "unknown"}`);
}
