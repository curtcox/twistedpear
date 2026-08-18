# Capability scoping — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-18
register: software
counterpart: docs/capability-scoping-plan.md
-->

**This describes the implementation as it exists now.** Remaining phases live in the
[capability scoping plan](capability-scoping-plan.md). Where the two disagree, this file
wins.

The audit's Phase 0 defects and the grant TTL gap are closed. Destination-scoped
authority exists as a Sans-IO offer machine; it is not yet checked at each
destination-scoped service.

## What is closed

- Announce subscribe/publish is bound to the calling app's own namespace
  (`CAP-ANNOUNCE-SCOPE`).
- `freenet.get` is limited to keys this app published or a host-authored allowlist
  (`CAP-FREENET-READ`).
- Elevated device sessions and NFC writes fail closed unless the host sets
  `allowUnconfirmedDeviceSessions` (`CAP-DEVICE-FAILCLOSED`).
- A deleted grant record denies on the next dispatch instead of falling back to
  capabilities captured at launch (`CAP-GRANT-STALE`).
- `GrantStore.set` requires an explicit `ttlMs`; default follows `consentClass`
  (`CAP-TTL`).
- `test:hostile-apps` probes those defects plus the zero-capability observation floor.

## Egress offers

`EgressOffer` is the generalization of `ShareOffer`. It binds
`(appId, capability, targetKind, targetId)` with a display label the host showed the
user, optional `tierId` / `maxRung` / `maxBytesPerDay` constraints, and the grant
lifecycle `active | expired | revoked`. Target kinds are
`peer | group | namespace | key-prefix | cas-id | address`.

The machine lives in [`egress-offer.ts`](../packages/protocol/src/egress-offer.ts) and
is cross-checked against its TLA+ twin, checked traces, and Layer-3 vector
(`npm run formal:egress-offer`). `egressOfferPermits` is the permit function services
will call. `ShareOffer` still stands as the media specialization until wiring lands.

Offers are host-authored. The app can read that an offer exists; it cannot mint,
widen, or extend one.

## Not yet enforced at the broker

- `assertEgressAllowed` in each destination-scoped service, and re-expressing
  `ShareOffer` on this machine.
- Host chrome that authors offers as a byproduct of natural use, plus list/revoke.
- Package format v2 scoped declarations.
- Per-offer `maxBytesPerDay` enforcement and broker attribution.
