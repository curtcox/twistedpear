# App relay

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Watches for app announces from publishers you trust and offers them for install.

Recipe and screenshots: [8. Apps that build apps](../../08-apps-that-build-apps.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

`apps.install` as an always-confirmed call, and what curation looks like without a registry.

## Capabilities

| Capability | Note |
|---|---|
| `announce:subscribe` | Standing grant; revocable at any time from the host. |
| `apps:install` | Host-confirmed on every call, plus a full capability review. |
| `storage:kv` | Standing grant; revocable at any time from the host. |

## Files

| File | Purpose |
|---|---|
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js) | The whole app. Single file, SDK import only, no bundler. |

## Run it

```sh
tp pack cookbook/apps/app-relay
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

> **⏳ Cookbook samples are not exercised by CI.** These apps are written against the
> published SDK surface but are not built, packed, or run by any suite in this repository.
> Treat them as reference source, not as tested artifacts.
