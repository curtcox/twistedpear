# SPEC-CAP — Capability taxonomy and grant lifecycle

<!-- tp-doc
lifecycle: live
audited: 2026-08-18
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** done (exemplar)

This is the exemplar spec: it shows the shape every other spec in
[specs/](../README.md) converges on. One formal model, four cross-checked
representations, multiple implementations, one conformance command. The prose below is
informative; the model and vectors are normative.

## Scope

Two things, deliberately together because one is meaningless without the other:

1. **The capability taxonomy** — the closed set of capability strings a mini-app may
   declare in `app.manifest.json`, with their user-facing grant descriptions.
2. **The grant lifecycle** — the state machine governing each (app, capability) grant
   from request to a terminal phase.

Web analog: the permissions model (geolocation, notifications) plus CORS-style
declared-and-granted access — but specified, not folkloric.

Out of scope: how grant screens and confirmation dialogs are _rendered_
([SPEC-CHROME](../spec-chrome/spec.md)); how declarations are parsed out of packages
([SPEC-PKG](../spec-pkg/spec.md)); the API surface each capability unlocks
([SPEC-SDK](../spec-sdk/spec.md)).

## Capability taxonomy

The canonical registry is `CAPABILITY_DEFINITIONS` in
[packages/miniapp-runtime](../../packages/miniapp-runtime/); the user-facing table is
in [docs/miniapp-sdk.md](../../docs/miniapp-sdk.md). Risk class is assigned in
[capability-risk.json](registry/capability-risk.json) and generated into
[capability-risk.gen.ts](../../packages/protocol/src/capability-risk.gen.ts). Rules:

- **Unknown capability strings block install.** There is no forward-compat waiver.
- The `apps:*` capabilities are **double-gated**: beyond the lifecycle below, every
  package/publish/install/preview call, and every `apps:channel` open, raises a host-chrome
  confirmation the app cannot draw over or acknowledge ([SPEC-CHROME](../spec-chrome/spec.md)).
  `apps:channel` names the destination app on that confirmation; messages copy only after
  both apps have granted the pair.
- A grant is scoped to one (app, capability) pair; nothing in this spec aggregates
  grants.
- Grants remain live while a mini-app is running in the background. Confirmations
  and media capture (`device.open` / `device.stream`) require the app to be the
  host's foreground mini-app; otherwise the broker returns `FOREGROUND_REQUIRED`.
- `link:observe` exposes only app-scoped peer summaries; `link:probe` is a separate,
  rate-limited traffic-generation authority.
- `device:share-policy:read` is read-only. Outbound share offers are authored and
  revoked in trusted host chrome, never by the app.
- `device:stream:raw-inbound` is separate from `device:stream`; without it, accepted
  media terminates in host-rendered video/speaker sinks and raw frames do not enter the
  sandbox.

## Grant lifecycle

### States

`requested` → the initial phase; `granted`, `active` → live phases;
`denied`, `expired`, `revoked` → terminal phases (intentionally deadlocked).

### Events and edges

| From      | Event class      | To      | Guard / effect                                  |
| --------- | ---------------- | ------- | ----------------------------------------------- |
| requested | `approve`        | granted | sets `expiresAt = at + max(0, ttlMs)`           |
| requested | `deny`           | denied  | —                                               |
| granted   | `first-use/live` | active  | only if `at < expiresAt`; records `firstUsedAt` |
| granted   | `ttl/expired`    | expired | only if `at >= expiresAt`                       |
| active    | `ttl/expired`    | expired | only if `at >= expiresAt`                       |
| granted   | `revoke`         | revoked | records `revokedAt`                             |
| active    | `revoke`         | revoked | records `revokedAt`                             |

Guards are total over the event tape: an event whose guard fails, or that arrives in a
phase with no matching edge, does not transition. Time enters only through event
payloads (`at`, `ttlMs`) — the machine is pure per
[SPEC-MACHINE](../spec-machine/spec.md).

There is no "no expiry" grant: `approve` requires `ttlMs` and always sets `expiresAt`
(a `ttlMs` of 0 expires at the approval instant). The executable table tolerates a null
`expiresAt` defensively, but that state is unreachable through the machine and no
vector exercises it; a grant without expiry would be a spec change, not a latent
feature.

### Properties (model-checked)

- **TypeOK** — phase and event alphabet closure (safety).
- **RequestedEventuallyResolves** — `requested` ~> not-`requested` under weak fairness
  of resolution: no grant request hangs forever (liveness).

## Normative artifacts

The four representations, cross-checked edge-for-edge on every CI run:

| Representation            | Artifact                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| TLA+ model (Layer-2 twin) | [model/grant.tla](model/grant.tla) + [model/grant.cfg](model/grant.cfg)                                                    |
| Checked traces            | [model/grant-conformance-traces.json](model/grant-conformance-traces.json)                                                 |
| Executable table          | `grantMachine` in [packages/protocol/src/grant-machine.ts](../../packages/protocol/src/grant-machine.ts)                   |
| Layer-3 vector            | [conformance/vectors/grant.json](../../conformance/vectors/grant.json) (generated by `scripts/vectors-generate-grant.mjs`) |

The TLA+ model abstracts guards and reducers (it models the edge relation); the
executable table and Layer-3 vector carry the guard/TTL semantics. Edge-set equality
across all four is the conformance bar; the vector suite is the authority on guarded
behavior.

## Conformance

```sh
npm run formal:grant   # cross-checks all four representations
```

Model-check safety and liveness directly (Java 17+, from `formal/`):

```sh
java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC -deadlock \
  -config ../specs/spec-cap/model/grant.cfg ../specs/spec-cap/model/grant.tla
```

`-deadlock` suppresses deadlock reporting because the terminal phases are intentional.
The checker itself is guarded against drift: `formal-conformance.test.ts` mutates a
copy of every table and proves the checker fails.

## Implementations

- Production grant host: `stepGrantHost` and `grantMachine` in
  [packages/protocol](../../packages/protocol/), driven by
  [packages/miniapp-runtime](../../packages/miniapp-runtime/)
- Simulator: the same machine under `SimKernel`
  ([SPEC-KERNEL](../spec-kernel/spec.md)) — no separate implementation, which is the
  point
- The TLA+ model itself, as the analysis implementation

## Egress offer lifecycle

A granted capability still does not name a destination. Destination-scoped authority is
a host-authored `EgressOffer`: `(appId, capability, targetKind, targetId)` plus
constraints, readable but never writable by the app. Offers are minted as a byproduct of
natural host-chrome use (picking a contact, accepting a call, scanning a QR), expire,
and revoke. Service-level enforcement (`assertEgressAllowed`) is specified here as the
permit function and is wired in a later host-API step.

### States

`absent` → the initial phase (not stored); `active` → live; `expired`, `revoked` →
terminal unless re-granted. Re-grant of the same id from any phase returns `active`.

### Events and edges

| From    | Event class   | To     | Guard / effect                                  |
| ------- | ------------- | ------ | ----------------------------------------------- |
| absent  | `grant`       | active | copies offer fields; `expiresAt = grantedAt + ttlMs` |
| active  | `grant`       | active | renew / replace                                 |
| expired | `grant`       | active | re-grant                                        |
| revoked | `grant`       | active | re-grant                                        |
| active  | `ttl/expired` | expired | only if `at >= expiresAt`                      |
| active  | `revoke`      | revoked | records `revokedAt`                            |

`egress/clear-sensitive` is a store-wide wipe, not a per-offer edge. Time enters only
through event payloads. `egressOfferPermits` is live only when `phase = active` and
`at < expiresAt`, and only when app, capability, target, and any stated constraint
fields match.

### Properties (model-checked)

- **TypeOK** — phase and event alphabet closure (safety).
- **ActiveEventuallyTerminates** — `active` ~> not-`active` under weak fairness of
  terminate (ttl or revoke): a live offer does not stand forever.

### Normative artifacts

| Representation            | Artifact                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| TLA+ model (Layer-2 twin) | [model/egress_offer.tla](model/egress_offer.tla) + [model/egress_offer.cfg](model/egress_offer.cfg)                                    |
| Checked traces            | [model/egress-offer-conformance-traces.json](model/egress-offer-conformance-traces.json)                                               |
| Executable table          | `egressOfferMachine` in [packages/protocol/src/egress-offer.ts](../../packages/protocol/src/egress-offer.ts)                           |
| Layer-3 vector            | [conformance/vectors/egress-offer.json](../../conformance/vectors/egress-offer.json) (generated by `scripts/vectors-generate-egress-offer.mjs`) |

```sh
npm run formal:egress-offer
```
