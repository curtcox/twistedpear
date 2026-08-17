# Device identity and user identity — delivery plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-14
register: software
counterpart: docs/linked-devices.md
-->

**This document contains only work that is not yet built.** What ships today — the
account-to-installation certificate format, roster and announce, the one-way linked-mode
switch, account journal, sibling-decision chrome and store wiring, locator v2, and the
per-installation boundaries that already hold —
is recorded in
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
**Implemented** — see the live document. Desktop, native, and web chrome label the peripheral
inventory **Hardware access**. The linked-installation screen can take **Your devices**
without sharing a word. `device:<class>:<tier>` capabilities, SPEC-DEVICE, the Device Manager,
and every wire value keep their spelling.

## Remaining work

**Host wiring for linked mode.** The one-way switch is built — see the live document. Shipping
hosts still start unlinked: `createNodeHost` loads a single identity, and
`createInstallationIdentityLoader` still falls back to the publisher key. Chrome that shows
both hashes and calls `enable`, then registers host and app serving destinations under
`identities().serving`, is what remains. Desktop and mobile still need to mount
`createSiblingDecisionChrome` so held proposals are visible in the running host.

## Non-goals for v1

Key rotation, global installation revocation, a shared filesystem, and syncing mini-app KV,
Hyperbee, workspace files, or arbitrary app state. Those remain installation-local unless an
app exchanges them explicitly. Account-root compromise still compromises every linked
installation and every publisher signature.

## Closure

Archive this plan when linked mode can be enabled on desktop and mobile, held proposals are
renderable and applicable through host chrome, capability grants are still proven not to
travel, and the live document has absorbed each mechanism as it lands.
