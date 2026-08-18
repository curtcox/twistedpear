# TwistedPear — Remaining software work

<!-- tp-doc
lifecycle: live
audited: 2026-08-17
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

| ID                         | Status | Item                                                                          | Evidence | Verify                                                                                                               |
| -------------------------- | ------ | ----------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| CAP-HOSTILE-PROBES         | open   | Hostile-app probes for cross-app announce, Freenet reads, device confirmation | —        | `npm run test:hostile-apps`                                                                                          |
| CAP-ANNOUNCE-SCOPE         | open   | Announce namespace is app-controlled and unvalidated                          | —        | `npx vitest run packages/miniapp-runtime/test/announce-scope.test.ts`                                                |
| CAP-DEVICE-FAILCLOSED      | open   | Device session and NFC write confirmations do not fail closed                 | —        | `npx vitest run packages/miniapp-runtime/test/device-confirm-failclosed.test.ts`                                     |
| CAP-FREENET-READ           | open   | freenet.get reads any contract key with no scope or budget                    | —        | `npx vitest run packages/miniapp-runtime/test/freenet-read-scope.test.ts`                                            |
| CAP-GRANT-STALE            | open   | Launch-time grant fallback keeps a deleted grant alive                        | —        | `npx vitest run packages/miniapp-runtime/test/grant-stale-launch.test.ts`                                            |
| CAP-EGRESS-OFFER           | open   | EgressOffer — host-authored, destination-scoped authority                     | —        | `npx vitest run packages/protocol/test/egress-offer.test.ts && npm run test:formal`                                  |
| CAP-EGRESS-WIRING          | open   | assertEgressAllowed in every destination-scoped service                       | —        | `npx vitest run packages/miniapp-runtime/test/egress-enforcement.test.ts`                                            |
| CAP-EGRESS-CHROME          | open   | Offer authoring as a byproduct of natural use, plus revoke                    | —        | `npx vitest run packages/host-core/test/egress-offer-chrome.test.ts`                                                 |
| CAP-MANIFEST-V2            | open   | Package format v2 — scoped capability declarations                            | —        | `npx vitest run packages/app-registry/test/manifest-v2.test.ts`                                                      |
| CAP-BUDGETS                | open   | Per-offer egress budgets and broker attribution                               | —        | `npx vitest run packages/miniapp-runtime/test/egress-budgets.test.ts`                                                |
| CAP-SPEC-SCOPE             | open   | SPEC-CAP grows the scope dimension; F4 rewritten                              | —        | `npm run test:doc-audit && npm run test:formal`                                                                      |
| APPR-FLOOR-PROBE           | open   | Zero-capability app observes nothing — the risk floor as a test               | —        | `npm run test:hostile-apps`                                                                                          |
| APPR-DEVICE-AMBIENT        | open   | Zero-capability apps observe device inventory and lock holders                | —        | `npx vitest run packages/miniapp-runtime/test/ambient-authority.test.ts`                                             |
| APPR-RISK-CLASS            | open   | Capability risk classes in a generated registry                               | —        | `npx vitest run packages/protocol/test/capability-risk.test.ts`                                                      |
| APPR-TIER                  | open   | App risk tier — max class, promoted on read+egress co-occurrence              | —        | `npx vitest run packages/protocol/test/approval-tier.test.ts`                                                        |
| APPR-REVIEW-UX             | open   | Capability review orders by risk and states the tier                          | —        | `npx vitest run packages/worklet-core/test/capability-review.test.ts`                                                |
| APPR-FIRST-SEEN            | open   | Persistent first-seen ledger, immune to the catalog TTL                       | —        | `npx vitest run packages/app-registry/test/first-seen.test.ts`                                                       |
| APPR-TRUST-DEGREE          | open   | Publisher trust becomes a degree, not a boolean                               | —        | `npx vitest run packages/app-registry/test/trust-degree.test.ts`                                                     |
| APPR-UPDATE-DELTA          | open   | An update that adds a capability is not re-reviewed                           | —        | `npx vitest run packages/app-registry/test/update-delta.test.ts`                                                     |
| APPR-OPTIONAL-CAPS         | open   | Manifest marks capabilities essential or optional                             | —        | `npx vitest run packages/app-registry/test/optional-capabilities.test.ts`                                            |
| APPR-EVALUATE              | open   | evaluateApproval — one pure decision function                                 | —        | `npx vitest run packages/protocol/test/approval-evaluate.test.ts`                                                    |
| APPR-OVERRIDE-UX           | open   | Unmet requirements presented as 'could not verify', with a designed override  | —        | `npx vitest run packages/host-core/test/approval-override.test.ts`                                                   |
| APPR-ATTESTATION           | open   | Signed review attestations over the announce path                             | —        | `npx vitest run packages/app-registry/test/review-attestation.test.ts`                                               |
| APPR-REVIEWER-SET          | open   | Scoped reviewer trust with acquisition-based independence                     | —        | `npx vitest run packages/app-registry/test/reviewer-set.test.ts`                                                     |
| APPR-SPEC-RISK             | open   | SPEC-CAP grows the risk dimension; LIMITATIONS records the residual           | —        | `npm run test:doc-audit`                                                                                             |
| HA-P0-BASELINE             | open   | Measure the 25 hostile-author scenarios against the running code              | —        | `node conformance/hostile-authors/baseline.mjs`                                                                      |
| HA-P1-TRANSCRIPT           | open   | ConsentRecord transcript and the hostile-author fixture driver                | —        | `node conformance/hostile-authors/run.mjs`                                                                           |
| HA-P2-RENDER-ORACLE        | open   | Render oracle — CHROME-R7/R8, and R1/R3 promoted to normative                 | —        | `npx vitest run packages/miniapp-runtime/test/ui-validate-chrome-lexicon.test.ts && npm run test:chrome`             |
| HA-P3-FINDINGS             | open   | Fix the hostile-author findings from P0-P2                                    | —        | `node conformance/hostile-authors/run.mjs`                                                                           |
| HA-P4-SCOPED-EGRESS        | open   | Scoped-egress scenarios flip HA-30 and HA-36 green                            | —        | `node conformance/hostile-authors/run.mjs`                                                                           |
| MINIAPP-LIFECYCLE-EVENTS   | open   | Tell a mini-app it is about to be suspended, and that it resumed              | —        | `npx vitest run packages/miniapp-runtime/test/lifecycle-events.test.ts`                                              |
| MINIAPP-BACKGROUND-ANDROID | open   | Mini-app execution inside the Android foreground service                      | —        | `npx vitest run packages/miniapp-runtime/test/background-execution.test.ts`                                          |
| MINIAPP-SCHEDULED-WAKE     | open   | A mini-app asking to be woken periodically for bounded work                   | —        | `npx vitest run packages/miniapp-runtime/test/scheduled-wake.test.ts`                                                |
| RG6                        | open   | Capture the 44 pending reader-guide screenshots                               | —        | `npm run site:section-images:report && npm run site:build`                                                           |
| DEV-NFC-APDU               | open   | nfc:apdu tier with the payment-applet blocklist                               | —        | `npx vitest run packages/miniapp-runtime/test/device-nfc-apdu.test.ts`                                               |
| DEV-BIOMETRIC              | open   | biometric device class — signed assertion only                                | —        | `npx vitest run packages/miniapp-runtime/test/device-biometric.test.ts`                                              |
| DEV-SCALAR-SENSORS         | open   | Remaining scalar sensor classes and their drivers                             | —        | `npx vitest run packages/miniapp-runtime/test/device-scalar-sensors.test.ts`                                         |
| DEV-NATIVE-DRIVERS         | open   | Per-host native device drivers and Hardware access chrome                     | —        | `npx vitest run packages/host-core/test/hardware-access-chrome.test.ts`                                              |
| DEV-CLASS-PAGES            | open   | Per-device-class reference pages mirroring ble-interface.md                   | —        | `npm run test:doc-audit`                                                                                             |
| DEV-CLASS-RUNBOOK-PROOF    | open   | Prove the add-a-device-class runbook on a class outside the initial set       | —        | `npx vitest run packages/protocol/test/device-registry.test.ts`                                                      |
| FN-A1-ANDROID-E5           | open   | Record the Android emulator BareKit WASM + watchdog measurements              | —        | `npm run test:android-emulator:e5`                                                                                   |
| FN-A2-IOS-WASM             | open   | Record the iOS simulator BareKit WASM + watchdog measurements                 | —        | `npm run test:ios-sim:wasm`                                                                                          |
| SIM-ESCROW-SEMANTICS       | open   | Escrow and recovery product semantics with a shipping host integration        | —        | `npx vitest run packages/host-core/test/escrow-recovery.test.ts && npm run formal:escrow && npm run formal:recovery` |
| SIM-L3-COLLUDING           | open   | Ratchet the abuse difficulty ladder to L3 (colluding)                         | —        | `npm run sim:abuse-loop`                                                                                             |

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
