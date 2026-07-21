# Streak tracker

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Marks a habit done for the day and counts consecutive days.

Recipe and screenshots: [3. Apps that remember](../../03-apps-that-remember.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

Encoding a small JSON document into the KV byte quota, and date handling without a library.

## Capabilities

| Capability | Note |
|---|---|
| `storage:kv` | Standing grant; revocable at any time from the host. |

## Files

| File | Purpose |
|---|---|
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js) | The whole app. Single file, SDK import only, no bundler. |

## Run it

```sh
tp pack cookbook/apps/streak-tracker
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

> **⏳ Cookbook samples are not exercised by CI.** These apps are written against the
> published SDK surface but are not built, packed, or run by any suite in this repository.
> Treat them as reference source, not as tested artifacts.
