# 13. Shipping checklist

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Work through this before you hand anyone a 256t string. It is short because the platform is
small, and every item on it corresponds to something that has actually gone wrong.

## Manifest

- [ ] `name` is one you can live with permanently — app identity is publisher key + name, and
      a host pins the pair on first sight ([Chapter 10](10-updates-and-trust.md)).
- [ ] `version` is higher than anything you have published. You cannot go down.
- [ ] `capabilities` lists everything you call, and **nothing you do not**.
- [ ] `minHostApi` matches the newest surface you use — `0.2.0` for `workspace`, `ai:chat`,
      `apps:*`, or `share:cas`; `0.3.0` for `host.info()`; `0.4.0` for
      `host.info().grantedCapabilities`; `0.5.0` for `ai.chatStream()`.
- [ ] No typos in capability strings. An unknown string blocks install entirely.

## Behaviour

- [ ] Every capability degrades. Preview with each one switched off and confirm the app stays
      usable and explains itself ([Chapter 5](05-capabilities.md)).
- [ ] No `CapabilityError` reaches the user as a raw string.
- [ ] State persists as you go — there is no suspend hook, and suspension is normal.
- [ ] Storage failures are handled. A write over quota fails; it does not evict.
- [ ] No render loop. Watch the messages/sec counter in Runtime controls while you use the app
      normally ([Chapter 12](12-limits-and-budgets.md)).
- [ ] Nothing blocks on a network call. A peer may never answer.
- [ ] Confirmation-gated calls (`apps:*`) handle denial and the 60-second timeout as normal
      outcomes, and never retry in a loop.

## Interface

- [ ] Renders correctly on a phone-width layout, not just your desktop window.
- [ ] Every interactive node has a stable `id` across renders.
- [ ] Long lists are paged, not dumped.
- [ ] Tested on every host you claim to support — desktop, mobile, browser
      ([Chapter 11](11-testing-and-debugging.md)).

## Size

- [ ] You know your package size in bytes.
- [ ] It is under 9 KiB if you want LoRa-reachable users to install it; under 180 KiB for
      Bluetooth; otherwise you are LAN-and-internet only, deliberately.
- [ ] No asset in the package that is not used.

![The final package summary before publishing](/authors/images/13-package-summary.png)

**Screenshot 13.1 — The last screen before you commit.** A summary panel: app name and
version at the top, then a two-column list — "Package size: 2.6 KiB", "Files: 1", "Capabilities:
4", "Signed by: `<fingerprint>`", "minHostApi: 0.1.0", "Est. install over LoRa: 18 s". Below,
the capability list exactly as the installing user will see it, in plain language. Bottom:
**Publish** and **Back** buttons, with a grey note reading "Publishing is permanent. This
version cannot be withdrawn."

## Packaging

- [ ] `tp pack` twice produces byte-identical archives.
- [ ] The package installs from its 256t identifier on a **second device**, not just yours.
- [ ] The capability review reads correctly — you have looked at your own grant screen.
- [ ] If this is an update: it installs **over** the previous version, grants carry across, and
      any newly added capability degrades cleanly when refused.

## Distribution

- [ ] Something that stays online is seeding the package
      ([Chapter 9](09-packaging-and-publishing.md)).
- [ ] The announce has gone out — a recipient can only resolve an identifier they have heard a
      locator for.
- [ ] Your publisher identity file is backed up. There is no key rotation, no revocation, and
      no recovery.

## Honesty

- [ ] Your app does not imply anonymity. Payloads are encrypted; local radio presence is not
      ([LIMITATIONS.md §9](../LIMITATIONS.md)).
- [ ] Your app does not imply your signature means it was reviewed. It means it came from your
      key.
- [ ] Anything the app stores is described as local-only, because it is — uninstall or device
      loss is data loss.
- [ ] If the app announces, transmits often, or keeps a radio busy, the user knows and can
      turn it off.

## Then

Hand out the string. The old ones keep resolving to the old bytes, forever.

If something on this list turned out to be wrong in a way this guide did not warn you about,
that is a documentation bug worth filing — the registers behind
[Appendix: feature status](appendix-feature-status.md) are how that gets fixed.
