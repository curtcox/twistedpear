# Split the bill

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Tracks who paid for what on a shared trip and settles up at the end.

Recipe and screenshots: [3. Apps that remember](../../03-apps-that-remember.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

A Hyperbee-backed ledger, derived totals, and why history counts against your byte quota.

## Capabilities

| Capability         | Note                                                       |
| ------------------ | ---------------------------------------------------------- |
| `storage:hyperbee` | Local-only in v1; there is no replication between devices. |

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
tp pack cookbook/apps/split-the-bill
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
