/** Usage text for `npm run validate:mac`, kept out of the runner so the entry
 * point stays an orchestrator (see size-rules.json guidance for scripts). */
export const USAGE = `Usage: npm run validate:mac -- [options]

Runs the local validation plan from docs/mac-validation.md with per-command logs.

Default: doctor + Stages 1-5 (build/unit, Docker interop, distribution/runtime,
web host, desktop host).

Options:
  --full                    Run Stages 1-8, including iOS, Android, and default soaks.
  --stage N[,M]             Run one or more stages.
  --from N --through M      Run a contiguous stage range.
  --plan-duration           Use the long Stage 8 soak durations from the plan.
  --no-caffeinate           Do not keep macOS awake during --plan-duration Stage 8.
  --ai                      Pass --ai to doctor for live API key checks.
  --skip-doctor             Skip the Stage 0 gate.
  --continue-on-failure     Run remaining commands after a failure.
  --resume                  Skip commands whose log in --log-dir already exited 0.
  --dry-run                 Print commands without executing.
  --list                    Show stages and command counts.
  --log-dir PATH            Override log directory.
  --start-android-emulator  Start Pixel_8_API_34 before Stage 7.

Stopping and restarting a plan-duration Stage 8:

  npm run release:start-soaks           # start detached, with a watcher
  npm run release:soak-status           # progress, ETA, failures
  npm run release:resume-soaks          # continue after an interruption
`;

export function printHelp() {
  console.log(USAGE);
}
