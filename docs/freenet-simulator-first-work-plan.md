# Freenet simulator-first remaining-work plan

<!-- tp-doc
lifecycle: live
audited: 2026-07-29
register: software
-->

This companion plan sequences the remaining work from the
[Freenet integration plan](freenet-integration-plan.md) so that deterministic
tests, isolated Freenet nodes, Android emulators, and iOS simulators provide the
primary software evidence. Dedicated physical devices are reserved for claims
that a simulator cannot make honestly.

The authoritative implementation and evidence ledger remains
[§14 of the integration plan](freenet-integration-plan.md#14-implementation-status-2026-07-29)
and
[the completion audit](../conformance/freenet-spike/completion-audit.md).
This document changes sequencing, not the meaning of a completed evidence gate.

## 1. Evidence policy

Use the strongest inexpensive environment first:

1. Pure unit, vector, and simulated-adapter tests.
2. Isolated local Freenet processes.
3. Android emulator and iOS simulator builds containing the actual BareKit
   worklet.
4. Separately managed or public Freenet nodes, only when the property under
   test is specifically network-wide behavior.
5. A minimal physical-device confirmation pass, only for runtime properties
   that depend on real lifecycle, memory pressure, thermals, radios, or OEM
   process management.

Every result must name its environment. Simulator evidence may close software
readiness but must not be relabeled as physical-device evidence. Public Freenet
writes, signing/notarization, and hardware runs remain explicit approval gates.

## 2. Workstream A — complete S4 with simulator-first evidence

### A1. Make the Android E5 result explicit

The worklet benchmark already executes WASM before entering the hostile busy
loop, but `conformance/android-emulator/e5-worker.mjs` currently records only
spawn, normal kill, and busy-loop kill timings.

Work:

- Include `wasmExecuted` in the harness's visible benchmark result.
- Parse and record it in
  `conformance/android-emulator/measured-worker.json`.
- Fail E5 unless WASM executed, normal worker termination succeeded, and the
  watchdog killed the WASM-before-busy-loop worker.
- Preserve spawn, kill, and watchdog latency measurements.

Verification:

```sh
npm run build:worklet
npm run test:android-emulator:e5
```

**Exit:** the Android emulator records explicit BareKit Worker + WASM +
watchdog evidence rather than inferring WASM execution from the benchmark
implementation.

### A2. Add the equivalent iOS simulator probe

Add an iOS simulator step that invokes the same in-host benchmark through the
installed harness, not through desktop Bare. Record:

- `wasmExecuted`;
- worker spawn and normal kill latency;
- hostile busy-loop kill result and latency;
- iOS simulator runtime and harness build identity.

Wire the required form into `npm run test:ios-sim:required`; keep reviewed
simulator evidence separate from any later physical-device result.

**Exit:** Android emulator and iOS simulator both exercise the shipping
BareKit Worker integration and retain the hostile-app kill guarantee.

### A3. Resolve the browser result as policy

Default decision: retain the hardened opaque-origin worker CSP and record
embedded Freenet WASM execution as unsupported on web. The accepted Option A
client model does not require browser-side contract execution.

If a concrete Option B use case later justifies reopening this decision, test
`wasm-unsafe-eval` in an isolated security change and repeat the full web
sandbox, hostile-app, ambient-storage, and ambient-network suite. Do not add
`unsafe-eval` merely to turn S4 green.

**Exit:** S4 records Node as passed, Android/iOS simulator results explicitly,
web as deliberately supported or unsupported, and physical devices as release
confirmation rather than a prerequisite for further software work.

## 3. Workstream B — distinct-node F2/F3 evidence

### B1. Reproduce cross-node notification behavior

Run the existing local topology with publisher and subscriber clients attached
to different Freenet nodes:

```sh
FREENET_FORCE_CROSS_NODE=1 npm run test:freenet-local-network
```

Use an incomplete smoke series for diagnosis. Record a full 100-sample series
only after delivery is reliable; never copy an incomplete run over the gate
artifact.

**Status (2026-07-29):** a paced `local-cross-node` 100-sample series is
committed in `measured-roundtrip.json` (300 WebSocket notifies, 0 GET
reconciles; p95 ~111 ms / ~2.5 s for ≤64 KiB / 1 MiB). Unpaced blasts still
drop Freenet 0.2.112 subscription snapshots; the harness defaults a 50 ms
sample gap and can GET-reconcile on missing notifies.

### B2. Make F2 state-reconciling

If locator minimum-merge reordering still loses notifications:

- treat notifications as hints to fetch authoritative state;
- detect missing packet indices;
- recover gaps before delivering HDLC frames upward;
- deduplicate repeated entries;
- add deterministic delayed, duplicated, missing, and reordered-notification
  tests.

**Exit:** F2 reconstructs the same ordered HDLC stream without assuming that
every intermediate notification arrives exactly once.

### B3. Exercise full scenarios across isolated nodes

F2 proof:

- two TwistedPear hosts with opposite packet-log directions;
- distinct Freenet WebSocket endpoints;
- announce exchange and LXMF round trip;
- bounded recovery after one Freenet node restarts.

F3 proof:

- node A publishes encrypted propagation state;
- node B observes it through a different Freenet node;
- node A and its Freenet node stop;
- the recipient retrieves through node B.

These isolated scenarios are the primary regression gates. A public-network
multi-node run remains optional confirmation.

## 4. Workstream C — F4 supervision before distribution

Implement and test a child-process supervisor around a user-supplied,
hash-verified Freenet executable before choosing a binary-distribution model.

Required behavior:

- select an ephemeral WebSocket port;
- generate a fresh auth token and keep it out of URLs and logs;
- wait for node readiness;
- restart unexpected exits with bounded backoff;
- stop cleanly with the host;
- isolate node state under the host data directory;
- expose starting, online, degraded, and failed status;
- leave all non-Freenet paths usable when the process is unavailable.

Test tiers:

1. Fake child-process fixtures for lifecycle and failure injection.
2. The pinned local Freenet binary.
3. Linux CI using the existing hash-verified release archive.
4. macOS unsigned development packaging and a Windows CI/VM run when
   available.

**Exit:** supervision is software-complete with a user-supplied binary.
Redistribution remains a separate signing gate.

## 5. Workstream D — simulator-tested mobile remote-node grants

Build the remote-node decision in trusted host chrome and validate it on
Android emulator and iOS simulator before considering mobile support.

The grant must show:

- the exact node URL and a user-supplied operator label;
- that reads, writes, and subscriptions are visible to that node;
- that accepted updates are globally replicated and cannot be recalled;
- timing, size, destination-contract, and correlation exposure;
- separate enablement for contract reads, contract writes, packet tunnel, and
  propagation;
- off-by-default and revocation behavior.

Start with a user-controlled companion node and read-only contract access. Do
not ship a preconfigured third-party gateway.

Simulator tests cover first-use disclosure, refusal, revocation, authentication
failure, malformed/unsafe URLs, unavailable-node degradation, reconnection,
per-write confirmation, and absence of tokens from logs and UI dumps.

**Exit:** mobile remote-node support is software-ready and labeled
simulator-verified. Physical confirmation gates only the corresponding mobile
release claim.

## 6. Workstream E — authorized public-network evidence

This work starts only after explicit approval for irreversible public metadata.

### E1. Dedicated TwistedPear test contract

Use one approved, non-sensitive test contract to record:

- F1 publication from host A and forced Freenet installation on host B;
- the live S2 100-sample series;
- retrieval after a client or node restart.

Review ignored raw results before deliberately updating committed evidence.

### E2. Real-app write interoperability

S7 needs application authority in addition to permission to publish. Prefer:

1. an upstream-approved Atlas test record or curator test key;
2. another independently developed Freenet app with a user-writable contract;
3. an explicitly approved rejected Atlas update, recorded honestly as request
   and rejection-path evidence rather than accepted mutation.

No simulator or isolated testnet substitutes for this work because its purpose
is public-network and independent-application interoperability.

## 7. Workstream F — packaging and signing decision

After the supervisor passes, choose one distribution posture:

1. external node only;
2. user-supplied supervised binary;
3. opt-in download on first use with a pinned SHA-256;
4. binary embedded in the TwistedPear package.

**Interim decision (2026-07-29):** ship software posture **2** (and keep 1 as
the documented external-node path). `FreenetSupervisor` + `tp node
--freenet-binary` / `--freenet-binary-sha256` are the supported way to run a
local node without TwistedPear redistributing Freenet. Options 3 and 4 stay
blocked on signing credentials and fresh upstream-artifact verification.

Options 3 and 4 require fresh upstream-artifact verification, platform package
size measurements, upgrade/rollback rules, and clean-host execution tests.
Embedded macOS distribution additionally requires Developer ID signing,
hardened-runtime verification, notarization, stapling, and Gatekeeper
verification. Windows needs an explicit code-signing posture.

Signing services cannot be replaced by simulator evidence.

## 8. Minimal physical-device confirmation

Run this only if mobile Freenet support is intended to ship. Borrowed or
generally available devices are sufficient; this plan does not require a
dedicated device fleet.

Minimum matrix:

- one representative Android phone;
- one iPhone.

Minimum checks:

- WASM executes inside the BareKit Worker;
- the watchdog kills the hostile worker under moderate load;
- 10–20 spawn/kill cycles without false positives;
- one foreground/background transition;
- remote-node disclosure, refusal, and revocation;
- no credentials in device logs;
- a short read-only connection to a user-controlled node.

Physical devices remain necessary for claims about real memory pressure,
thermals, OEM process killing, and background suspension. They do not block
desktop/headless release or the simulator-verified software milestones above.

## 9. Recommended order

1. A1 — strengthen Android E5 evidence.
2. A2 — add the iOS simulator WASM benchmark.
3. A3 — record the browser CSP decision.
4. B1/B2 — reproduce and fix cross-node F2 reconciliation.
5. B3 — run distinct-node local F2/F3 scenarios.
6. C — implement the user-supplied-binary supervisor.
7. D — add simulator-tested mobile read-only grant UX.
8. E — run an explicitly authorized public evidence session.
9. F — choose distribution and complete applicable signing.
10. Run the minimal physical-device confirmation only for mobile release
    claims.

## 10. Handoff checks

For every change, start with the focused suite for that workstream. Before
handoff:

```sh
npm run check:ci-base
npm run test:doc-audit
```

Run `npm run sansio` for any protocol-boundary change. Do not overwrite
committed measurements or vectors from a smoke, simulator, or public-network
run without reviewing and labeling the environment.
