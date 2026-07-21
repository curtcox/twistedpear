# Triage notes

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Turns messy dictated notes into a structured record and files it.

Recipe and screenshots: [7. Apps that use a model](../../07-apps-that-use-a-model.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

Asking a model for parseable output and validating it before it reaches your store.

## Capabilities

| Capability | Note |
|---|---|
| `ai:chat` | Streaming or whole-response; one in-flight request per app, `maxTokens` clamped to 8,192. |
| `storage:hyperbee` | Local-only in v1; there is no replication between devices. |

## Files

| File | Purpose |
|---|---|
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js) | The whole app. Single file, SDK import only, no bundler. |

## Run it

```sh
tp pack cookbook/apps/triage-notes
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

> **⏳ Cookbook samples are not exercised by CI.** These apps are written against the
> published SDK surface but are not built, packed, or run by any suite in this repository.
> Treat them as reference source, not as tested artifacts.
