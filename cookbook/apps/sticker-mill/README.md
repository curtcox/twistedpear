# Sticker mill

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Generates a tiny single-screen mini-app from a template and publishes it.

Recipe and screenshots: [8. Apps that build apps](../../08-apps-that-build-apps.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

The full `apps:*` loop: write project files, preview, package, publish, get a 256t back.

## Capabilities

| Capability | Note |
|---|---|
| `workspace` | 256 KiB per file, 4 MiB and 512 files per app. |
| `apps:package` | Host-confirmed on every call. |
| `apps:preview` | One preview slot per host; previewing again replaces the last preview. |
| `apps:publish` | Host-confirmed on every call; auto-denied after 60 s. |

## Files

| File | Purpose |
|---|---|
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js) | The whole app. Single file, SDK import only, no bundler. |

## Run it

```sh
tp pack cookbook/apps/sticker-mill
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
