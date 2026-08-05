#!/usr/bin/env node
/**
 * Classify every tracked source file by size against size-rules.json.
 *
 * Writes file-sizes.json: per-file lines/bytes/longest-line plus per-rule
 * aggregates and a ranked list of offenders. Always exits 0 — the gate lives
 * in scripts/size-ratchet.mjs so the inventory can be published even when the
 * ratchet fails.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULES_PATH = path.join(ROOT, "size-rules.json");
const OUTPUT_PATH = path.join(ROOT, "file-sizes.json");

/**
 * Translate a glob to a RegExp. Supports `**`, `*`, `?`, and `{a,b}`.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**/` matches zero or more path segments; a bare `**` matches anything.
        if (glob[i + 2] === "/") {
          out += "(?:[^/]*/)*";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (c === "?") {
      out += "[^/]";
    } else if (c === "{") {
      const end = glob.indexOf("}", i);
      if (end === -1) {
        out += "\\{";
      } else {
        const alts = glob.slice(i + 1, end).split(",");
        out += `(?:${alts.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`;
        i = end;
      }
    } else {
      out += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`);
}

/**
 * @param {string[]} globs
 * @returns {(rel: string) => boolean}
 */
function matcher(globs) {
  const res = globs.map(globToRegExp);
  return (rel) => res.some((re) => re.test(rel));
}

/**
 * Tracked files plus untracked ones that gitignore does not exclude, so a file
 * written but not yet staged is classified on a local run.
 *
 * @returns {string[]} repo-relative POSIX paths
 */
function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    console.error(result.stderr || "git ls-files failed");
    process.exit(1);
  }
  return (result.stdout || "").split("\0").filter(Boolean);
}

/**
 * @param {string} abs
 * @returns {{ lines: number, bytes: number, maxLineLength: number, binary: boolean }}
 */
function measure(abs) {
  const buf = fs.readFileSync(abs);
  if (buf.includes(0)) {
    return { lines: 0, bytes: buf.length, maxLineLength: 0, binary: true };
  }
  const text = buf.toString("utf8");
  let lines = 0;
  let maxLineLength = 0;
  let current = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      lines++;
      if (current > maxLineLength) maxLineLength = current;
      current = 0;
    } else {
      current++;
    }
  }
  if (current > 0) {
    lines++;
    if (current > maxLineLength) maxLineLength = current;
  }
  return { lines, bytes: buf.length, maxLineLength, binary: false };
}

/**
 * Thresholds for a rule, with per-rule overrides falling back to defaults.
 * `null` disables a dimension; `undefined` inherits.
 *
 * @param {Record<string, any>} rule
 * @param {Record<string, any>} defaults
 */
export function thresholdsFor(rule, defaults) {
  const pick = (key) => (rule[key] === undefined ? defaults[key] : rule[key]);
  const budget = pick("bytesPerLineBudget");
  return {
    warnLines: rule.warnLines,
    dangerLines: rule.dangerLines,
    warnMaxLineLength: pick("warnMaxLineLength"),
    dangerMaxLineLength: pick("dangerMaxLineLength"),
    // Bytes catch files that stay inside the line budget while carrying an
    // outsized payload (long lines, embedded data) — derived from the line
    // thresholds unless a rule states them outright.
    warnBytes: rule.warnBytes === undefined && budget != null ? rule.warnLines * budget : pick("warnBytes"),
    dangerBytes:
      rule.dangerBytes === undefined && budget != null ? rule.dangerLines * budget : pick("dangerBytes")
  };
}

/**
 * @param {{ lines: number, bytes: number, maxLineLength: number }} m
 * @param {ReturnType<typeof thresholdsFor>} t
 */
function classify(m, t) {
  /** @type {string[]} */
  const reasons = [];
  let status = "ok";

  /** @param {"warn"|"danger"} level @param {string} reason */
  const flag = (level, reason) => {
    if (level === "danger") status = "danger";
    else if (status === "ok") status = "warn";
    reasons.push(reason);
  };

  if (m.lines > t.dangerLines) flag("danger", `lines ${m.lines} > ${t.dangerLines}`);
  else if (m.lines > t.warnLines) flag("warn", `lines ${m.lines} > ${t.warnLines}`);

  if (t.dangerBytes != null && m.bytes > t.dangerBytes) {
    flag("danger", `bytes ${m.bytes} > ${t.dangerBytes}`);
  } else if (t.warnBytes != null && m.bytes > t.warnBytes) {
    flag("warn", `bytes ${m.bytes} > ${t.warnBytes}`);
  }

  if (t.dangerMaxLineLength != null && m.maxLineLength > t.dangerMaxLineLength) {
    flag("danger", `longest line ${m.maxLineLength} > ${t.dangerMaxLineLength}`);
  } else if (t.warnMaxLineLength != null && m.maxLineLength > t.warnMaxLineLength) {
    flag("warn", `longest line ${m.maxLineLength} > ${t.warnMaxLineLength}`);
  }

  return { status, reasons };
}

export function buildInventory() {
  const config = JSON.parse(fs.readFileSync(RULES_PATH, "utf8"));
  const defaults = config.defaults ?? {};
  const isExempt = matcher(config.exempt ?? []);
  const rules = config.rules.map((rule) => ({
    rule,
    matches: matcher(rule.include),
    thresholds: thresholdsFor(rule, defaults)
  }));

  /** @type {any[]} */
  const files = [];
  /** @type {any[]} */
  const exempt = [];

  for (const rel of trackedFiles()) {
    const abs = path.join(ROOT, rel);
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch {
      continue; // tracked but missing in the working tree
    }
    if (!stat.isFile()) continue;

    const entry = rules.find(({ matches }) => matches(rel));
    if (!entry) continue;

    if (isExempt(rel)) {
      exempt.push({ file: rel, rule: entry.rule.id, bytes: stat.size });
      continue;
    }

    const m = measure(abs);
    if (m.binary) {
      exempt.push({ file: rel, rule: entry.rule.id, bytes: m.bytes, binary: true });
      continue;
    }

    const { status, reasons } = classify(m, entry.thresholds);
    const excessLines =
      status === "danger" ? Math.max(0, m.lines - entry.thresholds.dangerLines) : 0;
    files.push({
      file: rel,
      rule: entry.rule.id,
      lines: m.lines,
      bytes: m.bytes,
      maxLineLength: m.maxLineLength,
      status,
      reasons,
      excessLines,
      dangerLines: entry.thresholds.dangerLines
    });
  }

  files.sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file));

  const byRule = config.rules.map((rule) => {
    const matched = files.filter((f) => f.rule === rule.id);
    const lines = matched.map((f) => f.lines).sort((a, b) => a - b);
    const pct = (q) => (lines.length ? lines[Math.min(lines.length - 1, Math.floor(q * lines.length))] : 0);
    return {
      id: rule.id,
      title: rule.title,
      thresholds: thresholdsFor(rule, defaults),
      guidance: rule.guidance ?? null,
      count: matched.length,
      ok: matched.filter((f) => f.status === "ok").length,
      warn: matched.filter((f) => f.status === "warn").length,
      danger: matched.filter((f) => f.status === "danger").length,
      totalLines: matched.reduce((sum, f) => sum + f.lines, 0),
      excessLines: matched.reduce((sum, f) => sum + f.excessLines, 0),
      medianLines: pct(0.5),
      p90Lines: pct(0.9),
      maxLines: lines.length ? lines[lines.length - 1] : 0
    };
  });

  const danger = files.filter((f) => f.status === "danger");
  const excessLines = danger.reduce((sum, f) => sum + f.excessLines, 0);
  /** @type {Map<string, number>} */
  const areaMap = new Map();
  for (const f of danger) {
    const area = areaFor(f.file);
    areaMap.set(area, (areaMap.get(area) ?? 0) + f.excessLines);
  }
  const byArea = [...areaMap.entries()]
    .map(([area, excess]) => ({
      area,
      excessLines: excess,
      share: excessLines > 0 ? excess / excessLines : 0
    }))
    .sort((a, b) => b.excessLines - a.excessLines || a.area.localeCompare(b.area));

  return {
    generatedAt: new Date().toISOString(),
    rulesVersion: config.version,
    totals: {
      classified: files.length,
      exempt: exempt.length,
      ok: files.filter((f) => f.status === "ok").length,
      warn: files.filter((f) => f.status === "warn").length,
      danger: danger.length,
      totalLines: files.reduce((sum, f) => sum + f.lines, 0),
      excessLines
    },
    byRule,
    byArea,
    danger,
    warn: files.filter((f) => f.status === "warn"),
    files,
    exempt: exempt.sort((a, b) => a.file.localeCompare(b.file))
  };
}

/**
 * Top-level package/app path for burndown charts (`packages/protocol`,
 * `apps/harness-mobile`). Docs and other roots collapse to their first segment.
 *
 * @param {string} rel
 */
export function areaFor(rel) {
  const parts = rel.split("/");
  if (parts[0] === "packages" || parts[0] === "apps") {
    return parts.slice(0, 2).join("/");
  }
  return parts[0] ?? rel;
}

function main() {
  const inventory = buildInventory();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(inventory, null, 2)}\n`);

  const t = inventory.totals;
  console.log(
    `File sizes: ${t.classified} classified, ${t.ok} ok, ${t.warn} warn, ${t.danger} danger, ${t.excessLines.toLocaleString("en-US")} excess lines (${t.exempt} exempt)`
  );
  for (const r of inventory.byRule) {
    console.log(
      `  ${r.id.padEnd(11)} n=${String(r.count).padStart(4)} median=${String(r.medianLines).padStart(5)} p90=${String(r.p90Lines).padStart(5)} max=${String(r.maxLines).padStart(6)} warn=${r.warn} danger=${r.danger} (warn>${r.thresholds.warnLines}, danger>${r.thresholds.dangerLines} lines)`
    );
  }
  if (inventory.danger.length > 0) {
    console.log("\nOver the danger threshold:");
    for (const f of inventory.danger) {
      console.log(`  ${String(f.lines).padStart(6)}  [${f.rule}] ${f.file} — ${f.reasons.join("; ")}`);
    }
  }
  console.log(`\nWrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
