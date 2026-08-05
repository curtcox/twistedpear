# 10. Updates, trust, and versioning

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Shipping version two is where a distributed platform gets interesting. There is no server to
flip, no forced update, and no way to reach back into an installed copy.

## Your key is the app's identity

App identity is **publisher public key + app name**. The first time a host sees your app, it
pins that key. Every subsequent version must be signed by the same key or the host rejects it
as a substitute publisher.

This is what makes updates safe without a registry: nobody can publish "your" app but you.

It also means:

> **⏳ Not yet available — key rotation, revocation, and multi-maintainer apps.** If you lose
> the key, you cannot update the app — ever, for anyone who installed it. If the key is
> compromised, there is no revocation. Two people cannot both publish one app. All three are
> explicitly out of scope for v1. Back up your identity file. See
> [docs/package-format.md](../docs/package-format.md) §1.

## Versions only go up

`version` is semver, and monotonicity is enforced twice: at catalog ingest and again at
install. A host that has 1.2.0 will not accept 1.1.0, and the catalog keeps the latest version
it has seen, so an old package cannot be replayed at someone.

```sh
tp update my-app --version 0.2.0
```

Practical consequences:

- **You cannot un-publish.** Once a version is out and someone has it, it exists. Fix forward.
- **You cannot ship a downgrade as a fix.** If 1.2.0 is broken, ship 1.2.1.
- **Version numbers are cheap.** Bump for anything you hand to anyone.

## Grants survive updates

Grants are keyed by `appId + publisherPublicKey`, so an update signed by the same key inherits
the user's existing grants. They are deleted on uninstall.

The subtle case: **adding a capability in an update**. The new capability is not covered by
the existing grant, so calls against it fail until the user grants it. Do not assume a
capability you added in 1.3.0 is available just because the user installed 1.3.0 — check
`host.info().grantedCapabilities` and degrade ([Chapter 5](05-capabilities.md)).

Adding a capability is also a trust event from the user's side. An app that asked for four
things at install and now wants six is a thing worth explaining in your release notes, if you
have anywhere to put them.

## `minHostApi`

`minHostApi` states the oldest host API your app can run against. Adding a capability to the
platform bumps `HOST_API_VERSION` by a minor version — the dev-environment capabilities
shipped in `0.2.0`, `host.info()` in `0.3.0`, its `grantedCapabilities` field in `0.4.0`,
and `ai.chatStream()` in `0.5.0`.

Raise `minHostApi` when you start using newer surface. An unknown capability string blocks
install with guidance to update, which is a good failure; a too-low `minHostApi` lets an old
host install your app and then fail your calls at runtime, which is a bad one.

## Updating a running app

Updating an installed package **while it runs does not replace live code**. The new version
activates at the next launch. So an update is never a hot-swap, and you do not have to write
code that survives being replaced underneath itself.

![The host offering an available update for an installed app](/authors/images/10-update-available.png)

**Screenshot 10.1 — An update the user has not taken yet.** A catalog card for an installed
app showing "Board 1.1.0" with a blue badge reading "1.2.0 available". Beneath: the
publisher's short address with a "Trusted" badge, the new package size, and the line "Signed
by the same publisher — your permissions carry over." Buttons: **Update**, **Rollback to
1.0.0**, **Launch**. A grey note reads "The running app keeps version 1.1.0 until it is
restarted."

## Rollback

Hosts keep the previous version and let the user roll back. That is a user-side safety net,
not an author-side deployment tool — you cannot trigger it, and you should not rely on it
existing when you decide how carefully to test.

## Trusting publishers

A user can add your publisher identity to their trust store, by pasting or scanning your
identity string ([docs/256t-distribution.md](../docs/256t-distribution.md)):

```sh
tp trust add <256t identity string> --label "Alice"
tp trust list
```

Being trusted changes the _acceptance experience_: a one-confirmation install with a "Trusted"
badge, instead of the full warning flow for an unknown key.

Being trusted does **not**:

- skip the capability review — it is always shown;
- weaken first-seen key pinning, which stays authoritative against key swaps;
- imply anyone reviewed your code.

So trust is about "I know who this is", never "this is safe". Do not write copy in your app
that suggests otherwise.

## There is no moderation, and that is structural

No review, no takedown, no central authority — because there is no centre. Discovery is by
announce and subscription; defence against a malicious app rests on signatures, capability
grants, and user judgement.

For you as an author this cuts two ways. Nobody can arbitrarily remove your app. Nobody is
checking anyone else's either, so the trust users extend to you is a real thing you can spend,
and the capability list you ask for is the main evidence they have. See
[LIMITATIONS.md §7](../LIMITATIONS.md).

## A sane release routine

1. Bump `version`. Never reuse one.
2. If you added a capability, raise `minHostApi` and handle its absence at runtime.
3. Pack twice; confirm the archives are byte-identical.
4. Install the new version over the old one on a second device — not a fresh install.
5. Confirm your grants carried over and any new capability degrades cleanly when refused.
6. Publish, and make sure something is still seeding ([Chapter 9](09-packaging-and-publishing.md)).
7. Hand out the new 256t string. The old one still resolves to the old bytes forever.
