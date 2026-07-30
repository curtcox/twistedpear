# F2 FreenetInterface proof

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

Local isolated proof that `FreenetInterface` can exchange an HDLC-framed
Reticulum packet over the pinned packet-log WASM contract.

```sh
npm run test:freenet-interface
```

Distinct Freenet WebSocket endpoints (opposite packet-log sides), plus recovery
after a Freenet node restart:

```sh
npm run test:freenet-distinct-nodes -- --smoke
```

Evidence: [f2-interface-proof.json](f2-interface-proof.json). Policy bitrate is
90 kbps from local S2 1 KiB p95. Simulated announce + LXMF over
FreenetInterface-only peers is covered by
`packages/reticulum-interfaces/test/freenet-announce-lxmf.test.ts`. Live
multi-host announce/LXMF confirmation remains optional.
