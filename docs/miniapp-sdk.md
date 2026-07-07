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
| `workspace` | Read and write project source files in this app's private workspace. |
| `ai:chat` | Send prompts to the host-configured AI service; prompts may include workspace content. |
| `apps:package` | Package and sign apps under this device's publisher identity (asks each time). |
| `apps:publish` | Publish signed apps so other users can find and install them (asks each time). |
| `apps:install` | Ask the host to install apps from a 256t id (asks each time, with capability review). |
| `apps:preview` | Run a built app in the host's sandboxed dev-preview slot. |
| `share:cas` | Store and retrieve bounded content-addressed data shared by 256t id. |

Unknown capability strings block install. Adding a capability bumps `HOST_API_VERSION` minor
(the dev-environment capabilities above shipped in `0.2.0`).

The `apps:*` capabilities are double-gated: beyond the grant, every package,
publish, install, and preview call raises a host-chrome confirmation dialog the
mini-app cannot draw over or acknowledge (see
[miniapp-runtime.md](miniapp-runtime.md) — Host confirmations).

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
- `workspace.list/read/write/remove(path)` — per-app project source files
  (strings; 256 KiB/file, 4 MiB and 512 files per app; strict relative paths).
- `ai.chat({ messages, model?, maxTokens?, temperature? })` — host-mediated
  chat completion against the host's OpenRouter-compatible endpoint. The host
  clamps budgets, enforces a model allowlist, and allows one in-flight request
  per app; the API key never enters the sandbox. Non-streaming in v1.
- `apps.packageProject(projectPrefix, manifest)` — pack + sign a workspace
  project via the host (user confirmation); returns `{ packageHash, size, t256 }`.
- `apps.publish(t256)` / `apps.install(t256)` — publish or install by
  94-character 256t id (user confirmation; install adds a capability review).
- `apps.preview(projectPrefix, manifest, grants)` / `apps.stopPreview()` — run
  the project in the host's sandboxed dev-preview slot (user confirmation;
  grants must be a subset of the manifest's declared capabilities).
- `share.put(content)` / `share.get(t256)` — bounded content-addressed sharing.

All calls without a matching grant fail with a typed `CapabilityError`.

## Widget Protocol

Allowed components: `view`, `text`, `image`, `button`, `text-input`, `switch`,
`scroll`, `list`, `progress`, `divider`, `spacer`, `code-editor`, `qr-code`.

`code-editor` is **content-by-reference**: it carries a workspace `documentId`
(plus `language`, `readOnly`, `event`) instead of file text, so sources cannot
blow the widget-tree byte budget. The host resolves the content from the app's
workspace; user edits arrive as the configured event with
`{ documentId, text }` and the app persists them via `workspace.write`.
`qr-code` renders a scannable code for a string value (≤ 512 chars — sized for
94-character 256t ids) with an optional caption; the desktop host also shows
the copyable string.

Allowed style is a bounded subset: flex layout, spacing, colors, and typography scale.
The host rejects unknown props, unknown styles, duplicate node IDs, excessive depth,
excessive nodes, and oversized messages.

Events flow from host to app via `ui.onEvent`. The app must have rendered the target
node; event forgery for unknown nodes is rejected.

Golden render-model fixtures live in `conformance/fixtures/widget-trees/` and are
checked by `packages/miniapp-runtime/test/ui-golden.test.ts` (`describeWidgetTree`).
The harness renderer in `packages/widget-renderer-rn` must stay aligned
with that model.

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

And `apps/devstudio` — the self-hosting development environment
([docs/devstudio.md](devstudio.md)) exercising the workspace, AI, apps, and
share namespaces plus the `code-editor` and `qr-code` widgets.

Run the CI exercises: `npm run test:examples` and `npm run test:devstudio-loop`.

## Future Work

- **React binding:** custom reconciler emitting the same widget-tree protocol (stretch; non-blocking).
- **Hyperbee replication:** cross-device sync topics; v1 is local-only.
- **Mini-app IPC:** shared storage and app-to-app messaging are intentionally deferred.
