# Link weather

<!-- tp-doc
lifecycle: reference
audited: 2026-07-22
register: none
-->

A dashboard of interfaces, rendezvous mechanisms, authenticated connections, and quota headroom.

Recipe and screenshots: [5. Apps that find each other](../../05-apps-that-find-each-other.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

`presence.snapshot`, `host.info`, and `peers.diagnostics` as the only honest source of what
this device can do. Every host-reported mechanism can be used to invite or join a peer;
unsupported mechanisms remain visible with the host's reason. Established peers are shown
using only their opaque handle and coarse authenticated summary, and can be disconnected.

## Capabilities

| Capability     | Note                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| `presence`     | Standing grant; revocable at any time from the host.                                |
| `peer:connect` | Lets trusted host chrome detect, confirm, connect, and disconnect app-scoped peers. |

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
tp pack cookbook/apps/link-weather
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
