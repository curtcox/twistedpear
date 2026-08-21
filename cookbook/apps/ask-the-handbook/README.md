# Ask the handbook

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Answers questions about a document you have stored in the workspace.

Recipe and screenshots: [7. Apps that use a model](../../07-apps-that-use-a-model.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

Ranking a bounded document set with host-proxied embeddings, falling back to keyword scoring,
then stuffing only the selected context into the chat message list.

## Capabilities

| Capability  | Note                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------- |
| `ai:chat`   | Streaming or whole-response; one in-flight request per app, `maxTokens` clamped to 8,192. |
| `ai:embed`  | At most 63 documents plus one query per search; no persistent vector index.               |
| `workspace` | 256 KiB per file, 4 MiB and 512 files per app.                                            |

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
tp pack cookbook/apps/ask-the-handbook
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
