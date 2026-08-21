# Example mini-apps

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Phase 4 reference apps. Each exercises a different SDK surface through the real Phase 3
pack/verify/install pipeline and the Phase 4 sandbox runtime.

| App                     | Capabilities                                                 | SDK surface                                              | JavaScript                       | Guida                              |
| ----------------------- | ------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------- | ---------------------------------- |
| [chat](chat/)           | `identity`, `lxmf:send`, `lxmf:receive`, `storage:kv`        | App-scoped identity, LXMF send/receive, KV for last peer | [bundle.js](chat/bundle.js)      | [Main.elm](chat/src/Main.elm)      |
| [file-drop](file-drop/) | `resource:fetch`, `storage:kv`                               | Host-budgeted Resource fetch, KV persistence             | [bundle.js](file-drop/bundle.js) | [Main.elm](file-drop/src/Main.elm) |
| [board](board/)         | `announce:publish`, `announce:subscribe`, `storage:hyperbee` | Announce + local Hyperbee store                          | [bundle.js](board/bundle.js)     | [Main.elm](board/src/Main.elm)     |

## Build and exercise

```sh
npm run build
npm run test:examples
```

Each example ships as a pre-built `bundle.js` plus `app.manifest.json`. Guida source
lives beside it as `elm.json` and `src/Main.elm`; `bundle.js` remains the published
artifact. To repack locally:

```sh
cd apps/examples/chat
tp init
tp pack .
```

All three examples are under the 180 KiB BLE install budget (see
[conformance/budgets/measured.json](../../conformance/budgets/measured.json)).

Peer-to-peer exercise (two hosts over docker/BLE) is device-gated; see
[STATUS-HARDWARE.md](../../STATUS-HARDWARE.md) (H9–H10).
