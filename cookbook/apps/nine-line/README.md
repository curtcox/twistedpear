# Nine line

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

A fixed nine-field incident report that fits in a single small LXMF payload.

Recipe and screenshots: [9. Apps for a bad link](../../09-apps-for-a-bad-link.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

Designing a message format for hundreds of bits per second, and queueing when there is no link.

## Capabilities

| Capability   | Note                                                 |
| ------------ | ---------------------------------------------------- |
| `lxmf:send`  | Standing grant; revocable at any time from the host. |
| `storage:kv` | Standing grant; revocable at any time from the host. |

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
tp pack cookbook/apps/nine-line
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
