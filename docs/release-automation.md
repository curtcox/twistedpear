# Release automation


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

The v1 pipeline in [RELEASE-PLAN.md](../RELEASE-PLAN.md) is driven by committed evidence, not
by manually interpreting the plan.

## Session entry point

Run `npm run release:status`. It prints G1–G7, the active stage, and exactly one next action.
`--json` emits the same state for CI or other automation. A failed unattended wait always
preempts the normal stage sequence. The driver reads the latest Stage-8 watcher summary and
the newest `ci:*` structured evidence record; either failure restores the standing invariant
before the serial stage sequence continues.

## Soak monitoring

Start the plan-duration suite with `npm run release:start-soaks`. It creates a deterministic
log directory, records `soaks:plan-duration`, starts the watcher, and then runs the canonical
Mac validation Stage 8 in the foreground. Use `-- --dry-run` to inspect it without starting.

`npm run release:watch-soaks -- [log-directory]` scans Stage-8 mac-validation logs, classifies
failures, and writes `soak-triage/status.json`. Each failed log gets a minimal reproducer Markdown
file. Add `--watch` to rescan every five seconds. Without a directory it uses the newest
`.tmp/mac-validation` run.

## Evidence recording

Use one command for every wait or register row:

```sh
npm run release:record -- soak:transport-node --status started --log path/to/start.log
npm run release:record -- soak:transport-node --status passed --log path/to/completed.log
npm run release:record -- hardware:H1 --status passed --log path/to/device-session.log --note "Pixel 6a"
npm run release:record -- baseline:S1 --status passed --log path/to/green-baseline.log
npm run release:record -- account:H12 --status started --note "Enrollment submitted"
```

When the single Stage-8 runner is started, record `soaks:plan-duration` once; the driver treats
that as the queued start of all eight serial commands. Individual `soak:*` pass records are still
required for G1.

Records live in `release/evidence/`. Passing soak and H-row records append to
`STATUS-COMPLETE.md` and strike their open canonical-register row. The recorder refuses a
mac-validation log with a nonzero exit code when `--status passed` is requested.
For a `started` record, `--log` is optional: the recorder creates a timestamped attestation log.

Other IDs used by the driver are documented by `npm run release:status -- --json`; notably the
S2 starts are `account:H12`, `hardware:ordered`, and `hardware:H20-run`, while stage/gate and
human-session records use `stage:S3`, `gate:G4`–`gate:G6`, `stage:S6`,
`human:S6-round-1`, and `human:S7-round-2`.

## H20 unattended node run

On the dedicated Linux box, build the checkout once and run:

```sh
npm run build
npm run release:h20 -- start
```

The launcher starts `tp node --propagation --status-endpoint`, records
`hardware:H20-run`, and detaches an hourly monitor. Each sample captures localhost status plus
Linux process RSS. After fourteen days the verifier requires uninterrupted samples, monotonic
node uptime, the propagation role online, and measurements for RSS, path-table size, store bytes,
message count, and evictions. It then records `hardware:H20` and writes the measured summary used
for LIMITATIONS §9. A failed sample records a failed wait, which preempts the release driver.

Use `npm run release:h20 -- sample` for a manual probe or `npm run release:h20 -- verify` to
verify already-collected evidence. Shorter `--duration-ms` and `--interval-ms` values exist only
for test rehearsals and do not satisfy the canonical H20 duration unless the resulting record is
removed and the full run completed.
