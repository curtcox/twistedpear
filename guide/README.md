# TwistedPear User Guide

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

This is the guide for **people who use TwistedPear**, not for people who build it.
It covers installing a host, joining a network, finding and running mini-apps,
messaging other people, and keeping your device healthy.

You do not need to know anything about Reticulum, LXMF, or JavaScript to follow it.
Where a term matters, it is explained the first time it appears.

![The TwistedPear desktop host on first launch](/guide/images/00-hero-desktop-host.png)

**Screenshot 0.1 — The desktop host, freshly installed.** Full application window at
1280×800. Left column shows the _Node status_ panel with a green "connected" dot,
"Interfaces: 2 online", and an identity fingerprint. Right column shows an empty
_Catalog_ with the placeholder text "No apps in catalog yet." Top-right shows the
_Settings_ and _Show my identity_ buttons.

## Chapters

| #   | Chapter                                                          | What you get out of it                                                                                                       |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | [What TwistedPear is](01-what-is-twistedpear.md)                 | The mental model: hosts, mini-apps, peers, and why there is no server.                                                       |
| 2   | [Installing a host](02-installing-a-host.md)                     | Getting TwistedPear running on desktop, Android, iPhone, or in a browser.                                                    |
| 3   | [First run and your identity](03-first-run-and-identity.md)      | Creating your identity, backing it up, and what happens if you lose it.                                                      |
| 4   | [Joining a network](04-joining-a-network.md)                     | Local Wi-Fi, a gateway node, Bluetooth, and LoRa radios.                                                                     |
| 5   | [Finding and installing apps](05-finding-and-installing-apps.md) | The announce browser, 256t identifiers, and the capability review screen.                                                    |
| 6   | [Using apps](06-using-apps.md)                                   | Running, suspending, updating, rolling back, and removing mini-apps.                                                         |
| 7   | [Messaging](07-messaging.md)                                     | Sending and receiving messages, including when the other person is offline.                                                  |
| 8   | [Trust, privacy, and safety](08-trust-privacy-safety.md)         | What is encrypted, what is observable, and who you are trusting.                                                             |
| 9   | [Managing your device](09-managing-your-device.md)               | Storage, bandwidth, battery, quotas, and running an always-on peer.                                                          |
| 10  | [Troubleshooting](10-troubleshooting.md)                         | Symptom-first fixes for the problems people actually hit.                                                                    |
| 11  | [Using Freenet](11-using-freenet.md)                             | Optional desktop/headless package distribution, packet transport, propagation, and contract access through an external node. |
| —   | [Appendix: feature status](appendix-feature-status.md)           | Every incomplete feature named in this guide, with its blocker.                                                              |
| —   | [Glossary](glossary.md)                                          | Every term this guide uses, defined once.                                                                                    |

## How to read the status marks

This guide is written as though TwistedPear v1 is finished. It is not, yet. Anything
that does not work today — or works only in a limited way — carries one of two marks
at the point where you would try to use it.

> **⏳ Not yet available.** The feature is designed and specified but you cannot use it
> today. The mark always names the blocker and links to the tracking document.

> **⚠️ Works, with limits.** The feature exists and you can use it, but it behaves
> differently from the surrounding text in a way you need to know about.

Every marked item is also collected in [Appendix: feature status](appendix-feature-status.md),
so you can scan the whole list without reading the guide. The authoritative registers
behind that appendix are [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) (open software work),
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (device- and account-gated work), and
[LIMITATIONS.md](../LIMITATIONS.md) (permanent design trade-offs).

> **⏳ Screenshots are pending.** Images in this guide are placeholders. Each one is
> accompanied by a numbered caption describing exactly what the final screenshot must
> show; the images themselves are supplied in a separate pass. See
> [images/README.md](images/README.md) for the full shot list.

## Related documents

- The [Handbook](../apps/handbook/README.md) is an interactive version of much of this
  material that runs _inside_ TwistedPear as a mini-app, so it can probe your actual
  device. This guide is the version you can read before you have installed anything.
- The [App Authoring Guide](../authors/README.md) is the equivalent of this guide for people
  who want to _write_ a mini-app rather than run one.
- The [Cookbook](../cookbook/README.md) is twenty-five complete sample apps. Read the chapter
  openers if you want to know what kinds of thing TwistedPear can carry, and skip the code.
- [docs/](../docs/README.md) is the engineering documentation. Read it if you want to
  know how something is built rather than how to use it.
