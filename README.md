# CI telemetry store

Machine-written. One commit per completed Actions run.

- `index.ndjson` — one JSON line per run: wall time, runner minutes,
  multiplier-weighted minutes, billable milliseconds, queue wait.
- `runs/<workflow>/<run>-<attempt>.json` — per-job and per-step timings
  plus the resource summary each job's sampler recorded.
- `samples/<workflow>/<run>/` — the raw sampler series behind those
  summaries, one NDJSON file per job.

Written by `scripts/ci/collect-run.mjs` from the `CI telemetry` workflow.
Published, with charts, at https://curtcox.github.io/twistedpear/results/ci/.
