# Capability Scoping Audit — least authority for mini-app I/O

<!-- tp-doc
lifecycle: reference
audited: 2026-08-16
register: none
-->

An audit of whether the mini-app permission structure can grant an app exactly the I/O it
needs and no more. Companion to [security-review.md](security-review.md) (sandbox threat
model), [SPEC-CAP](../specs/spec-cap/spec.md) (taxonomy and grant lifecycle), and
[miniapp-sdk.md](miniapp-sdk.md) (the user-facing capability table).

**Scope:** the capability taxonomy, the grant lifecycle, the broker chokepoint, and every
mini-app-reachable service that can move bytes off the device. Out of scope: sandbox
escape (covered by the security review), package signature cryptography, and host OS
hardening.

**Question asked:** can an app that needs some form of I/O be given just that I/O and no
more, so that a granted capability cannot be turned into a general data-exfiltration
channel?

**Answer:** no, not in general. The model answers _"may this app touch this service at
all?"_ and is structurally incapable of answering _"…and only to these destinations, at
this volume, for this long."_

## 1. Why the model cannot express it

Three facts compose into the limit:

| Fact                                                        | Where                                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Declared capabilities are flat strings in a signed manifest | `capabilities: ReadonlyArray<string>` — [manifest.ts:28](../packages/app-registry/src/manifest.ts) |
| A grant is a set of those same strings                      | `GrantRecord.granted` — [capabilities.ts:214](../packages/miniapp-runtime/src/capabilities.ts)     |
| Enforcement is set membership                               | `assertCapabilityAllowed` — [capabilities.ts:555](../packages/miniapp-runtime/src/capabilities.ts) |

There is no slot on a declaration or on a grant to carry a peer allowlist, a destination
address, a key prefix, a namespace, or a byte budget. `MiniappBroker.dispatch` therefore
makes one decision — capability present or absent — and hands the request payload,
including any destination the app chose, straight to the service
([broker.ts:187](../packages/miniapp-runtime/src/broker.ts)).

This is what [security-review.md](security-review.md) F4 accepts today:

> A granted capability allows full use of that host service for the app namespace.

That acceptance is the finding. It is fine for local-only authority (storage, workspace) and
insufficient for anything that emits bytes to a network.

## 2. The system already knows how to do better — three times, three ways

None of these is reachable from the general taxonomy; each was built for one service.

### Tiering — scopes fidelity

`device:camera` yields barcodes, motion events, and counts; `device:camera:frames` yields
pixels. Same for `microphone`/`microphone:pcm`, `location`/`location:precise`,
`motion`/`motion:samples`, `screen-capture`, `nfc`. Generated from
[`device-classes.json`](../specs/spec-device/registry/device-classes.json) into
[device-capabilities.gen.ts](../packages/miniapp-runtime/src/device-capabilities.gen.ts),
carrying a `consentClass` of `low` / `elevated` / `sensitive` and per-class defaults
(`maxRateHz`, `maxSessionMs`).

This is real least-authority, and it is the right idea. But it scopes _how much data_, not
_where the data goes_, and it costs a new capability id per tier — the taxonomy is closed
and unknown strings block install, so every axis of scoping multiplies the id space.

### ShareOffer — scopes destination

[device-share.ts](../packages/protocol/src/device-share.ts) is the only destination-scoped
egress authority in the system. A `ShareOffer` binds `(appId, targetKind, targetId,
classId, tierId, maxRung, expiresAt)` and is **authored in trusted host chrome, never by
the app** — the app may only read the offer list (`device:share-policy:read`) and request
that chrome consider one. `DeviceManager.stream` refuses without a live matching offer
([device-manager/layer-1.ts:196](../packages/miniapp-runtime/src/device-manager/layer-1.ts)).

This is the correct shape, and section 5 recommends generalizing it.

### Per-operation confirmation — scopes one call

`apps:package/publish/install/preview`, Freenet `put`/`update`, elevated device sessions,
and NFC writes each raise a host-chrome confirmation the app cannot draw over
([confirm.ts](../packages/miniapp-runtime/src/confirm.ts)). Effective, but it does not
scale to high-frequency I/O — you cannot confirm every message a chat app sends.

### The best-shaped capability in the taxonomy

`ai:chat` is worth naming as a template: the endpoint and API key live host-side, the app
**cannot name a destination at all**, and inputs are capped (64 messages, 8,192 tokens,
16,384 chars/input, 64 inputs/batch). An app gets the I/O it needs without getting an
addressable channel. Where a service can be shaped this way, it should be.

## 3. Egress inventory

Every mini-app-reachable path that puts bytes somewhere the app did not already control.

| Capability             | Destination chosen by            | Bound on destination                               | Bound on volume                   |
| ---------------------- | -------------------------------- | -------------------------------------------------- | --------------------------------- |
| `device:stream`        | app                              | **ShareOffer** — host chrome authors it            | admission ladder, rung ceiling    |
| `peer:connect`         | app asks, **user confirms peer** | user confirmation; cross-app service names refused | timeout 1–300 s, bounded purpose  |
| `link:probe`           | app                              | app-scoped peer directory only                     | 8 KiB, 60 s/peer, control class   |
| `ai:chat` / `ai:embed` | **host** (fixed endpoint)        | app cannot name one                                | message/token/char/dimension caps |
| `resource:fetch`       | app (`resourceId`)               | backend-defined; only a loopback registry ships    | `budgetBytes`                     |
| `apps:publish`         | app                              | per-operation confirmation                         | —                                 |
| `freenet:contract`     | app (arbitrary key hex)          | put/update confirmed; **`get` unconfirmed**        | none beyond broker limits         |
| `share:cas`            | app (arbitrary t256 on `get`)    | **none**                                           | broker limits                     |
| `announce:publish`     | app (**arbitrary namespace**)    | **none — not validated**                           | broker limits                     |
| `lxmf:send`            | app (**any address**)            | **none**                                           | broker limits                     |

The only universal ceiling is the broker's: 256 KiB per message and 128 messages/second
per app ([broker.ts:238](../packages/miniapp-runtime/src/broker.ts)). That is a
flood control, not an exfiltration control — it still permits roughly 32 MB/s of
app-chosen bytes to an app-chosen destination.

**Timing caveat.** `lxmf:send` and `announce:publish` are today backed by in-memory /
KV-loopback services; no host adapter carries mini-app LXMF or announces over Reticulum yet
([LIMITATIONS.md §7](../LIMITATIONS.md)). Their present blast radius is within one host.
The permission structure needs to be fixed **before** those transports land, not after.

## 4. Findings

### F-1 — Grants cannot carry scope (high, structural)

Stated in section 1. Concretely: a chat app granted `lxmf:send` may message every address
the host can reach, not only its contacts, and no narrower grant is expressible. Every
destination control must be reinvented per service, as `ShareOffer` was. With F4 no longer
accepted, this is a defect rather than a documented trade-off.

### F-2 — `announce` namespace is app-controlled and unvalidated (high)

[layer-1-handlers-core.ts:217](../packages/miniapp-runtime/src/host/layer-1-handlers-core.ts)
forwards `payload.namespace` to the announce service unchecked; the app-scoped default
`miniapp-announce:${appId}` applies only when the field is absent. Both `publish` and
`subscribe` are affected, so an app can publish into and read from another app's namespace.

The capability descriptions claim otherwise — _"Publish the app destination"_ and
_"Receive announces in the app namespace"_
([capabilities.ts:61](../packages/miniapp-runtime/src/capabilities.ts)). Compare
[peers.ts](../packages/miniapp-runtime/src/services/peers.ts), which rejects a mismatched
`service` name with `PEERS_CROSS_APP_SCOPE`; announce has no equivalent. `appData` is
unbounded beyond the broker's message ceiling.

Today this is a cross-app scope escape within one host. Once
`TransportBackedAnnounceService` is wired to a real transport, it becomes arbitrary content
published on an arbitrary topic to the network.

_Fix:_ mirror the `peers.ts` check — reject any namespace other than the app's own, or
require a documented `miniapp-announce:${appId}/` prefix; bound `appData`.

### F-3 — `freenet.get` is unconfirmed and unscoped (medium)

[freenet.ts:72](../packages/miniapp-runtime/src/services/freenet.ts) validates that
`keyHex` is hex and passes it through. `put` and `update` carry the irreversibility
confirmation; `get` carries nothing — no confirmation, no key scoping, no rate limit beyond
the broker's.

The security review's own F9 lists as observable: _"every contract key read, put, updated,
or subscribed through it, plus timing, byte sizes, and the client's network address."_ An
app-chosen 32-byte key issued at broker rate is therefore a multi-KB/s covert channel to a
third-party node, with no user-visible event and no audit distinguishable from legitimate
reads.

_Fix:_ scope reads to keys derived from the app's identity or to a host-authored key
allowlist; failing that, budget and surface them.

### F-4 — Device consent fails open when a host wires no confirmation channel (medium)

[device-manager/layer-1-base.ts:443](../packages/miniapp-runtime/src/device-manager/layer-1-base.ts):

```ts
const effects = this.options.confirmationEffects;
if (effects === undefined) {
  if (this.options.confirmationChannel === undefined) return; // ← allows the session
  throw new DeviceError("DEVICE_DENIED", "Confirmation effects are required…");
}
```

A host that configures neither runs `device:camera:frames` and `device:microphone:pcm` on
the install-time grant alone. `requestHostConfirmation` itself fails **closed** —
`CONFIRMATION_UNAVAILABLE` when no channel exists
([confirm.ts:66](../packages/miniapp-runtime/src/confirm.ts)) — so the device path
deliberately diverges from the platform's own rule. `confirmNfcWrite` repeats the shape
([layer-2-samples.ts:446](../packages/miniapp-runtime/src/device-manager/layer-2-samples.ts)).

_Fix:_ fail closed, or make the exemption an explicit named host option so a host that
wants it has to say so.

### F-5 — Every grant is immortal in practice (medium)

SPEC-CAP is explicit: _"There is no 'no expiry' grant: `approve` requires `ttlMs` and
always sets `expiresAt`."_ In practice:

- `GrantStore.set` defaults `ttlMs = Number.MAX_SAFE_INTEGER - now`
  ([capabilities.ts:437](../packages/miniapp-runtime/src/capabilities.ts));
- no production caller passes a TTL — only tests do;
- `stepLifecycleHostEvent` synthesizes `expiresAt: Number.MAX_SAFE_INTEGER` for a
  capability present in the record but absent from the lifecycle map
  ([grants.ts:189](../packages/protocol/src/grants.ts)).

The TTL machinery is model-checked, cross-checked four ways, and unused. A capability
needed once — import contacts, publish a package — stays granted forever, which is the
single cheapest available reduction in exfiltration surface going unused.

### F-6 — Stale grants survive `GrantStore.delete` for a running app (low)

[host/layer-2.ts:266](../packages/miniapp-runtime/src/host/layer-2.ts):

```ts
grantedCapabilities: freshGrants?.granted ?? granted,
```

When `use()` returns `null` — which happens once the record is deleted — dispatch falls
back to the capability array captured at launch. Clearing an app's grants while it runs has
no effect until relaunch. `revoke()` is unaffected: the record persists minus the
capability, so the fresh read is authoritative.

### F-7 — Description/enforcement drift (low)

Grant descriptions are the user's only account of what they are approving, so they are part
of the security surface. `link:observe`'s app-scoping claim is enforced; `announce`'s is not
(F-2). Any scoping added by the recommendations below needs the descriptions to move with it.

## 5. Recommendations

Ordered by ratio of exfiltration surface removed to work required. Items 1–4 are
independent of the structural change and can land first.

1. **Validate the announce namespace** (F-2). One check mirroring `peers.ts`. Closes a live
   cross-app scope escape and prevents it from becoming a network-facing one.
2. **Make device confirmation fail closed** (F-4), or name the exemption explicitly.
3. **Confirm, scope, or budget `freenet.get`** (F-3).
4. **Make TTL real** (F-5): require an explicit `ttlMs` at every call site so "forever" is a
   value someone typed, and give sensitive-consent-class capabilities a short default.
5. **Generalize `ShareOffer` into a host-authored egress offer.** One authority covering
   LXMF destinations, announce namespaces, Freenet key prefixes, and CAS ids, with the same
   shape that already works for media: `(appId, target, class, TTL, revoke)`, authored in
   trusted chrome, readable but not writable by the app.

   This is the recommendation that actually defeats exfiltration, and the reason is a
   property no amount of taxonomy refinement provides: **the app names a purpose, the user
   names the destination.** A hostile app handed a finer-grained capability will simply
   request the destination it wants; a hostile app facing an egress offer cannot invent one.
   It also reuses a machine that is already model-checked and already shipping.

6. **Add scope to the grant, and let the manifest declare its shape.** With package-format
   changes on the table, the cleanest split is:
   - the **signed manifest** declares capability _and scope shape_ — what the app will ever
     ask for (`{"id": "lxmf:send", "scope": "user-selected-contacts"}`), which makes the
     install-time review honest about the app's reach;
   - the **host-side grant record** carries the resolved scope — the actual peers,
     namespaces, or budgets the user approved, so it can change without reissuing a
     signature.

   `assertCapabilityAllowed` returns the scope instead of a bare capability, and each
   service asserts its request payload against it. SPEC-CAP grows a scope dimension across
   all four representations; the package format goes to v2. This is the widest change here
   and should follow, not precede, item 5 — build the enforcement mechanism first, then
   generalize the declaration to match it.

7. **Per-capability egress budgets in the grant screen.** Bytes/day per capability, shown at
   grant time and enforced at the broker. `ContainmentTracker` in
   [sim-campaign/src/metrics.ts](../packages/sim-campaign/src/metrics.ts) already measures
   egress attributability, so the simulator has a place to test them.

## 6. Verification of the claims above

Every finding is a code read; none required a new test. To re-derive:

```sh
npm run build
npm test -- packages/miniapp-runtime/test/capabilities.test.ts packages/miniapp-runtime/test/broker.test.ts
npm run formal:grant
npm run test:hostile-apps
```

`test:hostile-apps` covers capability substitution, UI-event forgery, broker flood,
widget-tree abuse, cross-app announce namespaces (F-2), unconfirmed Freenet reads (F-3),
confirmation-channel-absent device sessions (F-4), and stale grants after revoke (F-6).
