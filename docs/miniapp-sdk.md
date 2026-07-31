# Mini-app SDK


<!-- tp-doc
lifecycle: reference
audited: 2026-07-31
register: none
-->

Mini-apps import only `@twistedpear/miniapp-sdk`. Every SDK call crosses the host broker;
private keys, sockets, filesystems, and Bare APIs are never exposed to app code.

## Capability Taxonomy

Capabilities are declared in `app.manifest.json` and granted by the user at install. The
grant screen renders the descriptions below (from `CAPABILITY_DEFINITIONS` in the runtime).

| Capability | User-facing description |
|---|---|
| `identity` | Use an app-scoped identity for signing and addressing. |
| `presence` | Read coarse peer/interface presence and host info. |
| `announce:subscribe` | Receive announces in the app namespace. |
| `announce:publish` | Publish the app destination. |
| `lxmf:send` | Send LXMF messages from the app destination. |
| `lxmf:receive` | Receive LXMF messages for the app destination. |
| `storage:kv` | Store local key/value data for this app. |
| `storage:hyperbee` | Store ordered local Hyperbee data for this app. |
| `resource:fetch` | Fetch package resources through host budget rules. |
| `workspace` | Read and write project source files in this app's private workspace. |
| `ai:chat` | Send prompts to the host-configured AI service; prompts may include workspace content. |
| `ai:embed` | Send bounded text to the host-configured embedding model and rank vectors locally. |
| `apps:package` | Package and sign apps under this device's publisher identity (asks each time). |
| `apps:publish` | Publish signed apps so other users can find and install them (asks each time). |
| `apps:install` | Ask the host to install apps from a 256t id (asks each time, with capability review). |
| `apps:preview` | Run a built app in the host's sandboxed dev-preview slot. |
| `share:cas` | Store and retrieve bounded content-addressed data shared by 256t id. |
| `peer:connect` | Ask trusted host chrome to find, confirm, and connect an app-scoped peer. |
| `link:observe` | Read app-scoped peer link quality and two-sided media readiness. |
| `link:probe` | Request a bounded active measurement for one app-scoped peer. |
| `device:share-policy:read` | Read this app's live host-authored outbound media offers. |
| `device:stream:raw-inbound` | Receive raw inbound media instead of a host-rendered sink. |

Unknown capability strings block install. Adding a capability bumps `HOST_API_VERSION` minor
(the dev-environment capabilities above shipped in `0.2.0`; `host.info()` shipped in `0.3.0`).
`ai.chatStream()` requires host API `0.5.0`; `ai.embed()` and `ai.search()` require `0.6.0`;
`workspace.patch()` and delta editor events require `0.7.0`.
The `peers` namespace and `peer:connect` require host API `0.8.0`.
The `links` namespace and realtime-media extensions require host API `0.12.0`.

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
- `host.info()` — platform id, host version, `HOST_API_VERSION`, enabled roles,
  available interface types, quota snapshot, and `grantedCapabilities` for the
  calling app (requires `presence`).
- `ui.render(tree)` — submit a validated widget tree.
- `ui.onEvent(handler)` — subscribe to host UI events (tap, input change, etc.).
- `workspace.list/read/write/patch/remove(path)` — per-app project source files.
  `patch(path, baseLength, edits)` applies ordered, non-overlapping UTF-16 text edits and
  rejects stale base lengths (strings; 256 KiB/file, 4 MiB and 512 files per app).
- `ai.chat({ messages, model?, maxTokens?, temperature? })` — host-mediated,
  whole-response chat completion against the host's OpenRouter-compatible endpoint.
- `ai.chatStream({ messages, model?, maxTokens?, temperature? })` — async iterable
  yielding `{ type: "delta", delta }` events followed by `{ type: "done", response }`.
  Provider events are coalesced to protect the broker rate budget; breaking iteration
  cancels the host request. Both forms share one in-flight slot, budget clamps, and the
  model allowlist; the API key never enters the sandbox.
- `ai.embed({ inputs, model? })` — embed 1–64 non-empty strings (16,384 characters
  each; vectors capped at 4,096 dimensions) through the host endpoint.
- `ai.search({ query, documents, limit?, model? })` — embed one query plus at most
  63 `{ id, text }` documents and return ids ranked by cosine score. This is a bounded
  request, not a persistent vector database. Both calls use the separate `ai:embed` grant,
  the embedding-model allowlist, and the same one-in-flight AI slot as chat.
- `apps.packageProject(projectPrefix, manifest)` — pack + sign a workspace
  project via the host (user confirmation); returns `{ packageHash, size, t256 }`.
- `apps.publish(t256)` / `apps.install(t256)` — publish or install by
  94-character 256t id (user confirmation; install adds a capability review).
- `apps.preview(projectPrefix, manifest, grants)` / `apps.stopPreview()` — run
  the project in the host's sandboxed dev-preview slot (user confirmation;
  grants must be a subset of the manifest's declared capabilities).
- `share.put(content)` / `share.get(t256)` — bounded content-addressed sharing.
- `peers.request(options)` / `peers.listen(options)` — ask trusted host chrome to pair an
  app-scoped service. The host chooses from `mechanisms` (or `"any"`), handles permissions,
  authentication, matching words, confirmation, and data-plane setup.
- `peers.info(handle)` / `peers.close(handle)` — inspect coarse confirmed-peer state or
  disconnect. Handles are opaque and limited to the calling app runtime; discovery bytes,
  addresses, SDP, credentials, and radio APIs never enter the sandbox.
- `peers.diagnostics()` — report adapter availability and actionable host reasons without
  prompting for camera, microphone, Bluetooth, or network permission.
- `links.peers()` — app-scoped peer summaries with passive/probed link quality and
  expiring two-sided media readiness. A declared low-confidence estimate is not a
  measurement.
- `links.watch()` — async iterable of app-scoped link-summary changes.
- `links.probe(peer, { budgetBytes? })` — explicit active measurement, capped by the host
  at 8 KiB and one call per app/peer/minute; costly paths may ask in trusted chrome.
- `device.shareOffers()` / `device.requestShareOffer(purpose)` /
  `device.revokeShareOffer(id)` — inspect or request changes to outbound policy. The app
  supplies only purpose text; peer, media tier, quality ceiling, and TTL are host-authored.
- `device.stream(session, peer, constraints?)` — begins host-owned egress only when the
  device session, capability, share offer, admission result, reservation, and plane binder
  all permit it. Candidate supplies from the app are ceilings, never measurements.
- `device.incoming()` / `device.accept(offer, sink)` / `device.decline(offer)` — receive
  offers and bind accepted media to a `remote-video` or speaker host sink. Raw inbound
  delivery requires the separate sensitive capability.

All calls without a matching grant fail with a typed `CapabilityError`.

The desktop host maps announce calls onto signed Reticulum destinations and exact aspect
handlers. The runtime also includes a transport-backed service exercised by a real two-host
conformance tier; mobile/web transport rollout remains separately tracked. The API and
receive path can be exercised locally by injecting a shared service; that is not a
cross-device transport test. Reticulum's underlying destination announce mechanism is
documented in its [concept guide](https://reticulum.network/manual/understanding.html#public-key-announcements),
[example](https://reticulum.network/manual/examples.html#announce), and
[`Destination.announce()` reference](https://reticulum.network/manual/reference.html#RNS.Destination.announce).

## Widget Protocol

Allowed components include `view`, `text`, `image`, `button`, `text-input`, `switch`,
`scroll`, `list`, `progress`, `divider`, `spacer`, `code-editor`, `qr-code`, and the
host-rendered device/media surfaces (`camera-preview`, `audio-meter`, `waveform`,
`map-preview`, `remote-video`).

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
- **Peer Link** (`apps/peer-link`) — reference pairing UI using only `peers` and `ui`

And `apps/devstudio` — the self-hosting development environment
([docs/devstudio.md](devstudio.md)) exercising the workspace, AI, apps, and
share namespaces plus the `code-editor` and `qr-code` widgets.

And `apps/handbook` — interactive diagnostic documentation as a mini-app
([docs/handbook.md](handbook.md)).

Run the CI exercises: `npm run test:examples`, `npm run test:handbook`, and
`npm run test:devstudio-loop`.

## Future Work

- **React binding:** custom reconciler emitting the same widget-tree protocol (stretch; non-blocking).
- **Hyperbee replication:** cross-device sync topics; v1 is local-only.
- **Mini-app IPC:** shared storage and app-to-app messaging are intentionally deferred.
- **Transport-backed mini-app announces:** connect the broker's announce service to host
  Reticulum destinations/handlers; the current default is process-local.
