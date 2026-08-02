# ADR: Freenet app execution — Option A (clients, not hosts)

<!-- tp-doc
lifecycle: historical
audited: 2026-07-28
register: software
-->

**Status:** Accepted as the near-term path; Options B and C remain deferred.  
**Date:** 2026-07-28  
**Context:** [Freenet integration plan](../../docs/freenet-plan.md) §10 / phase F6.

## Decision

TwistedPear mini-apps interoperate with Freenet as **clients** through the brokered
`freenet:contract` capability (`get` / `put` / `update`). TwistedPear does **not**
host Freenet WASM contracts or Freenet web UIs inside the mini-app sandbox.

## Evidence

| Spike | Result | Implication |
|---|---|---|
| S7 Atlas read | Live CBOR index read via `@freenetorg/freenet-stdlib` succeeded | Option A read path is proven |
| S7 write | Deferred pending explicit approval (irreversible public metadata) | Writes stay confirmation-gated |
| S4 WASM in sandbox | Node ok; browser deliberately unsupported; BareKit simulator probes wired | Option B is not open |
| S8 threat model | Desktop F1 ok; mobile remote-node grant chrome landed | Option A on desktop/headless; mobile labeled simulator-verified once emulator/sim probes record |
| S5 bundling | Partial; user-supplied supervisor landed | Redistributed/embedded binary still gated on signing |

## Consequences

- **For:** No new WASM engine in the sandbox; no second UI/DOM sandbox; fits the
  existing broker and grant model; live apps (Atlas, later River) are reachable
  as data, not as hosted shells.
- **Against:** Freenet apps do not “run on” TwistedPear nodes. Interoperability
  must not be marketed as hosting.
- **Capability:** `freenet:contract` grant wording must state that updates are
  published to a global network and cannot be recalled; put/update ask each time.
- **Deferred:** Option B (contract/delegate execution) until S4 device/browser
  evidence and a clear value case vs a bundled Freenet node. Option C (Freenet
  web UIs as mini-apps) needs a separate plan because it changes the platform
  shape.

## References

- [s7-report.md](../../conformance/freenet-spike/s7-report.md)
- [s4-report.md](../../conformance/freenet-spike/s4-report.md)
- [security-review.md](../../docs/security-review.md) § F9
- `HOST_API_VERSION` 0.11.0 changelog in `packages/miniapp-runtime/src/host-api.ts`
