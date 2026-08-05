# 1. How to use this cookbook

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Every recipe in this book has the same four parts, and every sample app has the same three
files. Read this chapter once and the other eight will make sense without preamble.

## The shape of a recipe

**What it is.** One paragraph, written for someone deciding whether they want the app at
all. No SDK names.

**Screenshots.** At least one capture of the app running inside a host, with a caption
describing what the shot must show.

**What it costs.** The capability list, and what the user is agreeing to when they grant
it. If a recipe wants a grant most apps should not have, this section says so plainly.

**The interesting part.** Ten to thirty lines of the app's actual source — never the whole
file — and an explanation of why it is written that way. The full file is always one link
away.

Each recipe ends with **Make it yours**: three or four concrete modifications, ordered from
"twenty minutes" to "a different app".

## The shape of a sample app

```
cookbook/apps/pocket-notes/
├── README.md            what it is, what it shows, how to run it
├── app.manifest.json    name, version, entry point, declared capabilities
└── bundle.js            the whole app — one file, one import, no bundler
```

That is the entire package format from the author's side. A `.tpkg` adds a signature and a
manifest hash; it does not add structure. See
[docs/package-format.md](../docs/package-format.md) for the normative version and
[Chapter 9 of the authoring guide](../authors/09-packaging-and-publishing.md) for the
practical one.

Every sample imports from exactly one module:

```javascript
import {
  identity,
  lxmf,
  announce,
  storage,
  resource,
  presence,
  host,
  ui,
  workspace,
  ai,
  apps,
  share,
} from "@twistedpear/miniapp-sdk";
```

No recipe imports anything else, because no recipe can. There is no bundler in the host, so
`import` resolves the SDK and nothing else.

> **⚠️ Works, with limits — single-file bundles.** Multi-file projects are not supported by
> the in-host toolchain. If your app outgrows one file, you are building it outside the host
> with your own bundler and packing the result. See
> [LIMITATIONS.md §7](../LIMITATIONS.md).

## Running a recipe

There are two loops, and they produce identical packages.

### With the CLI

```sh
tp pack cookbook/apps/pocket-notes
tp dev install pocket-notes-1.0.0.tpkg
```

The host must be in developer mode, which is off by default. A dev-installed app is badged
**DEV** in the host's app list for as long as it is installed — there is no way to hide that
badge, and that is the point.

![A dev-installed sample app badged DEV in the host app list](/cookbook/images/01-dev-install.png)

**Screenshot 1.1 — A side-loaded sample.** The desktop host's installed-apps list at
1280×800, showing four apps. One of them, "Pocket notes", carries an orange **DEV** badge
next to its name and a subtitle reading "side-loaded · not signed by a publisher". The other
three carry publisher names. The visual difference between a dev app and an installed one is
the subject of the shot.

> **⚠️ Works, with limits — dev side-loading.** Localhost and `adb` only, off by default,
> and always badged. You cannot side-load to a phone across the network.

### In DevStudio

Open DevStudio, create a project, paste the contents of `bundle.js` into the editor, set the
capability list in `app.manifest.json` to match the sample's, and press **Preview**.

![DevStudio with a cookbook sample pasted in and previewing](/cookbook/images/01-devstudio-paste.png)

**Screenshot 1.2 — A sample running in the DevStudio preview slot.** DevStudio at 1280×800,
split two-thirds / one-third. Left: the `code-editor` widget showing the first thirty lines
of `field-log/bundle.js`, with `bundle.js` selected in the file list above it. Right: the
**Preview** panel running Field log, with three logged observations visible. The bottom
status strip reads "Preview running · grants: storage:hyperbee".

This is the loop that works on a phone, and the loop that needs nothing installed.

> **⚠️ Works, with limits — one preview slot.** Previewing a second app replaces the first.
> There is no way to have two previews running at once.

## Reading the capability line

Every recipe opens with a line like this:

> **Capabilities:** `storage:kv`, `lxmf:send`

That is exactly what the host will ask the user to approve at install time, in exactly those
words, and it is the only thing standing between the app and the user's device. A signature
tells you who wrote the app. It tells you nothing about what the app does — the grant is the
actual defence.

![One foreground app behind a deny-by-default capability boundary, with grants revocable mid-run](/cookbook/images/concept-capability-boundary.svg)

**Diagram 1.0 — The capability boundary.** One app runs in the foreground inside host chrome
it cannot draw over. Every SDK call crosses a boundary that is deny-by-default: a granted
capability passes, an ungranted one throws `CapabilityError`. The Grants panel is host chrome,
and a grant revoked while the app is running makes a call that worked start failing.

![The capability review dialog for a cookbook sample](/cookbook/images/01-capability-review.png)

**Screenshot 1.3 — A capability review.** The host's install-time review modal, clearly
rendered as host chrome outside any app surface: heading "Net ledger wants access", a list
of two rows — `lxmf:send` "Send messages from an address belonging to this app" and
`storage:kv` "Store data on this device" — each with its own toggle, both on. **Install** and
**Cancel** at the bottom. A footer line reads "You can change these later in Grants."

Recipes are honest about grants that deserve hesitation. Three of them —
[Sticker mill](apps/sticker-mill/README.md), [Form forge](apps/form-forge/README.md), and
[App relay](apps/app-relay/README.md) — ask for `apps:*` capabilities, which let an app
package, publish, and install other apps. Those are the most consequential grants in the
platform and [Chapter 8](08-apps-that-build-apps.md) spends most of its length on why.

## What "complete" means here

Every sample is a complete app in the sense that it runs, does the thing its name says, and
handles the failures the platform will actually hand it: a missing grant, an absent link, a
model that will not answer, a store that is empty on first launch.

No sample is complete in the sense of being production software. There is no error telemetry,
accessibility pass, or localisation. Several of them cut corners that a shipped app should
not — where they do, there is a comment saying so.

Every sample is exercised by `npm run test:cookbook`. CI parses and type/lint-checks each
bundle against the published SDK, validates its manifest and capability declarations, packs
it through `tp pack`, verifies the signed archive and BLE size budget, starts it in the real
sandbox runtime, waits for a valid widget tree, and drives its documented primary workflow
against deterministic host-service adapters. SDK drift and workflow regressions fail the PR
gate.

## When a recipe stops working

In rough order of likelihood:

| Symptom                             | Usual cause                                                          | Where to look                                                    |
| ----------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `CapabilityError` on a call         | The grant was never given, or was revoked while the app ran          | [authoring guide ch. 5](../authors/05-capabilities.md)           |
| `ui.render` rejects the whole tree  | An unknown component, prop, or style — trees never partially apply   | [authoring guide ch. 4](../authors/04-building-the-ui.md)        |
| Calls start failing under load      | 60 broker messages per second, per app                               | [authoring guide ch. 12](../authors/12-limits-and-budgets.md)    |
| A 256t identifier will not resolve  | No locator announce for those bytes was ever heard                   | [Chapter 6](06-apps-that-move-files.md)                          |
| A send succeeds and nothing arrives | The recipient's app was closed; nothing is delivered to a closed app | [Chapter 4](04-apps-that-talk-to-one-peer.md)                    |
| The host killed your app            | The runaway-app watchdog                                             | [authoring guide ch. 11](../authors/11-testing-and-debugging.md) |

The [troubleshooting chapter](../guide/10-troubleshooting.md) of the user guide covers the
host-side half of all of these.

---

Next: [Apps with no capabilities](02-apps-with-no-capabilities.md) — how much you can build
with an empty grant.
