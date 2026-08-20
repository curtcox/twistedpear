# Unit converter

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Converts between metric, imperial, and navigation units entirely offline.

Recipe and screenshots: [2. Apps with no capabilities](../../02-apps-with-no-capabilities.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

A complete app that needs no grant at all: widget tree, event loop, and in-memory state.

## Capabilities

| Capability | Note                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| _(none)_   | The app declares no capabilities, so there is nothing to grant and nothing to revoke. |

## Files

| File                                   | Purpose                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js)                 | The whole app. Single file, SDK import only, no bundler.     |
| [elm.json](elm.json)                         | Guida project file for the Elm source variant.             |
| [src/Main.elm](src/Main.elm)                 | Guida source. Compiles to the same widget tree as bundle.js. |

### JavaScript
Full source: [bundle.js](bundle.js)

### Guida
Full source: [src/Main.elm](src/Main.elm)

## Run it

```sh
tp pack cookbook/apps/unit-converter
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
