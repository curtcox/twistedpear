# S1 — Freenet SDK under Bare

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

Status: **pass**.

The exact `@freenetorg/freenet-stdlib@0.3.0` SDK bundles with `bare-pack` and
runs under Bare 1.30.3. Bare does not provide the browser globals the SDK
expects, so the required shim inventory is:

- `bare-ws@2.0.4`, behind the narrow browser-style adapter in
  `bare-websocket-shim.mjs`;
- `bare-encoding@1.0.3`, supplying `TextEncoder` and `TextDecoder` for
  FlatBuffers.

The adapter implements only the SDK's audited WebSocket use: open/close
listeners, `onmessage`, binary `send`, `binaryType`, and close. Native modules
remain deferred from the portable bundle so Bare loads the platform-specific
add-ons supplied by the host runtime.

The live read-only probe connected from Bare to Freenet 0.2.112, fetched the
known Atlas index contract, round-tripped its instance id, and received 13,989
state bytes. The machine-readable observation is in `s1-live-read.json`.

This proves that a Bare host can be a Freenet client. It does not prove mobile
background availability, user-facing remote-node trust, or node provisioning;
those remain separate S4, S5, and F4/F5 gates.
