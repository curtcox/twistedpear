# Roll call

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Asks a fixed list of addresses to check in, and shows who has answered.

Recipe and screenshots: [4. Apps that talk to one peer](../../04-apps-that-talk-to-one-peer.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

Fan-out over unicast LXMF, persisted rosters, and designing for replies that may never arrive.

## Capabilities

| Capability     | Note                                                 |
| -------------- | ---------------------------------------------------- |
| `identity`     | Standing grant; revocable at any time from the host. |
| `lxmf:send`    | Standing grant; revocable at any time from the host. |
| `lxmf:receive` | Standing grant; revocable at any time from the host. |
| `storage:kv`   | Standing grant; revocable at any time from the host. |

## Files

| File                                   | Purpose                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| [app.manifest.json](app.manifest.json) | Name, version, entry point, and the declared capability set. |
| [bundle.js](bundle.js)                 | The whole app. Single file, SDK import only, no bundler.     |

## Run it

```sh
tp pack cookbook/apps/roll-call
tp dev install <packed>.tpkg      # host must be in developer mode
```

Or paste `bundle.js` into a DevStudio project and press **Preview**. See
[Chapter 1](../../01-how-to-use-this-cookbook.md) for both loops in full.

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
