# Device identity and user identity — delivery plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-10
register: software
counterpart: docs/linked-devices.md
-->

**This document contains only work that is not yet built.** What ships today — the
account-to-installation certificate format, locator v2, and the per-installation boundaries
that already hold — is recorded in
[Device identity and user identity — current implementation](linked-devices.md). That live
document overrides this plan if they disagree.

The goal is a platform where **a user is not a machine**: one long-lived account identity,
many installations, and every capability or trust decision scoped to the installation that
made it unless the user says otherwise.

## Decisions

Recorded 2026-08-10. These settle questions the earlier design left open or answered
differently.

**1. One account identity, one derived identity per installation.** The account identity
remains the trust root for packages and installation certificates and is never registered as
a live Reticulum destination once linked mode is enabled, so two hosts never announce the
same private identity. Unlinked installations keep their present single-identity behaviour
and wire formats; linked mode is opt-in.

**2. Accepting a decision made on another installation is itself a per-installation gated
capability.** This replaces the earlier design, in which trust, block, mute, and local-report
changes synced account-wide as ordinary journal records. Sibling decisions are never ambient.
A journal record from another installation is a **proposal**, not an effect: it is verified,
stored, and surfaced, but applied only where the receiving installation holds a grant for
that class of decision. Default is deny, and the grant is revocable per sibling and per
class.

Consequences to preserve:

- Capability grants have **no** sibling class. They never travel, in either direction. The
  `GrantStore` key stays `(appId, publisherPublicKey)` with no account dimension, so there
  is nowhere for a cross-installation grant to live even by mistake.
- A user may block someone on their phone and have that take effect on the laptop only
  because the laptop was told to accept moderation decisions from the phone.
- Because the gate is itself a grant, and grants are host-local, the gate is per-installation
  by construction rather than by policy.

**The gate is implemented** — see the live document. The classes below are the shipped closed
vocabulary, each independently grantable per sibling installation:

| Class                | Governs                                                        |
| -------------------- | -------------------------------------------------------------- |
| `sibling:moderation` | block, mute, local-report changes                              |
| `sibling:trust`      | publisher trust-list additions and removals                    |
| `sibling:apps`       | installed-app and active-version changes                       |
| `sibling:messages`   | received/sent LXMF envelope metadata and ciphertext references |

**3. App-scoped identity derives from the installation key, not the account key.** An app
running on two of a user's machines is two peers with two addresses. This keeps a mini-app
from correlating a user across machines and keeps a compromised app on one machine from
speaking as the user everywhere. The cost is accepted: a message addressed to an app reaches
the installation it was addressed to, and any cross-machine continuity an app wants is the
app's own problem, exchanged explicitly. **Implemented** — see the live document. When linked
mode lands, `createInstallationIdentityLoader` must be repointed at the derived installation
identity rather than the account key it currently resolves to on an unlinked host.

**4. Installation and device are different words.** Code says `installation` for a user's
machine and reserves `device` for peripherals. Already applied to
`packages/host-core/src/linked-installation.ts`; wire values were deliberately left
unchanged. See the live document for the full rule.

**5. In the UI, "devices" means the user's machines; the peripheral panel gives up the word.**
The existing Devices chrome lists cameras, microphones, and sensors. That is jargon: to a
user, "my devices" means their phone and laptop, which is exactly what the linked-installation
screen shows. So the linked-installation screen takes **Your devices**, and the peripheral
panel is relabelled — "Hardware access" — rather than the new screen inventing an awkward
name to avoid a collision.

This is a user-visible label change to a shipped surface, but only a label: the
`device:<class>:<tier>` capabilities, SPEC-DEVICE, the Device Manager, and every wire value
keep their spelling. Tracked as `ID-DEVICES-RELABEL`, which must land before the first
linked-installation screen so the two never ship sharing a word.

## Remaining work

**Installation roster and pairing.** Persist verified certificates; announce under the
account-derived aspect; merge valid certificates into a local roster. Both pairing
directions — exporting a short-lived encrypted account backup from an existing installation,
and importing it on a new one — with the account hash confirmed before anything is written.
The transfer passphrase travels by a separate channel. A link backup is equivalent to the
account recovery words: whoever holds both becomes the account, and the UI must say so.

**Account journal.** Encrypted, append-only, exchanged over certified installation
destinations. Records are content-addressed, signed by the emitting installation certificate,
deduplicated by record hash, and bounded by the same propagation and multipart limits as
ordinary host traffic. Nothing in the journal applies itself — see decision 2.

**Sibling-decision chrome and wiring.** The gate itself is built — see the live document for
what it decides and guarantees. What remains is the surface and the effects: chrome that
renders held proposals ("your laptop blocked this sender — apply here?"), the grant and
revoke controls behind it, a durable proposal store to replace the in-memory one, and the
code that turns an `apply` verdict into an actual write to the moderation and trust stores.
Removal from the local roster stops journal fan-out, but v1 has no global revocation service,
so offline installations learn of a removal only when they next sync. That limit must be
stated in the UI rather than implied.

**Linked-mode switch.** Enabling is a one-way network-address migration for that
installation: the account/publisher hash stays stable while host and app serving destinations
move to the installation identity. Show both hashes before confirming. Disabling is not
offered, because returning the account key to live destination use could recreate the
multi-host collision the design exists to prevent. Importing a backup or recovery words must
not silently enable linked mode; joining an account stays an explicit, separate choice so
ordinary disaster recovery does not change network-identity behaviour.

**Relabel the peripheral panel.** Per decision 5, the Devices chrome becomes "Hardware
access" so the linked-installation screen can be "Your devices". Label strings only; no wire
value, capability, or spec term changes. Must land before the first linked-installation
screen.

## Non-goals for v1

Key rotation, global installation revocation, a shared filesystem, and syncing mini-app KV,
Hyperbee, workspace files, or arbitrary app state. Those remain installation-local unless an
app exchanges them explicitly. Account-root compromise still compromises every linked
installation and every publisher signature.

## Closure

Archive this plan when linked mode can be enabled on desktop and mobile, held proposals are
renderable and applicable through host chrome, capability grants are still proven not to
travel once the journal exists, the peripheral panel has been relabelled, and the live
document has absorbed each mechanism as it lands.
