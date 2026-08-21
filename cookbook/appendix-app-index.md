# Appendix: app index

<!-- tp-doc
lifecycle: live
audited: 2026-08-21
register: none
-->

All twenty-six cookbook samples in one table, sorted by chapter. Every directory under
`cookbook/apps/` holds a `README.md`, an `app.manifest.json`, a published `bundle.js`, and a
Guida variant (`elm.json` + `src/Main.elm`). The Freenet integration notebook under
`cookbook/examples/` ships the same pair.

The **size** column is the approximate packaged `.tpkg` size. All twenty-five are far inside
the 180 KiB BLE install budget, and the four largest are still under a minute of BLE transfer
— but see [Chapter 9](09-apps-for-a-bad-link.md) for what any of them cost over LoRa.

The published documentation site also has a [searchable sample catalog](https://curtcox.github.io/twistedpear/samples/)
of every fenced listing in the guides, with GitHub, recipe, React Native Web, and editor
links.

> **Verified by CI.** `npm run test:cookbook` packs every sample through `tp pack`, verifies
> its manifest, signature, capabilities, and BLE size budget, then launches it in the sandbox
> runtime and waits for a valid render. The rounded sizes below remain reading aids rather
> than release artifacts.

## By chapter

| App                    | Chapter                                | Capabilities                                                 | Size    | Source                                                  |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------ | ------- | ------------------------------------------------------- |
| **Unit converter**     | [02](02-apps-with-no-capabilities.md)  | _none_                                                       | ~6 KiB  | [unit-converter](apps/unit-converter/README.md)         |
| **Dice table**         | [02](02-apps-with-no-capabilities.md)  | _none_                                                       | ~7 KiB  | [dice-table](apps/dice-table/README.md)                 |
| **Breath pacer**       | [02](02-apps-with-no-capabilities.md)  | _none_                                                       | ~6 KiB  | [breath-pacer](apps/breath-pacer/README.md)             |
| **Pocket notes**       | [03](03-apps-that-remember.md)         | `storage:kv`                                                 | ~8 KiB  | [pocket-notes](apps/pocket-notes/README.md)             |
| **Streak tracker**     | [03](03-apps-that-remember.md)         | `storage:kv`                                                 | ~9 KiB  | [streak-tracker](apps/streak-tracker/README.md)         |
| **Field log**          | [03](03-apps-that-remember.md)         | `storage:hyperbee`                                           | ~11 KiB | [field-log](apps/field-log/README.md)                   |
| **Split the bill**     | [03](03-apps-that-remember.md)         | `storage:hyperbee`                                           | ~13 KiB | [split-the-bill](apps/split-the-bill/README.md)         |
| **Signal check**       | [04](04-apps-that-talk-to-one-peer.md) | `identity`, `lxmf:send`, `lxmf:receive`                      | ~10 KiB | [signal-check](apps/signal-check/README.md)             |
| **Roll call**          | [04](04-apps-that-talk-to-one-peer.md) | `identity`, `lxmf:send`, `lxmf:receive`, `storage:kv`        | ~14 KiB | [roll-call](apps/roll-call/README.md)                   |
| **Dead drop**          | [04](04-apps-that-talk-to-one-peer.md) | `identity`, `lxmf:send`, `lxmf:receive`                      | ~11 KiB | [dead-drop](apps/dead-drop/README.md)                   |
| **Neighborhood board** | [05](05-apps-that-find-each-other.md)  | `announce:publish`, `announce:subscribe`, `storage:hyperbee` | ~15 KiB | [neighborhood-board](apps/neighborhood-board/README.md) |
| **Swap shelf**         | [05](05-apps-that-find-each-other.md)  | `announce:publish`, `announce:subscribe`, `storage:kv`       | ~12 KiB | [swap-shelf](apps/swap-shelf/README.md)                 |
| **Link weather**       | [05](05-apps-that-find-each-other.md)  | `presence`, `peer:connect`                                   | ~15 KiB | [link-weather](apps/link-weather/README.md)             |
| **Line check**         | [05](05-apps-that-find-each-other.md)  | `link:observe`, `link:probe`, `device:*`                     | ~18 KiB | [line-check](apps/line-check/README.md)                 |
| **Photo drop**         | [06](06-apps-that-move-files.md)       | `share:cas`, `resource:fetch`, `storage:kv`                  | ~16 KiB | [photo-drop](apps/photo-drop/README.md)                 |
| **Zine reader**        | [06](06-apps-that-move-files.md)       | `share:cas`, `workspace`                                     | ~14 KiB | [zine-reader](apps/zine-reader/README.md)               |
| **Recipe box**         | [06](06-apps-that-move-files.md)       | `workspace`                                                  | ~12 KiB | [recipe-box](apps/recipe-box/README.md)                 |
| **Pocket translator**  | [07](07-apps-that-use-a-model.md)      | `ai:chat`, `storage:kv`                                      | ~11 KiB | [pocket-translator](apps/pocket-translator/README.md)   |
| **Ask the handbook**   | [07](07-apps-that-use-a-model.md)      | `ai:chat`, `workspace`                                       | ~13 KiB | [ask-the-handbook](apps/ask-the-handbook/README.md)     |
| **Triage notes**       | [07](07-apps-that-use-a-model.md)      | `ai:chat`, `storage:hyperbee`                                | ~14 KiB | [triage-notes](apps/triage-notes/README.md)             |
| **Sticker mill**       | [08](08-apps-that-build-apps.md)       | `workspace`, `apps:package`, `apps:preview`, `apps:publish`  | ~18 KiB | [sticker-mill](apps/sticker-mill/README.md)             |
| **Form forge**         | [08](08-apps-that-build-apps.md)       | `workspace`, `apps:package`, `apps:preview`, `ai:chat`       | ~21 KiB | [form-forge](apps/form-forge/README.md)                 |
| **App relay**          | [08](08-apps-that-build-apps.md)       | `announce:subscribe`, `apps:install`, `storage:kv`           | ~13 KiB | [app-relay](apps/app-relay/README.md)                   |
| **Nine line**          | [09](09-apps-for-a-bad-link.md)        | `lxmf:send`, `storage:kv`                                    | ~9 KiB  | [nine-line](apps/nine-line/README.md)                   |
| **Beacon lite**        | [09](09-apps-for-a-bad-link.md)        | `announce:publish`, `presence`                               | ~7 KiB  | [beacon-lite](apps/beacon-lite/README.md)               |
| **Net ledger**         | [09](09-apps-for-a-bad-link.md)        | `lxmf:send`, `lxmf:receive`, `storage:kv`                    | ~12 KiB | [net-ledger](apps/net-ledger/README.md)                 |

## By capability

Which samples to read when you want to see a particular capability used well.

| Capability           | Samples                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identity`           | [Signal check](apps/signal-check/README.md), [Roll call](apps/roll-call/README.md), [Dead drop](apps/dead-drop/README.md)                                                                                                                                                                                                                                                                           |
| `presence`           | [Link weather](apps/link-weather/README.md), [Beacon lite](apps/beacon-lite/README.md)                                                                                                                                                                                                                                                                                                              |
| `peer:connect`       | [Link weather](apps/link-weather/README.md)                                                                                                                                                                                                                                                                                                                                                         |
| `link:observe`       | [Line check](apps/line-check/README.md)                                                                                                                                                                                                                                                                                                                                                             |
| `link:probe`         | [Line check](apps/line-check/README.md)                                                                                                                                                                                                                                                                                                                                                             |
| `announce:publish`   | [Neighborhood board](apps/neighborhood-board/README.md), [Swap shelf](apps/swap-shelf/README.md), [Beacon lite](apps/beacon-lite/README.md)                                                                                                                                                                                                                                                         |
| `announce:subscribe` | [Neighborhood board](apps/neighborhood-board/README.md), [Swap shelf](apps/swap-shelf/README.md), [App relay](apps/app-relay/README.md)                                                                                                                                                                                                                                                             |
| `lxmf:send`          | [Signal check](apps/signal-check/README.md), [Roll call](apps/roll-call/README.md), [Dead drop](apps/dead-drop/README.md), [Nine line](apps/nine-line/README.md), [Net ledger](apps/net-ledger/README.md)                                                                                                                                                                                           |
| `lxmf:receive`       | [Signal check](apps/signal-check/README.md), [Roll call](apps/roll-call/README.md), [Dead drop](apps/dead-drop/README.md), [Net ledger](apps/net-ledger/README.md)                                                                                                                                                                                                                                  |
| `storage:kv`         | [Pocket notes](apps/pocket-notes/README.md), [Streak tracker](apps/streak-tracker/README.md), [Roll call](apps/roll-call/README.md), [Swap shelf](apps/swap-shelf/README.md), [Photo drop](apps/photo-drop/README.md), [Pocket translator](apps/pocket-translator/README.md), [App relay](apps/app-relay/README.md), [Nine line](apps/nine-line/README.md), [Net ledger](apps/net-ledger/README.md) |
| `storage:hyperbee`   | [Field log](apps/field-log/README.md), [Split the bill](apps/split-the-bill/README.md), [Neighborhood board](apps/neighborhood-board/README.md), [Triage notes](apps/triage-notes/README.md)                                                                                                                                                                                                        |
| `resource:fetch`     | [Photo drop](apps/photo-drop/README.md)                                                                                                                                                                                                                                                                                                                                                             |
| `workspace`          | [Zine reader](apps/zine-reader/README.md), [Recipe box](apps/recipe-box/README.md), [Ask the handbook](apps/ask-the-handbook/README.md), [Sticker mill](apps/sticker-mill/README.md), [Form forge](apps/form-forge/README.md)                                                                                                                                                                       |
| `ai:chat`            | [Pocket translator](apps/pocket-translator/README.md), [Ask the handbook](apps/ask-the-handbook/README.md), [Triage notes](apps/triage-notes/README.md), [Form forge](apps/form-forge/README.md)                                                                                                                                                                                                    |
| `apps:package`       | [Sticker mill](apps/sticker-mill/README.md), [Form forge](apps/form-forge/README.md)                                                                                                                                                                                                                                                                                                                |
| `apps:publish`       | [Sticker mill](apps/sticker-mill/README.md)                                                                                                                                                                                                                                                                                                                                                         |
| `apps:install`       | [App relay](apps/app-relay/README.md)                                                                                                                                                                                                                                                                                                                                                               |
| `apps:preview`       | [Sticker mill](apps/sticker-mill/README.md), [Form forge](apps/form-forge/README.md)                                                                                                                                                                                                                                                                                                                |
| `share:cas`          | [Photo drop](apps/photo-drop/README.md), [Zine reader](apps/zine-reader/README.md)                                                                                                                                                                                                                                                                                                                  |
| _(none)_             | [Unit converter](apps/unit-converter/README.md), [Dice table](apps/dice-table/README.md), [Breath pacer](apps/breath-pacer/README.md)                                                                                                                                                                                                                                                               |

Capabilities with no sample are not gaps in the platform — they are places where the platform
surface is thin enough that a dedicated recipe would repeat one already here. The full list of
capability strings is in the
[SDK reference appendix](../authors/appendix-sdk-reference.md).

The optional [Contract notebook](examples/contract-notebook/README.md) is kept
outside the twenty-five general-purpose samples because it requires a configured
external Freenet node. It demonstrates `freenet:contract` `get`, `put`, and
`update`, including the host's per-write confirmation.

## By what you are trying to build

| If you want to build…                              | Start from                                              |
| -------------------------------------------------- | ------------------------------------------------------- |
| A calculator, converter, or reference tool         | [Unit converter](apps/unit-converter/README.md)         |
| Anything with a timer or animation                 | [Breath pacer](apps/breath-pacer/README.md)             |
| A notepad, tracker, or single-document app         | [Pocket notes](apps/pocket-notes/README.md)             |
| A journal, log, or growing collection              | [Field log](apps/field-log/README.md)                   |
| Anything involving money or derived totals         | [Split the bill](apps/split-the-bill/README.md)         |
| A request/response protocol between two peers      | [Signal check](apps/signal-check/README.md)             |
| Something that asks many peers at once             | [Roll call](apps/roll-call/README.md)                   |
| Anything involving signatures                      | [Dead drop](apps/dead-drop/README.md)                   |
| A feed, board, or serverless broadcast             | [Neighborhood board](apps/neighborhood-board/README.md) |
| A listings or classifieds app                      | [Swap shelf](apps/swap-shelf/README.md)                 |
| A diagnostic, or a preflight check for another app | [Link weather](apps/link-weather/README.md)             |
| Anything that moves content between devices        | [Photo drop](apps/photo-drop/README.md)                 |
| A reader, viewer, or anything that caches          | [Zine reader](apps/zine-reader/README.md)               |
| A document-based app                               | [Recipe box](apps/recipe-box/README.md)                 |
| A model-backed tool that must work offline         | [Pocket translator](apps/pocket-translator/README.md)   |
| Question answering over local documents            | [Ask the handbook](apps/ask-the-handbook/README.md)     |
| Turning free text into structured records          | [Triage notes](apps/triage-notes/README.md)             |
| A code or app generator                            | [Sticker mill](apps/sticker-mill/README.md)             |
| A model-driven generator                           | [Form forge](apps/form-forge/README.md)                 |
| An app catalogue or installer                      | [App relay](apps/app-relay/README.md)                   |
| A form for a very slow link                        | [Nine line](apps/nine-line/README.md)                   |
| Periodic status broadcasting                       | [Beacon lite](apps/beacon-lite/README.md)               |
| Field data collection that syncs later             | [Net ledger](apps/net-ledger/README.md)                 |

## Related

- [Cookbook index](README.md)
- [Appendix: feature status](appendix-feature-status.md)
- [SDK reference](../authors/appendix-sdk-reference.md) — every namespace and call
- [apps/examples](../apps/examples/README.md) — the three reference apps that ship with the platform
