# Device identity and user identity — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-10
register: none
counterpart: docs/linked-devices-plan.md
-->

What the shipped code actually does about the boundary between **a user** and **one of
that user's machines**. The linked-account design that this file used to describe — roster,
pairing, account journal, mode switch — is not built; it now lives in
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

Two format-level pieces are implemented and tested, and are inert until a host enables
linked mode.

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

The module is exported from `index.ts` and `web.ts` and **consumed by nothing**. There is no
roster, no pairing flow, no announce integration, and no persistence.

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
id, which is the property worth preserving when the journal lands — see the plan.
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
host key in its _installation_ role; it is the one place to repoint when linked mode lands.
Registering a live Destination under an app's announce aspects stays a separate concern; this
is the identity that path must use.

This replaced a stub that returned `app:<appId>:<publisher-prefix>` as a destination hash and
a `sign()` producing the literal text `signed:<payload>` — a forged signature reachable by any
app holding `identity`. Closed as `ID-APPSCOPE`.

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

The roster predicate and the durable proposal store are injected, which is why the gate is
finished before the roster (`ID-ROSTER`) and the journal (`ID-JOURNAL`) exist. The host chrome
that renders held proposals, and the wiring that applies an `apply` verdict to the moderation
and trust stores, are not built.

## Naming: installation vs device

The word _device_ means two unrelated things in this codebase, and conflating them would
confuse a user-identity boundary with a hardware one.

- **Installation** — one TwistedPear host on one of the user's machines; the thing a user
  calls "my phone". Code spells this `installation` (`installationId`,
  `LinkedInstallationCertificate`, `deriveLinkedInstallationIdentity`).
- **Device** — a peripheral: camera, microphone, sensor, actuator. This is the sense used by
  the Device Manager, the Devices chrome, `device:<class>:<tier>` capabilities, and
  [SPEC-DEVICE](../specs/spec-device/spec.md).

Wire values keep the older spelling deliberately: the `TPDV\x01` magic, the HKDF salt
`TwistedPear linked device identity v1`, and the `linked-device` announce aspect are
unchanged, so the format stays byte-compatible with what is documented and pinned by tests.
Only TypeScript identifiers moved. User-facing prose may keep saying "device" for an
installation where that is the plainer word, but the UI naming collision with the existing
Devices panel is unresolved and is a plan item.
