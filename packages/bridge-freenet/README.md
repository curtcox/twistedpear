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

The Rust contract build uses the toolchain and `wasm32-unknown-unknown` target
pinned in `contract/locator/rust-toolchain.toml`. The generated
`locator-contract.wasm` is not hand-authored and must be regenerated from
`contract/locator`; its size and hashes are pinned by SPEC-FREENET.

## Status

The integration is optional and off by default. Package publication is exposed
through `tp publish --freenet` when a node and built contract are available.
Packet tunneling, LXMF propagation backing, node binary bundling, mobile
support, and app execution remain behind the evidence gates in the
[Freenet integration plan](../../docs/freenet-integration-plan.md).
