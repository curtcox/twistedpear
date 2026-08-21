# TwistedPear App Authoring Guide

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

This is the guide for **people who write TwistedPear mini-apps**. It takes you from an
empty project to a signed package other people can install, and it explains the parts of
the platform you actually have to reason about: the capability grant, the widget tree, the
broker limits, and what it costs to ship bytes over a radio link.

You need to be comfortable with JavaScript. You do **not** need to know Reticulum, LXMF,
Hyperdrive, or anything about the host internals. Everything a mini-app can do goes through
one import, and that import is the whole surface.

If you want twenty-five complete sample apps rather than a systematic tour of the SDK, the
[Cookbook](../cookbook/README.md) works the other way round: it starts with an app somebody
would want and works backwards to the calls that build it.

If you want to _use_ TwistedPear rather than build for it, read the
[User Guide](../guide/README.md) instead. If you want to work on the platform itself, start
at the [documentation index](../docs/README.md).

![DevStudio with a mini-app open, editor on the left and live preview on the right](/authors/images/00-hero-devstudio.png)

**Screenshot 0.1 — DevStudio, mid-edit.** Desktop host window at 1280×800. Left two-thirds:
DevStudio's file list (`hello-app/app.json`, `hello-app/bundle.js`) above a `code-editor`
widget showing about twenty lines of JavaScript, with `bundle.js` selected. Right third: the
**Preview** panel running the app — a heading reading "Hello", a button labelled "Tap me",
and a counter reading "Taps: 3". Toolbar across the top: **New project**, **AI edit**,
**Preview**, **Package & sign**, **Publish**. Bottom status strip reads "Preview running ·
grants: storage:kv".

## Chapters

| #   | Chapter                                                              | What you get out of it                                                             |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | [What you are building](01-what-you-are-building.md)                 | The mini-app model: one import, one broker, a widget tree, and a signed package.   |
| 2   | [Hello world in DevStudio](02-hello-world-in-devstudio.md)           | Write, preview, package, and publish without installing a toolchain.               |
| 3   | [Hello world with the CLI](03-hello-world-with-the-cli.md)           | The same loop with your own editor, `tp`, and git.                                 |
| 4   | [Building the UI](04-building-the-ui.md)                             | Widget trees, the component allowlist, styling, and events.                        |
| 4b  | [Building the UI in Guida](04b-building-the-ui-in-guida.md)          | The same trees in Guida: `Program.app`, `Effect`, and `tp app build`.              |
| 5   | [Capabilities](05-capabilities.md)                                   | Declaring what you need, surviving a partial grant, and the confirmation dialogs.  |
| 6   | [Storage and files](06-storage-and-files.md)                         | Key/value, Hyperbee, the workspace, and the quotas on all three.                   |
| 7   | [Identity, messaging, and peers](07-identity-messaging-and-peers.md) | App-scoped identity, LXMF, announces, presence, and resource fetch.                |
| 8   | [AI and apps that build apps](08-ai-and-authoring-apps.md)           | `ai.chat`, and the `apps:*` capabilities that let an app package and publish apps. |
| 9   | [Packaging and publishing](09-packaging-and-publishing.md)           | The manifest, the `.tpkg` archive, signing, and the 256t identifier.               |
| 10  | [Updates, trust, and versioning](10-updates-and-trust.md)            | Key pinning, semver monotonicity, grant inheritance, and rollback.                 |
| 11  | [Testing and debugging](11-testing-and-debugging.md)                 | The preview slot, dev side-load, conformance suites, and reading a denial.         |
| 12  | [Limits and budgets](12-limits-and-budgets.md)                       | Every hard number the host enforces, and what your bundle size costs on LoRa.      |
| 13  | [Shipping checklist](13-shipping-checklist.md)                       | What to verify before you hand anyone a 256t string.                               |
| —   | [Appendix: SDK reference](appendix-sdk-reference.md)                 | Every namespace and call in one table.                                             |
| —   | [Appendix: feature status](appendix-feature-status.md)               | Every incomplete feature named in this guide, with its blocker.                    |

Terms this guide uses without defining are defined in the user guide's
[glossary](../guide/glossary.md).

## How to read the status marks

This guide is written as though TwistedPear v1 is finished. It is not, yet. Anything that
does not work today — or works only in a limited way — carries one of two marks at the point
where you would try to use it.

> **⏳ Not yet available.** The feature is designed and specified but you cannot use it
> today. The mark always names the blocker and links to the tracking document.

> **⚠️ Works, with limits.** The feature exists and you can build on it, but it behaves
> differently from the surrounding text in a way that will change your design.

Every marked item is also collected in [Appendix: feature status](appendix-feature-status.md).
The authoritative registers behind that appendix are
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) (open software work),
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (device- and account-gated work), and
[LIMITATIONS.md](../LIMITATIONS.md) (permanent design trade-offs). Where those disagree with
this guide, they win.

> Screenshots in this guide are real captures except for the hardware-only shots
> listed in [images/README.md](images/README.md), which still use a hatch
> placeholder until those surfaces can be captured honestly.

## The two paths

There are two ways to author a mini-app, and this guide covers both because they suit
different people.

|                  | DevStudio ([Chapter 2](02-hello-world-in-devstudio.md)) | CLI ([Chapter 3](03-hello-world-with-the-cli.md)) |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------- |
| Where you write  | Inside TwistedPear, in a `code-editor` widget           | Your own editor                                   |
| What you install | Nothing — DevStudio is itself a mini-app                | Node 22, the repository, `tp`                     |
| Version control  | None                                                    | Whatever you already use                          |
| Bundling         | None — single file, SDK import only                     | None — single file, SDK import only               |
| Preview          | Sandboxed dev-preview slot on the same host             | Dev side-load to a host in developer mode         |
| Signing          | Device publisher identity, via host confirmation        | `tp sign` with your publisher identity file       |
| Works on a phone | Yes                                                     | No                                                |

They produce **identical packages**. Nothing about a `.tpkg` records which path built it, and
you can move a project between them by copying two files.

## Related documents

- [docs/miniapp-sdk.md](../docs/miniapp-sdk.md) — the SDK surface, maintained alongside the
  code. When it and this guide disagree, it wins.
- [docs/miniapp-runtime.md](../docs/miniapp-runtime.md) — the broker, sandbox, lifecycle, and
  threat model.
- [docs/package-format.md](../docs/package-format.md) — the normative package and signing
  format.
- [docs/devstudio.md](../docs/devstudio.md) — DevStudio's own design notes.
- [apps/examples](../apps/examples/README.md) — the three reference mini-apps this guide
  quotes from.
- [Cookbook](../cookbook/README.md) — twenty-five sample apps, indexed
  [by capability](../cookbook/appendix-app-index.md).
