# Freenet bridge

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

`@twistedpear/bridge-freenet` is the optional Freenet contract-state adapter.
It keeps the Freenet WebSocket SDK outside Sans-IO protocol packages and exposes
byte-oriented publish, fetch, update, and subscribe operations.

The implemented shipping foundation stores a signed 256t locator and its
`.tpkg` archive in the locator contract. Fetches distrust Freenet: they require
the exact requested signed locator, verify its signature, and verify the
archive's 256t identifier before returning bytes to the normal package
verification pipeline.

## Commands

```sh
npm test -- packages/bridge-freenet/test
npm run build:freenet-contract
npm run test:freenet-spike
```

The Rust contract builds use the toolchain and `wasm32-unknown-unknown` target
pinned in each contract's `rust-toolchain.toml`. Generated WASM artifacts are
not hand-authored:

- `contract/locator/locator-contract.wasm` — F1 locator/package state
- `contract/propagation-set/propagation-set-contract.wasm` — F3 LXMF set

Rebuild with `npm run build:freenet-contract` (or pass `locator` /
`propagation-set` to build one). Size and hashes are pinned by SPEC-FREENET.

## Status

The integration is optional and off by default. Package publication is exposed
through `tp publish --freenet` when a node and built contract are available.
The F3 propagation-set WASM, local offline-A/retrieve-B proof, and
`createNodeHost` Freenet remote-mirror attachment (when freenet URL +
propagation role are enabled) are in place. F2 ships a wired
`FreenetInterface` (packet-log WASM + host kind at 90 kbps) with simulated
announce+LXMF coverage. Node binary bundling, mobile support, and app
execution remain behind the evidence gates in the
[Freenet integration plan](../../docs/freenet-integration-plan.md).
