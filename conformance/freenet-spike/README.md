# Freenet F0 spikes

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

This directory owns the non-shipping evidence gates from
[the Freenet integration plan](../../docs/freenet-integration-plan.md#4-phase-f0--exploratory-work-the-gate).
Nothing here is part of a shipping host.

Run the offline-safe S1 packaging probe with:

```sh
npm run test:freenet-spike
```

The probe bundles the exact pinned Freenet TypeScript SDK, a narrow
`bare-ws@2.0.4` compatibility adapter, and `bare-encoding@1.0.3` for the
FlatBuffers text globals. It then runs under Bare. The offline path proves
packaging and shim installation. To exercise the read-only live path against
the Atlas index, run:

```sh
FREENET_NODE_URL=ws://127.0.0.1:50509/v1/contract/command \
npm run test:freenet-spike
```

Override `FREENET_CONTRACT_KEY` to probe another known readable contract.

The remaining live and platform spikes require a local `fdev` network, a live
gateway, or cross-platform build hosts. S6 and S8 are complete; every spike's
status is recorded in [evidence-status.json](evidence-status.json). Absent
measurements are `pending`, never zero-filled. The phase-by-phase implementation
and exit-criterion mapping is in [completion-audit.md](completion-audit.md).

S2 has an executable 100-sample measurement runner for the required 1 KiB,
64 KiB, and 1 MiB update-to-notify cases:

```sh
npm run test:freenet-local-network
```

That command starts an isolated gateway and two peers, waits for their WebSocket
ports and gateway peer rows, runs the measurement with distinct publisher and
subscriber nodes, and then stops the nodes and removes their temporary state.
Set `FREENET_BINARY` to override the executable, `FREENET_KEEP_LOCAL_STATE=1`
to retain diagnostic state, or the documented port environment variables in
`run-local-s2.mjs` when the defaults conflict.

The harness binds each node's `--network-port` to the same value as
`--public-network-port`. Advertising a public port without binding it left
every process on the default `31337` and produced `RING_TRANSPORT_DESYNC`.
Against Freenet 0.2.112, UPDATE also requires the measurement client's
`codeField` WASM workaround: that release double-hashes a 32-byte
`ContractKey.code` and otherwise fails with "Contract not in store".

For a separately managed topology, set `FREENET_MEASUREMENT_LABEL`,
`FREENET_NODE_URL`, and `FREENET_SUBSCRIBER_NODE_URL`, then run
`npm run test:freenet-roundtrip`. Run again with label `live`; the runner writes
ignored raw evidence under `.tmp/`. Only reviewed results from both
environments should be combined into the committed `measured-roundtrip.json`
gate artifact.

For topology/debug smoke only, set `FREENET_SAMPLE_COUNT` below 100 together
with `FREENET_ALLOW_INCOMPLETE=1`. Such a run is explicitly marked incomplete
and written to a different filename, so it cannot replace gate evidence.
`node conformance/freenet-spike/run-local-s2.mjs --smoke` selects those settings
automatically for the isolated topology.
The first isolated 0.2.112 attempts produced no notification and are recorded
in [s2-smoke-report.md](s2-smoke-report.md). After the topology bind fix and
the UPDATE `codeField` workaround, the local 100-sample gate artifact is
committed as [measured-roundtrip.json](measured-roundtrip.json) (local-executor
notify path on a three-node mesh). Live confirmation still requires explicit
authorization; set `FREENET_FORCE_CROSS_NODE=1` for a distinct subscriber node
when measuring cross-node notify separately.

S3 is reproducible with:

```sh
npm run test:freenet-ordered-log
```

It runs the native convergence tests, builds the pinned Freenet WASM contract,
and regenerates [s3-measurements.json](s3-measurements.json). The conclusion
and limits are in [s3-report.md](s3-report.md).

F3's isolated offline-A/retrieve-B store proof:

```sh
npm run test:freenet-propagation
```

Evidence is in [f3-propagation-proof.json](f3-propagation-proof.json) and
[f3-report.md](f3-report.md).

F2's isolated FreenetInterface HDLC exchange:

```sh
npm run test:freenet-interface
```

Evidence is in [f2-interface-proof.json](f2-interface-proof.json) and
[f2-report.md](f2-report.md).

S4 reuses the hardened sandbox benchmarks. Node and Chromium results plus the
pending BareKit device row are recorded in
[s4-support-matrix.json](s4-support-matrix.json) and interpreted in
[s4-report.md](s4-report.md).

S5's read-only macOS universal-binary measurement and the remaining packaging
matrix are recorded in [s5-report.md](s5-report.md).

S7 has a repeatable read-only probe against the live Atlas index:

```sh
npm run test:freenet-atlas-read
```

Its snapshot and remaining authorized-update gate are described in
[s7-report.md](s7-report.md).
