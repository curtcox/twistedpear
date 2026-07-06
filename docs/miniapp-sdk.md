# Mini-app SDK

Mini-apps import only `@twistedpear/miniapp-sdk`. Every SDK call crosses the host broker;
private keys, sockets, filesystems, and Bare APIs are never exposed to app code.

## Namespaces

- `identity`: app-scoped destination hash and brokered signing.
- `lxmf`: `send()` and `receive()` through the host LXMF router.
- `announce`: publish or subscribe in the app namespace.
- `storage.kv`: local per-app key/value storage.
- `storage.bee`: local-only Hyperbee CRUD (`get`, `put`, `del`, `list`); replication is future work.
- `resource.fetch()`: host-budgeted Resource fetch.
- `presence.snapshot()`: coarse peer/interface state.
- `ui.render()`: submit a validated widget tree.

## Widget Protocol

Allowed components are `view`, `text`, `image`, `button`, `text-input`, `switch`,
`scroll`, `list`, `progress`, `divider`, and `spacer`.

Allowed style is a bounded subset: flex layout, spacing, colors, and typography scale.
The host rejects unknown props, unknown styles, duplicate node IDs, excessive depth,
excessive nodes, and oversized messages.

## Future Work

React bindings can target the same widget-tree protocol. Hyperbee replication and
mini-app-to-mini-app IPC are intentionally deferred so v1 remains local and host-owned.
