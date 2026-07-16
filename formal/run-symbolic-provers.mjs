import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const mode = process.argv[2];
const timeoutMs = integerEnv("SIM_SYMBOLIC_MODEL_TIMEOUT_MS", 5 * 60 * 1_000);
const definitions = mode === "tamarin"
  ? {
      executable: process.env.SIM_TAMARIN_EXECUTABLE ?? "tamarin-prover",
      files: ["grant-boundary.spthy", "link-handshake.spthy"]
    }
  : mode === "proverif"
    ? {
        executable: process.env.SIM_PROVERIF_EXECUTABLE ?? "proverif",
        files: ["grant-boundary.pv", "link-handshake.pv"]
      }
    : null;
if (definitions === null) throw new Error("usage: node formal/run-symbolic-provers.mjs <tamarin|proverif>");

if (mode === "tamarin" && process.env.SIM_EXPECTED_TAMARIN_VERSION !== undefined) {
  const version = run(definitions.executable, ["--version"], "Tamarin version check", timeoutMs).output;
  const expected = process.env.SIM_EXPECTED_TAMARIN_VERSION;
  if (!version.includes(`Tamarin version ${expected}`) && !version.includes(`tamarin-prover ${expected}`)) {
    throw new Error(`Tamarin version mismatch: expected ${expected}`);
  }
}

for (const file of definitions.files) {
  const path = `formal/symbolic/${file}`;
  const source = readFileSync(path, "utf8");
  if (mode === "tamarin") {
    const expected = [...source.matchAll(/^lemma\s+([A-Za-z0-9_]+)/gm)].map((match) => match[1]);
    if (expected.length === 0) throw new Error(`Tamarin model declares no lemmas: ${path}`);
    for (const lemma of expected) {
      const started = performance.now();
      const { output } = run(
        definitions.executable,
        ["--auto-sources", `--prove=${lemma}`, path],
        `Tamarin ${path} lemma ${lemma}`,
        timeoutMs
      );
      const elapsedMs = Math.round(performance.now() - started);
      const proved = new RegExp(`^\\s*${escapeRegExp(lemma)}\\s+\\([^)]*\\):\\s+verified\\b`, "m");
      if (!proved.test(output)) {
        throw new Error(`Tamarin did not verify expected lemma ${lemma} in ${path}`);
      }
      console.log(`Tamarin verified ${path}::${lemma} in ${elapsedMs}ms`);
    }
    continue;
  }

  const started = performance.now();
  const { output } = run(definitions.executable, [path], `ProVerif ${path}`, timeoutMs);
  const elapsedMs = Math.round(performance.now() - started);
  process.stdout.write(output);
  if (/is false|cannot be proved/i.test(output)) throw new Error(`ProVerif failed ${path}`);
  const expected = [...source.matchAll(/^query\s/gm)].length;
  const proved = [...output.matchAll(/^RESULT .* is true\.\s*$/gm)].length;
  if (proved !== expected) throw new Error(`ProVerif proved ${proved}/${expected} queries in ${path}`);
  console.log(`ProVerif verified ${path} (${proved} queries) in ${elapsedMs}ms`);
}

function run(executable, args, label, timeout) {
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    timeout,
    killSignal: "SIGKILL",
    maxBuffer: 64 * 1024 * 1024
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`${label} timed out after ${timeout}ms`);
  }
  if (result.error !== undefined) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} exited with status ${result.status}`);
  return { output };
}

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
