# Device identity and user identity — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-14
register: none
counterpart: docs/linked-devices-plan.md
-->

What the shipped code actually does about the boundary between **a user** and **one of
that user's machines**. The remaining linked-account work — sibling-decision chrome —
lives in
[Device identity and user identity — delivery plan](linked-devices-plan.md). Where the two
disagree, this file wins.

## Today every host is unlinked, and a device is a user

`loadOrCreateIdentity` ([packages/host-core/src/identity.ts](../packages/host-core/src/identity.ts))
creates exactly one Reticulum identity per installation. That single key is simultaneously:

- the host's network identity and addressable peer;
- the user's LXMF correspondent;
- the publisher identity that signs mini-app packages.

There is no account identity distinct from it, and no host offers a linked mode. A user with
a phone and a laptop therefore presents as **two unrelated peers**. Copying the encrypted
identity backup to a second machine does not merge them into one user — it makes two hosts
announce the same destination key, which
[identity-backup.md](identity-backup.md) calls out as unsupported: that document scopes
itself to a single identity and states it does not link devices or support simultaneous use
of one identity on two hosts.

Treat this as the operative model when reasoning about anything user-facing. The rest of
this file describes the pieces that exist to support a future distinction, not a distinction
that is in force.

## What ships toward the distinction

Five library pieces are implemented and tested. Shipping hosts still start unlinked;
the one-way switch exists, but no host chrome calls it yet.

**Account-to-installation certificates**
([packages/host-core/src/linked-installation.ts](../packages/host-core/src/linked-installation.ts)).
An installation gets a random 16-byte id; its 64-byte Reticulum private key is derived with
HKDF-SHA256 from the account private key, the fixed salt
`TwistedPear linked device identity v1`, and the installation id. The account signs a compact
`TPDV\x01` certificate over the account public key, installation id, derived installation
public key, creation time, and a bounded user-visible label. Certificates are capped at 383
bytes so they fit a Reticulum announce `app_data`, and the announce aspect is derived from a
hash of the account key. Verification requires the account signature, so a transport or
bootstrap operator cannot graft a machine onto someone else's account.

The module is exported from `index.ts` and `web.ts`. A host persists verified certificates
in a key/value roster
([packages/host-core/src/linked-installation-roster.ts](../packages/host-core/src/linked-installation-roster.ts)),
announce them under the account-derived aspect
([packages/host-core/src/linked-installation-announce.ts](../packages/host-core/src/linked-installation-announce.ts)),
and merge a peer's certificate only when the account signature verifies, the account
matches, the announced identity owns the certified installation key, and that
installation id is not already bound to a different key. Shipping hosts still do not
enable linked mode, so this destination is unused on the wire until a host opts in.

**Linked-mode switch**
([packages/host-core/src/linked-mode.ts](../packages/host-core/src/linked-mode.ts)).
`previewLinkedModeSwitch` returns the account hash (publisher, unchanged) and the
installation hash (where this host will live on the network) before anything is
written. `enable` requires both hashes to be confirmed, persists a one-way flag, and
from then on `identities().serving` is the derived installation while
`identities().publisher` stays the vault/account identity. There is no disable:
returning the account key to live destination use would recreate the multi-host
collision. Importing an encrypted backup or recovery words restores the account
identity and does not write the linked-mode store; pairing a new installation is the
same — joining stays an explicit `enable` after the account hash was already
confirmed. Host and app serving destinations that register under `serving`, and a
v2 CAS locator that carries `servingPublicKey` separately from the publisher, are
how the split shows up on the wire.

**Pairing.** An existing installation exports the ordinary encrypted account backup
(`TPIDBK01`). The header carries the account hash without the passphrase, so the new
machine can show it and require confirmation before decrypting. A mismatched
confirmation throws and writes nothing. After a confirmed import, `pairNewLinkedInstallation`
derives a fresh installation identity and certificate; the caller persists the roster
entry. The transfer passphrase travels by a separate channel. The export warns that a
link backup is equivalent to the account recovery words: whoever holds both becomes
the account. Pairing does not enable linked mode; that remains a separate confirmation
of both hashes.

**Account journal**
([packages/host-core/src/account-journal.ts](../packages/host-core/src/account-journal.ts)).
Records are content-addressed `TPJR\x01` payloads, signed by the emitting installation
identity, encrypted under an account-derived AES-GCM key (`TPJE\x01`), and stored
append-only, deduplicated by record hash. The decision class must be one of the four
sibling classes; there is still no class that could carry a capability grant. Records are
capped at the multipart budget (64 KiB, hard ceiling 1,000,000 bytes). Nothing in the
journal applies itself — `accountJournalRecordAsProposal` is how a record is handed to
`SiblingDecisionGate`. Fan-out uses the certified installation destination that already
carries the `TPDV` certificate
([packages/host-core/src/account-journal-exchange.ts](../packages/host-core/src/account-journal-exchange.ts)).

**Locator v2** ([packages/cas-256t/src/locator.ts](../packages/cas-256t/src/locator.ts)).
`servingPublicKey` is carried separately from `publisherPublicKey`, and v2 is emitted only
when the two diverge; a v1 locator implies they are the same. This is the wire room a
serving installation needs in order to differ from the publishing account.

## Boundaries that already hold per installation

These hold today, and they hold for a structural reason rather than by policy: **no
cross-installation synchronisation exists at all.**

| State                        | Owner                                                                                                      | Scope                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Capability grants            | `GrantStore` ([miniapp-runtime/src/capabilities.ts](../packages/miniapp-runtime/src/capabilities.ts))      | Host-local KV, keyed `(appId, publisherPublicKey)` — no account dimension |
| Publisher trust              | `TrustStore` ([app-registry/src/trust.ts](../packages/app-registry/src/trust.ts))                          | Host-local KV under `trust:publishers`                                    |
| Block / mute / local reports | `FileModerationStore` ([host-core/src/moderation-store.ts](../packages/host-core/src/moderation-store.ts)) | Host-local file                                                           |

So a user may already grant the same app different capabilities on different machines, and
trust a publisher on one machine and not another. The grant key has nowhere to put an account
id, which is the property the journal and the sibling gate preserve — see the plan.
[grant-installation-scope.test.ts](../packages/miniapp-runtime/test/grant-installation-scope.test.ts)
pins it: the key carries no account dimension, one machine's grant never reaches another, an
unasked machine stays ungranted, and every persisted key — including the lifecycle authority
record — stays under one installation-local prefix.

## What a mini-app can see

A mini-app cannot identify the machine it is running on and cannot correlate a user across
machines:

- `HostInfo` ([miniapp-runtime/src/services/host-info.ts](../packages/miniapp-runtime/src/services/host-info.ts))
  exposes platform, versions, roles, interface types, quotas, granted capabilities, and
  device-class inventory — no installation id, no account id, no stable per-machine value.
- [packages/protocol/src/device-fingerprint.ts](../packages/protocol/src/device-fingerprint.ts)
  strips `deviceModel`, `deviceSerial`, `deviceId`, sensor calibration, lens intrinsics, and
  hardware latency from sensor samples before they reach an app.

## App-scoped identity

An app that holds the `identity` capability signs with its own Reticulum identity, derived
from **the installation identity** — never the account key, and never the raw installation
key
([packages/host-core/src/app-scoped-identity.ts](../packages/host-core/src/app-scoped-identity.ts)).
Derivation is HKDF-SHA256 over the installation private key, the salt
`TwistedPear app-scoped identity v1`, and a hash of the length-prefixed app id concatenated
with the publisher public key. Two properties follow:

- The same app on two of a user's machines is two peers with two addresses, so an app cannot
  correlate a user across their machines.
- The same app id signed by a different publisher is a different identity, so a package
  cannot inherit an existing app's address by reusing its id.

Both worklet hosts wire this by default
([worklet-core/src/miniapp-host.mjs](../packages/worklet-core/src/miniapp-host.mjs),
[web-miniapp-host.mjs](../packages/worklet-core/src/web-miniapp-host.mjs)) through
`createInstallationIdentityLoader`. On an unlinked host that loader resolves to the single
host key in its _installation_ role. Once a host calls `enable` on the linked-mode switch,
this loader must return `identities().serving` so app-scoped identities follow the
installation rather than the account. Shipping hosts have not made that call yet.

This replaced a stub that returned `app:<appId>:<publisher-prefix>` as a destination hash and
a `sign()` producing the literal text `signed:<payload>` — a forged signature reachable by any
app holding `identity`. Closed as `ID-APPSCOPE`.

### Asking before the node has started

The loader returns null while the node is still starting or the vault is locked, and a
mini-app launched during that window is a race rather than an error: the identity is coming.
Each backend method waits out a bounded readiness window (15 s by default, polling with
backoff because the loader is not free — the desktop host pushes locked state to the renderer
each time it finds nothing) and then serves the derived identity. If nothing arrives, the call
rejects with `IdentityUnavailableError`, and the mini-app sees the broker code
`IDENTITY_UNAVAILABLE`. That code is distinct from a capability denial on purpose: an app that
was never granted `identity` and an app whose host has no identity yet are different
situations, and only one of them is the app's fault. A missing identity is never substituted
with a derivable or stub one — the app gets the real derived identity or an error.

Closed as `BUG-MINIAPP-IDENTITY-BACKEND`, where the unbounded form of this refusal stopped
every worklet-hosted mini-app from rendering.

## Sibling decisions are proposals, not effects

A decision made on another of the user's installations does not take effect here just because
it arrived. `SiblingDecisionGate`
([packages/host-core/src/sibling-decisions.ts](../packages/host-core/src/sibling-decisions.ts))
decides what an incoming record may do, and the answer is nothing unless this installation
holds a grant for that class of decision from that sibling.

- **Default deny.** A fresh installation holds every class and applies none.
- **Per sibling and per class.** Granting `sibling:moderation` from the laptop applies
  nothing from the tablet, and nothing in `sibling:trust` from the laptop.
- **Held, not dropped.** An ungranted proposal is stored and surfaced, so the user can be
  shown what is waiting and grant afterwards; `grantAndRelease` then returns exactly the
  backlog that grant answers for.
- **Revocable**, and revocation does not undo what was already applied — the gate governs
  what may be applied, not what was.
- **Rejects rather than holds** an unknown class, an installation that is not a sibling, its
  own echo, and a record hash it has already seen.
- **Applies nothing itself.** It returns a verdict plus the payload; the caller performs the
  effect. That is what makes the policy testable independently of any store it governs.

The vocabulary is closed: `sibling:moderation`, `sibling:trust`, `sibling:apps`,
`sibling:messages`. **There is no class that could carry a capability grant**, which is the
other half of the guarantee in the table above — a grant given to an app on one machine has
no route to another. Both halves are pinned by tests.

The roster predicate and the durable proposal store are injected, which is why the gate
could ship before the roster (`ID-ROSTER`) and the journal (`ID-JOURNAL`). Both now
exist. `createSiblingDecisionChrome`
([packages/host-core/src/sibling-decisions-wiring.ts](../packages/host-core/src/sibling-decisions-wiring.ts))
turns an `apply` verdict into a write on `FileModerationStore` or `TrustStore`, persists
held proposals in the host KV store, and shapes the prompt chrome renders ("Laptop blocked
this sender — apply here?"). Grant and revoke are the same per-sibling, per-class controls
the gate already had. Removing an installation from the local roster is not a global
revocation; the chrome exposes that as `SIBLING_ROSTER_REMOVAL_NOTICE` rather than leaving
it as a comment. Shipping hosts have not mounted this chrome yet.

## Naming: installation vs device

The word _device_ means two unrelated things in this codebase, and conflating them would
confuse a user-identity boundary with a hardware one.

- **Installation** — one TwistedPear host on one of the user's machines; the thing a user
  calls "my phone". Code spells this `installation` (`installationId`,
  `LinkedInstallationCertificate`, `deriveLinkedInstallationIdentity`).
- **Device** — a peripheral: camera, microphone, sensor, actuator. This is the sense used by
  the Device Manager, `device:<class>:<tier>` capabilities, and
  [SPEC-DEVICE](../specs/spec-device/spec.md). Host chrome for that inventory is labelled
  **Hardware access**, so **Your devices** stays free for the linked-installation screen.

Wire values keep the older spelling deliberately: the `TPDV\x01` magic, the HKDF salt
`TwistedPear linked device identity v1`, and the `linked-device` announce aspect are
unchanged, so the format stays byte-compatible with what is documented and pinned by tests.
Only TypeScript identifiers moved. User-facing prose may keep saying "device" for an
installation where that is the plainer word.
