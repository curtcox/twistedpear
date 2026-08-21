# Photo drop

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Puts an image into content-addressed storage and hands the 256t identifier to a peer.

Recipe and screenshots: [6. Apps that move files](../../06-apps-that-move-files.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

`share.put` / `share.get`, budgeted `resource.fetch`, and progress reporting on a slow link.

## Capabilities

| Capability       | Note                                                                               |
| ---------------- | ---------------------------------------------------------------------------------- |
| `share:cas`      | `share.get` resolves only if a locator announce for those bytes was already heard. |
| `resource:fetch` | The host applies its own byte budget on top of the one you pass.                   |
| `storage:kv`     | Standing grant; revocable at any time from the host.                               |

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
tp pack cookbook/apps/photo-drop
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
