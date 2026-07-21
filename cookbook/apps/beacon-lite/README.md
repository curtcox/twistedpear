# Beacon lite

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Publishes a periodic minimal status beacon and nothing else.

Recipe and screenshots: [9. Apps for a bad link](../../09-apps-for-a-bad-link.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

The smallest announce payload worth sending, and pacing it against a LoRa duty cycle.

## Capabilities

| Capability | Note |
|---|---|
| `announce:publish` | Standing grant; revocable at any time from the host. |
| `presence` | Standing grant; revocable at any time from the host. |

## Files

| File | Purpose |
|---|---|
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js) | The whole app. Single file, SDK import only, no bundler. |

## Run it

```sh
tp pack cookbook/apps/beacon-lite
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

> **⏳ Cookbook samples are not exercised by CI.** These apps are written against the
> published SDK surface but are not built, packed, or run by any suite in this repository.
> Treat them as reference source, not as tested artifacts.
