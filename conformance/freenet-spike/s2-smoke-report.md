# S2 local smoke observation

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

Status: **positive one-sample diagnostic; 100-sample gate evidence still
required**.

An isolated Freenet 0.2.112 network is started with one localhost gateway and
two localhost peers by the self-cleaning `run-local-s2.mjs` harness. Incomplete
one-sample runs are deliberately marked and cannot overwrite
`measured-roundtrip.json`.

## Defects found and corrected

Harness / topology:

- `--public-network-port` was advertised without a matching `--network-port`
  bind, so every process listened on the default `31337` while peers dialed
  the advertised ports (`RING_TRANSPORT_DESYNC`). Both flags now share the
  same UDP port, with `--network-address 127.0.0.1`.
- `HOME` is isolated with `gateways = []` so the installed node does not dial
  the public gateway index.
- The harness waits for the gateway dashboard to show peer rows before
  measuring.

Client / measurement:

- PUT retains the contract with `subscribe=true` but does not use
  `blocking_subscribe` (that path hung under the broken topology).
- Subscriber readiness still uses GET with `fetch_contract`, `subscribe`, and
  `blocking_subscribe`.
- Notification decoding accepts state, delta, and state-plus-delta unions.
- The recorded 0.2.112 path's FlatBuffers UPDATE handling runs
  `CodeHash::from_code` on `ContractKey.code`, which double-hashes a 32-byte
  hash and fails with "Contract not in store and no code provided"; another
  observed local path rejects full WASM in that field. The client now sends the
  protocol-sized hash first and retries with WASM only for the missing-contract
  error.

## One-sample local result

After the corrections above, `run-local-s2.mjs --smoke` completed PUT,
cross-node subscribe, UPDATE, and notify for 1 KiB, 64 KiB, and 1 MiB. The
raw incomplete artifact is under `.tmp/` (gitignored). Approximate
update→notify times from that single sample were on the order of 100 ms
(1 KiB), 170 ms (64 KiB), and 3.5 s (1 MiB). Those figures are diagnostic
only; the gate still requires 100 samples per size locally and on an
authorized live network, combined into `measured-roundtrip.json`.

The prior negative observation (desync, missing subscriber snapshot, PUT
timeout) is superseded by this positive path. Machine-readable status remains
in `evidence-status.json` until the 100-sample artifacts land.
