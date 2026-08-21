# Swap shelf

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Small ads for a neighborhood: offer an item, browse what neighbours are offering.

Recipe and screenshots: [5. Apps that find each other](../../05-apps-that-find-each-other.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

Keeping an announce payload inside the LoRa byte budget, and expiring stale listings locally.

## Capabilities

| Capability           | Note                                                 |
| -------------------- | ---------------------------------------------------- |
| `announce:publish`   | Standing grant; revocable at any time from the host. |
| `announce:subscribe` | Standing grant; revocable at any time from the host. |
| `storage:kv`         | Standing grant; revocable at any time from the host. |

## Files

| File                                   | Purpose                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js)                 | The whole app. Single file, SDK import only, no bundler.     |
| [elm.json](elm.json)                   | Guida project file for the Elm source variant.               |
| [src/Main.elm](src/Main.elm)           | Guida source. Compiles to the same widget tree as bundle.js. |

### JavaScript

Full source: [bundle.js](bundle.js)

### Guida

Full source: [src/Main.elm](src/Main.elm)

## Run it

```sh
tp pack cookbook/apps/swap-shelf
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
