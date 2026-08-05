#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { rootFrom, safeId, soakItems } from "./common.mjs";

const defaultRoot = rootFrom(import.meta.url);

function replaceAtomic(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

function strikeRow(text, label, evidencePath) {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.startsWith("|") && line.includes(`| ${label} |`));
  if (index < 0) throw new Error(`could not find open register row for ${label}`);
  lines[index] = lines[index]
    .replace(`| ${label} |`, `| ~~${label}~~ |`)
    .replace(/\|\s*$/, `— **passed** ([evidence](${evidencePath})) |`);
  return lines.join("\n");
}

export function record({ root = defaultRoot, id, status, log, note = "", at = new Date().toISOString() }) {
  if (!["started", "passed", "failed"].includes(status)) throw new Error("status must be started, passed, or failed");
  if (!log && status !== "started") throw new Error("--log is required for passed or failed evidence");
  const generatedLog = join(root, "release/evidence-logs", `${safeId(id)}-started.log`);
  if (!log) replaceAtomic(generatedLog, `[release] id: ${id}\n[release] status: started\n[release] at: ${at}\n[release] note: ${note}\n`);
  const absoluteLog = log ? resolve(root, log) : generatedLog;
  if (!existsSync(absoluteLog)) throw new Error(`evidence log does not exist: ${absoluteLog}`);
  const logText = readFileSync(absoluteLog, "utf8");
  if (status === "passed" && /\[mac-validation\] exit: (?!0\s*$)/m.test(logText)) throw new Error("refusing to record a failed validation log as passed");
  const filename = `${safeId(id)}.json`;
  const evidenceFile = join(root, "release/evidence", filename);
  const recordValue = { schema: "twistedpear.release-evidence-v1", id, status, at, log: relative(root, absoluteLog), note };
  replaceAtomic(evidenceFile, `${JSON.stringify(recordValue, null, 2)}\n`);
  if (status !== "passed") return evidenceFile;

  const completePath = join(root, "STATUS-COMPLETE.md");
  let complete = readFileSync(completePath, "utf8");
  if (!complete.includes("## Release evidence log")) complete += "\n## Release evidence log\n\n| ID | Completed | Evidence | Note |\n|---|---|---|---|\n";
  if (!complete.includes(`| ${id} |`)) complete += `| ${id} | ${at} | [record](release/evidence/${filename}) · [log](${recordValue.log}) | ${note.replaceAll("|", "\\|")} |\n`;
  replaceAtomic(completePath, complete);

  let register;
  let label;
  if (id.startsWith("hardware:H")) {
    register = join(root, "STATUS-HARDWARE.md");
    label = id.slice("hardware:".length);
  } else if (id.startsWith("soak:")) {
    register = join(root, "STATUS-SOFTWARE.md");
    label = soakItems.find(([slug]) => slug === id.slice("soak:".length))?.[1];
  }
  if (register && label) replaceAtomic(register, strikeRow(readFileSync(register, "utf8"), label, `release/evidence/${filename}`));
  return evidenceFile;
}

function main(argv = process.argv.slice(2)) {
  const [id] = argv;
  if (!id) throw new Error("usage: release:record <id> --status <started|passed|failed> [--log <path>] [--note text]");
  const value = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  console.log(record({ id, status: value("--status"), log: value("--log"), note: value("--note") ?? "", root: value("--root") ?? defaultRoot }));
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
