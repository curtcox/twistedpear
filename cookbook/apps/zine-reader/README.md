# Zine reader

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Fetches a small publication by identifier and reads it page by page from the workspace.

Recipe and screenshots: [6. Apps that move files](../../06-apps-that-move-files.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

Caching a fetched artifact into the workspace so a second read costs no bytes.

## Capabilities

| Capability | Note |
|---|---|
| `share:cas` | `share.get` resolves only if a locator announce for those bytes was already heard. |
| `workspace` | 256 KiB per file, 4 MiB and 512 files per app. |

## Files

| File | Purpose |
|---|---|
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js) | The whole app. Single file, SDK import only, no bundler. |

## Run it

```sh
tp pack cookbook/apps/zine-reader
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

> **⏳ Cookbook samples are not exercised by CI.** These apps are written against the
> published SDK surface but are not built, packed, or run by any suite in this repository.
> Treat them as reference source, not as tested artifacts.
