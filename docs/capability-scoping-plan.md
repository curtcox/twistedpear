# Capability Scoping Plan — least authority for mini-app I/O

<!-- tp-doc
lifecycle: planned
audited: 2026-08-18
register: software
counterpart: docs/capability-scoping.md
-->

**This is a plan, not a description of current behaviour.** What ships today is in
[Capability scoping](capability-scoping.md). That live document wins if the two disagree.

The plan to close the findings in the
[capability scoping audit](capability-scoping-audit.md). What ships today is described by
[capability scoping](capability-scoping.md), [SPEC-CAP](../specs/spec-cap/spec.md), and
[miniapp-sdk.md](miniapp-sdk.md); when this plan disagrees with those, they win until the
work lands.

## 1. The decision this plan implements

[security-review.md](security-review.md) F4 previously accepted:

> A granted capability allows full use of that host service for the app namespace.

**That acceptance is withdrawn.** Least authority _within_ a granted capability is now a
requirement for anything that emits bytes to a network. F4 is rewritten as an
enumerated residual in `CAP-SPEC-SCOPE`.

Package-format changes are in scope, so the fix is not limited to minting more capability
ids the way device tiers do.

## 2. Which capabilities get scoped

Not everything needs a destination. The cut, and the justification for each side:

| Class                       | Capabilities                                                                                                                          | Treatment                           | Why                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| **Local-only**              | `storage:kv`, `storage:hyperbee`, `workspace`, `identity`, `presence`                                                                 | Stay coarse                         | No egress. Already namespaced and quota'd; scoping would add ceremony, not safety |
| **Host-fixed destination**  | `ai:chat`, `ai:embed`, `resource:fetch`                                                                                               | Stay coarse, keep budgets           | The app cannot name a destination — the property we are trying to buy elsewhere   |
| **Per-operation confirmed** | `apps:package`, `apps:publish`, `apps:install`, `apps:preview`                                                                        | Keep confirmation                   | Low frequency; a dialog per call is affordable and already implemented            |
| **App-chosen destination**  | `lxmf:send`, `announce:publish`, `announce:subscribe`, `freenet:contract`, `share:cas`, `device:stream`, `peer:connect`, `link:probe` | **Require a live egress offer**     | The app names the target today with nothing checking it                           |
| **Read-only observation**   | `link:observe`, `device:share-policy:read`, `relay:read`                                                                              | Stay coarse                         | Already app-scoped; no outbound bytes                                             |
| **Host control**            | `relay:configure`                                                                                                                     | Out of scope here — separate review | Changes device posture rather than moving app data                                |

`announce:subscribe` is in the scoped set even though it is ingress: an unvalidated
namespace is how one app reads another's data (finding F-2).

## 3. Design — the egress offer

Generalize the one destination-scoped authority that already works. `ShareOffer`
([device-share.ts](../packages/protocol/src/device-share.ts)) binds
`(appId, targetKind, targetId, classId, tierId, maxRung, expiresAt)`, is authored in
trusted host chrome, and is readable but never writable by the app. Widen the target
vocabulary and it covers every row of the scoped set. The type and lifecycle machine
are in [capability scoping](capability-scoping.md).

Enforcement splits along the line the code already draws:

- **The broker checks the capability.** It cannot check the target — the target lives in a
  service-specific payload shape the broker deliberately does not parse.
- **Each service checks the target**, calling `assertEgressAllowed` with the app,
  capability, and target right after `assertCapabilityAllowed`. `DeviceManager.stream`
  already does exactly this with `requireShareOffer`
  ([device-manager/layer-1.ts:196](../packages/miniapp-runtime/src/device-manager/layer-1.ts));
  the other services grow the same two lines.

`ShareOffer` becomes the media specialization of `EgressOffer` — the media-specific fields
move into `constraints`, and [SPEC-STREAM](../specs/spec-stream/spec.md) keeps its
guarantee ("Sending requires a live host-authored `ShareOffer` matching app, peer, class,
and tier") with the type renamed underneath it.

### The constraint that decides whether this works

**Offers must be created as a byproduct of something the user was already doing, never as a
standalone permission dialog.** Picking a contact in host chrome _is_ the act of authoring
an `lxmf:send` offer for that peer; accepting a call authors the media offer; scanning a
peer's QR authors the peer offer. `peer:connect` already works this way, which is why it is
the only app-chosen destination in the system that is currently safe.

If this becomes a separate "choose destinations" dialog, users will blanket-approve it and
the mechanism buys nothing — it would be strictly worse than today, because it would look
like a control while functioning as a rubber stamp. Any Phase 2 chrome design that cannot
express a capability's offers as a byproduct of natural use is a signal that the capability
belongs in the host-fixed-destination class instead.

## 4. Design — manifest v2 scoped declarations

The signed manifest declares **capability and scope shape** — what the app will ever ask
for. The host-side grant record carries the **resolved scope** — the peers, namespaces, and
budgets the user actually approved, which must be able to change without reissuing a
publisher signature.

```json
"formatVersion": 2,
"capabilities": [
  { "id": "lxmf:send", "scope": { "kind": "offer", "targetKind": "peer" } },
  { "id": "announce:publish", "scope": { "kind": "own-namespace" } },
  "storage:kv"
]
```

- A bare string keeps its v1 meaning (unscoped), so `formatVersion: 1` packages parse
  unchanged and the whole cookbook keeps working.
- The install-time capability review renders the scope shape, so "messages contacts you
  choose" is distinguishable from "messages anyone" _before_ install.
- `validateManifestCapabilities` returns declarations rather than ids; `MiniappCapability`
  stays the closed set it is today.

**The migration lever is the package format version, not `minHostApi`.**
`verifyPackage` already refuses a package whose `minHostApi` exceeds the host
([package.ts:429](../packages/app-registry/src/package.ts)) — that is a floor, and it
cannot express "this host declines old, unscoped grants." The ceiling is a host policy:
once Phase 3 ships, a host refuses to grant a scoped-set capability to a `formatVersion: 1`
package. Phase 3 lands that policy **off**; a later release turns it on, giving publishers a
window to repackage.

## 5. Sequencing

Phase 0 and Phase 1 are independent of everything else and should land first — they are
small, they close live defects, and none of them waits on a design decision.

F-2 (`CAP-ANNOUNCE-SCOPE`) is closed: the broker and announce services reject a namespace
other than the calling app's own and bound `appData` to the RNS announce ceiling.
F-3 (`CAP-FREENET-READ`) is closed: `freenet.get` is limited to keys this app published or
a host-authored allowlist.
F-4 (`CAP-DEVICE-FAILCLOSED`) is closed: elevated device sessions and NFC writes fail
closed unless the host sets `allowUnconfirmedDeviceSessions`.
F-6 (`CAP-GRANT-STALE`) is closed: a deleted grant record denies on the next dispatch
instead of falling back to the capabilities captured at launch.
`CAP-HOSTILE-PROBES` is closed: `test:hostile-apps` now probes those four defects plus
the zero-capability observation floor.

### Phase 0 — close the concrete defects (host API 0.13.0)

Phase 0 is executed. Remaining work starts at Phase 1.

### Phase 1 — TTL becomes real (host API 0.13.0)

| ID        | Type | Work                                                                                                                                                  |
| --------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CAP-TTL` | bug  | F-5. Require an explicit `ttlMs` at every `GrantStore.set` call site; default by `consentClass`; show expiry in the grant screen; re-prompt on expiry |

Typed `bug` rather than `feature`: SPEC-CAP already states that no grant is immortal, the
machinery is already model-checked, and the implementation contradicts it. This is a
conformance gap, and it is the cheapest available reduction in standing authority.

### Phase 2 — the egress offer (host API 0.14.0)

`CAP-EGRESS-OFFER` landed in [capability scoping](capability-scoping.md).
`CAP-EGRESS-WIRING` landed: `assertEgressAllowed` on `lxmf:send` and
`link:probe`; `ShareOffer` is `shareOfferAsEgressOffer`. `share:cas` stays
host-fixed (open question 1); announce stays own-namespace (open question 3).
Remaining Phase 2 work:

| ID                  | Type    | Requires           | Work                                                                                                                                                                                           |
| ------------------- | ------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CAP-EGRESS-CHROME` | feature | `CAP-EGRESS-OFFER` | Desktop, mobile, and web chrome that authors offers as a byproduct of natural use (§3); offer list and revoke in host settings                                                                 |

### Phase 3 — scoped declarations (package format v2)

Phase 3 is executed. `CAP-MANIFEST-V2` accepts `formatVersion: 1 | 2`, emits 2
for new packs, parses object-or-string capability entries, shows `scope` in the
install/launch review, and lands `refuseUnscopedFormatV1Grant` **off**.
`APPR-OPTIONAL-CAPS` rode the same bump: `optional: true` is not required for
launch.

Deliberately after Phase 2: build the enforcement mechanism first, then generalize the
declaration to describe something that exists. Shipping the format first would produce a
signed declaration with nothing enforcing it.

### Phase 4 — budgets and attribution

| ID            | Type    | Requires           | Work                                                                                                                                                               |
| ------------- | ------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CAP-BUDGETS` | feature | `CAP-EGRESS-OFFER` | `maxBytesPerDay` in offer constraints, enforced at the broker; egress target in the broker audit entry; simulator containment scenarios using `ContainmentTracker` |

### Phase 5 — update the normative record

Phase 5 is executed. `CAP-SPEC-SCOPE` grew the scope dimension in
[SPEC-CAP](../specs/spec-cap/spec.md) (declaration shape plus the existing offer
machine's four representations), rewrote F4 from acceptance into an enumerated
residual, moved grant descriptions with the enforcement, and updated
[LIMITATIONS.md](../LIMITATIONS.md) §7.

Grant descriptions are the user's only account of what they approved, so they are part of
the security surface — finding F-7. They move with the enforcement or the enforcement is
only half-shipped.

## 6. Registering this work

All twelve IDs above are filed as rows in the **Backlog** table of
`STATUS-SOFTWARE.md`, with the types and `--requires` chains the Phase tables state.
`npm run work:next` walks them in that order; close each with `npm run work:done`
([work tracking](work-tracking.md)). Rows land via `work:add`, never by hand.

Verify commands name the test that will prove the item, whether or not that test exists
yet — the established pattern for unbuilt work. The five `bug` rows outrank every open
`quality` item, so filing them changed what the queue proposes; that ordering is the
intent, not a side effect.

## 7. Risks

| Risk                                                                                   | Mitigation                                                                                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Offer authoring becomes a dialog users blanket-approve**, making the control theatre | §3 constraint: offers are a byproduct of natural use. A capability that cannot meet it moves to host-fixed destination instead |
| Every existing app and all 25 cookbook samples break                                   | v1 strings keep their meaning; the host policy ships off in Phase 3 and turns on a release later                               |
| Phase 0 fixes get folded into Phase 2 and slip with it                                 | Phase 0 and 1 have no dependency on the design; they ship on 0.13.0 independently                                              |
| Scoping the taxonomy without scoping `relay:configure`, which turns radios on          | Explicitly out of scope here and named as a separate review, not silently omitted                                              |

## 8. Open questions

1. **Does `share:cas` need offers, or is content-addressing sufficient?** Decided
   with `CAP-EGRESS-WIRING`: content-addressing is sufficient. A t256 cannot name
   an arbitrary recipient; `share:cas` stays host-fixed.
2. **What is the default TTL per consent class** (Phase 1)? `sensitive` should plainly be
   session- or hours-scoped; `low` may reasonably be months. This needs a product call, not
   an engineering one.
3. **Does `announce:subscribe` need offers or just own-namespace enforcement?** Decided
   with `CAP-EGRESS-WIRING`: own-namespace is the whole answer. Announce left the
   offer-scoped set.
4. **Is there a migration path for already-installed apps** holding unscoped grants when
   Phase 3's policy turns on, or do they re-prompt on next launch?
