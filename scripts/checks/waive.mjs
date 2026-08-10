#!/usr/bin/env node
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { gateById } from "./registry.mjs";
import { MAX_WAIVER_DAYS, WAIVERS_FILE, readWaivers } from "./status.mjs";

const USAGE = `
npm run checks:waive -- --gate=<id> --reason="<why>" [--days=14] [--by=<name>]
npm run checks:waive -- --list
npm run checks:waive -- --revoke=<id>

A waiver exempts one red gate from the green-gate rule for a bounded time. It
does not make the gate green: the failure stays visible in release:status and
work:audit, and when the waiver expires the soak guard refuses again.
`;

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
function parse(argv) {
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [name, ...rest] = arg.slice(2).split("=");
    flags[name] = rest.length > 0 ? rest.join("=") : true;
  }
  return flags;
}

/**
 * @param {Date} now
 * @param {number} days
 * @returns {string}
 */
function isoDay(now, days = 0) {
  return new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * @param {string} root
 * @param {import("./status.mjs").Waiver[]} waivers
 */
function save(root, waivers) {
  const file = join(root, WAIVERS_FILE);
  const sorted = [...waivers].sort((a, b) =>
    a.gate === b.gate
      ? a.expires < b.expires
        ? -1
        : 1
      : a.gate < b.gate
        ? -1
        : 1,
  );
  writeFileSync(
    file,
    `${JSON.stringify({ version: 1, waivers: sorted }, null, 2)}\n`,
  );
}

/**
 * @param {string[]} argv
 * @param {string} root
 * @param {Date} now
 * @returns {{ ok: boolean; message: string }}
 */
export function apply(argv, root = repoRoot(), now = new Date()) {
  const flags = parse(argv);
  const waivers = readWaivers(root);

  if (flags.list) {
    if (waivers.length === 0)
      return { ok: true, message: "no waivers on file" };
    return {
      ok: true,
      message: waivers
        .map(
          (waiver) =>
            `${waiver.gate}  expires ${waiver.expires}  ${waiver.reason}`,
        )
        .join("\n"),
    };
  }

  if (typeof flags.revoke === "string") {
    const remaining = waivers.filter((waiver) => waiver.gate !== flags.revoke);
    if (remaining.length === waivers.length)
      return { ok: false, message: `no waiver on file for "${flags.revoke}"` };
    save(root, remaining);
    return { ok: true, message: `revoked the waiver for ${flags.revoke}` };
  }

  const gate = typeof flags.gate === "string" ? flags.gate : "";
  const reason = typeof flags.reason === "string" ? flags.reason.trim() : "";
  const days = Number.parseInt(String(flags.days ?? "14"), 10);

  if (!gate) return { ok: false, message: `--gate is required\n${USAGE}` };
  if (!gateById(gate))
    return { ok: false, message: `"${gate}" is not a gate in the registry` };
  // The reason is the whole point: an exemption nobody has to justify is a
  // disabled check with extra steps.
  if (reason.length < 10)
    return {
      ok: false,
      message: `--reason must say why the gate cannot be fixed now (at least 10 characters)`,
    };
  if (!Number.isInteger(days) || days < 1 || days > MAX_WAIVER_DAYS)
    return {
      ok: false,
      message: `--days must be between 1 and ${MAX_WAIVER_DAYS}`,
    };

  const waiver = {
    gate,
    reason,
    recorded: isoDay(now),
    expires: isoDay(now, days),
    ...(typeof flags.by === "string" ? { by: flags.by } : {}),
  };
  save(root, [...waivers.filter((one) => one.gate !== gate), waiver]);
  return {
    ok: true,
    message: `waived ${gate} until ${waiver.expires}: ${reason}`,
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes("--help")) {
    console.log(USAGE.trim());
    return;
  }
  const root = repoRoot();
  if (!existsSync(join(root, WAIVERS_FILE)))
    writeFileSync(
      join(root, WAIVERS_FILE),
      `${JSON.stringify({ version: 1, waivers: [] }, null, 2)}\n`,
    );
  const result = apply(argv, root);
  console.log(result.message);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
