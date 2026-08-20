# TwistedPear — Remaining software work

<!-- tp-doc
lifecycle: live
audited: 2026-08-19
register: software
-->

This is the canonical backlog for work that can be completed without new devices,
a paid account, or a real multi-machine network. It contains only open work.
The one exception is the [blocked backlog](#blocked-backlog) at the end, which
carries plan work whose external prerequisite has not arrived yet.

- Completed and reproducible work: [STATUS-COMPLETE.md](STATUS-COMPLETE.md)
- Device-, account-, and real-network-gated work: [STATUS-HARDWARE.md](STATUS-HARDWARE.md)
- Original milestone design: [archive/design/plan-v0.md](archive/design/plan-v0.md)

Short CI and nightly runs already exercise every soak path below. The open criterion is
the full planned duration, not basic implementation.

Last consolidated: 2026-07-31.

## Release qualification

| ID             | Status | Item                         | Current evidence                                                    | Completion criterion                                                                      |
| -------------- | ------ | ---------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| RQ-LINK        | open   | Link keepalive soak          | Short and nightly tiers pass via `npm run test:link-soak`           | Run 1 h with `LINK_SOAK_DURATION_MS=3600000`                                              |
| RQ-TRANSPORT   | open   | Transport-node soak          | Short and nightly tiers pass via `npm run test:transport-node-soak` | Run 72 h with `TRANSPORT_SOAK_DURATION_MS=259200000`                                      |
| RQ-INTEGRATION | open   | Interface integration soak   | Short and nightly tiers pass via `npm run test:integration-soak`    | Run 24 h with `SOAK_DURATION_MS=86400000`                                                 |
| RQ-DIST        | open   | Distribution seeder soak     | Short and nightly tiers pass via `npm run test:dist-soak`           | Run 24 h with `SOAK_DURATION_MS=86400000`                                                 |
| RQ-MIXED       | open   | Mixed-network soak           | Short and nightly tiers pass via `npm run test:mixed-network-soak`  | Run 24 h with `SOAK_DURATION_MS=86400000`                                                 |
| RQ-MINIAPP     | open   | Mini-app runtime soak        | Short and nightly tiers pass via `npm run test:miniapp-soak`        | Run 24 h with `SOAK_DURATION_MS=86400000`                                                 |
| RQ-IOS         | open   | iOS simulator soak           | Short and nightly tiers pass via `npm run test:ios-soak:required`   | Run 24 h with `SOAK_DURATION_MS=86400000 IOS_LIFECYCLE_CYCLES=100`                        |
| RQ-DESKTOP     | open   | Desktop host soak            | Short and nightly tiers pass via `npm run test:desktop-soak`        | Run 72 h with `SOAK_DURATION_MS=300000 DESKTOP_SOAK_CYCLES=864`                           |
| RQ-RETICULUM   | open   | `reticulum-ts` 0.1.0 release | Package remains at `0.0.0`; CI-tier hardening is complete           | Tag and publish after the 72 h transport soak; update [LIMITATIONS.md](LIMITATIONS.md) §1 |

Use the plan-duration Stage 8 runner rather than starting the soaks individually:

```sh
npm run validate:mac -- --stage 8 --plan-duration
```

The exact manual commands, monitoring criteria, and CI dispatch inputs live in
[the Mac validation runbook](docs/mac-validation.md#stage-8--soaks-tiered) and
[CI policy](docs/ci-policy.md#nightly-schedule-nightlyyml).

## Backlog

Tracked work that is not a release-qualification soak. Add rows with
`npm run work:add` rather than by hand — the classification, prerequisites, and
verification command for each ID live in [work/metadata.json](work/metadata.json),
and `npm run work:next` picks the next item from this table. See
[work tracking](docs/work-tracking.md).

| ID              | Status | Item                                                             | Evidence | Verify                                                           |
| --------------- | ------ | ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| GUIDA-SAMPLES   | open   | Guida source variants for every cookbook and example sample      | —        | `npm run test:guida-parity`                                      |
| GUIDA-VECTORS   | open   | Guida SDK binding replay of SPEC-SDK call vectors                | —        | `vitest run packages/guida-twistedpear/test/sdk-vectors.test.ts` |
| GUIDA-MEASURE   | open   | Publish in-repo Guida hello size and latency next to the JS twin | —        | `npm run test:budgets`                                           |
| GUIDA-DEVSTUDIO | open   | On-device Guida compiling in DevStudio                           | —        | `npm test -- packages/miniapp-runtime/test`                      |

## Blocked backlog

Tracked plan work that cannot start until an external prerequisite arrives —
repository administration, signing credentials, authorization for an
irreversible public write, or a physical device. Each row names the prerequisite
in [work/resources.json](work/resources.json), so `npm run work:list` shows it as
blocked and `npm run work:unblocked` never proposes it; the day a token flips,
every row waiting on it becomes actionable at once.

Device-gated **evidence campaigns** stay in
[STATUS-HARDWARE.md](STATUS-HARDWARE.md). These rows are the plan work that waits
on them.

| ID                     | Status | Item                                                                | Evidence | Verify                                                                                         |
| ---------------------- | ------ | ------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| SA-CI-AGGREGATE        | open   | Successful aggregate CI run covering all 23 PR gates                | —        | `npm run checks:status:import`                                                                 |
| SA-BRANCH-PROTECTION   | open   | Require only ci-green in branch protection                          | —        | `gh api repos/{owner}/{repo}/branches/main/protection --jq '.required_status_checks.contexts'` |
| SA-NIGHTLY-ADVISORY    | open   | Confirm the nightly advisory job under the expiring vite exception  | —        | `npm run audit:nightly`                                                                        |
| SA-CARGO-DEPENDABOT    | open   | Confirm the first grouped Cargo Dependabot pull request             | —        | `gh pr list --search 'cargo in:title author:app/dependabot' --state all`                       |
| SA-BLAME-IGNORE        | open   | Record the formatting-only commit in .git-blame-ignore-revs         | —        | `grep -E '^[0-9a-f]{40}' .git-blame-ignore-revs`                                               |
| FN-E1-LIVE-EVIDENCE    | open   | Live-network F1 publish/install and the S2 100-sample series        | —        | `npm run test:freenet-roundtrip`                                                               |
| FN-E2-WRITE-INTEROP    | open   | S7 write half — real-app interoperability                           | —        | `node conformance/freenet-spike/prove-s7-write.mjs`                                            |
| FN-F-DISTRIBUTION      | open   | Choose and complete the Freenet node distribution posture           | —        | `node conformance/freenet-spike/verify-embedded-node.mjs`                                      |
| FN-DEVICE-CONFIRM      | open   | Minimal physical-device confirmation for mobile Freenet claims      | —        | `runbook:docs/freenet-simulator-first-work-plan.md#8-minimal-physical-device-confirmation`     |
| SIM-D-CALIBRATE-MODELS | open   | Calibrate the social and economic models before using their numbers | —        | `npm run test:sim-campaign`                                                                    |

## Optional and non-blocking backlog

These items are explicitly outside the release exit criteria. They are
deliberately untracked: the table has no ID or Status column, so they do not
appear in `work:next` and are not register rows. The full table lives in
[STATUS-SOFTWARE-OPTIONAL.md](STATUS-SOFTWARE-OPTIONAL.md) so this register stays
within the file-size gate.

Hardware measurements, Apple entitlement/notarization work, real-LAN checks, Windows
verification, and device-specific soak criteria belong only in
[STATUS-HARDWARE.md](STATUS-HARDWARE.md).
