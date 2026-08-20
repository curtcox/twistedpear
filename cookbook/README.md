# TwistedPear Cookbook

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Twenty-five complete sample mini-apps, each one small enough to read in a sitting and
real enough to install. This is the guide for people who have understood the platform and
now want to know **what it is actually good for** — and, just as usefully, what it is not.

The [App Authoring Guide](../authors/README.md) teaches you the SDK one namespace at a
time. This cookbook goes the other way: it starts with an app somebody would want, and
works backwards to the three or four calls that build it. Every recipe ships as a working
directory you can pack and side-load. JavaScript `bundle.js` is the published artifact;
Guida source variants of these samples are tracked in
[docs/guida-ui-plan.md](../docs/guida-ui-plan.md) Phase 4.

![The cookbook's sample apps running side by side](/cookbook/images/00-hero-cookbook.png)

**Screenshot 0.1 — Nine of the cookbook apps.** A 3×3 grid of desktop host captures at
identical size, each showing one sample app running inside the mini-app surface: Unit
converter, Pocket notes, Field log, Signal check, Neighborhood board, Photo drop, Pocket
translator, Sticker mill, and Nine line. Each tile is captioned with the app name in small
type beneath it. The point of the shot is visual range — same host chrome, nine genuinely
different-looking apps.

## Who this is for

**If you use TwistedPear**, the recipes tell you what kinds of app the platform can carry,
so you know what to look for and what to ask an author for. Read the chapter openers and
skip the code.

**If you write TwistedPear apps**, each recipe is a starting point you are meant to copy,
gut, and rename. Read the code; the prose exists mostly to explain why the code is shaped
that way.

You do not need to read the chapters in order. You do need to have read
[Chapter 1](01-how-to-use-this-cookbook.md) once, because it explains how to run any of
these on your own host.

## Chapters

| #   | Chapter                                                        | Apps                | What the chapter is really about                                                          |
| --- | -------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| 1   | [How to use this cookbook](01-how-to-use-this-cookbook.md)     | —                   | Running a recipe, reading a recipe, and the shape every sample shares.                    |
| 2   | [Apps with no capabilities](02-apps-with-no-capabilities.md)   | 3                   | How much you can build with an empty grant — and why that is a feature.                   |
| 3   | [Apps that remember](03-apps-that-remember.md)                 | 4                   | `storage:kv` versus `storage:hyperbee`, and choosing keys you can list.                   |
| 4   | [Apps that talk to one peer](04-apps-that-talk-to-one-peer.md) | 3                   | LXMF without sessions, replies that may never come, and what a signature proves.          |
| 5   | [Apps that find each other](05-apps-that-find-each-other.md)   | 3                   | Announce as serverless fan-out, and living without a source of truth.                     |
| 6   | [Apps that move files](06-apps-that-move-files.md)             | 3                   | `share:cas`, budgeted fetches, the workspace, and caching as courtesy.                    |
| 7   | [Apps that use a model](07-apps-that-use-a-model.md)           | 3                   | One in-flight `ai.chat`, treating output as untrusted, and working when it is gone.       |
| 8   | [Apps that build apps](08-apps-that-build-apps.md)             | 3                   | The `apps:*` loop, and why every step of it stops for a host confirmation.                |
| 9   | [Apps for a bad link](09-apps-for-a-bad-link.md)               | 3                   | Designing backwards from hundreds of bits per second.                                     |
| 10  | [Apps that use Freenet](10-apps-that-use-freenet.md)           | integration example | Brokered contract reads and irreversible, host-confirmed writes through an external node. |
| —   | [Appendix: app index](appendix-app-index.md)                   | 25                  | Every sample, its capabilities, and its size, in one table.                               |
| —   | [Appendix: feature status](appendix-feature-status.md)         | —                   | Everything this cookbook marks incomplete, with its blocker.                              |

## The sample apps

All twenty-five live under [`cookbook/apps/`](apps/), one directory each, each holding an
`app.manifest.json` and a single `bundle.js`. The directory layout is deliberately the same
as [`apps/examples/`](../apps/examples/README.md), so anything you learn about packing one
applies to the others.

```
cookbook/
├── README.md                    ← you are here
├── 01-how-to-use-this-cookbook.md
├── 02-apps-with-no-capabilities.md
│   … chapters 03–09 …
├── appendix-app-index.md
├── appendix-feature-status.md
├── images/                      ← screenshots (supplied separately)
└── apps/
    ├── unit-converter/
    │   ├── README.md            ← what it is, what it shows, how to run it
    │   ├── app.manifest.json    ← name, version, entry, capabilities
    │   └── bundle.js            ← the whole app, one file
    ├── dice-table/
    … twenty-three more …
    └── net-ledger/
```

## How to read the status marks

This cookbook is written as though TwistedPear v1 is finished. It is not, yet. Anything
that does not work today — or works only in a limited way — carries one of two marks at the
point where a recipe depends on it.

> **⏳ Not yet available.** The recipe is written against a designed and specified feature
> you cannot use today. The mark names the blocker.

> **⚠️ Works, with limits.** You can build the recipe, but some part of it behaves
> differently from the surrounding text in a way that changes the design.

Every marked item is collected in [Appendix: feature status](appendix-feature-status.md).
The authoritative registers are [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md),
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md), and [LIMITATIONS.md](../LIMITATIONS.md); where
they disagree with this cookbook, they win.

> **Verified by CI.** Every sample is type/lint-checked, packed, verified, launched, rendered,
> and driven through its documented primary workflow by `npm run test:cookbook`. The React
> Native Web surface is also exercised by `npm run test:web-cookbook`.

> **Screenshot status.** The deterministic capture pass supplies 37 of the 40 specified
> images. The remaining captures—including three that require real radio hardware—stay as
> explicit placeholders until their required evidence exists. The live inventory is in
> [images/README.md](images/README.md).

## Four things every recipe assumes

These come up in nearly every chapter, so they are stated once here rather than nine times.

1. **Apps run only while TwistedPear is open.** Several mini-apps may run at once
   inside the host, but nothing in this cookbook does work after you leave the host,
   because the host itself is suspended. An app that needs to react to a message while
   closed cannot be built — see [LIMITATIONS.md §7](../LIMITATIONS.md).
2. **Every capability is deny-by-default and revocable mid-run.** A recipe that touches
   storage handles the case where storage vanishes, because the user can take it away from
   the host's Grants panel while the app is open. See
   [Chapter 5 of the authoring guide](../authors/05-capabilities.md).
3. **Links are slow and asymmetric.** Design decisions that look like premature optimisation
   at broadband speeds are the difference between usable and useless over LoRa. See
   [Chapter 9](09-apps-for-a-bad-link.md).
4. **There is no registry, no store, and no moderation.** An app reaches people because a
   peer announced it. Nothing reviews anyone's code, including this cookbook's.

## Related documents

- [App Authoring Guide](../authors/README.md) — the systematic version of everything here.
- [User Guide](../guide/README.md) — installing a host, joining a network, running apps.
- [Appendix: SDK reference](../authors/appendix-sdk-reference.md) — every namespace and call
  in one table.
- [docs/miniapp-sdk.md](../docs/miniapp-sdk.md) — the maintained SDK reference. When it and
  this cookbook disagree, it wins.
- [docs/miniapp-runtime.md](../docs/miniapp-runtime.md) — broker, sandbox, lifecycle, and
  threat model.
- [apps/examples](../apps/examples/README.md) — the three reference apps that ship with the
  platform.
- [glossary](../guide/glossary.md) — terms this cookbook uses without defining.
