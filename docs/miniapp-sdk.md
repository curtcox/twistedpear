# Mini-app SDK

Mini-apps import only `@twistedpear/miniapp-sdk`. Every SDK call crosses the host broker;
private keys, sockets, filesystems, and Bare APIs are never exposed to app code.

## Capability Taxonomy

Capabilities are declared in `app.manifest.json` and granted by the user at install. The
grant screen renders the descriptions below (from `CAPABILITY_DEFINITIONS` in the runtime).

| Capability | User-facing description |
|---|---|
| `identity` | Use an app-scoped identity for signing and addressing. |
| `presence` | Read coarse peer and interface presence. |
| `announce:subscribe` | Receive announces in the app namespace. |
| `announce:publish` | Publish the app destination. |
| `lxmf:send` | Send LXMF messages from the app destination. |
| `lxmf:receive` | Receive LXMF messages for the app destination. |
| `storage:kv` | Store local key/value data for this app. |
| `storage:hyperbee` | Store ordered local Hyperbee data for this app. |
| `resource:fetch` | Fetch package resources through host budget rules. |

Unknown capability strings block install. Adding a capability bumps `HOST_API_VERSION` minor.

## Namespaces

- `identity.destinationHash()` — app-scoped destination derived from host identity + appId.
- `identity.sign(payload)` — brokered signing; private keys never cross the boundary.
- `lxmf.send({ to, subject, body })` — send via host LXMF router.
- `lxmf.receive()` — inbox namespaced to the app destination.
- `announce.publish(appData, namespace?)` — publish in app namespace.
- `announce.subscribe(namespace?)` — subscribe to announces.
- `storage.kv.get/set/delete(key, value?)` — local per-app KV with byte quota.
- `storage.bee.open/get/put/del/list` — local-only Hyperbee CRUD.
- `resource.fetch({ resourceId, budgetBytes? })` — host-budgeted Resource fetch.
- `presence.snapshot()` — coarse peer/interface state.
- `ui.render(tree)` — submit a validated widget tree.
- `ui.onEvent(handler)` — subscribe to host UI events (tap, input change, etc.).

All calls without a matching grant fail with a typed `CapabilityError`.

## Widget Protocol

Allowed components: `view`, `text`, `image`, `button`, `text-input`, `switch`,
`scroll`, `list`, `progress`, `divider`, `spacer`.

Allowed style is a bounded subset: flex layout, spacing, colors, and typography scale.
The host rejects unknown props, unknown styles, duplicate node IDs, excessive depth,
excessive nodes, and oversized messages.

Events flow from host to app via `ui.onEvent`. The app must have rendered the target
node; event forgery for unknown nodes is rejected.

### Example

```javascript
import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      { id: "title", type: "text", props: { value: "Hello" }, style: { fontSize: 20 } },
      { id: "go", type: "button", props: { label: "Tap me", event: "hello.tap" } }
    ]
  }
});

ui.onEvent(async ({ event }) => {
  if (event === "hello.tap") {
    await ui.render(/* updated tree */);
  }
});
```

## Example Apps

See `apps/examples/`:

- **chat** — identity + LXMF send/receive
- **file-drop** — resource fetch + KV storage
- **board** — announce + Hyperbee local store

Run the CI exercise: `npm run test:examples`.

## Future Work

- **React binding:** custom reconciler emitting the same widget-tree protocol (stretch; non-blocking).
- **Hyperbee replication:** cross-device sync topics; v1 is local-only.
- **Mini-app IPC:** shared storage and app-to-app messaging are intentionally deferred.
