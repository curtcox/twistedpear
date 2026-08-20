# Pocket translator

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Translates a short phrase and keeps a local phrasebook of what you have already asked.

Recipe and screenshots: [7. Apps that use a model](../../07-apps-that-use-a-model.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

A streamed `ai.chatStream` call, a cache that makes the second ask free, and behaviour when the model is unreachable.

## Capabilities

| Capability   | Note                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| `ai:chat`    | Streaming or whole-response; one in-flight request per app, `maxTokens` clamped to 8,192. |
| `storage:kv` | Standing grant; revocable at any time from the host.                                      |

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
tp pack cookbook/apps/pocket-translator
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
