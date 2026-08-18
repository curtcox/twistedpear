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
authority is a Sans-IO offer machine, and `assertEgressAllowed` runs in each
service that still names a destination.

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
- Package format v2 (`CAP-MANIFEST-V2`): new packs emit `formatVersion: 2` with
  object-or-string capability entries (`scope` and `optional`). v1 string arrays
  still verify. The host policy that refuses a scoped-set grant on a v1 package
  ships **off** (`refuseUnscopedFormatV1Grant`).

## Egress offers

`EgressOffer` is the generalization of `ShareOffer`. It binds
`(appId, capability, targetKind, targetId)` with a display label the host showed the
user, optional `tierId` / `maxRung` / `maxBytesPerDay` constraints, and the grant
lifecycle `active | expired | revoked`. Target kinds are
`peer | group | namespace | key-prefix | cas-id | address`.

The machine lives in [`egress-offer.ts`](../packages/protocol/src/egress-offer.ts) and
is cross-checked against its TLA+ twin, checked traces, and Layer-3 vector
(`npm run formal:egress-offer`). `assertEgressAllowed` is what `lxmf:send` and
`link:probe` call after the capability check. `ShareOffer` is the media
specialization: `shareOfferAsEgressOffer` plus `egressOfferPermits`, so
SPEC-STREAM's guarantee holds on the general machine.

Offers are host-authored. The app can read that an offer exists; it cannot mint,
widen, or extend one. Chrome that authors offers from natural use is still plan
work; tests and simulation call `grantEgressOffer`.

Open questions decided with this wiring:

- **`share:cas` does not take offers.** A t256 cannot name an arbitrary
  recipient. It stays in the host-fixed class.
- **`announce:publish` / `announce:subscribe` do not take offers.** Own-namespace
  enforcement is the whole destination check.
- **`peer:connect` does not take a second offer.** Host chrome already authors
  the destination.
- **`freenet:contract` does not take offers.** `get` is the read allowlist;
  `put`/`update` keep per-operation confirmation, and `put` cannot name the key
  in advance.

## Not yet enforced at the broker

- Host chrome that authors offers as a byproduct of natural use, plus list/revoke.
- Per-offer `maxBytesPerDay` enforcement and broker attribution.
