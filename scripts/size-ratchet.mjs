#!/usr/bin/env node
/**
 * File-size ratchet gate:
 * (a) any file at `danger` that is NOT grandfathered in size-ratchet.json → fail
 * (b) a grandfathered file that grew past its recorded size → fail
 * (c) the grandfathered list grows vs. the committed baseline → fail
 * Shrinking a grandfathered file, or dropping it from the list, is always allowed.
 *
 * `--write` rewrites size-ratchet.json from the current inventory. It refuses to
 * add files or raise recorded sizes unless `--allow-regressions` is also passed,
 * so the normal use is tightening the baseline after a decomposition.
 * `--strict-stale` turns stale entries from a warning into a failure.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildInventory } from "./size-inventory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RATCHET_PATH = path.join(ROOT, "size-ratchet.json");
const INVENTORY_PATH = path.join(ROOT, "file-sizes.json");

const DESCRIPTION =
  "File-size ratchet. Files listed here were already over the size-rules.json danger threshold when the gate was introduced; they are allowed to stay, but may only shrink. CI fails if a file not listed here reaches danger, if a listed file grows past its recorded size, or if this list grows. Decompose and remove entries — never add them.";

/** @param {string} ref @returns {boolean} */
function refExists(ref) {
  return (
    spawnSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
      cwd: ROOT,
      encoding: "utf8"
    }).status === 0
  );
}

/**
 * The commit to compare the grandfathered list against. On a pull request `HEAD`
 * is the merge commit and already contains the proposed baseline, so comparing
 * to it would never detect growth — prefer the base branch.
 *
 * @returns {string|null}
 */
function baseRef() {
  const candidates = [
    process.env.SIZE_RATCHET_BASE_REF,
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null,
    "origin/main",
    "HEAD~1",
    "HEAD"
  ].filter(Boolean);
  return candidates.find(refExists) ?? null;
}

/** @param {string} ref @param {string} rel @returns {any|null} */
function fileAtRef(ref, rel) {
  const result = spawnSync("git", ["show", `${ref}:${rel}`], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0 || !result.stdout) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

/** @param {any} ratchet @returns {Map<string, any>} */
function indexEntries(ratchet) {
  return new Map((ratchet?.entries ?? []).map((e) => [e.file, e]));
}

/** @param {any[]} entries */
function writeRatchet(entries) {
  const payload = {
    version: 1,
    description: DESCRIPTION,
    entries: [...entries].sort((a, b) => a.file.localeCompare(b.file))
  };
  fs.writeFileSync(RATCHET_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

/** @param {any} f */
function entryFor(f) {
  return {
    file: f.file,
    rule: f.rule,
    lines: f.lines,
    bytes: f.bytes,
    maxLineLength: f.maxLineLength
  };
}

/**
 * A grandfathered file regressed if any measured dimension exceeds what the
 * baseline recorded. Missing baseline fields are treated as unconstrained so an
 * older baseline format never fails spuriously.
 *
 * @param {any} current @param {any} baseline
 * @returns {string[]}
 */
function regressions(current, baseline) {
  const out = [];
  for (const key of ["lines", "bytes", "maxLineLength"]) {
    if (typeof baseline[key] === "number" && current[key] > baseline[key]) {
      out.push(`${key} ${baseline[key]} → ${current[key]}`);
    }
  }
  return out;
}

function main() {
  const write = process.argv.includes("--write");
  const allowRegressions = process.argv.includes("--allow-regressions");
  const strictStale = process.argv.includes("--strict-stale");

  const inventory = buildInventory();
  fs.writeFileSync(INVENTORY_PATH, `${JSON.stringify(inventory, null, 2)}\n`);

  const danger = inventory.danger;
  const dangerByFile = new Map(danger.map((f) => [f.file, f]));

  if (!fs.existsSync(RATCHET_PATH)) {
    if (!write) {
      console.error(
        `File-size ratchet: ${path.relative(ROOT, RATCHET_PATH)} is missing. Create it with \`npm run sizes:baseline -- --allow-regressions\`.`
      );
      process.exit(1);
    }
    writeRatchet(danger.map(entryFor));
    console.log(`File-size ratchet: wrote baseline with ${danger.length} grandfathered files.`);
    return;
  }

  const ratchet = JSON.parse(fs.readFileSync(RATCHET_PATH, "utf8"));
  const entries = indexEntries(ratchet);

  const unlisted = danger.filter((f) => !entries.has(f.file));
  const grown = [];
  const stale = [];
  for (const [file, baseline] of entries) {
    const current = dangerByFile.get(file) ?? inventory.files.find((f) => f.file === file);
    if (!current) {
      stale.push({ file, reason: "no longer tracked or now exempt" });
      continue;
    }
    if (current.status !== "danger") {
      stale.push({ file, reason: `now ${current.status} at ${current.lines} lines` });
      continue;
    }
    const regressed = regressions(current, baseline);
    if (regressed.length > 0) grown.push({ file, regressed, current });
  }

  if (write) {
    const next = [];
    const added = [];
    for (const f of danger) {
      const baseline = entries.get(f.file);
      if (!baseline) {
        added.push(f.file);
        next.push(entryFor(f));
        continue;
      }
      // Keep the tighter of the two on every dimension.
      next.push({
        file: f.file,
        rule: f.rule,
        lines: Math.min(f.lines, baseline.lines ?? f.lines),
        bytes: Math.min(f.bytes, baseline.bytes ?? f.bytes),
        maxLineLength: Math.min(f.maxLineLength, baseline.maxLineLength ?? f.maxLineLength)
      });
    }

    const wouldRegress = added.length > 0 || grown.length > 0;
    if (wouldRegress && !allowRegressions) {
      console.error("File-size ratchet: refusing to write a baseline that loosens the gate.");
      for (const f of added) console.error(`  + ${f} (newly over the danger threshold)`);
      for (const g of grown) console.error(`  ~ ${g.file} (${g.regressed.join(", ")})`);
      console.error("Decompose the file, or re-run with --allow-regressions if this is intentional.");
      process.exit(1);
    }

    writeRatchet(next);
    console.log(
      `File-size ratchet: wrote ${next.length} entries (${added.length} added, ${stale.length} dropped).`
    );
    return;
  }

  let failed = false;

  if (unlisted.length > 0) {
    failed = true;
    console.error("File-size ratchet: files over the danger threshold and not grandfathered:");
    for (const f of unlisted) {
      console.error(`  ${f.file} [${f.rule}] — ${f.reasons.join("; ")}`);
    }
    console.error("Decompose the file. See docs/file-sizes.md for the thresholds and rationale.");
  }

  if (grown.length > 0) {
    failed = true;
    console.error("File-size ratchet: grandfathered files grew (they may only shrink):");
    for (const g of grown) {
      console.error(`  ${g.file} — ${g.regressed.join(", ")}`);
    }
  }

  const base = baseRef();
  const previous = base ? fileAtRef(base, "size-ratchet.json") : null;
  if (previous) {
    const previousFiles = new Set((previous.entries ?? []).map((e) => e.file));
    const addedToList = [...entries.keys()].filter((f) => !previousFiles.has(f)).sort();
    if (addedToList.length > 0) {
      failed = true;
      console.error(
        `File-size ratchet: the grandfathered list grew vs. ${base} (only shrinkage allowed):`
      );
      for (const f of addedToList) console.error(`  + ${f}`);
      console.error("Decompose the file instead of adding it to the baseline.");
    }
  }

  if (stale.length > 0) {
    console.warn("File-size ratchet: stale entries (run `npm run sizes:baseline` to drop them):");
    for (const s of stale) console.warn(`  - ${s.file} (${s.reason})`);
    if (strictStale) failed = true;
  }

  const t = inventory.totals;
  console.log(
    `File-size ratchet: ${t.classified} files classified, ${t.warn} warn, ${t.danger} danger, ${entries.size} grandfathered, ${unlisted.length} unlisted, ${grown.length} grown, ${stale.length} stale`
  );
  console.log(
    previous
      ? `Baseline growth checked against ${base}.`
      : "Baseline growth not checked (no comparable baseline in git history)."
  );

  if (failed) process.exit(1);
}

main();
