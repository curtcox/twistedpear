#!/usr/bin/env node
/**
 * Clippy restriction lints over the shipped Freenet contracts.
 *
 * The `rust` gate runs clippy with `-D warnings`, but only over clippy's
 * default groups. Every lint this gate measures lives in `restriction` or
 * `pedantic`, which are off by default — so the three contracts that peers
 * agree on, that the fuzzing gate targets, and that run in wasm32 where a panic
 * aborts contract execution rather than failing a test, were checked by nothing
 * beyond ordinary clippy.
 *
 * The lints that already hold at zero are denied in each contract's Cargo.toml
 * instead, where clippy enforces them for free. This gate carries the ones with
 * a real backlog: 56 findings that are mostly hand-discipline clippy cannot
 * verify — `checked_add` on every cursor advance, `direction` validated before
 * it indexes — expressed in a form that can regress silently.
 *
 * Findings are keyed by crate, lint, file, enclosing function, and the exact
 * offending expression rather than by line, so editing inside a function does
 * not churn the baseline and moving one does not read as new. The expression is
 * load-bearing: four `indexing_slicing` findings sit on one line of
 * `decode_entries`, and without it they would be one entry that neither shrinks
 * when three are cleared nor grows when three more arrive.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  compareDiagnosticSet,
  printDiagnosticResult,
  readJson,
} from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const RULES = path.join(ROOT, "rust-lint-rules.json");
const BASELINE = path.join(ROOT, "language-ratchets/rust-lints.json");
const TOOLCHAIN = readJson(path.join(ROOT, "tool-versions.json")).tools.rust
  .version;

/**
 * The function a diagnostic sits inside, for a stable key.
 *
 * Clippy reports a span, not a symbol. Scanning back to the nearest `fn` is
 * enough here — these are flat decoder modules — and a finding that lands
 * before any `fn` keys to the file alone rather than guessing.
 *
 * @param {string[]} lines
 * @param {number} lineNumber 1-indexed
 */
export function enclosingFunction(lines, lineNumber) {
  for (
    let index = Math.min(lineNumber, lines.length) - 1;
    index >= 0;
    index -= 1
  ) {
    const match =
      /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:const\s+|async\s+|unsafe\s+|extern\s+"[^"]*"\s+)*fn\s+([A-Za-z_]\w*)/.exec(
        lines[index] ?? "",
      );
    if (match?.[1] !== undefined) return match[1];
  }
  return "<module>";
}

/**
 * The exact expression a diagnostic points at.
 *
 * Four `indexing_slicing` findings share one line in `decode_entries`, one for
 * each of `bytes[5]` through `bytes[8]`. Keying on the line would collapse them
 * into a single entry, so clearing three of the four would show no progress and
 * adding three more would show no regression. The highlight range is what tells
 * them apart, and unlike a line number it survives the code moving.
 *
 * @param {object} span
 */
export function offendingExpression(span) {
  const line = span?.text?.[0];
  if (line?.text === undefined) return null;
  const start = (line.highlight_start ?? 1) - 1;
  const end = (line.highlight_end ?? line.text.length + 1) - 1;
  const snippet = line.text.slice(start, end).trim().replace(/\s+/g, " ");
  return snippet === "" ? null : snippet;
}

/**
 * Turn one clippy JSON message into a ratchet key, or `null` when it is not a
 * measured lint.
 *
 * @param {object} message
 * @param {Set<string>} measured
 * @param {(crate: string, file: string) => string[]} readLines
 * @param {string} crate
 */
export function findingKey(message, measured, readLines, crate) {
  const code = message?.message?.code?.code;
  if (typeof code !== "string" || !measured.has(code)) return null;
  const span = (message.message.spans ?? []).find(
    (candidate) => candidate.is_primary,
  );
  if (span === undefined) return null;
  // Clippy reports paths relative to the manifest directory, not the repository
  // root. Resolving them against the root silently found no file, which sent
  // every finding to `<module>` and collapsed 56 of them into 12 entries.
  const file = span.file_name;
  const symbol = enclosingFunction(readLines(crate, file), span.line_start);
  const expression = offendingExpression(span);
  return [crate, code, file, symbol, expression]
    .filter((part) => part !== null)
    .join(":");
}

function clippyMessages(crate, lints) {
  const manifest = path.join(ROOT, crate, "Cargo.toml");
  const result = spawnSync(
    "rustup",
    [
      "run",
      TOOLCHAIN,
      "cargo",
      "clippy",
      "--manifest-path",
      manifest,
      // Shipped code only. A test that indexes a fixture it just built is not
      // what runs in wasm32, and counting it would bury the findings that are.
      "--lib",
      "--message-format=json",
      "--",
      ...lints.flatMap((lint) => ["-W", lint]),
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.error !== undefined) {
    throw new Error(
      `clippy failed to start for ${crate}: ${result.error.message}`,
    );
  }
  // A compile error yields no diagnostics for these lints and would otherwise
  // read as a clean crate.
  if (/^error(\[|:)/m.test(result.stderr ?? "")) {
    throw new Error(
      `clippy could not compile ${crate}:\n${(result.stderr ?? "").split("\n").slice(0, 20).join("\n")}`,
    );
  }
  return (result.stdout ?? "")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const allowRegressions = argv.includes("--allow-regressions");
  const rules = readJson(RULES);
  const measured = new Set(rules.ratcheted);
  const lintFlags = rules.ratcheted;

  const cache = new Map();
  const readLines = (crate, file) => {
    const key = `${crate}/${file}`;
    if (!cache.has(key)) {
      const absolute = path.isAbsolute(file)
        ? file
        : path.join(ROOT, crate, file);
      cache.set(
        key,
        fs.existsSync(absolute)
          ? fs.readFileSync(absolute, "utf8").split(/\r?\n/)
          : [],
      );
    }
    return cache.get(key);
  };

  const current = [];
  const perCrate = {};
  for (const crate of rules.crates) {
    const messages = clippyMessages(crate, lintFlags);
    const keys = messages
      .map((message) => findingKey(message, measured, readLines, crate))
      .filter((key) => key !== null);
    perCrate[crate] = keys.length;
    current.push(...keys);
  }

  // Every contract must yield diagnostics for at least one measured lint or
  // report a genuine zero. A crate that silently stops being compiled — a
  // renamed directory, a manifest that no longer builds — would otherwise
  // retire its findings and look like progress.
  for (const crate of rules.crates) {
    if (!fs.existsSync(path.join(ROOT, crate, "Cargo.toml"))) {
      console.error(`  ${crate}: no Cargo.toml; the crate list is stale`);
      process.exit(1);
    }
  }

  const result = compareDiagnosticSet({
    root: ROOT,
    baselineFile: BASELINE,
    current,
    write,
    allowRegressions,
    description:
      "clippy restriction findings in the shipped Freenet contracts; entries may only disappear. Policy in rust-lint-rules.json.",
    envName: "RUST_LINTS_BASE_REF",
  });

  if (result.wrote) {
    console.log(
      `rust-lints: recorded ${current.length} finding(s) across ${rules.crates.length} crate(s).`,
    );
    return;
  }

  const artifact = path.join(ROOT, "artifacts/checks/rust-lints-detail.json");
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(
    artifact,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        toolchain: TOOLCHAIN,
        total: current.length,
        perCrate,
        additions: result.additions,
        stale: result.stale,
      },
      null,
      2,
    )}\n`,
  );

  const ok = printDiagnosticResult("rust-lints", result);
  console.log(
    `rust-lints: ${current.length} finding(s) across ${rules.crates.length} crate(s), ${measured.size} lint(s) measured.`,
  );
  process.exit(ok ? 0 : 1);
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
