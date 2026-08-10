#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { installOrder, survey } from "./requirements.mjs";

const USAGE = `
npm run tools:install [-- --dry-run] [--tier=pr|nightly] [--only=<token,token>]

Installs the external tools the gates need and this machine does not have, in
dependency order. Prints every command before running it.

  --dry-run   print the commands and change nothing
  --only      restrict to named requirements

Commands that need elevation (apt-get) are printed with sudo and will prompt.
Nothing is installed for a requirement with no recipe on this platform; the
doctor names those so they can be handled by hand.
`;

/**
 * @param {string[][]} commands
 * @param {{ dryRun: boolean }} options
 * @returns {{ ok: boolean; failedAt?: string[] }}
 */
export function runCommands(commands, options) {
  for (const command of commands) {
    console.log(`  $ ${command.join(" ")}`);
    if (options.dryRun) continue;
    const result = spawnSync(command[0], command.slice(1), {
      stdio: "inherit",
      encoding: "utf8",
    });
    if (result.status !== 0) return { ok: false, failedAt: command };
  }
  return { ok: true };
}

/**
 * @param {string[]} argv
 * @returns {{ dryRun: boolean; tier: string; only: string[] }}
 */
export function parse(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    tier: argv.find((arg) => arg.startsWith("--tier="))?.split("=")[1] ?? "pr",
    only: (argv.find((arg) => arg.startsWith("--only="))?.split("=")[1] ?? "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean),
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(USAGE.trim());
    return;
  }
  const { dryRun, tier, only } = parse(argv);
  let reports = survey({ tier });
  if (only.length > 0)
    reports = reports.filter((report) => only.includes(report.token));

  const ordered = installOrder(reports);
  if (ordered.length === 0) {
    console.log("Every required tool is already present.");
    return;
  }

  const installable = ordered.filter((report) => report.install.length > 0);
  const manual = ordered.filter((report) => report.install.length === 0);

  if (dryRun) console.log("(dry run — nothing will be installed)\n");
  let failed = 0;
  for (const report of installable) {
    console.log(`${report.token} — ${report.why}`);
    const result = runCommands(report.install, { dryRun });
    if (!result.ok) {
      failed += 1;
      console.error(
        `  failed: ${result.failedAt?.join(" ")}\n  install ${report.token} by hand${
          report.manual ? ` — ${report.manual}` : ""
        }`,
      );
    }
  }

  for (const report of manual) {
    console.log(
      `${report.token} — no recipe for ${process.platform}${
        report.manual ? `; ${report.manual}` : ""
      }`,
    );
  }

  if (dryRun) return;

  // Re-probe rather than trusting the exit codes: a package manager can report
  // success for a formula that does not put the binary on PATH.
  const after = survey({ tier }).filter((report) =>
    ordered.some((entry) => entry.token === report.token),
  );
  const stillMissing = after.filter((report) => !report.present);
  console.log("");
  console.log(
    stillMissing.length === 0
      ? `Installed ${installable.length} tool(s); every requirement is now present.`
      : `Still missing: ${stillMissing.map((report) => report.token).join(", ")}`,
  );
  if (stillMissing.length > 0 || failed > 0) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
